"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  Download,
  Eye,
  FileText,
  Gavel,
  GraduationCap,
  Image as ImageIcon,
  Languages as LanguagesIcon,
  Printer,
  RotateCcw,
  Sparkles,
  Upload,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import Ainput from "@/components/atoms/Einput";
import ReactTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import FileViewer from "@/components/atoms/FileviewerBank";
import Printout from "@/components/atoms/Printout";
import HindiPrintout from "@/components/atoms/HindiPrintout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Religion mapping
const religionMapping: Record<string, string> = {
  "1": "Hindu",
  "2": "Muslim",
  "3": "Sikh",
  "4": "Christian",
  "5": "Jain",
  "6": "Buddhist",
  "7": "Persians",
};

// Quick decision tags
const QUICK_DECISION_TAGS = [
  "Profile matches JD",
  "Experience too low",
  "CTC expectation high",
  "Location mismatch",
  "Better fit for other role",
];

// Avatar colors generator
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
];

const getInitials = (name?: string) => {
  if (!name) return "NA";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ResumeBankPage() {
  const router = useRouter();
  const user = useCurrentUser() as any;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"Profile" | "Documents" | "Languages" | "Experience">("Profile");
  const [statusFilter, setStatusFilter] = useState<"Unscreened" | "Selected" | "All">("Unscreened");

  // Filters State
  const [filterSkills, setFilterSkills] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [filterExp, setFilterExp] = useState("");
  const [filterCtc, setFilterCtc] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Rejection/Remarks Reason
  const [remarkReason, setRemarkReason] = useState("");

  // Dropdown options
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  const [expOptions, setExpOptions] = useState<string[]>([]);
  const [ctcOptions, setCtcOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  // Print state
  const [isEnglishPrintOpen, setIsEnglishPrintOpen] = useState<boolean>(false);
  const [isHindiPrintOpen, setIsHindiPrintOpen] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  // SweetAlert helper
  const showToast = (message: string, icon: "success" | "error" | "warning" | "info" = "success") => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  // Format date helper
  const formatDate = (val?: string) => {
    if (!val) return "Not provided";
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [day, month, year] = val.split("-");
      const d = new Date(`${year}-${month}-${day}`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
    return val;
  };

  // Extract company code safely
  const getCompCode = () => {
    return (
      user?.Comp_Code ||
      user?.compcode ||
      user?.comp_code ||
      user?.company_code ||
      user?.DB ||
      ""
    );
  };

  // Determine candidate status
  const getCandidateStatus = (item: any): "Unscreened" | "Selected" | "Rejected" => {
    if (item.REJECTED_BY || item.INT_STATUS === 3 || item.STATUS === "Rejected") return "Rejected";
    if (item.INT_STATUS === 2 || item.STATUS === "Shortlisted") return "Selected";
    return "Unscreened";
  };

  // Fetch candidates
  const fetchData = async () => {
    const compCode = getCompCode();
    if (!compCode) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/interviewcanidates`,
        {
          loc_code: user?.branch || user?.Primary_Branch || user?.branch_code || "",
          flag: 1
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );

      const resData: any[] = Array.isArray(response.data) ? response.data : [];
      const sorted = [...resData].sort((a, b) => (b.TRAN_ID || 0) - (a.TRAN_ID || 0));

      setAllData(sorted);

      // Extract unique filter options
      const skills = Array.from(new Set(sorted.map((i) => i.SKILLS).filter(Boolean))).sort();
      const designations = Array.from(new Set(sorted.map((i) => i.DESIGNATION).filter(Boolean))).sort();
      const exps = Array.from(
        new Set(sorted.map((i) => i.EXP_IN_YEAR).filter((v) => v !== null && v !== undefined && v !== ""))
      ).sort((a, b) => Number(a) - Number(b));
      const ctcs = Array.from(
        new Set(sorted.map((i) => i.CURRENT_CTC).filter((v) => v !== null && v !== undefined && v !== ""))
      ).sort((a, b) => Number(a) - Number(b));
      const locs = Array.from(new Set(sorted.map((i) => i.LOC_CODE1).filter(Boolean))).sort();

      setSkillsOptions(skills as string[]);
      setDesignationOptions(designations as string[]);
      setExpOptions(exps.map(String));
      setCtcOptions(ctcs.map(String));
      setLocationOptions(locs as string[]);

      // Select first candidate if none selected
      if (sorted.length > 0) {
        setSelectedCandidate(sorted[0]);
      } else {
        setSelectedCandidate(null);
      }
    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, user?.branch, user?.Comp_Code]);

  // Compute status counts
  const statusCounts = useMemo(() => {
    let unscreened = 0;
    let reviewed = 0;
    allData.forEach((item) => {
      const st = getCandidateStatus(item);
      if (st === "Unscreened") unscreened++;
      else reviewed++;
    });
    return {
      unscreened,
      reviewed,
      all: allData.length,
    };
  }, [allData]);

  // Apply filters & status filter
  const displayedCandidates = useMemo(() => {
    let list = [...allData];

    // Status filter pill
    if (statusFilter === "Unscreened") {
      list = list.filter((item) => getCandidateStatus(item) === "Unscreened");
    } else if (statusFilter === "Selected") {
      list = list.filter((item) => {
        const status = getCandidateStatus(item);
        return status === "Selected" || status === "Rejected";
      });
    }

    // Dropdown filters
    if (filterSkills) {
      list = list.filter((item) => item.SKILLS === filterSkills);
    }
    if (filterDesignation) {
      list = list.filter((item) => item.DESIGNATION === filterDesignation);
    }
    if (filterExp) {
      list = list.filter((item) => String(item.EXP_IN_YEAR) === String(filterExp));
    }
    if (filterCtc) {
      list = list.filter((item) => String(item.CURRENT_CTC) === String(filterCtc));
    }
    if (filterLocation) {
      list = list.filter((item) => item.LOC_CODE1 === filterLocation);
    }

    return list;
  }, [allData, statusFilter, filterSkills, filterDesignation, filterExp, filterCtc, filterLocation]);

  // Sync selectedCandidate when filtered list changes
  useEffect(() => {
    if (displayedCandidates.length > 0) {
      const exists = displayedCandidates.find((c) => c.TRAN_ID === selectedCandidate?.TRAN_ID);
      if (!exists) {
        setSelectedCandidate(displayedCandidates[0]);
      }
    } else {
      setSelectedCandidate(null);
    }
  }, [displayedCandidates]);

  // Reset filters
  const handleResetFilters = () => {
    setFilterSkills("");
    setFilterDesignation("");
    setFilterExp("");
    setFilterCtc("");
    setFilterLocation("");
  };

  // Shortlist action
  const handleApprove = async () => {
    if (!selectedCandidate?.TRAN_ID) {
      showToast("Please select a candidate to shortlist", "warning");
      return;
    }

    const compCode = getCompCode();
    if (!compCode) {
      showToast("Company code is missing", "error");
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/shortlistcandidate`,
        { tran_id: selectedCandidate.TRAN_ID },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      showToast("Candidate shortlisted successfully!", "success");
      setRemarkReason("");
      await fetchData();
    } catch (err: any) {
      console.error("Shortlist error:", err);
      showToast(err?.response?.data?.message || "Failed to shortlist candidate", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Reject action
  const handleReject = async () => {
    if (!selectedCandidate?.TRAN_ID) {
      showToast("Please select a candidate to reject", "warning");
      return;
    }
    if (!remarkReason.trim()) {
      showToast("Please enter a reason or remark for rejection", "warning");
      return;
    }

    const compCode = getCompCode();
    if (!compCode) {
      showToast("Company code is missing", "error");
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/rejectcanidates`,
        {
          tran_id: selectedCandidate.TRAN_ID,
          msg: remarkReason,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      showToast("Candidate rejected successfully.", "success");
      setRemarkReason("");
      await fetchData();
    } catch (err: any) {
      console.error("Reject error:", err);
      showToast(err?.response?.data?.message || "Failed to reject candidate", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate experience difference
  const calculateDateDiff = (from?: string, to?: string) => {
    if (!from || !to) return "—";
    const f = new Date(from);
    const t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return "—";

    let years = t.getFullYear() - f.getFullYear();
    let months = t.getMonth() - f.getMonth();
    let days = t.getDate() - f.getDate();

    if (days < 0) {
      months--;
      days += new Date(t.getFullYear(), t.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    const parts = [];
    if (years > 0) parts.push(`${years} yrs`);
    if (months > 0) parts.push(`${months} mos`);
    if (days > 0 && parts.length === 0) parts.push(`${days} days`);
    return parts.join(" ") || "0 days";
  };

  // Document Print Handler via iframe
  const handlePrintDocument = (elementId: string) => {
    const printElement = document.getElementById(elementId);
    if (!printElement) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const styleTags = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((tag) => tag.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedCandidate?.NAME ? `${selectedCandidate.NAME} - Printout` : "Candidate Printout"}</title>
          ${styleTags}
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            html, body {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }
            div, section, main, table {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            .custom-scrollbar {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }
            .break-after-page, .print\\:break-after-page {
              page-break-after: always !important;
              break-after: page !important;
            }
            ::-webkit-scrollbar {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 500);
  };

  // Render Status Badge
  const renderStatusBadge = (status: "Unscreened" | "Selected" | "Rejected") => {
    switch (status) {
      case "Unscreened":
        return (
          <span
            className="inline-flex items-center px-2 py-[3px] rounded-full text-[10.5px] font-bold whitespace-nowrap"
            style={{ color: "#F59E0B", backgroundColor: "rgba(245,158,11,0.14)" }}
          >
            Unscreened
          </span>
        );
      case "Selected":
        return (
          <span
            className="inline-flex items-center px-2 py-[3px] rounded-full text-[10.5px] font-bold whitespace-nowrap"
            style={{ color: "#10B981", backgroundColor: "rgba(16,185,129,0.14)" }}
          >
            Selected
          </span>
        );
      case "Rejected":
        return (
          <span
            className="inline-flex items-center px-2 py-[3px] rounded-full text-[10.5px] font-bold whitespace-nowrap"
            style={{ color: "#E11D48", backgroundColor: "rgba(225,29,72,0.14)" }}
          >
            Rejected
          </span>
        );
    }
  };

  // Documents helper
  const getDocPath = (srno: number) => {
    const img = selectedCandidate?.IMAGES?.find((i: any) => i.SRNO === srno);
    if (!img?.path) return "";
    return `${process.env.NEXT_PUBLIC_imagepath}${img.path}`;
  };

  // ReactTable Columns configuration
  const tableColumns = useMemo(
    () => [
      {
        Header: "Candidate",
        accessor: "NAME",
        Cell: ({ row }: any) => {
          const cand = row.original;
          const isSelected = selectedCandidate?.TRAN_ID === cand.TRAN_ID;
          const initials = getInitials(cand.NAME);
          const colorClass = AVATAR_COLORS[(cand.TRAN_ID || 0) % AVATAR_COLORS.length];

          return (
            <div
              className="flex items-center gap-[10px] py-1 select-none cursor-pointer"
              onClick={() => setSelectedCandidate(cand)}
            >
              <div
                className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-[10.5px] font-semibold shrink-0 shadow-2xs ${colorClass}`}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[12.5px] font-semibold truncate ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"
                    }`}
                >
                  {cand.NAME || "Unnamed"}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {cand.EMAIL || "No email"}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        Header: "Mobile No",
        accessor: "MOB_NO",
        Cell: ({ row, value }: any) => (
          <div
            className="text-[12.5px] tabular-nums text-slate-800 dark:text-slate-200 py-1 cursor-pointer truncate"
            onClick={() => setSelectedCandidate(row.original)}
          >
            {value || "—"}
          </div>
        ),
      },
      {
        Header: "Applied On",
        accessor: "APPLICATION_DATE1",
        Cell: ({ row, value }: any) => (
          <div
            className="text-[12.5px] text-slate-500 dark:text-slate-400 tabular-nums py-1 cursor-pointer truncate"
            onClick={() => setSelectedCandidate(row.original)}
          >
            {formatDate(value || row.original.APPLICATION_DATE)}
          </div>
        ),
      },
      {
        Header: "Exp.",
        accessor: "EXP_IN_YEAR",
        Cell: ({ row, value }: any) => (
          <div
            className="text-[12.5px] tabular-nums text-slate-800 dark:text-slate-200 py-1 cursor-pointer"
            onClick={() => setSelectedCandidate(row.original)}
          >
            {value !== null && value !== undefined ? `${value} yr` : "—"}
          </div>
        ),
      },
      {
        Header: "Designation",
        accessor: "DESIGNATION",
        Cell: ({ row, value }: any) => (
          <div
            className="text-[12.5px] text-slate-800 dark:text-slate-200 truncate max-w-[200px] py-1 cursor-pointer"
            onClick={() => setSelectedCandidate(row.original)}
          >
            {value || "—"}
          </div>
        ),
      },
      {
        Header: "Status",
        accessor: "STATUS",
        Cell: ({ row }: any) => {
          const status = getCandidateStatus(row.original);
          return (
            <div
              className="py-1 flex sm:justify-end cursor-pointer"
              onClick={() => setSelectedCandidate(row.original)}
            >
              {renderStatusBadge(status)}
            </div>
          );
        },
      },
    ],
    [selectedCandidate]
  );

  const languageColumns = useMemo(
    () => [
      {
        Header: "Language",
        accessor: "Emp_Language",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[12.5px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Und.",
        accessor: "Emp_Language_Understand",
        Cell: ({ value }: any) => {
          const isYes = value === "Y" || value === 1 || value === "Yes" || value === true;
          const isNo = value === "N" || value === 0 || value === "No" || value === false;
          if (isYes) return <div className="text-center text-[11.5px] font-semibold text-[#10B981]">Yes</div>;
          if (isNo) return <div className="text-center text-[11.5px] font-semibold text-[#E11D48]">No</div>;
          return <div className="text-center text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{value || "—"}</div>;
        },
      },
      {
        Header: "Speak",
        accessor: "Emp_Language_Speak",
        Cell: ({ value }: any) => {
          const isYes = value === "Y" || value === 1 || value === "Yes" || value === true;
          const isNo = value === "N" || value === 0 || value === "No" || value === false;
          if (isYes) return <div className="text-center text-[11.5px] font-semibold text-[#10B981]">Yes</div>;
          if (isNo) return <div className="text-center text-[11.5px] font-semibold text-[#E11D48]">No</div>;
          return <div className="text-center text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{value || "—"}</div>;
        },
      },
      {
        Header: "Read",
        accessor: "Emp_Language_Read",
        Cell: ({ value }: any) => {
          const isYes = value === "Y" || value === 1 || value === "Yes" || value === true;
          const isNo = value === "N" || value === 0 || value === "No" || value === false;
          if (isYes) return <div className="text-center text-[11.5px] font-semibold text-[#10B981]">Yes</div>;
          if (isNo) return <div className="text-center text-[11.5px] font-semibold text-[#E11D48]">No</div>;
          return <div className="text-center text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{value || "—"}</div>;
        },
      },
      {
        Header: "Write",
        accessor: "Emp_Language_Write",
        Cell: ({ value }: any) => {
          const isYes = value === "Y" || value === 1 || value === "Yes" || value === true;
          const isNo = value === "N" || value === 0 || value === "No" || value === false;
          if (isYes) return <div className="text-center text-[11.5px] font-semibold text-[#10B981]">Yes</div>;
          if (isNo) return <div className="text-center text-[11.5px] font-semibold text-[#E11D48]">No</div>;
          return <div className="text-center text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{value || "—"}</div>;
        },
      },
    ],
    []
  );

  const experienceColumns = useMemo(
    () => [
      {
        Header: "Company",
        accessor: "Emp_Company",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[12.5px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Designation",
        accessor: "Emp_Designation",
        Cell: ({ value }: any) => (
          <div className="text-[12.5px] text-slate-600 dark:text-slate-300">
            {value || "—"}
          </div>
        ),
      },
      {
        Header: "Duration",
        accessor: "Emp_From_Date",
        Cell: ({ row }: any) => {
          const exp = row.original;
          return (
            <span className="text-[12.5px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {calculateDateDiff(exp.Emp_From_Date, exp.Emp_To_Date)}
            </span>
          );
        },
      },
      {
        Header: "Salary",
        accessor: "Emp_Drawn_Salary",
        Cell: ({ value }: any) => (
          <div className="font-semibold text-slate-800 dark:text-slate-200 text-[12.5px] tabular-nums">
            {value ? `₹${Number(value).toFixed(2)}` : "—"}
          </div>
        ),
      },
      {
        Header: "Leaving Reason",
        accessor: "Emp_Leaving_Reason",
        Cell: ({ value }: any) => (
          <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
            {value || "—"}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#070D18] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & STATUS FILTER PILLS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white break-words">
            Resume bank
          </h1>
          <p className="text-sm sm:text-base lg:text-xl text-slate-500 dark:text-slate-400 font-normal mt-1">
            Screen one dossier at a time.{" "}
            <strong className="text-slate-500 dark:text-white font-normal">
             <span className="font-semibold text-black">{statusCounts.unscreened}</span>  resumes still unscreened.
            </strong>
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="w-full lg:w-auto overflow-x-auto scrollbar-none py-1 min-w-0">
          <div className="inline-flex items-center gap-[3px] p-[3px] bg-slate-100/90 dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 min-w-max">
            <AButton
              type="button"
              onClick={() => setStatusFilter("Unscreened")}
              className={`!h-auto !py-[7px] !px-[13px] !rounded-[8px] !text-[12px] !font-semibold gap-[7px] shrink-0 whitespace-nowrap cursor-pointer transition-colors !shadow-none !border-none ${statusFilter === "Unscreened"
                ? "!bg-[#4F46E5] !text-white"
                : "!bg-transparent hover:!bg-slate-200/60 dark:hover:!bg-slate-800/60 !text-slate-500 dark:!text-slate-400 hover:!text-slate-700 dark:hover:!text-slate-200"
                }`}
            >
              <span className="whitespace-nowrap shrink-0">Unscreened</span>
              <span className="opacity-75 tabular-nums text-[12px]">
                {statusCounts.unscreened}
              </span>
            </AButton>

            <AButton
              type="button"
              onClick={() => setStatusFilter("Selected")}
              className={`!h-auto !py-[7px] !px-[13px] !rounded-[8px] !text-[12px] !font-semibold gap-[7px] shrink-0 whitespace-nowrap cursor-pointer transition-colors !shadow-none !border-none ${statusFilter === "Selected"
                ? "!bg-[#4F46E5] !text-white"
                : "!bg-transparent hover:!bg-slate-200/60 dark:hover:!bg-slate-800/60 !text-slate-500 dark:!text-slate-400 hover:!text-slate-700 dark:hover:!text-slate-200"
                }`}
            >
              <span className="whitespace-nowrap shrink-0">Reviewed</span>
              <span className="opacity-75 tabular-nums text-[12px]">
                {statusCounts.reviewed}
              </span>
            </AButton>

            <AButton
              type="button"
              onClick={() => setStatusFilter("All")}
              className={`!h-auto !py-[7px] !px-[13px] !rounded-[8px] !text-[12px] !font-semibold gap-[7px] shrink-0 whitespace-nowrap cursor-pointer transition-colors !shadow-none !border-none ${statusFilter === "All"
                ? "!bg-[#4F46E5] !text-white"
                : "!bg-transparent hover:!bg-slate-200/60 dark:hover:!bg-slate-800/60 !text-slate-500 dark:!text-slate-400 hover:!text-slate-700 dark:hover:!text-slate-200"
                }`}
            >
              <span className="whitespace-nowrap shrink-0">All</span>
              <span className="opacity-75 tabular-nums text-[12px]">
                {statusCounts.all}
              </span>
            </AButton>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. FILTER BAR CARD USING Eselect & AButton */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 md:p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B1220] overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
          {/* Skills */}
          <div>
            <Eselect
              title="Skills"
              name="Skills"
              option={skillsOptions.map((sk) => ({ label: sk, value: sk }))}
              initialValue={filterSkills}
              handleInputChange={(name, val) => setFilterSkills(val || "")}
            />
          </div>

          {/* Designation */}
          <div>
            <Eselect
              title="Designation"
              name="Designation"
              option={designationOptions.map((des) => ({ label: des, value: des }))}
              initialValue={filterDesignation}
              handleInputChange={(name, val) => setFilterDesignation(val || "")}
            />
          </div>

          {/* Experience */}
          <div>
            <Eselect
              title="Experience (Years)"
              name="EXP_IN_YEAR"
              option={expOptions.map((exp) => ({
                label: `${exp} ${Number(exp) === 1 ? "yr" : "yrs"}`,
                value: exp,
              }))}
              initialValue={filterExp}
              handleInputChange={(name, val) => setFilterExp(val || "")}
            />
          </div>

          {/* Current CTC */}
          <div>
            <Eselect
              title="Current CTC"
              name="CURRENT_CTC"
              option={ctcOptions.map((ctc) => ({ label: ctc, value: ctc }))}
              initialValue={filterCtc}
              handleInputChange={(name, val) => setFilterCtc(val || "")}
            />
          </div>

          {/* Location */}
          <div>
            <Eselect
              title="Location"
              name="LOC_CODE1"
              option={locationOptions.map((loc) => ({ label: loc, value: loc }))}
              initialValue={filterLocation}
              handleInputChange={(name, val) => setFilterLocation(val || "")}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pb-0.5">
            <AButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => { }}
              className="text-base sm:text-md font-bold shadow-xs cursor-pointer w-30 h-30"
            >
              Show
            </AButton>
            <AButton
              variant="outline"
              size="lg"
              onClick={handleResetFilters}
              className="text-base sm:text-xl font-semibold cursor-pointer"
            >
              Reset
            </AButton>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. MAIN 2-COLUMN DOSSIER LAYOUT (ReactTable on Left, Dossier on Right) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start min-w-0">
        {/* ── LEFT COLUMN: CANDIDATES LIST TABLE USING ReactTable ───────────────── */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4 min-w-0">
          <div className="rounded-2xl bg-white dark:bg-[#0B1220] shadow-xs overflow-hidden min-w-0">
            <div className="w-full overflow-x-auto">
              <ReactTable
                columns={tableColumns}
                data={displayedCandidates}
                height={560}
                selectValue="TRAN_ID"
                onRowDoubleClick={(row) => setSelectedCandidate(row)}
                showExcelExport={true}
                showTopSearch={true}
                showPageSizeInFooter={true}
                searchPlaceholder="Search candidate by name, email, designation..."
                headerClassName="!text-[10.5px] !font-bold !tracking-[0.05em] !text-slate-500 dark:!text-slate-400 uppercase"
              />
            </div>
          </div>

          {/* Table Footer with Upload Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-[#0B1220] text-base sm:text-xl text-slate-600 dark:text-slate-300 font-semibold shadow-xs">
            <span>
              Showing{" "}
              <strong className="text-slate-900 dark:text-white font-bold">
                {displayedCandidates.length}
              </strong>{" "}
              of {allData.length} resumes
            </span>

            <AButton
              variant="outline"
              size="sm"
              onClick={() => router.push("/payroll/recruitment-process/candidate-registration-form")}
              icon={<Upload className="h-4 w-4" />}
              className="text-base sm:text-xl font-bold cursor-pointer"
            >
              Bulk upload
            </AButton>
          </div>
        </div>

        {/* ── RIGHT COLUMN: CANDIDATE DOSSIER & SCREENING ──────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4 sm:space-y-6 min-w-0">
          {selectedCandidate ? (
            <>
              {/* Dossier Card */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0B1220] overflow-hidden">
                {/* Header info */}
                <div className="p-4 sm:px-[18px] sm:py-[17px] border-b border-slate-200 dark:border-slate-800 flex items-start gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-[14px] font-semibold shadow-2xs ${AVATAR_COLORS[(selectedCandidate.TRAN_ID || 0) % AVATAR_COLORS.length]
                      }`}
                  >
                    {getInitials(selectedCandidate.NAME)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-[-0.01em] truncate">
                      {selectedCandidate.NAME || "Candidate Dossier"}
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {selectedCandidate.DESIGNATION || "No Designation"} ·{" "}
                      {selectedCandidate.LOC_CODE1 || "Location"}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {renderStatusBadge(getCandidateStatus(selectedCandidate))}
                  </div>
                </div>

                {/* 3 Overview Stats Box */}
                <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                  <div className="px-3.5 py-3 text-left min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.03em] text-slate-500 dark:text-slate-400 truncate">
                      Experience
                    </div>
                    <div className="text-[14px] font-semibold text-slate-900 dark:text-white mt-1 tabular-nums truncate">
                      {selectedCandidate.EXP_IN_YEAR !== null && selectedCandidate.EXP_IN_YEAR !== undefined
                        ? `${selectedCandidate.EXP_IN_YEAR} yrs`
                        : "0 yrs"}
                    </div>
                  </div>

                  <div className="px-3.5 py-3 text-left min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.03em] text-slate-500 dark:text-slate-400 truncate">
                      Qualification
                    </div>
                    <div className="text-[14px] font-semibold text-slate-900 dark:text-white mt-1 tabular-nums truncate">
                      {selectedCandidate.HIGH_QUAL || "10th"}{" "}
                      {selectedCandidate.PASSING_PER ? `· ${selectedCandidate.PASSING_PER}%` : ""}
                    </div>
                  </div>

                  <div className="px-3.5 py-3 text-left min-w-0">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.03em] text-slate-500 dark:text-slate-400 truncate">
                      Current CTC
                    </div>
                    <div className="text-[14px] font-semibold text-slate-900 dark:text-white mt-1 tabular-nums truncate">
                      {selectedCandidate.CURRENT_CTC ? Number(selectedCandidate.CURRENT_CTC).toFixed(2) : "0.00"}
                    </div>
                  </div>
                </div>

                {/* Tabs bar */}
                <div className="flex gap-1 px-3.5 pt-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none min-w-0">
                  {(["Profile", "Documents", "Languages", "Experience"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-2 text-[12.5px] font-semibold transition cursor-pointer relative whitespace-nowrap shrink-0 border-b-2 ${activeTab === tab
                          ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-[18px] max-h-[360px] overflow-y-auto custom-scrollbar">
                  {/* TAB 1: PROFILE */}
                  {activeTab === "Profile" && (
                    <div className="flex flex-col gap-2">
                      {[
                        {
                          label: "Application date",
                          value: formatDate(
                            selectedCandidate.APPLICATION_DATE1 || selectedCandidate.APPLICATION_DATE
                          ),
                        },
                        {
                          label: "Mobile / WhatsApp",
                          value:
                            selectedCandidate.MOB_NO ||
                            selectedCandidate.WHATSAPP_NO ||
                            "Not provided",
                        },
                        {
                          label: "Email",
                          value: selectedCandidate.EMAIL || "Not provided",
                        },
                        {
                          label: "Date of birth",
                          value: formatDate(selectedCandidate.DOB1 || selectedCandidate.DOB),
                        },
                        {
                          label: "City",
                          value:
                            selectedCandidate.CITY1 || selectedCandidate.CITY || "Not provided",
                        },
                        {
                          label: "State",
                          value: selectedCandidate.STATE1 || "Not provided",
                        },
                        {
                          label: "Location",
                          value: selectedCandidate.LOC_CODE1 || "Not provided",
                        },
                        {
                          label: "Key skills",
                          value: selectedCandidate.SKILLS || "Not provided",
                        },
                        {
                          label: "Father's name",
                          value: selectedCandidate.FATHERS_NAME || "Not provided",
                        },
                        {
                          label: "Mother's name",
                          value: selectedCandidate.MOTHERS_NAME || "Not provided",
                        },
                        {
                          label: "Expected CTC",
                          value: selectedCandidate.EXPECTED_CTC
                            ? Number(selectedCandidate.EXPECTED_CTC).toFixed(2)
                            : "Not provided",
                        },
                        {
                          label: "Religion",
                          value:
                            religionMapping[selectedCandidate.RELIGION?.trim()] ||
                            selectedCandidate.RELIGION1 ||
                            "Not provided",
                        },
                        {
                          label: "Address",
                          value: selectedCandidate.ADDRESS || "Not provided",
                        },
                      ].map((p, idx) => (
                        <div key={idx} className="flex gap-2.5 items-baseline text-[12.5px]">
                          <span className="w-[120px] shrink-0 text-slate-500 dark:text-slate-400 font-normal">
                            {p.label}
                          </span>
                          <span className="flex-1 min-w-0 font-medium text-slate-800 dark:text-slate-200 break-words">
                            {p.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 2: DOCUMENTS */}
                  {activeTab === "Documents" && (
                    <div className="flex flex-col gap-2.5 min-w-0">
                      {[
                        { title: "Profile image", srno: 1, type: "image" },
                        { title: "Updated CV (PDF)", srno: 2, type: "pdf" },
                        { title: "Aadhar card", srno: 3, type: "image" },
                        { title: "PAN card", srno: 4, type: "image" },
                        { title: "Salary slip", srno: 5, type: "pdf" },
                        { title: "Experience letter (PDF)", srno: 6, type: "pdf" },
                      ].map((doc) => {
                        const fileLink = getDocPath(doc.srno);
                        return (
                          <div
                            key={doc.srno}
                            className="flex items-center gap-3 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:px-3.5 sm:py-3 bg-white dark:bg-slate-900/40"
                          >
                            <span className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                              {doc.type === "image" ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </span>
                            <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {doc.title}
                            </span>
                            {fileLink ? (
                              <div className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                <FileViewer fileLink={fileLink} celldata="View" Title={doc.title} />
                              </div>
                            ) : (
                              <span className="text-xs sm:text-sm font-medium text-slate-400">
                                Missing
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB 3: LANGUAGES */}
                  {activeTab === "Languages" && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="w-full overflow-x-auto">
                        <ReactTable
                          columns={languageColumns}
                          data={selectedCandidate?.EmpLang || []}
                          showExcelExport={false}
                          showTopSearch={false}
                          showPageSizeInFooter={false}
                          headerClassName="!text-[10.5px] !font-bold !tracking-[0.05em] !text-slate-500 dark:!text-slate-400 uppercase !px-3 !py-2"
                          height="auto"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: EXPERIENCE */}
                  {activeTab === "Experience" && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="w-full overflow-x-auto">
                        <ReactTable
                          columns={experienceColumns}
                          data={selectedCandidate?.EmpExperience || []}
                          showExcelExport={false}
                          showTopSearch={false}
                          showPageSizeInFooter={false}
                          headerClassName="!text-[10.5px] !font-bold !tracking-[0.05em] !text-slate-500 dark:!text-slate-400 uppercase !px-3 !py-2"
                          height="auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────── */}
              {/* Screening Decision Card */}
              {/* ──────────────────────────────────────────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-[15px_18px_17px_18px] shadow-xs dark:border-slate-800 dark:bg-[#0B1220]">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-[11px]">
                  <div className="flex items-center gap-[9px]">
                    <span className="w-[26px] h-[26px] rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0">
                      <Gavel className="w-3.5 h-3.5" />
                    </span>
                    <h2 className="m-0 text-[14px] font-semibold text-slate-900 dark:text-white leading-none">
                      Screening decision
                    </h2>
                  </div>
                  <div>
                    {renderStatusBadge(getCandidateStatus(selectedCandidate))}
                  </div>
                </div>

                {/* Show remark tags, textarea, and Shortlist/Reject buttons for Unscreened and Selected candidates */}
                {(getCandidateStatus(selectedCandidate) === "Unscreened" ||
                  getCandidateStatus(selectedCandidate) === "Selected") && (
                    <>
                      {/* Quick decision tags */}
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {QUICK_DECISION_TAGS.map((tag) => {
                          const isSelected = remarkReason === tag;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setRemarkReason(tag)}
                              className={`px-2.5 py-1 rounded-full text-[11.5px] border cursor-pointer whitespace-nowrap transition-colors ${isSelected
                                  ? "bg-indigo-50/70 border-indigo-400/80 text-indigo-600 font-semibold dark:bg-indigo-950/40 dark:border-indigo-600 dark:text-indigo-300"
                                  : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>

                      {/* Textarea */}
                      <textarea
                        rows={3}
                        value={remarkReason}
                        onChange={(e) => setRemarkReason(e.target.value)}
                        placeholder="Reason / remark for the decision…"
                        className="w-full min-h-[74px] p-[10px_11px] rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-[12.5px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 placeholder:text-[12.5px] focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 resize-y font-normal"
                      />

                      {/* Shortlist & Reject Buttons */}
                      <div className="flex gap-2 mt-3">
                        <AButton
                          variant="primary"
                          size="sm"
                          onClick={handleApprove}
                          icon={<UserCheck className="h-4 w-4" />}
                          className="!bg-[#10B981] hover:!bg-[#059669] !text-white !font-semibold !text-[12.5px] !py-2.5 !px-3 !h-auto !rounded-[9px] !shadow-none flex-1 justify-center cursor-pointer transition-all"
                        >
                          Shortlist
                        </AButton>

                        <AButton
                          variant="outline"
                          size="sm"
                          onClick={handleReject}
                          icon={<UserX className="h-4 w-4 !text-[#E11D48]" />}
                          className="!border-[rgba(225,29,72,0.4)] !bg-transparent hover:!bg-[#E11D48]/10 !text-[#E11D48] dark:hover:!bg-rose-950/20 !font-semibold !text-[12.5px] !py-2.5 !px-3 !h-auto !rounded-[9px] flex-1 justify-center cursor-pointer transition-all"
                        >
                          Reject
                        </AButton>
                      </div>
                    </>
                  )}

                {/* Print Buttons Grid with AButton */}
                <div className="flex gap-2 mt-2">
                  <AButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!selectedCandidate) {
                        showToast("Please select a candidate first", "warning");
                        return;
                      }
                      setIsEnglishPrintOpen(true);
                    }}
                    icon={<Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />}
                    className="!border-slate-200 dark:!border-slate-700 !bg-transparent hover:!bg-slate-50 dark:hover:!bg-slate-800 !text-slate-700 dark:!text-slate-200 !font-medium !text-[12px] !py-2 !px-2.5 !h-auto !rounded-[9px] flex-1 justify-center cursor-pointer transition-all"
                  >
                    English print
                  </AButton>

                  <AButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!selectedCandidate) {
                        showToast("Please select a candidate first", "warning");
                        return;
                      }
                      setIsHindiPrintOpen(true);
                    }}
                    icon={<Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />}
                    className="!border-slate-200 dark:!border-slate-700 !bg-transparent hover:!bg-slate-50 dark:hover:!bg-slate-800 !text-slate-700 dark:!text-slate-200 !font-medium !text-[12px] !py-2 !px-2.5 !h-auto !rounded-[9px] flex-1 justify-center cursor-pointer transition-all"
                  >
                    Hindi print
                  </AButton>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-14 text-center shadow-xs dark:border-slate-800 dark:bg-[#0B1220] text-slate-400">
              <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-base sm:text-xl font-bold">Select a candidate to view dossier</p>
            </div>
          )}
        </div>
      </div>

      {/* English Printout Modal */}
      <Dialog open={isEnglishPrintOpen} onOpenChange={setIsEnglishPrintOpen}>
        <DialogContent className="w-full max-w-5xl h-[92vh] max-h-[92vh] p-4 bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 pr-8 shrink-0">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                English Printout — {selectedCandidate?.NAME || "Candidate"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                SR: {selectedCandidate?.TRAN_ID || "—"} · Role: {selectedCandidate?.DESIGNATION || "—"}
              </DialogDescription>
            </div>
            <AButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handlePrintDocument("english-print-content-area")}
              icon={<Printer className="h-4 w-4" />}
            >
              Print
            </AButton>
          </DialogHeader>

          <div
            id="english-print-content-area"
            className="flex-1 min-h-0 w-full overflow-y-auto bg-slate-100 dark:bg-slate-950 p-1 sm:p-2 rounded-xl flex flex-col"
          >
            <Printout formData1={selectedCandidate} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Hindi Printout Modal */}
      <Dialog open={isHindiPrintOpen} onOpenChange={setIsHindiPrintOpen}>
        <DialogContent className="w-full max-w-5xl h-[92vh] max-h-[92vh] p-4 bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 pr-8 shrink-0">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                हिंदी प्रिंटआउट — {selectedCandidate?.NAME || "उम्मीदवार"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                फॉर्म संख्या: {selectedCandidate?.TRAN_ID || "—"} · पद: {selectedCandidate?.DESIGNATION || "—"}
              </DialogDescription>
            </div>
            <AButton
              type="button"
              size="sm"
              onClick={() => handlePrintDocument("hindi-print-content-area")}
              icon={<Printer className="h-4 w-4" />}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              Print
            </AButton>
          </DialogHeader>

          <div
            id="hindi-print-content-area"
            className="flex-1 min-h-0 w-full overflow-y-auto bg-slate-100 dark:bg-slate-950 p-1 sm:p-2 rounded-xl flex flex-col"
          >
            <HindiPrintout formData1={selectedCandidate} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
