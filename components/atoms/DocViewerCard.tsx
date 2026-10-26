"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  ExternalLink,
  X,
  RotateCw,
} from "lucide-react";

export type DocViewerCardProps = {
  fileName?: string;
  docPath?: string;
  meta?: string;
  status?: "Approved" | "Pending" | "Rejected" | string;
  statusColor?: string;
  statusBg?: string;
  showDownload?: boolean;
  showView?: boolean;
  className?: string;
  onDownload?: (docPath: string, fileName: string) => void;
  onView?: (docPath: string, fileName: string) => void;
};

export default function DocViewerCard({
  fileName,
  docPath = "",
  meta,
  status,
  statusColor,
  statusBg,
  showDownload = true,
  showView = true,
  className = "",
  onDownload,
  onView,
}: DocViewerCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [docPath]);

  // Helper to resolve full document image/pdf URL
  const resolvedUrl = useMemo(() => {
    if (!docPath) return "";
    if (
      docPath.startsWith("http://") ||
      docPath.startsWith("https://") ||
      docPath.startsWith("data:") ||
      docPath.startsWith("blob:")
    ) {
      return docPath;
    }
    const basePath =
      process.env.NEXT_PUBLIC_imagepath ||
      `${process.env.NEXT_PUBLIC_URL || ""}/fetch?filePath=`;
    return `${basePath}${docPath}`;
  }, [docPath]);

  // Check if file is PDF
  const isPdf = useMemo(() => {
    const path = String(docPath || fileName || "").toLowerCase();
    return path.endsWith(".pdf") || path.includes(".pdf");
  }, [docPath, fileName]);

  // Clean filename fallback
  const resolvedFileName = useMemo(() => {
    if (fileName && fileName.trim() !== "") return fileName;
    if (docPath) {
      const clean = docPath.split("?")[0];
      const name = clean.split("/").pop()?.split("\\").pop();
      if (name && name.trim() !== "") return name;
    }
    return `document.${isPdf ? "pdf" : "jpg"}`;
  }, [fileName, docPath, isPdf]);

  // Status style calculation
  const statusStyles = useMemo(() => {
    if (statusColor && statusBg) {
      return { color: statusColor, backgroundColor: statusBg };
    }
    const s = String(status || "").toLowerCase();
    if (s.includes("approv") || s === "1" || s === "y") {
      return {
        color: "#10B981",
        backgroundColor: "rgba(16,185,129,0.14)",
      };
    }
    if (s.includes("reject")) {
      return {
        color: "#E11D48",
        backgroundColor: "rgba(225,29,72,0.14)",
      };
    }
    if (s.includes("pend")) {
      return {
        color: "#F59E0B",
        backgroundColor: "rgba(245,158,11,0.14)",
      };
    }
    return {
      color: "#10B981",
      backgroundColor: "rgba(16,185,129,0.14)",
    };
  }, [status, statusColor, statusBg]);

  // Handle Download (Direct browser download using Blob to avoid opening in new tab)
  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(docPath, resolvedFileName);
      return;
    }
    if (!resolvedUrl) return;

    try {
      const res = await fetch(resolvedUrl);
      if (!res.ok) throw new Error("Fetch failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = resolvedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch {
      // Fallback
      const a = document.createElement("a");
      a.href = resolvedUrl;
      a.download = resolvedFileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Handle View / Modal Open
  const handleViewClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onView) {
      onView(docPath, resolvedFileName);
    }
    setRotation(0);
    setIsPreviewOpen(true);
  };

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPreviewOpen(false);
    };
    if (isPreviewOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewOpen]);

  return (
    <>
      {/* Document Card Container */}
      <div
        className={`border border-[#E2E8F0] dark:border-[#1F2937] rounded-[11px] overflow-hidden hover:border-[#4F46E5] dark:hover:border-[#8B84FF] transition-all bg-[#FFFFFF] dark:bg-[#111827] flex flex-col ${className}`}
      >
        {/* Top Preview Tile */}
        <div
          onClick={handleViewClick}
          className="h-[132px] w-full bg-[#F8FAFC] dark:bg-[#0E1524] flex items-center justify-center text-[#64748B] border-b border-[#E2E8F0] dark:border-[#1F2937] cursor-pointer group select-none relative overflow-hidden"
        >
          {!isPdf && resolvedUrl && !imgError ? (
            <img
              src={resolvedUrl}
              alt={resolvedFileName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span
              className="grid place-items-center w-10 h-10 rounded-[11px] transition-transform duration-200 group-hover:scale-105"
              style={{
                backgroundColor: isPdf ? "rgba(225,29,72,.12)" : "rgba(14,165,233,.12)",
                color: isPdf ? "#E11D48" : "#0EA5E9",
              }}
            >
              {isPdf ? (
                <FileText className="w-4 h-4" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </span>
          )}

          {/* Hover Overlay */}
          {!isPdf && resolvedUrl && !imgError && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
          )}
        </div>

        {/* Bottom Details & Action Bar */}
        <div className="p-[12px_13px] flex-1 flex flex-col justify-between">
          <div>
            <div
              className="text-[12.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:text-[#4F46E5] dark:hover:text-[#8B84FF] transition-colors"
              title={resolvedFileName}
              onClick={handleViewClick}
            >
              {resolvedFileName}
            </div>

            {meta && (
              <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px] tabular-nums truncate">
                {meta}
              </div>
            )}
          </div>

          <div className="flex items-center gap-[7px] mt-[10px] pt-1">
            {/* Status Pill Badge */}
            {status && (
              <span
                className="text-[10.5px] font-bold px-[8px] py-[3px] rounded-full whitespace-nowrap"
                style={{
                  color: statusStyles.color,
                  backgroundColor: statusStyles.backgroundColor,
                }}
              >
                {status}
              </span>
            )}

            <div className="flex-1" />

            {/* View Link Button */}
            {showView && (
              <button
                type="button"
                onClick={handleViewClick}
                className="border-none bg-transparent text-[#4F46E5] dark:text-[#8B84FF] text-[11.5px] font-semibold cursor-pointer p-[2px_4px] hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
            )}

            {/* Download Link Button */}
            {showDownload && (
              <button
                type="button"
                onClick={handleDownloadClick}
                className="border-none bg-transparent text-[#64748B] dark:text-[#94A3B8] text-[11.5px] font-semibold cursor-pointer p-[2px_4px] hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Built-in Full Preview Modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#FFFFFF] dark:bg-[#111827] rounded-[12px] shadow-2xl border border-[#E2E8F0] dark:border-[#1F2937] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div
                  className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isPdf
                      ? "rgba(225,29,72,.12)"
                      : "rgba(14,165,233,.12)",
                    color: isPdf ? "#E11D48" : "#0EA5E9",
                  }}
                >
                  {isPdf ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </div>
                <h4
                  className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] truncate"
                  title={resolvedFileName}
                >
                  {resolvedFileName}
                </h4>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Rotate Button for Images */}
                {!isPdf && (
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    title="Rotate image"
                    className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                )}

                {/* Download Button in Modal */}
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  title="Download file"
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Open in New Tab */}
                <button
                  type="button"
                  onClick={() => window.open(resolvedUrl, "_blank")}
                  title="Open in new tab"
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  title="Close preview"
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/20 min-h-[350px]">
              {isPdf ? (
                <iframe
                  src={resolvedUrl}
                  title={resolvedFileName}
                  className="w-full h-[75vh] rounded-[8px] border-0 bg-white"
                />
              ) : (
                <img
                  src={resolvedUrl}
                  alt={resolvedFileName}
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-[8px] shadow-lg transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-image.png";
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
