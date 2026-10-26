import { currentAdmin } from "@/lib/admin-auth";
import AdminPanel from "@/components/AdminPanel";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "আপন Admin",
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  let admin = null;
  let unavailable = false;
  try {
    admin = await currentAdmin();
  } catch {
    unavailable = true;
  }
  return (
    <AdminPanel
      initialEmail={admin?.email || null}
      unavailable={unavailable || !process.env.DATABASE_URL}
    />
  );
}
