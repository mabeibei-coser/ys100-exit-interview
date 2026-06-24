import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import { DIMENSIONS } from "@/lib/schema";

export const dynamic = "force-dynamic";

function arr(v: unknown): string {
  if (!v) return "";
  try {
    const a = JSON.parse(String(v));
    return Array.isArray(a) ? a.join(" / ") : "";
  } catch {
    return "";
  }
}
function dt(ts: unknown): string {
  if (typeof ts !== "number") return "";
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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
    { header: "年龄段", key: "age_band", width: 8 },
    { header: "入职日期", key: "hire_date", width: 12 },
    { header: "离职日期", key: "leave_date", width: 12 },
    { header: "在职月数", key: "tenure_months", width: 9 },
    { header: "回访员", key: "interviewer", width: 10 },
    { header: "接通情况", key: "contact_status", width: 9 },
    { header: "离职类型", key: "leave_type", width: 12 },
    ...DIMENSIONS.map((d) => ({ header: d.label, key: d.key, width: 9 })),
    { header: "主因", key: "main_reason", width: 14 },
    { header: "薪酬细分", key: "pay_detail", width: 18 },
    { header: "去向", key: "destination", width: 14 },
    { header: "吸引点", key: "attraction", width: 18 },
    { header: "收入对比", key: "income_compare", width: 9 },
    { header: "差额(元/月)", key: "income_gap", width: 11 },
    { header: "可挽回", key: "retainable", width: 10 },
    { header: "改啥能留", key: "retain_condition", width: 18 },
    { header: "推荐朋友", key: "recommend", width: 8 },
    { header: "回聘意愿", key: "rehire", width: 8 },
    { header: "原话引述", key: "verbatim_quote", width: 36 },
    { header: "一句话真因", key: "one_line_summary", width: 24 },
  ];

  for (const r of rows) {
    ws.addRow({
      ...r,
      created_at: dt(r.created_at),
      status: r.status === "completed" ? "已完成" : "草稿",
      pay_detail: arr(r.pay_detail_json),
      attraction: arr(r.attraction_json),
    });
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
