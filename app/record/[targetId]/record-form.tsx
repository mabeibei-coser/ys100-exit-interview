"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/url";
import {
  DIMS,
  GENDERS,
  AGE_BANDS,
  CONTACT_STATUS,
  RETAINABLE,
  DESTINATIONS,
  type DimDef,
} from "@/lib/schema";
import ScriptCard from "./script-card";

type Dict = Record<string, unknown>;
type Hits = Record<string, string[]>;
type Quotes = Record<string, string>;

function genUuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "u-" + Date.now() + "-" + Math.floor(Math.random() * 1e9);
  }
}
function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}
function parseObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object") return v as Record<string, unknown>;
  if (typeof v === "string" && v) {
    try {
      const o = JSON.parse(v);
      return o && typeof o === "object" ? o : {};
    } catch {
      return {};
    }
  }
  return {};
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
  const pre = (k: string, fallback: unknown = "") => src[k] ?? target[k] ?? fallback;

  const initHits = parseObj(src["hits_json"]);
  const initQuotes = parseObj(src["quotes_json"]);

  const [f, setF] = useState<Dict>(() => ({
    uuid: (interview?.uuid as string) || genUuid(),
    name: pre("name"),
    gender: pre("gender"),
    region: pre("region"),
    project: pre("project"),
    position: pre("position"),
    line: pre("line"),
    age_band: pre("age_band"),
    hire_date: pre("hire_date"),
    leave_date: pre("leave_date"),
    tenure_months: pre("tenure_months", ""),
    interviewer: src["interviewer"] ?? interviewerName,
    contact_status: pre("contact_status"),
    leave_type: pre("leave_type", "主动辞职"), // 离职类型字段已从表单移除；默认主动辞职（回访名单仅主动离职），报告据此统计
    retainable: pre("retainable"),
    destination: pre("destination"),
    top_dim: pre("top_dim"),
  }));
  const [hits, setHits] = useState<Hits>(() => {
    const h: Hits = {};
    for (const d of DIMS) {
      const a = initHits[d.key];
      h[d.key] = Array.isArray(a) ? (a as string[]) : [];
    }
    return h;
  });
  const [quotes, setQuotes] = useState<Quotes>(() => {
    const q: Quotes = {};
    for (const d of DIMS) q[d.key] = typeof initQuotes[d.key] === "string" ? (initQuotes[d.key] as string) : "";
    return q;
  });

  const [submitted] = useState((interview?.status as string) === "completed");
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
  const togglePoint = (dim: string, pk: string) =>
    setHits((p) => {
      const cur = new Set(p[dim] ?? []);
      if (cur.has(pk)) cur.delete(pk);
      else cur.add(pk);
      return { ...p, [dim]: [...cur] };
    });
  const setQuote = (dim: string, v: string) => setQuotes((p) => ({ ...p, [dim]: v }));

  const payload = useCallback(
    (status: "draft" | "completed") => ({ ...f, hits, quotes, status }),
    [f, hits, quotes]
  );

  const save = useCallback(
    async (status: "draft" | "completed") => {
      const res = await fetch(withBase(`/api/interview/${targetId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(status)),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "保存失败");
      }
    },
    [payload, targetId]
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
  }, [f, hits, quotes, save, submitted]);

  async function onSubmit(goNext = false) {
    setErr("");
    if (!f.contact_status) {
      setErr("请先在最上方选「接通情况（深聊 / 未深聊）」");
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
        <aside className="lg:sticky lg:top-[60px] lg:self-start mb-4 lg:mb-0">
          <ScriptCard />
        </aside>

        <div className="flex flex-col gap-5">
          {/* 通话横幅 */}
          <div ref={bannerRef} className="card p-4" style={{ borderColor: "var(--brand)" }}>
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs text-[var(--text2)]">正在回访</div>
                <div className="text-xl font-semibold">{str(f.name) || "—"}</div>
                <div className="text-sm text-[var(--text2)] mt-0.5">
                  {[str(f.project), str(f.position), str(f.line), str(f.region)].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              {phone && (
                <div className="text-right">
                  <a href={`tel:${phone}`} className="text-lg font-semibold text-[var(--brand)]">
                    {phone}
                  </a>
                  <button type="button" onClick={copyPhone} className="btn btn-ghost ml-2 align-middle" style={{ padding: "4px 10px", fontSize: 12 }}>
                    {copied ? "已复制" : "复制号码"}
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3">
              <label className="label block mb-1.5">接通情况（先选这一项）</label>
              <Radio options={CONTACT_STATUS} value={str(f.contact_status)} onChange={(v) => set("contact_status", v)} />
              <p className="text-xs text-[var(--text3)] mt-1">真敷衍别硬刨，记「未深聊」——原因分析只算深聊样本，别编原因。</p>
            </div>
          </div>

          {/* 基本信息 */}
          <Section title="基本信息" hint="系统带出、以系统为准，可改">
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
              <Field label="在职月数">
                <input className="input" type="number" step="0.1" value={str(f.tenure_months)} onChange={(e) => set("tenure_months", e.target.value)} />
              </Field>
              <Field label="入职日期">
                <input className="input" placeholder="如 2024-05" value={str(f.hire_date)} onChange={(e) => set("hire_date", e.target.value)} />
              </Field>
              <Field label="离职日期">
                <input className="input" placeholder="如 2026-05" value={str(f.leave_date)} onChange={(e) => set("leave_date", e.target.value)} />
              </Field>
              <Field label="回访员">
                <input className="input bg-[var(--secondary)]" value={str(f.interviewer)} readOnly />
              </Field>
            </div>
          </Section>

          {/* 开口提示 */}
          <div className="card p-3.5" style={{ background: "var(--secondary)", borderColor: "transparent" }}>
            <span className="text-sm font-semibold text-[var(--brand)]">开口：</span>
            <span className="text-sm">“当时主要是出于什么考虑，让您最终决定离开咱们项目的呢？”</span>
            <span className="text-xs text-[var(--text3)]">　先让他自己说，下面六维他没说到的挑着补问；每维命中就打勾、记原话。</span>
          </div>

          {/* 六维 + 个人兜底 */}
          {DIMS.map((d) => (
            <DimCard
              key={d.key}
              dim={d}
              hit={hits[d.key] ?? []}
              quote={quotes[d.key] ?? ""}
              onToggle={(pk) => togglePoint(d.key, pk)}
              onQuote={(v) => setQuote(d.key, v)}
            />
          ))}

          {/* 收尾 */}
          <Section title="收尾" hint="可挽回 + 去向 + 影响最大一维">
            <Field label="可挽回（“这问题解决了您还愿意接着干吗？”）">
              <Radio options={RETAINABLE} value={str(f.retainable)} onChange={(v) => set("retainable", v)} />
            </Field>
            <Field label="去向（“您现在去哪儿工作了？”）" className="mt-3">
              <Radio options={DESTINATIONS} value={str(f.destination)} onChange={(v) => set("destination", v)} />
            </Field>
            <Field label="影响最大的一维（选填）" className="mt-3">
              <select className="input" value={str(f.top_dim)} onChange={(e) => set("top_dim", e.target.value)}>
                <option value="">—</option>
                {DIMS.map((d) => (
                  <option key={d.key} value={d.key}>{(d.no ? d.no + " " : "") + d.name}</option>
                ))}
              </select>
            </Field>
          </Section>

          <div className="h-24" />
        </div>
      </div>

      {/* 底部常驻操作条 */}
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

// ---- 维度卡 ----
function DimCard({
  dim,
  hit,
  quote,
  onToggle,
  onQuote,
}: {
  dim: DimDef;
  hit: string[];
  quote: string;
  onToggle: (pk: string) => void;
  onQuote: (v: string) => void;
}) {
  const on = new Set(hit);
  const groups: Array<{ label?: string; points: typeof dim.points }> = dim.points.some((p) => p.group)
    ? [
        { label: "精神", points: dim.points.filter((p) => p.group === "精神") },
        { label: "物质", points: dim.points.filter((p) => p.group === "物质") },
      ]
    : [{ points: dim.points }];

  return (
    <section className="card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-semibold" style={{ color: dim.color }}>
          {(dim.no ? dim.no + " " : "") + dim.name}
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--secondary)", color: "var(--text2)" }}>
          {dim.tag}
        </span>
        {dim.note && <span className="text-xs font-semibold text-[var(--text-danger)]">{dim.note}</span>}
        {hit.length > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--danger-bg)", color: "var(--text-danger)" }}>
            命中 {hit.length}
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--text2)] mt-1.5 leading-relaxed">“{dim.question}”</p>

      <div className="mt-3 flex flex-col gap-1.5">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && <div className="text-xs font-semibold text-[var(--text3)] mt-1 mb-1">{g.label}</div>}
            <div className="flex flex-col gap-1.5">
              {g.points.map((p) => (
                <Check key={p.key} on={on.has(p.key)} label={p.label} onClick={() => onToggle(p.key)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <textarea
        className="input min-h-[52px] resize-y mt-3"
        placeholder="原话摘录：照原话记 1–2 句，别概括…"
        value={quote}
        onChange={(e) => onQuote(e.target.value)}
      />
    </section>
  );
}

function Check({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <div
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onClick();
        }
      }}
      className="check-row"
      data-on={on ? 1 : 0}
    >
      <span className="check-box" aria-hidden>{on ? "✓" : ""}</span>
      <span className="text-sm leading-snug">{label}</span>
    </div>
  );
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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Radio({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
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
