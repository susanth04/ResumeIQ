import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";

export default function Home() {
  return (
    <main className="bg-[#070B14] text-slate-100">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />

      <footer className="bg-[#070B14] border-t border-[#1C2333] py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0EA5E9] flex items-center justify-center">
              <span className="text-[#070B14] text-xs font-black">R</span>
            </div>
            <span className="font-bold text-slate-100">ResumeIQ</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="#features" className="hover:text-[#0EA5E9]">Features</a>
            <a href="#how-it-works" className="hover:text-[#0EA5E9]">How It Works</a>
            <a href="/dashboard" className="hover:text-[#0EA5E9]">Dashboard</a>
          </div>
          <div className="text-slate-500">Built with FastAPI + Next.js</div>
        </div>
      </footer>
    </main>
  );
}
