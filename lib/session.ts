import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb, now } from "./db";

const BASE_PATH = process.env.BASE_PATH ?? "/ys100";

export interface AppSession {
  staffId?: number;
  name?: string;
  role?: "caller" | "admin" | "super";
  isSuper?: boolean;
  loggedInAt?: number;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || "dev_only_insecure_password_change_me_32",
  cookieName: "exit_interview_session",
  cookieOptions: {
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    sameSite: "lax",
    path: BASE_PATH, // cookie 只发给 /ys100/* 路径，与 nginx 子路径对齐
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  return getIronSession<AppSession>(await cookies(), sessionOptions);
}

interface StaffRow {
  id: number;
  name: string;
  role: "caller" | "admin" | "super";
  is_super: number;
  password_hash: string | null;
  active: number;
  session_invalid_after: number | null;
}

const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y";

/** 常量时间字符串比较，避免团队口令被时序探测 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function isInvalidated(s: AppSession): boolean {
  if (!s.staffId || !s.loggedInAt) return false;
  try {
    const row = getDb()
      .prepare("SELECT active, session_invalid_after FROM staff WHERE id = ?")
      .get(s.staffId) as { active: number; session_invalid_after: number | null } | undefined;
    if (!row) return true;
    if (!row.active) return true;
    if (row.session_invalid_after && s.loggedInAt < row.session_invalid_after) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * 登录：按名字找人 → 按角色校验口令 → 写 session。
 * - 回访员(caller)：校验共享团队口令 TEAM_PASSWORD
 * - 管理员/超管(admin/super)：校验各自 password_hash
 */
export async function login(
  name: string,
  password: string
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "bad_password" | "disabled" }> {
  const row = getDb()
    .prepare(
      `SELECT id, name, role, is_super, password_hash, active, session_invalid_after
       FROM staff WHERE name = ?`
    )
    .get(name) as StaffRow | undefined;

  if (!row) {
    await bcrypt.compare(password, DUMMY_HASH); // 防时序
    return { ok: false, reason: "not_found" };
  }
  if (!row.active) return { ok: false, reason: "disabled" };

  let passwordOk: boolean;
  if (row.role === "caller") {
    const team = process.env.TEAM_PASSWORD ?? "";
    passwordOk = team.length > 0 && safeEqual(password, team);
  } else {
    passwordOk = await bcrypt.compare(password, row.password_hash ?? DUMMY_HASH);
  }
  if (!passwordOk) return { ok: false, reason: "bad_password" };

  const s = await getSession();
  s.staffId = row.id;
  s.name = row.name;
  s.role = row.role;
  s.isSuper = row.is_super === 1;
  s.loggedInAt = now();
  await s.save();
  return { ok: true };
}

/** 任意已登录用户（回访员或管理员） */
export async function requireUser(): Promise<AppSession | null> {
  const s = await getSession();
  if (!s.staffId) return null;
  if (isInvalidated(s)) {
    await s.destroy();
    return null;
  }
  return s;
}

/** 要求管理员（admin 或 super） */
export async function requireAdmin(): Promise<AppSession | null> {
  const s = await requireUser();
  if (!s) return null;
  return s.role === "admin" || s.role === "super" ? s : null;
}

/** 要求超管 */
export async function requireSuper(): Promise<AppSession | null> {
  const s = await requireUser();
  if (!s) return null;
  return s.isSuper ? s : null;
}

export async function logout(): Promise<void> {
  const s = await getSession();
  await s.destroy();
}
