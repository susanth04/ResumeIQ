"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  History,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Wand2,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";

const navigationItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: FileText, label: "Analyze Resume", href: "/dashboard/analyze" },
  { icon: Wand2, label: "Generate Resume", href: "/dashboard/generate" },
  { icon: Briefcase, label: "GitHub Resume", href: "/dashboard/github" },
  { icon: History, label: "History", href: "/dashboard/history" },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, signOutUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-slate-400"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 transition-transform duration-300
          ${isCollapsed ? "md:w-[76px]" : "w-60"}
          bg-[var(--card)] border-r border-[var(--border)]
          flex flex-col fixed md:relative h-screen z-40
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-[var(--border)]">
          <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center w-full md:w-auto" : ""}`}>
            <div className="w-7 h-7 rounded-md bg-[#0EA5E9] flex items-center justify-center">
              <span className="text-[#060810] text-xs font-black">R</span>
            </div>
            <span className={`font-bold text-[var(--foreground)] text-sm tracking-tight ${isCollapsed ? "hidden" : ""}`}>
              ResumeIQ
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-[#0EA5E9]/12 text-[#0EA5E9] font-semibold border border-[#0EA5E9]/20"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={isCollapsed ? "hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-[var(--border)] space-y-3">
          {user && (
            <div className={`flex items-center px-2 py-1 ${isCollapsed ? "justify-center" : "gap-3"}`}>
              <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/15 border border-[#0EA5E9]/25 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[#0EA5E9]">{initials}</span>
              </div>
              <div className={`min-w-0 ${isCollapsed ? "hidden" : ""}`}>
                <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                  {user.displayName || "User"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors`}
            title={isCollapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 shrink-0" />
            )}
            <span className={isCollapsed ? "hidden" : ""}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <button
            onClick={() => signOutUser()}
            className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors`}
            title={isCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={isCollapsed ? "hidden" : ""}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
