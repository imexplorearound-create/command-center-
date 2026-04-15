"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Workflow,
  Video,
  Users,
  Layers,
  Brain,
  MessageSquare,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Handshake,
  Clock,
  Mail,
  Map as MapIcon,
  Settings,
} from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/context";
import type { Role } from "@prisma/client";

interface ModuleNavConfig {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  hideForCliente?: boolean;
  adminOnly?: boolean;
  managerUp?: boolean;
}

const MODULE_NAV: Record<string, ModuleNavConfig> = {
  dashboard:  { href: "/",            labelKey: "sidebar.dashboard",   icon: LayoutDashboard },
  okr:        { href: "/objectives",  labelKey: "sidebar.objectives",  icon: Target },
  workflows:  { href: "/workflows",   labelKey: "sidebar.workflows",   icon: Workflow },
  content:    { href: "/content",     labelKey: "sidebar.content",     icon: Video },
  people:     { href: "/people",      labelKey: "sidebar.people",      icon: Users,          hideForCliente: true },
  areas:      { href: "/areas",       labelKey: "sidebar.areas",       icon: Layers,         hideForCliente: true },
  maestro:    { href: "/maestro",     labelKey: "sidebar.maestro",     icon: Brain,          adminOnly: true },
  feedback:   { href: "/feedback",    labelKey: "sidebar.feedback",    icon: MessageSquare,  adminOnly: true },
  crm:          { href: "/crm",          labelKey: "sidebar.crm",          icon: Handshake },
  timetracking: { href: "/timetracking", labelKey: "sidebar.timetracking", icon: Clock },
  "email-sync":      { href: "/email-sync",      labelKey: "sidebar.emailSync",      icon: Mail },
  "cross-projects":  { href: "/cross-projects",  labelKey: "sidebar.crossProjects",  icon: MapIcon },
  settings:          { href: "/settings",        labelKey: "sidebar.settings",       icon: Settings },
};

// Default order when enabledModules isn't specified
const DEFAULT_MODULE_ORDER = [
  "dashboard", "okr", "workflows", "content",
  "people", "areas", "maestro", "feedback",
];

interface SidebarProps {
  userRole?: Role;
  enabledModules?: string[];
}

export function Sidebar({ userRole, enabledModules }: SidebarProps) {
  const pathname = usePathname();
  const t = useT();

  const moduleKeys = enabledModules ?? DEFAULT_MODULE_ORDER;

  const visibleItems = moduleKeys
    .map((key) => MODULE_NAV[key])
    .filter((item): item is ModuleNavConfig => {
      if (!item) return false;
      if (item.hideForCliente && userRole === "cliente") return false;
      if (item.adminOnly && userRole !== "admin") return false;
      if (item.managerUp && userRole !== "admin" && userRole !== "manager") return false;
      return true;
    });

  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cc-theme");
    if (saved === "light") {
      setLight(true);
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("cc-theme", next ? "light" : "dark");
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} className="cc-mobile-toggle">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`cc-sidebar ${open ? "open" : ""}`}>
        <div className="cc-sidebar-logo">Command Center</div>
        <nav className="cc-nav">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={isActive ? "active" : ""}
              >
                <Icon size={18} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="cc-sidebar-footer">
          <button onClick={toggleTheme} className="cc-theme-toggle">
            {light ? <Moon size={14} /> : <Sun size={14} />}
            <span>{light ? t("sidebar.theme_dark") : t("sidebar.theme_light")}</span>
          </button>
          <form action={logout}>
            <button type="submit" className="cc-theme-toggle" style={{ marginTop: 4, color: "var(--muted)" }}>
              <LogOut size={14} />
              <span>{t("sidebar.logout")}</span>
            </button>
          </form>
        </div>
      </aside>

      {open && (
        <div className="cc-overlay open" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
