import { NextResponse } from "next/server";
import { requireSuper } from "@/lib/session";
import { getDb, now } from "@/lib/db";

// 数据还原：一键清除所有"已拨打"的电话数据——删掉全部访谈记录、所有人重置为「待拨」。
// 名单（targets）保留，账号保留。仅超管。报告随访谈被删而清空。
export async function POST() {
  const s = await requireSuper();
  if (!s) return NextResponse.json({ ok: false, error: "需超管权限" }, { status: 403 });

  const db = getDb();
  const ts = now();
  let clearedInterviews = 0;
  let resetTargets = 0;
  const tx = db.transaction(() => {
    clearedInterviews = db.prepare("DELETE FROM interviews").run().changes;
    resetTargets = db
      .prepare(
        "UPDATE targets SET call_status = 'pending', interview_id = NULL, updated_at = ? WHERE call_status != 'pending' OR interview_id IS NOT NULL"
      )
      .run(ts).changes;
  });
  tx();

  return NextResponse.json({ ok: true, clearedInterviews, resetTargets });
}
