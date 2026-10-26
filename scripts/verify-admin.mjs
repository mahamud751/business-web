import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";
const base = "http://localhost:3000";
const credentials = readFileSync(".admin-credentials", "utf8");
const email = credentials.match(/^Email: (.+)$/m)[1],
  password = credentials.match(/^Password: (.+)$/m)[1];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const suffix = Date.now().toString();
const slug = "admin-test-" + suffix;
let productId;
const orderIds = [];
const request = async (path, method = "GET", data, origin = base) =>
  context.request.fetch(base + "/api/" + path, {
    method,
    data,
    headers: { Origin: origin },
  });
try {
  assert.equal((await request("admin/products")).status(), 401);
  assert.equal((await request("admin/orders")).status(), 401);
  assert.equal((await request("admin/products", "POST", {})).status(), 401);
  await page.goto(base + "/admin", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in →" }).click();
  await page.getByRole("heading", { name: "Recent orders" }).waitFor();
  const cookie = (await context.cookies()).find((c) => c.name === "apon_admin");
  assert.ok(cookie?.httpOnly);
  assert.equal(cookie.sameSite, "Strict");
  await page.screenshot({ path: "docs/admin-preview.png" });
  assert.equal(
    (
      await request("admin/products", "POST", {}, "https://other.example")
    ).status(),
    403,
  );
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "＋ Add product" }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Admin test product " + suffix);
  await page.getByLabel("URL slug").fill(slug);
  await page.getByLabel("Selling price").fill("120");
  await page.getByLabel("Original price").fill("150");
  await page.getByLabel("Available stock").fill("10");
  await page.getByLabel("Product image").fill("/images/category/toys.png");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("textbox", { name: "Search products" }).fill(slug);
  await page.getByRole("button", { name: "Edit", exact: true }).waitFor();
  let product = (await (await request("admin/products?q=" + slug)).json())
    .rows[0];
  productId = product.id;
  assert.equal(
    (await request("admin/products", "POST", { ...product })).status(),
    409,
  );
  assert.equal(
    (
      await request("admin/products/" + productId, "PATCH", {
        ...product,
        price: -1,
      })
    ).status(),
    400,
  );
  const order = await request("orders", "POST", {
    name: "Admin integration test",
    phone: "01712345678",
    address: "Integration test address, Dhaka",
    district: "dhaka",
    items: [{ id: productId, quantity: 2 }],
  });
  assert.equal(order.status(), 201);
  const created = await order.json();
  orderIds.push(created.id);
  assert.equal(created.total, 320);
  // The earlier product revision must no longer overwrite stock changed by checkout.
  assert.equal(
    (
      await request("admin/products/" + productId, "PATCH", {
        ...product,
        stock: 99,
      })
    ).status(),
    409,
  );
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("textbox", { name: "Search products" }).fill(slug);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Edited admin test " + suffix);
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const list = (await (await request("admin/orders?q=" + created.id)).json())
    .rows;
  assert.equal(list[0].items[0].productName, "Admin test product " + suffix);
  assert.equal(
    (
      await request("admin/orders/" + created.id, "PATCH", {
        status: "DELIVERED",
        previousStatus: "PENDING",
      })
    ).status(),
    409,
  );
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByRole("textbox", { name: "Search orders" }).fill(created.id);
  await page.getByRole("button", { name: "View order →" }).click();
  await page.getByRole("button", { name: "Mark Confirmed" }).click();
  await page.getByRole("button", { name: "Mark Shipped" }).waitFor();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await page
    .getByText("This order is cancelled and cannot be changed.")
    .waitFor();
  const repeat = await request("admin/orders/" + created.id, "PATCH", {
    status: "CANCELLED",
    previousStatus: "CONFIRMED",
  });
  assert.equal(repeat.status(), 409);
  product = (await (await request("admin/products?q=" + slug)).json()).rows[0];
  assert.equal(product.stock, 10);
  const second = await request("orders", "POST", {
    name: "Admin integration test",
    phone: "01712345678",
    address: "Integration test address, Dhaka",
    district: "dhaka",
    items: [{ id: productId, quantity: 1 }],
  });
  assert.equal(second.status(), 201);
  const secondId = (await second.json()).id;
  orderIds.push(secondId);
  for (const [previousStatus, status] of [
    ["PENDING", "CONFIRMED"],
    ["CONFIRMED", "SHIPPED"],
    ["SHIPPED", "DELIVERED"],
  ]) {
    assert.equal(
      (
        await request("admin/orders/" + secondId, "PATCH", {
          previousStatus,
          status,
        })
      ).status(),
      200,
    );
  }
  assert.equal(
    (
      await request("admin/orders/" + secondId, "PATCH", {
        previousStatus: "DELIVERED",
        status: "CANCELLED",
      })
    ).status(),
    409,
  );
  assert.equal(
    (await (await request("admin/orders?q=" + secondId)).json()).rows[0].status,
    "DELIVERED",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("textbox", { name: "Search products" }).fill(slug);
  await page.getByRole("button", { name: "Delete", exact: true }).waitFor();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("heading", { name: "No products found" }).waitFor();
  assert.equal(
    (await context.request.get(base + "/product/" + slug)).status(),
    404,
  );
  assert.equal(
    (
      await request("orders", "POST", {
        name: "Admin integration test",
        phone: "01712345678",
        address: "Integration test address, Dhaka",
        district: "dhaka",
        items: [{ id: productId, quantity: 1 }],
      })
    ).status(),
    409,
  );
  assert.equal(
    (await (await request("admin/orders?q=" + created.id)).json()).rows.length,
    1,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("heading", { name: "Recent orders" }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "docs/admin-mobile-preview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Sign in →" }).waitFor();
  assert.equal((await request("admin/orders")).status(), 401);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: auth, secure cookie, origin checks, product create/edit/delete, validation, duplicate slugs, optimistic stock conflict, order history, order confirmation/cancellation, single restock, deleted-product rejection, mobile and logout.",
  );
} finally {
  await browser.close();
  const db = new pg.Client({
    connectionString: "postgresql://tuhfa@127.0.0.1:55432/tuhfa",
  });
  await db.connect();
  try {
    for (const id of orderIds) {
      await db.query('DELETE FROM "OrderItem" WHERE "orderId"=$1', [id]);
      await db.query('DELETE FROM "Order" WHERE id=$1', [id]);
    }
    if (productId)
      await db.query('DELETE FROM "Product" WHERE id=$1', [productId]);
  } finally {
    await db.end();
  }
}
