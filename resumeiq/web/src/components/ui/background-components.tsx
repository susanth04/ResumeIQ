"use client";

/**
 * GlowBackground
 * A fullscreen positioned background with radial-gradient glows.
 * In dark mode: warm orange top-right + soft blue bottom-left.
 * In light mode: soft amber top-right + gentle yellow centre.
 * Usage: wrap a page's root <div> with this and set the root to `relative`.
 */
export function GlowBackground() {
  return (
    <>
      {/* Dark-mode glow: orange top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
        style={{
          background: "#070B14",
          backgroundImage: `
            radial-gradient(circle at top right, rgba(255,140,60,0.18), transparent 60%),
            radial-gradient(circle at bottom left, rgba(14,165,233,0.10), transparent 55%)
          `,
          filter: "blur(60px)",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Light-mode glow: amber centre + orange top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 block dark:hidden"
        style={{
          background: "#F8FAFC",
          backgroundImage: `
            radial-gradient(circle at top right, rgba(251,146,60,0.25), transparent 55%),
            radial-gradient(circle at center, rgba(253,224,71,0.20), transparent 60%)
          `,
          backgroundRepeat: "no-repeat",
        }}
      />
    </>
  );
}
