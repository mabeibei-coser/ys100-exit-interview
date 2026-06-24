"use client";

import { useState } from "react";
import { withBase } from "@/lib/url";

export default function LoginForm({ callers, admins }: { callers: string[]; admins: string[] }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = Boolean(name && password && !busy);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(withBase("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "登录失败");
        setBusy(false);
        return;
      }
      const dest = data.role === "admin" || data.role === "super" ? "/admin" : "/mine";
      window.location.href = withBase(dest);
    } catch {
      setErr("网络错误，请重试");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-9">
      <div>
        <label className="mb-4 block text-base font-semibold text-[#252a31]">选择你的名字</label>
        <select
          className="min-h-[58px] w-full rounded-[8px] border border-[#d5dde3] bg-white px-4 text-base text-[#20242a] shadow-[0_1px_1px_rgba(20,34,45,0.02)] outline-none transition focus:border-[#6f93b8] focus:ring-4 focus:ring-[#d7e5f3]"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr("");
          }}
          required
        >
          <option value="">请选择</option>
          {callers.length > 0 && (
            <optgroup label="回访员">
              {callers.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </optgroup>
          )}
          {admins.length > 0 && (
            <optgroup label="管理员">
              {admins.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div>
        <label className="mb-4 block text-base font-semibold text-[#252a31]">口令</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="min-h-[58px] w-full rounded-[8px] border border-[#d5dde3] bg-white px-4 pr-14 text-base text-[#20242a] shadow-[0_1px_1px_rgba(20,34,45,0.02)] outline-none transition placeholder:text-[#9aa4af] focus:border-[#6f93b8] focus:ring-4 focus:ring-[#d7e5f3]"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErr("");
            }}
            placeholder="请输入口令"
            required
          />
          <button
            type="button"
            className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#5c6875] transition hover:bg-[#eef3f6] hover:text-[#27313b]"
            aria-label={showPassword ? "隐藏口令" : "显示口令"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-[8px] border border-[rgba(163,45,45,0.18)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--text-danger)]">
          {err}
        </div>
      )}

      <button
        type="submit"
        className="mt-5 min-h-[58px] w-full rounded-[8px] bg-[#5c82aa] px-5 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(45,84,124,0.2)] transition hover:bg-[#52779f] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit}
      >
        {busy ? "登录中..." : "登录"}
      </button>
    </form>
  );
}

function EyeOpenIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 12s3.1-5.2 8.5-5.2 8.5 5.2 8.5 5.2-3.1 5.2-8.5 5.2S3.5 12 3.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="m4 4 16 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.8 6.9c.7-.2 1.4-.3 2.2-.3 5.4 0 8.5 5.4 8.5 5.4a14.2 14.2 0 0 1-2.5 3.1M6.7 8.5A14.1 14.1 0 0 0 3.5 12s3.1 5.4 8.5 5.4c1.2 0 2.4-.3 3.4-.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 10.3a2.6 2.6 0 0 0 3.4 3.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
