"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Target,
  Search,
  Zap,
  PenTool,
  Key,
  FileDown,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "ATS Score",
    description:
      "Know exactly how Applicant Tracking Systems score your resume before a recruiter ever sees it.",
    accent: "#0EA5E9",
    span: "md:col-span-2",
  },
  {
    icon: Search,
    title: "Section Analysis",
    description:
      "Granular feedback on every section — experience, skills, education, and more.",
    accent: "#0EA5E9",
    span: "",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description:
      "Powered by Gemini 2.5 Flash. Full analysis in under 5 seconds.",
    accent: "#0EA5E9",
    span: "",
  },
  {
    icon: PenTool,
    title: "Rewrite Suggestions",
    description:
      "Bullet-point rewrites tailored to your target role — just copy and paste.",
    accent: "#0EA5E9",
    span: "",
  },
  {
    icon: Key,
    title: "Keyword Gaps",
    description:
      "Surface the exact skills and terms your resume is missing for the job.",
    accent: "#0EA5E9",
    span: "",
  },
  {
    icon: FileDown,
    title: "Download New Resume",
    description:
      "Gemini rebuilds your resume from scratch in LaTeX, compiled to a clean PDF.",
    accent: "#0EA5E9",
    span: "md:col-span-2",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-4 bg-[#070B14] relative">
      <div className="relative max-w-6xl mx-auto z-10">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#0EA5E9]" />
            <span className="text-[#0EA5E9] text-xs font-semibold uppercase tracking-[0.2em]">
              Features
            </span>
            <div className="h-px w-8 bg-[#0EA5E9]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4 tracking-tight">
            Everything your resume needs
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            End-to-end resume intelligence — from scoring to rebuilding.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={{
                  initial: { opacity: 0, y: 24 },
                  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                }}
              >
                <Card className={`group relative h-full p-6 bg-[#0D1117] border border-[#1C2333] hover:border-[#0EA5E9] transition-all duration-300 rounded-xl overflow-hidden cursor-default border-l-4 ${feature.span}`}>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: "transparent" }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: "#E2E8F0" }}
                    />
                  </div>

                  <h3 className="text-base font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
