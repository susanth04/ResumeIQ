"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type LiquidButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd"
> & {
  children: React.ReactNode;
};

/** Primary CTA with glass / gradient border treatment. */
export function LiquidButton({
  className,
  children,
  type,
  ...props
}: LiquidButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-8 py-3 font-semibold text-white shadow-lg transition",
        "bg-[#10B981] hover:bg-[#059669]",
        "transform-gpu hover:scale-[1.02] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 45%, transparent 60%)",
          transform: "translateX(-60%)",
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

type GlassFilterProps = {
  children: React.ReactNode;
  className?: string;
};

/** Subtle frosted panel wrapper. */
export function GlassFilter({ children, className }: GlassFilterProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
}
