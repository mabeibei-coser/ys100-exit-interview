import { getDb } from "./db";
import {
  DIMENSIONS,
  DIM_SHORT,
  TENURE_BANDS,
  ACTIVE_LEAVE_TYPE,
  SMALL_SAMPLE_THRESHOLD,
  ATTRACTIONS,
  type DimensionKey,
} from "./schema";

export interface ReportData {
  overview: {
    count: number;
    activeCount: number;
    passiveCount: number;
    activeRatioPct: number;
    avgTenure: number | null;
    completionRate: number; // 0-100
    plannedTotal: number;
    doneTargets: number;
    leaveRatePct: number | null; // 需在岗总人数才有
  };
  pareto: { labels: string[]; data: number[] };
  heatmap: { projects: string[]; rows: Array<[string, Array<number | null>]> };
  tenure: { labels: string[]; data: number[] };
  destination: {
    flows: Array<{ label: string; pct: number; count: number }>;
    gap: number | null;
    attractions: Array<{ label: string; pct: number }>;
  };
  retain: { retainablePct: number | null; retainableCount: number; enps: number | null; rehireCount: number };
  managerRank: Array<{ project: string; score: number; count: number }>;
  quotes: Array<{ quote: string; tag: string }>;
  progress: {
    totalTargets: number;
    doneTargets: number;
    pendingTargets: number;
    unreachableTargets: number;
    byCaller: Array<{ name: string; total: number; done: number; pending: number }>;
  };
}

interface Row {
  [k: string]: unknown;
  leave_type: string | null;
  tenure_months: number | null;
  project: string | null;
  main_reason: string | null;
  verbatim_quote: string | null;
  destination: string | null;
  income_compare: string | null;
  income_gap: number | null;
  attraction_json: string | null;
  retainable: string | null;
  recommend: string | null;
  rehire: string | null;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function round1(n: number | null): number {
  return n === null ? 0 : Math.round(n * 10) / 10;
}
function parseArr(v: string | null): string[] {
  if (!v) return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function buildReport(): ReportData {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM interviews WHERE status = 'completed'").all() as Row[];
  const active = rows.filter((r) => r.leave_type === ACTIVE_LEAVE_TYPE);

  // ---- 概览 ----
  const count = rows.length;
  const activeCount = active.length;
  const passiveCount = count - activeCount;
  const tenures = rows.map((r) => r.tenure_months).filter((n): n is number => typeof n === "number");
  const plannedTotal = Number(process.env.PLANNED_TOTAL ?? 100) || 100;
  const headcount = process.env.HEADCOUNT_TOTAL ? Number(process.env.HEADCOUNT_TOTAL) : null;

  const targets = db
    .prepare("SELECT call_status, assigned_to FROM targets")
    .all() as Array<{ call_status: string; assigned_to: string | null }>;
  const doneTargets = targets.filter((t) => t.call_status === "done").length;
  const pendingTargets = targets.filter((t) => t.call_status === "pending").length;
  const unreachableTargets = targets.filter((t) => t.call_status === "unreachable").length;

  // ---- ① 原因诊断 帕累托（仅主动辞职）----
  const dimAvg = DIMENSIONS.map((d) => {
    const vals = active
      .map((r) => r[d.key] as number | null)
      .filter((n): n is number => typeof n === "number");
    return { key: d.key as DimensionKey, label: d.label, avg: avg(vals) ?? 0 };
  }).sort((a, b) => b.avg - a.avg);
  const pareto = {
    labels: dimAvg.map((d) => d.label),
    data: dimAvg.map((d) => round1(d.avg)),
  };

  // ---- ② 维度 × 项目 热力图（仅主动辞职，小样本灰掉）----
  const projCount = new Map<string, number>();
  for (const r of active) {
    if (r.project) projCount.set(r.project, (projCount.get(r.project) ?? 0) + 1);
  }
  const projects = [...projCount.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const heatRows: Array<[string, Array<number | null>]> = DIMENSIONS.map((d) => {
    const cells = projects.map((p) => {
      const vals = active
        .filter((r) => r.project === p)
        .map((r) => r[d.key] as number | null)
        .filter((n): n is number => typeof n === "number");
      if (vals.length < SMALL_SAMPLE_THRESHOLD) return null; // 小样本灰掉
      return round1(avg(vals));
    });
    return [DIM_SHORT[d.key as DimensionKey], cells];
  });

  // ---- ③ 按工龄切片（全部已完成）----
  const tenureData = TENURE_BANDS.map(
    (b) => tenures.filter((t) => t >= b.min && t < b.max).length
  );

  // ---- ④ 薪酬竞争力 ----
  const destCounts = new Map<string, number>();
  for (const r of rows) if (r.destination) destCounts.set(r.destination, (destCounts.get(r.destination) ?? 0) + 1);
  const destTotal = [...destCounts.values()].reduce((a, b) => a + b, 0);
  const flows = [...destCounts.entries()].map(([label, c]) => ({
    label,
    count: c,
    pct: destTotal ? Math.round((c / destTotal) * 100) : 0,
  }));
  const gapVals = rows
    .filter((r) => r.income_compare === "低" && typeof r.income_gap === "number")
    .map((r) => r.income_gap as number);
  const gap = gapVals.length ? Math.round(avg(gapVals)!) : null;
  const attrRows = rows.filter((r) => parseArr(r.attraction_json).length > 0);
  const attractions = ATTRACTIONS.map((a) => {
    const c = attrRows.filter((r) => parseArr(r.attraction_json).includes(a)).length;
    return { label: a, pct: attrRows.length ? Math.round((c / attrRows.length) * 100) : 0 };
  })
    .filter((x) => x.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  // ---- ⑤ 可挽回 & eNPS ----
  const retVals = rows.filter((r) => r.retainable);
  const retainableCount = retVals.filter((r) => r.retainable === "改了愿留").length;
  const retainablePct = retVals.length ? Math.round((retainableCount / retVals.length) * 100) : null;
  const recVals = rows.filter((r) => r.recommend === "愿" || r.recommend === "不愿");
  const yes = recVals.filter((r) => r.recommend === "愿").length;
  const no = recVals.filter((r) => r.recommend === "不愿").length;
  const enps = recVals.length ? Math.round(((yes - no) / recVals.length) * 100) : null;
  const rehireCount = rows.filter((r) => r.rehire === "愿").length;

  // ---- ⑥ 管理预警：各项目主管维度均分（仅主动辞职）----
  const managerRank = projects
    .map((p) => {
      const vals = active
        .filter((r) => r.project === p)
        .map((r) => r.score_manager as number | null)
        .filter((n): n is number => typeof n === "number");
      return { project: p, score: round1(avg(vals)), count: vals.length };
    })
    .filter((x) => x.count >= SMALL_SAMPLE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  // ---- ⑦ 真话墙 ----
  const quotes = rows
    .filter((r) => r.verbatim_quote && r.verbatim_quote.trim())
    .map((r) => ({
      quote: r.verbatim_quote as string,
      tag: [r.main_reason, r.project].filter(Boolean).join(" · "),
    }));

  // ---- 进度 ----
  const callerMap = new Map<string, { total: number; done: number; pending: number }>();
  for (const t of targets) {
    const name = t.assigned_to ?? "(未派)";
    const cur = callerMap.get(name) ?? { total: 0, done: 0, pending: 0 };
    cur.total++;
    if (t.call_status === "done") cur.done++;
    else cur.pending++;
    callerMap.set(name, cur);
  }
  const byCaller = [...callerMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);

  return {
    overview: {
      count,
      activeCount,
      passiveCount,
      activeRatioPct: count ? Math.round((activeCount / count) * 100) : 0,
      avgTenure: tenures.length ? round1(avg(tenures)) : null,
      completionRate: plannedTotal ? Math.round((doneTargets / plannedTotal) * 100) : 0,
      plannedTotal,
      doneTargets,
      leaveRatePct: headcount ? Math.round((count / headcount) * 1000) / 10 : null,
    },
    pareto,
    heatmap: { projects, rows: heatRows },
    tenure: { labels: TENURE_BANDS.map((b) => b.label), data: tenureData },
    destination: { flows, gap, attractions },
    retain: { retainablePct, retainableCount, enps, rehireCount },
    managerRank,
    quotes,
    progress: {
      totalTargets: targets.length,
      doneTargets,
      pendingTargets,
      unreachableTargets,
      byCaller,
    },
  };
}
