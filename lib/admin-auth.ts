import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb } from "./db";
const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "apon_admin";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function currentAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getDb().adminSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { admin: { select: { id: true, email: true } } },
  });
  return session && session.expiresAt > new Date() ? session.admin : null;
}
export async function createSession(adminId: string) {
  const token = randomBytes(32).toString("hex");
  await getDb().adminSession.create({
    data: {
      adminId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token)
    await getDb().adminSession.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  cookieStore.delete(SESSION_COOKIE);
}
