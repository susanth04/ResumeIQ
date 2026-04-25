"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FeedbackPanelProps {
  analysis: {
    feedback?: string;
    suggestions?: string[];
    parsedName?: string;
    parsedEmail?: string;
    [key: string]: unknown;
  };
}

type Tab = "feedback" | "suggestions" | "raw";

export function FeedbackPanel({ analysis }: FeedbackPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("feedback");
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const priorityLabel = (i: number) =>
    i === 0 ? "High" : i === 1 ? "Medium" : "Low";

  const priorityStyle = (i: number) =>
    i === 0
      ? "bg-red-500/15 border-red-500/40 text-red-400"
      : i === 1
        ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
        : "bg-[#0EA5E9]/15 border-[#0EA5E9]/40 text-[#0EA5E9]";

  return (
    <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">

      {/* ── Tab Bar ── */}
      <div className="w-full grid grid-cols-3 border-b border-[var(--border)] bg-[var(--background)] h-10">
        {(["feedback", "suggestions", "raw"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "h-full text-xs font-medium transition-colors border-b-2",
              activeTab === tab
                ? "text-[#0EA5E9] border-[#0EA5E9]"
                : "text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]"
            )}
          >
            {tab === "feedback" && "AI Feedback"}
            {tab === "suggestions" && `Suggestions (${analysis.suggestions?.length ?? 0})`}
            {tab === "raw" && "Raw Data"}
          </button>
        ))}
      </div>

      {/* ── Tab 1: AI Feedback ── */}
      {activeTab === "feedback" && (
        <div className="p-6 w-full">
          {analysis.feedback ? (
            <div className="w-full min-w-0">
              <ReactMarkdown
                components={{
                  h2: ({ ...props }) => (
                    <h2 className="text-base font-semibold text-[var(--foreground)] mt-6 mb-2 first:mt-0" {...props} />
                  ),
                  h3: ({ ...props }) => (
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mt-4 mb-1" {...props} />
                  ),
                  p: ({ ...props }) => (
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-3 break-words" {...props} />
                  ),
                  ul: ({ ...props }) => (
                    <ul className="space-y-1.5 mb-3" {...props} />
                  ),
                  li: ({ ...props }) => (
                    <li className="text-sm text-[var(--muted-foreground)] leading-relaxed flex gap-2 min-w-0">
                      <span className="text-[#0EA5E9] mt-1 shrink-0">•</span>
                      <span className="min-w-0 break-words" {...props} />
                    </li>
                  ),
                  strong: ({ ...props }) => (
                    <strong className="text-[var(--foreground)] font-semibold" {...props} />
                  ),
                  code: ({ ...props }) => (
                    <code className="text-[#0EA5E9] bg-[#0EA5E9]/10 px-1.5 py-0.5 rounded text-xs font-mono break-all" {...props} />
                  ),
                }}
              >
                {analysis.feedback}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-[var(--muted-foreground)] text-sm">
              No feedback available yet. Upload and analyze a resume first.
            </p>
          )}
        </div>
      )}

      {/* ── Tab 2: Suggestions ── */}
      {activeTab === "suggestions" && (
        <div className="p-6 w-full">
          {analysis.suggestions && analysis.suggestions.length > 0 ? (
            <div className="space-y-2">
              {analysis.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="border border-[var(--border)] rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSuggestion(expandedSuggestion === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--muted)]/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge className={`shrink-0 text-xs border ${priorityStyle(idx)}`}>
                        {priorityLabel(idx)}
                      </Badge>
                      <span className="text-[var(--foreground)] text-sm min-w-0 break-words">
                        {suggestion}
                      </span>
                    </div>
                    {expandedSuggestion === idx
                      ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />}
                  </button>
                  {expandedSuggestion === idx && (
                    <div className="px-4 py-3 bg-[var(--background)] border-t border-[var(--border)] space-y-3">
                      <p className="text-sm text-[var(--muted-foreground)] break-words">{suggestion}</p>
                      <Button
                        size="sm"
                        onClick={() => handleCopy(suggestion)}
                        className="btn-ghost h-7 px-3 text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1.5" />
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted-foreground)] text-sm">No suggestions available.</p>
          )}
        </div>
      )}

      {/* ── Tab 3: Raw Data ── */}
      {activeTab === "raw" && (
        <div className="p-6 w-full">
          <div className="bg-[var(--background)] rounded-lg p-4 border border-[var(--border)] overflow-x-auto">
            <pre className="text-xs text-[var(--muted-foreground)] font-mono leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
}