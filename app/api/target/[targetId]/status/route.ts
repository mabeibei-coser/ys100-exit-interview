import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb, now } from "@/lib/db";

const ALLOWED = new Set(["pending", "unreachable", "done"]);

export async function POST(req: Request, { params }: { params: Promise<{ targetId: string }> }) {
  const s = await requireUser();
  if (!s) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  const { targetId } = await params;
  const tid = Number(targetId);
  const db = getDb();
  const target = db.prepare("SELECT id, assigned_staff_id FROM targets WHERE id = ?").get(tid) as
    | { id: number; assigned_staff_id: number | null }
    | undefined;
  if (!target) return NextResponse.json({ ok: false, error: "派工不存在" }, { status: 404 });

  const isAdmin = s.role === "admin" || s.role === "super";
  if (!isAdmin && target.assigned_staff_id !== s.staffId) {
    return NextResponse.json({ ok: false, error: "无权操作" }, { status: 403 });
  }

  let b: { status?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }
  const status = b.status ?? "";
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ ok: false, error: "状态不合法" }, { status: 400 });
  }

  db.prepare("UPDATE targets SET call_status = ?, updated_at = ? WHERE id = ?").run(status, now(), tid);
  return NextResponse.json({ ok: true });
}
