"use client";

/**
 * Bulk Miss Punch — Web Portal
 * -----------------------------------------------------------------------
 * Web equivalent of Android BulkMissPunchActivity + BulkMissPunchAdapter.
 * Matches design from prototype mockup with:
 *   - Quick-apply master card (Date, Quick Reason, Quick In/Out/Hours, Apply to all shown)
 *   - Employee Table (Avatar, Name/Code, Reason select, Hours input, In/Out time, State indicator)
 *   - Filter pill tabs (All, With entries, Selected) & Search bar
 *   - Sticky bottom bar (Ready/Incomplete/Selected counter, Clear entries, Add punch button)
 *
 * All business logic, time calculations (H.MM format), locking mechanism,
 * shift vs non-shift reasons, API integrations, and validation alerts
 * are strictly preserved.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  Wand2,
  Search,
  Fingerprint,
  Calendar,
  Check,
  AlertCircle,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import { cn } from "@/lib/utils";

// Mandatory components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ReactTable from "@/components/Templates/reacttable";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

interface ReasonItem {
  value: string | number;
  label: string;
  Is_MP?: string;
  Misc_Num1?: string | number; // non-empty & != "0" => shift-mode reason
  CC_Ledg2?: string | number; // "H.MM" default duration for non-shift-mode reasons
}

interface EmployeeRow {
  EMP_Code: string;
  Emp_Name: string;
  subline?: string;
  isSelected: boolean;
  reasonValue: string;
  punchInTime: string;
  punchOutTime: string;
  hoursText: string;
  manuallyEdited: boolean;
  submitStatus: 0 | 1 | 2; // 0 pending, 1 success, 2 failed
  submitMessage?: string;
}

const STATUS_PENDING = 0;
const STATUS_SUCCESS = 1;
const STATUS_FAILED = 2;

// -------------------------------------------------------------------------
// Pure time helpers (HH:mm based — matches <input type=time>)
// -------------------------------------------------------------------------

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
}

// "10.30" (H.MM — 10 hours 30 minutes, NOT decimal) -> total minutes
function parseHMMToMinutes(hoursStr: string): number {
  const trimmed = hoursStr.trim();
  const [hPart, mPartRaw] = trimmed.split(".");
  const h = parseInt(hPart || "0", 10);
  let mPart = mPartRaw || "0";
  if (mPart.length === 1) mPart = mPart + "0"; // "9.3" -> "30"
  if (mPart.length > 2) mPart = mPart.substring(0, 2);
  const m = parseInt(mPart, 10);
  return h * 60 + (isNaN(m) ? 0 : m);
}

// total minutes -> "10.30" (H.MM display format)
function minutesToHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}.${String(m).padStart(2, "0")}`;
}

// "HH:mm" + "HH:mm" -> "H.MM"
function calcHoursBetween(inTime: string, outTime: string): string {
  try {
    if (!inTime || !outTime) return "";
    const inM = timeToMinutes(inTime);
    const outM = timeToMinutes(outTime);
    let diff = outM - inM;
    if (diff < 0) diff += 24 * 60; // overnight shift safety
    return minutesToHMM(diff);
  } catch {
    return "";
  }
}

// "HH:mm" (In) + "H.MM" (duration) -> new Out "HH:mm"
function calcOutFromHours(inTime: string, hoursStr: string): string {
  try {
    if (!inTime || !hoursStr) return "";
    const inM = timeToMinutes(inTime);
    const durM = parseHMMToMinutes(hoursStr);
    const total = (inM + durM) % (24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// Shift timings normalize to "HH:mm"
function normalizeShiftTime(raw?: string | null): string {
  if (!raw) return "";
  if (raw.includes(":")) return raw.slice(0, 5);
  const [hPart, mPart] = raw.split(".");
  const h = parseInt(hPart || "0", 10);
  const m = parseInt(mPart || "0", 10);
  if (isNaN(h)) return "";
  return `${String(h).padStart(2, "0")}:${String(isNaN(m) ? 0 : m).padStart(2, "0")}`;
}

function formatDateDisplay(dStr: string): string {
  if (!dStr) return "";
  const parts = dStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dStr;
}

// Avatar color palette
const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300",
];

function getAvatarColor(name: string, code: string): string {
  const combined = (name || "") + (code || "");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export default function BulkMissPunchPage() {
  const user = useCurrentUser();

  // Top-level state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "with_entries" | "selected">("all");

  const [reasons, setReasons] = useState<ReasonItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [employeeShiftMap, setEmployeeShiftMap] = useState<
    Record<string, [string, string]>
  >({});

  const [masterReasonValue, setMasterReasonValue] = useState("");
  const [masterInTime, setMasterInTime] = useState("");
  const [masterOutTime, setMasterOutTime] = useState("");
  const [masterHoursText, setMasterHoursText] = useState("");

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employeesRef = useRef<EmployeeRow[]>([]);
  employeesRef.current = employees;

  // -----------------------------------------------------------------------
  // Reason Helpers
  // -----------------------------------------------------------------------

  function findReason(value: string, list: ReasonItem[]): ReasonItem | undefined {
    return list.find((x) => String(x.value) === String(value));
  }

  function isShiftModeReason(value: string, list: ReasonItem[]): boolean {
    if (!value) return false;
    const r = findReason(value, list);
    if (!r) return false;
    const num1 = String(r.Misc_Num1 ?? "").trim();
    return num1 !== "" && num1 !== "0";
  }

  function isAbsentReason(value: string): boolean {
    const r = findReason(value, reasons);
    return !!r && r.label.toLowerCase() === "absent";
  }

  const masterIsShiftMode = isShiftModeReason(masterReasonValue, reasons);
  const isMasterTimeEditable =
    !!masterReasonValue &&
    !masterIsShiftMode &&
    !isAbsentReason(masterReasonValue);
  const isMasterTimeReadOnly = !isMasterTimeEditable;

  // Pure: compute row reason fields
  function computeReasonFields(
    empCode: string,
    reasonValue: string,
    masterIn: string,
    masterOut: string
  ): Pick<
    EmployeeRow,
    "reasonValue" | "punchInTime" | "punchOutTime" | "hoursText"
  > {
    if (!reasonValue) {
      return { reasonValue: "", punchInTime: "", punchOutTime: "", hoursText: "" };
    }

    const reason = findReason(reasonValue, reasons);

    // Only populate In and Out when master In/Out are explicitly provided
    let punchInTime = masterIn || "";
    let punchOutTime = masterOut || "";

    const ccLedg2 = reason?.CC_Ledg2 != null ? String(reason.CC_Ledg2).trim() : "";
    if (punchInTime && !punchOutTime && ccLedg2) {
      punchOutTime = calcOutFromHours(punchInTime, ccLedg2) || "";
    }

    const hoursText =
      punchInTime && punchOutTime ? calcHoursBetween(punchInTime, punchOutTime) : "";

    return { reasonValue, punchInTime, punchOutTime, hoursText };
  }

  function withMasterHoursOverride(
    punchInTime: string,
    masterHours: string
  ): { punchOutTime: string | null; hoursText: string | null } {
    if (!masterHours || !punchInTime) return { punchOutTime: null, hoursText: null };
    const out = calcOutFromHours(punchInTime, masterHours);
    if (!out) return { punchOutTime: null, hoursText: null };
    return { punchOutTime: out, hoursText: masterHours };
  }

  // -----------------------------------------------------------------------
  // API Calls
  // -----------------------------------------------------------------------

  const fetchReasons = async () => {
    if (!user?.Comp_Code) return;
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getMPList`,
        {
          params: {
            getListFor: 1,
            Comp_Code: user?.Comp_Code,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (String(res.data?.Status).toLowerCase() === "true") {
        const list: ReasonItem[] = (res.data?.Result || []).filter(
          (r: ReasonItem) => (r.Is_MP || "").toUpperCase() === "MP"
        );
        setReasons(list);
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load reason list", "error");
    }
  };

  const fetchEmployees = async () => {
    if (!user?.Comp_Code) return;
    setIsLoadingEmployees(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
        {
          branch: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (res.data?.success === true) {
        const rows: EmployeeRow[] = (res.data?.data || []).map((e: any) => ({
          EMP_Code: String(e.value ?? e.EMP_Code ?? ""),
          Emp_Name: String(e.label ?? e.Emp_Name ?? ""),
          subline: e.branch || e.dept || e.department || e.Agency || "",
          isSelected: false,
          reasonValue: "",
          punchInTime: "",
          punchOutTime: "",
          hoursText: "",
          manuallyEdited: false,
          submitStatus: STATUS_PENDING,
        }));

        setEmployees(rows);
      } else {
        Swal.fire(
          "Error",
          res.data?.message || "Failed to load employee list",
          "error"
        );
      }
    } catch (err: any) {
      console.error("findallemp error:", err);
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to load employee list",
        "error"
      );
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchShiftTimesForAllEmployees = async (forDate: string) => {
    if (!user?.Comp_Code) return;
    const codes = employeesRef.current.map((e) => e.EMP_Code);
    if (codes.length === 0) return;

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getShiftTimeBulk`,
        { date: forDate, empCodes: codes },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const map: Record<string, [string, string]> = {};
      (res.data?.Result || []).forEach((s: any) => {
        map[String(s.Emp_Code).trim()] = [s.shiftstarttime, s.shiftendtime];
      });
      setEmployeeShiftMap(map);
      reapplyShiftTimesToLockedFreeRows(map);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load shift timings", "error");
    }
  };

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchReasons();
      fetchEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, user?.branch]);

  useEffect(() => {
    if (user?.Comp_Code && employees.length > 0) {
      fetchShiftTimesForAllEmployees(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, employees.length, date]);

  // -----------------------------------------------------------------------
  // Row Handlers
  // -----------------------------------------------------------------------

  const handleRowCheckToggle = (empCode: string, checked: boolean) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.EMP_Code !== empCode) return emp;
        if (checked) {
          const computed = computeReasonFields(
            empCode,
            masterReasonValue,
            masterInTime,
            masterOutTime
          );
          let { punchOutTime, hoursText } = computed;
          const override = withMasterHoursOverride(
            computed.punchInTime,
            masterHoursText
          );
          if (override.punchOutTime) {
            punchOutTime = override.punchOutTime;
            hoursText = override.hoursText!;
          }
          return {
            ...emp,
            ...computed,
            punchOutTime,
            hoursText,
            isSelected: true,
            manuallyEdited: false,
            submitStatus: STATUS_PENDING,
          };
        }
        return {
          ...emp,
          isSelected: false,
          reasonValue: "",
          punchInTime: "",
          punchOutTime: "",
          hoursText: "",
          manuallyEdited: false,
          submitStatus: STATUS_PENDING,
        };
      })
    );
  };

  const handleSelectAllToggle = (checked: boolean) => {
    const visibleCodes = new Set(filteredEmployees.map((e) => e.EMP_Code));
    setEmployees((prev) =>
      prev.map((emp) => {
        if (!visibleCodes.has(emp.EMP_Code)) return emp;
        if (checked) {
          const computed = computeReasonFields(
            emp.EMP_Code,
            masterReasonValue,
            masterInTime,
            masterOutTime
          );
          let { punchOutTime, hoursText } = computed;
          const override = withMasterHoursOverride(
            computed.punchInTime,
            masterHoursText
          );
          if (override.punchOutTime) {
            punchOutTime = override.punchOutTime;
            hoursText = override.hoursText!;
          }
          return {
            ...emp,
            ...computed,
            punchOutTime,
            hoursText,
            isSelected: true,
            manuallyEdited: false,
          };
        }
        return {
          ...emp,
          isSelected: false,
          reasonValue: "",
          punchInTime: "",
          punchOutTime: "",
          hoursText: "",
          manuallyEdited: false,
        };
      })
    );
  };

  const handleRowReasonChange = (empCode: string, reasonValue: string) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.EMP_Code !== empCode) return emp;
        const computed = computeReasonFields(
          empCode,
          reasonValue,
          masterInTime,
          masterOutTime
        );
        return { ...emp, ...computed, manuallyEdited: true };
      })
    );
  };

  const handleRowTimeChange = (
    empCode: string,
    field: "punchInTime" | "punchOutTime",
    value: string
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.EMP_Code !== empCode) return emp;
        const updated = { ...emp, [field]: value, manuallyEdited: true };
        updated.hoursText =
          updated.punchInTime && updated.punchOutTime
            ? calcHoursBetween(updated.punchInTime, updated.punchOutTime)
            : "";
        return updated;
      })
    );
  };

  const handleRowHoursBlur = (empCode: string, hoursStr: string) => {
    const trimmed = hoursStr.trim();
    if (!trimmed) return;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.EMP_Code !== empCode) return emp;
        if (!emp.punchInTime) return emp;
        const newOut = calcOutFromHours(emp.punchInTime, trimmed);
        if (!newOut) return emp;
        return {
          ...emp,
          punchOutTime: newOut,
          hoursText: trimmed,
          manuallyEdited: true,
        };
      })
    );
  };

  // -----------------------------------------------------------------------
  // Quick Apply Master Handlers
  // -----------------------------------------------------------------------

  const propagateMasterToFreeRows = (snapshot: {
    reasonValue: string;
    inTime: string;
    outTime: string;
    hoursText: string;
  }) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (!emp.isSelected || emp.manuallyEdited) return emp;
        const computed = computeReasonFields(
          emp.EMP_Code,
          snapshot.reasonValue,
          snapshot.inTime,
          snapshot.outTime
        );
        let { punchOutTime, hoursText } = computed;
        const override = withMasterHoursOverride(
          computed.punchInTime,
          snapshot.hoursText
        );
        if (override.punchOutTime) {
          punchOutTime = override.punchOutTime;
          hoursText = override.hoursText!;
        }
        return { ...emp, ...computed, punchOutTime, hoursText };
      })
    );
  };

  const reapplyShiftTimesToLockedFreeRows = (
    map: Record<string, [string, string]>
  ) => {
    // Shift timings auto-fill disabled per requirements
  };

  const handleMasterReasonChange = (value: string) => {
    const reason = findReason(value, reasons);
    const ccLedg2 = reason?.CC_Ledg2 != null ? String(reason.CC_Ledg2).trim() : "";
    const newHoursText = ccLedg2 || masterHoursText;

    setMasterReasonValue(value);
    setMasterHoursText(newHoursText);

    propagateMasterToFreeRows({
      reasonValue: value,
      inTime: masterInTime,
      outTime: masterOutTime,
      hoursText: newHoursText,
    });
  };

  const handleMasterInTimeChange = (value: string) => {
    setMasterInTime(value);
    propagateMasterToFreeRows({
      reasonValue: masterReasonValue,
      inTime: value,
      outTime: masterOutTime,
      hoursText: masterHoursText,
    });
  };

  const handleMasterOutTimeChange = (value: string) => {
    setMasterOutTime(value);
    propagateMasterToFreeRows({
      reasonValue: masterReasonValue,
      inTime: masterInTime,
      outTime: value,
      hoursText: masterHoursText,
    });
  };

  const handleMasterHoursBlur = (hoursStr: string) => {
    const trimmed = hoursStr.trim();
    if (!trimmed) return;
    setMasterHoursText(trimmed);

    let newMasterOut = masterOutTime;
    if (masterInTime) {
      const computedOut = calcOutFromHours(masterInTime, trimmed);
      if (computedOut) {
        newMasterOut = computedOut;
        setMasterOutTime(computedOut);
      }
    }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (!emp.isSelected || emp.manuallyEdited || !emp.punchInTime) return emp;
        const newOut = calcOutFromHours(emp.punchInTime, trimmed);
        if (!newOut) return emp;
        return { ...emp, punchOutTime: newOut, hoursText: trimmed };
      })
    );
  };

  // Explicit button in mockup: "Apply to all shown"
  const handleApplyToAllShown = () => {
    if (!filteredEmployees.length) return;
    const snapshot = {
      reasonValue: masterReasonValue,
      inTime: masterInTime,
      outTime: masterOutTime,
      hoursText: masterHoursText,
    };
    const visibleCodes = new Set(filteredEmployees.map((e) => e.EMP_Code));
    setEmployees((prev) =>
      prev.map((emp) => {
        if (!visibleCodes.has(emp.EMP_Code)) return emp;
        const computed = computeReasonFields(
          emp.EMP_Code,
          snapshot.reasonValue,
          snapshot.inTime,
          snapshot.outTime
        );
        let { punchOutTime, hoursText } = computed;
        const override = withMasterHoursOverride(
          computed.punchInTime,
          snapshot.hoursText
        );
        if (override.punchOutTime) {
          punchOutTime = override.punchOutTime;
          hoursText = override.hoursText!;
        }
        return {
          ...emp,
          ...computed,
          punchOutTime,
          hoursText,
          isSelected: true,
          manuallyEdited: false,
          submitStatus: STATUS_PENDING,
        };
      })
    );
  };

  // Reset all entries
  const handleClearEntries = () => {
    setEmployees((prev) =>
      prev.map((emp) => ({
        ...emp,
        isSelected: false,
        reasonValue: "",
        punchInTime: "",
        punchOutTime: "",
        hoursText: "",
        manuallyEdited: false,
        submitStatus: STATUS_PENDING,
        submitMessage: undefined,
      }))
    );
    setMasterReasonValue("");
    setMasterInTime("");
    setMasterOutTime("");
    setMasterHoursText("");
  };

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!user?.Comp_Code) {
      Swal.fire("Warning", "Company code missing. Please re-login.", "warning");
      return;
    }

    if (!date) {
      Swal.fire("Warning", "Please select a date.", "warning");
      return;
    }

    const selected = employees.filter((e) => e.isSelected);
    if (selected.length === 0) {
      Swal.fire("Warning", "Please select at least one employee.", "warning");
      return;
    }

    const invalidNames: string[] = [];
    for (const emp of selected) {
      if (isAbsentReason(emp.reasonValue)) continue;
      const hasReason = !!emp.reasonValue;
      const hasAnyTime = !!emp.punchInTime || !!emp.punchOutTime;
      if (!hasReason || !hasAnyTime) invalidNames.push(emp.Emp_Name);
    }

    if (invalidNames.length > 0) {
      Swal.fire({
        title: "Incomplete Rows",
        html: `Reason or punch time is missing for:<br/><br/>${invalidNames.join(
          "<br/>"
        )}`,
        icon: "warning",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Confirm Punch Submission",
      text: `Do you want to add punch for ${selected.length} employees?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const records = selected.map((emp) => {
        const reason = findReason(emp.reasonValue, reasons);
        return {
          EmpCode: emp.EMP_Code,
          MP_Date: date,
          In_Time: emp.punchInTime || null,
          Out_Time: emp.punchOutTime || null,
          MP_Reason: reason?.value != null ? String(reason.value) : "",
          MP_Remark: "",
          Spl_Remark: "",
        };
      });

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/AddMispunchRequest_Bulk`,
        { records, mis_enterby: user?.EMPCODE },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.EMPCODE,
          },
        }
      );

      const body = res.data;
      const failedLines: string[] = [];
      const resultsByCode: Record<string, { ok: boolean; message?: string }> = {};

      (body?.Results || []).forEach((r: any) => {
        const ok = String(r.Status).toLowerCase() === "true";
        resultsByCode[r.EmpCode] = { ok, message: r.Message };
      });

      setEmployees((prev) =>
        prev.map((emp) => {
          const result = resultsByCode[emp.EMP_Code];
          if (!result) return emp;
          if (!result.ok) failedLines.push(`${emp.Emp_Name} - ${result.message || ""}`);
          return {
            ...emp,
            submitStatus: result.ok ? STATUS_SUCCESS : STATUS_FAILED,
            submitMessage: result.message,
          };
        })
      );

      Swal.fire({
        title: "Punch Submission Result",
        html: `Successful: ${body?.SuccessCount ?? 0}<br/>Failed: ${
          failedLines.length
        }${failedLines.length ? `<br/><br/>${failedLines.join("<br/>")}` : ""}`,
        icon: failedLines.length ? "warning" : "success",
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire(
        "Error",
        err?.response?.data?.Message || "Request failed. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Derived Filtering & Counts
  // -----------------------------------------------------------------------

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (filterTab === "with_entries") {
      list = list.filter(
        (e) => e.punchInTime || e.punchOutTime || e.reasonValue || e.hoursText
      );
    } else if (filterTab === "selected") {
      list = list.filter((e) => e.isSelected);
    }

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(
      (e) =>
        e.Emp_Name?.toLowerCase().includes(q) ||
        e.EMP_Code?.toLowerCase().includes(q)
    );
  }, [employees, searchTerm, filterTab]);

  const totalEmployeesCount = employees.length;
  const selectedCount = employees.filter((e) => e.isSelected).length;
  const withEntriesCount = employees.filter(
    (e) => e.punchInTime || e.punchOutTime || e.reasonValue || e.hoursText
  ).length;

  const readyCount = employees.filter(
    (e) =>
      e.isSelected &&
      (isAbsentReason(e.reasonValue) ||
        (e.reasonValue && (e.punchInTime || e.punchOutTime)))
  ).length;

  const incompleteCount = Math.max(0, selectedCount - readyCount);

  const allFilteredSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => e.isSelected);

  const reasonOptions = useMemo(() => {
    return reasons.map((r) => ({
      value: String(r.value),
      label: r.label,
    }));
  }, [reasons]);

  // Selected rows for ReactTable controlled selection
  const selectedRows = useMemo(() => {
    return employees
      .filter((e) => e.isSelected)
      .map((e) => ({
        ...e,
        id: e.EMP_Code,
      }));
  }, [employees]);

  const handleTableSelectionChange = (newSelected: any[]) => {
    const selectedCodes = new Set(
      (newSelected || []).map((item: any) =>
        String(item.EMP_Code || item.id || "")
      )
    );

    setEmployees((prev) =>
      prev.map((emp) => {
        const shouldBeSelected = selectedCodes.has(emp.EMP_Code);
        if (shouldBeSelected && !emp.isSelected) {
          const computed = computeReasonFields(
            emp.EMP_Code,
            masterReasonValue,
            masterInTime,
            masterOutTime
          );
          let { punchOutTime, hoursText } = computed;
          const override = withMasterHoursOverride(
            computed.punchInTime,
            masterHoursText
          );
          if (override.punchOutTime) {
            punchOutTime = override.punchOutTime;
            hoursText = override.hoursText!;
          }
          return {
            ...emp,
            ...computed,
            punchOutTime,
            hoursText,
            isSelected: true,
            manuallyEdited: false,
            submitStatus: STATUS_PENDING,
          };
        } else if (!shouldBeSelected && emp.isSelected) {
          return {
            ...emp,
            isSelected: false,
            reasonValue: "",
            punchInTime: "",
            punchOutTime: "",
            hoursText: "",
            manuallyEdited: false,
            submitStatus: STATUS_PENDING,
          };
        }
        return emp;
      })
    );
  };

  // -----------------------------------------------------------------------
  // ReactTable Columns Configuration
  // -----------------------------------------------------------------------

  const columns = useMemo(
    () => [
      {
        Header: "EMPLOYEE",
        accessor: "Emp_Name",
        Cell: ({ row }: any) => {
          const emp: EmployeeRow = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-medium text-[11px] tracking-tight uppercase shadow-2xs",
                  getAvatarColor(emp.Emp_Name, emp.EMP_Code)
                )}
              >
                {getInitials(emp.Emp_Name)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate leading-tight">
                  {emp.Emp_Name}
                </div>
                <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal truncate mt-0.5">
                  {emp.EMP_Code}
                  {emp.subline ? ` · ${emp.subline}` : ""}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        Header: "REASON",
        accessor: "reasonValue",
        Cell: ({ row }: any) => {
          const emp: EmployeeRow = row.original;
          return (
            <div className={cn("min-w-[200px]", !emp.isSelected && "pointer-events-none")}>
              <Eselect
                name={`reason-${emp.EMP_Code}`}
                placeholder="Select reason"
                option={reasons}
                initialValue={emp.reasonValue}
                handleInputChange={(_, val) => {
                  if (!emp.isSelected) return;
                  handleRowReasonChange(emp.EMP_Code, String(val ?? ""));
                }}
                className={cn(
                  "!h-[34px] !rounded-[8px] !text-[12px]",
                  !emp.isSelected && "bg-[#F8FAFC]/50 dark:bg-[#182235]/50"
                )}
              />
            </div>
          );
        },
      },
      {
        Header: "HOURS (H.MM)",
        accessor: "hoursText",
        Cell: ({ row }: any) => {
          const emp: EmployeeRow = row.original;
          const isReadOnly = !emp.punchInTime || !emp.punchOutTime;
          return (
            <div className="w-[85px]">
              <Einput
                title=""
                labelClassName="hidden"
                name={`hours-${emp.EMP_Code}`}
                type="text"
                placeholder="H.MM"
                value={emp.hoursText}
                readOnly={isReadOnly}
                tabIndex={isReadOnly ? -1 : 0}
                handleInputChange={(_, val) => {
                  if (isReadOnly) return;
                  setEmployees((prev) =>
                    prev.map((e) =>
                      e.EMP_Code === emp.EMP_Code
                        ? { ...e, hoursText: String(val ?? "") }
                        : e
                    )
                  );
                }}
                onBlur={(e) => {
                  if (isReadOnly) return;
                  handleRowHoursBlur(emp.EMP_Code, e.target.value);
                }}
                className={cn(
                  "!h-[34px] !px-2 text-center !rounded-[8px] !text-[12.5px] font-medium",
                  isReadOnly && "!cursor-default !bg-[#F8FAFC]/50 dark:!bg-[#182235]/50"
                )}
              />
            </div>
          );
        },
      },
      {
        Header: "IN",
        accessor: "punchInTime",
        Cell: ({ row }: any) => {
          const emp: EmployeeRow = row.original;
          const isTimeEditable =
            emp.isSelected &&
            !!emp.reasonValue &&
            !isShiftModeReason(emp.reasonValue, reasons) &&
            !isAbsentReason(emp.reasonValue);
          const isReadOnly = !isTimeEditable;

          return (
            <div className={cn("w-[115px]", isReadOnly && "pointer-events-none")}>
              <Einput
                title=""
                labelClassName="hidden"
                name={`in-${emp.EMP_Code}`}
                type="time"
                value={emp.punchInTime}
                readOnly={isReadOnly}
                tabIndex={isReadOnly ? -1 : 0}
                handleInputChange={(_, val) => {
                  if (isReadOnly) return;
                  handleRowTimeChange(emp.EMP_Code, "punchInTime", String(val ?? ""));
                }}
                className={cn(
                  "!h-[34px] !px-2.5 !rounded-[8px] !text-[12px] font-medium",
                  isReadOnly && "!cursor-default !bg-[#F8FAFC]/50 dark:!bg-[#182235]/50"
                )}
              />
            </div>
          );
        },
      },
      {
        Header: "OUT",
        accessor: "punchOutTime",
        Cell: ({ row }: any) => {
          const emp: EmployeeRow = row.original;
          const isTimeEditable =
            emp.isSelected &&
            !!emp.reasonValue &&
            !isShiftModeReason(emp.reasonValue, reasons) &&
            !isAbsentReason(emp.reasonValue);
          const isReadOnly = !isTimeEditable;

          return (
            <div className={cn("w-[115px]", isReadOnly && "pointer-events-none")}>
              <Einput
                title=""
                labelClassName="hidden"
                name={`out-${emp.EMP_Code}`}
                type="time"
                value={emp.punchOutTime}
                readOnly={isReadOnly}
                tabIndex={isReadOnly ? -1 : 0}
                handleInputChange={(_, val) => {
                  if (isReadOnly) return;
                  handleRowTimeChange(emp.EMP_Code, "punchOutTime", String(val ?? ""));
                }}
                className={cn(
                  "!h-[34px] !px-2.5 !rounded-[8px] !text-[12px] font-medium",
                  isReadOnly && "!cursor-default !bg-[#F8FAFC]/50 dark:!bg-[#182235]/50"
                )}
              />
            </div>
          );
        },
      },
      {
        Header: "STATE",
        accessor: "submitStatus",
        Cell: ({ row }: any) => {
          const emp: EmployeeRow = row.original;
          return (
            <div className="flex items-center justify-center">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  emp.submitStatus === 1
                    ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : emp.submitStatus === 2
                    ? "bg-rose-500 shadow-xs shadow-rose-500/50"
                    : "bg-slate-300 dark:bg-slate-700"
                )}
                title={
                  emp.submitStatus === 1
                    ? "Submitted successfully"
                    : emp.submitStatus === 2
                    ? emp.submitMessage || "Failed to submit"
                    : "Pending"
                }
              />
            </div>
          );
        },
      },
    ],
    [
      reasons,
      handleRowReasonChange,
      handleRowTimeChange,
      handleRowHoursBlur,
    ]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] px-3 sm:px-6 py-4 sm:py-6 pb-36 sm:pb-28">
      {/* 1. Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[18px] sm:text-[22px] font-[750] text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          Bulk punch — one day, many employees
        </h1>
        <p className="text-[12px] sm:text-[13px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-[450]">
          Set a quick reason and times at the top, tick the employees, and apply to all of them at once.
        </p>
      </div>

      {/* 2. Quick Apply Top Card */}
      <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#E2E8F0] dark:border-[#1F2937] p-3.5 sm:p-5 shadow-xs mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* Date Picker */}
          <div className="sm:col-span-1 md:col-span-2">
            <Einput
              title="DATE"
              name="date"
              type="date"
              value={date}
              redlabel="*"
              handleInputChange={(name, val) => setDate(val || todayStr)}
              className="h-[38px] rounded-[10px] text-[13px]"
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
            />
          </div>

          {/* Quick Reason Dropdown */}
          <div className="sm:col-span-1 md:col-span-3">
            <Eselect
              title="QUICK REASON"
              name="quickReason"
              placeholder="Select reason"
              option={reasonOptions}
              initialValue={masterReasonValue}
              handleInputChange={(name, val) =>
                handleMasterReasonChange(String(val ?? ""))
              }
              className="w-full !h-[38px] !rounded-[10px] !text-[13px]"
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
            />
          </div>

          {/* Quick In Time */}
          <div className={cn("sm:col-span-1 md:col-span-2", isMasterTimeReadOnly && "pointer-events-none")}>
            <Einput
              title="QUICK IN"
              name="masterInTime"
              type="time"
              value={masterInTime}
              readOnly={isMasterTimeReadOnly}
              tabIndex={isMasterTimeReadOnly ? -1 : 0}
              handleInputChange={(_, val) => {
                if (isMasterTimeReadOnly) return;
                handleMasterInTimeChange(String(val ?? ""));
              }}
              className={cn(
                "!h-[38px] !rounded-[10px] !text-[13px]",
                isMasterTimeReadOnly && "!cursor-default !bg-[#F8FAFC]/50 dark:!bg-[#182235]/50"
              )}
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
              ShortName={true}
            />
          </div>

          {/* Quick Out Time */}
          <div className={cn("sm:col-span-1 md:col-span-2", isMasterTimeReadOnly && "pointer-events-none")}>
            <Einput
              title="QUICK OUT"
              name="masterOutTime"
              type="time"
              value={masterOutTime}
              readOnly={isMasterTimeReadOnly}
              tabIndex={isMasterTimeReadOnly ? -1 : 0}
              handleInputChange={(_, val) => {
                if (isMasterTimeReadOnly) return;
                handleMasterOutTimeChange(String(val ?? ""));
              }}
              className={cn(
                "!h-[38px] !rounded-[10px] !text-[13px]",
                isMasterTimeReadOnly && "!cursor-default !bg-[#F8FAFC]/50 dark:!bg-[#182235]/50"
              )}
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
              ShortName={true}
            />
          </div>

          {/* Quick Hours */}
          <div className="sm:col-span-1 md:col-span-1">
            <Einput
              title="QUICK HOURS"
              name="masterHoursText"
              type="text"
              placeholder="e.g. 9.30"
              value={masterHoursText}
              handleInputChange={(_, val) => setMasterHoursText(String(val ?? ""))}
              onBlur={(e) => handleMasterHoursBlur(e.target.value)}
              className="!h-[38px] !rounded-[10px] !text-[13px]"
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
              ShortName={true}
            />
          </div>

          {/* Apply To All Shown Button */}
          <div className="sm:col-span-2 md:col-span-2 flex items-end">
            <Button
              type="button"
              variant="primary"
              onClick={handleApplyToAllShown}
              className="!w-full !h-[38px] !px-3 !rounded-[10px] !bg-[#334155] hover:!bg-[#1E293B] dark:!bg-[#1E293B] dark:hover:!bg-[#334155] !text-white text-[12.5px] font-[600] flex items-center justify-center gap-2 mb-0.5"
              icon={<Wand2 className="w-4 h-4" />}
            >
              Apply to all shown
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Employees Card with Filter Pills & ReactTable */}
      <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#E2E8F0] dark:border-[#1F2937] overflow-hidden shadow-xs">
        {/* Card Header */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-[#E2E8F0] dark:border-[#1F2937] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left Title & Status */}
          <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
            <span className="text-[14px] sm:text-[15px] font-[700] text-[#0F172A] dark:text-[#F8FAFC]">
              Employees
            </span>
            <span className="text-[11.5px] sm:text-[12.5px] font-[500] text-[#64748B] dark:text-[#94A3B8]">
              {selectedCount} selected &middot; {readyCount} ready
            </span>
          </div>

          {/* Right Filter Pills + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#0E1524] p-1 rounded-full border border-[#E2E8F0] dark:border-[#1F2937] overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn(
                  "px-2.5 sm:px-3 py-1 rounded-full text-[11.5px] sm:text-[12px] font-[600] transition-colors cursor-pointer whitespace-nowrap shrink-0",
                  filterTab === "all"
                    ? "bg-[#4F46E5] text-white shadow-2xs"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                )}
              >
                All {totalEmployeesCount}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("with_entries")}
                className={cn(
                  "px-2.5 sm:px-3 py-1 rounded-full text-[11.5px] sm:text-[12px] font-[600] transition-colors cursor-pointer whitespace-nowrap shrink-0",
                  filterTab === "with_entries"
                    ? "bg-[#4F46E5] text-white shadow-2xs"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                )}
              >
                With entries {withEntriesCount}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("selected")}
                className={cn(
                  "px-2.5 sm:px-3 py-1 rounded-full text-[11.5px] sm:text-[12px] font-[600] transition-colors cursor-pointer whitespace-nowrap shrink-0",
                  filterTab === "selected"
                    ? "bg-[#4F46E5] text-white shadow-2xs"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                )}
              >
                Selected {selectedCount}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-[210px]">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <Einput
                title=""
                labelClassName="hidden"
                name="searchTerm"
                type="text"
                placeholder="Code or employee name..."
                value={searchTerm}
                handleInputChange={(_, val) => setSearchTerm(String(val ?? ""))}
                className="!h-[34px] !pl-8 !pr-3 !rounded-[10px] !text-[12px] sm:!text-[12.5px] w-full"
              />
            </div>
          </div>
        </div>

        {/* ReactTable Component */}
        <ReactTable
          columns={columns}
          data={filteredEmployees}
          check={true}
          selectValue="EMP_Code"
          selectedRows={selectedRows}
          setSelectedRows={handleTableSelectionChange}
          showPageSizeInFooter={true}
          showTopSearch={false}
          showExcelExport={false}
          footerTextMode="pageItems"
          containerClassName="!border-none !shadow-none !rounded-none !bg-transparent"
          headerClassName="!bg-[#F8FAFC] dark:!bg-[#0E1524] !text-[11px] !font-semibold !tracking-[0.05em] !text-[#64748B] dark:!text-[#94A3B8] !uppercase !border-b !border-[#E2E8F0] dark:!border-[#1F2937] !py-3 !px-4"
        />
      </div>

      {/* 4. Sticky Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-sm border-t border-[#E2E8F0] dark:border-[#1F2937] px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] transition-[left] duration-150 ease-in-out">
        {/* Left Stats Text */}
        <div className="text-[11.5px] sm:text-[13px] font-[550] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between sm:justify-start gap-1.5 flex-wrap w-full sm:w-auto">
          <span>{formatDateDisplay(date)}</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>{readyCount} ready</span>
          <span>&middot;</span>
          <span>{incompleteCount} incomplete</span>
          <span>&middot;</span>
          <span>{selectedCount} selected</span>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleClearEntries}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none !h-[36px] sm:!h-[38px] !px-3 sm:!px-4 !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12px] sm:!text-[13px] !font-[600] whitespace-nowrap"
          >
            Clear entries
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCount === 0}
            className="flex-1 sm:flex-none !h-[36px] sm:!h-[38px] !px-3 sm:!px-5 !rounded-[10px] !text-[12px] sm:!text-[13px] !font-[600] !bg-[#334155] hover:!bg-[#1E293B] dark:!bg-[#475569] dark:hover:!bg-[#334155] !text-white flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
            icon={<Fingerprint className="w-4 h-4 shrink-0" />}
          >
            Add punch ( {selectedCount} )
          </Button>
        </div>
      </footer>

      {/* 5. Hashloader for background requests */}
      <HashloaderComponent isLoading={isLoadingEmployees || isSubmitting} />
    </div>
  );
}
