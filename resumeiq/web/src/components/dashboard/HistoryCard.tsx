"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FileText, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { deleteAnalysis } from "@/lib/firestore";
import { ScoreCard } from "./ScoreCard";
import { FeedbackPanel } from "./FeedbackPanel";
import { useToast } from "@/hooks/use-toast";

interface HistoryCardProps {
  analysis: {
    id: string;
    fileName: string;
    totalScore: number;
    targetRole?: string;
    createdAt: any;
  };
  onDelete?: () => void;
}

export function HistoryCard({ analysis, onDelete }: HistoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAnalysis(analysis.id);
      toast({
        title: "Success",
        description: "Analysis deleted",
      });
      onDelete?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete analysis",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25";
    if (score >= 60) return "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25";
    return "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/25";
  };

  const createdAt = analysis.createdAt?.toDate?.()
    ? formatDistanceToNow(analysis.createdAt.toDate(), { addSuffix: true })
    : "Recently";

  return (
    <>
      <Card className="card-dark p-4 hover:border-[#0EA5E9]/30 transition-all">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left - File Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="w-5 h-5 text-[#0EA5E9] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-slate-200 font-medium truncate text-sm">
                {analysis.fileName}
              </p>
              <p className="text-xs text-slate-500">{createdAt}</p>
            </div>
          </div>

          {/* Middle - Target Role */}
          {analysis.targetRole && (
            <div className="hidden md:block">
              <Badge
                variant="outline"
                className="border-[#1E1E2E] text-gray-400"
              >
                {analysis.targetRole}
              </Badge>
            </div>
          )}

          {/* Right - Score & Actions */}
          <div className="flex items-center gap-3">
            <div
              className={`${getScoreBadgeColor(
                analysis.totalScore
              )} px-3 py-1 rounded-full font-bold text-xs tabular-nums`}
            >
              {analysis.totalScore}/100
            </div>
            <Button
              onClick={() => setIsOpen(true)}
              size="sm"
              className="btn-primary"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              size="sm"
              variant="ghost"
              className="btn-ghost text-red-500 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-2xl bg-[#0C0F1A] border-l border-[#1A1F35]">
          <SheetHeader>
            <SheetTitle className="text-slate-100 text-sm">{analysis.fileName}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)]">
            <ScoreCard analysis={analysis} />
            <FeedbackPanel analysis={analysis} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
