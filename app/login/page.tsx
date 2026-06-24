import { getDb } from "@/lib/db";
import Image from "next/image";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const rows = getDb()
    .prepare("SELECT name, role FROM staff WHERE active = 1 ORDER BY role DESC, name")
    .all() as Array<{ name: string; role: string }>;

  const callers = rows.filter((r) => r.role === "caller").map((r) => r.name);
  const admins = rows.filter((r) => r.role !== "caller").map((r) => r.name);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <main className="min-h-screen overflow-auto bg-[#f7f8f8]">
      <div className="flex min-h-screen items-center justify-center p-0 sm:p-6">
        <section
          className="relative w-[min(100vw,calc(100vh*1680/945))] max-w-[1680px] overflow-hidden shadow-[0_24px_70px_rgba(26,38,48,0.12)] sm:rounded-[10px]"
          style={{ aspectRatio: "1680 / 945" }}
          aria-label="离职访谈记录登录页"
        >
          <Image
            className="pointer-events-none select-none object-contain"
            src={`${basePath}/login-design-bg.png`}
            alt=""
            fill
            priority
            sizes="100vw"
            draggable={false}
          />
          <LoginForm callers={callers} admins={admins} />
        </section>
      </div>
    </main>
  );
}
