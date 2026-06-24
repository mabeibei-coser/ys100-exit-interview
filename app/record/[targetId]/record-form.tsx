"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/url";
import {
  DIMENSIONS,
  SCORE_LEVELS,
  GENDERS,
  AGE_BANDS,
  CONTACT_STATUS,
  LEAVE_TYPES,
  PAY_DETAILS,
  DESTINATIONS,
  ATTRACTIONS,
  INCOME_COMPARE,
  RETAINABLE,
  YES_NO,
} from "@/lib/schema";
import ScriptCard from "./script-card";

type Dict = Record<string, unknown>;

function genUuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "u-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
  }
}

function parseArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string" && v) {
    try {
      const a = JSON.parse(v);
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function RecordForm({
  targetId,
  target,
  interview,
  interviewerName,
  nextTargetId,
}: {
  targetId: number;
  target: Dict;
  interview: Dict | null;
  interviewerName: string;
  nextTargetId: number | null;
}) {
  const src = interview ?? {};
  const pre = (k: string, fallback: unknown = "") =>
    src[k] ?? target[k] ?? fallback;

  const [f, setF] = useState<Dict>(() => ({
    uuid: (interview?.uuid as string) || genUuid(),
    name: pre("name"),
    gender: pre("gender"),
    region: pre("region"),
    project: pre("project"),
    position: pre("position"),
    age_band: pre("age_band"),
    hire_date: pre("hire_date"),
    leave_date: pre("leave_date"),
    tenure_months: pre("tenure_months", ""),
    interviewer: src["interviewer"] ?? interviewerName,
    contact_status: pre("contact_status"),
    leave_type: pre("leave_type"),
    score_salary: src["score_salary"] ?? null,
    score_social: src["score_social"] ?? null,
    score_schedule: src["score_schedule"] ?? null,
    score_manager: src["score_manager"] ?? null,
    score_promotion: src["score_promotion"] ?? null,
    score_commute: src["score_commute"] ?? null,
    score_family: src["score_family"] ?? null,
    score_prospect: src["score_prospect"] ?? null,
    score_colleague: src["score_colleague"] ?? null,
    main_reason: pre("main_reason"),
    pay_detail: parseArr(src["pay_detail_json"]),
    destination: pre("destination"),
    attraction: parseArr(src["attraction_json"]),
    income_compare: pre("income_compare"),
    income_gap: src["income_gap"] ?? "",
    retainable: pre("retainable"),
    retain_condition: pre("retain_condition"),
    recommend: pre("recommend"),
    rehire: pre("rehire"),
    verbatim_quote: pre("verbatim_quote"),
    one_line_summary: pre("one_line_summary"),
  }));

  const [submitted, setSubmitted] = useState((interview?.status as string) === "completed");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const phone = str(target.phone);
  async function copyPhone() {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  }

  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const save = useCallback(
    async (status: "draft" | "completed") => {
      const res = await fetch(withBase(`/api/interview/${targetId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "保存失败");
      }
    },
    [f, targetId]
  );

  // 自动存草稿（改动后 1.5s）
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (submitted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaveState("saving");
        await save("draft");
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [f, save, submitted]);

  async function onSubmit(goNext = false) {
    setErr("");
    if (!f.contact_status) {
      setErr("请先在最上方选「接通情况」");
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setBusy(true);
    try {
      await save("completed");
      if (goNext && nextTargetId) window.location.href = withBase(`/record/${nextTargetId}`);
      else window.location.href = withBase("/mine");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败");
      setBusy(false);
    }
  }

  async function markUnreachable() {
    setBusy(true);
    try {
      await fetch(withBase(`/api/target/${targetId}/status`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "unreachable" }),
      });
      window.location.href = withBase("/mine");
    } catch {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-[var(--border)] sticky top-0 z-20">
        <a href={withBase("/mine")} className="text-sm text-[var(--text2)] hover:text-[var(--text)]">
          ← 我的派工
        </a>
        <div className="font-semibold">
          {String(f.name || "记录")}
          {submitted && <span className="ml-2 text-xs text-[var(--text2)]">（已提交·可修改）</span>}
        </div>
        <div className="w-24 text-right">
          {saveState === "saving" && <span className="text-xs text-[var(--text3)]">保存中…</span>}
          {saveState === "saved" && <span className="text-xs text-[var(--text2)]">✓ 已自动保存</span>}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[300px_1fr] gap-5 max-w-5xl mx-auto p-4 lg:p-5">
        {/* 话术卡：桌面固定在左，手机折叠在上 */}
        <aside className="lg:sticky lg:top-[60px] lg:self-start mb-4 lg:mb-0">
          <ScriptCard />
        </aside>

        {/* 表单 */}
        <div className="flex flex-col gap-5">
          {/* 通话横幅：在打谁 + 电话 + 先选接通情况 */}
          <div ref={bannerRef} className="card p-4" style={{ borderColor: "var(--brand)" }}>
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs text-[var(--text2)]">正在回访</div>
                <div className="text-xl font-semibold">{str(f.name) || "—"}</div>
                <div className="text-sm text-[var(--text2)] mt-0.5">
                  {[str(f.project), str(f.position), str(f.region)].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              {phone && (
                <div className="text-right">
                  <a href={`tel:${phone}`} className="text-lg font-semibold text-[var(--brand)]">
                    {phone}
                  </a>
                  <button
                    type="button"
                    onClick={copyPhone}
                    className="btn btn-ghost ml-2 align-middle"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    {copied ? "已复制" : "复制号码"}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3">
              <label className="label block mb-1.5">接通情况（先选这一项）</label>
              <Radio options={CONTACT_STATUS} value={str(f.contact_status)} onChange={(v) => set("contact_status", v)} />
            </div>
          </div>

          <Section title="基本信息" hint="从名单预填，可改">
            <div className="grid grid-cols-2 gap-3">
              <Field label="姓名">
                <input className="input" value={str(f.name)} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="性别">
                <Radio options={GENDERS} value={str(f.gender)} onChange={(v) => set("gender", v)} />
              </Field>
              <Field label="区域">
                <input className="input" value={str(f.region)} onChange={(e) => set("region", e.target.value)} />
              </Field>
              <Field label="项目">
                <input className="input" value={str(f.project)} onChange={(e) => set("project", e.target.value)} />
              </Field>
              <Field label="岗位">
                <input className="input" value={str(f.position)} onChange={(e) => set("position", e.target.value)} />
              </Field>
              <Field label="年龄段">
                <select className="input" value={str(f.age_band)} onChange={(e) => set("age_band", e.target.value)}>
                  <option value="">—</option>
                  {AGE_BANDS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="入职日期">
                <input className="input" placeholder="如 2024-05" value={str(f.hire_date)} onChange={(e) => set("hire_date", e.target.value)} />
              </Field>
              <Field label="离职日期">
                <input className="input" placeholder="如 2026-05" value={str(f.leave_date)} onChange={(e) => set("leave_date", e.target.value)} />
              </Field>
              <Field label="在职月数">
                <input className="input" type="number" step="0.1" value={str(f.tenure_months)} onChange={(e) => set("tenure_months", e.target.value)} />
              </Field>
              <Field label="回访员">
                <input className="input bg-[var(--secondary)]" value={str(f.interviewer)} readOnly />
              </Field>
            </div>
            <Field label="离职类型" className="mt-3">
              <Radio options={LEAVE_TYPES} value={str(f.leave_type)} onChange={(v) => set("leave_type", v)} />
              <p className="text-xs text-[var(--text3)] mt-1">被动离职（辞退/到期/撤场）不进原因分析</p>
            </Field>
          </Section>

          <Section title="离职原因 · 逐项打分" hint="每个维度问：对您下决心走，有没有影响？">
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] gap-2 text-xs text-[var(--text3)] px-1">
                <div>维度</div>
                {SCORE_LEVELS.map((l) => (
                  <div key={l.v} className="text-center">{l.v} {l.label}</div>
                ))}
              </div>
              {DIMENSIONS.map((d) => (
                <ScoreRow
                  key={d.key}
                  label={d.label}
                  value={f[d.key] as number | null}
                  onChange={(v) => set(d.key, v)}
                />
              ))}
            </div>
            <Field label="最主要的一个（主因）" className="mt-3">
              <input className="input" value={str(f.main_reason)} onChange={(e) => set("main_reason", e.target.value)} />
            </Field>
          </Section>

          <Section title="薪酬细分" hint="沾钱才填，可多选">
            <ChipMulti options={PAY_DETAILS} value={f.pay_detail as string[]} onChange={(v) => set("pay_detail", v)} />
          </Section>

          <Section title="去向">
            <Field label="下一份工作">
              <ChipSingle options={DESTINATIONS} value={str(f.destination)} onChange={(v) => set("destination", v)} />
            </Field>
            <Field label="最吸引点（多选）" className="mt-3">
              <ChipMulti options={ATTRACTIONS} value={f.attraction as string[]} onChange={(v) => set("attraction", v)} />
            </Field>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="收入对比">
                <ChipSingle options={INCOME_COMPARE} value={str(f.income_compare)} onChange={(v) => set("income_compare", v)} />
              </Field>
              <Field label="差约（元/月）">
                <input className="input" type="number" value={str(f.income_gap)} onChange={(e) => set("income_gap", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="可挽回性 & 健康度">
            <Field label="可挽回">
              <ChipSingle options={RETAINABLE} value={str(f.retainable)} onChange={(v) => set("retainable", v)} />
            </Field>
            <Field label="改啥能留" className="mt-3">
              <input className="input" value={str(f.retain_condition)} onChange={(e) => set("retain_condition", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="推荐朋友来">
                <ChipSingle options={YES_NO} value={str(f.recommend)} onChange={(v) => set("recommend", v)} />
              </Field>
              <Field label="回聘意愿">
                <ChipSingle options={YES_NO} value={str(f.rehire)} onChange={(v) => set("rehire", v)} />
              </Field>
            </div>
          </Section>

          <Section title="⭐ 原话引述" hint="照原话记，别概括，1–2 句">
            <textarea
              className="input min-h-[80px] resize-y"
              value={str(f.verbatim_quote)}
              onChange={(e) => set("verbatim_quote", e.target.value)}
            />
            <Field label="回访员一句话真因总结" className="mt-3">
              <input className="input" value={str(f.one_line_summary)} onChange={(e) => set("one_line_summary", e.target.value)} />
            </Field>
          </Section>

          {/* 给底部常驻操作条留空间 */}
          <div className="h-24" />
        </div>
      </div>

      {/* 底部常驻操作条：滚到哪都能提交 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 lg:px-5 py-3 flex items-center gap-3">
          {err && <span className="text-sm text-[var(--text-danger)] mr-auto">{err}</span>}
          {!err && <span className="text-xs text-[var(--text3)] mr-auto hidden sm:block">填完点提交；打不通就标未接通</span>}
          <button className="btn btn-ghost" onClick={markUnreachable} disabled={busy}>
            标记未接通
          </button>
          <button className="btn btn-primary" onClick={() => onSubmit(false)} disabled={busy}>
            {submitted ? "保存修改" : "提交"}
          </button>
          {!submitted && nextTargetId && (
            <button className="btn btn-primary" onClick={() => onSubmit(true)} disabled={busy}>
              提交并下一个 →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// ---- 小组件 ----
function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="font-semibold text-[var(--brand)]">{title}</h2>
      {hint && <p className="text-xs text-[var(--text3)] mt-0.5 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] gap-2 items-center">
      <div className="text-sm">{label}</div>
      {SCORE_LEVELS.map((l) => (
        <div
          key={l.v}
          className="score-cell"
          data-on={value === l.v ? 1 : 0}
          onClick={() => onChange(value === l.v ? null : l.v)}
        >
          {l.v}
        </div>
      ))}
    </div>
  );
}

function Radio({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <div key={o} className="chip" data-on={value === o ? 1 : 0} onClick={() => onChange(value === o ? "" : o)}>
          {o}
        </div>
      ))}
    </div>
  );
}

const ChipSingle = Radio;

function ChipMulti({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const on = new Set(value);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <div
          key={o}
          className="chip"
          data-on={on.has(o) ? 1 : 0}
          onClick={() => {
            const next = new Set(on);
            if (next.has(o)) next.delete(o);
            else next.add(o);
            onChange([...next]);
          }}
        >
          {o}
        </div>
      ))}
    </div>
  );
}
