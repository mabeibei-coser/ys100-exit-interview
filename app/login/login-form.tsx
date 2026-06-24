"use client";

import { useState } from "react";
import { withBase } from "@/lib/url";

export default function LoginForm({ callers, admins }: { callers: string[]; admins: string[] }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = admins.includes(name);
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
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <label className="label block mb-2">选择你的名字</label>
        <select
          className="input min-h-11"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr("");
          }}
          required
        >
          <option value="">请选择登录人</option>
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
        <label className="label block mb-2">
          {name ? (isAdmin ? "管理口令" : "团队口令") : "口令"}
        </label>
        <input
          type="password"
          className="input min-h-11"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErr("");
          }}
          placeholder={name && !isAdmin ? "全组共用的团队口令" : ""}
          aria-describedby="login-help"
          required
        />
        <p id="login-help" className="mt-2 text-xs leading-5 text-[var(--text3)]">
          {name
            ? isAdmin
              ? "管理员使用个人口令登录后台。"
              : "回访员使用团队口令进入自己的派工。"
            : "先选择姓名，系统会自动识别你的登录类型。"}
        </p>
      </div>

      {err && (
        <div className="rounded-[8px] border border-[rgba(163,45,45,0.18)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--text-danger)]">
          {err}
        </div>
      )}

      <button type="submit" className="btn btn-primary min-h-11 w-full" disabled={!canSubmit}>
        {busy ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
