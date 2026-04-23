"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  userName: string;
  userEmail: string;
};

type Item = { label: string; href: string; danger?: boolean };

const ITEMS: Item[] = [
  { label: "Settings", href: "/settings" },
  { label: "Áreas", href: "/areas" },
  { label: "Pessoas", href: "/people" },
  { label: "Logout", href: "/api/auth/logout", danger: true },
];

export function TopbarAvatarDropdown({ userName, userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open]);

  const initial = (userName?.trim()?.[0] ?? userEmail?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          border: "1px solid var(--line-2, rgba(255,255,255,0.14))",
          background: "var(--bg-2, #1E2A3A)",
          color: "var(--ink, #F4EFE6)",
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
        title={userName || userEmail}
      >
        {initial}
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 200,
            background: "var(--bg-2, #1E2A3A)",
            border: "1px solid var(--line-2, rgba(255,255,255,0.14))",
            borderRadius: "var(--radius-card, 12px)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            padding: "8px 0",
            zIndex: 50,
            fontFamily: "var(--font-sans)",
          }}
        >
          <div
            style={{
              padding: "6px 14px 10px",
              borderBottom: "1px solid var(--line, rgba(255,255,255,0.08))",
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink, #F4EFE6)" }}>
              {userName || "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted, #8A8778)" }}>{userEmail}</div>
          </div>
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "8px 14px",
                fontSize: 13,
                color: it.danger ? "var(--error, #C0392B)" : "var(--ink-2, #D9D2C4)",
                textDecoration: "none",
              }}
            >
              {it.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
