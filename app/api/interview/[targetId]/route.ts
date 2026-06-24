import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb, now } from "@/lib/db";

// 0-3 整数或 null
function score(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(3, Math.round(n)));
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function jsonArr(v: unknown): string | null {
  if (Array.isArray(v) && v.length) return JSON.stringify(v);
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ targetId: string }> }) {
  const s = await requireUser();
  if (!s) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  const { targetId } = await params;
  const tid = Number(targetId);
  const db = getDb();
  const target = db.prepare("SELECT * FROM targets WHERE id = ?").get(tid) as
    | { id: number; assigned_staff_id: number | null }
    | undefined;
  if (!target) return NextResponse.json({ ok: false, error: "派工不存在" }, { status: 404 });

  const isAdmin = s.role === "admin" || s.role === "super";
  if (!isAdmin && target.assigned_staff_id !== s.staffId) {
    return NextResponse.json({ ok: false, error: "无权填写该记录" }, { status: 403 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }

  const status = b.status === "completed" ? "completed" : "draft";
  const ts = now();

  const cols: Record<string, unknown> = {
    uuid: text(b.uuid),
    target_id: tid,
    status,
    name: text(b.name),
    gender: text(b.gender),
    region: text(b.region),
    project: text(b.project),
    position: text(b.position),
    age_band: text(b.age_band),
    hire_date: text(b.hire_date),
    leave_date: text(b.leave_date),
    tenure_months: num(b.tenure_months),
    interviewer: text(b.interviewer),
    contact_status: text(b.contact_status),
    leave_type: text(b.leave_type),
    score_salary: score(b.score_salary),
    score_social: score(b.score_social),
    score_schedule: score(b.score_schedule),
    score_manager: score(b.score_manager),
    score_promotion: score(b.score_promotion),
    score_commute: score(b.score_commute),
    score_family: score(b.score_family),
    score_prospect: score(b.score_prospect),
    score_colleague: score(b.score_colleague),
    main_reason: text(b.main_reason),
    pay_detail_json: jsonArr(b.pay_detail),
    destination: text(b.destination),
    attraction_json: jsonArr(b.attraction),
    income_compare: text(b.income_compare),
    income_gap: num(b.income_gap),
    retainable: text(b.retainable),
    retain_condition: text(b.retain_condition),
    recommend: text(b.recommend),
    rehire: text(b.rehire),
    verbatim_quote: text(b.verbatim_quote),
    one_line_summary: text(b.one_line_summary),
    recorder_staff_id: s.staffId ?? null,
  };

  const existing = db.prepare("SELECT id FROM interviews WHERE target_id = ?").get(tid) as
    | { id: number }
    | undefined;

  let interviewId: number;
  const tx = db.transaction(() => {
    if (existing) {
      const setSql = Object.keys(cols).map((k) => `${k} = @${k}`).join(", ");
      db.prepare(`UPDATE interviews SET ${setSql}, updated_at = @updated_at WHERE id = @id`).run({
        ...cols,
        updated_at: ts,
        id: existing.id,
      });
      interviewId = existing.id;
    } else {
      const keys = Object.keys(cols);
      const insSql = `INSERT INTO interviews (${keys.join(", ")}, created_at, updated_at)
        VALUES (${keys.map((k) => "@" + k).join(", ")}, @created_at, @updated_at)`;
      const r = db.prepare(insSql).run({ ...cols, created_at: ts, updated_at: ts });
      interviewId = Number(r.lastInsertRowid);
    }
    // 提交即把派工标记完成；存草稿不改派工状态（除非之前是未接通，回到待拨）
    if (status === "completed") {
      db.prepare("UPDATE targets SET call_status = 'done', interview_id = ?, updated_at = ? WHERE id = ?").run(
        interviewId,
        ts,
        tid
      );
    } else {
      db.prepare(
        "UPDATE targets SET interview_id = ?, call_status = CASE WHEN call_status = 'done' THEN 'done' ELSE 'pending' END, updated_at = ? WHERE id = ?"
      ).run(interviewId, ts, tid);
    }
  });
  tx();

  return NextResponse.json({ ok: true, interviewId: interviewId!, status });
}
