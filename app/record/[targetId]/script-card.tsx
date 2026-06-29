"use client";

import { SCRIPT_CARD } from "@/lib/schema";

function Head({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-[13px] font-semibold text-[var(--brand)] leading-snug">
      {title}
      {hint && <span className="text-[11px] font-normal text-[var(--text3)] ml-1">（{hint}）</span>}
    </div>
  );
}

function Inner() {
  const c = SCRIPT_CARD;
  return (
    <>
      <div className="mb-2">
        <Head title={c.open.title} hint={c.open.hint} />
        <p className="text-[11.5px] text-[var(--text2)] leading-snug mt-0.5">{c.open.body}</p>
        <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: "#2E7D5B" }}>
          {c.open.sys}
        </p>
      </div>
      <div className="mb-2">
        <Head title={c.lead.title} hint={c.lead.hint} />
        <p className="text-[11.5px] text-[var(--text2)] leading-snug mt-0.5">{c.lead.body}</p>
        <p className="text-[11.5px] text-[var(--text3)] leading-snug mt-0.5">{c.lead.tip}</p>
      </div>
      <div className="mb-2">
        <Head title={c.cold.title} hint={c.cold.hint} />
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {c.cold.lines.map((l, i) => (
            <li key={i} className="text-[11.5px] text-[var(--text2)] leading-snug">· {l}</li>
          ))}
        </ul>
      </div>
      <div className="mb-2">
        <Head title={c.close.title} hint={c.close.hint} />
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {c.close.lines.map((l, i) => (
            <li key={i} className="text-[11.5px] text-[var(--text2)] leading-snug">· {l}</li>
          ))}
        </ul>
      </div>
      <p className="text-[11.5px] text-[var(--text-danger)] leading-snug mt-1.5 pt-1.5 border-t border-[var(--border)]">
        {c.taboo}
      </p>
    </>
  );
}

export default function ScriptCard() {
  return (
    <>
      {/* 桌面：常驻卡片，高度卡在底部操作条之上，整张一页排满不被遮挡 */}
      <div className="card p-3.5 hidden lg:block max-h-[calc(100vh-130px)] overflow-y-auto">
        <div className="text-[11px] font-semibold text-[var(--text3)] mb-1.5">话术卡 · 边打边看</div>
        <Inner />
      </div>
      {/* 手机：折叠 */}
      <details className="card p-4 lg:hidden">
        <summary className="text-sm font-semibold text-[var(--brand)] cursor-pointer">📋 话术卡（点开看引导）</summary>
        <div className="mt-3">
          <Inner />
        </div>
      </details>
    </>
  );
}
