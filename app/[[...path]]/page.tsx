import Storefront from "@/components/Storefront";
import { products as fallback, categories } from "@/lib/catalog.json";
import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  let products = fallback;
  if (process.env.DATABASE_URL) {
    try {
      products = await getDb().product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      throw new Error(
        "The catalog database is unavailable. Please try again shortly.",
      );
    }
  }
  if (
    path.length &&
    !["product", "categories", "collections", "shop", "policies"].includes(
      path[0],
    )
  )
    notFound();
  if (
    path[0] === "product" &&
    !products.some((p) => p.slug === decodeURIComponent(path[1] || ""))
  )
    notFound();
  if (path[0] === "categories" && !categories.some((c) => c.slug === path[1]))
    notFound();
  return <Storefront products={products} path={path} />;
}
