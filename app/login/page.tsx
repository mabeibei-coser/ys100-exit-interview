import { getDb } from "@/lib/db";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const rows = getDb()
    .prepare("SELECT name, role FROM staff WHERE active = 1 ORDER BY role DESC, name")
    .all() as Array<{ name: string; role: string }>;

  const callers = rows.filter((r) => r.role === "caller").map((r) => r.name);
  const admins = rows.filter((r) => r.role !== "caller").map((r) => r.name);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const archiveBg = `${basePath}/login-archive-bg.png`;

  return (
    <main className="min-h-screen bg-[#f7f8f8] px-4 py-8 text-[#1f242b] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1210px] items-center">
        <section className="grid min-h-[640px] w-full overflow-hidden rounded-[10px] border border-[#cfd7db] bg-white shadow-[0_24px_70px_rgba(26,38,48,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
          <div
            className="relative order-2 overflow-hidden bg-[#eef5f2] px-8 py-10 sm:px-12 sm:py-12 lg:order-1 lg:px-14 lg:py-14"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(245,249,247,0.92) 0%, rgba(236,246,242,0.78) 48%, rgba(230,242,237,0.9) 100%), url("${archiveBg}")`,
              backgroundPosition: "center, left bottom",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover, cover",
            }}
          >
            <div className="absolute inset-y-0 right-0 hidden w-px bg-[#cfd7db] lg:block" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 rounded-full border border-[#d3dde2] bg-white/88 px-5 py-2 text-base font-semibold text-[#143a62] shadow-[0_8px_22px_rgba(42,74,93,0.06)]">
                <span className="h-3 w-3 rounded-full bg-[#2f8f68]" />
                YS100 · HR 专项入口
              </div>
              <h1 className="mt-24 max-w-[560px] text-[44px] font-semibold leading-[1.08] tracking-normal text-[#1f242b] sm:text-[58px] lg:text-[64px]">
                离职访谈记录
              </h1>
            </div>
          </div>

          <div className="order-1 flex items-center justify-center bg-white px-8 py-10 sm:px-12 lg:order-2 lg:px-16">
            <div className="w-full max-w-[420px]">
              <div className="mb-12">
                <p className="text-base font-semibold text-[#8b949e]">安全登录</p>
                <h2 className="mt-6 text-[36px] font-semibold leading-tight tracking-normal text-[#20242a]">
                  登录工作台
                </h2>
                <p className="mt-4 text-base leading-7 text-[#66717d]">选择姓名后输入对应口令。</p>
              </div>
              <LoginForm callers={callers} admins={admins} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
