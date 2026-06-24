import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import LogoutButton from "@/app/_components/logout-button";
import TargetCard from "./target-card";

export const dynamic = "force-dynamic";

interface TargetRow {
  id: number;
  name: string;
  phone: string | null;
  region: string | null;
  project: string | null;
  position: string | null;
  call_status: string;
}

export default async function MinePage() {
  const s = await requireUser();
  if (!s) redirect("/login");

  const rows = getDb()
    .prepare(
      `SELECT id, name, phone, region, project, position, call_status
       FROM targets WHERE assigned_staff_id = ?
       ORDER BY CASE call_status WHEN 'pending' THEN 0 WHEN 'unreachable' THEN 1 ELSE 2 END, id`
    )
    .all(s.staffId) as TargetRow[];

  const total = rows.length;
  const done = rows.filter((r) => r.call_status === "done").length;
  const pending = rows.filter((r) => r.call_status !== "done").length;
  const firstPending = rows.find((r) => r.call_status !== "done");

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[var(--border)] sticky top-0 z-10">
        <div className="font-semibold text-[var(--brand)]">我的派工</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text2)]">{s.name}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-5">
        <div className="card p-4 mb-4 flex items-center gap-6">
          <div>
            <div className="text-2xl font-semibold">
              {done}
              <span className="text-base text-[var(--text3)]"> / {total}</span>
            </div>
            <div className="text-xs text-[var(--text2)] mt-0.5">已完成 / 总派工</div>
          </div>
          <div className="flex-1 h-2.5 rounded-full bg-[var(--secondary)] overflow-hidden">
            <div
              className="h-full bg-[var(--brand)] rounded-full transition-all"
              style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
            />
          </div>
          <div className="text-sm text-[var(--text2)]">还剩 {pending}</div>
        </div>

        {firstPending && (
          <Link href={`/record/${firstPending.id}`} className="btn btn-primary w-full mb-4">
            开始回访下一个 → {firstPending.name}
          </Link>
        )}

        {total === 0 ? (
          <div className="card p-8 text-center text-[var(--text2)]">
            还没有分给你的名单。等管理员导入派工后刷新即可。
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((t) => (
              <TargetCard key={t.id} {...t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
