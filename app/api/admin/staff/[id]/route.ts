import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSuper } from "@/lib/session";
import { getDb, now } from "@/lib/db";

// 改人员（超管）。body 任意组合：{ role?, password?, active? }
// role 改 admin 必须同时给 password（或该人已有口令）；改密/停用会强制其重新登录。
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSuper();
  if (!s) return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });

  const { id } = await params;
  const sid = Number(id);
  const db = getDb();
  const row = db.prepare("SELECT id, role, is_super, password_hash FROM staff WHERE id = ?").get(sid) as
    | { id: number; role: string; is_super: number; password_hash: string | null }
    | undefined;
  if (!row) return NextResponse.json({ ok: false, error: "人员不存在" }, { status: 404 });
  if (row.is_super) return NextResponse.json({ ok: false, error: "超管账号不可在此修改" }, { status: 400 });

  let b: { role?: string; password?: string; active?: boolean };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }

  const sets: string[] = [];
  const args: unknown[] = [];
  const ts = now();
  let forceRelogin = false;

  if (b.role === "admin" || b.role === "caller") {
    sets.push("role = ?");
    args.push(b.role);
    if (b.role === "admin" && !row.password_hash && !(b.password && b.password.length >= 4)) {
      return NextResponse.json({ ok: false, error: "升为管理员需同时设至少 4 位口令" }, { status: 400 });
    }
    if (b.role === "caller") {
      // 降为回访员：清掉个人口令，改走团队口令
      sets.push("password_hash = NULL");
      forceRelogin = true;
    }
  }
  if (b.password && b.password.length >= 4) {
    sets.push("password_hash = ?");
    args.push(bcrypt.hashSync(b.password, 10));
    forceRelogin = true;
  }
  if (typeof b.active === "boolean") {
    sets.push("active = ?");
    args.push(b.active ? 1 : 0);
    if (!b.active) forceRelogin = true;
  }
  if (forceRelogin) {
    sets.push("session_invalid_after = ?");
    args.push(ts);
  }
  if (!sets.length) return NextResponse.json({ ok: false, error: "无改动" }, { status: 400 });

  sets.push("updated_at = ?");
  args.push(ts);
  args.push(sid);
  db.prepare(`UPDATE staff SET ${sets.join(", ")} WHERE id = ?`).run(...args);
  return NextResponse.json({ ok: true });
}
