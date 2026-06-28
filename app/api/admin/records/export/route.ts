import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import { DIMS, POINT_LABEL, DIM_BY_KEY } from "@/lib/schema";

export const dynamic = "force-dynamic";

function dt(ts: unknown): string {
  if (typeof ts !== "number") return "";
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function parse(v: unknown): Record<string, unknown> {
  if (!v) return {};
  try {
    const o = JSON.parse(String(v));
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const s = await requireAdmin();
  if (!s) return new Response("无权限", { status: 403 });

  const rows = getDb()
    .prepare("SELECT * FROM interviews ORDER BY created_at DESC")
    .all() as Array<Record<string, unknown>>;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("访谈明细");

  ws.columns = [
    { header: "提交时间", key: "created_at", width: 18 },
    { header: "状态", key: "status", width: 8 },
    { header: "姓名", key: "name", width: 10 },
    { header: "性别", key: "gender", width: 6 },
    { header: "区域", key: "region", width: 10 },
    { header: "项目", key: "project", width: 14 },
    { header: "岗位", key: "position", width: 10 },
    { header: "条线", key: "line", width: 8 },
    { header: "年龄段", key: "age_band", width: 8 },
    { header: "入职日期", key: "hire_date", width: 12 },
    { header: "离职日期", key: "leave_date", width: 12 },
    { header: "在职月数", key: "tenure_months", width: 9 },
    { header: "回访员", key: "interviewer", width: 10 },
    { header: "接通情况", key: "contact_status", width: 9 },
    { header: "离职类型", key: "leave_type", width: 12 },
    ...DIMS.map((d) => ({ header: d.name, key: "hit_" + d.key, width: 24 })),
    { header: "影响最大一维", key: "top_dim", width: 12 },
    { header: "可挽回", key: "retainable", width: 10 },
    { header: "去向", key: "destination", width: 12 },
    { header: "原话摘录(按维度)", key: "quotes", width: 50 },
  ];

  for (const r of rows) {
    const hits = parse(r.hits_json);
    const quotes = parse(r.quotes_json);
    const row: Record<string, unknown> = {
      ...r,
      created_at: dt(r.created_at),
      status: r.status === "completed" ? "已完成" : "草稿",
      top_dim: r.top_dim ? DIM_BY_KEY[String(r.top_dim)]?.name ?? r.top_dim : "",
    };
    for (const d of DIMS) {
      const keys = Array.isArray(hits[d.key]) ? (hits[d.key] as string[]) : [];
      row["hit_" + d.key] = keys.map((k) => POINT_LABEL[k] ?? k).join(" / ");
    }
    row.quotes = DIMS.map((d) => {
      const q = typeof quotes[d.key] === "string" ? (quotes[d.key] as string).trim() : "";
      return q ? `${d.short}：${q}` : "";
    })
      .filter(Boolean)
      .join("；");
    ws.addRow(row);
  }
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const fname = `离职访谈明细_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
    },
  });
}
