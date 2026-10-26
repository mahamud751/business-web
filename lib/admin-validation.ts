import { z } from "zod";
import { categories } from "./catalog.json";
export const productInput = z
  .object({
    name: z.string().trim().min(2).max(250),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(160)
      .regex(
        /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u,
        "Use letters, numbers and hyphens",
      ),
    category: z
      .string()
      .refine((v) => categories.some((c) => c.name === v), "Choose a category"),
    image: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .refine(
        (v) => /^\/(?!\/)[^\s\\]*$/.test(v) || /^https:\/\/[^\s]+$/i.test(v),
        "Use a local image path or HTTPS image URL",
      ),
    price: z.number().int().min(1).max(10000000),
    originalPrice: z.number().int().min(0).max(10000000),
    stock: z.number().int().min(0).max(1000000),
  })
  .refine((v) => v.originalPrice === 0 || v.originalPrice >= v.price, {
    message: "Original price must be zero or at least the selling price",
    path: ["originalPrice"],
  });
export const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
