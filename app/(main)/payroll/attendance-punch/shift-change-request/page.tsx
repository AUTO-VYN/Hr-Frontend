"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  CalendarRange,
  Clock,
  ArrowRight,
  Send,
  Check,
  AlertTriangle,
} from "lucide-react";

import Einput from "@/components/atoms/Einput";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

interface ShiftItem {
  Misc_Code: string | number;
  Shift_Name: string;
  Start_Time: string;
  End_Time: string;
  [key: string]: any;
}

export default function ShiftChangeRequestPage() {
  const user = useCurrentUser();
  const dateRange = useDateRange({ preset: "today" });

  // ── Helper: Format Date & Time ─────────────────────────────────────────────
  const getDefaultDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateToYMD = (dateStr: any) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatTime = (time: any) => {
    if (!time) return "";
    return String(time).replace(".", ":");
  };

  const parseHour = (timeStr: any): number | null => {
    if (!timeStr) return null;
    const clean = String(timeStr).replace(".", ":").trim();
    const parts = clean.split(":");
    if (!parts.length) return null;
    const hour = parseInt(parts[0], 10);
    return isNaN(hour) ? null : hour;
  };

  const getShiftDurationHours = (
    startTime: string,
    endTime: string,
  ): number | null => {
    const sH = parseHour(startTime);
    const eH = parseHour(endTime);
    if (sH === null || eH === null) return null;
    if (sH === eH) return 24;
    return eH >= sH ? eH - sH : 24 - sH + eH;
  };

  // Generate 24 timeline blocks matching prototype logic
  const getTimelineBlocks = (rangeStr: string, activeTint: string) => {
    const spans: [number, number][] = [];
    (rangeStr || "").split(",").forEach((part) => {
      const match = /(\d{1,2}):\d{2}\s*[–-]\s*(\d{1,2}):\d{2}/.exec(part.trim());
      if (match) {
        spans.push([parseInt(match[1], 10), parseInt(match[2], 10)]);
      }
    });

    const blocks: { tint: string; title: string; isActive: boolean }[] = [];
    for (let h = 0; h < 24; h++) {
      const on = spans.some((s) =>
        s[0] <= s[1] ? h >= s[0] && h < s[1] : h >= s[0] || h < s[1],
      );
      blocks.push({
        tint: on ? activeTint : "var(--border)",
        title: `${String(h).padStart(2, "0")}:00`,
        isActive: on,
      });
    }
    return blocks;
  };

  // ── Toast Alert ────────────────────────────────────────────────────────────
  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ) => {
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

    Toast.fire({
      icon: type,
      title: message,
    });
  };

  // ── States ─────────────────────────────────────────────────────────────────
  const [dates, setDates] = useState({
    DATE_FROM: dateRange?.DATE_FROM || getDefaultDate(0),
    DATE_TO: dateRange?.DATE_TO || getDefaultDate(0),
    Current_SHIFT: "",
    currentStartTime: "",
    currentEndTime: "",
    currentMeta: "",
    MiscCode: "",
    Reason: "",
  });

  const [availableShifts, setAvailableShifts] = useState<ShiftItem[]>([]);
  const [approverInfo, setApproverInfo] = useState({
    approver1: "",
    approver2: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleInputChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value ?? "",
    }));
  };

  // ── Days Affected Calculation ──────────────────────────────────────────────
  const daysAffected = useMemo(() => {
    if (!dates.DATE_FROM || !dates.DATE_TO) return 0;
    const d1 = new Date(dates.DATE_FROM);
    const d2 = new Date(dates.DATE_TO);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / 86400000) + 1;
    return Math.max(0, diffDays);
  }, [dates.DATE_FROM, dates.DATE_TO]);

  // ── Fetch Current Shift & Available Options ────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getCurrentShiftTime`,
        {
          EMPCODE: user?.EMPCODE,
          date: formatDateToYMD(dates.DATE_FROM),
          DateTo: formatDateToYMD(dates.DATE_TO),
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const data = response?.data || {};
      const currentStart = formatTime(data.currentStartTime || "");
      const currentEnd = formatTime(data.currentEndTime || "");
      const currentShiftText =
        currentStart && currentEnd
          ? `${currentStart} – ${currentEnd}`
          : "";

      const duration =
        currentStart && currentEnd
          ? getShiftDurationHours(currentStart, currentEnd)
          : null;

      setDates((prev) => ({
        ...prev,
        Current_SHIFT: currentShiftText,
        currentStartTime: currentStart,
        currentEndTime: currentEnd,
        currentMeta:
          data.currentMeta ||
          (currentShiftText
            ? `${data.currentShiftName || "General"} shift · ${duration || 9} hours`
            : ""),
      }));

      const rawShifts: ShiftItem[] = Array.isArray(data.Result)
        ? data.Result
        : [];
      setAvailableShifts(rawShifts);

      const app1 =
        data.Approver1 ||
        data.Appr1_Name ||
        data.Approver1_Name ||
        data.approver1_A ||
        data.Reporting_Manager ||
        data.reporting_manager ||
        user?.reporting_manager ||
        "";

      const app2 =
        data.Approver2 ||
        data.Appr2_Name ||
        data.Approver2_Name ||
        data.approver1_B ||
        data.Branch_Head ||
        data.branch_head ||
        user?.branch_head ||
        "";

      setApproverInfo({
        approver1: app1,
        approver2: app2,
      });
    } catch (error: any) {
      console.error("Error fetching shift time:", error);
      const errMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong while fetching shift details";
      showSideAlert(errMessage, "error");
    } finally {
      setIsLoading(false);
    }
  }, [user?.EMPCODE, user?.Comp_Code, user?.name, dates.DATE_FROM, dates.DATE_TO]);

  useEffect(() => {
    if (user?.EMPCODE) {
      fetchData();
    }
  }, [fetchData, user?.EMPCODE]);

  // ── Selected New Shift Object ──────────────────────────────────────────────
  const selectedNewShift = useMemo(() => {
    if (!dates.MiscCode) return null;
    return (
      availableShifts.find(
        (s) => String(s.Misc_Code) === String(dates.MiscCode),
      ) || null
    );
  }, [availableShifts, dates.MiscCode]);

  const newShiftRange = useMemo(() => {
    if (!selectedNewShift) return "";
    return `${formatTime(selectedNewShift.Start_Time)} – ${formatTime(selectedNewShift.End_Time)}`;
  }, [selectedNewShift]);

  const picked = Boolean(selectedNewShift);

  const isSameShift = useMemo(() => {
    if (!selectedNewShift || !dates.Current_SHIFT) return false;
    return newShiftRange === dates.Current_SHIFT;
  }, [selectedNewShift, newShiftRange, dates.Current_SHIFT]);

  const newMeta = useMemo(() => {
    if (!picked) return "Nothing selected yet";
    if (isSameShift) return "Same as the current shift";
    return `${selectedNewShift?.Shift_Name || "New"} shift · 9 hours`;
  }, [picked, isSameShift, selectedNewShift]);

  // Options for Eselect
  const shiftSelectOptions = useMemo(() => {
    return availableShifts.map((item) => ({
      value: String(item.Misc_Code),
      label: `${item.Shift_Name} · ${formatTime(item.Start_Time)} – ${formatTime(item.End_Time)}`,
    }));
  }, [availableShifts]);

  // Readiness for submission
  const isReady =
    dates.DATE_FROM &&
    dates.DATE_TO &&
    daysAffected > 0 &&
    picked &&
    !isSameShift &&
    Boolean(dates.Reason.trim());

  // Dynamic box borders and backgrounds
  const newBorderColor = picked
    ? isSameShift
      ? "rgba(245,158,11,.5)"
      : "rgba(16,185,129,.45)"
    : "var(--border)";

  const newBgColor = picked
    ? isSameShift
      ? "rgba(245,158,11,.06)"
      : "rgba(16,185,129,.05)"
    : "transparent";

  // Timeline blocks for current and new shifts
  const currentBlocks = useMemo(() => {
    return getTimelineBlocks(dates.Current_SHIFT, "#4F46E5");
  }, [dates.Current_SHIFT]);

  const newBlocks = useMemo(() => {
    return getTimelineBlocks(newShiftRange, "#10B981");
  }, [newShiftRange]);

  // ── Apply Shift Change ─────────────────────────────────────────────────────
  const handleApplyShiftChange = async () => {
    if (!picked) {
      showSideAlert("Pick the new shift", "warning");
      return;
    }
    if (isSameShift) {
      showSideAlert("The new shift is the same as the current one", "warning");
      return;
    }
    if (daysAffected <= 0) {
      showSideAlert("The to date must be on or after the from date", "warning");
      return;
    }
    if (!dates.Reason.trim()) {
      showSideAlert("Add a reason for the change", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/applyShiftChange`,
        {
          EmpCode: user?.EMPCODE,
          DateFrom: formatDateToYMD(dates.DATE_FROM),
          DateTo: formatDateToYMD(dates.DATE_TO),
          MiscCode: dates.MiscCode,
          Current_SHIFT: dates.Current_SHIFT || "",
          createdBy: user?.EMPCODE || "SYSTEM",
          Reason: dates.Reason,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log("Apply Shift Response:", response);
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: `Shift change raised for ${daysAffected} day(s) — sent to approver 1`,
      });

      // Reset
      setDates((prev) => ({
        ...prev,
        MiscCode: "",
        Reason: "",
      }));
    } catch (error: any) {
      console.error("Error saving shift change:", error);
      const errMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong while saving Shift_Change_Request";
      showSideAlert(errMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setDates((prev) => ({
      ...prev,
      MiscCode: "",
      Reason: "",
    }));
    showSideAlert("Form cleared", "info");
  };

  // Route steps
  const routeSteps = [
    {
      num: 1,
      label: "Approver 1 · reporting manager",
      who: approverInfo.approver1,
      dotBg: "#4F46E5",
      dotFg: "#FFFFFF",
      dotBorder: "#4F46E5",
      line: true,
    },
    {
      num: 2,
      label: "Approver 2 · branch head",
      who: approverInfo.approver2,
      dotBg: "transparent",
      dotFg: "#64748B",
      dotBorder: "var(--border)",
      line: true,
    },
    {
      num: 3,
      label: "Roster updated",
      who: "Automatic once both approve",
      dotBg: "transparent",
      dotFg: "#64748B",
      dotBorder: "var(--border)",
      line: false,
    },
  ];

  // Checklist items
  const checks = [
    {
      label:
        daysAffected > 0
          ? `${daysAffected} day(s) selected`
          : "Pick a valid date range",
      ok: daysAffected > 0,
    },
    {
      label:
        picked && !isSameShift
          ? "New shift differs from the current one"
          : "Choose a different shift",
      ok: picked && !isSameShift,
    },
    {
      label: dates.Reason.trim() ? "Reason provided" : "A reason is required",
      ok: Boolean(dates.Reason.trim()),
    },
    {
      label: "Attendance already marked in this period will not be recalculated",
      ok: false,
    },
  ];

  return (
    <div
      style={
        {
          "--bg": "#F8FAFC",
          "--card": "#FFFFFF",
          "--fg": "#1E293B",
          "--muted": "#64748B",
          "--border": "#E2E8F0",
          "--brand": "#4F46E5",
          "--brand-soft": "#EEF2FF",
          "--hover": "#F1F5F9",
          "--sub": "#F8FAFC",
          "--field": "#FFFFFF",
          "--shadow":
            "0 1px 2px rgba(15,23,42,.04), 0 10px 26px -14px rgba(15,23,42,.14)",
        } as React.CSSProperties
      }
      className="min-h-screen w-full min-w-0 bg-[#F8FAFC] dark:bg-[#0A0F1C] px-4 sm:px-6 py-5 text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif]"
    >
      <div className="mx-auto w-full max-w-[1240px]">
        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "18px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "21px",
              fontWeight: 650,
              letterSpacing: "-.02em",
            }}
            className="text-[#1E293B] dark:text-white"
          >
            Request a shift change
          </h1>
          <p
            style={{
              margin: "5px 0 0 0",
              fontSize: "12.5px",
              color: "#64748B",
            }}
            className="dark:text-[#94A3B8]"
          >
            Pick the period and the shift you want. The change goes to two
            approvers before the roster is rewritten.
          </p>
        </div>

        {/* ── MAIN CONTENT GRID ────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 380px",
            gap: "14px",
            alignItems: "start",
          }}
          className="max-[1180px]:!grid-cols-1"
        >
          {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* 1. PERIOD CARD */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "var(--shadow)",
                padding: "16px 18px 18px 18px",
              }}
              className="dark:!bg-[#111827] dark:!border-[#1F2937]"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}
                  className="dark:!bg-[#1E1B4B] dark:!text-[#8B84FF]"
                >
                  <CalendarRange className="w-4 h-4" />
                </span>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                  className="text-[#1E293B] dark:text-white"
                >
                  Period
                </h2>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "var(--muted)",
                  }}
                >
                  {daysAffected > 0
                    ? `${daysAffected} day(s) affected`
                    : "Pick a valid period"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: "12px",
                  alignItems: "end",
                }}
                className="max-[640px]:!grid-cols-1"
              >
                <div style={{ minWidth: 0 }}>
                  <Einput
                    title="DATE FROM"
                    name="DATE_FROM"
                    type="date"
                    ShortName={true}
                    redlabel="*"
                    value={dates.DATE_FROM}
                    handleInputChange={handleInputChange}
                    className="!h-[36px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-slate-800"
                  />
                </div>

                <div style={{ minWidth: 0 }}>
                  <Einput
                    title="DATE TO"
                    name="DATE_TO"
                    type="date"
                    ShortName={true}
                    redlabel="*"
                    value={dates.DATE_TO}
                    handleInputChange={handleInputChange}
                    className="!h-[36px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-slate-800"
                  />
                </div>

                <div style={{ paddingBottom: "2px" }}>
                  <AButton
                    type="button"
                    variant="outline"
                    onClick={fetchData}
                    loading={isLoading}
                    className="!h-[36px] !border-[var(--border)] !bg-[var(--card)] !text-[var(--brand)] !text-[12.5px] !font-[600] !px-[18px] !rounded-[9px] hover:!bg-[var(--brand-soft)] shadow-none whitespace-nowrap"
                  >
                    Show roster
                  </AButton>
                </div>
              </div>
            </div>

            {/* 2. SHIFT CARD */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "var(--shadow)",
                padding: "17px 19px 19px 19px",
              }}
              className="dark:!bg-[#111827] dark:!border-[#1F2937]"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                  }}
                  className="dark:!bg-[#1E1B4B] dark:!text-[#8B84FF]"
                >
                  <Clock className="w-4 h-4" />
                </span>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                  className="text-[#1E293B] dark:text-white"
                >
                  Shift
                </h2>
              </div>

              {/* Shift Comparison Box */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 44px minmax(0,1fr)",
                  gap: "14px",
                  alignItems: "center",
                }}
                className="max-[768px]:!grid-cols-1"
              >
                {/* Current Shift Box (Left) */}
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "15px 16px",
                    background: "var(--sub)",
                  }}
                  className="dark:!bg-[#0E1524] dark:!border-[#1F2937]"
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      letterSpacing: ".03em",
                      textTransform: "uppercase",
                    }}
                  >
                    Current shift
                  </div>
                  <div
                    style={{
                      fontSize: "19px",
                      fontWeight: 650,
                      letterSpacing: "-.02em",
                      marginTop: "8px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                    className="text-[#1E293B] dark:text-white"
                  >
                    {dates.Current_SHIFT || "—"}
                  </div>
                  {dates.currentMeta ? (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--muted)",
                        marginTop: "4px",
                      }}
                    >
                      {dates.currentMeta}
                    </div>
                  ) : null}

                  {/* 24-Hour Timeline Bar */}
                  <div
                    style={{
                      display: "flex",
                      gap: "3px",
                      marginTop: "12px",
                    }}
                  >
                    {currentBlocks.map((b, idx) => (
                      <span
                        key={`curr-${idx}`}
                        title={b.title}
                        style={{
                          flex: 1,
                          height: "20px",
                          borderRadius: "2px",
                          background: b.isActive ? "#4F46E5" : "var(--border)",
                        }}
                        className={
                          !b.isActive ? "dark:!bg-[#1F2937]" : undefined
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Arrow Separator */}
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    color: "var(--muted)",
                  }}
                  className="max-[768px]:hidden"
                >
                  <ArrowRight className="w-4 h-4 text-[#64748B]" />
                </div>

                {/* New Shift Box (Right) */}
                <div
                  style={{
                    border: `1px solid ${newBorderColor}`,
                    borderRadius: "12px",
                    padding: "15px 16px",
                    background: newBgColor,
                  }}
                  className="transition-all"
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      letterSpacing: ".03em",
                      textTransform: "uppercase",
                    }}
                  >
                    New shift
                    <span style={{ color: "#E11D48" }}> *</span>
                  </div>

                  <div style={{ marginTop: "8px" }}>
                    <Eselect
                      name="MiscCode"
                      placeholder="Select new shift"
                      className="!h-[36px] !text-[12.5px] !rounded-[9px] !border-[var(--border)] dark:!border-[#1F2937] dark:!bg-[#0E1524]"
                      option={shiftSelectOptions}
                      initialValue={dates.MiscCode}
                      handleInputChange={handleInputChange}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: isSameShift ? "#B45309" : "var(--muted)",
                      marginTop: "8px",
                    }}
                  >
                    {newMeta}
                  </div>

                  {/* 24-Hour Timeline Bar for New Shift */}
                  <div
                    style={{
                      display: "flex",
                      gap: "3px",
                      marginTop: "10px",
                    }}
                  >
                    {newBlocks.map((b, idx) => (
                      <span
                        key={`new-${idx}`}
                        title={b.title}
                        style={{
                          flex: 1,
                          height: "20px",
                          borderRadius: "2px",
                          background: b.isActive ? "#10B981" : "var(--border)",
                        }}
                        className={
                          !b.isActive ? "dark:!bg-[#1F2937]" : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline Legend */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginTop: "12px",
                  fontSize: "11.5px",
                  color: "var(--muted)",
                }}
                className="max-[640px]:flex-wrap"
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "2px",
                      background: "#4F46E5",
                    }}
                  />
                  Current working hours
                </span>

                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "2px",
                      background: "#10B981",
                    }}
                  />
                  New working hours
                </span>

                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "2px",
                      background: "var(--border)",
                    }}
                    className="dark:!bg-[#1F2937]"
                  />
                  Off hours
                </span>

                <div style={{ flex: 1 }} />
                <span>00:00 to 23:00</span>
              </div>

              {/* Reason Field */}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  marginTop: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--muted)",
                    letterSpacing: ".03em",
                    textTransform: "uppercase",
                  }}
                >
                  Reason<span style={{ color: "#E11D48" }}> *</span>
                </span>
                <textarea
                  name="Reason"
                  rows={3}
                  maxLength={200}
                  value={dates.Reason}
                  onChange={(e) => handleInputChange("Reason", e.target.value)}
                  placeholder="Why the change is needed and who agreed to it…"
                  style={{
                    width: "100%",
                    minHeight: "76px",
                    resize: "vertical",
                    border: "1px solid var(--border)",
                    borderRadius: "9px",
                    background: "var(--field)",
                    color: "var(--fg)",
                    fontSize: "12.5px",
                    padding: "9px 10px",
                    outline: "none",
                  }}
                  className="focus:!border-[var(--brand)] dark:!bg-[#0E1524] dark:!border-[#1F2937] dark:!text-white"
                />
              </label>

              {/* Bottom Actions Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "15px",
                }}
                className="max-[640px]:flex-wrap"
              >
                <span
                  style={{
                    flex: "1 1 0%",
                    minWidth: 0,
                    fontSize: "12px",
                    color: "var(--muted)",
                  }}
                >
                  {isReady
                    ? `${daysAffected} day(s) · ${dates.Current_SHIFT} → ${newShiftRange}`
                    : "Complete the required fields to apply"}
                </span>

                <AButton
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="!border-[var(--border)] !bg-[var(--card)] !text-[var(--muted)] !text-[12.5px] !font-[550] !px-[14px] !py-[9px] !rounded-[9px] hover:!bg-[var(--hover)] hover:!text-[var(--fg)] shadow-none"
                >
                  Clear
                </AButton>

                <AButton
                  type="button"
                  variant="primary"
                  onClick={handleApplyShiftChange}
                  loading={isLoading}
                  disabled={!isReady}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="!text-[12.5px] !font-[600] !px-[17px] !py-[9px] !rounded-[9px] !shadow-[var(--shadow)] !border-none"
                  style={{
                    background: isReady ? "var(--brand)" : "var(--muted)",
                    cursor: isReady ? "pointer" : "not-allowed",
                  }}
                >
                  Apply shift change
                </AButton>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (STICKY SIDEBAR) ──────────────────────────────── */}
          <div
            style={{
              position: "sticky",
              top: "82px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* 3. APPROVAL ROUTE CARD */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "var(--shadow)",
                padding: "15px 17px 17px 17px",
              }}
              className="dark:!bg-[#111827] dark:!border-[#1F2937]"
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  letterSpacing: ".03em",
                  textTransform: "uppercase",
                }}
              >
                Approval route
              </span>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  marginTop: "13px",
                }}
              >
                {routeSteps.map((r, i) => (
                  <div key={`step-${i}`} style={{ display: "flex", gap: "11px" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      <span
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "11px",
                          fontWeight: 650,
                          background: r.dotBg,
                          color: r.dotFg,
                          border: `1.5px solid ${r.dotBorder}`,
                        }}
                      >
                        {r.num}
                      </span>
                      {r.line && (
                        <span
                          style={{
                            width: "2px",
                            flex: 1,
                            minHeight: "26px",
                            background: "var(--border)",
                          }}
                          className="dark:!bg-[#1F2937]"
                        />
                      )}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        paddingBottom: r.line ? "14px" : "0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 600,
                        }}
                        className="text-[#1E293B] dark:text-white"
                      >
                        {r.label}
                      </div>
                      {r.who ? (
                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "var(--muted)",
                            marginTop: "2px",
                          }}
                        >
                          {r.who}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. BEFORE YOU APPLY CARD */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "var(--shadow)",
                padding: "15px 17px 17px 17px",
              }}
              className="dark:!bg-[#111827] dark:!border-[#1F2937]"
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  letterSpacing: ".03em",
                  textTransform: "uppercase",
                }}
              >
                Before you apply
              </span>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "9px",
                  marginTop: "12px",
                }}
              >
                {checks.map((c, i) => (
                  <div
                    key={`check-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "9px",
                      fontSize: "12px",
                    }}
                  >
                    <span
                      style={{
                        width: "17px",
                        height: "17px",
                        borderRadius: "5px",
                        flex: "0 0 auto",
                        display: "grid",
                        placeItems: "center",
                        background: c.ok
                          ? "rgba(16,185,129,.15)"
                          : "rgba(245,158,11,.16)",
                        color: c.ok ? "#10B981" : "#B45309",
                        marginTop: "1px",
                      }}
                    >
                      {c.ok ? (
                        <Check className="w-3 h-3 stroke-[2.8]" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        lineHeight: 1.5,
                      }}
                      className="text-[#1E293B] dark:text-[#E7ECF3]"
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
