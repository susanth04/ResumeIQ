"use client";

import { motion } from "framer-motion";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { ParticleTextEffect } from "@/components/ui/particle-text-effect";
import { ChevronDown } from "lucide-react";

const HERO_WORDS = ["YOUR RESUME", "PERFECTED", "GET HIRED"];

export function HeroSection() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060810]">
      {/* WebGL Background */}
      <div className="fixed top-0 left-0 w-full h-screen -z-10 opacity-60">
        <WebGLShader />
      </div>

      {/* Dark overlay for readability */}
      <div className="fixed top-0 left-0 w-full h-screen bg-gradient-to-b from-[#060810]/50 via-[#060810]/40 to-[#060810] -z-10" />

      {/* Noise texture overlay */}
      <div
        className="fixed top-0 left-0 w-full h-screen -z-10 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        {/* Eyebrow label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 flex items-center gap-2"
        >
          <div className="h-px w-12 bg-[#0EA5E9]" />
          <span className="text-[#0EA5E9] text-xs font-semibold uppercase tracking-[0.2em]">
            Resume Intelligence Platform
          </span>
          <div className="h-px w-12 bg-[#0EA5E9]" />
        </motion.div>

        {/* Particle headline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex justify-center mb-6 w-full"
          aria-label="Your Resume, Perfected, Get Hired"
        >
          <ParticleTextEffect words={HERO_WORDS} className="w-full" />
        </motion.div>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto text-center leading-relaxed"
        >
          Upload once. Get structured scores, section-level feedback, and ATS
          optimization — then download a professionally rebuilt resume.
        </motion.p>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown className="w-6 h-6 text-slate-600" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
