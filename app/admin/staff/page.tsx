import { redirect } from "next/navigation";
import { requireSuper } from "@/lib/session";
import { getDb } from "@/lib/db";
import StaffManager from "./staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const s = await requireSuper();
  if (!s) redirect("/admin");

  const staff = getDb()
    .prepare("SELECT id, name, role, is_super, active FROM staff ORDER BY is_super DESC, role DESC, name")
    .all() as Array<{ id: number; name: string; role: string; is_super: number; active: number }>;

  return <StaffManager staff={staff} />;
}
