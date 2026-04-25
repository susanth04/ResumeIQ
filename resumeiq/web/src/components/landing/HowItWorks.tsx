"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Resume",
    description:
      "Drop a PDF or DOCX. We extract every section — experience, skills, education, and more — in seconds.",
    accent: "#0EA5E9",
    badge: "parse_resume()",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Get Scored & Analyzed",
    description:
      "Gemini 2.5 Flash scores your resume across 5 ATS dimensions and generates section-by-section feedback.",
    accent: "#0EA5E9",
    badge: "score_resume()",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Download a Better Resume",
    description:
      "Pick your target role. Gemini rewrites your resume in LaTeX — tailored, polished, ready to submit.",
    accent: "#0EA5E9",
    badge: "generate_resume_v2()",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-4 bg-[#070B14] relative overflow-hidden">
      <div className="relative max-w-6xl mx-auto z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#0EA5E9]" />
            <span className="text-[#0EA5E9] text-xs font-semibold uppercase tracking-[0.2em]">
              How It Works
            </span>
            <div className="h-px w-8 bg-[#0EA5E9]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4 tracking-tight">
            From upload to hired
          </h2>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Three auditable steps in a strict pipeline.
          </p>
        </div>

        <div className="hidden md:block border-t border-dashed border-[#1C2333] mb-10" />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={{ animate: { transition: { staggerChildren: 0.15 } } }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                variants={{
                  initial: { opacity: 0, y: 32 },
                  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
                }}
              >
                <div className="relative h-full rounded-2xl p-6 border border-[#1C2333] bg-[#0D1117] transition-all duration-300 group overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-full border border-[#0EA5E9] text-[#0EA5E9] flex items-center justify-center shrink-0">
                        {index + 1}
                      </div>
                      <Icon className="w-4 h-4 text-slate-300" />
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[#1C2333] text-slate-300 font-mono">
                        {step.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-100 leading-snug mb-2">{step.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
