"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Calendar,
  Clock,
  Download,
  Info,
  Kanban,
  RotateCcw,
  Search,
  Table as TableIcon,
  UserPlus,
  X,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useFormData } from "../Shortlisted_Candidate/Context/FormDataContext";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import HashloaderComponent from "@/components/Templates/hashloader";
import CardView from "@/components/Templates/card";
import ReactTable from "@/components/Templates/reacttable";
import FileViewer from "@/components/atoms/FileviewerBank";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const religionMapping: Record<string, string> = {
  "1": "Hindu",
  "2": "Muslim",
  "3": "Sikh",
  "4": "Christian",
  "5": "Jain",
  "6": "Buddhist",
  "7": "Persians",
  "OTHER": "Other",
};

const FilterData = [
  { value: "2", label: "All shortlisted entries" },
  { value: "99", label: "Rejected From Resume Bank" },
  { value: "3", label: "Interview in Processing" },
  { value: "100", label: "All Interview Done" },
  { value: "101", label: "Finally Selected By Hr" },
  { value: "102", label: "Finally Rejected By Hr" },
  { value: "103", label: "Created Employee master" },
  { value: "104", label: "Employee Removed from employee Master" },
];

const avatarColors = [
  "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
  "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
  "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60",
  "bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60",
  "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60",
  "bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60",
  "bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/60",
  "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
  "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60",
  "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800/60",
];

const getAvatarStyle = (name: string = "") => {
  const safeName = String(name || "").trim() || "User";
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getInitials = (name: string = "") => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatDate = (dateString: any) => {
  if (!dateString || dateString === "null" || dateString === "—") return "";
  try {
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = d.getDate().toString().padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {}
  return String(dateString);
};

const calculateDaysInStage = (dateStr?: string) => {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
};

const getCandidateCurrentRound = (c: any) => {
  if (c.INTR4STATUS || c.INTR4DATE || c.INTR4BY) return 4;
  if (c.INTR3STATUS || c.INTR3DATE || c.INTR3BY) return 3;
  if (c.INTR2STATUS || c.INTR2DATE || c.INTR2BY) return 2;
  return 1;
};

const getStatusLabel = (status: any) => {
  const s = String(status);
  switch (s) {
    case "2":
      return "Shortlisted, not scheduled";
    case "3":
      return "Interview in processing";
    case "100":
      return "All Interview Done";
    case "101":
      return "Finally selected by HR";
    case "102":
      return "Finally rejected by HR";
    case "103":
      return "Employee master Created";
    case "104":
      return "Removed From employee Master";
    case "99":
      return "Rejected from resume bank";
    default:
      return "Shortlisted";
  }
};

export default function ShortlistedApplicationsPage() {
  const router = useRouter();
  const user = useCurrentUser() as any;
  const { formData1, setFormData1 } = useFormData();

  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [filterdrop, setFilterdrop] = useState<string>("2");
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtertable, setFiltertable] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const gotoezoom = (rowData: any) => {
    console.log(rowData, "rowdata");
    if (setFormData1) {
      setFormData1(rowData);
    }
  };

  useEffect(() => {
    if (setFormData1) {
      setFormData1({} as any);
    }
  }, []);

  const handleRowClick = (candidate: any) => {
    if (setFormData1) {
      setFormData1(candidate);
    }
  };

  // Candidate Details Zoom Dialog
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const getCompCode = (): string => {
    return (
      user?.Comp_Code ||
      user?.compcode ||
      user?.company_code ||
      (typeof window !== "undefined" ? localStorage.getItem("compcode") || "" : "")
    );
  };

  const fetchData = async () => {
    const compCode = getCompCode();
    if (!compCode) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/shortlistedcandi`,
        {
          loc_code: user?.branch,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );

      const data = response.data?.data || [];
      const sorted = [...data].sort((a, b) => Number(b.TRAN_ID) - Number(a.TRAN_ID));
      setTabledata(sorted);
      applyFilter(sorted, filterdrop, searchQuery);
    } catch (error) {
      console.error("Error fetching shortlisted candidates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const applyFilter = (data: any[], filter: string, search: string = "") => {
    let filtered = [...data];

    if (filter && filter !== "2") {
      filtered = filtered.filter((item) => String(item.INT_STATUS) === String(filter));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          String(c.NAME || "").toLowerCase().includes(q) ||
          String(c.TRAN_ID || "").toLowerCase().includes(q) ||
          String(c.DESIGNATION || "").toLowerCase().includes(q) ||
          String(c.EMAIL || "").toLowerCase().includes(q) ||
          String(c.MOB_NO || "").toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => Number(b.TRAN_ID) - Number(a.TRAN_ID));
    setFiltertable(filtered);
  };

  useEffect(() => {
    applyFilter(tabledata, filterdrop, searchQuery);
  }, [filterdrop, searchQuery, tabledata]);

  const handleFilterChange = (_name: string, value: any) => {
    setFilterdrop(String(value));
  };

  const openZoomModal = (candidate: any) => {
    setSelectedCandidate(candidate);
    setIsDialogOpen(true);
  };

  const handleCandidateNavigation = (candidate: any) => {
    handleRowClick(candidate);
    const status = String(candidate.INT_STATUS);
    if (status === "99" || status === "102" || status === "104") {
      openZoomModal(candidate);
    } else {
      router.push(
        `/payroll/recruitment-process/interview-scheduling?tran_id=${candidate.TRAN_ID}`
      );
    }
  };

  // 4 Columns for the Board View
  const boardColumns = useMemo(() => {
    const awaiting = filtertable.filter(
      (c) => String(c.INT_STATUS) === "2" || !c.INT_STATUS
    );
    const processing = filtertable.filter(
      (c) => String(c.INT_STATUS) === "3" || String(c.INT_STATUS) === "100"
    );
    const selected = filtertable.filter(
      (c) => String(c.INT_STATUS) === "101" || String(c.INT_STATUS) === "103"
    );
    const rejected = filtertable.filter((c) => {
      const s = String(c.INT_STATUS);
      return s === "99" || s === "102" || s === "104";
    });

    return [
      {
        id: "awaiting",
        title: "Awaiting scheduling",
        dotColor: "bg-blue-500",
        count: awaiting.length,
        items: awaiting,
        buttonText: "Schedule",
        buttonIcon: Calendar,
      },
      {
        id: "processing",
        title: "Interview in processing",
        dotColor: "bg-amber-500",
        count: processing.length,
        items: processing,
        buttonText: "Open rounds",
        buttonIcon: Calendar,
      },
      {
        id: "selected",
        title: "Selected by HR",
        dotColor: "bg-emerald-500",
        count: selected.length,
        items: selected,
        buttonText: "Create master",
        buttonIcon: UserPlus,
      },
      {
        id: "rejected",
        title: "Rejected",
        dotColor: "bg-rose-500",
        count: rejected.length,
        items: rejected,
        buttonText: "Reopen",
        buttonIcon: RotateCcw,
      },
    ];
  }, [filtertable]);

  // Export Data Handler
  const handleExport = () => {
    if (!filtertable || filtertable.length === 0) {
      Swal.fire("Info", "No data to export", "info");
      return;
    }

    const exportRows = filtertable.map((row: any) => ({
      SR: row.TRAN_ID,
      Status: getStatusLabel(row.INT_STATUS),
      Name: row.NAME || "",
      Email: row.EMAIL || "",
      Mobile: row.MOB_NO || "",
      Address: row.ADDRESS || "",
      Designation: row.DESIGNATION || "",
      AppliedDate: row.APPLICATION_DATE1 ? formatDate(row.APPLICATION_DATE1) : "",
      Location: row.LOC_CODE1 || "",
      Interviewer1: row.employeename1 || "",
      Remark1: row.INTR1REMARK || "",
      Interviewer2: row.employeename2 || "",
      Remark2: row.INTR2REMARK || "",
      Interviewer3: row.employeename3 || "",
      Remark3: row.INTR3REMARK || "",
      Interviewer4: row.employeename4 || "",
      Remark4: row.INTR4REMARK || "",
    }));

    try {
      const headers = Object.keys(exportRows[0]).join(",");
      const csvLines = exportRows.map((r: any) =>
        Object.values(r)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvLines].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Shortlisted_Candidates_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  // Status Badge Pill Renderer
  const renderStatusPill = (status: any) => {
    const s = String(status);
    let colorClass =
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
    let dotClass = "bg-sky-500";

    if (s === "3" || s === "100") {
      colorClass =
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      dotClass = "bg-amber-500";
    } else if (s === "101" || s === "103") {
      colorClass =
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      dotClass = "bg-emerald-500";
    } else if (s === "102") {
      colorClass =
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      dotClass = "bg-rose-500";
    } else if (s === "99" || s === "104") {
      colorClass =
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      dotClass = "bg-slate-400";
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[15px] font-medium border ${colorClass}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        <span>{getStatusLabel(status)}</span>
      </span>
    );
  };

  // Table Columns Definition
  const columns = useMemo(
    () => [
      {
        Header: "SR",
        accessor: "TRAN_ID",
        Cell: ({ value }: any) => (
          <span className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
            {value}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "INT_STATUS",
        Cell: ({ row }: any) => renderStatusPill(row.original.INT_STATUS),
      },
      {
        Header: "ZOOM",
        accessor: "zoom",
        align: "center",
        Cell: ({ row }: any) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const candidate = row.original;
              gotoezoom(candidate);
              const compCode = getCompCode();
              const payload = JSON.stringify({
                comp_code: compCode,
                TRAN_ID: candidate?.TRAN_ID,
              });
              const v1 = typeof window !== "undefined" ? btoa(payload) : "";
              router.push(
                `/payroll/recruitment-process/Shortlisted_Candidate?flag=true&v1=${v1}&tran_id=${candidate?.TRAN_ID}`
              );
            }}
            className=" h-10 w-40 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-lg font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-600 dark:hover:text-white transition-all shadow-2xs cursor-pointer select-none"
            title="Open candidate details"
          >
            <Search className="w-5 h-5" />
            <span>Zoom</span>
          </button>
        ),
      },
      {
        Header: "NAME",
        accessor: "NAME",
        Cell: ({ row }: any) => {
          const name = row.original.NAME || "—";
          return (
            <div className="flex items-center gap-3">
              <span
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-2xs ${getAvatarStyle(
                  name
                )}`}
              >
                {getInitials(name)}
              </span>
              <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                {name}
              </span>
            </div>
          );
        },
      },
      {
        Header: "EMAIL",
        accessor: "EMAIL",
        Cell: ({ value }: any) => (
          <span className="text-[15px] text-slate-600 dark:text-slate-400">
            {value && value !== "null" ? value : "—"}
          </span>
        ),
      },
      {
        Header: "MOBILE NO",
        accessor: "MOB_NO",
        Cell: ({ value }: any) => (
          <span className="text-[15px] text-slate-600 dark:text-slate-400">
            {value && value !== "null" ? value : "—"}
          </span>
        ),
      },
      {
        Header: "ADDRESS",
        accessor: "ADDRESS",
        Cell: ({ value }: any) => (
          <span className="text-[15px] text-slate-600 dark:text-slate-400 truncate max-w-[180px] inline-block">
            {value && value !== "null" ? value : "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        Cell: ({ value }: any) => (
          <span className="text-[15px] text-slate-700 dark:text-slate-300 font-medium">
            {value && value !== "null" ? value : "—"}
          </span>
        ),
      },
      {
        Header: "APPLIED",
        accessor: "APPLICATION_DATE1",
        Cell: ({ value }: any) => (
          <span className="text-[15px] text-slate-600 dark:text-slate-400">
            {value ? formatDate(value) : "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full space-y-5">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TOP HEADER CONTROLS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl  font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Shortlisted candidates
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-500 dark:text-slate-400 font-normal mt-1">
            Move a candidate along the board, or switch to the table for the full record.
          </p>
        </div>

        {/* Right Controls: Filter + View Switcher + Export */}
        <div className="flex flex-wrap items-end sm:items-center gap-3.5">
          {/* Filter Dropdown */}
          <div className="w-64 sm:w-72">
            <Eselect
              title="FILTER DATA"
              name="filterdrop"
              option={FilterData}
              initialValue={filterdrop}
              handleInputChange={handleFilterChange}
              placeholder="All shortlisted entries"
            />
          </div>

          {/* View Mode Toggle: Board vs Table */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-lg font-semibold transition cursor-pointer ${
                viewMode === "board"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-lg font-semibold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Table</span>
            </button>
          </div>

          {/* Export Button */}
          <AButton
            variant="outline"
            size="md"
            onClick={handleExport}
            className="!rounded-xl !h-10 !px-4 !text-lg !font-semibold !border-slate-200 dark:!border-slate-700 hover:!bg-slate-50 dark:hover:!bg-slate-800"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>Export</span>
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: BOARD (KANBAN COLUMNS) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-start">
          {boardColumns.map((col) => (
            <div
              key={col.id}
              className="bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 space-y-3"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 py-0.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {col.title}
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-400 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {col.count}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-3 min-h-[150px]">
                {col.items.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20">
                    <p className="text-xs text-slate-400 font-medium">No candidates</p>
                  </div>
                ) : (
                  col.items.map((candidate: any) => {
                    const days = calculateDaysInStage(
                      candidate.APPLICATION_DATE1 || candidate.CREATED_DATE
                    );
                    const isLongWait = days > 30;
                    const roundNum = getCandidateCurrentRound(candidate);

                    return (
                      <div
                        key={candidate.TRAN_ID}
                        onDoubleClick={() => handleCandidateNavigation(candidate)}
                        className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition space-y-3"
                      >
                        {/* Top: Avatar + Name + SR & Date */}
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarStyle(
                              candidate.NAME
                            )}`}
                          >
                            {getInitials(candidate.NAME)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {candidate.NAME || "—"}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate">
                              SR {candidate.TRAN_ID} ·{" "}
                              {candidate.APPLICATION_DATE1
                                ? formatDate(candidate.APPLICATION_DATE1)
                                : "—"}
                            </p>
                          </div>
                        </div>

                        {/* Designation */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">
                          {candidate.DESIGNATION || "—"}
                        </p>

                        {/* Badges: Days in stage + Round Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isLongWait
                                ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                                : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{days} days in stage</span>
                          </span>

                          {col.id === "processing" && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              Round {roundNum} of 4
                            </span>
                          )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleCandidateNavigation(candidate)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-[#111827] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                          >
                            <col.buttonIcon className="w-3.5 h-3.5" />
                            <span>{col.buttonText}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              gotoezoom(candidate);
                              const compCode = getCompCode();
                              const payload = JSON.stringify({
                                comp_code: compCode,
                                TRAN_ID: candidate?.TRAN_ID,
                              });
                              const v1 = typeof window !== "undefined" ? btoa(payload) : "";
                              router.push(
                                `/payroll/recruitment-process/Shortlisted_Candidate?flag=true&v1=${v1}&tran_id=${candidate?.TRAN_ID}`
                              );
                            }}
                            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                            title="Candidate Information"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* VIEW: TABLE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {viewMode === "table" && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden [&_td]:!text-[15px] [&_td_div]:!text-[15px]">
          <ReactTable
            columns={columns}
            data={filtertable}
            onRowClick={(row: any) => handleRowClick(row?.original || row)}
            onRowDoubleClick={handleCandidateNavigation}
            showTopSearch={false}
            showExcelExport={false}
            height="auto"
          />

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Double-click a row for full interview scheduling details · Zoom shows candidate information.
              </span>
            </div>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {filtertable.length} entries
            </span>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* CANDIDATE INFORMATION (ZOOM) MODAL */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-3xl bg-white dark:bg-[#0B1220] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarStyle(
                    selectedCandidate?.NAME
                  )}`}
                >
                  {getInitials(selectedCandidate?.NAME)}
                </span>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedCandidate?.NAME || "Candidate"}&apos;s Information
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Candidate SR #{selectedCandidate?.TRAN_ID} · Applied on{" "}
                    {selectedCandidate?.APPLICATION_DATE1
                      ? formatDate(selectedCandidate.APPLICATION_DATE1)
                      : "—"}
                  </DialogDescription>
                </div>
              </div>
              {selectedCandidate && renderStatusPill(selectedCandidate.INT_STATUS)}
            </div>
          </DialogHeader>

          {selectedCandidate && (
            <div className="space-y-5 pt-4 text-sm">
              {/* Personal Details */}
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Gender</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.GENDER || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Date of Birth</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.DOB ? formatDate(selectedCandidate.DOB) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Religion</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {religionMapping[selectedCandidate.RELIGION?.trim()] ||
                        selectedCandidate.RELIGION ||
                        "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Mobile No</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {selectedCandidate.MOB_NO || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">WhatsApp No</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {selectedCandidate.WHATSAPP_NO || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Email</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {selectedCandidate.EMAIL || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Aadhar Number</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {selectedCandidate.AADHAR_NO || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Location</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.LOC_CODE1 || "—"}
                    </span>
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                    <span className="text-slate-400 block font-medium">Address</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {selectedCandidate.ADDRESS || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Family & Professional Details */}
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Professional & Education Background
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Designation</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.DESIGNATION || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Highest Qualification</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.HIGH_QUAL || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Passing Percentage</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.PASSING_PER ? `${selectedCandidate.PASSING_PER}%` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Experience (Years)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.EXP_IN_YEAR || "0"} yrs
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Current CTC</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {selectedCandidate.CURRENT_CTC ? `₹${selectedCandidate.CURRENT_CTC}` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Father&apos;s Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedCandidate.FATHERS_NAME || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resume Document Viewer (if uploaded) */}
              {(() => {
                const images = selectedCandidate.IMAGES || [];
                const resumeDoc =
                  images.find((img: any) => img.SRNO == 2 && img.Doc_Type == "NCR") || null;
                const resumeUrl = resumeDoc?.path
                  ? `${process.env.NEXT_PUBLIC_imagepath}${resumeDoc.path}`
                  : null;

                if (!resumeUrl) return null;

                return (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/30">
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      Attached Resume / Curriculum Vitae
                    </span>
                    <FileViewer fileLink={resumeUrl} celldata="" Title="Candidate Resume" />
                  </div>
                );
              })()}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDialogOpen(false);
                    router.push(
                      `/payroll/recruitment-process/interview-scheduling?tran_id=${selectedCandidate.TRAN_ID}`
                    );
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
                >
                  Open in Interview Scheduling
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
