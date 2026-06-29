import { requireAdmin } from "@/lib/session";
import { buildReport } from "@/lib/aggregate";
import { buildReportHtml } from "@/lib/report-html";

export const dynamic = "force-dynamic";

// 导出实时六维诊断报告为自包含 HTML。
//  ?download=1 → 下载 .html 文件
//  ?print=1    → 内联打开并自动唤起打印（用户另存为 PDF）
//  默认        → 内联在浏览器打开
export async function GET(req: Request) {
  const s = await requireAdmin();
  if (!s) return new Response("无权限", { status: 403 });

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const print = url.searchParams.get("print") === "1";

  const data = buildReport();
  const html = buildReportHtml(data, { autoPrint: print });

  const date = new Date().toISOString().slice(0, 10);
  const fname = `离职诊断报告_${date}.html`;
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`;

  return new Response(html, { headers });
}
