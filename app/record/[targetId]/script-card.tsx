"use client";

import { SCRIPT_CARD } from "@/lib/schema";

function Head({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-sm font-semibold text-[var(--brand)]">
      {title}
      {hint && <span className="text-xs font-normal text-[var(--text3)] ml-1">（{hint}）</span>}
    </div>
  );
}

function Inner() {
  const c = SCRIPT_CARD;
  return (
    <>
      <div className="mb-3">
        <Head title={c.open.title} hint={c.open.hint} />
        <p className="text-xs text-[var(--text2)] leading-relaxed mt-1">{c.open.body}</p>
        <p className="text-xs text-[var(--text-ok,#2E7D5B)] leading-relaxed mt-1" style={{ color: "var(--green,#2E7D5B)" }}>
          {c.open.sys}
        </p>
      </div>
      <div className="mb-3">
        <Head title={c.lead.title} hint={c.lead.hint} />
        <p className="text-xs text-[var(--text2)] leading-relaxed mt-1">{c.lead.body}</p>
        <p className="text-xs text-[var(--text3)] leading-relaxed mt-1">{c.lead.tip}</p>
      </div>
      <div className="mb-3">
        <Head title={c.cold.title} hint={c.cold.hint} />
        <ul className="mt-1 flex flex-col gap-1">
          {c.cold.lines.map((l, i) => (
            <li key={i} className="text-xs text-[var(--text2)] leading-relaxed">· {l}</li>
          ))}
        </ul>
      </div>
      <div className="mb-3">
        <Head title={c.close.title} hint={c.close.hint} />
        <ul className="mt-1 flex flex-col gap-1">
          {c.close.lines.map((l, i) => (
            <li key={i} className="text-xs text-[var(--text2)] leading-relaxed">· {l}</li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-[var(--text-danger)] leading-relaxed mt-2 pt-2 border-t border-[var(--border)]">
        {c.taboo}
      </p>
    </>
  );
}

export default function ScriptCard() {
  return (
    <>
      {/* 桌面：常驻卡片 */}
      <div className="card p-4 hidden lg:block max-h-[calc(100vh-80px)] overflow-y-auto">
        <div className="text-xs font-semibold text-[var(--text3)] mb-2">话术卡 · 边打边看</div>
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
