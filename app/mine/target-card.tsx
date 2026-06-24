"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CALL_STATUS_LABEL } from "@/lib/schema";

export interface TargetCardProps {
  id: number;
  name: string;
  phone: string | null;
  project: string | null;
  position: string | null;
  call_status: string;
}

export default function TargetCard(t: TargetCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const done = t.call_status === "done";

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!t.phone) return;
    try {
      await navigator.clipboard.writeText(t.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      onClick={() => router.push(`/record/${t.id}`)}
      className="card px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--brand)] transition-colors"
    >
      <div className="min-w-0">
        <div className="font-medium truncate">
          {t.name}
          <span className="text-[var(--text3)] font-normal text-sm ml-2">
            {[t.project, t.position].filter(Boolean).join(" · ")}
          </span>
        </div>
        {t.phone ? (
          <div className="flex items-center gap-2 mt-0.5">
            <a
              href={`tel:${t.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-[var(--brand)] font-medium"
            >
              {t.phone}
            </a>
            <button onClick={copy} className="text-xs text-[var(--text3)] hover:text-[var(--text)]">
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        ) : (
          <div className="text-xs text-[var(--text3)] mt-0.5">无号码</div>
        )}
      </div>
      <span
        className={`text-xs px-2.5 py-1 rounded-md shrink-0 ${
          done
            ? "bg-[var(--secondary)] text-[var(--text2)]"
            : t.call_status === "unreachable"
              ? "bg-[var(--warning-bg)] text-[var(--text-warning)]"
              : "bg-[var(--brand)] text-white"
        }`}
      >
        {done ? "✓ 已完成" : CALL_STATUS_LABEL[t.call_status] ?? t.call_status}
      </span>
    </div>
  );
}
