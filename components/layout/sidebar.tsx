"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Workflow,
  Video,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/objectives", label: "Objectivos", icon: Target },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/content", label: "Conteúdo", icon: Video },
];

export function Sidebar() {
  const pathname = usePathname();
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
          {navItems.map((item) => {
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
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="cc-sidebar-footer">
          <button onClick={toggleTheme} className="cc-theme-toggle">
            {light ? <Moon size={14} /> : <Sun size={14} />}
            <span>{light ? "Modo escuro" : "Modo claro"}</span>
          </button>
          <form action={logout}>
            <button type="submit" className="cc-theme-toggle" style={{ marginTop: 4, color: "var(--muted)" }}>
              <LogOut size={14} />
              <span>Sair</span>
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
