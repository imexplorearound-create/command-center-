"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  match: (p: string) => boolean;
  hideForCliente?: boolean;
  badgeKey?: "briefings";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", match: (p) => p === "/" },
  { label: "Projetos", href: "/projects", match: (p) => p.startsWith("/projects") || p.startsWith("/project/") },
  { label: "CRM", href: "/crm", match: (p) => p.startsWith("/crm"), hideForCliente: true },
  { label: "OKRs", href: "/objectives", match: (p) => p.startsWith("/objectives") },
  { label: "Feedback", href: "/feedback", match: (p) => p.startsWith("/feedback") },
  {
    label: "Briefings",
    href: "/maestro/briefings",
    match: (p) => p.startsWith("/maestro/briefings"),
    hideForCliente: true,
    badgeKey: "briefings",
  },
];

interface Props {
  role: string;
  badges?: { briefings?: number };
}

export function TopNavLinks({ role, badges }: Props) {
  const pathname = usePathname() ?? "/";
  const isClient = role === "cliente";

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 24, flex: 1 }}>
      {NAV_ITEMS.filter((item) => !(isClient && item.hideForCliente)).map((item) => {
        const active = item.match(pathname);
        const badge = item.badgeKey ? badges?.[item.badgeKey] ?? 0 : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
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
            {badge > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  fontSize: 10,
                  fontWeight: 700,
                  background: "var(--accent, #B08A2C)",
                  color: "#fff",
                  borderRadius: 999,
                  lineHeight: 1,
                }}
                aria-label={`${badge} não lidos`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
