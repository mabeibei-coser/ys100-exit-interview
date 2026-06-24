"use client";

import { useState } from "react";
import { withBase } from "@/lib/url";
import { FIELD_LABEL } from "@/lib/import-map";

interface Preview {
  headers: string[];
  mapping: Array<{ field: string; label: string; column: string | null }>;
  totalRows: number;
  skipped: number;
  byCaller: Record<string, number>;
  sample: Array<Record<string, unknown>>;
  warnings: string[];
  notes: string[];
  canImport: boolean;
}
interface Result {
  imported: number;
  dup: number;
  createdCallers: string[];
  byCaller: Record<string, number>;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(commit: boolean) {
    if (!file) return;
    setErr("");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    if (commit) fd.append("commit", "true");
    try {
      const res = await fetch(withBase("/api/admin/import"), { method: "POST", body: fd });
      const d = await res.json();
      if (!d.ok) {
        setErr(d.error || "失败");
        return;
      }
      if (commit) {
        setResult(d);
        setPreview(null);
      } else {
        setPreview(d);
        setResult(null);
      }
    } catch {
      setErr("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text2)] mb-1">导入派工</div>
      <p className="text-xs text-[var(--text3)] mb-4">
        上传已分好的 Excel（.xlsx）。系统按表头自动识别列、按「分给谁」列派给各回访员，并自动建好回访员账号。先预览映射，确认无误再导入。
      </p>

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setResult(null);
            setErr("");
          }}
          className="text-sm"
        />
        <button className="btn btn-ghost" disabled={!file || busy} onClick={() => send(false)}>
          {busy && !result ? "解析中…" : "预览"}
        </button>
      </div>

      {err && <div className="text-sm text-[var(--text-danger)] mb-3">{err}</div>}

      {preview && (
        <div className="card p-4 mb-4">
          <div className="font-medium mb-2">列识别结果</div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
            {preview.mapping.map((m) => (
              <div key={m.field} className="flex justify-between border-b border-[var(--border)] py-1">
                <span className="text-[var(--text2)]">{m.label}</span>
                <span className={m.column ? "" : "text-[var(--text-danger)]"}>
                  {m.column ? `← ${m.column}` : "未识别"}
                </span>
              </div>
            ))}
          </div>

          {preview.warnings.length > 0 && (
            <ul className="mb-2">
              {preview.warnings.map((w, i) => (
                <li key={i} className="text-sm text-[var(--text-warning)]">⚠ {w}</li>
              ))}
            </ul>
          )}
          {preview.notes && preview.notes.length > 0 && (
            <ul className="mb-3">
              {preview.notes.map((n, i) => (
                <li key={i} className="text-sm text-[var(--text2)]">✓ {n}</li>
              ))}
            </ul>
          )}

          <div className="text-sm mb-2">
            可导入 <b>{preview.totalRows}</b> 人
            {preview.skipped > 0 && <span className="text-[var(--text3)]">（跳过 {preview.skipped} 空行）</span>}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(preview.byCaller).map(([k, v]) => (
              <span key={k} className="text-xs bg-[var(--secondary)] rounded px-2 py-1">
                {k}: {v}
              </span>
            ))}
          </div>

          {preview.sample.length > 0 && (
            <div className="overflow-x-auto mb-3">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-left text-[var(--text3)]">
                    {Object.keys(FIELD_LABEL).map((f) => (
                      <th key={f} className="px-2 py-1 whitespace-nowrap">{FIELD_LABEL[f as keyof typeof FIELD_LABEL]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      {Object.keys(FIELD_LABEL).map((f) => (
                        <td key={f} className="px-2 py-1 whitespace-nowrap">{String(r[f] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button className="btn btn-primary" disabled={!preview.canImport || busy} onClick={() => send(true)}>
            {busy ? "导入中…" : `确认导入 ${preview.totalRows} 人`}
          </button>
          {!preview.canImport && <p className="text-xs text-[var(--text-danger)] mt-2">缺「姓名」列或无有效数据，无法导入</p>}
        </div>
      )}

      {result && (
        <div className="card p-4">
          <div className="font-medium text-[var(--brand)] mb-2">导入完成</div>
          <p className="text-sm">
            成功导入 <b>{result.imported}</b> 人
            {result.dup > 0 && <span className="text-[var(--text3)]">，跳过重复 {result.dup} 人</span>}。
          </p>
          {result.createdCallers.length > 0 && (
            <p className="text-sm mt-1">
              新建回访员账号：{result.createdCallers.join("、")}（用团队口令登录）
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(result.byCaller).map(([k, v]) => (
              <span key={k} className="text-xs bg-[var(--secondary)] rounded px-2 py-1">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
