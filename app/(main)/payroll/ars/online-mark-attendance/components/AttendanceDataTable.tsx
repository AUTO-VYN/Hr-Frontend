"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Check,
  Minus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import useExcelDownload from "@/app/hooks/excel-download";

export interface ColumnDef {
  Header: string;
  accessor: any;
  width?: number;
  render?: (value: any, row: any, selectedRow: any) => React.ReactNode;
}

export interface AttendanceDataTableProps {
  columns: ColumnDef[];
  data: any[];
  selectedRow?: any;
  onRowClick?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  showCheckbox?: boolean;
  isMultiMode?: boolean;
  selectedRows?: any[];
  onSelectedRowsChange?: (rows: any[]) => void;
  empRunning?: boolean;
  initialPageSize?: number;
  onPageSizeChange?: (size: number) => void;
  height?: number | string;
  columnsDownload?: any[];
  onExportAll?: () => any[] | Promise<any[]>;
  containerClassName?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerSearch?: React.ReactNode;
  headerStats?: React.ReactNode;
  bulkActions?: React.ReactNode;
}

const MAX_CELL_LEN = 50;

function isSameRow(a: any, b: any): boolean {
  if (!a || !b) return false;
  if (a.formatted_dateoffice && b.formatted_dateoffice) {
    return a.formatted_dateoffice === b.formatted_dateoffice;
  }
  if (a.dateoffice && b.dateoffice) {
    return (
      String(a.dateoffice).split("T")[0] === String(b.dateoffice).split("T")[0]
    );
  }
  return false;
}

export function isRowRejected(row: any): boolean {
  if (!row) return false;
  // MAN_REJ / Man_Rej / man_rej
  const rej = String(row.MAN_REJ ?? row.Man_Rej ?? row.man_rej ?? "").trim().toUpperCase();
  if (rej === "Y" || rej === "1" || rej === "TRUE" || rej === "R" || rej === "REJECTED") return true;

  // MAN_APPR / Man_Appr / man_appr
  const appr = String(row.MAN_APPR ?? row.Man_Appr ?? row.man_appr ?? "").trim().toUpperCase();
  if (appr === "N" || appr === "R" || appr === "REJECTED" || appr === "REJ") return true;

  // MP_Status / mp_status
  const mpStatus = String(row.MP_Status ?? row.mp_status ?? "").trim().toUpperCase();
  if (mpStatus === "REJECTED" || mpStatus === "REJ") return true;

  // status / Status / AtnStatus
  const status = String(row.status ?? row.Status ?? row.AtnStatus ?? "").trim().toUpperCase();
  if (status === "REJECTED" || status === "REJ") return true;

  // stat code (0 or 'R' is rejected in HR-Setu APIs)
  if (row.stat === 0 || row.stat === "0" || row.stat === "R" || row.stat === "r") return true;

  // Reject_By
  if (row.Reject_By && String(row.Reject_By).trim() !== "" && String(row.Reject_By).trim() !== "—") return true;

  // Approver 1/2/3
  const a1 = String(row.Approver1_Status ?? "").trim().toUpperCase();
  const a2 = String(row.Approver2_Status ?? "").trim().toUpperCase();
  const a3 = String(row.Approver3_Status ?? "").trim().toUpperCase();
  if (a1 === "REJECTED" || a2 === "REJECTED" || a3 === "REJECTED") return true;

  return false;
}

export type RowPriority = "rejected" | "shift501" | "rerun" | "normal";

export function getRowPriority(row: any, empRunning?: boolean): RowPriority {
  if (isRowRejected(row)) return "rejected";
  const shiftVal = String(row?.shift ?? row?.Shift ?? row?.shift_code ?? row?.Shift_Code ?? "").trim();
  if (shiftVal === "501") return "shift501";
  if (empRunning || row?.EMPRUN || row?.emprun || row?.policy_rerun) return "rerun";
  return "normal";
}

export default function AttendanceDataTable({
  columns,
  data = [],
  selectedRow,
  onRowClick,
  onRowDoubleClick,
  showCheckbox = true,
  isMultiMode = false,
  selectedRows = [],
  onSelectedRowsChange,
  empRunning = false,
  initialPageSize = 50,
  onPageSizeChange,
  height = 580,
  columnsDownload,
  onExportAll,
  containerClassName = "",
  title,
  subtitle,
  headerSearch,
  headerStats,
  bulkActions,
}: AttendanceDataTableProps) {
  const scrollWrapRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize || 50);
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // Keep pageSize in sync with parent prop
  useEffect(() => {
    if (initialPageSize) {
      setPageSize(initialPageSize);
    }
  }, [initialPageSize]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const handlePageSizeSelect = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    onPageSizeChange?.(newSize);
  };

  // Pagination slicing
  const totalRecords = data.length;
  const isAllMode = pageSize === -1;
  const totalPages = isAllMode ? 1 : Math.max(1, Math.ceil(totalRecords / pageSize));

  const pagedRows = useMemo(() => {
    if (isAllMode) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize, isAllMode]);

  // Multi-select helpers
  const isAllSelected = useMemo(() => {
    if (!pagedRows.length) return false;
    return pagedRows.every((row) =>
      selectedRows.some((sel) => isSameRow(sel, row))
    );
  }, [pagedRows, selectedRows]);

  const isSomeSelected = useMemo(() => {
    if (!pagedRows.length) return false;
    return (
      !isAllSelected &&
      pagedRows.some((row) => selectedRows.some((sel) => isSameRow(sel, row)))
    );
  }, [pagedRows, selectedRows, isAllSelected]);

  const toggleSelectAll = () => {
    if (!onSelectedRowsChange) return;
    if (isAllSelected) {
      const next = selectedRows.filter(
        (sel) => !pagedRows.some((r) => isSameRow(sel, r))
      );
      onSelectedRowsChange(next);
    } else {
      const toAdd = pagedRows.filter(
        (r) => !selectedRows.some((sel) => isSameRow(sel, r))
      );
      onSelectedRowsChange([...selectedRows, ...toAdd]);
    }
  };

  const toggleRowSelect = (row: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectedRowsChange) return;
    const already = selectedRows.some((sel) => isSameRow(sel, row));
    if (already) {
      onSelectedRowsChange(selectedRows.filter((sel) => !isSameRow(sel, row)));
    } else {
      onSelectedRowsChange([...selectedRows, row]);
    }
  };

  // Auto-scroll when keyboard selection changes
  useEffect(() => {
    if (!selectedRow || !scrollWrapRef.current) return;
    const activeEl = scrollWrapRef.current.querySelector(
      '[data-row-active="true"]'
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedRow]);

  // Excel export
  const handleExport = async () => {
    const downloadCols =
      columnsDownload ||
      columns.map((col) => ({
        Header: col.Header,
        accessor: col.accessor,
      }));

    if (onExportAll) {
      try {
        const fullData = await onExportAll();
        if (Array.isArray(fullData) && fullData.length > 0) {
          handleExcelDownload(downloadCols, fullData);
          return;
        }
      } catch (err) {
        console.error("Export all data failed, fallback to current data:", err);
      }
    }
    handleExcelDownload(downloadCols, data);
  };

  // Premium High-Contrast Row Styling (Visible Pastel Light Colors in Both Light & Dark Mode)
  const getRowStyleConfig = (row: any, isSelected: boolean, index: number) => {
    const priority = getRowPriority(row, empRunning);

    // Selected row border outline color
    let outlineBorderColor = "#6366F1";
    if (priority === "rejected") outlineBorderColor = "#EF4444";
    else if (priority === "shift501") outlineBorderColor = "#0284C7";
    else if (priority === "rerun") outlineBorderColor = "#F59E0B";

    // PRIORITY 1: REJECTED (MAN_REJ === 'Y' or MAN_APPR === 'N' or MP_Status === 'REJECTED')
    // Soft pastel rose (#FFF1F2) visible in BOTH light and dark mode, with dark high-contrast text
    if (priority === "rejected") {
      return {
        priority,
        leftBorderClass: "border-l-[#EF4444]",
        outlineBorderColor,
        isColored: true,
        rowClass: isSelected
          ? "bg-[#FFE4E6] text-slate-900"
          : "bg-[#FFF1F2] text-slate-900 hover:bg-[#FFE4E6]/80 transition-colors",
      };
    }

    // PRIORITY 2: SHIFT 501
    // Soft pastel sky (#F0F9FF) visible in BOTH light and dark mode, with dark high-contrast text
    if (priority === "shift501") {
      return {
        priority,
        leftBorderClass: "border-l-[#0284C7]",
        outlineBorderColor,
        isColored: true,
        rowClass: isSelected
          ? "bg-[#E0F2FE] text-slate-900"
          : "bg-[#F0F9FF] text-slate-900 hover:bg-[#E0F2FE]/80 transition-colors",
      };
    }

    // PRIORITY 3: RE-RUN (EMPRUN / POLICY RERUN)
    // Soft warm light yellow (#FEFCE8) visible in BOTH light and dark mode, with dark high-contrast text
    if (priority === "rerun") {
      return {
        priority,
        leftBorderClass: "border-l-[#F59E0B]",
        outlineBorderColor,
        isColored: true,
        rowClass: isSelected
          ? "bg-[#FEF08A] text-slate-900"
          : "bg-[#FEFCE8] text-slate-900 hover:bg-[#FEF9C3] transition-colors",
      };
    }

    // SELECTED ROW (ACTIVE INSPECTOR ROW)
    // Soft pastel indigo (#EEF2FF) visible in BOTH light and dark mode, with dark high-contrast text
    if (isSelected) {
      return {
        priority: "selected" as const,
        leftBorderClass: "border-l-[#6366F1]",
        outlineBorderColor,
        isColored: true,
        rowClass: "bg-[#EEF2FF] text-slate-900 hover:bg-[#E0E7FF] transition-colors",
      };
    }

    // NORMAL ROW
    // Light: Clean white / soft slate. Dark: Sleek obsidian glass
    const isEven = index % 2 === 0;
    return {
      priority: "normal" as const,
      leftBorderClass: "border-l-transparent",
      outlineBorderColor: "transparent",
      isColored: false,
      rowClass: isEven
        ? "bg-white hover:bg-slate-50/90 dark:bg-[#0c1527] dark:hover:bg-white/[0.04] text-slate-800 dark:text-slate-200 transition-colors"
        : "bg-slate-50/50 hover:bg-slate-100/70 dark:bg-[#0f1a2e]/60 dark:hover:bg-white/[0.04] text-slate-800 dark:text-slate-200 transition-colors",
    };
  };

  const startRecord = totalRecords === 0 ? 0 : isAllMode ? 1 : (currentPage - 1) * pageSize + 1;
  const endRecord = isAllMode ? totalRecords : Math.min(currentPage * pageSize, totalRecords);

  return (
    <div
      className={`w-full flex flex-col bg-white dark:bg-[#0b1322] backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden transition-all ${containerClassName}`}
    >
      {/* Scoped CSS to ensure high text contrast on colored pastel rows in both Light and Dark mode */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        tr[data-colored-row="true"] td,
        tr[data-colored-row="true"] td span:not(.text-white):not([class*="rounded-full"]),
        tr[data-colored-row="true"] td strong:not(.text-white) {
          color: #0f172a !important;
        }
        tr[data-colored-row="true"] td .text-emerald-600,
        tr[data-colored-row="true"] td .text-emerald-400 {
          color: #047857 !important;
        }
        tr[data-colored-row="true"] td .text-indigo-600,
        tr[data-colored-row="true"] td .text-indigo-400 {
          color: #4338ca !important;
        }
        tr[data-colored-row="true"] td .text-slate-400,
        tr[data-colored-row="true"] td .text-slate-500 {
          color: #64748b !important;
        }
      `,
        }}
      />

      {/* 1. TOP HEADER & PRIORITY LEGEND (Matching Image 1 Minimal Executive Design) */}
      <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#0f1a2e]/65 backdrop-blur-xl flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {title || "Attendance Table"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle || "Sample records for illustration. Rows are coloured by status, with rejected rows first in priority."}
            </p>
          </div>

          {/* Minimal Inline Priority Legend (Directly matching Image 1) */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold select-none">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="w-1 h-3.5 rounded-full bg-[#EF4444]" />
              <span>Rejected</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="w-1 h-3.5 rounded-full bg-[#0284C7]" />
              <span>Shift 501</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="w-1 h-3.5 rounded-full bg-[#F59E0B]" />
              <span>Re-run</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="w-1 h-3.5 rounded-full bg-[#6366F1]" />
              <span>Selected</span>
            </div>
          </div>
        </div>

        {/* Optional Search bar and summary badges row */}
        {(headerSearch || headerStats) && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
            {headerSearch}
            {headerStats}
          </div>
        )}
      </div>

      {/* 2. OPTIONAL BULK ACTION TOOLBAR */}
      {bulkActions && <div className="border-b border-slate-200/80 dark:border-white/10">{bulkActions}</div>}

      {/* 3. SCROLLABLE DATA TABLE */}
      <div
        ref={scrollWrapRef}
        className="w-full overflow-x-auto overflow-y-auto"
        style={{
          maxHeight: typeof height === "number" ? `${height}px` : height,
        }}
      >
        <table className="w-full border-separate border-spacing-0 text-left">
          {/* Glass Sticky Table Header */}
          <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-[#0c1527]/95 backdrop-blur-xl border-b border-slate-200/90 dark:border-white/10 shadow-xs">
            <tr>
              {/* Checkbox Column Header */}
              {showCheckbox && (
                <th className="w-12 px-4 py-3.5 text-center bg-slate-100/90 dark:bg-[#0c1527]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    title={isAllSelected ? "Deselect all" : "Select all on page"}
                    className={`w-[18px] h-[18px] rounded-[5px] mx-auto flex items-center justify-center transition-all cursor-pointer ${
                      isAllSelected
                        ? "bg-[#4F46E5] border border-[#4F46E5] text-white shadow-xs"
                        : isSomeSelected
                          ? "bg-[#EEF2FF] border border-[#4F46E5] text-[#4F46E5]"
                          : "border border-slate-300 dark:border-slate-500 bg-white hover:border-[#4F46E5]"
                    }`}
                  >
                    {isAllSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {isSomeSelected && <Minus className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </th>
              )}

              {/* Data Column Headers */}
              {columns.map((col, idx) => (
                <th
                  key={col.Header || idx}
                  style={{ width: col.width ? `${col.width}px` : undefined }}
                  className="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none whitespace-nowrap bg-slate-100/90 dark:bg-[#0c1527]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10"
                >
                  {col.Header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body with High-Contrast Pastel Rows */}
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showCheckbox ? 1 : 0)}
                  className="py-16 text-center text-sm font-medium text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/[0.06]"
                >
                  No attendance records found for this period.
                </td>
              </tr>
            ) : (
              pagedRows.map((row, rowIdx) => {
                const isSelected = isSameRow(selectedRow, row);
                const isChecked = selectedRows.some((sel) =>
                  isSameRow(sel, row)
                );
                const isRowActive = isSelected || isChecked;
                const { leftBorderClass, outlineBorderColor, isColored, rowClass } = getRowStyleConfig(
                  row,
                  isRowActive,
                  rowIdx
                );

                return (
                  <tr
                    key={row.formatted_dateoffice || row.dateoffice || rowIdx}
                    data-row-active={isSelected ? "true" : undefined}
                    data-colored-row={isColored ? "true" : "false"}
                    onClick={() => onRowClick?.(row)}
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                    className={`cursor-pointer select-none transition-colors ${rowClass}`}
                  >
                    {/* Checkbox Column with 4px Left Indicator Bar and Full Row Outline */}
                    {showCheckbox && (
                      <td
                        onClick={(e) => toggleRowSelect(row, e)}
                        style={{
                          borderTopColor: isRowActive ? outlineBorderColor : undefined,
                          borderBottomColor: isRowActive ? outlineBorderColor : undefined,
                        }}
                        className={`w-12 px-4 py-3.5 text-center align-middle border-l-[4px] ${leftBorderClass} ${
                          isRowActive
                            ? "border-t border-b"
                            : "border-b border-slate-100 dark:border-white/[0.06]"
                        }`}
                      >
                        <div
                          className={`w-[18px] h-[18px] rounded-[5px] mx-auto flex items-center justify-center transition-all cursor-pointer ${
                            isChecked
                              ? "bg-[#4F46E5] border border-[#4F46E5] text-white shadow-xs"
                              : "border border-slate-300 dark:border-slate-500 bg-white hover:border-[#4F46E5]"
                          }`}
                        >
                          {isChecked && (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          )}
                        </div>
                      </td>
                    )}

                    {/* Data Cells (Spacious 13px font across all cells with continuous row outline) */}
                    {columns.map((col, cIdx) => {
                      const rawValue =
                        typeof col.accessor === "function"
                          ? col.accessor(row)
                          : row[col.accessor];
                      const rawStr = String(rawValue ?? "");

                      const displayPlain =
                        rawValue === undefined ||
                        rawValue === null ||
                        rawValue === ""
                          ? "—"
                          : rawStr.length > 40
                            ? rawStr.substring(0, MAX_CELL_LEN) + "..."
                            : rawStr;

                      const isFirstCell = !showCheckbox && cIdx === 0;
                      const isLastCell = cIdx === columns.length - 1;

                      return (
                        <td
                          key={col.Header || cIdx}
                          title={rawStr || undefined}
                          style={{
                            borderTopColor: isRowActive ? outlineBorderColor : undefined,
                            borderBottomColor: isRowActive ? outlineBorderColor : undefined,
                            borderRightColor: isRowActive && isLastCell ? outlineBorderColor : undefined,
                          }}
                          className={`px-5 py-3.5 text-[13px] whitespace-nowrap align-middle ${
                            isRowActive
                              ? `border-t border-b ${isLastCell ? "border-r" : ""}`
                              : "border-b border-slate-100 dark:border-white/[0.06]"
                          } ${isFirstCell ? `border-l-[4px] ${leftBorderClass}` : ""}`}
                        >
                          {col.render ? (
                            col.render(rawValue, row, selectedRow)
                          ) : (
                            <span className="truncate block max-w-[280px] font-normal">
                              {displayPlain}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. FOOTER (Matching Image 1 & 2 exactly with clean spacing & badges) */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[rgba(15,23,42,0.65)] dark:backdrop-blur-md gap-3 text-xs text-slate-600 dark:text-slate-300">
        {/* Left: Showing count */}
        <div className="flex items-center gap-3">
          <span suppressHydrationWarning className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <strong className="font-bold text-slate-800 dark:text-slate-100">
              {startRecord}
            </strong>{" "}
            to{" "}
            <strong className="font-bold text-slate-800 dark:text-slate-100">
              {endRecord}
            </strong>{" "}
            of{" "}
            <strong className="font-bold text-slate-800 dark:text-slate-100">
              {totalRecords}
            </strong>{" "}
            days
          </span>
        </div>

        {/* Right: Controls (Page Size, Excel, Pagination) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Page Size Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            <span>Show</span>
            <select
              suppressHydrationWarning
              value={pageSize}
              onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
              className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 backdrop-blur-sm text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={10} className="dark:bg-slate-900">10</option>
              <option value={20} className="dark:bg-slate-900">20</option>
              <option value={50} className="dark:bg-slate-900">50</option>
              <option value={100} className="dark:bg-slate-900">100</option>
              <option value={-1} className="dark:bg-slate-900">All</option>
            </select>
            <span>entries</span>
          </div>

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExcelLoading || !data.length}
            className="h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 backdrop-blur-sm text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-2xs"
            title="Download attendance as Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExcelLoading ? "Exporting..." : "Excel"}</span>
          </button>

          {/* Prev / Next Pagination */}
          {!isAllMode && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer text-xs font-medium inline-flex items-center text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                <span>Prev</span>
              </button>

              <span suppressHydrationWarning className="text-xs px-2 text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer text-xs font-medium inline-flex items-center text-slate-700 dark:text-slate-200"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
