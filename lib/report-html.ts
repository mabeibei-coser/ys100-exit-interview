import type { ReportData } from "./aggregate";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function heatColor(v: number, max: number): [string, string] {
  const f = max ? v / max : 0;
  if (f < 0.3) return ["#FCEBEB", "#A32D2D"];
  if (f < 0.55) return ["#F09595", "#501313"];
  if (f < 0.8) return ["#E24B4A", "#fff"];
  return ["#A32D2D", "#fff"];
}

/** 把实时报告数据渲染成自包含 HTML（内联样式、无外部依赖、可离线打开/打印成 PDF）。 */
export function buildReportHtml(data: ReportData, opts: { autoPrint?: boolean } = {}): string {
  const o = data.overview;
  const date = new Date().toISOString().slice(0, 10);

  // ① 六维命中率排序
  const rmax = Math.max(1, ...data.rank.map((r) => (r.applicable ? r.rate : 0)));
  const rankRows = data.rank
    .map((d) => {
      const right = d.applicable ? `${d.rate}% · ${d.hit}人${d.gated ? ` /基${d.base}` : ""}` : "样本不足";
      const w = d.applicable ? (d.rate / rmax) * 100 : 0;
      return `<div class="rankrow"><div class="nm">${esc(d.no)} ${esc(d.name)}</div>
        <div class="track"><div class="fill" style="width:${w}%;background:${d.color}"></div></div>
        <div class="val">${esc(right)}</div></div>`;
    })
    .join("");

  // ② 最高分细项
  const top = data.topPoints;
  const verdict = top.length
    ? `分值最高的一个细项是 <b>「${esc(top[0].label)}」</b>（${esc(top[0].dimName)}），${top[0].count} 人提及——也是全公司最该先动的那一刀。`
    : "暂无命中问题点。";
  const topRows = top
    .map(
      (p, i) =>
        `<div class="toprow"><div class="rk"${i === 0 ? ' style="background:#A32D2D"' : ""}>${i + 1}</div>
        <div class="pt"><b>${esc(p.label)}</b> <span class="dt">· ${esc(p.dimName)}</span></div>
        <div class="cnt">${p.count}人</div></div>`
    )
    .join("");

  // ③ 项目 × 六维 热力图
  const dimsHead = data.dims.map((d) => `<th>${esc(d.no)} ${esc(d.short)}</th>`).join("");
  const hmax = Math.max(1, ...data.heatmap.rows.flatMap((r) => r.cells.filter((c): c is number => c != null)));
  const heatRows = data.heatmap.rows
    .map((r) => {
      const cells = r.cells
        .map((c, i) => {
          if (c == null) return `<td class="cell" style="color:#bbb">—</td>`;
          const [bg, fg] = heatColor(c, hmax);
          const mx = i === r.maxIdx && c > 0;
          return `<td class="cell${mx ? " mx" : ""}" style="background:${bg};color:${fg}">${c}</td>`;
        })
        .join("");
      return `<tr><td class="pj">${esc(r.project)}</td>${cells}</tr>`;
    })
    .join("");
  const hiddenNote = data.heatmap.hiddenCount
    ? `<div style="font-size:11px;color:#9b9a94;margin-top:7px">小样本把关：另有 ${data.heatmap.hiddenCount} 个项目回访不足 3 人（${esc(
        data.heatmap.hiddenNames.join("、")
      )}），样本太小、未纳入热力图。</div>`
    : "";

  // 二、钻取
  const drillCards = data.drill
    .map((d) => {
      const sev = d.applicable ? (d.rate >= 40 ? "hi" : d.rate >= 25 ? "mid" : "lo") : "lo";
      const badge = d.applicable ? `命中 ${d.rate}%（${d.hit}人${d.gated ? `/基${d.base}` : ""}）` : "样本不足";
      const maxp = Math.max(1, ...d.points.map((p) => p.count));
      const bars = d.points
        .map(
          (p) =>
            `<div class="pbar"><div class="lb"><span>${esc(p.label)}</span><span class="n">${p.count}</span></div>
          <div class="track"><div class="fill" style="width:${(p.count / maxp) * 100}%;background:${d.color}"></div></div></div>`
        )
        .join("");
      return `<div class="dcard"><h4>${esc(d.no)} ${esc(d.name)}<span class="sev ${sev}">${esc(badge)}</span></h4>${bars}</div>`;
    })
    .join("");

  // 三、可挽回 / 去向
  function seg(items: Array<{ label: string; pct: number }>, colors: string[]): string {
    if (!items.length) return `<div style="font-size:12px;color:#9b9a94">暂无</div>`;
    return `<div class="seg">${items
      .map((it, i) => `<div style="width:${it.pct}%;background:${colors[i % colors.length]}">${esc(it.label)} ${it.pct}%</div>`)
      .join("")}</div>`;
  }
  const retainSeg = seg(data.retain, ["#2E7D5B", "#8a857a", "#b9352f"]);
  const destSeg = seg(data.destination, ["#185FA5", "#D85A30", "#8a857a"]);

  // 四、真话墙
  const quotes = data.quotes.length
    ? data.quotes
        .slice(0, 16)
        .map((q) => `<div class="quote"><div class="q">"${esc(q.quote)}"</div><span class="tag">${esc(q.tag)}</span></div>`)
        .join("")
    : `<div style="font-size:12px;color:#9b9a94">暂无原话记录</div>`;

  const printScript = opts.autoPrint
    ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>一线离职原因诊断报告（六维）· 永升服务 · ${date}</title>
<style>
  :root{--bg:#faf9f6;--card:#fff;--sec:#f1efe8;--text:#262521;--text2:#6b6a64;--text3:#9b9a94;--danger:#A32D2D;--dangerbg:#FCEBEB;--warnbg:#FAEEDA;--warn:#854F0B;--okbg:#E8F0EA;--ok:#2E7D5B;--navy:#1F4E79;--orange:#D85A30;--border:rgba(0,0,0,.12)}
  *{box-sizing:border-box}
  body{background:var(--bg);color:var(--text);font-family:"微软雅黑","Segoe UI",system-ui,sans-serif;margin:0;padding:24px;line-height:1.55;font-size:13px}
  .wrap{max-width:860px;margin:0 auto}
  .head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--navy);padding-bottom:10px;margin-bottom:6px}
  h1{font-size:21px;font-weight:600;margin:0}.sub{font-size:12px;color:var(--text3);margin-top:4px}
  .quality{font-size:12px;color:var(--text3);margin:6px 0 0}
  .seclabel{font-size:14px;font-weight:700;margin:24px 0 8px;padding-left:9px;border-left:3px solid var(--navy)}
  .sublabel{font-size:13px;font-weight:600;color:var(--text2);margin:14px 0 7px}
  .box{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:13px 15px}
  .rankrow{display:grid;grid-template-columns:104px 1fr 92px;gap:9px;align-items:center;margin:5px 0;font-size:12.5px}
  .rankrow .nm{font-weight:600;text-align:right}.rankrow .track{height:16px;background:var(--sec);border-radius:3px;overflow:hidden}
  .rankrow .fill{height:100%;border-radius:3px}.rankrow .val{color:var(--text2);font-size:12px}
  .verdict{font-size:15px;font-weight:600;margin:2px 0 8px}.verdict b{color:var(--orange)}
  .toprow{display:grid;grid-template-columns:22px 1fr auto;gap:9px;align-items:center;margin:5px 0;font-size:12.5px}
  .toprow .rk{color:#fff;background:var(--orange);font-weight:700;text-align:center;border-radius:50%;width:20px;height:20px;line-height:20px;font-size:11px}
  .toprow .dt{color:var(--text3);font-size:11px}.toprow .cnt{font-weight:700;color:var(--danger)}
  table.heat{border-collapse:collapse;font-size:12px;width:100%}
  table.heat th,table.heat td{border:1px solid var(--border);padding:6px 7px;text-align:center}
  table.heat th{background:var(--sec);font-weight:600;font-size:11.5px}
  table.heat td.pj{text-align:left;font-weight:600;white-space:nowrap;background:#fbfaf7}
  table.heat td.mx{outline:2px solid var(--navy);outline-offset:-2px;font-weight:700}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
  .dcard{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px 14px}
  .dcard h4{margin:0 0 9px;font-size:13px;display:flex;align-items:center;gap:7px}
  .sev{margin-left:auto;font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px}
  .sev.hi{background:var(--dangerbg);color:var(--danger)}.sev.mid{background:var(--warnbg);color:var(--warn)}.sev.lo{background:var(--okbg);color:var(--ok)}
  .pbar{margin:4px 0}.pbar .lb{display:flex;justify-content:space-between;font-size:11.5px;color:var(--text2);margin-bottom:2px}
  .pbar .lb .n{color:var(--text3)}.pbar .track{height:10px;background:var(--sec);border-radius:3px;overflow:hidden}.pbar .fill{height:100%;border-radius:3px}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:11px}.card{background:var(--sec);border-radius:8px;padding:12px 14px}
  .card .lab{font-size:12.5px;color:var(--text2)}
  .seg{display:flex;height:22px;border-radius:5px;overflow:hidden;margin-top:7px;font-size:11px;color:#fff;font-weight:600}.seg>div{display:flex;align-items:center;justify-content:center;min-width:44px}
  .quotes{display:grid;grid-template-columns:1fr 1fr;gap:11px}
  .quote{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px}.quote .q{font-family:"Songti SC","SimSun",serif;font-size:13.5px}
  .tag{display:inline-block;background:var(--dangerbg);color:var(--danger);font-size:11px;padding:2px 8px;border-radius:8px;margin-top:7px}
  .foot{font-size:11px;color:var(--text3);margin-top:18px;border-top:1px solid var(--border);padding-top:8px}
  @media print{body{padding:0;background:#fff}@page{margin:14mm}.dcard,.quote,.box{break-inside:avoid}}
</style></head><body><div class="wrap">
  <div class="head"><div><h1>一线离职原因诊断报告</h1><div class="sub">永升服务 · 按离职回访六维诊断 · 导出于 ${date}</div></div></div>
  <div class="quality">本季主动离职 ${o.activeCount} 人，电话回访深聊 ${o.deepCount} / 未深聊 ${o.shallowCount}；下方原因只基于 ${o.base} 人深聊样本（多选，柱状图为提及率、不累计 100%）。被动离职已剔除。</div>

  <div class="seclabel">一、诊断结论</div>
  <div class="sublabel">① 六维谁最重（命中率排序，不合并维度）</div>
  <div class="box">${rankRows}</div>
  <div class="sublabel">② 最高分细项：所有维度的问题点里，哪几条最扎眼</div>
  <div class="box"><div class="verdict">${verdict}</div>${topRows}</div>
  <div class="sublabel">③ 落到项目：每个项目最该盯哪个维度（命中人数 · 蓝框＝最该先盯 · "—"＝考核仅管家/工程）</div>
  <div class="box" style="overflow-x:auto"><table class="heat"><tr><th style="text-align:left">项目＼维度</th>${dimsHead}</tr>${heatRows}</table>${hiddenNote}</div>

  <div class="seclabel">二、六维 × 问题点钻取</div>
  <div class="grid2">${drillCards}</div>

  <div class="seclabel">三、还能不能留 · 去向</div>
  <div class="cards">
    <div class="card"><div class="lab">可挽回（改了愿留 / 看情况 / 铁了心）</div>${retainSeg}</div>
    <div class="card"><div class="lab">去向（同行 / 转行 / 没定）</div>${destSeg}</div>
  </div>

  <div class="seclabel">四、真话墙（按维度）</div>
  <div class="quotes">${quotes}</div>

  <div class="foot">永升服务 · 人力资源部 · 离职访谈记录系统实时导出。纯 HTML、无外部依赖、可离线打开与打印成 PDF。</div>
</div>${printScript}</body></html>`;
}
