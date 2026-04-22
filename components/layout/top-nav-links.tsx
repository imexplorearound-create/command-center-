"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: Array<{ label: string; href: string; match: (p: string) => boolean }> = [
  { label: "Dashboard", href: "/", match: (p) => p === "/" },
  { label: "Projetos", href: "/projects", match: (p) => p.startsWith("/projects") || p.startsWith("/project/") },
  { label: "CRM", href: "/crm", match: (p) => p.startsWith("/crm") },
  { label: "OKRs", href: "/objectives", match: (p) => p.startsWith("/objectives") },
  { label: "Feedback", href: "/feedback", match: (p) => p.startsWith("/feedback") },
];

export function TopNavLinks() {
  const pathname = usePathname() ?? "/";

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 24, flex: 1 }}>
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? "var(--ink, #F4EFE6)" : "var(--ink-2, #D9D2C4)",
              textDecoration: "none",
              padding: "4px 2px",
              borderBottom: active ? "2px solid var(--accent, #B08A2C)" : "2px solid transparent",
              letterSpacing: "0.01em",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
