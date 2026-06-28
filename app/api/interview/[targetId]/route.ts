import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb, now } from "@/lib/db";
import { DIMS } from "@/lib/schema";

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

const DIM_KEYS = DIMS.map((d) => d.key);
const POINTS_BY_DIM: Record<string, Set<string>> = Object.fromEntries(
  DIMS.map((d) => [d.key, new Set(d.points.map((p) => p.key))])
);

/** 只收已知维度下的已知问题点 key，过滤脏数据；空维度不写。 */
function cleanHits(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const out: Record<string, string[]> = {};
  for (const dim of DIM_KEYS) {
    const raw = (v as Record<string, unknown>)[dim];
    if (!Array.isArray(raw)) continue;
    const valid = raw.filter((k): k is string => typeof k === "string" && POINTS_BY_DIM[dim].has(k));
    if (valid.length) out[dim] = valid;
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}
/** 每维原话摘录，只收已知维度的非空文本。 */
function cleanQuotes(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const out: Record<string, string> = {};
  for (const dim of DIM_KEYS) {
    const t = text((v as Record<string, unknown>)[dim]);
    if (t) out[dim] = t;
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}
function dimKeyOrNull(v: unknown): string | null {
  return typeof v === "string" && (DIM_KEYS as string[]).includes(v) ? v : null;
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
    line: text(b.line),
    age_band: text(b.age_band),
    hire_date: text(b.hire_date),
    leave_date: text(b.leave_date),
    tenure_months: num(b.tenure_months),
    interviewer: text(b.interviewer),
    contact_status: text(b.contact_status),
    leave_type: text(b.leave_type),
    hits_json: cleanHits(b.hits),
    quotes_json: cleanQuotes(b.quotes),
    retainable: text(b.retainable),
    destination: text(b.destination),
    top_dim: dimKeyOrNull(b.top_dim),
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
