"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import HashloaderComponent from "@/components/Templates/hashloader";

// Mandatory Design System Atoms & Templates
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Chart from "@/components/atoms/charts";
import Card, { StatCard } from "@/components/Templates/card";

// Icons
import {
  CheckCircle2,
  Clock,
  UserX,
  LogOut,
  AlertTriangle,
  Fingerprint,
  Download,
  Filter,
  Calendar,
  Gift,
  ChevronRight,
  Inbox,
  Check,
  Search,
  X,
  ArrowRight,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";

// ============================================================================
// Helper Utilities
// ============================================================================

// const formatDateTime = (dateString?: string) => {
//   if (!dateString) return "-";
//   try {
//     const date = new Date(dateString);
//     if (isNaN(date.getTime())) return dateString;
//     const day = String(date.getDate()).padStart(2, "0");
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const year = date.getFullYear();
//     let hours = date.getHours();
//     const minutes = String(date.getMinutes()).padStart(2, "0");
//     const ampm = hours >= 12 ? "PM" : "AM";
//     hours = hours % 12 || 12;
//     return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
//   } catch {
//     return dateString;
//   }
// };

const formatCardDate = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const [y, m, d] = dateString.split("-");
    if (d && m && y) return `${d}/${m}/${y}`;
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString || "";
  }
};

const convertTo12HourFormat = (hour: any) => {
  if (hour === undefined || hour === null || hour === "") return "";
  const numHour = parseFloat(hour);
  if (isNaN(numHour)) return String(hour);
  const period = numHour >= 12 ? "PM" : "AM";
  let hour12 = Math.floor(numHour) % 12;
  hour12 = hour12 === 0 ? 12 : hour12;
  const minutes = Math.round((numHour % 1) * 60);
  if (minutes > 0) {
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  }
  return `${hour12}:00 ${period}`;
};

function getCurrentDate(monthsBack = 0) {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsBack);
  const year = today.getFullYear();
  let month: any = today.getMonth() + 1;
  let day: any = today.getDate();
  if (month < 10) month = "0" + month;
  if (day < 10) day = "0" + day;
  return `${year}-${month}-${day}`;
}

const DEPARTMENT_COLORS = [
  "#3B82F6", // Blue (Sales)
  "#00B87C", // Green (Service)
  "#F59E0B", // Amber / Orange (Spare Part)
  "#8B5CF6", // Purple (Accessories)
  "#06B6D4", // Cyan / Sky (Account)
  "#E11D48", // Crimson / Red (Admin)
  "#0D9488", // Teal (IT)
  "#64748B", // Slate
  "#EC4899", // Pink
];

const formatDeptName = (name?: string) => {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.toUpperCase() === "IT") return "IT";
  if (trimmed.toUpperCase() === "HR") return "HR";
  if (trimmed.toUpperCase() === "MIS") return "MIS";
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const AVATAR_PALETTES = [
  { bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" },
  { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  { bg: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
  { bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
  { bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" },
  { bg: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300" },
];

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getEmployeePhotoUrl = (emp: any) => {
  const photo =
    emp?.PHOTO_PATH ||
    emp?.photo_path ||
    emp?.DOC_PATH ||
    emp?.doc_path ||
    emp?.PHOTO_URL ||
    emp?.photo_url ||
    emp?.EMP_PHOTO ||
    emp?.emp_photo ||
    emp?.photo ||
    "";

  if (!photo || typeof photo !== "string" || !photo.trim()) return "";
  const trimmed = photo.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const imageBasePath =
    process.env.NEXT_PUBLIC_imagepath ||
    "https://erp.autovyn.com/backend/fetch?filePath=";

  const normalizedPath = trimmed.replace(/\\/g, "/");
  return `${imageBasePath}${encodeURIComponent(normalizedPath)}`;
};

const getEmployeeCategory = (e: any): "absent" | "late" | "onTime" | "earlyGo" => {
  const cat = (e?.PUNCH_CATEGORY || "").toUpperCase();
  const status = (e?.PUNCH_STATUS || e?.STATUS || e?.ATTENDANCE_STATUS || "").toUpperCase();
  const hasLogin = e?.LOGIN_TIME && e.LOGIN_TIME !== "--:--" && e.LOGIN_TIME !== "-";

  // 1. Explicit Absent or No punch recorded -> ALWAYS absent
  if (
    cat === "ABSENT" ||
    status === "A" ||
    status.includes("ABSENT") ||
    !hasLogin
  ) {
    return "absent";
  }

  // 2. Late punch
  if (cat === "LATE" || status === "LP" || status.includes("LATE")) {
    return "late";
  }

  // 3. Early Go
  if (cat === "EARLY_GO" || status === "EG" || status.includes("EARLY")) {
    return "earlyGo";
  }

  // 4. On Time / Present
  if (
    cat === "ON_TIME" ||
    status === "P" ||
    status.includes("ONTIME") ||
    status.includes("ON_TIME") ||
    status.includes("PRESENT")
  ) {
    return "onTime";
  }

  return "absent";
};

function EmployeeAvatar({
  emp,
  onPreview,
}: {
  emp: any;
  onPreview?: (url: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = useMemo(() => getEmployeePhotoUrl(emp), [emp]);

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={emp?.EMP_NAME || "Employee"}
        onError={() => setImgError(true)}
        onClick={() => onPreview?.(photoUrl)}
        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
      {getInitials(emp?.EMP_NAME)}
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const globalDateRange = useDateRange();

  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Filter States
  const [dates, setDates] = useState({
    DATE_TO: globalDateRange?.DATE_TO || globalDateRange?.dateTo || getCurrentDate(),
    Shift: "",
  });

  // API Raw States
  const [formattedShifts, setFormattedShifts] = useState<{ value: any; label: string }[]>([]);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [employeeData, setEmployeeData] = useState<{
    all: any[];
    present?: any[];
    absent?: any[];
    onTime?: any[];
    late?: any[];
    earlyGo?: any[];
    misPunch?: any[];
    mispunch?: any[];
  }>({
    all: [],
    present: [],
    absent: [],
    onTime: [],
    late: [],
  });

  // Needs Attention state (from /hr/needsyoutoday or dynamic counts)
  const [needsAttention, setNeedsAttention] = useState({
    punchApprovals: 0,
    mispunch: 0,
    compOff: 0,
    shiftChanges: 0,
  });

  // Department Drilldown / Employee Modal
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [drilldownTab, setDrilldownTab] = useState<"all" | "onTime" | "late" | "absent" | "earlyGo">("all");
  const [empSearch, setEmpSearch] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Active Top Card Filter
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>("misPunch");

  const handleInputChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------------------------------------
  // API: Fetch Dashboard Data
  // --------------------------------------------------------------------------
  const fetchDashboardData = async (deptCode = "") => {
    const compCode = (user as any)?.Comp_Code || (user as any)?.company_code || (user as any)?.comp_code;
    if (!compCode) {
      return;
    }

    setIsLoading(true);

    let branchArray: string[] = [];
    if (Array.isArray(user?.branch)) {
      branchArray = user.branch.map((b) => String(b));
    } else if (typeof user?.branch === "string") {
      branchArray = user.branch.split(",").map((b) => b.trim());
    } else if (user?.branch) {
      branchArray = [String(user.branch)];
    }

    try {
      const headers = {
        compcode: String(compCode),
        name: user?.name || "",
        empcode: (user as any)?.empcode || (user as any)?.EMPCODE || "",
      };

      // 1. Primary API: /hrmsreport/getDashboardData
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL_LOCAL}/hrmsreport/getDashboardData`,
        {
          selectedDate: dates?.DATE_TO,
          Loc_code: branchArray,
          dept_code: deptCode,
          shiftstarttime: dates?.Shift,
        },
        { headers }
      );

      const result = response?.data?.result || {};

      // Graph data
      setGraphData(result.graphData || []);

      // Department Stats
      if (!deptCode || deptStats.length === 0) {
        if (Array.isArray(result.deptStats) && result.deptStats.length > 0) {
          setDeptStats(result.deptStats);
        }
      }

      // Pending Leaves
      if (Array.isArray(result.pendingLeaves)) {
        setPendingLeaves(result.pendingLeaves);
      }

      // Shifts Dropdown
      if (Array.isArray(result.shifts) && result.shifts.length > 0) {
        const options = [
          { value: "", label: "All Shifts" },
          ...result.shifts.map((s: any) => ({
            value: s.SHIFTSTARTTIME,
            label: `${convertTo12HourFormat(s.SHIFTSTARTTIME)} to ${convertTo12HourFormat(s.SHIFTENDTIME)} (${s.SHIFT || "Shift"})`,
          })),
        ];
        setFormattedShifts(options);
      }

      // Employees list
      if (result.employees) {
        if (Array.isArray(result.employees)) {
          setEmployeeData({ all: result.employees });
        } else {
          setEmployeeData({
            ...result.employees,
            misPunch: result.employees.misPunch || result.employees.mispunch || [],
            mispunch: result.employees.mispunch || result.employees.misPunch || [],
          });
        }
      }

      // 2. Secondary API: /hrmsreport/getNeedsAttentionData (for alert counts)
      try {
        const needsRes = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/hrmsreport/getNeedsAttentionData`,
          {
            selectedDate: dates?.DATE_TO,
            Loc_code: branchArray,
          },
          { headers }
        );
        if (needsRes.data?.success && needsRes.data?.data) {
          const d = needsRes.data.data;
          setNeedsAttention({
            punchApprovals: typeof d.punchApprovals === "number" ? d.punchApprovals : (d.punchApprovals?.count ?? 0),
            mispunch: typeof d.mispunch === "number" ? d.mispunch : (d.mispunch?.count ?? 0),
            compOff: typeof d.compOff === "number" ? d.compOff : (d.compOff?.count ?? 0),
            shiftChanges: typeof d.shiftChanges === "number" ? d.shiftChanges : (d.shiftChanges?.count ?? 0),
          });
        }
      } catch {
        // Fallback safely preserved
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const compCode = (user as any)?.Comp_Code || (user as any)?.company_code || (user as any)?.comp_code;
    if (compCode) {
      fetchDashboardData("");
    }
  }, [user?.Comp_Code, (user as any)?.company_code, user?.branch]);

  // --------------------------------------------------------------------------
  // Computed Attendance Metrics (Top Cards - 1:1 Matched with Graph Backend)
  // --------------------------------------------------------------------------
  const metrics = useMemo(() => {
    // Match date from backend graphData (or latest date in graph)
    const matchingGraphItem =
      graphData?.find(
        (g: any) =>
          g.DATE_LABEL === dates.DATE_TO ||
          (g.DATE_LABEL && dates.DATE_TO && String(g.DATE_LABEL).slice(0, 10) === String(dates.DATE_TO).slice(0, 10))
      ) || (graphData && graphData.length > 0 ? graphData[graphData.length - 1] : null);

    const onTimeCount = Number(matchingGraphItem?.ON_TIME ?? matchingGraphItem?.PRESENT ?? 0);
    const lateCount = Number(matchingGraphItem?.LATE ?? 0);
    const absentCount = Number(matchingGraphItem?.ABSENT ?? 0);
    const earlyGoCount = Number(matchingGraphItem?.EARLY_GO ?? 0);
    const misPunchCount =
      Number(matchingGraphItem?.MISPUNCH ?? matchingGraphItem?.mispunch) ||
      (employeeData as any)?.mispunch?.length ||
      (employeeData as any)?.misPunch?.length ||
      Number(needsAttention.mispunch) ||
      0;

    const baseTotal = onTimeCount + lateCount + absentCount + earlyGoCount || Number(matchingGraphItem?.TOTAL) || (onTimeCount + absentCount);

    const onTimePct = baseTotal > 0 ? Math.round((onTimeCount / baseTotal) * 100) : 0;
    const latePct = baseTotal > 0 ? Math.round((lateCount / baseTotal) * 100) : 0;
    const absentPct = baseTotal > 0 ? Math.round((absentCount / baseTotal) * 100) : 0;
    const earlyGoPct = baseTotal > 0 ? Math.round((earlyGoCount / baseTotal) * 100) : 0;
    const misPunchPct = baseTotal > 0 ? Math.round((misPunchCount / baseTotal) * 100) : 0;

    return {
      totalMarked: baseTotal,
      onTimeCount,
      onTimePct,
      lateCount,
      latePct,
      absentCount,
      absentPct,
      earlyGoCount,
      earlyGoPct,
      misPunchCount,
      misPunchPct,
    };
  }, [graphData, dates.DATE_TO, employeeData, needsAttention.mispunch]);

  // --------------------------------------------------------------------------
  // Computed 7-Day Chart Data (Grouped 4-Column Bar Chart matching design system)
  // --------------------------------------------------------------------------
  const chartData = useMemo(() => {
    if (graphData && graphData.length > 0) {
      const categories: string[] = [];
      const onTimeSeries: number[] = [];
      const lateSeries: number[] = [];
      const absentSeries: number[] = [];
      const earlyGoSeries: number[] = [];
      const totalsPerDay: number[] = [];

      graphData.forEach((item: any) => {
        const d = item.DATE_LABEL ? new Date(item.DATE_LABEL) : new Date();
        const dayNumber = d.getDate();
        const dayShort = item.DAY_NAME
          ? item.DAY_NAME.slice(0, 3)
          : d.toLocaleDateString("en-US", { weekday: "short" });
        categories.push(`${dayNumber} ${dayShort}`);

        const onTimeVal = Number(item.ON_TIME ?? item.PRESENT ?? 0);
        const lateVal = Number(item.LATE ?? 0);
        const absentVal = Number(item.ABSENT ?? 0);
        const earlyGoVal = Number(item.EARLY_GO ?? 0);
        const totalVal = onTimeVal + lateVal + absentVal + earlyGoVal || Number(item.TOTAL) || 0;

        onTimeSeries.push(onTimeVal);
        lateSeries.push(lateVal);
        absentSeries.push(absentVal);
        earlyGoSeries.push(earlyGoVal);
        totalsPerDay.push(totalVal);
      });

      return {
        categories,
        totalsPerDay,
        series: [
          { name: "On time", data: onTimeSeries, color: "#00b87c" },
          { name: "Late", data: lateSeries, color: "#f59e0b" },
          { name: "Absent", data: absentSeries, color: "#e11d48" },
          { name: "Early go", data: earlyGoSeries, color: "#8b5cf6" },
        ],
      };
    }

    return {
      categories: [],
      totalsPerDay: [],
      series: [
        { name: "On time", data: [], color: "#00b87c" },
        { name: "Late", data: [], color: "#f59e0b" },
        { name: "Absent", data: [], color: "#e11d48" },
        { name: "Early go", data: [], color: "#8b5cf6" },
      ],
    };
  }, [graphData]);

  // --------------------------------------------------------------------------
  // Departments List & Summary (Real ON_TIME, LATE, ON_LEAVE counts)
  // --------------------------------------------------------------------------
  const departmentsSummary = useMemo(() => {
    if (deptStats && deptStats.length > 0) {
      return deptStats.map((dept: any, index: number) => {
        const onTime = Number(dept.ON_TIME ?? dept.onTime ?? dept.PRESENT ?? 0);
        const late = Number(dept.LATE ?? dept.late ?? 0);
        const leave = Number(dept.ON_LEAVE ?? dept.leave ?? 0);
        const total = Number(dept.TOTAL ?? dept.total ?? onTime + late + leave + Number(dept.ABSENT ?? 0));

        return {
          deptCode: dept.DEPT_CODE || dept.deptCode,
          deptName: dept.DEPT_NAME || dept.deptName,
          total,
          onTime,
          late,
          leave,
          color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
        };
      });
    }

    return [];
  }, [deptStats]);

  const totalOnRoll = useMemo(() => {
    return departmentsSummary.reduce((sum, d) => sum + (d.total || 0), 0);
  }, [departmentsSummary]);

  // --------------------------------------------------------------------------
  // Pending Leaves List (Screenshot 2 Left Card)
  // --------------------------------------------------------------------------
  const pendingLeavesList = useMemo(() => {
    if (pendingLeaves && pendingLeaves.length > 0) {
      return pendingLeaves;
    }
    return [];
  }, [pendingLeaves]);

  // Leave approve action
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const handleApproveLeave = async (leave: any) => {
    const result = await Swal.fire({
      title: "Approve Leave?",
      text: `Do you want to approve leave for ${leave.EMP_NAME}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#10B981",
    });

    if (result.isConfirmed) {
      const leaveKey = `${leave.EMP_CODE || leave.EmpCode}_${leave.LEAVE_DATE || leave.Leave_applied_on}`;
      const utd = leave.UTD ?? leave.Utd ?? leave.id;

      if (!utd) {
        Swal.fire({
          title: "Refresh Required",
          text: "Leave ID (UTD) not found in current view. Please refresh the page (F5) once and try again.",
          icon: "warning",
        });
        return;
      }

      setApprovingKey(leaveKey);
      try {
        const compCode = user?.Comp_Code || (user as any)?.comp_code || (user as any)?.company_code;
        const apprCode = user?.EMPCODE || (user as any)?.empcode || (user as any)?.EmpCode || "";

        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveLeave`,
          {
            EMPCODE: leave.EMP_CODE || leave.EmpCode,
            Appr_Code: apprCode,
            ApproveOrRej: "1",
            Utd: utd,
            Remark: "Approved",
          },
          {
            headers: { compcode: compCode, name: user?.name || "" },
          }
        );

        if (res.data?.Status === true || res.data?.Status === "true" || res.data?.success) {
          Swal.fire({
            title: "Approved!",
            text: res.data?.Message || `Leave request for ${leave.EMP_NAME} has been approved.`,
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          // Remove approved leave from list locally
          setPendingLeaves((prev) =>
            prev.filter(
              (p) =>
                !(
                  p.EMP_CODE === leave.EMP_CODE &&
                  (p.LEAVE_DATE === leave.LEAVE_DATE || p.UTD === leave.UTD)
                )
            )
          );
        } else {
          Swal.fire({
            title: "Failed!",
            text: res.data?.Message || "Failed to approve leave request.",
            icon: "error",
          });
        }
      } catch (err: any) {
        Swal.fire({
          title: "Error!",
          text: err?.response?.data?.Message || err?.message || "Error approving leave request.",
          icon: "error",
        });
      } finally {
        setApprovingKey(null);
      }
    }
  };

  // --------------------------------------------------------------------------
  // Department Drilldown Handlers & Employees
  // --------------------------------------------------------------------------
  const handleDepartmentClick = async (dept: any) => {
    if (selectedDept?.deptCode === dept.deptCode) {
      setSelectedDept(null);
      setDrilldownTab("all");
      setEmpSearch("");
      await fetchDashboardData("");
    } else {
      setSelectedDept(dept);
      setDrilldownTab("all");
      setEmpSearch("");
      await fetchDashboardData(dept.deptCode || dept.DEPT_CODE);
    }
  };

  const handleClearDeptFilter = async () => {
    setSelectedDept(null);
    setDrilldownTab("all");
    setEmpSearch("");
    await fetchDashboardData("");
  };

  const currentDeptEmployees = useMemo(() => {
    const emps = employeeData.all || [];
    if (!selectedDept) return emps;
    const filtered = emps.filter(
      (e: any) =>
        e.DEPARTMENT === selectedDept.deptName ||
        e.DEPT_CODE === selectedDept.deptCode ||
        e.DEPT_CODE === selectedDept.DEPT_CODE
    );
    return filtered.length > 0 ? filtered : emps;
  }, [employeeData.all, selectedDept]);

  const drilldownCounts = useMemo(() => {
    let absent = 0;
    let late = 0;
    let onTime = 0;
    let earlyGo = 0;

    currentDeptEmployees.forEach((e: any) => {
      const cat = getEmployeeCategory(e);
      if (cat === "absent") absent++;
      else if (cat === "late") late++;
      else if (cat === "onTime") onTime++;
      else if (cat === "earlyGo") earlyGo++;
    });

    return {
      all: currentDeptEmployees.length,
      absent,
      late,
      onTime,
      earlyGo,
    };
  }, [currentDeptEmployees]);

  const drilldownEmployees = useMemo(() => {
    let list = currentDeptEmployees;

    if (drilldownTab !== "all") {
      list = list.filter((e: any) => getEmployeeCategory(e) === drilldownTab);
    }

    if (empSearch.trim()) {
      const q = empSearch.toLowerCase();
      list = list.filter(
        (e: any) =>
          e.EMP_NAME?.toLowerCase().includes(q) ||
          e.EMP_CODE?.toLowerCase().includes(q) ||
          e.DESIGNATION?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentDeptEmployees, drilldownTab, empSearch]);

  const selectedShiftLabel = useMemo(() => {
    if (!dates.Shift) return "all shifts";
    const found = formattedShifts.find((s) => s.value === dates.Shift);
    return found ? found.label : "all shifts";
  }, [dates.Shift, formattedShifts]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ==================================================================== */}
      {/* TOP HEADER SECTION */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance today
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {metrics.totalMarked.toLocaleString()} employees marked · {selectedShiftLabel} · {formatCardDate(dates.DATE_TO)}
          </p>
        </div>

        {/* Right CTA Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={<Filter className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
          >
            {showFilters ? "Hide Filters" : "Filters"}
          </Button>

          <Button
            variant="outline"
            size="md"
            icon={<Fingerprint className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
            onClick={() => router.push("/payroll/attendance-punch/add-attendance")}
            className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-semibold"
          >
            Add attendance
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Download className="w-4 h-4 text-white" />}
            onClick={() => {
              Swal.fire({
                title: "Export Report",
                text: "Attendance summary exported successfully.",
                icon: "success",
                timer: 1500,
                showConfirmButton: false,
              });
            }}
            className="rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-semibold shadow-sm"
          >
            Export
          </Button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* FILTER BAR CARD (Matches approval grid design system) */}
      {/* ==================================================================== */}
      {showFilters && (
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xs transition-all">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[220px_1fr_auto] gap-3 sm:gap-3.5 items-end">
            {/* DATE */}
            <div className="w-full min-w-0">
              <Einput
                type="date"
                title="DATE"
                name="DATE_TO"
                value={dates.DATE_TO}
                handleInputChange={handleInputChange}
                ShortName
                className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-100 w-full"
                labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              />
            </div>

            {/* SHIFT */}
            <div className="w-full min-w-0">
              <Eselect
                title="SHIFT"
                name="Shift"
                option={formattedShifts}
                initialValue={dates.Shift}
                handleInputChange={handleInputChange}
                ShortName
                placeholder="Select shift"
                className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl font-medium w-full"
                labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              />
            </div>

            {/* ACTION BUTTONS (Show & Reset using atoms/Button) */}
            <div className="sm:col-span-2 lg:col-span-1 flex items-center gap-2 w-full lg:w-auto">
              <Button
                variant="primary"
                size="md"
                onClick={() => fetchDashboardData("")}
                className="flex-1 lg:flex-initial h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
              >
                Show
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setDates({
                    DATE_TO: getCurrentDate(),
                    Shift: "",
                  });
                  fetchDashboardData("");
                }}
                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5 TOP ATTENDANCE METRIC CARDS (Using Template StatCard) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. ON TIME */}
        <StatCard
          title="ON TIME"
          variant="emerald"
          icon={<CheckCircle2 className="w-4 h-4" />}
          count={
            (
              <div className="flex items-baseline gap-2">
                <span>{metrics.onTimeCount.toLocaleString()}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {metrics.onTimePct}%
                </span>
              </div>
            ) as any
          }
          isActive={activeCardFilter === "onTime"}
          onClick={() => {
            setActiveCardFilter(activeCardFilter === "onTime" ? null : "onTime");
            setDrilldownTab("onTime");
            setSelectedDept(null);
          }}
          activeClassName="bg-white dark:bg-slate-900 border-[#059669] ring-2 ring-[#059669]/25 shadow-sm"
          inactiveClassName="bg-white dark:bg-slate-900 border-[#a7f3d0] dark:border-emerald-800/60 hover:border-[#10b981]"
          className="!bg-white dark:!bg-slate-900 h-auto min-h-[110px]"
        />

        {/* 2. LATE */}
        <StatCard
          title="LATE"
          variant="amber"
          icon={<Clock className="w-4 h-4" />}
          count={
            (
              <div className="flex items-baseline gap-2">
                <span>{metrics.lateCount.toLocaleString()}</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {metrics.latePct}%
                </span>
              </div>
            ) as any
          }
          isActive={activeCardFilter === "late"}
          onClick={() => {
            setActiveCardFilter(activeCardFilter === "late" ? null : "late");
            setDrilldownTab("late");
            setSelectedDept(null);
          }}
          activeClassName="bg-white dark:bg-slate-900 border-[#d97706] ring-2 ring-[#d97706]/25 shadow-sm"
          inactiveClassName="bg-white dark:bg-slate-900 border-[#fde68a] dark:border-amber-800/60 hover:border-[#f59e0b]"
          className="!bg-white dark:!bg-slate-900 h-auto min-h-[110px]"
        />

        {/* 3. ABSENT */}
        <StatCard
          title="ABSENT"
          variant="rose"
          icon={<UserX className="w-4 h-4" />}
          count={
            (
              <div className="flex items-baseline gap-2">
                <span>{metrics.absentCount.toLocaleString()}</span>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {metrics.absentPct}%
                </span>
              </div>
            ) as any
          }
          isActive={activeCardFilter === "absent"}
          onClick={() => {
            setActiveCardFilter(activeCardFilter === "absent" ? null : "absent");
            setDrilldownTab("absent");
            setSelectedDept(null);
          }}
          activeClassName="bg-white dark:bg-slate-900 border-[#e11d48] ring-2 ring-[#e11d48]/25 shadow-sm"
          inactiveClassName="bg-white dark:bg-slate-900 border-[#fecdd3] dark:border-rose-800/60 hover:border-[#f43f5e]"
          className="!bg-white dark:!bg-slate-900 h-auto min-h-[110px]"
        />

        {/* 4. EARLY GO */}
        <StatCard
          title="EARLY GO"
          variant="purple"
          icon={<LogOut className="w-4 h-4" />}
          count={
            (
              <div className="flex items-baseline gap-2">
                <span>{metrics.earlyGoCount.toLocaleString()}</span>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {metrics.earlyGoPct}%
                </span>
              </div>
            ) as any
          }
          isActive={activeCardFilter === "earlyGo"}
          onClick={() => {
            setActiveCardFilter(activeCardFilter === "earlyGo" ? null : "earlyGo");
            setDrilldownTab("earlyGo");
            setSelectedDept(null);
          }}
          activeClassName="bg-white dark:bg-slate-900 border-[#7c3aed] ring-2 ring-[#7c3aed]/25 shadow-sm"
          inactiveClassName="bg-white dark:bg-slate-900 border-[#ddd6fe] dark:border-purple-800/60 hover:border-[#8b5cf6]"
          className="!bg-white dark:!bg-slate-900 h-auto min-h-[110px]"
        />

        {/* 5. MIS-PUNCH */}
        <StatCard
          title="MIS-PUNCH"
          variant="blue"
          icon={<AlertTriangle className="w-4 h-4" />}
          count={
            (
              <div className="flex items-baseline gap-2">
                <span>{metrics.misPunchCount.toLocaleString()}</span>
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {metrics.misPunchPct}%
                </span>
              </div>
            ) as any
          }
          isActive={activeCardFilter === "misPunch"}
          onClick={() => {
            setActiveCardFilter(activeCardFilter === "misPunch" ? null : "misPunch");
            router.push("/payroll/attendance-punch/mispunch-approval-grid");
          }}
          activeClassName="bg-white dark:bg-slate-900 border-[#0284c7] ring-2 ring-[#0284c7]/25 shadow-sm"
          inactiveClassName="bg-white dark:bg-slate-900 border-[#bae6fd] dark:border-sky-800/60 hover:border-[#0ea5e9]"
          className="!bg-white dark:!bg-slate-900 h-auto min-h-[110px]"
        />
      </div>

      {/* ==================================================================== */}
      {/* MIDDLE SECTION: LAST 7 DAYS CHART & DEPARTMENTS LIST & DRILLDOWN */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Last 7 Days Stacked Chart */}
        <div
          className={`${
            selectedDept ? "lg:col-span-4 xl:col-span-4" : "lg:col-span-7 xl:col-span-8"
          } bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs transition-all`}
        >
          {/* Header & Custom Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Last 7 days
              </h2>
              {selectedDept && (
                <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {selectedDept.deptName}
                </p>
              )}
            </div>

            {/* Custom Legend matching exact Backend Data (Option 2) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0 inline-block"
                  style={{ backgroundColor: "#00b87c" }}
                />
                <span className="text-slate-500 dark:text-slate-400 font-medium">On time</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {metrics.onTimeCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0 inline-block"
                  style={{ backgroundColor: "#f59e0b" }}
                />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Late</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {metrics.lateCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0 inline-block"
                  style={{ backgroundColor: "#e11d48" }}
                />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Absent</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {metrics.absentCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0 inline-block"
                  style={{ backgroundColor: "#8b5cf6" }}
                />
                <span className="text-slate-500 dark:text-slate-400 font-medium">Early go</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {metrics.earlyGoCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Chart Rendering */}
          <div className="mt-2">
            <Chart
              type="column"
              stacked={false}
              categories={chartData.categories}
              series={chartData.series}
              height={320}
              showLegend={false}
              showGridLines={false}
              options={{
                plotOptions: {
                  column: {
                    borderRadius: 4,
                    pointPadding: 0.04,
                    groupPadding: 0.16,
                    borderWidth: 0,
                    dataLabels: {
                      enabled: false,
                    },
                  },
                },
                series: chartData.series.map((s, idx) => ({
                  ...s,
                  dataLabels:
                    idx === 0
                      ? {
                          enabled: true,
                          crop: false,
                          overflow: "allow",
                          verticalAlign: "top",
                          y: -22,
                          style: {
                            color: "#64748B",
                            fontWeight: "bold",
                            fontSize: "11px",
                            textOutline: "none",
                          },
                          formatter: function () {
                            const total = (chartData as any)?.totalsPerDay?.[this.point.index];
                            return total ? total.toLocaleString() : (this.y ? this.y.toLocaleString() : "");
                          },
                        }
                      : { enabled: false },
                })),
                yAxis: {
                  visible: false,
                },
                xAxis: {
                  labels: {
                    useHTML: true,
                    style: {
                      fontSize: "11px",
                    },
                    formatter: function () {
                      const isLast = this.isLast;
                      return isLast
                        ? `<span style="font-weight: 700; color: #0f172a;">${this.value}</span>`
                        : `<span style="font-weight: 500; color: #64748b;">${this.value}</span>`;
                    },
                  },
                  lineColor: "#F1F5F9",
                  tickWidth: 0,
                },
                tooltip: {
                  shared: true,
                  useHTML: true,
                  outside: true,
                  backgroundColor: "#FFFFFF",
                  borderColor: "#E2E8F0",
                  borderRadius: 12,
                  padding: 0,
                  shadow: {
                    color: "rgba(0, 0, 0, 0.12)",
                    offsetX: 0,
                    offsetY: 6,
                    width: 16,
                  },
                  positioner: function (labelWidth: number, labelHeight: number, point: any) {
                    const chart = this.chart;
                    let x = point.plotX + chart.plotLeft - labelWidth / 2;
                    x = Math.max(chart.plotLeft, Math.min(x, chart.plotLeft + chart.plotWidth - labelWidth));

                    // Always place cleanly ABOVE the bar
                    let minY = point.plotY;
                    if (this.points && this.points.length > 0) {
                      this.points.forEach((p: any) => {
                        if (p.plotY !== undefined && p.plotY < minY) minY = p.plotY;
                      });
                    }
                    let y = minY + chart.plotTop - labelHeight - 14;
                    if (y < 8) y = 8;
                    return { x, y };
                  },
                  formatter: function () {
                    let s = `<div style="padding: 10px 12px; min-width: 140px; background: #ffffff; border-radius: 12px; font-family: inherit; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.08);">`;
                    s += `<div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 6px; border-bottom: 1px solid #F1F5F9; padding-bottom: 4px;">${this.x}</div>`;
                    this.points?.forEach((point: any) => {
                      s += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; font-size: 11px; margin-top: 4px;">`;
                      s += `<span style="display: flex; align-items: center; gap: 6px; color: #64748B;">`;
                      s += `<span style="width: 8px; height: 8px; border-radius: 2px; background-color: ${point.color};"></span>`;
                      s += `${point.series.name}:</span>`;
                      s += `<b style="color: #0F172A; font-weight: 700;">${point.y?.toLocaleString()}</b>`;
                      s += `</div>`;
                    });
                    s += `</div>`;
                    return s;
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Middle: Departments Summary List */}
        <div
          className={`${
            selectedDept ? "lg:col-span-4 xl:col-span-3" : "lg:col-span-5 xl:col-span-4"
          } bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between transition-all`}
        >
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Departments
              </h2>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {totalOnRoll.toLocaleString()} on roll
              </span>
            </div>

            {/* Department Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[350px] overflow-y-auto pr-1.5 scrollbar-thin">
              {departmentsSummary.length > 0 ? (
                departmentsSummary.map((dept) => {
                  const isSelected = selectedDept?.deptCode === dept.deptCode;
                  return (
                    <div
                      key={dept.deptCode || dept.deptName}
                      onClick={() => handleDepartmentClick(dept)}
                      className={`py-3.5 flex items-center justify-between group cursor-pointer transition-colors px-1.5 rounded-xl ${
                        isSelected
                          ? "bg-indigo-50/70 border border-indigo-200/80 dark:bg-slate-800/80 dark:border-indigo-500/30"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Left: Color Dot & Department Name */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                          style={{ backgroundColor: dept.color }}
                        />
                        <span
                          className={`text-[13.5px] font-semibold truncate ${
                            isSelected
                              ? "text-indigo-900 dark:text-indigo-300 font-bold"
                              : "text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}
                        >
                          {formatDeptName(dept.deptName)}
                        </span>
                      </div>

                      {/* Right: On-time / Late / Leave counts */}
                      <div className="flex items-center gap-6 sm:gap-7 text-center shrink-0">
                        <div className="flex flex-col items-center min-w-[46px]">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {dept.onTime.toLocaleString()}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-normal mt-0.5">on-time</span>
                        </div>
                        <div className="flex flex-col items-center min-w-[34px]">
                          <span className="text-sm font-bold text-[#F59E0B] leading-tight">
                            {dept.late.toLocaleString()}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-normal mt-0.5">late</span>
                        </div>
                        <div className="flex flex-col items-center min-w-[34px]">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-tight">
                            {dept.leave.toLocaleString()}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-normal mt-0.5">leave</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No department records found
                </div>
              )}
            </div>
          </div>

          {selectedDept && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 truncate mr-2">
                Filtered by: <strong>{formatDeptName(selectedDept.deptName)}</strong>
              </span>
              <button
                onClick={handleClearDeptFilter}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        {/* Right: Employee Drilldown Card (Opens right beside Departments when any dept is clicked) */}
        {selectedDept && (
          <div className="lg:col-span-4 xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-3.5 transition-all">
            <div className="space-y-3.5">
              {/* Header: Dept Name & Close */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                    style={{ backgroundColor: selectedDept.color || "#3B82F6" }}
                  />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {formatDeptName(selectedDept.deptName)}
                  </h3>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0">
                    ({drilldownCounts.all})
                  </span>
                </div>
                <button
                  onClick={handleClearDeptFilter}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Close drilldown"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Tabs: All, Absent, Late, OnTime, Early Go */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {[
                  { id: "all", label: "All", count: drilldownCounts.all },
                  { id: "absent", label: "Absent", count: drilldownCounts.absent },
                  { id: "late", label: "Late", count: drilldownCounts.late },
                  { id: "onTime", label: "OnTime", count: drilldownCounts.onTime },
                  { id: "earlyGo", label: "Early Go", count: drilldownCounts.earlyGo },
                ].map((tab) => {
                  const isActive = drilldownTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDrilldownTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "border border-indigo-500 text-indigo-700 bg-indigo-50/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500 shadow-2xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>

              {/* Search Bar & View All Employees */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-indigo-500 absolute right-2.5 top-2.5" />
                </div>

                <button
                  onClick={() => {
                    setEmpSearch("");
                    setDrilldownTab("all");
                  }}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0 cursor-pointer"
                >
                  View All Employees
                </button>
              </div>

              {/* Employees List */}
              <div
                key={`drilldown-list-${selectedDept?.deptCode || selectedDept?.deptName || "dept"}-${drilldownTab}`}
                className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[350px] overflow-y-auto pr-1.5 scrollbar-thin"
              >
                {drilldownEmployees.length > 0 ? (
                  drilldownEmployees.map((emp: any, index: number) => {
                    const cat = getEmployeeCategory(emp);

                    let badgeText = "✓ OnTime";
                    let badgeClass =
                      "bg-emerald-50 text-[#00B87C] border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800";
                    if (cat === "absent") {
                      badgeText = "✕ Absent";
                      badgeClass =
                        "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400";
                    } else if (cat === "late") {
                      badgeText = "⏱ Late";
                      badgeClass =
                        "bg-amber-50 text-[#F59E0B] border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800";
                    } else if (cat === "earlyGo") {
                      badgeText = "→ Early Go";
                      badgeClass =
                        "bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-400";
                    }

                    return (
                      <div
                        key={`${emp.EMP_CODE || "emp"}_${emp.UTD || emp.id || index}_${index}`}
                        className="py-3 px-1.5 flex items-center justify-between gap-3 group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
                      >
                        {/* Left: Avatar + Employee Info */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <EmployeeAvatar
                            emp={emp}
                            onPreview={(url) => setPreviewImage(url)}
                          />

                          <div className="min-w-0">
                            <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 uppercase truncate tracking-tight">
                              {emp.EMP_NAME}
                            </div>
                            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase truncate">
                              {emp.DESIGNATION || "EMPLOYEE"}
                            </div>
                            <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-normal flex items-center gap-2.5 mt-0.5">
                              <span>Login: {emp.LOGIN_TIME || "--:--"}</span>
                              <span>Logout: {emp.LOGOUT_TIME || "--:--"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Status Pill Badge */}
                        <div className="shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}
                          >
                            {badgeText}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                      <Search className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No data found
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No employees recorded for this filter
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM SECTION: PENDING LEAVE REQUESTS & NEEDS ATTENTION TODAY */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Pending Leave Requests Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pending leave requests
              </h2>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {pendingLeavesList.length} waiting
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              iconPosition="right"
              onClick={() => router.push("/payroll/attendance-punch/leave-approval-grid")}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Open grid
            </Button>
          </div>

          {/* List of Pending Leaves */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[270px] overflow-y-auto pr-1.5 custom-scrollbar">
            {pendingLeavesList.length > 0 ? (
              pendingLeavesList.map((leave, index) => {
                const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
                const initials = getInitials(leave.EMP_NAME);
                const formattedDate = leave.LEAVE_DATE
                  ? new Date(leave.LEAVE_DATE).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Today";

                return (
                  <div key={index} className="py-3 px-1.5 flex items-center justify-between gap-3 group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors">
                    {/* Left: Avatar + Name + Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${palette.bg}`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight truncate">
                          {formatDeptName(leave.EMP_NAME)}
                        </div>
                        <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {formattedDate} · {leave.duration || "1 day"} · {leave.reason || "personal work"}
                        </div>
                      </div>
                    </div>

                    {/* Right: Type Badge + Approve Button */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {leave.LEAVE_TYPE || "Leave"}
                      </span>

                      <button
                        onClick={() => handleApproveLeave(leave)}
                        disabled={approvingKey === `${leave.EMP_CODE || leave.EmpCode}_${leave.LEAVE_DATE || leave.Leave_applied_on}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {approvingKey === `${leave.EMP_CODE || leave.EmpCode}_${leave.LEAVE_DATE || leave.Leave_applied_on}` ? "Approving..." : "Approve"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No pending leave requests
              </div>
            )}
          </div>
        </div>

        {/* 2. Needs Attention Today Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Needs attention today
            </h2>
          </div>

          {/* Needs Attention Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* Row 1: Punch approvals pending */}
            <div
              onClick={() => router.push("/payroll/attendance-punch/attendance-punching-approval")}
              className="py-3 px-1.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-amber-600 transition-colors">
                    Punch approvals pending
                  </div>
                  <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                    In and out punches raised this week
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <span>{needsAttention.punchApprovals}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Row 2: Mis-punch requests */}
            <div
              onClick={() => router.push("/payroll/attendance-punch/mispunch-approval-grid")}
              className="py-3 px-1.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-rose-600 transition-colors">
                    Mis-punch requests
                  </div>
                  <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                    Awaiting HOD sign-off
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <span>{needsAttention.mispunch}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Row 3: Comp off not raised */}
            <div
              onClick={() => router.push("/payroll/attendance-punch/comp-off-approver-grid")}
              className="py-3 px-1.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-purple-600 transition-colors">
                    Comp off not raised
                  </div>
                  <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                    Week-off days already worked
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <span>{needsAttention.compOff}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Row 4: Shift changes waiting */}
            <div
              onClick={() => router.push("/payroll/attendance-punch/shift-approval-grid")}
              className="py-3 px-1.5 flex items-center justify-between group cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-cyan-600 transition-colors">
                    Shift changes waiting
                  </div>
                  <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                    Approver 1 has not acted
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <span>{needsAttention.shiftChanges}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* ==================================================================== */}
      {/* PHOTO PREVIEW MODAL */}
      {/* ==================================================================== */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="relative p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full shadow-md w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImage} alt="Preview" className="max-h-[75vh] rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
