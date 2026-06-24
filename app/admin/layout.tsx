import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import LogoutButton from "@/app/_components/logout-button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  if (!s) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-[var(--border)] sticky top-0 z-20">
        <div className="flex items-center gap-5">
          <span className="font-semibold text-[var(--brand)]">离职访谈后台</span>
          <nav className="flex items-center gap-1 text-sm">
            <Tab href="/admin">报告</Tab>
            <Tab href="/admin/records">明细总表</Tab>
            <Tab href="/admin/import">导入派工</Tab>
            {s.isSuper && <Tab href="/admin/staff">人员与权限</Tab>}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text2)]">{s.name}{s.isSuper ? " · 超管" : ""}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="max-w-5xl mx-auto p-5">{children}</div>
    </div>
  );
}

function Tab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 rounded-md hover:bg-[var(--secondary)] text-[var(--text2)]">
      {children}
    </Link>
  );
}
