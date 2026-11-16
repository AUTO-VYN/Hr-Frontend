"use client";

/**
 * Bulk Present / Miss-Punch by Date Range — Web Portal
 * -----------------------------------------------------------------------
 * Single-employee version of BulkMissPunch, transposed: instead of many
 * employees x one date, this is one employee x many dates (a month's
 * date range).
 *
 * Flow:
 *   Step 1: Select ONE employee (single-select Eselect).
 *   Step 2: Select a Month -> fetch that month's date range -> one row
 *           per date.
 *   Step 3: Quick-apply bar (Reason / In / Out / Hours) pushes down to
 *           every CHECKED date row that hasn't been manually edited.
 *   Step 4: Submit posts one record per checked date.
 *
 * Built with:
 *   - Button (@/components/atoms/Button)
 *   - Einput (@/components/atoms/Einput)
 *   - Eselect (@/components/atoms/Eselect)
 *   - ReactTable (@/components/Templates/reacttable)
 *
 * All API contracts, shift lookups, H.MM time computations, validation,
 * SweetAlert notifications, and row locking rules are strictly preserved.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Calendar,
  Clock,
  Wand2,
  Search,
  Fingerprint,
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
  value: string | number; // Misc_Code
  label: string; // Misc_Name
  Is_MP?: string;
  Misc_Num1?: string | number; // non-empty & != "0"/0 => shift-mode reason
  CC_Ledg2?: string | number; // "H.MM" default duration for non-shift-mode reasons
}

interface EmployeeOption {
  value: string;
  label: string;
}

interface DateRow {
  date: string; // "YYYY-MM-DD"
  isSelected: boolean;
  reasonValue: string; // "" = not selected
  punchInTime: string; // "HH:mm" or ""
  punchOutTime: string; // "HH:mm" or ""
  hoursText: string; // "H.MM" or ""
  manuallyEdited: boolean; // row diverged from quick-apply — locked
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
    if (diff < 0) diff += 24 * 60; // overnight safety
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

// Inclusive list of "YYYY-MM-DD" strings between two dates
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return dates;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    dates.push(formatLocalDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function formatDateDisplay(dStr: string): string {
  if (!dStr) return "";
  const parts = dStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dStr;
}

function getDayName(dStr: string): string {
  try {
    const d = new Date(dStr + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { weekday: "short" });
  } catch {
    return "";
  }
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export default function BulkPresentDatePage() {
  const user = useCurrentUser();

  // Step 1: Employee
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState("");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Step 2: Month
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [month, setMonth] = useState(currentMonthStr);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  // Filter tabs & search
  const [filterTab, setFilterTab] = useState<"all" | "with_entries" | "selected">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Reasons & rows
  const [reasons, setReasons] = useState<ReasonItem[]>([]);
  const [dateRows, setDateRows] = useState<DateRow[]>([]);
  const [dateShiftMap, setDateShiftMap] = useState<Record<string, [string, string]>>({});

  // Quick Apply
  const [masterReasonValue, setMasterReasonValue] = useState("");
  const [masterInTime, setMasterInTime] = useState("");
  const [masterOutTime, setMasterOutTime] = useState("");
  const [masterHoursText, setMasterHoursText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateRowsRef = useRef<DateRow[]>([]);
  dateRowsRef.current = dateRows;

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

  // Pure: compute {reasonValue, punchInTime, punchOutTime, hoursText} for one date row
  function computeReasonFields(
    date: string,
    reasonValue: string,
    masterIn: string,
    masterOut: string
  ): Pick<DateRow, "reasonValue" | "punchInTime" | "punchOutTime" | "hoursText"> {
    if (!reasonValue) {
      return { reasonValue: "", punchInTime: "", punchOutTime: "", hoursText: "" };
    }

    const reason = findReason(reasonValue, reasons);
    const shift = dateShiftMap[date];
    const shiftStart = shift ? normalizeShiftTime(shift[0]) : "";
    const shiftEnd = shift ? normalizeShiftTime(shift[1]) : "";

    let punchInTime = "";
    let punchOutTime = "";

    if (isShiftModeReason(reasonValue, reasons)) {
      punchInTime = shiftStart;
      punchOutTime = shiftEnd;
    } else {
      punchInTime = shiftStart || masterIn;
      const ccLedg2 = reason?.CC_Ledg2 != null ? String(reason.CC_Ledg2).trim() : "";
      if (ccLedg2 && punchInTime) {
        const out = calcOutFromHours(punchInTime, ccLedg2);
        punchOutTime = out || masterOut;
      } else {
        punchOutTime = masterOut;
      }
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
          params: { getListFor: 1 },
          headers: { compcode: user?.Comp_Code },
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

  const fetchEmployeeOptions = async () => {
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
          },
        }
      );

      if (res.data?.success === true) {
        const rows: EmployeeOption[] = (res.data?.data || []).map((e: any) => ({
          value: e.value,
          label: `${e.label} (${e.value})`,
        }));
        setEmployeeOptions(rows);
      } else {
        Swal.fire("Error", res.data?.message || "Failed to load employee list", "error");
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", err?.response?.data?.message || "Failed to load employee list", "error");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchMonthDateRange = async () => {
    if (!selectedEmpCode) {
      Swal.fire("Warning", "Please select an employee first.", "warning");
      return;
    }

    const [yearStr, monthStrPart] = month.split("-");
    const monthNum = parseInt(monthStrPart, 10);
    const yearNum = parseInt(yearStr, 10);

    setIsLoadingDates(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/MonthMasterRange`,
        { month: monthNum, year: yearNum },
        { headers: { compcode: user?.Comp_Code } }
      );

      if (String(res.data?.Status).toLowerCase() === "true") {
        const range = res.data?.Result?.[0];
        const start = range?.Misc_Dtl1_Date;
        const end = range?.Misc_Dtl2_Date;

        if (!start || !end) {
          Swal.fire("Error", "No date range configured for this month", "error");
          setDateRows([]);
          return;
        }

        const dates = buildDateRange(start, end);
        const rows: DateRow[] = dates.map((d) => ({
          date: d,
          isSelected: false,
          reasonValue: "",
          punchInTime: "",
          punchOutTime: "",
          hoursText: "",
          manuallyEdited: false,
          submitStatus: STATUS_PENDING,
        }));
        setDateRows(rows);
        setDateShiftMap({});
        fetchShiftTimesForDateRange(dates, selectedEmpCode);
      } else {
        Swal.fire("Error", "Failed to load date range for this month", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load date range for this month", "error");
    } finally {
      setIsLoadingDates(false);
    }
  };

  const fetchShiftTimesForDateRange = async (dates: string[], empCode: string) => {
    if (dates.length === 0 || !empCode || !user?.Comp_Code) return;
    try {
      const results = await Promise.all(
        dates.map((d) =>
          axios
            .post(
              `${process.env.NEXT_PUBLIC_URL}/mobile/getShiftTimeBulk`,
              { date: d, empCodes: [empCode] },
              { headers: { compcode: user?.Comp_Code } }
            )
            .then((res) => ({ date: d, res }))
            .catch((err) => ({ date: d, err }))
        )
      );

      const map: Record<string, [string, string]> = {};
      results.forEach((r: any) => {
        if (r.err) return;
        const row = (r.res?.data?.Result || [])[0];
        if (row) map[r.date] = [row.shiftstarttime, row.shiftendtime];
      });
      setDateShiftMap(map);
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
      fetchEmployeeOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, user?.branch]);

  // -----------------------------------------------------------------------
  // Row Handlers
  // -----------------------------------------------------------------------

  const handleRowReasonChange = (date: string, reasonValue: string) => {
    setDateRows((prev) =>
      prev.map((row) => {
        if (row.date !== date) return row;
        const computed = computeReasonFields(
          date,
          reasonValue,
          masterInTime,
          masterOutTime
        );
        return { ...row, ...computed, manuallyEdited: true };
      })
    );
  };

  const handleRowTimeChange = (
    date: string,
    field: "punchInTime" | "punchOutTime",
    value: string
  ) => {
    setDateRows((prev) =>
      prev.map((row) => {
        if (row.date !== date) return row;
        const updated = { ...row, [field]: value, manuallyEdited: true };
        updated.hoursText =
          updated.punchInTime && updated.punchOutTime
            ? calcHoursBetween(updated.punchInTime, updated.punchOutTime)
            : "";
        return updated;
      })
    );
  };

  const handleRowHoursBlur = (date: string, hoursStr: string) => {
    const trimmed = hoursStr.trim();
    if (!trimmed) return;
    setDateRows((prev) =>
      prev.map((row) => {
        if (row.date !== date) return row;
        if (!row.punchInTime) return row;
        const newOut = calcOutFromHours(row.punchInTime, trimmed);
        if (!newOut) return row;
        return { ...row, punchOutTime: newOut, hoursText: trimmed, manuallyEdited: true };
      })
    );
  };

  // -----------------------------------------------------------------------
  // Quick-apply Handlers
  // -----------------------------------------------------------------------

  const propagateMasterToFreeRows = (snapshot: {
    reasonValue: string;
    inTime: string;
    outTime: string;
    hoursText: string;
  }) => {
    setDateRows((prev) =>
      prev.map((row) => {
        if (!row.isSelected || row.manuallyEdited) return row;
        const computed = computeReasonFields(
          row.date,
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
        return { ...row, ...computed, punchOutTime, hoursText };
      })
    );
  };

  const reapplyShiftTimesToLockedFreeRows = (map: Record<string, [string, string]>) => {
    setDateRows((prev) =>
      prev.map((row) => {
        if (!row.isSelected || row.manuallyEdited) return row;
        if (!isShiftModeReason(row.reasonValue, reasons)) return row;
        const shift = map[row.date];
        const punchInTime = shift ? normalizeShiftTime(shift[0]) : "";
        const punchOutTime = shift ? normalizeShiftTime(shift[1]) : "";
        const hoursText =
          punchInTime && punchOutTime ? calcHoursBetween(punchInTime, punchOutTime) : "";
        return { ...row, punchInTime, punchOutTime, hoursText };
      })
    );
  };

  const handleMasterReasonChange = (value: string) => {
    const shiftMode = isShiftModeReason(value, reasons);

    let newHoursText = masterHoursText;
    if (!shiftMode) {
      const reason = findReason(value, reasons);
      const ccLedg2 = reason?.CC_Ledg2 != null ? String(reason.CC_Ledg2).trim() : "";
      if (ccLedg2) newHoursText = ccLedg2;
    }

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

    if (masterInTime) {
      const computedOut = calcOutFromHours(masterInTime, trimmed);
      if (computedOut) setMasterOutTime(computedOut);
    }

    setDateRows((prev) =>
      prev.map((row) => {
        if (!row.isSelected || row.manuallyEdited || !row.punchInTime) return row;
        const newOut = calcOutFromHours(row.punchInTime, trimmed);
        if (!newOut) return row;
        return { ...row, punchOutTime: newOut, hoursText: trimmed };
      })
    );
  };

  // "Apply to selected" button
  const handleApplyToSelected = () => {
    const selectedDates = new Set(
      dateRows.filter((r) => r.isSelected).map((r) => r.date)
    );
    if (selectedDates.size === 0) {
      Swal.fire("Info", "Please select at least one date row first.", "info");
      return;
    }

    const snapshot = {
      reasonValue: masterReasonValue,
      inTime: masterInTime,
      outTime: masterOutTime,
      hoursText: masterHoursText,
    };

    setDateRows((prev) =>
      prev.map((row) => {
        if (!selectedDates.has(row.date)) return row;
        const computed = computeReasonFields(
          row.date,
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
          ...row,
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

  const handleEmployeeChange = (empCode: string) => {
    setSelectedEmpCode(empCode);
    setDateRows([]);
    setDateShiftMap({});
  };

  const handleClearEntries = () => {
    setDateRows((prev) =>
      prev.map((row) => ({
        ...row,
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
    if (!selectedEmpCode) {
      Swal.fire("Warning", "Please select an employee.", "warning");
      return;
    }

    const selected = dateRows.filter((r) => r.isSelected);
    if (selected.length === 0) {
      Swal.fire("Warning", "Please select at least one date.", "warning");
      return;
    }

    const invalidDates: string[] = [];
    for (const row of selected) {
      if (isAbsentReason(row.reasonValue)) continue; // Absent skips time validation
      const hasReason = !!row.reasonValue;
      const hasAnyTime = !!row.punchInTime || !!row.punchOutTime;
      if (!hasReason || !hasAnyTime) invalidDates.push(row.date);
    }

    if (invalidDates.length > 0) {
      Swal.fire({
        title: "Incomplete Rows",
        html: `Reason or punch time is missing for:<br/><br/>${invalidDates.join("<br/>")}`,
        icon: "warning",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Confirm Submission",
      text: `Do you want to add punch for ${selected.length} date(s)?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const records = selected.map((row) => {
        const reason = findReason(row.reasonValue, reasons);
        return {
          EmpCode: selectedEmpCode,
          MP_Date: row.date,
          In_Time: row.punchInTime || null,
          Out_Time: row.punchOutTime || null,
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
      const resultsByDate: Record<string, { ok: boolean; message?: string }> = {};

      (body?.Results || []).forEach((r: any) => {
        const ok = String(r.Status).toLowerCase() === "true";
        resultsByDate[r.MP_Date] = { ok, message: r.Message };
      });

      setDateRows((prev) =>
        prev.map((row) => {
          const result = resultsByDate[row.date];
          if (!result) return row;
          if (!result.ok) failedLines.push(`${row.date} - ${result.message || ""}`);
          return {
            ...row,
            submitStatus: result.ok ? STATUS_SUCCESS : STATUS_FAILED,
            submitMessage: result.message,
          };
        })
      );

      Swal.fire({
        title: "Submission Result",
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

  const filteredDateRows = useMemo(() => {
    let list = dateRows;
    if (filterTab === "with_entries") {
      list = list.filter(
        (r) => r.punchInTime || r.punchOutTime || r.reasonValue || r.hoursText
      );
    } else if (filterTab === "selected") {
      list = list.filter((r) => r.isSelected);
    }

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.date.toLowerCase().includes(q) ||
        formatDateDisplay(r.date).toLowerCase().includes(q) ||
        getDayName(r.date).toLowerCase().includes(q)
    );
  }, [dateRows, searchTerm, filterTab]);

  const selectedCount = dateRows.filter((d) => d.isSelected).length;
  const withEntriesCount = dateRows.filter(
    (d) => d.punchInTime || d.punchOutTime || d.reasonValue || d.hoursText
  ).length;

  const readyCount = dateRows.filter(
    (d) =>
      d.isSelected &&
      (isAbsentReason(d.reasonValue) ||
        (d.reasonValue && (d.punchInTime || d.punchOutTime)))
  ).length;

  const incompleteCount = Math.max(0, selectedCount - readyCount);

  const selectedEmpLabel = useMemo(() => {
    const found = employeeOptions.find((e) => String(e.value) === String(selectedEmpCode));
    return found ? found.label : "";
  }, [employeeOptions, selectedEmpCode]);

  const reasonOptions = useMemo(() => {
    return reasons.map((r) => ({
      value: String(r.value),
      label: r.label,
    }));
  }, [reasons]);

  // Selected rows for ReactTable controlled selection
  const selectedRows = useMemo(() => {
    return dateRows
      .filter((d) => d.isSelected)
      .map((d) => ({
        ...d,
        id: d.date,
      }));
  }, [dateRows]);

  const handleTableSelectionChange = (newSelected: any[]) => {
    const selectedDates = new Set(
      (newSelected || []).map((item: any) => String(item.date || item.id || ""))
    );

    setDateRows((prev) =>
      prev.map((row) => {
        const shouldBeSelected = selectedDates.has(row.date);
        if (shouldBeSelected && !row.isSelected) {
          const computed = computeReasonFields(
            row.date,
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
            ...row,
            ...computed,
            punchOutTime,
            hoursText,
            isSelected: true,
            manuallyEdited: false,
            submitStatus: STATUS_PENDING,
          };
        } else if (!shouldBeSelected && row.isSelected) {
          return {
            ...row,
            isSelected: false,
            reasonValue: "",
            punchInTime: "",
            punchOutTime: "",
            hoursText: "",
            manuallyEdited: false,
            submitStatus: STATUS_PENDING,
          };
        }
        return row;
      })
    );
  };

  // -----------------------------------------------------------------------
  // ReactTable Columns
  // -----------------------------------------------------------------------

  const columns = useMemo(
    () => [
      {
        Header: "DATE",
        accessor: "date",
        Cell: ({ row }: any) => {
          const item: DateRow = row.original;
          return (
            <div className="flex items-center gap-2.5 py-1">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-semibold text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  {formatDateDisplay(item.date)}
                </div>
                <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  {getDayName(item.date)}
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
          const item: DateRow = row.original;
          return (
            <div className={cn("min-w-[200px]", !item.isSelected && "pointer-events-none")}>
              <Eselect
                name={`reason-${item.date}`}
                placeholder="Select reason"
                option={reasons}
                initialValue={item.reasonValue}
                handleInputChange={(_, val) => {
                  if (!item.isSelected) return;
                  handleRowReasonChange(item.date, String(val ?? ""));
                }}
                className={cn(
                  "!h-[34px] !rounded-[8px] !text-[12px]",
                  !item.isSelected && "bg-[#F8FAFC]/50 dark:bg-[#182235]/50"
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
          const item: DateRow = row.original;
          const isReadOnly = !item.punchInTime || !item.punchOutTime;
          return (
            <div className="w-[85px]">
              <Einput
                title=""
                labelClassName="hidden"
                name={`hours-${item.date}`}
                type="text"
                placeholder="H.MM"
                value={item.hoursText}
                readOnly={isReadOnly}
                tabIndex={isReadOnly ? -1 : 0}
                handleInputChange={(_, val) => {
                  if (isReadOnly) return;
                  setDateRows((prev) =>
                    prev.map((r) =>
                      r.date === item.date ? { ...r, hoursText: String(val ?? "") } : r
                    )
                  );
                }}
                onBlur={(e) => {
                  if (isReadOnly) return;
                  handleRowHoursBlur(item.date, e.target.value);
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
          const item: DateRow = row.original;
          const isTimeEditable =
            item.isSelected &&
            !!item.reasonValue &&
            !isShiftModeReason(item.reasonValue, reasons) &&
            !isAbsentReason(item.reasonValue);
          const isReadOnly = !isTimeEditable;

          return (
            <div className={cn("w-[115px]", isReadOnly && "pointer-events-none")}>
              <Einput
                title=""
                labelClassName="hidden"
                name={`in-${item.date}`}
                type="time"
                value={item.punchInTime}
                readOnly={isReadOnly}
                tabIndex={isReadOnly ? -1 : 0}
                handleInputChange={(_, val) => {
                  if (isReadOnly) return;
                  handleRowTimeChange(item.date, "punchInTime", String(val ?? ""));
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
          const item: DateRow = row.original;
          const isTimeEditable =
            item.isSelected &&
            !!item.reasonValue &&
            !isShiftModeReason(item.reasonValue, reasons) &&
            !isAbsentReason(item.reasonValue);
          const isReadOnly = !isTimeEditable;

          return (
            <div className={cn("w-[115px]", isReadOnly && "pointer-events-none")}>
              <Einput
                title=""
                labelClassName="hidden"
                name={`out-${item.date}`}
                type="time"
                value={item.punchOutTime}
                readOnly={isReadOnly}
                tabIndex={isReadOnly ? -1 : 0}
                handleInputChange={(_, val) => {
                  if (isReadOnly) return;
                  handleRowTimeChange(item.date, "punchOutTime", String(val ?? ""));
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
          const item: DateRow = row.original;
          return (
            <div className="flex items-center justify-center">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  item.submitStatus === 1
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : item.submitStatus === 2
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    : item.isSelected
                    ? "bg-amber-400"
                    : "bg-slate-300 dark:bg-slate-700"
                )}
                title={
                  item.submitStatus === 1
                    ? "Success"
                    : item.submitStatus === 2
                    ? item.submitMessage || "Failed"
                    : item.isSelected
                    ? "Selected"
                    : "Unselected"
                }
              />
            </div>
          );
        },
      },
    ],
    [
      reasons,
      dateShiftMap,
      masterInTime,
      masterOutTime,
      masterHoursText,
      masterReasonValue,
    ]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] px-3 sm:px-6 py-4 sm:py-6 pb-36 sm:pb-28">
      {/* 1. Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[18px] sm:text-[22px] font-semibold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
          Bulk punch — one employee, many days
        </h1>
        <p className="text-[12px] sm:text-[13px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-[450]">
          Pick the person and the month, then fill only the days that need fixing. Week-offs and holidays are marked for you.
        </p>
      </div>

      {/* 2. Top Filter & Quick Apply Card */}
      <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#E2E8F0] dark:border-[#1F2937] p-3.5 sm:p-5 shadow-xs mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Employee Select */}
          <div className="sm:col-span-1 lg:col-span-2">
            <Eselect
              title="EMPLOYEE *"
              name="selectedEmployee"
              placeholder="Select employee"
              option={employeeOptions}
              initialValue={selectedEmpCode}
              handleInputChange={(_, val) => handleEmployeeChange(String(val ?? ""))}
              className="w-full !h-[38px] !rounded-[10px] !text-[13px]"
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
            />
          </div>

          {/* Month Input */}
          <div className="sm:col-span-1 lg:col-span-2">
            <Einput
              title="MONTH *"
              name="month"
              type="month"
              value={month}
              handleInputChange={(_, val) => setMonth(String(val ?? ""))}
              className="!h-[38px] !rounded-[10px] !text-[13px]"
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
              ShortName={true}
            />
          </div>

          {/* Load Dates Button */}
          <div className="sm:col-span-1 lg:col-span-1 flex items-end">
            <Button
              type="button"
              variant="primary"
              onClick={fetchMonthDateRange}
              disabled={isLoadingDates || !selectedEmpCode}
              loading={isLoadingDates}
              className="!w-full !h-[38px] !px-3 !rounded-[10px] !bg-[#475569] hover:!bg-[#334155] dark:!bg-[#334155] dark:hover:!bg-[#475569] !text-white text-[12.5px] font-[600] whitespace-nowrap mb-0.5"
            >
              Load dates
            </Button>
          </div>

          {/* Quick Reason */}
          <div className="sm:col-span-1 lg:col-span-2">
            <Eselect
              title="QUICK REASON"
              name="quickReason"
              placeholder="Select reason"
              option={reasonOptions}
              initialValue={masterReasonValue}
              handleInputChange={(_, val) => handleMasterReasonChange(String(val ?? ""))}
              className="w-full !h-[38px] !rounded-[10px] !text-[13px]"
              labelClassName="text-[11px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8]"
            />
          </div>

          {/* Quick Hours */}
          <div className="sm:col-span-1 lg:col-span-1">
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

          {/* Quick In */}
          <div className={cn("sm:col-span-1 lg:col-span-1", isMasterTimeReadOnly && "pointer-events-none")}>
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

          {/* Quick Out */}
          <div className={cn("sm:col-span-1 lg:col-span-1", isMasterTimeReadOnly && "pointer-events-none")}>
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

          {/* Apply to Selected Button */}
          <div className="sm:col-span-2 lg:col-span-2 flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyToSelected}
              icon={<Wand2 className="w-4 h-4 text-[#4F46E5]" />}
              className="!w-full !h-[38px] !px-3 !rounded-[10px] !border-[#6366F1] !text-[#4F46E5] hover:!bg-[#EEF2FF] dark:!border-indigo-500/60 dark:!text-indigo-400 dark:hover:!bg-indigo-950/40 text-[12.5px] font-[600] whitespace-nowrap mb-0.5 flex items-center justify-center gap-1.5"
            >
              Apply to selected
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Empty State OR Loaded Table */}
      {dateRows.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#E2E8F0] dark:border-[#1F2937] py-20 px-6 sm:py-28 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] dark:bg-indigo-950/50 flex items-center justify-center mb-4 text-[#4F46E5] dark:text-indigo-400 shadow-2xs">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="text-[16px] sm:text-[18px] font-[700] text-[#0F172A] dark:text-[#F8FAFC] mb-1.5">
            Select an employee and a month
          </h2>
          <p className="text-[12.5px] sm:text-[13.5px] text-[#64748B] dark:text-[#94A3B8] max-w-md font-normal leading-relaxed">
            Then press <strong className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Load dates</strong> &mdash; every day of that month appears with its current marking so you can fill only what is missing.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#E2E8F0] dark:border-[#1F2937] overflow-hidden shadow-xs">
          {/* Card Header with Counts & Filter tabs + Search */}
          <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-[#E2E8F0] dark:border-[#1F2937] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] sm:text-[15px] font-[700] text-[#0F172A] dark:text-[#F8FAFC]">
                Date records
              </span>
              <span className="text-[11.5px] sm:text-[12.5px] font-[500] text-[#64748B] dark:text-[#94A3B8]">
                {selectedCount} selected &middot; {readyCount} ready
              </span>
            </div>

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
                  All {dateRows.length}
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
                  placeholder="Search date..."
                  value={searchTerm}
                  handleInputChange={(_, val) => setSearchTerm(String(val ?? ""))}
                  className="!h-[34px] !pl-8 !pr-3 !rounded-[10px] !text-[12px] sm:!text-[12.5px] w-full"
                />
              </div>
            </div>
          </div>

          {/* ReactTable */}
          <ReactTable
            columns={columns}
            data={filteredDateRows}
            check={true}
            selectValue="date"
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
      )}

      {/* 4. Sticky Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-sm border-t border-[#E2E8F0] dark:border-[#1F2937] px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] transition-[left] duration-150 ease-in-out">
        {/* Left Status Text */}
        <div className="text-[12px] sm:text-[13px] font-[550] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5 flex-wrap">
          {!selectedEmpCode ? (
            <span>No employee selected</span>
          ) : (
            <>
              <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {selectedEmpLabel}
              </span>
              <span>&middot;</span>
              <span>{selectedCount} selected</span>
              <span>&middot;</span>
              <span>{readyCount} ready</span>
              <span>&middot;</span>
              <span>{incompleteCount} incomplete</span>
            </>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClearEntries}
            disabled={dateRows.length === 0}
            className="!h-[38px] !px-4 !rounded-[10px] !text-[12.5px] font-[600] border-[#E2E8F0] dark:border-[#1F2937] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
          >
            Clear entries
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCount === 0}
            loading={isSubmitting}
            icon={<Fingerprint className="w-4 h-4" />}
            className="!h-[38px] !px-5 !rounded-[10px] !bg-[#334155] hover:!bg-[#1E293B] dark:!bg-[#1E293B] dark:hover:!bg-[#334155] !text-white text-[12.5px] font-[600] flex items-center gap-2"
          >
            Add punch ( {selectedCount} )
          </Button>
        </div>
      </footer>

      <HashloaderComponent isLoading={isLoadingEmployees || isLoadingDates || isSubmitting} />
    </div>
  );
}
