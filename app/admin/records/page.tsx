import Link from "next/link";
import { getDb } from "@/lib/db";
import { withBase } from "@/lib/url";

export const dynamic = "force-dynamic";

interface Rec {
  id: number;
  target_id: number | null;
  created_at: number;
  name: string | null;
  region: string | null;
  project: string | null;
  position: string | null;
  interviewer: string | null;
  contact_status: string | null;
  leave_type: string | null;
  main_reason: string | null;
  status: string;
}

function fmt(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function RecordsPage() {
  const rows = getDb()
    .prepare(
      `SELECT id, target_id, created_at, name, region, project, position,
              interviewer, contact_status, leave_type, main_reason, status
       FROM interviews ORDER BY created_at DESC`
    )
    .all() as Rec[];

  const done = rows.filter((r) => r.status === "completed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-[var(--text2)]">明细总表</div>
          <div className="text-xs text-[var(--text3)]">共 {rows.length} 条，已完成 {done} 条</div>
        </div>
        <a className="btn btn-primary" href={withBase("/api/admin/records/export")}>
          导出 Excel
        </a>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-left text-[var(--text2)]" style={{ background: "var(--secondary)" }}>
              {["时间", "姓名", "区域", "项目", "岗位", "回访员", "接通", "离职类型", "主因", "状态", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap text-[var(--text3)]">{fmt(r.created_at)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.name ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.region ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.project ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.position ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.interviewer ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.contact_status ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.leave_type ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.main_reason ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${r.status === "completed" ? "bg-[var(--secondary)] text-[var(--text2)]" : "bg-[var(--warning-bg)] text-[var(--text-warning)]"}`}>
                    {r.status === "completed" ? "已完成" : "草稿"}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.target_id && (
                    <Link href={`/record/${r.target_id}`} className="text-[var(--brand)]">查看</Link>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-[var(--text3)]">还没有记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
