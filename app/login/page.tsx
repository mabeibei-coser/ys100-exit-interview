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
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f2] p-4">
      <div className="flex w-full max-w-[940px] overflow-hidden rounded-[16px] bg-white shadow-[0_24px_70px_rgba(26,38,48,0.12)]" style={{ minHeight: 560 }}>
        {/* 左：品牌区 */}
        <div className="hidden w-[52%] flex-col justify-between bg-gradient-to-br from-[#eef2f3] via-[#e8eef0] to-[#dde6e8] p-12 md:flex">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/75 px-4 py-2 text-[13px] font-medium text-[#3a4a44]">
            <span className="h-2 w-2 rounded-full bg-[#2e7d5b]" />
            YS100 · HR 专项入口
          </span>
          <div>
            <div className="text-[15px] font-semibold text-[#d8843a]">永升服务 · 人力资源部</div>
            <h1 className="mt-3 text-[clamp(30px,3vw,44px)] font-extrabold leading-[1.1] text-[#20242a]">
              离职访谈记录
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-[#6b6a64]">
              面向一线离职员工电话回访，访谈记录、
              <br />
              原因诊断与管理看板统一沉淀。
            </p>
          </div>
          <div className="text-[12px] text-[#9b9a94]">永升服务集团 · 内部使用</div>
        </div>

        {/* 右：登录表单 */}
        <div className="flex flex-1 items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-[360px]">
            <div className="text-[13px] text-[#9b9a94]">安全登录</div>
            <h2 className="mt-1 text-[clamp(20px,1.7vw,28px)] font-bold text-[#20242a]">登录工作台</h2>
            <p className="mb-7 mt-1 text-[13px] text-[#9b9a94]">选择姓名后输入对应口令。</p>
            <LoginForm callers={callers} admins={admins} />
          </div>
        </div>
      </div>
    </main>
  );
}
