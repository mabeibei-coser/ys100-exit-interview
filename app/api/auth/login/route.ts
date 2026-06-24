import { NextResponse } from "next/server";
import { login, getSession } from "@/lib/session";

export async function POST(req: Request) {
  let body: { name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式错误" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";
  if (!name || !password) {
    return NextResponse.json({ ok: false, error: "请选择名字并填写口令" }, { status: 400 });
  }

  const result = await login(name, password);
  if (!result.ok) {
    const msg =
      result.reason === "disabled"
        ? "该账号已停用，请联系管理员"
        : "名字或口令不对";
    return NextResponse.json({ ok: false, error: msg }, { status: 401 });
  }

  const s = await getSession();
  const role = s.role ?? "caller";
  return NextResponse.json({ ok: true, role });
}
