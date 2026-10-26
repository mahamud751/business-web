import "dotenv/config";
import { getDb } from "../lib/db";
import { products } from "../lib/catalog.json";
const db = getDb();
async function main() {
  for (const p of products)
    await db.product.upsert({
      where: { id: p.id },
      create: p,
      update: {
        name: p.name,
        slug: p.slug,
        category: p.category,
        image: p.image,
        price: p.price,
        originalPrice: p.originalPrice,
      },
    });
  console.log(`Seeded ${products.length} products`);
}
main().finally(() => db.$disconnect());
