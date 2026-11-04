"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import FileViewer from "@/components/atoms/Fileviewer";
import HashloaderComponent from "@/components/Templates/hashloader";
import ReactTable from "@/components/Templates/reacttable";
import AttendanceDataTable from "./components/AttendanceDataTable";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Clock4,
  ExternalLink,
  Eye,
  FileCheck2,
  ListChecks,
  MousePointerClick,
  PartyPopper,
  RefreshCw,
  Replace,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserCheck,
  UserX,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const PAGE_SIZE_KEY = "manualAttendance.pageSize";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const API_URL = process.env.NEXT_PUBLIC_URL;
const FILE_BASE_URL =
  process.env.NEXT_PUBLIC_FILE_URL || "https://erp.autovyn.com/backend/fetch";

// Production sends this literal for the reason and remark master calls.
// Keep it until the backend confirms what it expects.
const MASTER_COMP_CODE = "demo";

// Sick-leave reason IDs that need a document upload.
const SICK_LEAVE_REASONS = [123, 121, 122, 6];

// Reason that always locks the time inputs.
const TIME_LOCK_REASON = 31;

// Role that bypasses the back-date rule for range updates (production only).
const BACKDATE_OVERRIDE_ROLE = "12.1.17";

const RERUN_POLL_MS = 30000;

// Old ERP behaviour: while EMPRUN is true, every roster row is yellow (#FEF08A).

const WEEKDAY_OPTIONS = [
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
  { label: "Sunday", value: "0" },
];

const WEEKLY_OFF_LABELS = [
  { value: "0", label: "SUN" },
  { value: "1", label: "MON" },
  { value: "2", label: "TUE" },
  { value: "3", label: "WED" },
  { value: "4", label: "THUR" },
  { value: "5", label: "FRI" },
  { value: "6", label: "SAT" },
];

const MONTH_OPTIONS = [
  { value: "01", label: "01 · Jan" },
  { value: "02", label: "02 · Feb" },
  { value: "03", label: "03 · Mar" },
  { value: "04", label: "04 · Apr" },
  { value: "05", label: "05 · May" },
  { value: "06", label: "06 · Jun" },
  { value: "07", label: "07 · Jul" },
  { value: "08", label: "08 · Aug" },
  { value: "09", label: "09 · Sep" },
  { value: "10", label: "10 · Oct" },
  { value: "11", label: "11 · Nov" },
  { value: "12", label: "12 · Dec" },
];

// Leave balance cards. Leave_Type codes come from the backend.
const LEAVE_TEMPLATE = [
  { Leave_TypeName: "Casual Leave", Leave_Type: 4, short: "CL", tint: "#4F46E5" },
  { Leave_TypeName: "Paid Leave", Leave_Type: 5, short: "PL", tint: "#0EA5E9" },
  { Leave_TypeName: "Sick Leave", Leave_Type: 6, short: "SL", tint: "#7C3AED" },
  { Leave_TypeName: "Comp. Off (CO)", Leave_Type: 9, short: "Comp Off", tint: "#10B981" },
];

/* ------------------------------------------------------------------ */
/* Pure helpers (no component state)                                   */
/* ------------------------------------------------------------------ */

const pad = (n: number | string) => String(n).padStart(2, "0");

// Old ERP priority: MAN_REJ "Y" → red, shift "501" → sky blue, re-run → yellow.
function rowTintOf(row: any, empRunning: boolean) {
  if (row?.MAN_REJ == "Y") return "red";
  if (String(row?.shift) === "501") return "skyblue";
  if (empRunning) return "yellow";
  return "";
}

// Applied to the table wrapper. Each rule colours the row's cells and every element inside them.
// !important is needed because the cell content has its own dark-mode text classes.
const ROW_TINT_CLASSES = "";


function showSideAlert(
  message: string,
  type: "success" | "error" | "warning" | "info",
) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      container: "side-alert-container",
      popup: `side-alert-${type}`,
      title: "side-alert-title",
      icon: "side-alert-icon",
    },
  });
  Toast.fire({ icon: type, title: message });
}

// Escapes text before it is placed into Swal "html". Server messages are untrusted.
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function getErrorMessage(
  error: any,
  fallback = "Something went wrong. Please try again.",
) {
  return (
    error?.response?.data?.Message ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    fallback
  );
}

// Backend success flags. Production accepts all three.
function isOk(data: any) {
  return (
    data?.Status === true || data?.Status === "true" || data?.success === true
  );
}

// Parse "YYYY-MM-DD", "DD/MM/YYYY" or an ISO timestamp into a LOCAL date.
// Local construction avoids the UTC-midnight shift that new Date("YYYY-MM-DD") causes.
function toLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const datePart = String(value).split("T")[0];
  const parts = datePart.includes("/")
    ? datePart.split("/").reverse()
    : datePart.split("-");
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function dateOnly(value?: string | null): string | null {
  return value ? String(value).split("T")[0] : null;
}

function todayLocal() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function isBackDated(value?: string | null) {
  const d = toLocalDate(value);
  return !!d && d < todayLocal();
}

// Back-date rule from company settings.
// Blocked only when back_date_mipunch_allowed is not 1 (0 or null) AND the reason has dis_back_date = 1.
// The override role is never blocked.
function isBackDateBlocked(
  dateValue: string | null | undefined,
  reason: any,
  compdata: any,
  roleOverride: boolean,
) {
  return (
    !roleOverride &&
    Number(compdata?.back_date_mipunch_allowed) !== 1 &&
    Number(reason?.dis_back_date) === 1 &&
    isBackDated(dateValue)
  );
}

// True when the date is after today.
function isFutureDate(value?: string | null) {
  const d = toLocalDate(value);
  return !!d && d > todayLocal();
}

function isBeforeDate(value?: string | null, limit?: string | null) {
  const a = toLocalDate(value);
  const b = toLocalDate(limit);
  return !!a && !!b && a < b;
}

function isAfterDate(value?: string | null, limit?: string | null) {
  const a = toLocalDate(value);
  const b = toLocalDate(limit);
  return !!a && !!b && a > b;
}

// Every calendar day from start to end (inclusive), as "YYYY-MM-DD".
function eachDate(start?: string | null, end?: string | null): string[] {
  const s = toLocalDate(start);
  const e = toLocalDate(end);
  if (!s || !e || s > e) return [];
  const out: string[] = [];
  for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
}

// Production rule: "00" is not a valid time.
function isValidTime(t?: string | null) {
  return !!t && t !== "00";
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hoursBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b || a === "00" || b === "00") return null;
  const [ah, am] = a.trim().split(":").map(Number);
  const [bh, bm] = b.trim().split(":").map(Number);
  if ([ah, am, bh, bm].some((n) => isNaN(n))) return null;
  let mins = bh * 60 + bm - (ah * 60 + am);
  if (mins < 0) mins += 1440;
  return mins;
}

function fmtMins(m: number | null) {
  if (m === null) return "—";
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}

// "HH.MM" shift encoding, same as production. "9.30" → "09:30".
function formatShiftDecimal(value: any) {
  if (value === undefined || value === null || value === "") return "";
  const [h, mm] = String(value).split(".");
  const minutes = mm === undefined ? "00" : mm.length === 1 ? `${mm}0` : mm;
  return `${h.padStart(2, "0")}:${minutes}`;
}

// "2026-10-31T09:30:00" → "09:30"
function formatTimePart(value?: string | null) {
  if (!value) return "";
  const t = String(value).split("T")[1];
  return t ? t.substring(0, 5) : "";
}

// Date-window rule shared by every date-range action.
// Uses the allowed window when the backend sends one, otherwise the selected month.
function checkDateWindow({
  start,
  end,
  selectedMonth,
  allowedFrom,
  allowedTo,
}: {
  start: string | null;
  end: string | null;
  selectedMonth: number;
  allowedFrom?: string | null;
  allowedTo?: string | null;
}): string | null {
  const s = toLocalDate(start);
  const e = toLocalDate(end);
  if (!s || !e) return "Please select valid dates";

  const from = toLocalDate(allowedFrom);
  const to = toLocalDate(allowedTo);
  if (from && to) {
    if (s < from || e > to) {
      return `Selected dates must be between ${allowedFrom} and ${allowedTo}`;
    }
    return null;
  }

  if (
    s.getMonth() + 1 !== selectedMonth ||
    e.getMonth() + 1 !== selectedMonth
  ) {
    return "Start date and end date must be within the selected month";
  }
  return null;
}

function getDayLabel(dateStr?: string | null) {
  const d = toLocalDate(dateStr);
  if (!d) return "";
  return (
    WEEKLY_OFF_LABELS.find((x) => x.value === String(d.getDay()))?.label ?? ""
  );
}

// Machine punches arrive as ISO strings. The time is read from the string as sent.
// Placeholder dates and 00:00 are treated as "no punch".
function hhmm(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();

  // Placeholder dates such as 0001-01-01, 1899-12-30 or 1900-01-01
  if (/^(0001|1899|1900)/.test(s)) return null;

  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;

  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h === 0 && min === 0) return null;

  return `${pad(h)}:${pad(min)}`;
}

function shortDate(value: any) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const dash = (v: any) => (v === undefined || v === null || v === "" ? "—" : v);

const numFixed = (v: any) =>
  v === undefined || v === null || v === "" ? "—" : Number(v).toFixed(2);

function statusBadgeClass(value: any) {
  const st = String(value ?? "").trim().toUpperCase();
  const isPresent = st === "P" || st.includes("PRESENT") || st === "W" || st.includes("WORK");
  const isAbsent = st === "A" || st.includes("ABSENT");
  const isWO = st === "WO" || st === "W-OFF" || st.includes("OFF");
  const isOT = st === "OT" || st.includes("OVERTIME");
  const isLateOrHalf =
    st === "LM" || st === "L" || st.includes("LATE") || st === "HD" || st === "HL" || st.includes("HALF");
  const isMP = st === "MP" || st.includes("MISPUNCH");
  if (isPresent)
    return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] dark:bg-[#064E3B]/80 dark:text-[#6EE7B7] dark:border-[#059669]/60";
  if (isAbsent)
    return "bg-[#F1F2FF] text-[#BE123C] border-[#FECDD3] dark:bg-[#881337]/80 dark:text-[#FDA4AF] dark:border-[#E11D48]/60";
  if (isWO)
    return "bg-[#ECFEFF] text-[#0E7490] border-[#A5F3FC] dark:bg-[#164E63]/80 dark:text-[#67E8F9] dark:border-[#0891B2]/60";
  if (isOT)
    return "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE] dark:bg-[#4C1D95]/80 dark:text-[#C4B5FD] dark:border-[#7C3AED]/60";
  if (isLateOrHalf)
    return "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A] dark:bg-[#78350F]/80 dark:text-[#FDE68A] dark:border-[#D97706]/60";
  if (isMP)
    return "bg-[#FEFCE8] text-[#854D0E] border-[#FDE047] dark:bg-[#78350F]/80 dark:text-[#FDE68A] dark:border-[#D97706]/60";
  return "bg-[#EEF2FF] text-[#4338CA] border-[#C7D2FE] dark:bg-[#312E81]/80 dark:text-[#A5B4FC] dark:border-[#6366F1]/60";
}

function statusLabel(value: any) {
  const st = String(value ?? "").trim().toUpperCase();
  if (!st || st === "—" || st === "-") return "—";
  if (st === "A" || st.includes("ABSENT")) return "Absent";
  if (st === "P" || st.includes("PRESENT")) return "Present";
  if (st === "W" || st === "WRK" || st.includes("WORK")) return "Working";
  if (st === "WO" || st === "W-OFF" || st === "W/O" || st.includes("WEEK OFF") || st.includes("WEEKOFF") || st === "OFF") return "Week off";
  if (st === "OT" || st.includes("OVERTIME")) return "Overtime";
  if (st === "HD" || st === "HL" || st === "HF" || st.includes("HALF")) return "Half Day";
  if (st === "LM" || st === "L" || st.includes("LATE")) return "Late mark";
  if (st === "OD" || st.includes("DUTY")) return "On Duty";
  if (st === "CO" || st === "C-OFF" || st.includes("COMP")) return "Comp Off";
  if (st === "H" || st === "HOL" || st.includes("HOLIDAY")) return "Holiday";
  if (st === "CL" || st.includes("CASUAL")) return "Casual Leave";
  if (st === "SL" || st.includes("SICK")) return "Sick Leave";
  if (st === "PL" || st === "EL" || st.includes("PAID LEAVE") || st.includes("EARNED")) return "Paid Leave";
  if (st === "ML" || st.includes("MATERNITY")) return "Maternity Leave";
  if (st === "LV" || st === "LVE" || st.includes("LEAVE")) return "Leave";
  if (st === "MP" || st.includes("MISPUNCH")) return "Mispunch";
  if (st === "REJ" || st.includes("REJECT")) return "Rejected";
  return dash(value);
}

function getPaidDayMeta(rawKey: string, value: any) {
  const k = String(rawKey || "").trim().toUpperCase();

  if (k.includes("PRESENT")) {
    return {
      label: "Presents",
      Icon: UserCheck,
      iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 dark:bg-emerald-500/20",
      valueColor: "text-emerald-600 dark:text-emerald-400",
      accentBg: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      gradient: "from-emerald-500/5 to-transparent",
    };
  }
  if (k.includes("ABSENT")) {
    return {
      label: "Absents",
      Icon: UserX,
      iconWrap: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 dark:bg-rose-500/20",
      valueColor: "text-rose-600 dark:text-rose-400",
      accentBg: "hover:border-rose-300 dark:hover:border-rose-500/40",
      gradient: "from-rose-500/5 to-transparent",
    };
  }
  if (k.includes("HALF")) {
    return {
      label: "Half Days",
      Icon: Clock4,
      iconWrap: "bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24] border border-amber-500/25 dark:bg-amber-500/20",
      valueColor: "text-[#D97706] dark:text-[#FBBF24]",
      accentBg: "hover:border-amber-300 dark:hover:border-amber-500/40",
      gradient: "from-amber-500/5 to-transparent",
    };
  }
  if (k.includes("HOLIDAY")) {
    return {
      label: "Holidays",
      Icon: PartyPopper,
      iconWrap: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 dark:bg-purple-500/20",
      valueColor: "text-purple-600 dark:text-purple-400",
      accentBg: "hover:border-purple-300 dark:hover:border-purple-500/40",
      gradient: "from-purple-500/5 to-transparent",
    };
  }
  if (k === "WO" || k.includes("WEEK") || k.includes("OFF")) {
    return {
      label: "Week Off",
      Icon: CalendarDays,
      iconWrap: "bg-sky-500/15 text-[#0284C7] dark:text-[#38BDF8] border border-sky-500/25 dark:bg-sky-500/20",
      valueColor: "text-[#0284C7] dark:text-[#38BDF8]",
      accentBg: "hover:border-sky-300 dark:hover:border-sky-500/40",
      gradient: "from-sky-500/5 to-transparent",
    };
  }
  if (k.includes("RELAX")) {
    return {
      label: "Relaxations",
      Icon: ShieldCheck,
      iconWrap: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25 dark:bg-teal-500/20",
      valueColor: "text-teal-600 dark:text-teal-400",
      accentBg: "hover:border-teal-300 dark:hover:border-teal-500/40",
      gradient: "from-teal-500/5 to-transparent",
    };
  }
  if (k.includes("UNAPR") || k.includes("MISPUNCH") || k.includes("MP")) {
    return {
      label: "Unapproved MP",
      Icon: AlertCircle,
      iconWrap: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 dark:bg-orange-500/20",
      valueColor: "text-orange-600 dark:text-orange-400",
      accentBg: "hover:border-orange-300 dark:hover:border-orange-500/40",
      gradient: "from-orange-500/5 to-transparent",
    };
  }
  if (k.includes("LEAVE")) {
    return {
      label: "Leaves",
      Icon: Briefcase,
      iconWrap: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 dark:bg-indigo-500/20",
      valueColor: "text-indigo-600 dark:text-indigo-400",
      accentBg: "hover:border-indigo-300 dark:hover:border-indigo-500/40",
      gradient: "from-indigo-500/5 to-transparent",
    };
  }
  if (k.includes("PAID")) {
    return {
      label: "Paid Days",
      Icon: Award,
      iconWrap: "bg-blue-600 text-white shadow-xs border border-blue-500",
      valueColor: Number(value) < 0 ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-blue-600 dark:text-blue-400 font-extrabold",
      accentBg: "hover:border-blue-400 dark:hover:border-blue-500/50 ring-1 ring-blue-500/20",
      gradient: "from-blue-500/10 to-transparent",
    };
  }

  return {
    label: rawKey,
    Icon: Check,
    iconWrap: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/25 dark:bg-slate-500/20",
    valueColor: "text-slate-800 dark:text-slate-100",
    accentBg: "hover:border-slate-300 dark:hover:border-slate-600",
    gradient: "from-slate-500/5 to-transparent",
  };
}

function rowKeyOf(row: any) {
  return String(row?.UTD ?? row?.formatted_dateoffice ?? row?.dateoffice);
}

function isSameRow(a: any, b: any) {
  return (
    !!a &&
    !!b &&
    (a.UTD === b.UTD || a.formatted_dateoffice === b.formatted_dateoffice)
  );
}

// Times for a row, depending on whether the reason is fixed-time.
function timesForReason(row: any, reasonValue: string | null, reasons: any[]) {
  const reason = reasons.find((r) => String(r.value) === String(reasonValue));
  if (reasonValue && Number(reason?.Misc_Num1) === 1) {
    return {
      InTime: formatShiftDecimal(row.shiftstarttime),
      OutTime: formatShiftDecimal(row.shiftendtime),
    };
  }
  return {
    InTime: formatTimePart(row.In_1),
    OutTime: formatTimePart(row.Out_1),
  };
}

// Column definitions. Used for the table and for Excel export.
// Export strips the render functions, so the export keeps raw values.
const MONTH_COLUMNS: Array<{
  Header: string;
  accessor: any;
  width?: number;
  render?: (value: any, row: any, selected: any) => React.ReactNode;
}> = [
    {
      Header: "Emp_Code",
      accessor: "Emp_Code",
      width: 100,
      render: (v) => (
        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {v || "—"}
        </span>
      ),
    },
    {
      Header: "Atn_Date",
      accessor: "formatted_dateoffice",
      width: 120,
      render: (v, row, selected) => (
        <span
          className={`font-semibold whitespace-nowrap text-[13px] ${isSameRow(selected, row)
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-800 dark:text-slate-200"
            }`}
        >
          {v || dateOnly(row.dateoffice) || "—"}
        </span>
      ),
    },
    {
      Header: "DAY",
      accessor: (r: any) => getDayLabel(r.formatted_dateoffice),
      width: 75,
      render: (v) => (
        <span
          className={`font-bold whitespace-nowrap text-[13px] ${v === "SUN"
              ? "text-[#0284C7] dark:text-[#38BDF8]"
              : "text-slate-600 dark:text-slate-300"
            }`}
        >
          {statusLabel(v)}
        </span>
      ),
    },
    {
      Header: "StTime",
      accessor: "shiftstarttime",
      width: 75,
      render: (v) => (
        <span className="font-mono text-[13px] font-medium text-slate-600 dark:text-slate-300">{numFixed(v)}</span>
      ),
    },
    {
      Header: "EndTime",
      accessor: "shiftendtime",
      width: 75,
      render: (v) => (
        <span className="font-mono text-[13px] font-medium text-slate-600 dark:text-slate-300">{numFixed(v)}</span>
      ),
    },
    {
      Header: "InTime",
      accessor: "In_1",
      width: 85,
      render: (v) => {
        const t = hhmm(v);
        return t ? (
          <span className="font-mono text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
            {t}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 font-bold text-[13px]">—</span>
        );
      },
    },
    {
      Header: "OutTime",
      accessor: "Out_1",
      width: 85,
      render: (v) => {
        const t = hhmm(v);
        return t ? (
          <span className="font-mono text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">
            {t}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 font-bold text-[13px]">—</span>
        );
      },
    },
    {
      Header: "Work_Hrs",
      accessor: "hoursworked",
      width: 85,
      render: (v) => {
        const s = String(v ?? "").replace(/h$/i, "").trim();
        if (!s || /^0*:?0*$/.test(s)) {
          return <span className="text-slate-400 dark:text-slate-500 font-bold text-[13px]">—</span>;
        }
        return <span className="font-mono text-[13px] font-medium text-slate-700 dark:text-slate-200">{s}</span>;
      },
    },
    {
      Header: "Status",
      accessor: "status",
      width: 110,
      render: (v, row) => {
        const s = String(v ?? "").trim().toUpperCase();
        const isRej =
          s.includes("REJ") ||
          String(row?.MAN_REJ ?? "").trim().toUpperCase() === "Y" ||
          String(row?.MP_Status ?? "").trim().toUpperCase() === "REJECTED";
        if (isRej) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EF4444] text-white shadow-xs">
              Rejected
            </span>
          );
        }
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs backdrop-blur-xs ${statusBadgeClass(v)}`}
          >
            {statusLabel(v)}
          </span>
        );
      },
    },
    {
      Header: "Mp_Status",
      accessor: "MP_Status",
      width: 90,
      render: (v) => {
        const s = String(v ?? "").trim().toUpperCase();
        if (s === "REJECTED" || s === "REJ") {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EF4444] text-white shadow-xs">
              Rejected
            </span>
          );
        }
        return <span className="text-[13px] text-slate-700 dark:text-slate-300">{dash(v)}</span>;
      },
    },
    { Header: "Mp_Aprvl", accessor: "MAN_APPR", width: 90 },
    {
      Header: "MI_REMARK",
      accessor: "MI_REMARK",
      width: 140,
      render: (v) => (
        <span className="block max-w-[140px] truncate text-[13px]" title={v}>
          {statusLabel(v)}
        </span>
      ),
    },
    {
      Header: "SPL_REMARK",
      accessor: "SPL_REMARK",
      width: 140,
      render: (v) => (
        <span className="block max-w-[140px] truncate text-[13px]" title={v}>
          {statusLabel(v)}
        </span>
      ),
    },
    {
      Header: "Shift",
      accessor: "shift",
      width: 80,
      render: (v) => {
        const s = String(v ?? "").trim();
        if (s === "501") {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0284C7] text-white shadow-xs">
              501
            </span>
          );
        }
        return <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{s || "GEN"}</span>;
      },
    },
    { Header: "PresentValue", accessor: "presentvalue", width: 90 },
    { Header: "AbsentValue", accessor: "absentvalue", width: 90 },
    {
      Header: "CURRENTJOIN",
      accessor: "CURRENTJOINDATE",
      width: 110,
      render: (v) => <span className="text-[13px]">{shortDate(v)}</span>,
    },
    { Header: "Region", accessor: "Region", width: 90 },
    { Header: "Sal_region", accessor: "salreason", width: 100 },
    { Header: "MISPUNCH_REC", accessor: "MISPUNCH_REC", width: 110 },
    { Header: "WO_Value", accessor: "wo_value", width: 90 },
    { Header: "LeaveValue", accessor: "leavevalue", width: 90 },
    { Header: "Prob_Period", accessor: "in1mannual", width: 90 },
    { Header: "NightShift", accessor: "NightShift", width: 90 },
    { Header: "Reject_By", accessor: "Reject_By", width: 90 },
    { Header: "App_in1", accessor: "App_in1", width: 80 },
    { Header: "App_out1", accessor: "App_out1", width: 80 },
    {
      Header: "BM_IN1",
      accessor: "BM_IN1",
      width: 85,
      render: (v) => <span className="font-mono text-[13px]">{hhmm(v) ?? "—"}</span>,
    },
    {
      Header: "BM_OUT1",
      accessor: "BM_OUT1",
      width: 85,
      render: (v) => <span className="font-mono text-[13px]">{hhmm(v) ?? "—"}</span>,
    },
    { Header: "In_Add", accessor: "In_Add", width: 80 },
    // Header corrected from "Our_Add". The accessor was already Out_Add.
    { Header: "Out_Add", accessor: "Out_Add", width: 80 },
    {
      Header: "MAN_REJ",
      accessor: "MAN_REJ",
      width: 80,
      render: (v) => {
        const s = String(v ?? "").trim().toUpperCase();
        if (s === "Y") {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EF4444] text-white shadow-xs">
              Rejected
            </span>
          );
        }
        return <span className="text-slate-500 text-[13px]">{dash(v)}</span>;
      },
    },
    { Header: "mp_in1", accessor: "mp_in1", width: 80 },
    { Header: "mp_out1", accessor: "mp_out1", width: 80 },
    { Header: "Approver1_Code", accessor: "Approver1_Code", width: 100 },
    { Header: "Approver1_Name", accessor: "Approver1_Name", width: 120 },
    { Header: "Approver1_Status", accessor: "Approver1_Status", width: 100 },
    { Header: "Approver2_Code", accessor: "Approver2_Code", width: 100 },
    { Header: "Approver2_Name", accessor: "Approver2_Name", width: 120 },
    { Header: "Approver2_Status", accessor: "Approver2_Status", width: 100 },
    { Header: "Approver3_Code", accessor: "Approver3_Code", width: 100 },
    { Header: "Approver3_Name", accessor: "Approver3_Name", width: 120 },
    { Header: "Appr_3_Rem", accessor: "Appr_3_Rem", width: 110 },
    { Header: "Appr_3_date", accessor: "Appr_3_date", width: 110 },
    { Header: "Approver3_Status", accessor: "Approver3_Status", width: 100 },
  ];

const EXPORT_COLUMNS = MONTH_COLUMNS.map(({ Header, accessor }) => ({
  Header,
  accessor,
}));

function buildInitialForm() {
  const now = new Date();
  return {
    startDate: null as string | null,
    endDate: null as string | null,
    AttdenceDate2: null as string | null,
    Name: null as string | null,
    EMPCODE: null as string | null,
    InTime: null as string | null,
    OutTime: null as string | null,
    weekdays: null as string | null,
    MP_Reason: null as string | null,
    MP_Remark: null as string | null,
    SPL_REMARK: null as string | null,
    shift: null as string | null,
    month: pad(now.getMonth() + 1),
    year: String(now.getFullYear()),
  };
}

function emptyLeaveBalances() {
  return LEAVE_TEMPLATE.map((l) => ({
    ...l,
    Op_Bal: 0,
    Gen_Lev: 0,
    Avail_Lev: 0,
    Cl_Bal: 0,
  }));
}

function getCurrentFinancialYear() {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

// Production behaviour: the list starts one year ahead, so the current year is always listed.
function buildYearOptions() {
  const top = getCurrentFinancialYear() + 1;
  return Array.from({ length: 5 }, (_, i) => ({
    value: `${top - i}`,
    label: `${top - i}`,
  }));
}

const YEAR_OPTIONS = buildYearOptions();

// Saved table page size. Falls back to the default when nothing valid is stored.
function readStoredPageSize(): number {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  try {
    const saved = Number(window.localStorage.getItem(PAGE_SIZE_KEY));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function OnlineMarkAttendancePage() {
  const user: any = useCurrentUser();
  const { compdata } = useSecureStorage();

  const compcode = user?.Comp_Code;
  const userName = user?.name;
  const userBranch = user?.branch;
  const userEmp = user?.EMPCODE;
  const userId = user?.id;

  /* ---------------- Core state ---------------- */
  const [misdata, setMiscdata] = useState(buildInitialForm);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [punchTypes, setPunchTypes] = useState<any[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [leavedata, setLeavedata] = useState(emptyLeaveBalances);
  const [shiftoption, setShiftoption] = useState<any[]>([]);
  const [MPList, setMPList] = useState<any[]>([]);
  const [MPRemarksList, setMPRemarksList] = useState<any[]>([]);
  const [leaveTypeValues, setLeaveTypeValues] = useState<string[]>([]);
  const [paidDays, setPaidDays] = useState<[string, any][]>([]);
  const [shiftLockDate, setShiftLockDate] = useState<string | null>(null);
  const [miscDtl1, setMiscDtl1] = useState<string | null>(null);
  const [miscDtl2, setMiscDtl2] = useState<string | null>(null);
  const [empRunning, setEmpRunning] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  /* ---------------- Selection & slips ---------------- */
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [inSlipFile, setInSlipFile] = useState<File | null>(null);
  const [outSlipFile, setOutSlipFile] = useState<File | null>(null);
  const [inSlipPreview, setInSlipPreview] = useState<string | null>(null);
  const [outSlipPreview, setOutSlipPreview] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  /* ---------------- UI state ---------------- */
  const [showLeaveSummary, setShowLeaveSummary] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [selectedRowsTable, setSelectedRowsTable] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Sync stored page size after client mount to prevent SSR hydration mismatch
  useEffect(() => {
    const saved = readStoredPageSize();
    if (saved && saved !== DEFAULT_PAGE_SIZE) {
      setPageSize(saved);
    }
  }, []);

  // Remember the chosen page size so it survives re-renders and reloads.
  useEffect(() => {
    try {
      window.localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
    } catch {
      // Storage can be blocked; the table still works without saving.
    }
  }, [pageSize]);

  /* ---------------- Bulk entry state ---------------- */
  const [bulkIn, setBulkIn] = useState("09:00");
  const [bulkOut, setBulkOut] = useState("18:00");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkRemark, setBulkRemark] = useState("");
  const [bulkSplRemark, setBulkSplRemark] = useState("");

  /* ---------------- Derived values ---------------- */
  const reasonRow = useMemo(
    () =>
      MPList.find((r) => String(r.value) === String(misdata.MP_Reason)) ?? null,
    [MPList, misdata.MP_Reason],
  );
  const isFixedTimeReason = Number(reasonRow?.Misc_Num1) === 1;
  const isTimeLockReason = Number(misdata.MP_Reason) === TIME_LOCK_REASON;
  const timeInputsLocked = isFixedTimeReason || isTimeLockReason;
  const isLeaveReason = leaveTypeValues.includes(String(misdata.MP_Reason));
  const isSickReason = SICK_LEAVE_REASONS.includes(Number(misdata.MP_Reason));
  const isDocMandatory = Number(compdata?.mand_SL_Img) === 1;
  const hasSlip = Boolean(inSlipFile || outSlipFile);
  const showAttnSummary = Number(compdata?.Show_Attn_Summary) === 1;

  const filteredRows = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    if (!q) return tabledata;
    return tabledata.filter((row) =>
      MONTH_COLUMNS.some((col) => {
        const v =
          typeof col.accessor === "function"
            ? col.accessor(row)
            : row[col.accessor];
        return (
          v !== undefined && v !== null && String(v).toLowerCase().includes(q)
        );
      }),
    );
  }, [tabledata, globalFilter]);

  const monthStats = useMemo(() => {
    let present = 0;
    let mispunch = 0;
    let absent = 0;
    let weekOff = 0;
    tabledata.forEach((r) => {
      const s = String(r.status || "").toUpperCase();
      if (s === "P" || s.includes("PRESENT")) present++;
      else if (s === "A" || s.includes("ABSENT")) absent++;
      else if (s === "WO" || s.includes("OFF")) weekOff++;
      else if (s.includes("MISPUNCH") || s.includes("MP")) mispunch++;
    });
    return [
      { label: "Present", value: present, tint: "#10B981" },
      { label: "Mispunch", value: mispunch, tint: "#F59E0B" },
      { label: "Absent", value: absent, tint: "#E11D48" },
      { label: "Week off", value: weekOff, tint: "#0EA5E9" },
    ];
  }, [tabledata]);

  const dynamicMinutes = useMemo(
    () => hoursBetween(misdata.InTime, misdata.OutTime),
    [misdata.InTime, misdata.OutTime],
  );

  const calcLine = useMemo(() => {
    if (dynamicMinutes === null)
      return "Both punches are needed to compute work hours";
    if (dynamicMinutes < 240) return "Below half-day threshold";
    if (dynamicMinutes < 510) return "Half day / short hours";
    if (dynamicMinutes > 600) return "Overtime beyond shift";
    return "Full day";
  }, [dynamicMinutes]);

  const calcTint = useMemo(() => {
    if (dynamicMinutes === null) return "text-slate-400";
    if (dynamicMinutes < 240) return "text-rose-600 dark:text-rose-400";
    if (dynamicMinutes < 510) return "text-[#D97706] dark:text-[#FBBF24]";
    return "text-emerald-600 dark:text-emerald-400";
  }, [dynamicMinutes]);

  const punchTypeValue = tabledata?.[0]?.Punch_Type?.toString();
  const punchTypeLabel = punchTypes.find(
    (p) => String(p.value) === String(punchTypeValue),
  )?.label;

  /* ---------------- Re-run guard (Non-blocking: matches legacy ERP) ---------------- */

  // Legacy ERP allowed manual punches and edits even while re-run was in progress.
  const blockIfRerunning = () => false;

  /* ---------------- Master data ---------------- */

  useEffect(() => {
    if (!compcode) return;
    const load = async () => {
      try {
        const res = await axios.post(
          `${API_URL}/users/findAllEmployee`,
          { branch: userBranch },
          { headers: { compcode, name: userName } },
        );
        const list = res.data?.data || [];
        setEmployeeOptions(
          list.map((emp: any) => ({
            value: String(emp.value ?? emp.EMPCODE ?? ""),
            label: emp.label || `${emp.EMPCODE} - ${emp.EMPNAME || ""}`,
          })),
        );
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    load();
  }, [compcode, userBranch, userName]);

  useEffect(() => {
    if (!compcode) return;
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/mobile/getMPRemarksList`, {
          params: { Comp_Code: MASTER_COMP_CODE },
          headers: { compcode, name: userName },
        });
        const list = res.data?.Result || [];
        setMPRemarksList(
          list.map((item: any) => ({
            value: String(item.value ?? item.id ?? item),
            label: item.label ?? item.name ?? String(item),
          })),
        );
      } catch (error) {
        console.error("Error fetching MP remarks list:", error);
      }
    };
    load();
  }, [compcode, userName]);

  useEffect(() => {
    if (!compcode) return;
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/mobile/getMPList`, {
          params: { Comp_Code: MASTER_COMP_CODE, getListFor: 1 },
          headers: { compcode, name: userName },
        });
        setMPList(res.data?.Result || []);
      } catch (error) {
        console.error("Error fetching MP list:", error);
      }
    };
    load();
  }, [compcode, userName]);

  useEffect(() => {
    if (!compcode) return;
    const load = async () => {
      try {
        const res = await axios.post(
          `${API_URL}/employee/masters`,
          {},
          { headers: { compcode, name: userName } },
        );
        const data = res.data?.data || {};
        setShiftoption(
          (data.EMP_SHIFT || []).map((item: any) => ({
            value: String(item.value),
            label: item.label,
          })),
        );
        setLeaveTypeValues(
          (data.LEAVETYPE || []).map((item: any) => String(item.value)),
        );
        setPunchTypes(
          (data.EmpPunchType || []).filter(
            (item: any) => String(item.value) !== "0",
          ),
        );
      } catch (error) {
        console.error("Error fetching masters:", error);
      }
    };
    load();
  }, [compcode, userName]);

  /* ---------------- Fetch attendance ---------------- */

  const fetchAttendanceData = async (
    empCode: string,
    month: string,
    year: string,
  ) => {
    // Reset everything that belongs to the previous employee or month.
    setTabledata([]);
    setSelectedRow(null);
    setSelectedRowsTable([]);
    setInSlipFile(null);
    setOutSlipFile(null);
    setInSlipPreview(null);
    setOutSlipPreview(null);
    setLeavedata(emptyLeaveBalances());
    setPaidDays([]);
    setShiftLockDate(null);
    setMiscDtl1(null);
    setMiscDtl2(null);
    setMiscdata((prev) => ({
      ...prev,
      Name: null,
      weekdays: null,
      InTime: null,
      OutTime: null,
      MP_Reason: null,
      MP_Remark: null,
      SPL_REMARK: null,
      startDate: null,
      endDate: null,
      AttdenceDate2: null,
      shift: null,
    }));

    setIsBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/ars/fetchAttendanceData`,
        { empcode: empCode, month, year },
        { headers: { compcode, name: userName, EMPCODE: userEmp } },
      );

      if (res.data?.Warning) {
        Swal.fire({
          icon: "warning",
          title: "Warning",
          text: String(res.data.Warning),
        });
      }

      setTabledata(res.data?.Result || []);
      setMiscDtl1(res.data?.miscDtl1 ?? null);
      setMiscDtl2(res.data?.miscDtl2 ?? null);
      setEmpRunning(Boolean(res.data?.EMPRUN));

      // Paid-days summary is independent of the other calls.
      // A failure here must not block the rest, and the other calls must not block it.
      try {
        const paid = await axios.get(`${API_URL}/mobile/getAttendance1`, {
          params: { empCode, month, year },
          headers: { compcode, name: userName },
        });
        const summary = paid.data?.summary;
        setPaidDays(
          paid.data?.Status && summary ? Object.entries(summary) : [],
        );
      } catch (err) {
        console.error("Error fetching paid days:", err);
        setPaidDays([]);
      }

      try {
        const lockRes = await axios.post(
          `${API_URL}/ars/getShiftLockDate`,
          { loc_code: userBranch },
          { headers: { compcode, name: userName } },
        );
        const rawLock = lockRes.data?.success
          ? lockRes.data?.ShiftLockDate
          : null;
        setShiftLockDate(rawLock ? String(rawLock).split("T")[0] : null);
      } catch (err) {
        console.error("Error fetching shift lock date:", err);
        setShiftLockDate(null);
      }

      const weeklyOff = res.data?.WEEKLYOFFData?.[0]?.WEEKLYOFF;
      if (weeklyOff !== undefined && weeklyOff !== null) {
        setMiscdata((prev) => ({ ...prev, weekdays: String(weeklyOff) }));
      }

      const apiLeave: any[] = res.data?.LeaveData || [];
      setLeavedata((prev) =>
        prev.map((leave) => {
          const row = apiLeave.find(
            (a) =>
              a.Leave_Type === leave.Leave_Type &&
              (a.Op_Bal !== 0 ||
                a.Gen_Lev !== 0 ||
                a.Avail_Lev !== 0 ||
                a.Cl_Bal !== 0),
          );
          return row ? { ...leave, ...row } : leave;
        }),
      );

      const nameRow = res.data?.EmpNameValueData?.[0];
      if (nameRow) {
        setMiscdata((prev) => ({
          ...prev,
          Name: nameRow.EMPNAME || nameRow.EMP_NAME || null,
        }));
      }
    } catch (error: any) {
      console.error("Error fetching attendance data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: getErrorMessage(error, "Something went wrong."),
      });
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Poll until re-run finishes (disabled) ---------------- */

  // While a re-run is active, check the server flag. When EMPRUN turns false,
  // clear the banner, refresh the table and tell the user.
  useEffect(() => {
    if (!empRunning || !misdata.EMPCODE || !misdata.month || !misdata.year)
      return;

    const id = setInterval(async () => {
      try {
        const res = await axios.post(
          `${API_URL}/ars/fetchAttendanceData`,
          { empcode: misdata.EMPCODE, month: misdata.month, year: misdata.year },
          { headers: { compcode, name: userName, EMPCODE: userEmp } },
        );
        if (!res.data?.EMPRUN) {
          setEmpRunning(false);
          setTabledata(res.data?.Result || []);
          showSideAlert("Attendance re-run completed", "success");
        }
      } catch {
        // A failed poll is not a completion. Keep polling.
      }
    }, RERUN_POLL_MS);

    return () => clearInterval(id);
  }, [empRunning, misdata.EMPCODE, misdata.month, misdata.year, compcode, userName, userEmp]);

  /* ---------------- Validation helpers ---------------- */

  // Asks the server if attendance is locked for each date.
  // If the check itself fails, the date is treated as blocked (fail safe).
  const findLockProblems = async (
    empCode: string,
    dates: string[],
  ): Promise<string[]> => {
    const unique = Array.from(new Set(dates.filter(Boolean)));
    const results = await Promise.all(
      unique.map(async (d) => {
        try {
          const res = await axios.post(
            `${API_URL}/ars/attandancelockedOrNot`,
            {
              checkDate: d,
              selectedLocations: 1,
              regionCode: 1,
              EMPCODE: empCode,
            },
            { headers: { compcode } },
          );
          if (!res.data?.Status) {
            return `${d}: ${res.data?.Message || "Attendance is locked"}`;
          }
          return null;
        } catch (error) {
          return `${d}: could not verify lock (${getErrorMessage(error, "network error")})`;
        }
      }),
    );
    return results.filter((r): r is string => r !== null);
  };

  const showLockPopup = (problems: string[]) =>
    Swal.fire({
      icon: "error",
      title: "Attendance locked",
      html: problems.slice(0, 20).map(escapeHtml).join("<br/>"),
    });

  const refresh = () =>
    fetchAttendanceData(misdata.EMPCODE!, misdata.month!, misdata.year!);

  const handleSearch = () => {
    if (!misdata.month) return showSideAlert("Please select a month", "error");
    if (!misdata.year) return showSideAlert("Please select a year", "error");
    if (!misdata.EMPCODE)
      return showSideAlert("Please select an employee", "error");
    fetchAttendanceData(misdata.EMPCODE, misdata.month, misdata.year);
  };

  /* ---------------- Row selection ---------------- */

  const toggleRowSelection = (row: any) => {
    const key = rowKeyOf(row);
    setSelectedRowsTable((prev) =>
      prev.some((r) => rowKeyOf(r) === key)
        ? prev.filter((r) => rowKeyOf(r) !== key)
        : [...prev, row],
    );
  };

  const handleRowClick = useCallback(
    (row: any) => {
      if (!row) return;
      if (isMultiMode) {
        toggleRowSelection(row);
        return;
      }

      const day = dateOnly(row.dateoffice);
      const reasonValue =
        row.mipunch_reason !== undefined &&
          row.mipunch_reason !== null &&
          row.mipunch_reason !== ""
          ? String(row.mipunch_reason)
          : null;

      setMiscdata((prev) => ({
        ...prev,
        startDate: day,
        endDate: day,
        AttdenceDate2: day,
        ...timesForReason(row, reasonValue, MPList),
        MP_Remark: row.MI_Remark ? String(row.MI_Remark) : "",
        SPL_REMARK: row.SPL_REMARK || "",
        MP_Reason: reasonValue,
        shift: row.shift ? String(row.shift) : null,
      }));

      setInSlipPreview(
        row.Mispunch_In_Image
          ? `${FILE_BASE_URL}?filePath=${row.Mispunch_In_Image}`
          : null,
      );
      setOutSlipPreview(
        row.Mispunch_Out_Image
          ? `${FILE_BASE_URL}?filePath=${row.Mispunch_Out_Image}`
          : null,
      );
      setSelectedRow(row);
    },
    [isMultiMode, MPList],
  );

  // Changing the reason re-applies times for the selected row, as production does.
  useEffect(() => {
    if (!selectedRow || !misdata.MP_Reason) return;
    setMiscdata((prev) => ({
      ...prev,
      ...timesForReason(selectedRow, misdata.MP_Reason, MPList),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misdata.MP_Reason, MPList]);

  const handleMispunchData = (name: string, value: any) => {
    setMiscdata((prev) => ({ ...prev, [name]: value }));
  };

  const pickSlip = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void,
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setFile(file);
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview((e.target?.result as string) ?? null);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    event.target.value = "";
  };

  /* ---------------- Slip upload ---------------- */

  // Returns true on success (or when there is nothing to upload).
  // Shows an error toast on failure, as production does.
  const uploadSlips = async ({
    isSick,
    empCode,
    startDate,
    endDate,
  }: {
    isSick: boolean;
    empCode: string | null;
    startDate: string | null;
    endDate: string | null;
  }): Promise<boolean> => {
    if (!inSlipFile && !outSlipFile) return true;

    const formData = new FormData();
    if (isSick) {
      if (inSlipFile) formData.append("SickLeave1", inSlipFile);
      if (outSlipFile) formData.append("SickLeave2", outSlipFile);
    } else {
      if (inSlipFile) formData.append("punchIn", inSlipFile);
      if (outSlipFile) formData.append("punchOut", outSlipFile);
    }
    formData.append("type", isSick ? "sickleave" : "Misspunch");
    formData.append("empCode", empCode || "");
    formData.append("startDate", startDate || "");
    formData.append("endDate", endDate || "");
    formData.append("Comp_Code", compcode || "");

    try {
      const res = await axios.post(`${API_URL}/ars/uploadMisspunch`, formData, {
        headers: { "Content-Type": "multipart/form-data", compcode },
      });
      if (res.status !== 200 || res.data?.status === false) {
        throw new Error(res.data?.Message || "Slip upload failed");
      }
      return true;
    } catch (error) {
      showSideAlert(
        getErrorMessage(
          error,
          "Error while submitting request please try again later",
        ),
        "error",
      );
      return false;
    }
  };

  /* ---------------- Single-day punch update ---------------- */

  const handleUpdatePunch = async () => {
    if (blockIfRerunning()) return;

    if (!selectedRow) {
      showSideAlert("Please pick a day from the table first", "warning");
      return;
    }
    if (!misdata.MP_Reason || !misdata.MP_Remark) {
      showSideAlert("Please select mispunch reason and remark", "error");
      return;
    }

    if (!isLeaveReason) {
      if (!isValidTime(misdata.InTime) || !isValidTime(misdata.OutTime)) {
        showSideAlert("Please provide both valid InTime and OutTime", "error");
        return;
      }
      if (toMinutes(misdata.OutTime!) < toMinutes(misdata.InTime!)) {
        showSideAlert("Out Time cannot be earlier than In Time.", "error");
        return;
      }
    }

    const roleOverride = !!user?.role1?.includes?.(BACKDATE_OVERRIDE_ROLE);
    if (isBackDateBlocked(selectedRow.dateoffice, reasonRow, compdata, roleOverride)) {
      Swal.fire({
        icon: "error",
        title: "Permission Denied",
        text: "You do not have permission to update this back-date miss punch.",
      });
      return;
    }

    if (isSickReason && isDocMandatory && !hasSlip) {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "Please upload at least one document for Sick Leave.",
      });
      return;
    }

    const day = dateOnly(selectedRow.dateoffice) as string;

    if (isFutureDate(day)) {
      showSideAlert("Future dates cannot be marked", "error");
      return;
    }

    const lockProblems = await findLockProblems(misdata.EMPCODE!, [day]);
    if (lockProblems.length) {
      showLockPopup(lockProblems);
      return;
    }

    const label = reasonRow?.label || misdata.MP_Reason;
    const confirmed = await Swal.fire({
      icon: "warning",
      title: `Applying ${label}`,
      text: `Do you want to proceed for date ${selectedRow.formatted_dateoffice || day}?`,
      confirmButtonText: "Yes, Update",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
    });
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/ars/UpdateInOutchange`,
        {
          UTD: selectedRow.UTD,
          dateoffice: selectedRow.dateoffice,
          InTime: isLeaveReason ? null : `${day} ${misdata.InTime}:00`,
          OutTime: isLeaveReason ? null : `${day} ${misdata.OutTime}:00`,
          MP_Reason: misdata.MP_Reason,
          MP_Remark: misdata.MP_Remark,
          SPL_REMARK: misdata.SPL_REMARK,
          Mis_Enterby: userName,
          Empcode: misdata.EMPCODE,
        },
        { headers: { compcode, name: userName } },
      );

      if (!isOk(res.data)) {
        Swal.fire({
          icon: "error",
          title: "Failed!",
          text: res.data?.Message || "MisPunch update failed.",
        });
        return;
      }

      const slipsOk = await uploadSlips({
        isSick: isSickReason,
        empCode: misdata.EMPCODE,
        startDate: day,
        endDate: day,
      });

      if (!slipsOk) {
        Swal.fire({
          icon: "warning",
          title: "Punch saved, slip failed",
          text: "The punch was updated, but the slip upload failed. Upload the slip again from this row.",
        });
        await refresh();
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "MisPunch Updated.",
        confirmButtonColor: "#10B981",
      });
      await refresh();
    } catch (error) {
      console.error("Error in UpdateInOutchange:", error);
      showSideAlert(
        getErrorMessage(error, "An error occurred while updating punch."),
        "error",
      );
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Range punch update (production ChangeMisPunch) ---------------- */

  const handleRangePunch = async () => {
    if (blockIfRerunning()) return;

    if (!selectedRow) {
      showSideAlert("Pick a day from the table first", "warning");
      return;
    }
    if (!misdata.MP_Reason || !misdata.MP_Remark) {
      showSideAlert(
        "Please select mispunch reason and Misspunch Remark",
        "error",
      );
      return;
    }
    if (!isValidTime(misdata.InTime) || !isValidTime(misdata.OutTime)) {
      showSideAlert("Please provide both valid InTime and OutTime", "error");
      return;
    }
    if (toMinutes(misdata.OutTime!) < toMinutes(misdata.InTime!)) {
      showSideAlert("Out Time cannot be earlier than In Time.", "error");
      return;
    }
    if (!misdata.startDate || !misdata.endDate) {
      showSideAlert("Please select From Date and UpTo Date", "error");
      return;
    }
    if (isAfterDate(misdata.startDate, misdata.endDate)) {
      showSideAlert("From Date Cannot Be Greater Than Upto Date", "error");
      return;
    }

    const windowError = checkDateWindow({
      start: misdata.startDate,
      end: misdata.endDate,
      selectedMonth: Number(misdata.month),
      allowedFrom: miscDtl1,
      allowedTo: miscDtl2,
    });
    if (windowError) {
      showSideAlert(windowError, "error");
      return;
    }

    const days = eachDate(misdata.startDate, misdata.endDate);

    if (days.some(isFutureDate)) {
      showSideAlert("Future dates cannot be marked", "error");
      return;
    }

    // Back-date rule checks every day in the range, not only the start.
    const roleOverride = !!user?.role1?.includes?.(BACKDATE_OVERRIDE_ROLE);
    if (
      days.some((d) => isBackDateBlocked(d, reasonRow, compdata, roleOverride))
    ) {
      Swal.fire({
        icon: "error",
        title: "Permission Denied",
        text: "You do not have permission to update this back-date miss punch.",
      });
      return;
    }

    if (isSickReason && isDocMandatory && !hasSlip) {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "Please upload at least one document for Sick Leave.",
      });
      return;
    }

    const lockProblems = await findLockProblems(misdata.EMPCODE!, days);
    if (lockProblems.length) {
      showLockPopup(lockProblems);
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Update Multiple Mispunch",
      text: `Apply to ${misdata.startDate} → ${misdata.endDate}. This action cannot be undone.`,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });
    if (!confirmed.isConfirmed) return;

    // Time date part comes from the selected row, as the old code did.
    // Backend must confirm it expects this for every day in the range.
    const day = dateOnly(selectedRow.dateoffice);

    setIsBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/ars/ChangeMisPunch`,
        {
          Empcode: misdata.EMPCODE,
          startDate: misdata.startDate,
          endDate: misdata.endDate,
          InTime: `${day} ${misdata.InTime}:00`,
          OutTime: `${day} ${misdata.OutTime}:00`,
          MP_Reason: misdata.MP_Reason,
          MP_Remark: misdata.MP_Remark,
          SPL_REMARK: misdata.SPL_REMARK,
          Mis_Enterby: userName,
        },
        { headers: { compcode, name: userName } },
      );

      if (!isOk(res.data)) {
        Swal.fire({
          icon: "error",
          title: "Failed!",
          text: res.data?.Message || "MisPunch update failed.",
        });
        return;
      }

      const slipsOk = await uploadSlips({
        isSick: isSickReason,
        empCode: misdata.EMPCODE,
        startDate: misdata.startDate,
        endDate: misdata.endDate,
      });

      if (!slipsOk) {
        Swal.fire({
          icon: "warning",
          title: "Punch saved, slip failed",
          text: "The range was updated, but the slip upload failed.",
        });
        await refresh();
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "MisPunch Updated.",
        confirmButtonColor: "#10B981",
      });
      await refresh();
    } catch (error) {
      showSideAlert(
        getErrorMessage(error, "An error occurred while updating the Mispunch."),
        "error",
      );
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Single-day shift change (production Updateshiftchange1) ---------------- */

  const handleSingleShiftChange = async () => {
    if (blockIfRerunning()) return;

    if (!selectedRow) {
      showSideAlert("Select one row from table to update shift", "error");
      return;
    }
    if (!misdata.shift) {
      showSideAlert("Please choose a shift to apply", "error");
      return;
    }

    const day = dateOnly(selectedRow.dateoffice) as string;

    if (isFutureDate(day)) {
      showSideAlert("Future dates cannot be marked", "error");
      return;
    }

    if (shiftLockDate && isBeforeDate(day, shiftLockDate)) {
      showSideAlert(`Shift change not allowed before ${shiftLockDate}`, "error");
      return;
    }

    // Production checked the range fields here, which could be stale. The selected day is checked instead.
    const windowError = checkDateWindow({
      start: day,
      end: day,
      selectedMonth: Number(misdata.month),
      allowedFrom: miscDtl1,
      allowedTo: miscDtl2,
    });
    if (windowError) {
      showSideAlert(windowError, "error");
      return;
    }

    if (Number(compdata?.Is_Shift_PastDate_Updation) === 1 && isBackDated(day)) {
      showSideAlert("You cannot select a past date!", "error");
      return;
    }

    const lockProblems = await findLockProblems(misdata.EMPCODE!, [day]);
    if (lockProblems.length) {
      showLockPopup(lockProblems);
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Update Shift",
      text: `Update shift for date ${selectedRow.formatted_dateoffice || day}?`,
      confirmButtonText: "Yes, Update",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
    });
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/ars/ChangeShiftTime`,
        {
          Empcode: misdata.EMPCODE,
          startDate: day,
          endDate: day,
          shift: misdata.shift,
          Shift_Enterby: userName,
          loc_code: userBranch,
          create_user: userEmp,
        },
        { headers: { compcode, name: userName, mod_user: userId } },
      );

      if (res.data?.success === true) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.data?.Message || "Shift Time Updated.",
          confirmButtonColor: "#10B981",
        });
      } else {
        showSideAlert(res.data?.Message || "Shift update failed.", "error");
      }
      await refresh();
    } catch (error) {
      showSideAlert(
        getErrorMessage(error, "An error occurred while updating shift time."),
        "error",
      );
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Range shift change (production Updateshiftchange) ---------------- */

  const handleRangeShiftChange = async () => {
    if (blockIfRerunning()) return;

    const { startDate, endDate } = misdata;
    if (!misdata.shift) {
      showSideAlert("Please provide Shift Time", "error");
      return;
    }
    if (!startDate) {
      showSideAlert("Select From Date", "error");
      return;
    }
    if (!endDate) {
      showSideAlert("Select From Upto Date", "error");
      return;
    }
    if (isAfterDate(startDate, endDate)) {
      showSideAlert("From Date Cannot Be Greater Than Upto Date", "error");
      return;
    }

    const days = eachDate(startDate, endDate);

    if (days.some(isFutureDate)) {
      showSideAlert("Future dates cannot be marked", "error");
      return;
    }

    if (
      shiftLockDate &&
      (isBeforeDate(startDate, shiftLockDate) ||
        isBeforeDate(endDate, shiftLockDate))
    ) {
      showSideAlert(`Shift change not allowed before ${shiftLockDate}`, "error");
      return;
    }

    const windowError = checkDateWindow({
      start: startDate,
      end: endDate,
      selectedMonth: Number(misdata.month),
      allowedFrom: miscDtl1,
      allowedTo: miscDtl2,
    });
    if (windowError) {
      showSideAlert(windowError, "error");
      return;
    }

    if (Number(compdata?.Is_Shift_PastDate_Updation) === 1) {
      if (isBackDated(startDate)) {
        showSideAlert("You cannot select a past date in From!", "error");
        return;
      }
      if (isBackDated(endDate)) {
        showSideAlert("You cannot select a past date in Upto!", "error");
        return;
      }
    }

    const lockProblems = await findLockProblems(misdata.EMPCODE!, days);
    if (lockProblems.length) {
      showLockPopup(lockProblems);
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Update Multiple Shift",
      text: `Apply shift to ${startDate} → ${endDate}. This action cannot be undone.`,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/ars/ChangeShiftTime`,
        {
          Empcode: misdata.EMPCODE,
          startDate,
          endDate,
          shift: misdata.shift,
          Shift_Enterby: userName,
          loc_code: userBranch,
          create_user: userEmp,
        },
        { headers: { compcode, name: userName, mod_user: userId } },
      );

      if (res.data?.success === true) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: res.data?.Message || "Shift Time Updated.",
          confirmButtonColor: "#10B981",
        });
      } else {
        showSideAlert(res.data?.Message || "Shift update failed.", "error");
      }
      await refresh();
    } catch (error) {
      showSideAlert(
        getErrorMessage(error, "An error occurred while updating the shift time."),
        "error",
      );
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Bulk multi-select apply ---------------- */

  const handleApplyBulk = async () => {
    if (blockIfRerunning()) return;

    const rows = selectedRowsTable;
    if (rows.length === 0) {
      showSideAlert("Please select at least one day from table", "warning");
      return;
    }
    if (!bulkReason) {
      showSideAlert("Please select a mispunch reason for bulk update", "warning");
      return;
    }
    if (!bulkRemark) {
      showSideAlert("Please select a remark for bulk update", "warning");
      return;
    }

    const reason = MPList.find((r) => String(r.value) === String(bulkReason));
    const isLeave = leaveTypeValues.includes(String(bulkReason));
    const isFixed = Number(reason?.Misc_Num1) === 1;
    const isSick = SICK_LEAVE_REASONS.includes(Number(bulkReason));

    if (isSick && isDocMandatory) {
      showSideAlert(
        "Sick leave needs documents. Enter those days one at a time.",
        "error",
      );
      return;
    }
    if (!isLeave && !isFixed) {
      if (!isValidTime(bulkIn) || !isValidTime(bulkOut)) {
        showSideAlert("Please provide both valid In and Out times", "error");
        return;
      }
      if (toMinutes(bulkOut) < toMinutes(bulkIn)) {
        showSideAlert("Out Time cannot be earlier than In Time.", "error");
        return;
      }
    }

    // Future dates are blocked before anything else is checked.
    const futureRows = rows
      .map((r) => dateOnly(r.dateoffice) || "")
      .filter((d) => isFutureDate(d));
    if (futureRows.length) {
      Swal.fire({
        icon: "error",
        title: "Future dates cannot be marked",
        html: futureRows.map(escapeHtml).join("<br/>"),
      });
      return;
    }

    // Row-level checks before anything is sent.
    // Back-date uses the company setting (back_date_mipunch_allowed) and the role override.
    const roleOverride = !!user?.role1?.includes?.(BACKDATE_OVERRIDE_ROLE);
    const problems: string[] = [];
    rows.forEach((row) => {
      const day = dateOnly(row.dateoffice) || "";
      if (isBackDateBlocked(day, reason, compdata, roleOverride)) {
        problems.push(`${day}: back-dated entry not permitted`);
      }
      if (shiftLockDate && isBeforeDate(day, shiftLockDate)) {
        problems.push(`${day}: before shift lock date`);
      }
      const windowError = checkDateWindow({
        start: day,
        end: day,
        selectedMonth: Number(misdata.month),
        allowedFrom: miscDtl1,
        allowedTo: miscDtl2,
      });
      if (windowError) problems.push(`${day}: ${windowError}`);
    });
    if (problems.length) {
      Swal.fire({
        icon: "error",
        title: "Cannot apply",
        html: problems.slice(0, 20).map(escapeHtml).join("<br/>"),
      });
      return;
    }

    // Attendance lock check for every selected day, before any request is sent.
    const lockProblems = await findLockProblems(
      misdata.EMPCODE!,
      rows.map((r) => dateOnly(r.dateoffice) || ""),
    );
    if (lockProblems.length) {
      showLockPopup(lockProblems);
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: `Apply to ${rows.length} Selected Days?`,
      text:
        isLeave || isFixed
          ? "Apply the reason to all selected days?"
          : `Set In Time ${bulkIn} and Out Time ${bulkOut} across all selected days?`,
      confirmButtonText: "Yes, Apply",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
    });
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    const failures: string[] = [];
    let okCount = 0;
    try {
      for (const row of rows) {
        const day = dateOnly(row.dateoffice) as string;
        const times = isFixed
          ? {
            In: formatShiftDecimal(row.shiftstarttime),
            Out: formatShiftDecimal(row.shiftendtime),
          }
          : { In: bulkIn, Out: bulkOut };
        try {
          const res = await axios.post(
            `${API_URL}/ars/UpdateInOutchange`,
            {
              UTD: row.UTD,
              dateoffice: row.dateoffice,
              InTime: isLeave ? null : `${day} ${times.In}:00`,
              OutTime: isLeave ? null : `${day} ${times.Out}:00`,
              MP_Reason: bulkReason,
              MP_Remark: bulkRemark,
              SPL_REMARK: bulkSplRemark,
              Mis_Enterby: userName,
              Empcode: misdata.EMPCODE,
            },
            { headers: { compcode, name: userName } },
          );
          if (isOk(res.data)) okCount++;
          else failures.push(`${day}: ${res.data?.Message || "rejected"}`);
        } catch (error) {
          failures.push(`${day}: ${getErrorMessage(error, "failed")}`);
        }
      }

      // Title and icon follow the real result.
      const allOk = okCount === rows.length;
      const noneOk = okCount === 0;
      Swal.fire({
        icon: allOk ? "success" : noneOk ? "error" : "warning",
        title: allOk
          ? "Bulk Update Complete"
          : noneOk
            ? "Bulk Update Failed"
            : "Bulk Update Partially Complete",
        html:
          `Updated ${okCount} of ${rows.length} selected days.` +
          (failures.length
            ? "<br/><br/><b>Failed:</b><br/>" +
            failures.map(escapeHtml).join("<br/>")
            : ""),
        confirmButtonColor: "#10B981",
      });
      setSelectedRowsTable([]);
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };
  /* ---------------- Manual day reset ---------------- */

  const handleResetManualDay = async () => {
    if (blockIfRerunning()) return;

    if (!misdata.EMPCODE) {
      showSideAlert("Please select employee code", "error");
      return;
    }
    if (!misdata.AttdenceDate2) {
      showSideAlert("Please select an attendance date from table", "error");
      return;
    }

    if (isFutureDate(misdata.AttdenceDate2)) {
      showSideAlert("Future dates cannot be marked", "error");
      return;
    }

    const windowError = checkDateWindow({
      start: misdata.AttdenceDate2,
      end: misdata.AttdenceDate2,
      selectedMonth: Number(misdata.month),
      allowedFrom: miscDtl1,
      allowedTo: miscDtl2,
    });
    if (windowError) {
      showSideAlert(windowError, "error");
      return;
    }

    const lockProblems = await findLockProblems(misdata.EMPCODE, [
      misdata.AttdenceDate2,
    ]);
    if (lockProblems.length) {
      showLockPopup(lockProblems);
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Reset Manual Punch?",
      text: `Reset manual punch for ${misdata.AttdenceDate2}? Machine punch will be restored.`,
      confirmButtonText: "Yes, Reset",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#E11D48",
    });
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    try {
      const res = await axios.post(
        `${API_URL}/ars/resetManualAttendance`,
        {
          empcode: misdata.EMPCODE,
          dateoffice: misdata.AttdenceDate2,
          ResetBy: userEmp,
        },
        { headers: { compcode, name: userName } },
      );

      if (isOk(res.data) || res.data?.success === true) {
        Swal.fire({
          icon: "success",
          title: "Reset Completed",
          text: res.data?.Message || "Manual attendance reset successfully.",
          confirmButtonColor: "#10B981",
        });
      } else {
        // Show the server reason instead of failing silently.
        Swal.fire({
          icon: "error",
          title: "Reset Failed",
          text: res.data?.Message || "Manual attendance could not be reset.",
        });
      }
      await refresh();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: getErrorMessage(error),
      });
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Weekly off ---------------- */

  const handleWeeklyOffChange = async () => {
    if (blockIfRerunning()) return;

    if (!misdata.EMPCODE) {
      showSideAlert("Please select employee code", "warning");
      return;
    }
    if (!misdata.weekdays) {
      showSideAlert("Please select weekdays", "warning");
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Update Weekly Off",
      text: "This action will update the default weekly off for this month. Proceed?",
      confirmButtonText: "Yes, Update",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
    });
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    try {
      await axios.post(
        `${API_URL}/ars/changeweeklyoff`,
        {
          EMPCODE: misdata.EMPCODE,
          weekdays: misdata.weekdays,
          month: misdata.month,
          year: misdata.year,
        },
        { headers: { compcode, name: userName } },
      );
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Weekly Off Updated Successfully.",
        confirmButtonColor: "#10B981",
      });
      await refresh();
    } catch (error) {
      showSideAlert(
        getErrorMessage(error, "Failed to update weekly off."),
        "error",
      );
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Re-run attendance ---------------- */

  const handleReRun = async () => {
    if (!misdata.EMPCODE) {
      showSideAlert("Please select an employee first", "warning");
      return;
    }

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Re-run Attendance Calculation?",
      text: `Recalculate attendance policy for ${misdata.Name || misdata.EMPCODE} (${misdata.month}/${misdata.year})?`,
      confirmButtonText: "Yes, Re-Run",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
    });
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    try {
      await axios.post(
        `${API_URL}/ars/Emp_Atnrun`,
        {
          EMPCODE: misdata.EMPCODE,
          Month: misdata.month,
          Year: misdata.year,
          Created_by: userEmp || userId,
        },
        { headers: { compcode, name: userName } },
      );
      Swal.fire({
        icon: "success",
        title: "Re-Run In Progress",
        text: "Attendance Re-Run In Process. It may take 1-2 minutes.",
        confirmButtonColor: "#4F46E5",
      });
      // Banner and edit guard start now.
      setEmpRunning(true);
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Reset whole month ---------------- */

  const handleResetMonth = async () => {
    if (blockIfRerunning()) {
      setConfirmResetOpen(false);
      return;
    }

    if (!misdata.EMPCODE) {
      showSideAlert("Please select an employee first", "warning");
      return;
    }

    setConfirmResetOpen(false);
    setIsBusy(true);
    try {
      const empId = misdata.EMPCODE;
      const lastDay = new Date(
        Number(misdata.year),
        Number(misdata.month),
        0,
      ).getDate();
      const dateFrom = `${misdata.year}-${misdata.month}-01`;
      const dateTo = `${misdata.year}-${misdata.month}-${pad(lastDay)}`;

      // 1. Attendance range check
      const rangeRes = await axios.post(
        `${API_URL}/ars/getOnlyFormattedDates`,
        {
          empcode: empId,
          month: Number(misdata.month),
          year: Number(misdata.year),
        },
        { headers: { compcode } },
      );
      if (!(rangeRes.data?.Dates || []).length) {
        Swal.fire({
          icon: "warning",
          title: "Attendance Not Found",
          text: "Attendance is not available for the selected month.",
        });
        return;
      }

      // 2. Lock check
      const lockRes = await axios.post(
        `${API_URL}/ars/attandancelockedOrNot`,
        {
          checkDate: dateTo,
          selectedLocations: 1,
          regionCode: 1,
          EMPCODE: empId,
        },
        { headers: { compcode } },
      );
      if (!lockRes.data?.Status) {
        Swal.fire({
          icon: "error",
          title: "Attendance Locked",
          text: lockRes.data?.Message || "Salary / attendance has been locked.",
        });
        return;
      }

      // 3. Reset raw punches
      const updateRes = await axios.post(
        `${API_URL}/ars/updateRawPunchImport`,
        { Emp_Id: empId, DATE_FROM: dateFrom, DATE_TO: dateTo },
        { headers: { compcode } },
      );
      if (updateRes.data?.Status) {
        Swal.fire({
          icon: "success",
          title: "Reset Successful",
          text:
            updateRes.data?.Message || "Attendance reset to raw machine logs.",
          confirmButtonColor: "#10B981",
        });
        await refresh();
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: updateRes.data?.Message,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: getErrorMessage(error),
      });
    } finally {
      setIsBusy(false);
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="relative w-full min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col font-sans pb-32 overflow-hidden">
      {/* Ambient background glass glowing orbs (Frosted Glass luxury depth) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-[130px] dark:bg-indigo-600/15" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-[#0EA5E9]/10 blur-[130px] dark:bg-[#0284C7]/12" />
        <div className="absolute bottom-20 left-1/3 w-96 h-96 rounded-full bg-emerald-500/8 blur-[140px] dark:bg-purple-600/10" />
      </div>

      <main className="relative z-10 flex-1 p-3 sm:p-6 space-y-4 max-w-[1850px] w-full mx-auto">
        {/* 1. Title and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Manual attendance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Correct an employee's punched month by hand. Pick a day to edit
              in-time, out-time, mispunch reason or shift, or select multiple
              days to apply the same punch.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <AButton
              variant="outline"
              size="sm"
              onClick={handleReRun}
              icon={
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              }
              className="h-9 px-3 rounded-xl text-xs font-semibold shadow-2xs"
              title="Re-calculate attendance for this month"
            >
              <span>Re-run attendance</span>
            </AButton>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-transparent text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Discard manual corrections and restore machine punches"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset month</span>
            </button>

            <AButton
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="h-9 px-3 rounded-xl text-xs font-semibold shadow-2xs"
            >
              <span>Back</span>
            </AButton>
          </div>
        </div>

        {/* 2. Filter bar */}
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[140px_130px_minmax(0,1fr)_auto_auto] gap-3 items-end">
            <div className="w-full min-w-0">
              <Eselect
                title="MONTH"
                name="month"
                option={MONTH_OPTIONS}
                initialValue={misdata.month}
                handleInputChange={handleMispunchData}
                ShortName
                className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl font-medium w-full"
                labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              />
            </div>

            <div className="w-full min-w-0">
              <Eselect
                title="YEAR"
                name="year"
                option={YEAR_OPTIONS}
                initialValue={misdata.year}
                handleInputChange={handleMispunchData}
                ShortName
                className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl font-medium w-full"
                labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              />
            </div>

            <div className="w-full min-w-0">
              <Eselect
                title="EMPLOYEE"
                name="EMPCODE"
                option={employeeOptions}
                initialValue={misdata.EMPCODE}
                handleInputChange={handleMispunchData}
                ShortName
                placeholder="Select employee code or name..."
                className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl font-medium w-full"
                labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
              />
            </div>

            <div className="flex items-center gap-2">
              <AButton
                variant="primary"
                size="md"
                onClick={handleSearch}
                icon={<Search className="w-4 h-4" />}
                className="h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
              >
                Search
              </AButton>
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsMultiMode((prev) => !prev);
                  setSelectedRowsTable([]);
                }}
                className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all shadow-xs cursor-pointer ${isMultiMode
                    ? "bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-500 dark:text-indigo-300"
                    : "bg-white dark:bg-[#0B1220] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
              >
                <ListChecks className="w-4 h-4" />
                <span>
                  {isMultiMode ? "Exit multi-select" : "Multiple entry"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowLeaveSummary((prev) => !prev)}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
              >
                {showLeaveSummary ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>Leave balance</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Leave balance */}
        {showLeaveSummary && (
          <div className="bg-white/90 dark:bg-[#0c1322]/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Leave summary · {misdata.Name || misdata.EMPCODE || "Employee"}
              </span>
              <button
                type="button"
                onClick={() => setShowLeaveSummary(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
              >
                Hide
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {leavedata.map((leave: any) => (
                <div
                  key={leave.Leave_Type}
                  className="rounded-xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-4 bg-slate-50/70 dark:bg-white/[0.04] backdrop-blur-sm shadow-2xs"
                >
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{leave.Leave_TypeName}</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: leave.tint }}
                    />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className="text-2xl font-bold tracking-tight"
                      style={{ color: leave.tint }}
                    >
                      {leave.Cl_Bal ?? 0}
                    </span>
                    <span className="text-xs text-slate-400">closing bal</span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-white/10 grid grid-cols-3 text-[10.5px] text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block opacity-70">Op:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                        {leave.Op_Bal ?? 0}
                      </strong>
                    </div>
                    <div>
                      <span className="block opacity-70">Gen:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                        {leave.Gen_Lev ?? 0}
                      </strong>
                    </div>
                    <div>
                      <span className="block opacity-70">Avail:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                        {leave.Avail_Lev ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3b. Attendance summary (paid days). Shown whenever the company flag is 1. */}
        {showAttnSummary && (
          <div className="bg-white/95 dark:bg-[#0c1322]/85 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Attendance Summary (Paid Days)
                </span>
                {(misdata.Name || misdata.EMPCODE) && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200 border border-slate-200 dark:border-white/10 backdrop-blur-sm">
                    {misdata.EMPCODE ? `${misdata.EMPCODE} - ` : ""}{misdata.Name || "Employee"}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Monthly Breakdown
              </span>
            </div>

            {paidDays.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No paid-day summary for this employee and month.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 sm:gap-3">
                {paidDays.map(([key, value]) => {
                  const meta = getPaidDayMeta(key, value);
                  const Icon = meta.Icon;

                  return (
                    <div
                      key={key}
                      className={`relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-b ${meta.gradient} bg-white dark:bg-white/[0.03] backdrop-blur-md p-3 flex flex-col justify-between gap-2.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-default ${meta.accentBg}`}
                    >
                      {/* Top Header: Label & Styled Logo */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate" title={meta.label}>
                          {meta.label}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-200 shadow-2xs ${meta.iconWrap}`}
                        >
                          <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      </div>

                      {/* Value Count */}
                      <div className="flex items-baseline justify-between pt-0.5">
                        <span
                          className={`text-xl sm:text-2xl font-black tracking-tight font-sans ${meta.valueColor}`}
                        >
                          {value ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. Table and inspector */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-4 items-start">
          {/* LEFT: monthly table */}
          <div className="flex flex-col">
            <AttendanceDataTable
              title={
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    Attendance Table
                  </span>
                  {misdata.Name && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200 border border-slate-200 dark:border-white/10 backdrop-blur-sm">
                      {misdata.EMPCODE} - {misdata.Name}
                    </span>
                  )}
                  {punchTypeLabel && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FEFCE8] text-[#854D0E] dark:bg-[#78350F]/40 dark:text-[#FDE68A] border border-[#FDE047] dark:border-[#D97706]/40 shadow-2xs backdrop-blur-sm">
                      {punchTypeLabel}
                    </span>
                  )}
                  {empRunning && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF9C3] dark:bg-[#78350F]/40 border border-[#FDE047] dark:border-[#D97706]/40 text-[#854D0E] dark:text-[#FDE68A] shadow-2xs backdrop-blur-sm animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                      <span>Attn Policy is under Rerun Process... plz wait</span>
                    </span>
                  )}
                </div>
              }
              subtitle="Sample records for illustration. Rows are coloured by status, with rejected rows first in priority."
              headerSearch={
                <input
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search rows..."
                  className="h-8 px-2.5 w-56 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all shadow-2xs backdrop-blur-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              }
              headerStats={
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {monthStats.map((st) => (
                    <span
                      key={st.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 whitespace-nowrap shadow-2xs backdrop-blur-sm"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: st.tint }}
                      />
                      <span className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300">
                        {st.label}
                      </span>
                      <strong className="text-slate-800 dark:text-slate-100 font-bold text-[11.5px]">
                        {st.value}
                      </strong>
                    </span>
                  ))}
                </div>
              }
              bulkActions={
                isMultiMode ? (
                  <div className="px-4 py-2.5 bg-indigo-50/90 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-900 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                      {selectedRowsTable.length} days selected
                    </span>
                    <span className="h-4 w-px bg-indigo-300 dark:bg-indigo-700" />

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={bulkIn}
                        onChange={(e) => setBulkIn(e.target.value)}
                        disabled={
                          isLeaveReasonBulk(bulkReason, leaveTypeValues) ||
                          isFixedBulk(bulkReason, MPList)
                        }
                        className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium disabled:opacity-50"
                        title="Bulk In Time"
                      />
                      <span className="text-xs text-slate-400">–</span>
                      <input
                        type="time"
                        value={bulkOut}
                        onChange={(e) => setBulkOut(e.target.value)}
                        disabled={
                          isLeaveReasonBulk(bulkReason, leaveTypeValues) ||
                          isFixedBulk(bulkReason, MPList)
                        }
                        className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium disabled:opacity-50"
                        title="Bulk Out Time"
                      />
                    </div>

                    <select
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium max-w-[180px]"
                    >
                      <option value="">Select Reason...</option>
                      {MPList.map((item: any) => (
                        <option key={String(item.value)} value={String(item.value)}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={bulkRemark}
                      onChange={(e) => setBulkRemark(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium max-w-[180px]"
                    >
                      <option value="">Select Remark...</option>
                      {MPRemarksList.map((item: any) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={bulkSplRemark}
                      onChange={(e) => setBulkSplRemark(e.target.value)}
                      placeholder="Payroll remark (optional)"
                      className="h-8 px-2 w-48 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    />

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedRowsTable([])}
                        className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyBulk}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Apply to selected</span>
                      </button>
                    </div>
                  </div>
                ) : undefined
              }
              columns={MONTH_COLUMNS}
              data={filteredRows}
              selectedRow={selectedRow}
              onRowClick={handleRowClick}
              onRowDoubleClick={handleRowClick}
              showCheckbox={true}
              isMultiMode={isMultiMode}
              selectedRows={selectedRowsTable}
              onSelectedRowsChange={setSelectedRowsTable}
              empRunning={empRunning}
              initialPageSize={pageSize}
              onPageSizeChange={setPageSize}
              height={580}
              columnsDownload={EXPORT_COLUMNS}
              onExportAll={() => tabledata}
            />
          </div>

          {/* RIGHT: inspector */}
          <div className="sticky top-[75px] space-y-3.5">
            {/* Card 1: edit day */}
            <div className="bg-white/90 dark:bg-[#0c1322]/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Edit Day
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedRow
                    ? `${selectedRow.formatted_dateoffice || dateOnly(selectedRow.dateoffice)} · ${getDayLabel(selectedRow.formatted_dateoffice || selectedRow.dateoffice)}`
                    : "—"}
                </span>
              </div>

              {!selectedRow ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 border border-slate-200 dark:border-slate-700">
                    <MousePointerClick className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-xs text-slate-700 dark:text-slate-300 mt-3">
                    Pick a day from the table
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Click any attendance row to edit in-time, out-time, mispunch
                    reason or shift.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 mt-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Einput
                      title="IN TIME"
                      type="time"
                      name="InTime"
                      value={misdata.InTime || ""}
                      handleInputChange={handleMispunchData}
                      disabled={timeInputsLocked}
                      ShortName
                      className="!h-9 rounded-xl font-medium w-full text-xs"
                      labelClassName="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
                    />
                    <Einput
                      title="OUT TIME"
                      type="time"
                      name="OutTime"
                      value={misdata.OutTime || ""}
                      handleInputChange={handleMispunchData}
                      disabled={timeInputsLocked}
                      ShortName
                      className="!h-9 rounded-xl font-medium w-full text-xs"
                      labelClassName="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs">
                    <Clock className={`w-4 h-4 shrink-0 ${calcTint}`} />
                    <span className="flex-1 min-w-0 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {calcLine}
                    </span>
                    <strong
                      className={`font-mono font-bold text-xs shrink-0 ${calcTint}`}
                    >
                      {fmtMins(dynamicMinutes)}
                    </strong>
                  </div>

                  <Eselect
                    title="MISPUNCH REASON"
                    name="MP_Reason"
                    option={MPList.map((m: any) => ({
                      value: String(m.value),
                      label: m.label,
                    }))}
                    initialValue={misdata.MP_Reason}
                    handleInputChange={handleMispunchData}
                    ShortName
                    placeholder="Select reason..."
                    className="!h-9 rounded-xl font-medium w-full text-xs"
                    labelClassName="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
                  />

                  <Eselect
                    title="REMARK"
                    name="MP_Remark"
                    option={MPRemarksList}
                    initialValue={misdata.MP_Remark}
                    handleInputChange={handleMispunchData}
                    ShortName
                    placeholder="Select remark..."
                    className="!h-9 rounded-xl font-medium w-full text-xs"
                    labelClassName="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
                  />

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Special Remark For Payroll
                    </label>
                    <textarea
                      rows={2}
                      value={misdata.SPL_REMARK || ""}
                      onChange={(e) =>
                        handleMispunchData("SPL_REMARK", e.target.value)
                      }
                      placeholder="Visible to the payroll approver..."
                      maxLength={200}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Slip upload / live preview cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* In-Time Slip Card */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        In-Time Slip
                      </span>
                      {inSlipPreview ? (
                        <div className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 overflow-hidden h-28 sm:h-32 flex flex-col justify-between shadow-2xs">
                          {/* Image thumbnail */}
                          <img
                            src={inSlipPreview}
                            alt="In Slip"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Top label pill */}
                          <div className="absolute top-1.5 left-1.5 z-10">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-black/75 text-white backdrop-blur-xs shadow-xs">
                              <FileCheck2 className="w-3 h-3 text-emerald-400" />
                              <span>Attached</span>
                            </span>
                          </div>

                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-1 z-20">
                            <button
                              type="button"
                              onClick={() =>
                                setViewingImage({
                                  url: inSlipPreview,
                                  title: "In-Time Slip Preview",
                                })
                              }
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                              title="View Full Image"
                            >
                              <Eye className="w-4 h-4 text-indigo-600" />
                            </button>

                            <label
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                              title="Change Image"
                            >
                              <Upload className="w-4 h-4 text-emerald-600" />
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={(e) =>
                                  pickSlip(e, setInSlipFile, setInSlipPreview)
                                }
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setInSlipFile(null);
                                setInSlipPreview(null);
                              }}
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                              title="Remove Image"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>

                          {/* Bottom persistent bar for easy single-click access */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 py-1 flex items-center justify-between text-[10px] text-white z-10">
                            <button
                              type="button"
                              onClick={() =>
                                setViewingImage({
                                  url: inSlipPreview,
                                  title: "In-Time Slip Preview",
                                })
                              }
                              className="inline-flex items-center gap-1 font-semibold hover:text-indigo-300 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>

                            <label className="inline-flex items-center gap-1 font-semibold hover:text-emerald-300 transition-colors cursor-pointer">
                              <Upload className="w-3 h-3" />
                              <span>Change</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={(e) =>
                                  pickSlip(e, setInSlipFile, setInSlipPreview)
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-28 sm:h-32 p-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-all text-center group">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <Upload className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-200">
                            Upload In Slip
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            PNG, JPG
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={(e) =>
                              pickSlip(e, setInSlipFile, setInSlipPreview)
                            }
                          />
                        </label>
                      )}
                    </div>

                    {/* Out-Time Slip Card */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Out-Time Slip
                      </span>
                      {outSlipPreview ? (
                        <div className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 overflow-hidden h-28 sm:h-32 flex flex-col justify-between shadow-2xs">
                          {/* Image thumbnail */}
                          <img
                            src={outSlipPreview}
                            alt="Out Slip"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Top label pill */}
                          <div className="absolute top-1.5 left-1.5 z-10">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-black/75 text-white backdrop-blur-xs shadow-xs">
                              <FileCheck2 className="w-3 h-3 text-emerald-400" />
                              <span>Attached</span>
                            </span>
                          </div>

                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-1 z-20">
                            <button
                              type="button"
                              onClick={() =>
                                setViewingImage({
                                  url: outSlipPreview,
                                  title: "Out-Time Slip Preview",
                                })
                              }
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                              title="View Full Image"
                            >
                              <Eye className="w-4 h-4 text-indigo-600" />
                            </button>

                            <label
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                              title="Change Image"
                            >
                              <Upload className="w-4 h-4 text-emerald-600" />
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={(e) =>
                                  pickSlip(e, setOutSlipFile, setOutSlipPreview)
                                }
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setOutSlipFile(null);
                                setOutSlipPreview(null);
                              }}
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                              title="Remove Image"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>

                          {/* Bottom persistent bar for easy single-click access */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 py-1 flex items-center justify-between text-[10px] text-white z-10">
                            <button
                              type="button"
                              onClick={() =>
                                setViewingImage({
                                  url: outSlipPreview,
                                  title: "Out-Time Slip Preview",
                                })
                              }
                              className="inline-flex items-center gap-1 font-semibold hover:text-indigo-300 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>

                            <label className="inline-flex items-center gap-1 font-semibold hover:text-emerald-300 transition-colors cursor-pointer">
                              <Upload className="w-3 h-3" />
                              <span>Change</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={(e) =>
                                  pickSlip(e, setOutSlipFile, setOutSlipPreview)
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-28 sm:h-32 p-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-all text-center group">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <Upload className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-200">
                            Upload Out Slip
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            PNG, JPG
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={(e) =>
                              pickSlip(e, setOutSlipFile, setOutSlipPreview)
                            }
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRow(null)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdatePunch}
                      disabled={isBusy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Update punch</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: single-day shift */}
            <div className="bg-white/90 dark:bg-[#0c1322]/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Shift change for this day
              </span>

              <Eselect
                title=""
                name="shift"
                option={shiftoption}
                initialValue={misdata.shift}
                handleInputChange={handleMispunchData}
                placeholder="Select new shift..."
                className="!h-9 rounded-xl font-medium w-full text-xs"
              />

              <button
                type="button"
                onClick={handleSingleShiftChange}
                disabled={!selectedRow || !misdata.shift || isBusy}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                <Replace className="w-3.5 h-3.5" />
                <span>Update shift change</span>
              </button>

              <span className="text-[11px] text-slate-400 leading-normal block">
                {selectedRow
                  ? `Applies to ${selectedRow.formatted_dateoffice || dateOnly(selectedRow.dateoffice)} only.`
                  : "Pick a day from the table first, then choose the shift to apply."}
              </span>
            </div>

            {/* Card 3: range and advanced tools */}
            <div className="bg-white/90 dark:bg-[#0c1322]/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Range &amp; advanced tools</span>
                </span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      Date range (uses the From / UpTo dates)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Einput
                        title="From"
                        type="date"
                        name="startDate"
                        value={misdata.startDate || ""}
                        handleInputChange={handleMispunchData}
                        ShortName
                        className="!h-9 rounded-xl font-medium w-full text-xs"
                        labelClassName="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
                      />
                      <Einput
                        title="UpTo"
                        type="date"
                        name="endDate"
                        value={misdata.endDate || ""}
                        handleInputChange={handleMispunchData}
                        ShortName
                        className="!h-9 rounded-xl font-medium w-full text-xs"
                        labelClassName="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleRangePunch}
                        disabled={!selectedRow || isBusy}
                        className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        Update multiple mispunch
                      </button>
                      <button
                        type="button"
                        onClick={handleRangeShiftChange}
                        disabled={isBusy}
                        className="h-8 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        Update multiple shift
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                      Weekly Off Day
                    </label>
                    <div className="flex items-center gap-2">
                      <Eselect
                        title=""
                        name="weekdays"
                        option={WEEKDAY_OPTIONS}
                        initialValue={misdata.weekdays}
                        handleInputChange={handleMispunchData}
                        placeholder="Select day..."
                        className="!h-8 rounded-lg font-medium w-full text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleWeeklyOffChange}
                        disabled={isBusy}
                        className="h-8 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleResetManualDay}
                      disabled={!selectedRow || isBusy}
                      className="w-full h-8 px-3 rounded-lg border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold disabled:opacity-50"
                    >
                      Reset Manual Day Attendance
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Reset month confirmation */}
      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent className="w-full max-w-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] shadow-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shrink-0 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Reset the whole month?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Every manual correction for{" "}
                  <strong>
                    {misdata.Name || misdata.EMPCODE || "this employee"}
                  </strong>{" "}
                  in month{" "}
                  <strong>
                    {misdata.month}/{misdata.year}
                  </strong>{" "}
                  will be discarded and attendance rebuilt from raw biometric
                  machine logs.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Keep corrections
            </button>
            <button
              type="button"
              onClick={handleResetMonth}
              disabled={isBusy}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-xs disabled:opacity-50"
            >
              Reset month
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slip image preview modal */}
      <Dialog
        open={!!viewingImage}
        onOpenChange={(open) => !open && setViewingImage(null)}
      >
        <DialogContent className="w-full max-w-2xl rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>{viewingImage?.title || "Slip Image Preview"}</span>
              </DialogTitle>
            </div>
          </DialogHeader>

          {viewingImage?.url && (
            <div className="mt-3 flex items-center justify-center max-h-[68vh] overflow-hidden rounded-xl bg-slate-950/5 dark:bg-black/40 p-2 border border-slate-200 dark:border-slate-800">
              <img
                src={viewingImage.url}
                alt={viewingImage.title}
                className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {viewingImage?.url && (
              <a
                href={viewingImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in new tab</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-xs ml-auto"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isBusy} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk toolbar helpers (module level, used by the JSX above)          */
/* ------------------------------------------------------------------ */

function isLeaveReasonBulk(reason: string, leaveValues: string[]) {
  return !!reason && leaveValues.includes(String(reason));
}

function isFixedBulk(reason: string, reasons: any[]) {
  return (
    Number(
      reasons.find((r) => String(r.value) === String(reason))?.Misc_Num1,
    ) === 1
  );
}