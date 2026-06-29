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

  // 真实表单，正常布局自己对齐。页面右栏提供白底面板，左栏是品牌区——不再依赖背景图叠加。
  return (
      <form onSubmit={submit} className="w-full" aria-label="登录工作台" autoComplete="off">
        <label htmlFor="login-name" className="mb-1.5 block text-[13px] font-semibold text-[#5b5a54]">
          选择你的名字
        </label>
        <select
          id="login-name"
          autoComplete="off"
          className="h-11 w-full rounded-[8px] border border-[#dcdcdc] bg-white px-3 text-[15px] text-[#20242a] outline-none transition focus:border-[#6f93b8] focus:ring-4 focus:ring-[#d7e5f3]"
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

        <label htmlFor="login-password" className="mb-1.5 mt-4 block text-[13px] font-semibold text-[#5b5a54]">
          口令
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            className="h-11 w-full rounded-[8px] border border-[#dcdcdc] bg-white px-3 pr-10 text-[15px] text-[#20242a] outline-none transition placeholder:text-[#bdbcb6] focus:border-[#6f93b8] focus:ring-4 focus:ring-[#d7e5f3]"
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9b9a94] transition hover:text-[#5b5a54]"
            aria-label={showPassword ? "隐藏口令" : "显示口令"}
            onClick={() => setShowPassword((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {!showPassword && <line x1="4" y1="4" x2="20" y2="20" />}
            </svg>
          </button>
        </div>

        {err && (
          <div className="mt-3 rounded-[8px] border border-[rgba(163,45,45,0.18)] bg-[#fcebeb] px-3 py-2 text-[13px] text-[#a32d2d]">
            {err}
          </div>
        )}

        <button
          type="submit"
          className="mt-6 h-11 w-full rounded-[8px] bg-[#5f7c9b] text-[15px] font-semibold text-white outline-none transition hover:opacity-90 focus:ring-4 focus:ring-[#d7e5f3] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit}
        >
          {busy ? "登录中..." : "登录"}
        </button>
      </form>
  );
}
