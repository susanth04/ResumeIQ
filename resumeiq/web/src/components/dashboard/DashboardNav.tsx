"use client";

import { useAuth } from "@/hooks/useAuth";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/analyze": "Resume Analyzer",
  "/dashboard/history": "History",
};

export function DashboardNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  const initials = (
    (user?.displayName || user?.email)
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U"
  ).slice(0, 2);

  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  return (
    <header className="bg-[var(--card)] border-b border-[var(--border)] px-6 h-16 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="text-xs text-[var(--muted-foreground)] hidden sm:block">
          {user?.email}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification placeholder */}
        <button className="p-2 rounded-lg hover:bg-white/5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar — manual div to avoid shadcn purple bg */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            backgroundColor: "rgba(14, 165, 233, 0.15)",
            border: "1px solid rgba(14, 165, 233, 0.3)",
            color: "#0EA5E9",
          }}
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
}
