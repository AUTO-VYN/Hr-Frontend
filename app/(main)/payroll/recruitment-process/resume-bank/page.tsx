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

  // Print ref
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
          flag:1
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

  // Print helper
  const handlePrint = () => {
    if (!selectedCandidate) return;
    window.print();
  };

  // Render Status Badge
  const renderStatusBadge = (status: "Unscreened" | "Selected" | "Rejected") => {
    switch (status) {
      case "Unscreened":
        return (
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-[14px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800">
            Unscreened
          </span>
        );
      case "Selected":
        return (
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-[14px] font-semibold bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">
            Selected
          </span>
        );
        return (
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-[14px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
            Shortlisted
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs sm:text-[14px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
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
              className="flex items-center gap-3.5 py-1.5 select-none cursor-pointer"
              onClick={() => setSelectedCandidate(cand)}
            >
              <div
                className={`h-11 w-11 rounded-full flex items-center justify-center text-base font-semibold shrink-0 shadow-2xs ${colorClass}`}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-xl font-semibold truncate ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"
                    }`}
                >
                  {cand.NAME || "Unnamed"}
                </div>
                <div className="text-base text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
            className="text-xl font-medium text-slate-800 dark:text-slate-200 py-1.5 cursor-pointer"
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
            className="text-xl font-medium text-slate-700 dark:text-slate-300 py-1.5 cursor-pointer"
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
            className="text-xl font-medium text-slate-800 dark:text-slate-200 py-1.5 cursor-pointer"
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
            className="text-xl font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px] py-1.5 cursor-pointer"
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
              className="py-1.5 flex justify-end cursor-pointer"
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
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xl">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Understand",
        accessor: "Emp_Language_Understand",
        Cell: ({ value }: any) => <div className="text-center text-xl">{value || "—"}</div>,
      },
      {
        Header: "Speak",
        accessor: "Emp_Language_Speak",
        Cell: ({ value }: any) => <div className="text-center text-xl">{value || "—"}</div>,
      },
      {
        Header: "Read",
        accessor: "Emp_Language_Read",
        Cell: ({ value }: any) => <div className="text-center text-xl">{value || "—"}</div>,
      },
      {
        Header: "Write",
        accessor: "Emp_Language_Write",
        Cell: ({ value }: any) => <div className="text-center text-xl">{value || "—"}</div>,
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
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xl">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Designation",
        accessor: "Emp_Designation",
        Cell: ({ value }: any) => <div className="text-xl">{value || "—"}</div>,
      },
      {
        Header: "Duration",
        accessor: "Emp_From_Date",
        Cell: ({ row }: any) => {
          const exp = row.original;
          return (
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {calculateDateDiff(exp.Emp_From_Date, exp.Emp_To_Date)}
            </span>
          );
        },
      },
      {
        Header: "Salary",
        accessor: "Emp_Drawn_Salary",
        Cell: ({ value }: any) => (
          <div className="font-bold text-slate-900 dark:text-slate-100 text-xl">
            {value ? `₹${Number(value).toFixed(2)}` : "—"}
          </div>
        ),
      },
      {
        Header: "Leaving Reason",
        accessor: "Emp_Leaving_Reason",
        Cell: ({ value }: any) => (
          <div className="text-xl text-slate-600 dark:text-slate-400">
            {value || "—"}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#070D18] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & STATUS FILTER PILLS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resume bank
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium mt-1">
            Screen one dossier at a time.{" "}
            <strong className="text-yellow-600 dark:text-yellow-400 font-bold">
              {statusCounts.unscreened} resumes still unscreened.
            </strong>
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("Unscreened")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xl font-bold transition cursor-pointer ${statusFilter === "Unscreened"
              ? "bg-[#f59e0b] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
          >
            <span>Unscreened</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-sm font-black ${statusFilter === "Unscreened"
                ? "bg-white/25 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
            >
              {statusCounts.unscreened}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("Selected")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xl font-bold transition cursor-pointer ${statusFilter === "Selected"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
          >
            <span>Reviewed</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-sm font-black ${statusFilter === "Selected"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
            >
              {statusCounts.reviewed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("All")}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xl font-bold transition cursor-pointer ${statusFilter === "All"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
          >
            <span>All</span>
            <span
              className={`px-2 py-0.5 rounded-lg text-sm font-black ${statusFilter === "All"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
            >
              {statusCounts.all}
            </span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. FILTER BAR CARD USING Eselect & AButton */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B1220]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
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
          <div className="flex items-center gap-2 pb-0.5">
            <AButton
              variant="primary"
              size="md"
              fullWidth
              onClick={() => { }}
              className="text-xl font-bold shadow-xs cursor-pointer"
            >
              Show
            </AButton>
            <AButton
              variant="outline"
              size="md"
              onClick={handleResetFilters}
              className="text-xl font-semibold cursor-pointer"
            >
              Reset
            </AButton>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. MAIN 2-COLUMN DOSSIER LAYOUT (ReactTable on Left, Dossier on Right) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: CANDIDATES LIST TABLE USING ReactTable ───────────────── */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0B1220] shadow-xs overflow-hidden">
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
            />
          </div>

          {/* Table Footer with Upload Button */}
          <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-[#0B1220] text-xl text-slate-600 dark:text-slate-300 font-semibold shadow-xs">
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
              className="text-xl font-bold cursor-pointer"
            >
              Bulk upload
            </AButton>
          </div>
        </div>

        {/* ── RIGHT COLUMN: CANDIDATE DOSSIER & SCREENING ──────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          {selectedCandidate ? (
            <>
              {/* Dossier Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0B1220] space-y-6">
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 flex items-center justify-center text-xl font-bold shrink-0 shadow-2xs">
                      {getInitials(selectedCandidate.NAME)}
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                        {selectedCandidate.NAME || "Candidate Dossier"}
                      </h3>
                      <p className="text-xl text-slate-500 dark:text-slate-400 font-medium mt-1">
                        {selectedCandidate.DESIGNATION || "No Designation"} ·{" "}
                        {selectedCandidate.LOC_CODE1 || "Location"}
                      </p>
                    </div>
                  </div>

                  <div>
                    {renderStatusBadge(getCandidateStatus(selectedCandidate))}
                  </div>
                </div>

                {/* 3 Overview Stats Box */}
                <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-slate-800 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 p-4 border border-slate-200/80 dark:border-slate-800">
                  <div className="px-2 text-left">
                    <div className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Experience
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedCandidate.EXP_IN_YEAR !== null && selectedCandidate.EXP_IN_YEAR !== undefined
                        ? `${selectedCandidate.EXP_IN_YEAR} yrs`
                        : "0 yrs"}
                    </div>
                  </div>

                  <div className="px-3 text-left">
                    <div className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Qualification
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {selectedCandidate.HIGH_QUAL || "10th"}{" "}
                      {selectedCandidate.PASSING_PER ? `· ${selectedCandidate.PASSING_PER}%` : ""}
                    </div>
                  </div>

                  <div className="px-3 text-left">
                    <div className="text-xs sm:text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Current CTC
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedCandidate.CURRENT_CTC ? Number(selectedCandidate.CURRENT_CTC).toFixed(2) : "0.00"}
                    </div>
                  </div>
                </div>

                {/* Tabs bar */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                  {(["Profile", "Documents", "Languages", "Experience"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`pb-3 text-xl font-semibold transition cursor-pointer relative ${activeTab === tab
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                        }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div>
                  {/* TAB 1: PROFILE */}
                  {activeTab === "Profile" && (
                    <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60 text-xl">
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Application date</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {formatDate(selectedCandidate.APPLICATION_DATE1 || selectedCandidate.APPLICATION_DATE)}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Mobile / WhatsApp</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.MOB_NO || selectedCandidate.WHATSAPP_NO || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Email</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-[260px]">
                          {selectedCandidate.EMAIL || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Date of birth</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {formatDate(selectedCandidate.DOB1 || selectedCandidate.DOB)}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">City</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.CITY1 || selectedCandidate.CITY || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">State</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.STATE1 || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Location</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.LOC_CODE1 || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Key skills</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.SKILLS || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Father's name</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.FATHERS_NAME || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Mother's name</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.MOTHERS_NAME || "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Expected CTC</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {selectedCandidate.EXPECTED_CTC
                            ? Number(selectedCandidate.EXPECTED_CTC).toFixed(2)
                            : "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Religion</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {religionMapping[selectedCandidate.RELIGION?.trim()] ||
                            selectedCandidate.RELIGION1 ||
                            "Not provided"}
                        </span>
                      </div>

                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-normal">Address</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium text-right max-w-[260px]">
                          {selectedCandidate.ADDRESS || "Not provided"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DOCUMENTS */}
                  {activeTab === "Documents" && (
                    <div className="space-y-3.5">
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
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                {doc.type === "image" ? (
                                  <ImageIcon className="h-5 w-5" />
                                ) : (
                                  <FileText className="h-5 w-5" />
                                )}
                              </div>
                              <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                {doc.title}
                              </span>
                            </div>

                            {fileLink ? (
                              <FileViewer fileLink={fileLink} celldata="View" Title={doc.title} />
                            ) : (
                              <span className="text-base sm:text-lg text-slate-400 font-medium">Not uploaded</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB 3: LANGUAGES */}
                  {activeTab === "Languages" && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <ReactTable
                        columns={languageColumns}
                        data={selectedCandidate?.EmpLang || []}
                        showExcelExport={false}
                        showTopSearch={false}
                        showPageSizeInFooter={false}
                        height="auto"
                      />
                    </div>
                  )}

                  {/* TAB 4: EXPERIENCE */}
                  {activeTab === "Experience" && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <ReactTable
                        columns={experienceColumns}
                        data={selectedCandidate?.EmpExperience || []}
                        showExcelExport={false}
                        showTopSearch={false}
                        showPageSizeInFooter={false}
                        height="auto"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────── */}
              {/* Screening Decision Card */}
              {/* ──────────────────────────────────────────────────────── */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0B1220] space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Gavel className="h-5 w-5" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      Screening decision
                    </h4>
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
                    <div className="flex flex-wrap gap-2.5">
                      {QUICK_DECISION_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setRemarkReason(tag)}
                          className={`px-4 py-2 rounded-xl text-lg sm:text-xl font-semibold transition cursor-pointer border ${remarkReason === tag
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300"
                            }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    {/* Textarea */}
                    <textarea
                      rows={3}
                      value={remarkReason}
                      onChange={(e) => setRemarkReason(e.target.value)}
                      placeholder="Reason / remark for the decision..."
                      className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none font-medium"
                    />

                    {/* Shortlist & Reject Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <AButton
                        variant="primary"
                        size="lg"
                        onClick={handleApprove}
                        icon={<UserCheck className="h-5 w-5" />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl cursor-pointer py-3"
                      >
                        Shortlist
                      </AButton>

                      <AButton
                        variant="outline"
                        size="lg"
                        onClick={handleReject}
                        icon={<UserX className="h-5 w-5 text-rose-600" />}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30 font-bold text-xl cursor-pointer py-3"
                      >
                        Reject
                      </AButton>
                    </div>
                  </>
                )}

                {/* Print Buttons Grid with AButton */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <AButton
                    variant="outline"
                    size="md"
                    onClick={handlePrint}
                    icon={<Printer className="h-4 w-4" />}
                    className="text-xl font-bold cursor-pointer"
                  >
                    English print
                  </AButton>

                  <AButton
                    variant="outline"
                    size="md"
                    onClick={handlePrint}
                    icon={<Printer className="h-4 w-4" />}
                    className="text-xl font-bold cursor-pointer"
                  >
                    Hindi print
                  </AButton>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-14 text-center shadow-xs dark:border-slate-800 dark:bg-[#0B1220] text-slate-400">
              <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-xl font-bold">Select a candidate to view dossier</p>
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. PRINTABLE TEMPLATE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="hidden print:block text-black p-6 space-y-6" ref={printRef}>
        <div className="border-b-2 border-black pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">Candidate Dossier</h1>
            <p className="text-sm text-gray-600">Autovyn HR & Recruitment System</p>
          </div>
          <div className="text-right text-xs">
            <div>Ref SR: {selectedCandidate?.TRAN_ID}</div>
            <div>Date: {formatDate(selectedCandidate?.APPLICATION_DATE1 || selectedCandidate?.APPLICATION_DATE)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Name:</strong> {selectedCandidate?.NAME}</div>
          <div><strong>Designation:</strong> {selectedCandidate?.DESIGNATION}</div>
          <div><strong>Mobile:</strong> {selectedCandidate?.MOB_NO}</div>
          <div><strong>Email:</strong> {selectedCandidate?.EMAIL}</div>
          <div><strong>DOB:</strong> {formatDate(selectedCandidate?.DOB1 || selectedCandidate?.DOB)}</div>
          <div><strong>Gender:</strong> {selectedCandidate?.GENDER}</div>
          <div><strong>City / State:</strong> {selectedCandidate?.CITY1}, {selectedCandidate?.STATE1}</div>
          <div><strong>Location:</strong> {selectedCandidate?.LOC_CODE1}</div>
          <div><strong>Experience:</strong> {selectedCandidate?.EXP_IN_YEAR} Years</div>
          <div><strong>Qualification:</strong> {selectedCandidate?.HIGH_QUAL} ({selectedCandidate?.PASSING_PER}%)</div>
          <div><strong>Current CTC:</strong> ₹{selectedCandidate?.CURRENT_CTC}</div>
          <div><strong>Expected CTC:</strong> ₹{selectedCandidate?.EXPECTED_CTC || "—"}</div>
          <div><strong>Father's Name:</strong> {selectedCandidate?.FATHERS_NAME}</div>
          <div><strong>Mother's Name:</strong> {selectedCandidate?.MOTHERS_NAME}</div>
          <div className="col-span-2"><strong>Address:</strong> {selectedCandidate?.ADDRESS}</div>
        </div>
      </div>

      {/* Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
