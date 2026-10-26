import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { getDb } from "../lib/db";
async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@apon.local")
    .trim()
    .toLowerCase();
  const password =
    process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url");
  if (password.length < 12)
    throw new Error("Use a password with at least 12 characters");
  const salt = randomBytes(16).toString("hex");
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  const db = getDb();
  try {
    if (await db.admin.findUnique({ where: { email } })) {
      console.log("Admin already exists; no credentials changed.");
      return;
    }
    if (existsSync(".admin-credentials"))
      throw new Error(
        "Credentials file already exists; move it before creating another account",
      );
    await db.$transaction(async (tx) => {
      await tx.admin.create({ data: { email, passwordHash } });
      writeFileSync(
        ".admin-credentials",
        `Admin URL: http://localhost:3000/admin\nEmail: ${email}\nPassword: ${password}\n`,
        { mode: 0o600, flag: "wx" },
      );
    });
    console.log(
      "Admin created. Credentials saved privately in .admin-credentials.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Admin setup failed. Check the database, password length, and existing credentials file.",
  );
  process.exitCode = 1;
});
