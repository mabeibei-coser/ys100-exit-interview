import { redirect } from "next/navigation";
import { requireSuper } from "@/lib/session";
import { getDb } from "@/lib/db";
import ResetPanel from "./reset-panel";

export const dynamic = "force-dynamic";

export default async function ResetPage() {
  const s = await requireSuper();
  if (!s) redirect("/admin");

  const db = getDb();
  const interviews = (db.prepare("SELECT count(*) n FROM interviews").get() as { n: number }).n;
  const called = (db.prepare("SELECT count(*) n FROM targets WHERE call_status != 'pending'").get() as { n: number }).n;
  const totalTargets = (db.prepare("SELECT count(*) n FROM targets").get() as { n: number }).n;

  return <ResetPanel interviews={interviews} called={called} totalTargets={totalTargets} />;
}
