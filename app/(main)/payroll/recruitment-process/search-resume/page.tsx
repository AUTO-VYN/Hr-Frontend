"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Download,
  RotateCcw,
  FileText,
  FileX,
  ChevronDown,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

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

      const normalized = resData.map((cand: any) => ({
        ...cand,
        NAME: cand.NAME?.trim() || "",
        EMAIL: cand.EMAIL?.trim() || "",
        MOB_NO: cand.MOB_NO?.trim() || "",
        HIGH_QUAL: cand.HIGH_QUAL?.trim() || cand.HIGH_QUALIFICATION?.trim() || cand.QUALIFICATION?.trim() || "",
        PASSING_PER: cand.PASSING_PER !== undefined && cand.PASSING_PER !== null && cand.PASSING_PER !== ""
          ? String(cand.PASSING_PER).trim()
          : cand.PERCENTAGE !== undefined && cand.PERCENTAGE !== null && cand.PERCENTAGE !== ""
            ? String(cand.PERCENTAGE).trim()
            : "",
        GENDER: cand.GENDER?.trim() || "",
        EXP_IN_YEAR: cand.EXP_IN_YEAR !== undefined && cand.EXP_IN_YEAR !== null && cand.EXP_IN_YEAR !== ""
          ? String(cand.EXP_IN_YEAR).trim()
          : "0",
        CURRENT_CTC: cand.CURRENT_CTC !== undefined && cand.CURRENT_CTC !== null && cand.CURRENT_CTC !== ""
          ? formatCtc(cand.CURRENT_CTC)
          : "0.00",
        DESIGNATION: cand.DESIGNATION?.trim() || "",
        SKILLS: cand.SKILLS?.trim() || "",
        loc_code: cand.loc_code?.trim() || cand.LOC_CODE1?.trim() || cand.LOC_CODE?.trim() || cand.LOCATION?.trim() || cand.BRANCH?.trim() || "",
      }));

      const sorted = [...normalized].sort((a, b) => (b.TRAN_ID || 0) - (a.TRAN_ID || 0));
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
    const activeEntries = Object.entries(filters).filter(
      ([_, v]) => v && String(v).trim() !== ""
    );
    if (activeEntries.length === 0) return allData;

    return allData.filter((item) => {
      return activeEntries.every(([key, filterVal]) => {
        const query = String(filterVal).toLowerCase().trim();
        const rawVal = item[key];
        if (rawVal === undefined || rawVal === null) return false;
        return String(rawVal).toLowerCase().includes(query);
      });
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

  // ReactTable Columns configuration (Clean headers, dropdown filter placeholders, HTML-aligned font styles)
  const columns = useMemo(
    () => [
      {
        Header: "NAME",
        accessor: "NAME",
        filterPlaceholder: "All name",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.NAME;
          return (
            <span
              className="font-semibold text-slate-900 dark:text-slate-100 text-[12.5px] truncate block max-w-[200px]"
              title={val}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "EMAIL",
        accessor: "EMAIL",
        filterPlaceholder: "All email",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.EMAIL;
          return (
            <span
              className={`text-[12.5px] font-normal truncate block max-w-[220px] ${
                val
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
              title={val}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "MOBILE NO",
        accessor: "MOB_NO",
        filterPlaceholder: "All mobile",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.MOB_NO;
          return (
            <span
              className={`text-[12.5px] font-normal whitespace-nowrap ${
                val
                  ? "text-slate-700 dark:text-slate-300 font-mono"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "QUALIFICATION",
        accessor: "HIGH_QUAL",
        filterPlaceholder: "All qualification",
        Cell: ({ value, row }: any) => {
          const val = value?.trim() || row.original?.HIGH_QUAL?.trim();
          return (
            <span
              className={`text-[12.5px] font-normal whitespace-nowrap ${
                val
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "PERCENTAGE",
        accessor: "PASSING_PER",
        filterPlaceholder: "All percent",
        Cell: ({ value, row }: any) => {
          const val =
            value !== undefined && value !== null && value !== ""
              ? value
              : row.original?.PASSING_PER;
          const hasVal = val !== undefined && val !== null && val !== "";
          return (
            <span
              className={`text-[12.5px] font-normal whitespace-nowrap tabular-nums ${
                hasVal
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {hasVal ? val : "—"}
            </span>
          );
        },
      },
      {
        Header: "GENDER",
        accessor: "GENDER",
        filterPlaceholder: "All gender",
        Cell: ({ value, row }: any) => {
          const val = value?.trim() || row.original?.GENDER?.trim();
          return (
            <span
              className={`text-[12.5px] font-normal whitespace-nowrap ${
                val
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "EXPERIENCE",
        accessor: "EXP_IN_YEAR",
        filterPlaceholder: "All experience",
        Cell: ({ value, row }: any) => {
          const val =
            value !== undefined && value !== null && value !== ""
              ? value
              : row.original?.EXP_IN_YEAR;
          return (
            <span className="text-[12.5px] font-normal text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
              {val !== undefined && val !== null && val !== "" ? val : "0"}
            </span>
          );
        },
      },
      {
        Header: "CURRENT CTC",
        accessor: "CURRENT_CTC",
        filterPlaceholder: "All ctc",
        Cell: ({ value, row }: any) => {
          const val =
            value !== undefined && value !== null && value !== ""
              ? value
              : row.original?.CURRENT_CTC;
          return (
            <span className="text-[12.5px] font-normal text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
              {formatCtc(val)}
            </span>
          );
        },
      },
      {
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        filterPlaceholder: "All designation",
        Cell: ({ value, row }: any) => {
          const val = value?.trim() || row.original?.DESIGNATION?.trim();
          return (
            <span
              className={`text-[12.5px] font-normal truncate block max-w-[200px] ${
                val
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
              title={val}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "SKILLS",
        accessor: "SKILLS",
        filterPlaceholder: "All skills",
        Cell: ({ value, row }: any) => {
          const val = value?.trim() || row.original?.SKILLS?.trim();
          return (
            <span
              className={`text-[12.5px] font-normal truncate block max-w-[210px] ${
                val
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
              title={val}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "LOCATION",
        accessor: "loc_code",
        filterPlaceholder: "All location",
        Cell: ({ value, row }: any) => {
          const val = value?.trim() || row.original?.loc_code?.trim();
          return (
            <span
              className={`text-[12.5px] font-normal whitespace-nowrap ${
                val
                  ? "text-slate-700 dark:text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "RESUME",
        accessor: "resume_name",
        disableFilter: true,
        filterable: false,
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
                className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer text-[12px] whitespace-nowrap transition-colors"
              >
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>View PDF</span>
              </button>
            );
          }
          return (
            <div className="inline-flex items-center gap-1.5 font-normal text-slate-400 dark:text-slate-500 text-[12px] whitespace-nowrap">
              <FileX className="w-4 h-4 shrink-0" />
              <span>No resume</span>
            </div>
          );
        },
      },
    ],
    [getResumeUrl]
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
      <div className="w-full bg-white dark:bg-[#0B1220] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Card Header Bar (Styled matching HTML mockup) */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">
              Resume database
            </h2>
            <span className="text-[11.5px] font-normal text-slate-500 dark:text-slate-400 tabular-nums">
              {filteredData.length} of {allData.length} rows
            </span>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Rows</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="appearance-none h-7.5 pl-2.5 pr-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[12px] font-medium shadow-2xs cursor-pointer focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2 top-2.5" />
            </div>
          </div>
        </div>

        {/* The ReactTable component with dropdown column filters */}
        <ServiceTablePagination
          key={`${pageSize}-${resetTrigger}`}
          columns={columns}
          data={allData}
          initialPageSize={pageSize}
          showColumnFilters={true}
          columnFilters={filters}
          onColumnFilterChange={handleFilterChange}
          columnFiltersResetTrigger={resetTrigger}
          showExcelExport={false}
          showTopSearch={false}
          headerClassName="text-[10.5px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400"
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
                  <Download className="w-3.5 h-3.5" />
                  <span>Open in tab</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePdf(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: PDF Viewer */}
            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center">
              {pdfLoading && (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Loading PDF document...
                  </p>
                </div>
              )}

              {pdfError && !pdfLoading && (
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                  <FileX className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Failed to preview document
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                    The PDF could not be loaded in preview. You can still download or open it in a new tab.
                  </p>
                  <a
                    href={activePdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Open PDF in new tab
                  </a>
                </div>
              )}

              {!pdfLoading && !pdfError && pdfBlobUrl && (
                <iframe
                  src={pdfBlobUrl}
                  title="PDF Preview"
                  className="w-full h-full border-none"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
