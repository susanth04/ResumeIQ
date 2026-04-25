"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";

interface UploadZoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  targetRole: string;
  onTargetRoleChange: (role: string) => void;
  loading: boolean;
  onAnalyze: () => void;
  hideRoleInput?: boolean;
}

export function UploadZone({
  file,
  onFileChange,
  targetRole,
  onTargetRoleChange,
  loading,
  onAnalyze,
  hideRoleInput = false,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const selectedFile = files[0];
      if (
        selectedFile.type === "application/pdf" ||
        selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        onFileChange(selectedFile);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onFileChange(files[0]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative group rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer p-4 min-h-[120px] text-center
          ${file
            ? "border-[#0EA5E9]/40 bg-[#0EA5E9]/5 cursor-default"
            : "border-[var(--border)] hover:border-[#0EA5E9]/50 hover:bg-[#0EA5E9]/5 bg-[var(--muted)]"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#0EA5E9]/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#0EA5E9]" />
              </div>
              <div className="text-left min-w-0">
                <p className="font-medium text-[var(--foreground)] truncate">{file.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
              className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-[var(--border)] group-hover:bg-[#0EA5E9]/10 flex items-center justify-center mx-auto mb-4 transition-colors">
              <Upload className="w-6 h-6 text-[var(--muted-foreground)] group-hover:text-[#0EA5E9] transition-colors" />
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
              Drop your resume here
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">
              or click to browse — PDF or DOCX, max 5 MB
            </p>
            <Button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="btn-primary h-9 px-5 text-sm"
            >
              Choose File
            </Button>
          </>
        )}
      </div>

      {/* Optional role input */}
      {!hideRoleInput && (
        <div>
          <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-2 uppercase tracking-wider">
            Target Role (optional)
          </label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => onTargetRoleChange(e.target.value)}
            placeholder="e.g., Senior ML Engineer"
            className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]/30 placeholder:text-[var(--muted-foreground)]"
          />
        </div>
      )}

      <Button
        onClick={onAnalyze}
        disabled={!file || loading}
        className="w-full h-11 font-semibold text-sm bg-[#0EA5E9] hover:bg-[#0284C7] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 rounded-lg"
      >
        {loading ? "Analyzing..." : "Analyze Resume"}
      </Button>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Accepted: .pdf · .docx · Max 5 MB
      </p>
    </div>
  );
}
