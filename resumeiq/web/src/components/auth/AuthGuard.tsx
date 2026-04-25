"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // Secondary safety net: if still loading after 10s, show a retry prompt
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#060810] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
        <p className="text-slate-500 text-sm">
          {timedOut
            ? "Taking longer than expected — check your internet connection."
            : "Authenticating…"}
        </p>
        {timedOut && (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-[#0EA5E9] underline hover:text-[#38BDF8] transition-colors"
          >
            Refresh page
          </button>
        )}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
