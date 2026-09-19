"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Download,
  RotateCcw,
  FileText,
  FileX,
  ExternalLink,
  X,
  ChevronDown,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// Separate Filter Input Component to preserve focus during typing
const ColumnFilterInput = React.memo(
  ({
    columnKey,
    placeholder,
    resetTrigger,
    onFilterChange,
  }: {
    columnKey: string;
    placeholder: string;
    resetTrigger: number;
    onFilterChange: (key: string, val: string) => void;
  }) => {
    const [val, setVal] = useState("");

    // Reset when resetTrigger increments
    useEffect(() => {
      setVal("");
    }, [resetTrigger]);

    return (
      <div
        className="mt-2 w-full font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={val}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            setVal(next);
            onFilterChange(columnKey, next);
          }}
          className="w-full h-8 px-2.5 text-xs sm:text-[13px] font-normal border border-slate-200 dark:border-slate-700/80 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-2xs"
        />
      </div>
    );
  }
);
ColumnFilterInput.displayName = "ColumnFilterInput";

export default function SearchResumePage() {
  const user = useCurrentUser() as any;
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [allData, setAllData] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [resetTrigger, setResetTrigger] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // PDF Preview Modal State
  const [activePdf, setActivePdf] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (!activePdf?.url) {
      setPdfBlobUrl("");
      setPdfLoading(false);
      setPdfError(false);
      return;
    }

    let cancelled = false;
    setPdfLoading(true);
    setPdfError(false);

    fetch(activePdf.url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch PDF");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPdfBlobUrl(url);
        setPdfLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Could not load PDF blob:", err);
        setPdfError(true);
        setPdfLoading(false);
      });

    return () => {
      cancelled = true;
      setPdfBlobUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return "";
      });
    };
  }, [activePdf?.url]);

  const handleDownloadPdf = useCallback(async () => {
    if (!activePdf) return;
    try {
      if (pdfBlobUrl && pdfBlobUrl.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = pdfBlobUrl;
        a.download = `${activePdf.name.replace(/\s+/g, "_")}_Resume.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
      const res = await fetch(activePdf.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activePdf.name.replace(/\s+/g, "_")}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(activePdf.url, "_blank");
    }
  }, [activePdf, pdfBlobUrl]);


  // Helper: Format CTC to 2 decimals
  const formatCtc = (val: any) => {
    if (val === null || val === undefined || val === "") return "0.00";
    const num = Number(val);
    if (!isNaN(num)) return num.toFixed(2);
    return String(val);
  };

  // Helper: Get candidate resume URL
  const getResumeUrl = useCallback((cand: any): string => {
    if (!cand) return "";
    const p =
      cand.resume_path ||
      cand.RESUME_PATH ||
      cand.resume_name ||
      cand.RESUME_URL;
    if (p) {
      return p.startsWith("http")
        ? p
        : `${process.env.NEXT_PUBLIC_imagepath || "https://erp.autovyn.com/backend/fetch?filePath="}${p}`;
    }
    return "";
  }, []);

  // Fetch candidates from backend
  const fetchData = useCallback(async () => {
    const compcode =
      user?.Comp_Code || user?.compcode || user?.COMP_CODE || user?.DB;
    if (!compcode) return;

    const branchVal = user?.branch ?? user?.Primary_Branch ?? user?.branch_code ?? 1;
    const branchNum = Number(branchVal) || 1;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/SearchResume`,
        {
          LOC_CODE: branchNum,
          loc_code: branchNum,
        },
        {
          headers: {
            compcode: String(compcode),
            name: user?.name || "",
          },
        }
      );

      const resData: any[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      const sorted = [...resData].sort((a, b) => (b.TRAN_ID || 0) - (a.TRAN_ID || 0));
      setAllData(sorted);
    } catch (err: any) {
      console.error("Error fetching candidates in Search Resume:", err);
      console.error("Server Error Details:", err.response?.data || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.compcode,
    user?.COMP_CODE,
    user?.DB,
    user?.branch,
    user?.Primary_Branch,
    user?.branch_code,
    user?.name,
  ]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Stable callback to update column filters
  const handleFilterChange = useCallback((colKey: string, val: string) => {
    setFilters((prev) => {
      if (prev[colKey] === val) return prev;
      return { ...prev, [colKey]: val };
    });
  }, []);

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({});
    setResetTrigger((prev) => prev + 1);
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return allData.filter((item) => {
      // 1. Name
      if (filters.NAME) {
        const query = filters.NAME.toLowerCase().trim();
        const val = String(item.NAME || "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 2. Email
      if (filters.EMAIL) {
        const query = filters.EMAIL.toLowerCase().trim();
        const val = String(item.EMAIL || "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 3. Mobile
      if (filters.MOB_NO) {
        const query = filters.MOB_NO.toLowerCase().trim();
        const val = String(item.MOB_NO || "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 4. Qualification
      if (filters.HIGH_QUALIFICATION) {
        const query = filters.HIGH_QUALIFICATION.toLowerCase().trim();
        const val = String(
          item.HIGH_QUAL || item.HIGH_QUALIFICATION || item.QUALIFICATION || ""
        ).toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 5. Percentage
      if (filters.PERCENTAGE) {
        const query = filters.PERCENTAGE.toLowerCase().trim();
        const val = String(item.PASSING_PER ?? item.PERCENTAGE ?? "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 6. Gender
      if (filters.GENDER) {
        const query = filters.GENDER.toLowerCase().trim();
        const val = String(item.GENDER || "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 7. Experience
      if (filters.EXP_IN_YEAR) {
        const query = filters.EXP_IN_YEAR.toLowerCase().trim();
        const val = String(item.EXP_IN_YEAR ?? "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 8. Current CTC
      if (filters.CURRENT_CTC) {
        const query = filters.CURRENT_CTC.toLowerCase().trim();
        const val = String(item.CURRENT_CTC ?? "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 9. Designation
      if (filters.DESIGNATION) {
        const query = filters.DESIGNATION.toLowerCase().trim();
        const val = String(item.DESIGNATION || "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 10. Skills
      if (filters.SKILLS) {
        const query = filters.SKILLS.toLowerCase().trim();
        const val = String(item.SKILLS || "").toLowerCase();
        if (!val.includes(query)) return false;
      }
      // 11. Location
      if (filters.LOC_CODE1) {
        const query = filters.LOC_CODE1.toLowerCase().trim();
        const val = String(
          item.loc_code || item.LOC_CODE1 || item.LOC_CODE || item.LOCATION || item.BRANCH || ""
        ).toLowerCase();
        if (!val.includes(query)) return false;
      }

      return true;
    });
  }, [allData, filters]);

  // Export to Excel handler
  const handleExportExcel = () => {
    const exportCols = [
      { Header: "NAME", accessor: "NAME" },
      { Header: "EMAIL", accessor: "EMAIL" },
      { Header: "MOBILE NO", accessor: "MOB_NO" },
      { Header: "QUALIFICATION", accessor: "HIGH_QUAL" },
      { Header: "PERCENTAGE", accessor: "PASSING_PER" },
      { Header: "GENDER", accessor: "GENDER" },
      { Header: "EXPERIENCE", accessor: "EXP_IN_YEAR" },
      { Header: "CURRENT CTC", accessor: "CURRENT_CTC" },
      { Header: "DESIGNATION", accessor: "DESIGNATION" },
      { Header: "SKILLS", accessor: "SKILLS" },
      { Header: "LOCATION", accessor: "loc_code" },

    ];
    handleExcelDownload(exportCols, filteredData);
  };

  // ReactTable Columns configuration
  const columns = useMemo(
    () => [
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[170px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              NAME
            </span>
            <ColumnFilterInput
              columnKey="NAME"
              placeholder="All name"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "NAME",
        Cell: ({ row }: any) => (
          <span className="font-semibold text-slate-900 dark:text-white text-[15px] sm:text-base truncate block max-w-[210px]">
            {row.original.NAME || "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[200px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              EMAIL
            </span>
            <ColumnFilterInput
              columnKey="EMAIL"
              placeholder="All email"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "EMAIL",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base truncate block max-w-[230px]">
            {row.original.EMAIL || "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[130px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              MOBILE NO
            </span>
            <ColumnFilterInput
              columnKey="MOB_NO"
              placeholder="All mobile"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "MOB_NO",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base whitespace-nowrap">
            {row.original.MOB_NO || "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[140px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              QUALIFICATION
            </span>
            <ColumnFilterInput
              columnKey="HIGH_QUALIFICATION"
              placeholder="All qualification"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "HIGH_QUAL",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base whitespace-nowrap">
            {row.original.HIGH_QUAL?.trim() ||
              row.original.HIGH_QUALIFICATION?.trim() ||
              row.original.QUALIFICATION?.trim() ||
              "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[110px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              PERCENTAGE
            </span>
            <ColumnFilterInput
              columnKey="PERCENTAGE"
              placeholder="All percent"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "PASSING_PER",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base whitespace-nowrap">
            {row.original.PASSING_PER !== undefined &&
              row.original.PASSING_PER !== null &&
              row.original.PASSING_PER !== ""
              ? row.original.PASSING_PER
              : row.original.PERCENTAGE !== undefined &&
                row.original.PERCENTAGE !== null &&
                row.original.PERCENTAGE !== ""
                ? row.original.PERCENTAGE
                : "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[110px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              GENDER
            </span>
            <ColumnFilterInput
              columnKey="GENDER"
              placeholder="All gender"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "GENDER",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base whitespace-nowrap">
            {row.original.GENDER || "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[115px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              EXPERIENCE
            </span>
            <ColumnFilterInput
              columnKey="EXP_IN_YEAR"
              placeholder="All experience"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "EXP_IN_YEAR",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base whitespace-nowrap">
            {row.original.EXP_IN_YEAR !== undefined &&
              row.original.EXP_IN_YEAR !== null &&
              row.original.EXP_IN_YEAR !== ""
              ? row.original.EXP_IN_YEAR
              : "0"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[125px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              CURRENT CTC
            </span>
            <ColumnFilterInput
              columnKey="CURRENT_CTC"
              placeholder="All ctc"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "CURRENT_CTC",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base whitespace-nowrap">
            {formatCtc(row.original.CURRENT_CTC)}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[170px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              DESIGNATION
            </span>
            <ColumnFilterInput
              columnKey="DESIGNATION"
              placeholder="All designation"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "DESIGNATION",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base truncate block max-w-[210px]">
            {row.original.DESIGNATION || "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[170px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              SKILLS
            </span>
            <ColumnFilterInput
              columnKey="SKILLS"
              placeholder="All skills"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "SKILLS",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base truncate block max-w-[220px]">
            {row.original.SKILLS || "—"}
          </span>
        ),
      },
      {
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[130px]">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              LOCATION
            </span>
            <ColumnFilterInput
              columnKey="LOC_CODE1"
              placeholder="All location"
              resetTrigger={resetTrigger}
              onFilterChange={handleFilterChange}
            />
          </div>
        ),
        accessor: "loc_code",
        Cell: ({ row }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[15px] sm:text-base whitespace-nowrap">
            {row.original.loc_code?.trim() ||
              row.original.LOC_CODE1?.trim() ||
              row.original.LOC_CODE?.trim() ||
              row.original.LOCATION?.trim() ||
              row.original.BRANCH?.trim() ||
              "—"}
          </span>
        ),
      },
      {
        // Under RESUME column: NO input filter box as requested by user
        Header: (
          <div className="flex flex-col gap-1.5 w-full min-w-[120px] pb-1">
            <span className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              RESUME
            </span>
            <div className="h-8" />
          </div>
        ),
        accessor: "resume_name",
        Cell: ({ row }: any) => {
          const resumeUrl = getResumeUrl(row.original);
          if (resumeUrl) {
            return (
              <button
                type="button"
                onClick={() =>
                  setActivePdf({
                    url: resumeUrl,
                    name: row.original.NAME || "Candidate",
                  })
                }
                className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer text-[15px] sm:text-base whitespace-nowrap transition-colors"
              >
                <FileText className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>View PDF</span>
              </button>
            );
          }
          return (
            <div className="inline-flex items-center gap-1.5 font-normal text-slate-400 dark:text-slate-500 text-[15px] sm:text-base whitespace-nowrap">
              <FileX className="w-4.5 h-4.5 shrink-0" />
              <span>No resume</span>
            </div>
          );
        },
      },
    ],
    [resetTrigger, handleFilterChange, getResumeUrl]
  );

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#070D18] p-4 sm:p-6 lg:p-8 space-y-6">
      <HashloaderComponent isLoading={isLoading} />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Search resume
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium mt-1">
            Filter the entire resume database column by column, then export or
            open a candidate&apos;s PDF.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm sm:text-base font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Reset filters</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExcelLoading || filteredData.length === 0}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isExcelLoading ? "Exporting..." : "Export to Excel"}</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. TABLE CARD WITH "Resume database" & PAGE SIZE SELECTOR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="w-full bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Card Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Resume database
            </h2>
            <span className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
              {filteredData.length} of {allData.length} rows
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
            <span>Rows</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="appearance-none h-8.5 pl-3 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm sm:text-base font-semibold shadow-2xs cursor-pointer focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-2.5" />
            </div>
          </div>
        </div>

        {/* The ReactTable component */}
        <ServiceTablePagination
          key={pageSize}
          columns={columns}
          data={filteredData}
          initialPageSize={pageSize}
          showExcelExport={false}
          showTopSearch={false}
          headerClassName="[&>div]:!items-start [&>div]:pt-1"
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. PDF PREVIEW MODAL */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activePdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActivePdf(null)}
        >
          <div
            className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activePdf.name} — Resume
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activePdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePdf(null)}
                  className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Modal Body: PDF Viewer */}
            <div className="flex-1 w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden relative flex items-center justify-center">
              {pdfLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Loading Resume PDF...
                  </span>
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                  title="Resume Preview"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-md gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      Direct Preview Restricted
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      The server security policy prevents embedding this document inside an iframe. You can view or download it directly below:
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={activePdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in New Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
