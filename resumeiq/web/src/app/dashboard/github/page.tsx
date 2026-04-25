"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";
import { GlowBackground } from "@/components/ui/background-components";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Briefcase, Sparkles, Loader2, CheckCircle2, AlertCircle,
  FileDown, ExternalLink, Eye, EyeOff, ChevronDown,
  Star, Code2, Building2, User,
} from "lucide-react";

const JOB_POSTINGS = [
  { label: "Select a target role...", value: "" },
  { label: "Software Engineer — Full Stack", value: "Software Engineer (Full Stack)" },
  { label: "Backend Engineer (Python / Node.js)", value: "Backend Engineer" },
  { label: "Frontend Engineer (React / Next.js)", value: "Frontend Engineer" },
  { label: "Mobile Engineer (iOS / Android)", value: "Mobile Engineer" },
  { label: "Machine Learning Engineer", value: "Machine Learning Engineer" },
  { label: "Data Scientist", value: "Data Scientist" },
  { label: "DevOps / SRE", value: "DevOps Engineer / SRE" },
  { label: "Cloud Architect (AWS / GCP / Azure)", value: "Cloud Architect" },
  { label: "Cybersecurity Analyst", value: "Cybersecurity Analyst" },
  { label: "AI / NLP Researcher", value: "AI Research Scientist" },
];

type Status = "idle" | "generating" | "done" | "error";

interface Profile {
  name: string;
  username: string;
  email: string;
  languages: string[];
  topRepos: string[];
}

export default function GitHubResumePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customRole, setCustomRole] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [latex, setLatex] = useState("");
  const [overleafUrl, setOverleafUrl] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [oauthConnected, setOauthConnected] = useState(false);
  const [oauthStatusMsg, setOauthStatusMsg] = useState("");

  useEffect(() => {
    const loadOAuthStatus = async () => {
      try {
        const res = await fetch("/api/github-oauth/status", { cache: "no-store" });
        const data = await res.json();
        setOauthConnected(Boolean(data.connected));
      } catch {
        setOauthConnected(false);
      }
    };
    loadOAuthStatus();
  }, []);

  useEffect(() => {
    const oauth = searchParams.get("github_oauth");
    if (!oauth) return;
    if (oauth === "success") {
      setOauthConnected(true);
      setOauthStatusMsg("GitHub connected successfully.");
      return;
    }
    if (oauth === "missing_config") {
      setOauthStatusMsg("GitHub OAuth is not configured. Add client ID/secret env vars.");
      return;
    }
    if (oauth === "invalid_state") {
      setOauthStatusMsg("OAuth verification failed. Please try connecting again.");
      return;
    }
    if (oauth === "token_failed") {
      setOauthStatusMsg("Could not exchange GitHub OAuth code for a token.");
    }
  }, [searchParams]);

  const disconnectGithub = async () => {
    await fetch("/api/github-oauth/disconnect", { method: "POST" });
    setOauthConnected(false);
    setOauthStatusMsg("GitHub connection removed.");
  };

  const handleRoleSelect = (value: string) => {
    if (value === "__custom__") { setShowCustom(true); setTargetRole(customRole); }
    else { setShowCustom(false); setTargetRole(value); }
  };

  const generate = async () => {
    if (!token.trim() && !oauthConnected) {
      setStatus("error");
      setErrorMsg("Connect GitHub via OAuth or paste a Personal Access Token.");
      return;
    }
    if (!user) return;
    setStatus("generating");
    setErrorMsg("");
    setLatex("");
    setProfile(null);

    try {
      const authToken = await user.getIdToken();
      const res = await fetch("/api/github-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          github_token: token.trim(),
          target_role: targetRole || "Software Engineer",
        }),
      });

      const ct = res.headers.get("content-type") ?? "";

      if (ct.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "github_resume.pdf";
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus("done");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Generation failed");

      setLatex(data.latex ?? "");
      setOverleafUrl(data.overleafUrl ?? "");
      setProfile(data.profile ?? null);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const downloadLatex = () => {
    const blob = new Blob([latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(profile?.name || "github_resume").replace(/\s+/g, "_")}.tex`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-[var(--background)]">
      <GlowBackground />

      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1 flex items-center gap-2">
              <Briefcase className="w-6 h-6" />
              GitHub Resume Generator
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Connect your GitHub account and Gemini will build a tailored resume from your repos, languages, and contributions.
            </p>
          </div>

          {/* ── How it works ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Briefcase className="w-4 h-4" />, step: "1", title: "Paste your token", desc: "Generate a GitHub PAT with read:user + repo scopes" },
              { icon: <Code2 className="w-4 h-4" />, step: "2", title: "We read your profile", desc: "Repos, languages, stars, orgs — all fetched automatically" },
              { icon: <Sparkles className="w-4 h-4" />, step: "3", title: "Gemini writes the resume", desc: "ATS-optimised LaTeX resume tailored to your target role" },
            ].map((item) => (
              <SpotlightCard key={item.step} spotlightColor="rgba(14,165,233,0.10)" className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#0EA5E9]/15 text-[#0EA5E9] text-xs font-bold flex items-center justify-center">{item.step}</span>
                  <span className="text-[#0EA5E9]">{item.icon}</span>
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{item.desc}</p>
              </SpotlightCard>
            ))}
          </div>

          {/* ── Token Input ── */}
          <SpotlightCard spotlightColor="rgba(14,165,233,0.12)" className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[var(--foreground)]" />
                <span className="text-sm font-semibold text-[var(--foreground)]">GitHub Access</span>
              </div>
              {!oauthConnected ? (
                <Button
                  onClick={() => {
                    window.location.href = "/api/github-oauth/start";
                  }}
                  className="h-8 px-3 text-xs bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                >
                  Authorize with GitHub
                </Button>
              ) : (
                <Button onClick={disconnectGithub} className="h-8 px-3 text-xs btn-ghost">
                  Disconnect
                </Button>
              )}
            </div>
            {oauthStatusMsg && (
              <p className="text-xs text-[var(--muted-foreground)] mb-3">{oauthStatusMsg}</p>
            )}
            <p className="text-xs text-[var(--muted-foreground)] mb-3">
              Recommended: use OAuth for the GitHub consent prompt. PAT remains supported as a fallback.
            </p>
            <div className="mb-3 text-xs">
              <span
                className={
                  oauthConnected
                    ? "inline-flex items-center gap-1 rounded border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981] px-2 py-1"
                    : "inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] px-2 py-1"
                }
              >
                {oauthConnected ? "OAuth connected" : "OAuth not connected"}
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Optional: paste a Personal Access Token manually</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[var(--muted-foreground)]">PAT fallback</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-[var(--muted-foreground)]">Personal Access Token</span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">
              Go to{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=read:user,repo,read:org&description=ResumeIQ"
                target="_blank"
                rel="noreferrer"
                className="text-[#0EA5E9] underline underline-offset-2"
              >
                GitHub → Settings → Developer Settings → Personal Access Tokens (classic)
              </a>{" "}
              and create a token with <code className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] px-1 py-0.5 rounded">read:user</code> and <code className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] px-1 py-0.5 rounded">repo</code> scopes.
            </p>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]/30 placeholder:text-[var(--muted-foreground)] font-mono"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
              🔒 Your token is sent directly to the backend to call the GitHub API and is never stored.
            </p>
          </SpotlightCard>

          {/* ── Target Role ── */}
          <SpotlightCard spotlightColor="rgba(14,165,233,0.10)" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-[#0EA5E9]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">Target Role</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  className="w-full appearance-none bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-[#0EA5E9] cursor-pointer"
                  value={showCustom ? "__custom__" : targetRole}
                  onChange={(e) => handleRoleSelect(e.target.value)}
                >
                  {JOB_POSTINGS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                  <option value="__custom__">✏️ Enter a custom role...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
              </div>
              {showCustom && (
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => { setCustomRole(e.target.value); setTargetRole(e.target.value); }}
                  placeholder="e.g. Staff Engineer at Stripe"
                  className="flex-1 bg-[var(--background)] border border-[#0EA5E9]/40 text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[var(--muted-foreground)]"
                />
              )}
            </div>
          </SpotlightCard>

          {/* ── Generate Button ── */}
          <SpotlightCard spotlightColor="rgba(14,165,233,0.12)" className="p-6">

            {status === "idle" && (
              <Button
                onClick={generate}
                disabled={!token.trim() && !oauthConnected}
                className={cn(
                  "w-full h-12 font-semibold text-sm rounded-lg transition-all",
                  "bg-[#0EA5E9] hover:bg-[#0284C7] text-white",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "hover:shadow-[0_0_24px_rgba(14,165,233,0.40)]"
                )}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Connect GitHub &amp; Generate Resume
              </Button>
            )}

            {status === "generating" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0EA5E9]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Building your resume…</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Fetching GitHub profile → reading repos → Gemini rewriting (~20s)</p>
                  </div>
                </div>
                {/* Animated progress dots */}
                <div className="flex gap-1.5 pl-8">
                  {["Fetching profile", "Reading repos", "Analysing languages", "Generating LaTeX"].map((step, i) => (
                    <span key={step} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {status === "done" && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-[#10B981]">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Resume generated!</span>
                </div>

                {/* Profile card */}
                {profile && (
                  <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[var(--muted-foreground)]" />
                      <a href={`https://github.com/${profile.username}`} target="_blank" rel="noreferrer" className="text-sm text-[#0EA5E9] font-medium hover:underline">
                        @{profile.username}
                      </a>
                    </div>
                    {profile.languages.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Code2 className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                        {profile.languages.slice(0, 5).map((l) => (
                          <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20">{l}</span>
                        ))}
                      </div>
                    )}
                    {profile.topRepos.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Star className="w-3.5 h-3.5 text-[#F59E0B]" />
                        {profile.topRepos.map((r) => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {latex && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={downloadLatex} className="btn-primary h-9 px-5 text-sm">
                        <FileDown className="w-4 h-4 mr-2" />Download .tex
                      </Button>
                      {overleafUrl && (
                        <Button
                          onClick={() => window.open(overleafUrl, "_blank", "noopener,noreferrer")}
                          className="btn-ghost h-9 px-5 text-sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />Open in Overleaf
                        </Button>
                      )}
                      <Button
                        onClick={() => { setStatus("idle"); setLatex(""); setProfile(null); }}
                        className="btn-ghost h-9 px-5 text-sm"
                      >
                        Generate Again
                      </Button>
                    </div>

                    <p className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md p-2">
                      Compile the .tex in <strong>Overleaf</strong> (free) to get a polished PDF — no installation needed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/25">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Generation failed</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{errorMsg}</p>
                  </div>
                </div>
                <Button onClick={() => setStatus("idle")} className="btn-ghost h-9 px-4 text-sm">
                  Try Again
                </Button>
              </div>
            )}
          </SpotlightCard>

          {/* ── PAT instructions card ── */}
          <SpotlightCard spotlightColor="rgba(16,185,129,0.08)" className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">How to get a GitHub Token</span>
            </div>
            <ol className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li className="flex gap-2"><span className="text-[#10B981] font-bold shrink-0">1.</span> Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer" className="text-[#0EA5E9] underline underline-offset-2">github.com/settings/tokens/new</a></li>
              <li className="flex gap-2"><span className="text-[#10B981] font-bold shrink-0">2.</span> Set a note like <code className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] px-1 rounded">ResumeIQ</code> and expiration of 1 day</li>
              <li className="flex gap-2"><span className="text-[#10B981] font-bold shrink-0">3.</span> Check scopes: <code className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] px-1 rounded">read:user</code> + <code className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] px-1 rounded">repo</code> + <code className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] px-1 rounded">read:org</code></li>
              <li className="flex gap-2"><span className="text-[#10B981] font-bold shrink-0">4.</span> Click <strong>Generate token</strong>, copy it and paste above</li>
            </ol>
          </SpotlightCard>

        </div>
      </div>
    </div>
  );
}
