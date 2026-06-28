import { getDb } from "./db";
import {
  CORE_DIMS,
  DIM_BY_KEY,
  POINT_DIM,
  POINT_LABEL,
  ACTIVE_LEAVE_TYPE,
  APPRAISAL_LINES,
  PROJECT_MIN_SAMPLE,
  RETAINABLE,
  DESTINATIONS,
  LINES,
  type DimKey,
} from "./schema";

export interface DimMeta {
  key: string;
  no: string;
  name: string;
  short: string;
  color: string;
}
export interface RankRow extends DimMeta {
  hit: number;
  base: number;
  rate: number; // 0-100
  gated: boolean; // 考核：基数收窄到管家+工程
  applicable: boolean; // false＝该维无可用样本（考核维且无管家/工程深聊样本）→ 显示"样本不足"而非 0%
}
export interface PointStat {
  label: string;
  dimName: string;
  dimKey: string;
  color: string;
  count: number;
}
export interface HeatRow {
  project: string;
  n: number;
  cells: Array<number | null>; // 顺序＝CORE_DIMS；null＝该维对此项目不适用(考核·秩序)
  maxIdx: number;
}
export interface DrillDim extends RankRow {
  points: Array<{ label: string; count: number }>;
}
export interface ReportData {
  overview: {
    count: number;
    activeCount: number;
    passiveCount: number;
    deepCount: number;
    shallowCount: number;
    base: number; // 深聊∩主动＝原因分析基数
    avgTenure: number | null;
    completionRate: number;
    plannedTotal: number;
    doneTargets: number;
    leaveRatePct: number | null;
  };
  dims: DimMeta[]; // 六维（不含个人），给热力图列头
  rank: RankRow[];
  topPoints: PointStat[];
  heatmap: { rows: HeatRow[]; hiddenCount: number; hiddenNames: string[] };
  drill: DrillDim[];
  retain: Array<{ label: string; count: number; pct: number }>;
  destination: Array<{ label: string; count: number; pct: number }>;
  quotes: Array<{ quote: string; dimName: string; tag: string }>;
  progress: {
    totalTargets: number;
    doneTargets: number;
    pendingTargets: number;
    unreachableTargets: number;
    byCaller: Array<{ name: string; total: number; done: number; pending: number }>;
  };
}

interface Row {
  leave_type: string | null;
  contact_status: string | null;
  tenure_months: number | null;
  project: string | null;
  line: string | null;
  hits_json: string | null;
  quotes_json: string | null;
  retainable: string | null;
  destination: string | null;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function round1(n: number | null): number {
  return n === null ? 0 : Math.round(n * 10) / 10;
}
function parseHits(v: string | null): Record<string, string[]> {
  if (!v) return {};
  try {
    const o = JSON.parse(v);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function parseQuotes(v: string | null): Record<string, string> {
  if (!v) return {};
  try {
    const o = JSON.parse(v);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
/** 该人是否命中某维（该维至少勾了一个问题点） */
function hitDim(hits: Record<string, string[]>, dimKey: string): boolean {
  const a = hits[dimKey];
  return Array.isArray(a) && a.length > 0;
}
function lineKnown(line: string | null): boolean {
  return !!line && (LINES as readonly string[]).includes(line);
}
function appraisalApplicable(line: string | null): boolean {
  return !!line && (APPRAISAL_LINES as readonly string[]).includes(line);
}

export function buildReport(): ReportData {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM interviews WHERE status = 'completed'")
    .all() as Array<Row & Record<string, unknown>>;

  const active = rows.filter((r) => r.leave_type === ACTIVE_LEAVE_TYPE);
  // 原因分析基数＝主动离职 ∩ 深聊（敷衍记「未深聊」不进真因）
  const deep = active.filter((r) => r.contact_status === "深聊");
  const base = deep.length;
  const parsed = deep.map((r) => ({ ...r, hits: parseHits(r.hits_json), quotes: parseQuotes(r.quotes_json) }));

  // ---- 概览 ----
  const count = rows.length;
  const activeCount = active.length;
  const tenures = rows.map((r) => r.tenure_months).filter((n): n is number => typeof n === "number");
  const plannedTotal = Number(process.env.PLANNED_TOTAL ?? 100) || 100;
  const headcount = process.env.HEADCOUNT_TOTAL ? Number(process.env.HEADCOUNT_TOTAL) : null;

  const targets = db
    .prepare("SELECT call_status, assigned_to FROM targets")
    .all() as Array<{ call_status: string; assigned_to: string | null }>;
  const doneTargets = targets.filter((t) => t.call_status === "done").length;
  const pendingTargets = targets.filter((t) => t.call_status === "pending").length;
  const unreachableTargets = targets.filter((t) => t.call_status === "unreachable").length;

  // 全数据集里有没有「条线」信息（决定考核维是否真的收窄/置灰）
  const anyLineKnown = deep.some((r) => lineKnown(r.line));

  // 某维的基数：考核维若有条线信息则收窄到管家+工程，否则用全部深聊
  function dimBase(dimKey: string): { base: number; gated: boolean } {
    if (dimKey === "appraisal" && anyLineKnown) {
      return { base: parsed.filter((r) => appraisalApplicable(r.line)).length, gated: true };
    }
    return { base, gated: false };
  }

  // ---- ① 六维命中率排序 ----
  const rank: RankRow[] = CORE_DIMS.map((d) => {
    const { base: b, gated } = dimBase(d.key);
    const pool = d.key === "appraisal" && gated ? parsed.filter((r) => appraisalApplicable(r.line)) : parsed;
    const hit = pool.filter((r) => hitDim(r.hits, d.key)).length;
    return {
      key: d.key, no: d.no, name: d.name, short: d.short, color: d.color,
      hit, base: b, rate: b ? Math.round((hit / b) * 100) : 0, gated,
      applicable: !gated || b > 0,
    };
  }).sort((a, b) => b.rate - a.rate);

  // ---- ② 最高分细项（跨六维所有问题点，按命中人数）----
  const pointCount = new Map<string, number>();
  for (const r of parsed) {
    for (const d of CORE_DIMS) {
      for (const pk of r.hits[d.key] ?? []) pointCount.set(pk, (pointCount.get(pk) ?? 0) + 1);
    }
  }
  const topPoints: PointStat[] = [...pointCount.entries()]
    .map(([pk, count]) => {
      const dimKey = POINT_DIM[pk];
      const dim = DIM_BY_KEY[dimKey];
      return { label: POINT_LABEL[pk] ?? pk, dimName: dim?.name ?? "", dimKey, color: dim?.color ?? "#888", count };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ---- ③ 项目 × 六维 热力图（命中人数；小样本项目不显示）----
  const projCount = new Map<string, number>();
  for (const r of parsed) if (r.project) projCount.set(r.project, (projCount.get(r.project) ?? 0) + 1);
  const allProjects = [...projCount.entries()].sort((a, b) => b[1] - a[1]);
  const shownProjects = allProjects.filter(([, n]) => n >= PROJECT_MIN_SAMPLE);
  const hiddenProjects = allProjects.filter(([, n]) => n < PROJECT_MIN_SAMPLE);

  const heatRows: HeatRow[] = shownProjects.map(([project, n]) => {
    const inProj = parsed.filter((r) => r.project === project);
    const cells: Array<number | null> = CORE_DIMS.map((d) => {
      if (d.key === "appraisal" && anyLineKnown) {
        // 制度口径：考核仅管家+工程；项目无管家/工程样本则该格不适用（"—"），与命中率排序/钻取同口径
        const appPool = inProj.filter((r) => appraisalApplicable(r.line));
        if (appPool.length === 0) return null;
        return appPool.filter((r) => hitDim(r.hits, d.key)).length;
      }
      return inProj.filter((r) => hitDim(r.hits, d.key)).length;
    });
    // 全 0（没人命中任何维）不高亮任何格：maxIdx=-1（阈值用 0，而非 -1）
    let maxIdx = -1, maxV = 0;
    cells.forEach((v, i) => {
      if (v != null && v > maxV) { maxV = v; maxIdx = i; }
    });
    return { project, n, cells, maxIdx };
  });

  // ---- 二、六维 × 问题点钻取 ----
  const drill: DrillDim[] = rank.map((r) => {
    const d = DIM_BY_KEY[r.key];
    const pool = r.key === "appraisal" && r.gated ? parsed.filter((x) => appraisalApplicable(x.line)) : parsed;
    const points = d.points.map((p) => ({
      label: p.label,
      count: pool.filter((x) => (x.hits[d.key] ?? []).includes(p.key)).length,
    }));
    return { ...r, points };
  });

  // ---- 三、还能不能留 · 去向 ----
  function dist(field: "retainable" | "destination", order: readonly string[]) {
    const cnt = new Map<string, number>();
    for (const r of deep) {
      const v = r[field];
      if (v) cnt.set(v, (cnt.get(v) ?? 0) + 1);
    }
    const total = [...cnt.values()].reduce((a, b) => a + b, 0);
    return order
      .map((label) => ({ label, count: cnt.get(label) ?? 0 }))
      .filter((x) => x.count > 0)
      .map((x) => ({ ...x, pct: total ? Math.round((x.count / total) * 100) : 0 }));
  }
  const retain = dist("retainable", RETAINABLE);
  const destination = dist("destination", DESTINATIONS);

  // ---- 四、真话墙（按维度，配维度·条线/项目标签）----
  const quotes: Array<{ quote: string; dimName: string; tag: string }> = [];
  for (const r of parsed) {
    for (const d of CORE_DIMS.concat(DIM_BY_KEY["personal"] ? [DIM_BY_KEY["personal"]] : [])) {
      // 考核维与排序/热力图同口径：有条线信息时，非管家/工程的考核引语不上墙
      if (d.key === "appraisal" && anyLineKnown && !appraisalApplicable(r.line)) continue;
      const q = (r.quotes[d.key] ?? "").trim();
      if (q) {
        const tagParts = [r.line, r.project].filter(Boolean) as string[];
        quotes.push({ quote: q, dimName: d.name, tag: [d.short, ...tagParts].join(" · ") });
      }
    }
  }

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
  const byCaller = [...callerMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);

  return {
    overview: {
      count,
      activeCount,
      passiveCount: count - activeCount,
      deepCount: deep.length,
      shallowCount: active.length - deep.length,
      base,
      avgTenure: tenures.length ? round1(avg(tenures)) : null,
      completionRate: plannedTotal ? Math.round((doneTargets / plannedTotal) * 100) : 0,
      plannedTotal,
      doneTargets,
      leaveRatePct: headcount ? Math.round((count / headcount) * 1000) / 10 : null,
    },
    dims: CORE_DIMS.map((d) => ({ key: d.key, no: d.no, name: d.name, short: d.short, color: d.color })),
    rank,
    topPoints,
    heatmap: {
      rows: heatRows,
      hiddenCount: hiddenProjects.length,
      hiddenNames: hiddenProjects.map(([p]) => p.split("·")[0]),
    },
    drill,
    retain,
    destination,
    quotes,
    progress: { totalTargets: targets.length, doneTargets, pendingTargets, unreachableTargets, byCaller },
  };
}
