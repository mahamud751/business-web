import type { Metadata } from "next";
import "./fonts.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "আপন — ছোট ছোট যত্নে, আরও আপন",
  description:
    "পরিবার, মা ও শিশুর যত্ন, খেলনা এবং দৈনন্দিন প্রয়োজনের নির্বাচিত পণ্য।",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      {/* Grammarly can inject body attributes before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
