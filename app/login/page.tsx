import { getDb } from "@/lib/db";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const rows = getDb()
    .prepare("SELECT name, role FROM staff WHERE active = 1 ORDER BY role DESC, name")
    .all() as Array<{ name: string; role: string }>;

  const callers = rows.filter((r) => r.role === "caller").map((r) => r.name);
  const admins = rows.filter((r) => r.role !== "caller").map((r) => r.name);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-7">
        <h1 className="text-xl font-semibold text-[var(--brand)]">离职访谈记录</h1>
        <p className="text-sm text-[var(--text2)] mt-1 mb-6">永升服务 · 人力资源部</p>
        <LoginForm callers={callers} admins={admins} />
      </div>
    </main>
  );
}
