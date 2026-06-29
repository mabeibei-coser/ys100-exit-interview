import { requireAdmin } from "@/lib/session";
import { buildReport } from "@/lib/aggregate";
import { buildReportHtml } from "@/lib/report-html";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 服务器端直接生成 PDF（用服务器已装的 Chrome / Puppeteer），点按钮即直接下载 .pdf。
export async function GET() {
  const s = await requireAdmin();
  if (!s) return new Response("无权限", { status: 403 });

  const html = buildReportHtml(buildReport(), { autoPrint: false });

  let browser: Awaited<ReturnType<typeof import("puppeteer").default.launch>> | undefined;
  try {
    const puppeteer = (await import("puppeteer")).default;
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
    });
    await browser.close();
    browser = undefined;

    const fname = `离职诊断报告_${new Date().toISOString().slice(0, 10)}.pdf`;
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    return new Response("PDF 生成失败：" + (e instanceof Error ? e.message : "未知错误"), { status: 500 });
  }
}
