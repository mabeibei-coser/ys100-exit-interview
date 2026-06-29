"use client";

import { useState } from "react";
import { withBase } from "@/lib/url";

export default function ResetPanel({
  interviews,
  called,
  totalTargets,
}: {
  interviews: number;
  called: number;
  totalTargets: number;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const canClear = confirmText.trim() === "清除" && !busy;

  async function doReset() {
    if (!canClear) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(withBase("/api/admin/reset-calls"), { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!d.ok) {
        setErr(d.error || "清除失败");
        setBusy(false);
        return;
      }
      setDone(`已清除 ${d.clearedInterviews} 条访谈记录，${d.resetTargets} 人重置为「待拨」。`);
      setConfirmText("");
    } catch {
      setErr("网络错误，请重试");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text2)] mb-1">数据还原</div>
      <p className="text-xs text-[var(--text3)] mb-4">
        把整轮电话回访清零、从头再来。只有超管能操作。
      </p>

      <div className="card p-5" style={{ borderColor: "var(--text-danger)" }}>
        <div className="text-[15px] font-semibold text-[var(--text-danger)]">一键清除所有已拨打数据</div>
        <p className="text-sm text-[var(--text2)] mt-2 leading-relaxed">
          将<b>删除全部 {interviews} 条访谈记录</b>（六维勾选、原话、去向等），把<b> {called} 个已拨打的人</b>全部重置为「待拨」。
          <br />
          <span className="text-[var(--text3)]">名单（{totalTargets} 人）和所有账号都保留；只清回访产生的数据。</span>
        </p>
        <p className="mt-2 text-sm font-semibold text-[var(--text-danger)]">⚠ 此操作不可撤销，后台报告会随之清空。</p>

        {done ? (
          <div className="mt-4 rounded-md bg-[var(--ok-bg,#E8F0EA)] px-3 py-2.5 text-sm text-[var(--text-ok,#2E7D5B)]" style={{ background: "#E8F0EA", color: "#2E7D5B" }}>
            ✓ {done}
          </div>
        ) : (
          <div className="mt-4">
            <label className="label block mb-1.5">
              确认请在下方输入 <b className="text-[var(--text-danger)]">清除</b> 两个字：
            </label>
            <div className="flex items-center gap-3">
              <input
                className="input max-w-[200px]"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="输入：清除"
              />
              <button
                className="btn"
                style={{ background: canClear ? "var(--text-danger)" : "var(--secondary)", color: canClear ? "#fff" : "var(--text3)" }}
                disabled={!canClear}
                onClick={doReset}
              >
                {busy ? "清除中…" : "确认清除"}
              </button>
            </div>
            {err && <p className="text-sm text-[var(--text-danger)] mt-2">{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
