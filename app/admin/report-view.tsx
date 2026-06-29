"use client";

import type { ReportData, HeatRow } from "@/lib/aggregate";
import { withBase } from "@/lib/url";

export default function ReportView({ report }: { report: ReportData }) {
  const o = report.overview;
  const empty = o.count === 0;

  return (
    <div>
      {/* 导出 */}
      <div className="flex items-center justify-end gap-2 mb-1">
        <a href={withBase("/api/admin/report/export?download=1")} className="btn btn-ghost" style={{ padding: "6px 13px", fontSize: 13 }}>
          导出 HTML
        </a>
        <a href={withBase("/api/admin/report/export?print=1")} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "6px 13px", fontSize: 13 }}>
          下载 PDF
        </a>
      </div>

      {/* 回访进度 */}
      <SecLabel>回访进度</SecLabel>
      <div className="card p-4 mb-2">
        <div className="flex items-center gap-6 mb-3">
          <Stat big label="已完成访谈" value={`${o.doneTargets}`} hint={`计划 ${o.plannedTotal} · 完成率 ${o.completionRate}%`} />
          <div className="flex-1 h-2.5 rounded-full bg-[var(--secondary)] overflow-hidden">
            <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${Math.min(100, o.completionRate)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {report.progress.byCaller.map((c) => (
            <div key={c.name} className="flex items-center justify-between text-sm bg-[var(--secondary)] rounded-md px-3 py-2">
              <span>{c.name}</span>
              <span className="text-[var(--text2)]">
                {c.done}/{c.total} <span className="text-[var(--text3)]">剩 {c.pending}</span>
              </span>
            </div>
          ))}
        </div>
        {report.progress.unreachableTargets > 0 && (
          <p className="text-xs text-[var(--text-warning)] mt-2">未接通 {report.progress.unreachableTargets} 人（待重拨）</p>
        )}
      </div>

      {empty ? (
        <div className="card p-10 text-center text-[var(--text2)] mt-4">
          还没有已完成的访谈。回访员提交后，这里会自动出六维诊断报告。
        </div>
      ) : (
        <>
          {/* 概览 · 数据质量 */}
          <SecLabel>概览</SecLabel>
          <div className="cards-grid">
            <Card label="已访谈人数" num={`${o.count}`} hint="已完成" />
            <Card
              label={o.leaveRatePct !== null ? "离职率" : "访谈完成率"}
              num={o.leaveRatePct !== null ? `${o.leaveRatePct}%` : `${o.completionRate}%`}
              hint={o.leaveRatePct !== null ? "占在岗" : `${o.doneTargets}/${o.plannedTotal}`}
            />
            <Card label="主动离职" num={`${o.activeCount}`} hint={`被动 ${o.passiveCount} 已剔除`} />
            <Card label="深聊样本" num={`${o.deepCount}`} hint={`未深聊 ${o.shallowCount} 不进真因`} />
          </div>
          <p className="text-xs text-[var(--text3)] mt-2">
            本季主动离职 {o.activeCount} 人，深聊 {o.deepCount} / 未深聊 {o.shallowCount}；下方原因只基于 {o.base} 人深聊样本（多选，柱状图为提及率、不累计 100%）。被动离职已剔除。
          </p>

          {/* 一、诊断结论 */}
          <SecLabel>一、诊断结论</SecLabel>

          <Sub>① 六维谁最重（命中率排序，不合并维度）</Sub>
          <div className="card p-3.5">
            <RankBars rank={report.rank} />
          </div>

          <Sub>② 最高分细项：所有维度的问题点里，哪几条最扎眼</Sub>
          <div className="card p-3.5">
            {report.topPoints.length === 0 ? (
              <div className="text-sm text-[var(--text3)]">暂无命中问题点</div>
            ) : (
              <>
                <div className="text-[15px] font-semibold leading-relaxed mb-2">
                  分值最高的一个细项是 <b style={{ color: "var(--orange,#D85A30)" }}>「{report.topPoints[0].label}」</b>（{report.topPoints[0].dimName}），{report.topPoints[0].count} 人提及——也是全公司最该先动的那一刀。
                </div>
                {report.topPoints.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <span
                      className="flex-none w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                      style={{ background: i === 0 ? "#A32D2D" : "#D85A30" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px]">
                      <b>{p.label}</b> <span className="text-[var(--text3)] text-[11px]">· {p.dimName}</span>
                    </span>
                    <span className="ml-auto text-[13px] font-bold text-[var(--text-danger)]">{p.count}人</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <Sub>③ 落到项目：每个项目最该盯哪个维度（命中人数 · 蓝框＝最该先盯 · “—”＝考核仅管家/工程）</Sub>
          <Heatmap dims={report.dims} rows={report.heatmap.rows} hiddenCount={report.heatmap.hiddenCount} hiddenNames={report.heatmap.hiddenNames} />

          {/* 二、六维 × 问题点钻取 */}
          <SecLabel>二、六维 × 问题点钻取</SecLabel>
          <Sub>命中率＝提及该维的人 ÷ 深聊样本（考核维仅管家+工程为基数）。红≥40% / 橙 25–40% / 绿 &lt;25%。</Sub>
          <div className="grid sm:grid-cols-2 gap-3">
            {report.drill.map((d) => (
              <DrillCard key={d.key} dim={d} />
            ))}
          </div>

          {/* 三、还能不能留 · 去向 */}
          <SecLabel>三、还能不能留 · 去向</SecLabel>
          <div className="cards-grid">
            <div className="card p-3.5">
              <div className="text-sm text-[var(--text2)] mb-2">可挽回（改了愿留 / 看情况 / 铁了心）</div>
              <Segments items={report.retain} colors={["#2E7D5B", "#8a857a", "#b9352f"]} />
            </div>
            <div className="card p-3.5">
              <div className="text-sm text-[var(--text2)] mb-2">去向（同行 / 转行 / 没定）</div>
              <Segments items={report.destination} colors={["#185FA5", "#D85A30", "#8a857a"]} />
            </div>
          </div>

          {/* 四、真话墙 */}
          <SecLabel>四、真话墙（按维度）</SecLabel>
          <Sub>直接摘自访谈各维「原话摘录」，配维度·条线/项目标签。</Sub>
          <div className="grid sm:grid-cols-2 gap-3">
            {report.quotes.slice(0, 12).map((q, i) => (
              <div key={i} className="card p-3.5">
                <div className="text-sm leading-relaxed" style={{ fontFamily: "var(--serif, serif)" }}>“{q.quote}”</div>
                <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded" style={{ background: "var(--danger-bg)", color: "var(--text-danger)" }}>
                  {q.tag}
                </span>
              </div>
            ))}
            {report.quotes.length === 0 && <div className="text-sm text-[var(--text3)]">暂无原话记录</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ---- ① 命中率排序条 ----
function RankBars({ rank }: { rank: ReportData["rank"] }) {
  const rmax = Math.max(1, ...rank.map((r) => r.rate));
  return (
    <div className="flex flex-col gap-1.5">
      {rank.map((d) => (
        <div key={d.key} className="grid items-center gap-2.5" style={{ gridTemplateColumns: "92px 1fr 88px" }}>
          <div className="text-[12.5px] font-semibold text-right">{d.no} {d.name}</div>
          <div className="h-4 rounded bg-[var(--secondary)] overflow-hidden">
            {d.applicable && (
              <div className="h-full rounded" style={{ width: `${(d.rate / rmax) * 100}%`, background: d.color }} />
            )}
          </div>
          <div className="text-[12px] text-[var(--text2)] tabular-nums">
            {d.applicable ? `${d.rate}% · ${d.hit}人${d.gated ? ` /基${d.base}` : ""}` : "样本不足"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- ③ 热力图 ----
function heatColor(v: number, max: number): [string, string] {
  const f = max ? v / max : 0;
  if (f < 0.3) return ["#FCEBEB", "#A32D2D"];
  if (f < 0.55) return ["#F09595", "#501313"];
  if (f < 0.8) return ["#E24B4A", "#fff"];
  return ["#A32D2D", "#fff"];
}
function Heatmap({
  dims,
  rows,
  hiddenCount,
  hiddenNames,
}: {
  dims: ReportData["dims"];
  rows: HeatRow[];
  hiddenCount: number;
  hiddenNames: string[];
}) {
  if (!rows.length) {
    return (
      <div className="card p-4 text-sm text-[var(--text3)]">
        暂无可显示项目（单项目回访满 3 人才计入）。
        {hiddenCount > 0 && `已有 ${hiddenCount} 个项目样本不足。`}
      </div>
    );
  }
  const hmax = Math.max(1, ...rows.flatMap((r) => r.cells.filter((c): c is number => c != null)));
  // 各项目最该盯的维度
  const byMax: Record<string, string[]> = {};
  for (const r of rows) {
    if (r.maxIdx < 0) continue; // 全 0 项目不归因到任何维
    const dimName = dims[r.maxIdx]?.name ?? "";
    if (dimName) (byMax[dimName] = byMax[dimName] || []).push(r.project.split("·")[0]);
  }
  return (
    <div className="card p-3 overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th className="text-left px-2 py-1.5 font-medium" style={{ background: "var(--secondary)" }}>项目＼维度</th>
            {dims.map((d) => (
              <th key={d.key} className="px-2 py-1.5 font-medium text-center whitespace-nowrap" style={{ background: "var(--secondary)" }}>
                {d.no} {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.project}>
              <td className="px-2 py-1.5 font-semibold whitespace-nowrap" style={{ background: "#fbfaf7", border: "1px solid var(--border)" }}>
                {r.project}
              </td>
              {r.cells.map((c, i) => {
                if (c == null) {
                  return (
                    <td key={i} className="text-center px-2 py-1.5" style={{ border: "1px solid var(--border)", color: "#bbb" }}>—</td>
                  );
                }
                const [bg, fg] = heatColor(c, hmax);
                const isMax = i === r.maxIdx && c > 0;
                return (
                  <td
                    key={i}
                    className="text-center px-2 py-1.5 tabular-nums"
                    style={{
                      border: "1px solid var(--border)",
                      background: bg,
                      color: fg,
                      outline: isMax ? "2px solid var(--brand)" : undefined,
                      outlineOffset: isMax ? "-2px" : undefined,
                      fontWeight: isMax ? 700 : 400,
                    }}
                  >
                    {c}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-[var(--text2)] mt-2.5 leading-relaxed">
        读法：同样是“高离职”，病根不同、该下的药不同。各项目最该盯：
        {Object.entries(byMax).map(([k, ps], i) => (
          <span key={k}>
            {i > 0 ? "；" : ""}
            <b>{k}</b>（{ps.join("、")}）
          </span>
        ))}
        。
        {hiddenCount > 0 && (
          <span className="block text-[var(--text3)] mt-1">
            小样本把关：另有 {hiddenCount} 个项目回访不足 3 人（{hiddenNames.join("、")}），样本太小、未纳入热力图。
          </span>
        )}
      </div>
    </div>
  );
}

// ---- 二、钻取卡 ----
function DrillCard({ dim }: { dim: ReportData["drill"][number] }) {
  const sev = dim.rate >= 40 ? "hi" : dim.rate >= 25 ? "mid" : "lo";
  const sevStyle: Record<string, { bg: string; fg: string }> = {
    hi: { bg: "var(--danger-bg)", fg: "var(--text-danger)" },
    mid: { bg: "var(--warning-bg)", fg: "var(--text-warning)" },
    lo: { bg: "#E8F0EA", fg: "#2E7D5B" },
  };
  const maxp = Math.max(1, ...dim.points.map((p) => p.count));
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2">
        <h4 className="text-[13px] font-semibold">{dim.no} {dim.name}</h4>
        {dim.applicable ? (
          <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sevStyle[sev].bg, color: sevStyle[sev].fg }}>
            命中 {dim.rate}%（{dim.hit}人{dim.gated ? `/基${dim.base}` : ""}）
          </span>
        ) : (
          <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--secondary)", color: "var(--text3)" }}>
            样本不足
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {dim.points.map((p, i) => (
          <div key={i}>
            <div className="flex justify-between text-[11.5px] text-[var(--text2)] mb-0.5">
              <span>{p.label}</span>
              <span className="text-[var(--text3)]">{p.count}</span>
            </div>
            <div className="h-2 rounded bg-[var(--secondary)] overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(p.count / maxp) * 100}%`, background: dim.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- 三、分段条 ----
function Segments({ items, colors }: { items: Array<{ label: string; count: number; pct: number }>; colors: string[] }) {
  if (!items.length) return <div className="text-sm text-[var(--text3)]">暂无</div>;
  return (
    <div className="flex h-[22px] rounded-md overflow-hidden text-[11px] text-white font-semibold">
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center justify-center" style={{ width: `${it.pct}%`, background: colors[i % colors.length], minWidth: 44 }}>
          {it.label} {it.pct}%
        </div>
      ))}
    </div>
  );
}

// ---- 通用 ----
function SecLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-[var(--text2)] mt-7 mb-1 pl-2 border-l-[3px] border-[var(--brand)]">{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-[var(--text3)] mt-2 mb-2">{children}</div>;
}
function Card({ label, num, hint }: { label: string; num: string; hint?: string }) {
  return (
    <div className="card p-3.5">
      <div className="text-sm text-[var(--text2)]">{label}</div>
      <div className="text-2xl font-semibold my-0.5">{num}</div>
      {hint && <div className="text-xs text-[var(--text3)]">{hint}</div>}
    </div>
  );
}
function Stat({ label, value, hint, big }: { label: string; value: string; hint?: string; big?: boolean }) {
  return (
    <div>
      <div className={big ? "text-2xl font-semibold" : "text-lg font-semibold"}>{value}</div>
      <div className="text-xs text-[var(--text2)]">{label}</div>
      {hint && <div className="text-xs text-[var(--text3)] mt-0.5">{hint}</div>}
    </div>
  );
}
