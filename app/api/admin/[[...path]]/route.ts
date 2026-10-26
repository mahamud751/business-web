import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  currentAdmin,
  createSession,
  endSession,
  verifyPassword,
} from "@/lib/admin-auth";
import { productInput, transitions } from "@/lib/admin-validation";
export const runtime = "nodejs";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fail = (message: string, status = 400) =>
  json({ error: message }, status);
type Context = { params: Promise<{ path?: string[] }> };
async function handler(request: Request, context: Context) {
  try {
    const { path = [] } = await context.params;
    const [resource, id] = path;
    const method = request.method;
    if (
      method !== "GET" &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      return fail("Invalid request origin", 403);
    if (!process.env.DATABASE_URL)
      return fail("Database is not configured", 503);
    const db = getDb();
    if (resource === "login" && method === "POST") {
      const parsed = z
        .object({
          email: z
            .email()
            .max(254)
            .transform((v) => v.toLowerCase()),
          password: z.string().min(1).max(256),
        })
        .safeParse(await request.json().catch(() => null));
      if (!parsed.success) return fail("Enter a valid email and password");
      const admin = await db.admin.findUnique({
        where: { email: parsed.data.email },
      });
      if (admin?.lockedUntil && admin.lockedUntil > new Date())
        return fail("Too many attempts. Try again in 15 minutes.", 429);
      const valid = await verifyPassword(
        parsed.data.password,
        admin?.passwordHash ||
          "00000000000000000000000000000000:" + "00".repeat(64),
      );
      if (!admin || !valid) {
        if (admin) {
          const updated = await db.admin.update({
            where: { id: admin.id },
            data: { failedAttempts: { increment: 1 } },
          });
          if (updated.failedAttempts >= 5)
            await db.admin.update({
              where: { id: admin.id },
              data: {
                lockedUntil: new Date(Date.now() + 15 * 60000),
                failedAttempts: 0,
              },
            });
        }
        return fail("Invalid email or password", 401);
      }
      await db.admin.update({
        where: { id: admin.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
      await createSession(admin.id);
      return json({ email: admin.email });
    }
    const admin = await currentAdmin();
    if (!admin) return fail("Please sign in", 401);
    if (resource === "logout" && method === "POST") {
      await endSession();
      return json({ ok: true });
    }
    if (resource === "summary" && method === "GET") {
      const [products, orders, pending, lowStock, revenue, recent] =
        await Promise.all([
          db.product.count({ where: { deletedAt: null } }),
          db.order.count(),
          db.order.count({ where: { status: "PENDING" } }),
          db.product.count({ where: { deletedAt: null, stock: { lte: 5 } } }),
          db.order.aggregate({
            where: { status: "DELIVERED" },
            _sum: { total: true },
          }),
          db.order.findMany({
            take: 6,
            orderBy: { createdAt: "desc" },
            include: { items: { include: { product: true } } },
          }),
        ]);
      return json({
        products,
        orders,
        pending,
        lowStock,
        revenue: revenue._sum.total || 0,
        recent,
      });
    }
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const page = Math.max(
      1,
      Math.min(100000, Number(url.searchParams.get("page")) || 1),
    );
    if (!Number.isInteger(page)) return fail("Invalid page");
    const take = 15;
    if (resource === "products") {
      if (method === "GET") {
        const where = {
          deletedAt: null,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { slug: { contains: q, mode: "insensitive" as const } },
                ],
              }
            : {}),
        };
        const [rows, total] = await Promise.all([
          db.product.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * take,
            take,
          }),
          db.product.count({ where }),
        ]);
        return json({
          rows,
          total,
          page,
          pages: Math.max(1, Math.ceil(total / take)),
        });
      }
      if (method === "POST" || method === "PATCH") {
        const body = await request.json().catch(() => null);
        const parsed = productInput.safeParse(body);
        if (!parsed.success) return fail(parsed.error.issues[0].message);
        if (method === "POST")
          return json(
            await db.product.create({
              data: { ...parsed.data, id: randomUUID() },
            }),
            201,
          );
        if (
          !id ||
          typeof body.updatedAt !== "string" ||
          !Number.isFinite(Date.parse(body.updatedAt))
        )
          return fail("Missing product revision");
        const update = await db.product.updateMany({
          where: { id, deletedAt: null, updatedAt: new Date(body.updatedAt) },
          data: parsed.data,
        });
        if (!update.count)
          return fail(
            "This product changed or was removed. Reload before editing.",
            409,
          );
        return json({ ok: true });
      }
      if (method === "DELETE" && id) {
        const updated = await db.product.updateMany({
          where: { id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        return updated.count
          ? json({ ok: true })
          : fail("Product not found", 404);
      }
    }
    if (resource === "orders") {
      if (method === "GET") {
        const status = url.searchParams.get("status");
        if (status && !Object.keys(transitions).includes(status))
          return fail("Invalid order status");
        const where = {
          ...(status ? { status } : {}),
          ...(q
            ? {
                OR: [
                  { id: { contains: q, mode: "insensitive" as const } },
                  { name: { contains: q, mode: "insensitive" as const } },
                  { phone: { contains: q } },
                ],
              }
            : {}),
        };
        const [rows, total] = await Promise.all([
          db.order.findMany({
            where,
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * take,
            take,
          }),
          db.order.count({ where }),
        ]);
        return json({
          rows,
          total,
          page,
          pages: Math.max(1, Math.ceil(total / take)),
        });
      }
      if (method === "PATCH" && id) {
        const input = z
          .object({
            status: z.enum(["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
            previousStatus: z.string(),
          })
          .safeParse(await request.json().catch(() => null));
        if (!input.success) return fail("Invalid order status");
        const { status, previousStatus } = input.data;
        if (!transitions[previousStatus]?.includes(status))
          return fail("That status transition is not allowed", 409);
        const result = await db.$transaction(async (tx) => {
          const updated = await tx.order.updateMany({
            where: { id, status: previousStatus },
            data: { status },
          });
          if (!updated.count) return false;
          if (status === "CANCELLED") {
            const items = await tx.orderItem.findMany({
              where: { orderId: id },
            });
            for (const item of items)
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
          }
          return true;
        });
        return result
          ? json({ ok: true })
          : fail("Order changed. Refresh and try again.", 409);
      }
    }
    return fail("Not found", 404);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return fail("That product slug already exists", 409);
    console.error("Admin operation failed");
    return fail("Unable to complete the operation. Please try again.", 503);
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
