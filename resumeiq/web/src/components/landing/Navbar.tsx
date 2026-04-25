"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#060810]/90 backdrop-blur-xl border-b border-[#0F1322]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-[#0EA5E9] flex items-center justify-center">
              <span className="text-[#060810] text-xs font-black">R</span>
            </div>
            <span className="text-base font-bold text-slate-100 tracking-tight">
              ResumeIQ
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollTo("features")}
              className="text-slate-400 hover:text-slate-100 transition-colors text-sm"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="text-slate-400 hover:text-slate-100 transition-colors text-sm"
            >
              How It Works
            </button>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <Button
                onClick={() => router.push("/dashboard")}
                className="h-8 px-4 text-sm bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-medium"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => router.push("/auth/login")}
                  variant="ghost"
                  className="h-8 px-4 text-sm text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg"
                >
                  Login
                </Button>
                <Button
                  onClick={() => router.push("/auth/signup")}
                  className="h-8 px-4 text-sm bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-medium"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
