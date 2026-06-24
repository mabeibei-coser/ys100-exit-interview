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
    <form onSubmit={submit} className="absolute inset-0 z-10" aria-label="登录工作台">
      <label className="sr-only" htmlFor="login-name">
        选择你的名字
      </label>
      <select
        id="login-name"
        className={`absolute left-[57.25%] top-[46.2%] h-[6.55%] w-[29.05%] rounded-[8px] border border-transparent bg-transparent px-[1.1%] text-[clamp(12px,1.05vw,18px)] outline-none transition focus:border-[#6f93b8] focus:ring-4 focus:ring-[#d7e5f3] ${
          name ? "text-[#20242a]" : "text-transparent"
        }`}
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

      <label className="sr-only" htmlFor="login-password">
        口令
      </label>
      <input
        id="login-password"
        type={showPassword ? "text" : "password"}
        className="absolute left-[57.25%] top-[61.0%] h-[6.55%] w-[25.6%] rounded-[8px] border border-transparent bg-transparent px-[1.1%] text-[clamp(12px,1.05vw,18px)] text-[#20242a] outline-none transition placeholder:text-transparent focus:border-[#6f93b8] focus:ring-4 focus:ring-[#d7e5f3]"
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
        className="absolute left-[83.3%] top-[62.6%] h-[3.2%] w-[2.1%] rounded-full bg-transparent outline-none transition focus:ring-4 focus:ring-[#d7e5f3]"
        aria-label={showPassword ? "隐藏口令" : "显示口令"}
        onClick={() => setShowPassword((value) => !value)}
      />

      {err && (
        <div className="absolute left-[57.25%] top-[69.2%] w-[29.05%] rounded-[8px] border border-[rgba(163,45,45,0.18)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--text-danger)]">
          {err}
        </div>
      )}

      <button
        type="submit"
        className="absolute left-[57.25%] top-[73.2%] h-[7.0%] w-[29.05%] rounded-[8px] bg-transparent text-transparent outline-none transition focus:ring-4 focus:ring-[#d7e5f3] disabled:cursor-not-allowed"
        disabled={!canSubmit}
        aria-label={busy ? "登录中" : "登录"}
      >
        {busy ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
