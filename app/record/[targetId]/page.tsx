import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import RecordForm from "./record-form";

export const dynamic = "force-dynamic";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  const { targetId } = await params;
  const tid = Number(targetId);
  const s = await requireUser();
  if (!s) redirect("/login");

  const db = getDb();
  const target = db.prepare("SELECT * FROM targets WHERE id = ?").get(tid) as
    | Record<string, unknown>
    | undefined;
  if (!target) redirect("/mine");

  const isAdmin = s.role === "admin" || s.role === "super";
  if (!isAdmin && target.assigned_staff_id !== s.staffId) {
    // 只能填分给自己的人
    redirect("/mine");
  }

  const interview = db
    .prepare("SELECT * FROM interviews WHERE target_id = ?")
    .get(tid) as Record<string, unknown> | undefined;

  // 同一回访员队列里的下一个"还没打完"的人（支持「提交并下一个」连着打）
  const next = db
    .prepare(
      `SELECT id FROM targets
       WHERE assigned_staff_id IS ? AND call_status != 'done' AND id != ?
       ORDER BY CASE call_status WHEN 'pending' THEN 0 WHEN 'unreachable' THEN 1 ELSE 2 END, id
       LIMIT 1`
    )
    .get(target.assigned_staff_id ?? null, tid) as { id: number } | undefined;

  return (
    <RecordForm
      targetId={tid}
      target={JSON.parse(JSON.stringify(target))}
      interview={interview ? JSON.parse(JSON.stringify(interview)) : null}
      interviewerName={s.name ?? ""}
      nextTargetId={next?.id ?? null}
    />
  );
}
