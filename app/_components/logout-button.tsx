"use client";

import { withBase } from "@/lib/url";

export default function LogoutButton() {
  async function doLogout() {
    await fetch(withBase("/api/auth/logout"), { method: "POST" });
    window.location.href = withBase("/login");
  }
  return (
    <button onClick={doLogout} className="text-sm text-[var(--text2)] hover:text-[var(--text)]">
      退出
    </button>
  );
}
