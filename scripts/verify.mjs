import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.screenshot({ path: "/tmp/tuhfa-local-desktop.png" });
assert.equal(await page.locator(".hero h1").count(), 1);
assert.equal(await page.locator(".category-card").count(), 4);
assert.equal(await page.locator(".brand").first().textContent().then(t => t.includes("আপন")), true);
await page.locator(".quick-add").first().click();
await page.locator(".bag-button").click();
assert.equal(await page.locator(".cart-row").count(), 1);
await page.getByRole("button", { name: "পরিমাণ বাড়ান" }).click();
assert.equal(await page.locator(".quantity span").textContent(), "2");
await page.getByRole("button", { name: "কার্ট বন্ধ করুন" }).click();
await page.reload();
await page.locator(".bag-button").click();
assert.equal(await page.locator(".quantity span").textContent(), "2");
await page.getByRole("button", { name: "চেকআউট করুন" }).click();
await page.getByLabel("আপনার নাম").fill("Test Customer");
await page.getByLabel("মোবাইল নম্বর").fill("01712345678");
await page
  .getByLabel("সম্পূর্ণ ঠিকানা")
  .fill("Test address, Dhaka, Bangladesh");
await page.getByRole("button", { name: "অর্ডার নিশ্চিত করুন" }).click();
await page.getByRole("heading", { name: "অর্ডার সফল হয়েছে" }).waitFor();
await page.getByRole("button", { name: "কেনাকাটা চালিয়ে যান" }).click();
await page.locator(".header-search input").first().fill("বক্সিং");
await page.locator(".header-search input").first().press("Enter");
await page.waitForURL("**/shop?q=*");
await page.locator(".catalog-grid .product-card").first().waitFor();
assert.equal(await page.locator(".catalog-grid .product-card").count(), 2);
await page.locator(".catalog-grid h3 a").first().click();
await page.locator(".detail-grid").waitFor();
const invalid = await page.request.post("http://localhost:3000/api/orders", {
  data: { name: "a" },
});
assert.equal(invalid.status(), 400);
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
await page.screenshot({ path: "/tmp/tuhfa-local-mobile.png" });
await page.getByRole("button", { name: "মেনু খুলুন" }).click();
await page.locator("#mobile-site-menu").waitFor();
assert.deepEqual(errors, []);
console.log(
  "PASS: desktop/mobile, redesigned homepage, cart persistence, quantities, database checkout, search, detail page, validation, menu, console.",
);
await browser.close();
