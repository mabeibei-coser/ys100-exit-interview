import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSuper } from "@/lib/session";
import { getDb, now } from "@/lib/db";

// 新建人员（超管）。body: { name, role: 'caller'|'admin', password? }
export async function POST(req: Request) {
  const s = await requireSuper();
  if (!s) return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });

  let b: { name?: string; role?: string; password?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }
  const name = (b.name ?? "").trim();
  const role = b.role === "admin" ? "admin" : "caller";
  if (!name) return NextResponse.json({ ok: false, error: "请填名字" }, { status: 400 });
  if (role === "admin" && !(b.password && b.password.length >= 4)) {
    return NextResponse.json({ ok: false, error: "管理员需设至少 4 位口令" }, { status: 400 });
  }

  const db = getDb();
  const exists = db.prepare("SELECT id FROM staff WHERE name = ?").get(name);
  if (exists) return NextResponse.json({ ok: false, error: "已有同名人员" }, { status: 409 });

  const hash = role === "admin" ? bcrypt.hashSync(b.password!, 10) : null;
  const ts = now();
  db.prepare(
    "INSERT INTO staff (name, role, is_super, password_hash, active, created_at, updated_at) VALUES (?,?,0,?,1,?,?)"
  ).run(name, role, hash, ts, ts);
  return NextResponse.json({ ok: true });
}
