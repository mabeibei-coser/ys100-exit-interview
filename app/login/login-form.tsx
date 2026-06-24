"use client";

import { useState } from "react";
import { withBase } from "@/lib/url";

export default function LoginForm({ callers, admins }: { callers: string[]; admins: string[] }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = admins.includes(name);

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
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label">选择你的名字</label>
        <select
          className="input mt-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        >
          <option value="">— 请选择 —</option>
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
        <label className="label">
          {name ? (isAdmin ? "管理口令" : "团队口令") : "口令"}
        </label>
        <input
          type="password"
          className="input mt-1.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={name && !isAdmin ? "全组共用的团队口令" : ""}
          required
        />
      </div>

      {err && <div className="text-sm text-[var(--text-danger)]">{err}</div>}

      <button type="submit" className="btn btn-primary mt-1" disabled={busy}>
        {busy ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
