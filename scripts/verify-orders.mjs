import assert from "node:assert/strict";
import pg from "pg";
// Intentionally restricted to the isolated development test database.
const db = new pg.Client({
  connectionString: "postgresql://tuhfa@127.0.0.1:55432/tuhfa",
});
await db.connect();
const input = {
  name: "API Test",
  phone: "01712345678",
  address: "Test address in Dhaka",
  district: "dhaka",
  items: [{ id: "266", quantity: 1 }],
  total: 1,
};
const post = async (data) => {
  const r = await fetch("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { status: r.status, data: await r.json() };
};
const start = (
  await db.query('SELECT stock FROM "Product" WHERE id=$1', ["266"])
).rows[0].stock;
try {
  const result = await post(input);
  assert.equal(result.status, 201);
  assert.equal(result.data.total, 1079);
  const duplicate = await post({
    ...input,
    items: [...input.items, ...input.items],
  });
  assert.equal(duplicate.status, 400);
  await db.query('UPDATE "Product" SET stock=1 WHERE id=$1', ["266"]);
  const concurrent = await Promise.all([post(input), post(input)]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  const stock = (
    await db.query('SELECT stock FROM "Product" WHERE id=$1', ["266"])
  ).rows[0].stock;
  assert.equal(stock, 0);
  console.log(
    "PASS: server-authoritative prices, duplicate rejection, concurrent checkout prevents overselling.",
  );
} finally {
  await db.query('UPDATE "Product" SET stock=$1 WHERE id=$2', [start, "266"]);
  await db.query(
    'DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE name=$1)',
    ["API Test"],
  );
  await db.query('DELETE FROM "Order" WHERE name=$1', ["API Test"]);
  await db.end();
}
