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
    <main className="min-h-screen bg-[#f5f7f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl items-center">
        <section className="grid w-full overflow-hidden rounded-[8px] border border-[var(--border)] bg-white shadow-[0_18px_55px_rgba(38,37,33,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 relative flex min-h-[320px] flex-col justify-between bg-[#edf4f1] p-7 sm:p-9 lg:order-1 lg:min-h-[360px]">
            <div className="absolute inset-y-0 right-0 hidden w-px bg-[var(--border)] lg:block" />
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(31,78,121,0.18)] bg-white px-3 py-1 text-xs font-semibold text-[var(--brand)]">
                <span className="h-2 w-2 rounded-full bg-[#2f8f68]" />
                YS100 · HR 专项入口
              </div>
              <div className="mt-9 max-w-md">
                <p className="text-sm font-semibold text-[#8b5e2c]">永升服务 · 人力资源部</p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight text-[var(--text)] sm:text-4xl">
                  离职访谈记录
                </h1>
                <p className="mt-4 text-sm leading-7 text-[var(--text2)]">
                  面向一线离职员工电话回访，访谈记录、原因诊断与管理看板统一沉淀。
                </p>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3">
              <Metric label="回访员" value={callers.length} />
              <Metric label="管理员" value={admins.length} />
              <Metric label="数据权限" value="分层" />
            </div>
          </div>

          <div className="order-1 flex items-center justify-center p-5 sm:p-8 lg:order-2">
            <div className="w-full max-w-sm">
              <div className="mb-7">
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--text3)]">
                  安全登录
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text)]">登录工作台</h2>
                <p className="mt-2 text-sm text-[var(--text2)]">选择姓名后输入对应口令。</p>
              </div>
              <LoginForm callers={callers} admins={admins} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white/75 px-3 py-3">
      <div className="text-xl font-semibold text-[var(--brand)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--text2)]">{label}</div>
    </div>
  );
}
