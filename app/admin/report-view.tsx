"use client";

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import type { ReportData } from "@/lib/aggregate";

export default function ReportView({ report }: { report: ReportData }) {
  const paretoRef = useRef<HTMLCanvasElement>(null);
  const tenureRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const charts: Chart[] = [];
    if (paretoRef.current && report.pareto.data.length) {
      charts.push(
        new Chart(paretoRef.current, {
          type: "bar",
          data: {
            labels: report.pareto.labels,
            datasets: [{ data: report.pareto.data, backgroundColor: "#D85A30", borderRadius: 4, barThickness: 16 }],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { min: 0, max: 3, ticks: { stepSize: 1, color: "#888" }, grid: { color: "rgba(136,135,128,0.15)" } },
              y: { ticks: { color: "#888", font: { size: 12 } }, grid: { display: false } },
            },
          },
        })
      );
    }
    if (tenureRef.current && report.tenure.data.some((n) => n > 0)) {
      charts.push(
        new Chart(tenureRef.current, {
          type: "bar",
          data: {
            labels: report.tenure.labels,
            datasets: [
              {
                data: report.tenure.data,
                backgroundColor: report.tenure.labels.map((_, i) => (i < 2 ? "#E24B4A" : "#888780")),
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#888", autoSkip: false }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { color: "#888", precision: 0 }, grid: { color: "rgba(136,135,128,0.15)" } },
            },
          },
        })
      );
    }
    return () => charts.forEach((c) => c.destroy());
  }, [report]);

  const o = report.overview;
  const empty = o.count === 0;

  return (
    <div>
      {/* 进度看板 */}
      <SecLabel>回访进度</SecLabel>
      <div className="card p-4 mb-2">
        <div className="flex items-center gap-6 mb-3">
          <Stat big label="已完成访谈" value={`${o.doneTargets}`} hint={`计划 ${o.plannedTotal} · 完成率 ${o.completionRate}%`} />
          <div className="flex-1 h-2.5 rounded-full bg-[var(--secondary)] overflow-hidden">
            <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${o.completionRate}%` }} />
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
          还没有已完成的访谈。回访员提交后，这里会自动出报告。
        </div>
      ) : (
        <>
          {/* 概览 */}
          <SecLabel>概览</SecLabel>
          <div className="cards-grid">
            <Card label="已访谈人数" num={`${o.count}`} hint="已完成" />
            <Card
              label={o.leaveRatePct !== null ? "离职率" : "访谈完成率"}
              num={o.leaveRatePct !== null ? `${o.leaveRatePct}%` : `${o.completionRate}%`}
              hint={o.leaveRatePct !== null ? "占在岗" : `${o.doneTargets}/${o.plannedTotal}`}
            />
            <Card label="主动离职占比" num={`${o.activeRatioPct}%`} hint={`${o.activeCount} 人 · 被动 ${o.passiveCount} 已剔除`} />
            <Card label="平均在职" num={o.avgTenure !== null ? `${o.avgTenure} 月` : "—"} />
          </div>

          {/* ① 帕累托 */}
          <SecLabel>① 离职原因诊断 · 严重度排行</SecLabel>
          <Sub>9 维逐项打分均值（0–3，仅主动辞职）</Sub>
          <div className="card p-3" style={{ height: 340 }}>
            <canvas ref={paretoRef} />
          </div>

          {/* ② 热力图 */}
          <SecLabel>② 维度 × 项目 热力图</SecLabel>
          <Sub>颜色越深＝该项目这块越严重；样本不足 {"<5"} 人留空</Sub>
          <Heatmap projects={report.heatmap.projects} rows={report.heatmap.rows} />

          {/* ③ 工龄 */}
          <SecLabel>③ 按工龄切片</SecLabel>
          <Sub>前两档（≤3 月）是入职/培训没接住的闪离</Sub>
          <div className="card p-3" style={{ height: 230 }}>
            <canvas ref={tenureRef} />
          </div>

          {/* ④ 薪酬竞争力 */}
          <SecLabel>④ 薪酬竞争力专题</SecLabel>
          {report.destination.flows.length > 0 && (
            <div className="flex h-8 rounded-md overflow-hidden text-xs my-2">
              {report.destination.flows.map((fl, i) => (
                <div
                  key={fl.label}
                  className="flex items-center justify-center text-white"
                  style={{ width: `${fl.pct}%`, background: ["#185FA5", "#854F0B", "#5F5E5A", "#7a7a7a"][i % 4], minWidth: 40 }}
                >
                  {fl.label} {fl.pct}%
                </div>
              ))}
            </div>
          )}
          <div className="cards-grid">
            <div className="card p-3.5" style={{ background: "var(--danger-bg)" }}>
              <div className="text-sm text-[var(--text-danger)]">被同行平均高出</div>
              <div className="text-2xl font-semibold text-[var(--text-danger)]">
                {report.destination.gap !== null ? `¥${report.destination.gap}/月` : "—"}
              </div>
              <div className="text-xs text-[var(--text-danger)]">调薪谈判的硬证据</div>
            </div>
            <div className="card p-3.5">
              <div className="text-sm text-[var(--text2)]">新东家吸引点</div>
              <div className="text-sm mt-1 leading-relaxed">
                {report.destination.attractions.slice(0, 4).map((a) => `${a.label} ${a.pct}%`).join(" · ") || "—"}
              </div>
            </div>
          </div>

          {/* ⑤ 可挽回 & eNPS */}
          <SecLabel>⑤ 可挽回性 & 雇主健康度</SecLabel>
          <div className="cards-grid">
            <Card label="可挽回流失" num={report.retain.retainablePct !== null ? `${report.retain.retainablePct}%` : "—"} hint={`${report.retain.retainableCount} 人本可留下`} />
            <Card label="推荐净值 eNPS" num={report.retain.enps !== null ? `${report.retain.enps}` : "—"} hint={report.retain.enps !== null && report.retain.enps < 0 ? "预警区" : ""} danger={report.retain.enps !== null && report.retain.enps < 0} />
            <Card label="回聘白名单" num={`${report.retain.rehireCount} 人`} hint="愿留且愿回" />
          </div>

          {/* ⑥ 管理预警 */}
          <SecLabel>⑥ 管理预警 · 各项目主管维度均分</SecLabel>
          <Sub>分越高＝该项目主管问题越突出（仅主动辞职，样本≥5）</Sub>
          {report.managerRank.length ? (
            <div className="card p-2">
              {report.managerRank.map((m) => (
                <div key={m.project} className="flex items-center gap-3 px-2 py-1.5">
                  <span className="w-24 text-sm">{m.project}</span>
                  <div className="flex-1 h-3 rounded bg-[var(--secondary)] overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${(m.score / 3) * 100}%`, background: m.score >= 2 ? "#A32D2D" : "#D85A30" }} />
                  </div>
                  <span className="text-sm text-[var(--text2)] w-8 text-right">{m.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--text3)]">样本不足，暂无</div>
          )}

          {/* ⑦ 真话墙 */}
          <SecLabel>⑦ 真话佐证 · 原话摘录</SecLabel>
          <div className="grid sm:grid-cols-2 gap-3">
            {report.quotes.slice(0, 8).map((q, i) => (
              <div key={i} className="card p-3.5">
                <div className="text-sm leading-relaxed" style={{ fontFamily: "var(--serif, serif)" }}>
                  “{q.quote}”
                </div>
                {q.tag && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded" style={{ background: "var(--danger-bg)", color: "var(--text-danger)" }}>
                    {q.tag}
                  </span>
                )}
              </div>
            ))}
            {report.quotes.length === 0 && <div className="text-sm text-[var(--text3)]">暂无原话记录</div>}
          </div>
        </>
      )}
    </div>
  );
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-[var(--text2)] mt-7 mb-1">{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-[var(--text3)] mb-2">{children}</div>;
}
function Card({ label, num, hint, danger }: { label: string; num: string; hint?: string; danger?: boolean }) {
  return (
    <div className="card p-3.5">
      <div className="text-sm text-[var(--text2)]">{label}</div>
      <div className={`text-2xl font-semibold my-0.5 ${danger ? "text-[var(--text-danger)]" : ""}`}>{num}</div>
      {hint && <div className={`text-xs ${danger ? "text-[var(--text-danger)]" : "text-[var(--text3)]"}`}>{hint}</div>}
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

function bucket(s: number): [string, string] {
  if (s < 1.0) return ["#FCEBEB", "#A32D2D"];
  if (s < 1.5) return ["#F7C1C1", "#791F1F"];
  if (s < 2.0) return ["#F09595", "#501313"];
  if (s < 2.5) return ["#E24B4A", "#fff"];
  return ["#A32D2D", "#fff"];
}
function Heatmap({ projects, rows }: { projects: string[]; rows: Array<[string, Array<number | null>]> }) {
  if (!projects.length) return <div className="text-sm text-[var(--text3)]">样本不足，暂无热力图</div>;
  return (
    <div className="card p-3 overflow-x-auto">
      <div className="grid gap-1" style={{ gridTemplateColumns: `52px repeat(${projects.length}, minmax(48px,1fr))` }}>
        <div />
        {projects.map((p) => (
          <div key={p} className="text-[11px] text-[var(--text2)] text-center pb-1 truncate" title={p}>
            {p}
          </div>
        ))}
        {rows.map(([label, cells]) => (
          <Row key={label} label={label} cells={cells} />
        ))}
      </div>
    </div>
  );
}
function Row({ label, cells }: { label: string; cells: Array<number | null> }) {
  return (
    <>
      <div className="text-xs text-[var(--text2)] flex items-center">{label}</div>
      {cells.map((s, i) => {
        if (s === null) {
          return (
            <div key={i} className="text-xs text-center py-2 rounded" style={{ background: "#f1efe8", color: "#bcbbb5" }}>
              —
            </div>
          );
        }
        const [bg, fg] = bucket(s);
        return (
          <div key={i} className="text-xs text-center py-2 rounded" style={{ background: bg, color: fg }}>
            {s.toFixed(1)}
          </div>
        );
      })}
    </>
  );
}
