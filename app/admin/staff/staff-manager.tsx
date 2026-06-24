"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/url";

interface Staff {
  id: number;
  name: string;
  role: string;
  is_super: number;
  active: number;
}

const ROLE_LABEL: Record<string, string> = { super: "超管", admin: "管理员", caller: "回访员" };

export default function StaffManager({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("caller");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body: unknown) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(withBase(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        setErr(d.error || "操作失败");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErr("网络错误");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (role === "admin" && pwd.length < 4) {
      setErr("管理员需设至少 4 位口令");
      return;
    }
    const ok = await call("/api/admin/staff", "POST", { name, role, password: pwd });
    if (ok) {
      setName("");
      setPwd("");
      setRole("caller");
    }
  }

  async function makeAdmin(s: Staff) {
    const p = window.prompt(`给「${s.name}」设一个管理口令（至少 4 位）：`);
    if (!p) return;
    await call(`/api/admin/staff/${s.id}`, "PATCH", { role: "admin", password: p });
  }
  async function makeCaller(s: Staff) {
    if (!window.confirm(`把「${s.name}」降为回访员？其管理口令会清除，改用团队口令。`)) return;
    await call(`/api/admin/staff/${s.id}`, "PATCH", { role: "caller" });
  }
  async function resetPwd(s: Staff) {
    const p = window.prompt(`给「${s.name}」重设管理口令（至少 4 位）：`);
    if (!p) return;
    await call(`/api/admin/staff/${s.id}`, "PATCH", { password: p });
  }
  async function toggleActive(s: Staff) {
    await call(`/api/admin/staff/${s.id}`, "PATCH", { active: !s.active });
  }

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text2)] mb-1">人员与权限</div>
      <p className="text-xs text-[var(--text3)] mb-4">
        回访员用团队口令登录；管理员各自口令登录、能看后台。你（超管）可在此加人、升降权限、改口令、停用。
      </p>

      {/* 添加 */}
      <form onSubmit={addStaff} className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="label block mb-1">名字</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label block mb-1">角色</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="caller">回访员</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        {role === "admin" && (
          <div>
            <label className="label block mb-1">管理口令</label>
            <input className="input" type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="≥4 位" />
          </div>
        )}
        <button className="btn btn-primary" disabled={busy}>添加</button>
      </form>

      {err && <div className="text-sm text-[var(--text-danger)] mb-3">{err}</div>}

      {/* 列表 */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text2)]" style={{ background: "var(--secondary)" }}>
              {["名字", "角色", "状态", "操作"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{ROLE_LABEL[s.role] ?? s.role}</td>
                <td className="px-3 py-2">
                  {s.active ? (
                    <span className="text-xs text-[var(--text2)]">在用</span>
                  ) : (
                    <span className="text-xs text-[var(--text-danger)]">已停用</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {s.is_super ? (
                    <span className="text-xs text-[var(--text3)]">超管（不可改）</span>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {s.role === "caller" ? (
                        <button className="text-[var(--brand)]" onClick={() => makeAdmin(s)}>升管理员</button>
                      ) : (
                        <>
                          <button className="text-[var(--brand)]" onClick={() => makeCaller(s)}>降回访员</button>
                          <button className="text-[var(--brand)]" onClick={() => resetPwd(s)}>改口令</button>
                        </>
                      )}
                      <button className="text-[var(--text-danger)]" onClick={() => toggleActive(s)}>
                        {s.active ? "停用" : "启用"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
