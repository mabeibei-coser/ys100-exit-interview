"use client";

import { useState } from "react";
import { withBase } from "@/lib/url";

export default function ReportExport() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function downloadPdf() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(withBase("/api/admin/report/pdf"));
      if (!res.ok) {
        setErr("PDF 生成失败，请重试");
        setBusy(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `离职诊断报告_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErr("网络错误，请重试");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center justify-end gap-2 mb-1">
      {err && <span className="text-xs text-[var(--text-danger)] mr-1">{err}</span>}
      <a
        href={withBase("/api/admin/report/export?download=1")}
        className="btn btn-ghost"
        style={{ padding: "6px 13px", fontSize: 13 }}
      >
        导出 HTML
      </a>
      <button
        onClick={downloadPdf}
        disabled={busy}
        className="btn btn-primary"
        style={{ padding: "6px 13px", fontSize: 13 }}
      >
        {busy ? "生成中…" : "下载 PDF"}
      </button>
    </div>
  );
}
