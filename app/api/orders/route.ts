import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^01[3-9]\d{8}$/),
  address: z.string().trim().min(10).max(500),
  district: z.enum(["dhaka", "outside"]),
  items: z
    .array(
      z.object({
        id: z.string().max(64),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(30),
});
export async function POST(request: Request) {
  if (
    new URL(request.url).origin !== request.headers.get("origin") &&
    request.headers.get("origin")
  )
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "নাম, ঠিকানা ও সঠিক মোবাইল নম্বর দিন।" },
      { status: 400 },
    );
  if (
    new Set(input.data.items.map((i) => i.id)).size !== input.data.items.length
  )
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "অর্ডার সেবা এখন সংযুক্ত নয়। অনুগ্রহ করে পরে চেষ্টা করুন।" },
      { status: 503 },
    );
  try {
    const order = await getDb().$transaction(async (tx) => {
      const data = input.data;
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.id) }, deletedAt: null },
      });
      if (products.length !== data.items.length) throw new Error("STOCK");
      let subtotal = 0;
      for (const item of data.items) {
        const p = products.find((p) => p.id === item.id)!;
        const update = await tx.product.updateMany({
          where: { id: p.id, deletedAt: null, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (update.count !== 1) throw new Error("STOCK");
        subtotal += p.price * item.quantity;
      }
      const count = data.items.reduce((s, i) => s + i.quantity, 0);
      const delivery =
        count >= 4 || (data.district === "dhaka" && subtotal >= 2000)
          ? 0
          : data.district === "dhaka"
            ? 80
            : 130;
      return tx.order.create({
        data: {
          name: data.name,
          phone: data.phone,
          address: data.address,
          district: data.district,
          total: subtotal + delivery,
          delivery,
          items: {
            create: data.items.map((i) => ({
              productId: i.id,
              productName: products.find((p) => p.id === i.id)!.name,
              quantity: i.quantity,
              price: products.find((p) => p.id === i.id)!.price,
            })),
          },
        },
        select: { id: true, total: true },
      });
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK")
      return NextResponse.json(
        { error: "পণ্যটি পর্যাপ্ত স্টকে নেই।" },
        { status: 409 },
      );
    console.error("Order storage failed");
    return NextResponse.json(
      { error: "অর্ডার সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।" },
      { status: 503 },
    );
  }
}
