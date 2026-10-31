"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import CustomCalendar, { getStatusInfo, KIND } from "@/components/atoms/calendar";
import Button from "@/components/atoms/Button";
import Card from "@/components/Templates/card";
import {
  CalendarDays,
  Clock,
  ArrowLeft,
  FileSpreadsheet,
  MousePointerClick,
  CheckCircle2,
} from "lucide-react";

const REASONS: Record<string, string> = {
  A: "No punch recorded",
  UM: "Mis-punch not yet approved",
  L: "Approved leave",
  H: "Declared holiday",
  HO: "Declared holiday",
  WO: "Weekly off",
  P: "Regular attendance",
  HLF: "Half day granted",
  HD: "Half day granted",
  R: "Relaxation applied",
};

export default function AttendanceCalendarPage() {
  const user = useCurrentUser();

  const compCode =
    user?.Comp_Code ||
    (user as any)?.comp_code ||
    (user as any)?.COMP_CODE ||
    (user as any)?.compcode ||
    (user as any)?.company_code ||
    user?.DB;
  const userEmpCode = user?.EMPCODE;

  // Refs to prevent duplicate API hits on tab switch / window focus
  const hasFetchedMonthMaster = useRef(false);
  const lastFetchedParams = useRef("");

  // Summary statistics state
  const [summary, setSummary] = useState<any>({
    Presents: 0,
    Absents: 0,
    HalfDays: 0,
    Holidays: 0,
    WO: 0,
    Relaxations: 0,
    UnAprMP: 0,
    Leave: 0,
    PaidDays: 0,
    PresentSum: 0,
    AbsentSum: 0,
    HalfDaySum: 0,
    WeekOffSum: 0,
    HolidaySum: 0,
    RelaxationSum: 0,
    PaidDaysSum: 0,
    UnAprMPSum: 0,
    LeaveSum: 0,
  });

  // Calendar dates and attendance records
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [color, setColor] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  // Selected Day state for Day Details Card
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Toast message state for export action
  const [toast, setToast] = useState<string>("");

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast("");
    }, 2400);
  };

  // Initial Month master range fetch - strictly runs ONCE
  useEffect(() => {
    if (!compCode || hasFetchedMonthMaster.current) return;
    hasFetchedMonthMaster.current = true;

    const fetchInitialMonth = async () => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/MonthMaster`,
          {
            Comp_Code: compCode,
            comp_code: compCode,
            compcode: compCode,
          },
          {
            headers: {
              compcode: compCode,
              Comp_Code: compCode,
              name: user?.name,
            },
          }
        );

        if (response.data?.Result?.[0]) {
          setStartDate(response.data.Result[0].Misc_Dtl1_Date);
          setEndDate(response.data.Result[0].Misc_Dtl2_Date);
        }
      } catch (error) {
        console.error("Error fetching MonthMaster data:", error);
      }
    };

    fetchInitialMonth();
  }, [compCode]);

  // Fetch attendance data - only runs when date or user params actually change, NOT on tab switch
  useEffect(() => {
    if (!startDate || !endDate || !compCode) return;

    const fetchKey = `${compCode}_${userEmpCode}_${startDate}_${endDate}`;
    if (lastFetchedParams.current === fetchKey) return;
    lastFetchedParams.current = fetchKey;

    fetchAttendance();
  }, [startDate, endDate, compCode, userEmpCode]);

  const fetchAttendance = async () => {
    const compCode =
      user?.Comp_Code ||
      (user as any)?.comp_code ||
      (user as any)?.COMP_CODE ||
      (user as any)?.compcode ||
      (user as any)?.company_code ||
      user?.DB;

    if (!compCode) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getAttendance1`,
        {
          params: {
            empCode: user?.EMPCODE,
            startDate,
            endDate,
            Comp_Code: compCode,
            compcode: compCode,
          },
          headers: {
            compcode: compCode,
            Comp_Code: compCode,
            name: user?.name,
          },
        }
      );

      const colorData = response.data?.Result || [];
      setAttendanceRecords(colorData);

      const array: any[] = [];
      colorData.forEach((row: any) => {
        const day = row.DateDisplay?.split("/")[0];
        array.push({
          day,
          colorCode: row.colorCode,
          status: row.AtnStatus,
          raw: row,
        });
      });
      setColor(array);

      // Auto-sum full month statistics from Result records, falling back to backend summary
      const computed = computeSummary(colorData, response.data?.summary);
      setSummary(computed);

      // If a day was selected, refresh its details from the new data
      if (selectedDay) {
        const match = colorData.find((r: any) => {
          const d = parseInt(r.DateDisplay?.split("/")[0], 10);
          return d === selectedDay;
        });
        setSelectedRecord(match || null);
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  // Helper to compute full month sums from records
  const computeSummary = (records: any[], backendSummary?: any) => {
    const s = backendSummary || {};

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let holiday = 0;
    let weekOff = 0;
    let relaxation = 0;
    let unAprMP = 0;
    let leave = 0;
    let paidDays = 0;

    if (Array.isArray(records) && records.length > 0) {
      records.forEach((r) => {
        const atn = String(r.AtnStatus || "").toUpperCase().trim();

        // Present
        const p = parseFloat(r.Present);
        if (!isNaN(p) && p > 0) {
          present += p;
        } else if (atn === "P" || atn === "PRESENT") {
          present += 1;
        }

        // Absent
        const a = parseFloat(r.Absent);
        if (!isNaN(a) && a > 0) {
          absent += a;
        } else if (atn === "A" || atn === "ABSENT") {
          absent += 1;
        }

        // HalfDay (HLF, HD, HALF)
        const hd = parseFloat(r.HalfDay);
        if (!isNaN(hd) && hd > 0) {
          halfDay += hd;
        } else if (atn === "HLF" || atn === "HD" || atn.includes("HALF")) {
          halfDay += 1;
        }

        // Holiday (H, HO, HOLIDAY)
        const ho = parseFloat(r.Holiday);
        if (!isNaN(ho) && ho > 0) {
          holiday += ho;
        } else if (atn === "H" || atn === "HO" || atn.includes("HOLIDAY")) {
          holiday += 1;
        }

        // WeekOff
        const wo = parseFloat(r.WeekOff);
        if (!isNaN(wo) && wo > 0) {
          weekOff += wo;
        } else if (atn === "WO" || atn.includes("WEEK")) {
          weekOff += 1;
        }

        // Relaxation
        const rx = parseFloat(r.Relaxation);
        if (!isNaN(rx) && rx > 0) {
          relaxation += rx;
        } else if (atn === "R" || atn.includes("RELAX")) {
          relaxation += 1;
        }

        // Unapproved mis-punch
        const um = parseFloat(r.UnAprMP);
        if (!isNaN(um) && um > 0) {
          unAprMP += um;
        } else if (atn === "UM" || atn.includes("MIS") || atn.includes("UNAPR")) {
          unAprMP += 1;
        }

        // Leave
        const lv = parseFloat(r.Leave);
        if (!isNaN(lv) && lv > 0) {
          leave += lv;
        } else if (atn === "L" || atn.includes("LEAVE")) {
          leave += 1;
        }

        // PaidDays
        const pd = parseFloat(r.paidDays || r.PaidDays);
        if (!isNaN(pd) && pd > 0) {
          paidDays += pd;
        }
      });

      if (paidDays === 0 && present > 0) {
        paidDays = present + halfDay * 0.5 + holiday + weekOff + leave + relaxation;
      }
    }

    // Exact backend summary keys: Presents, Absents, HalfDays, Holidays, WO, Relaxations, UnAprMP, Leave, PaidDays
    const finalPresents = s.Presents !== undefined ? Number(s.Presents) : (s.PresentSum !== undefined ? Number(s.PresentSum) : (s.Present !== undefined ? Number(s.Present) : present));
    const finalAbsents = s.Absents !== undefined ? Number(s.Absents) : (s.AbsentSum !== undefined ? Number(s.AbsentSum) : (s.Absent !== undefined ? Number(s.Absent) : absent));
    const finalHalfDays = s.HalfDays !== undefined ? Number(s.HalfDays) : (s.HalfDaySum !== undefined ? Number(s.HalfDaySum) : (s.HalfDay !== undefined ? Number(s.HalfDay) : halfDay));
    const finalHolidays = s.Holidays !== undefined ? Number(s.Holidays) : (s.HolidaySum !== undefined ? Number(s.HolidaySum) : (s.Holiday !== undefined ? Number(s.Holiday) : holiday));
    const finalWO = s.WO !== undefined ? Number(s.WO) : (s.WeekOffSum !== undefined ? Number(s.WeekOffSum) : (s.WeekOff !== undefined ? Number(s.WeekOff) : weekOff));
    const finalRelaxations = s.Relaxations !== undefined ? Number(s.Relaxations) : (s.RelaxationSum !== undefined ? Number(s.RelaxationSum) : (s.Relaxation !== undefined ? Number(s.Relaxation) : relaxation));
    const finalUnAprMP = s.UnAprMP !== undefined ? Number(s.UnAprMP) : (s.UnAprMPSum !== undefined ? Number(s.UnAprMPSum) : unAprMP);
    const finalLeave = s.Leave !== undefined ? Number(s.Leave) : (s.LeaveSum !== undefined ? Number(s.LeaveSum) : (s.Leave !== undefined ? Number(s.Leave) : leave));
    const finalPaidDays = s.PaidDays !== undefined ? Number(s.PaidDays) : (s.PaidDaysSum !== undefined ? Number(s.PaidDaysSum) : (s.paidDays !== undefined ? Number(s.paidDays) : paidDays));

    return {
      Presents: finalPresents,
      Absents: finalAbsents,
      HalfDays: finalHalfDays,
      Holidays: finalHolidays,
      WO: finalWO,
      Relaxations: finalRelaxations,
      UnAprMP: finalUnAprMP,
      Leave: finalLeave,
      PaidDays: finalPaidDays,
      // Also provide *Sum aliases
      PresentSum: finalPresents,
      AbsentSum: finalAbsents,
      HalfDaySum: finalHalfDays,
      HolidaySum: finalHolidays,
      WeekOffSum: finalWO,
      RelaxationSum: finalRelaxations,
      UnAprMPSum: finalUnAprMP,
      LeaveSum: finalLeave,
      PaidDaysSum: finalPaidDays,
    };
  };

  // Callback when user clicks on any calendar day
  const handleSelectDay = (day: number, record?: any) => {
    setSelectedDay(day);
    if (record) {
      setSelectedRecord(record);
    } else {
      const match = attendanceRecords.find((r) => {
        const d = parseInt(r.DateDisplay?.split("/")[0], 10);
        return d === day;
      });
      setSelectedRecord(match || null);
    }
  };

  // Callback from CustomCalendar when month is changed
  const handleDataLoaded = (data: any) => {
    const records = data?.Result || [];
    setAttendanceRecords(records);

    // Auto-sum full month statistics from loaded month records
    const computed = computeSummary(records, data?.summary);
    setSummary(computed);

    setSelectedDay(null);
    setSelectedRecord(null);
  };

  // Formatted month title for stats header (e.g. August 2026)
  const currentMonthTitle = endDate
    ? new Date(endDate).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    : "";

  // Days in month calculation for paid days threshold
  const daysInMonth = endDate
    ? new Date(
        new Date(endDate).getFullYear(),
        new Date(endDate).getMonth() + 1,
        0
      ).getDate()
    : 31;

  // Formatted date string for selected day card (e.g. 1 August 2026)
  const selectedDateFormatted = selectedDay && endDate
    ? `${selectedDay} ${new Date(endDate).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })}`
    : "";

  // Selected day status info
  const selectedStatus = selectedRecord
    ? getStatusInfo(selectedRecord.colorCode, selectedRecord.AtnStatus)
    : null;

  const pickTint = selectedStatus ? selectedStatus.color : "var(--muted)";
  const pickTintBg = selectedStatus ? `${selectedStatus.color}1F` : "var(--sub)";

  // Navigate to mispunch request page
  const handleRaiseMispunch = () => {
    let queryDate = "";
    if (selectedRecord?.DateDisplay) {
      queryDate = selectedRecord.DateDisplay;
    } else if (selectedDay && endDate) {
      const d = new Date(endDate);
      queryDate = `${String(selectedDay).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`;
    }
    window.location.href = `/payroll/attendance-punch/mispunch-request${
      queryDate ? `?date=${encodeURIComponent(queryDate)}` : ""
    }`;
  };

  // Export attendance data to CSV
  const handleExport = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      showToast("No attendance data to export.");
      return;
    }

    try {
      const headers = ["Date", "Status", "In Time", "Out Time", "Shift", "Remarks"];
      const csvRows = [
        headers.join(","),
        ...attendanceRecords.map((r) =>
          [
            `"${r.DateDisplay || ""}"`,
            `"${r.AtnStatus || ""}"`,
            `"${r.In1 || ""}"`,
            `"${r.Out1 || ""}"`,
            `"${r.Shift || r.ShiftName || ""}"`,
            `"${r.Remarks || r.Reason || ""}"`,
          ].join(",")
        ),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Attendance_${currentMonthTitle.replace(/\s+/g, "_")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Exporting the month's attendance to Excel…");
    } catch {
      showToast("Exporting the month's attendance to Excel…");
    }
  };

  // Stats items list strictly matching prototype and screenshots
  const statItems = [
    {
      label: "Presents",
      value: summary?.Presents ?? summary?.PresentSum ?? 0,
      tint: KIND.P.color,
    },
    {
      label: "Absents",
      value: summary?.Absents ?? summary?.AbsentSum ?? 0,
      tint: KIND.A.color,
    },
    {
      label: "Half days",
      value: summary?.HalfDays ?? summary?.HalfDaySum ?? 0,
      tint: KIND.HLF.color,
    },
    {
      label: "Holidays",
      value: summary?.Holidays ?? summary?.HolidaySum ?? 0,
      tint: KIND.H.color,
    },
    {
      label: "Week offs",
      value: summary?.WO ?? summary?.WeekOffSum ?? 0,
      tint: KIND.WO.color,
    },
    {
      label: "Relaxations",
      value: summary?.Relaxations ?? summary?.RelaxationSum ?? 0,
      tint: KIND.R.color,
    },
    {
      label: "Unapproved mis-punch",
      value: summary?.UnAprMP ?? summary?.UnAprMPSum ?? 0,
      tint: KIND.UM.color,
    },
    {
      label: "Leave",
      value: summary?.Leave ?? summary?.LeaveSum ?? 0,
      tint: KIND.L.color,
    },
  ];

  const paidDaysVal = Number(summary?.PaidDays ?? summary?.PaidDaysSum ?? 0);
  const paidFg = paidDaysVal < daysInMonth * 0.6 ? "#E11D48" : "#10B981";

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
          fontFamily: "Inter, system-ui, sans-serif",
          fontFeatureSettings: "'tnum' 1",
        } as React.CSSProperties
      }
      className="w-full min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col dark:[--bg:#0A0F1C] dark:[--card:#111827] dark:[--fg:#E7ECF3] dark:[--muted:#94A3B8] dark:[--border:#1F2937] dark:[--brand:#8B84FF] dark:[--brand-soft:#1E1B4B] dark:[--hover:#182235] dark:[--sub:#0E1524] dark:[--field:#0E1524] dark:[--shadow:0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)]"
    >
      {/* Top Sticky Header matching HTML prototype */}


      {/* Main Content: 2-Column Responsive Grid matching prototype */}
      <main className="flex-1 p-[22px_24px_60px_24px]">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-[14px] items-start">
          {/* Left Column: Calendar Card */}
          <div className="min-w-0">
            <CustomCalendar
              startDate={startDate}
              endDate={endDate}
              setstartDate={setStartDate}
              setendDate={setEndDate}
              color={color}
              setColor={setColor}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
              onDataLoaded={handleDataLoaded}
            />
          </div>

          {/* Right Column: 340px Sticky Sidebar Cards */}
          <div className="sticky top-[82px] flex flex-col gap-3">
            {/* Card 1: Attendance Stats Card */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[12px] shadow-[var(--shadow)] overflow-hidden">
              <div className="p-[14px_18px] border-b border-[var(--border)]">
                <h2 className="m-0 text-[14px] font-[600] text-[var(--fg)]">
                  Attendance stats
                </h2>
                <p className="m-[4px_0_0_0] text-[11.5px] text-[var(--muted)]">
                  {(attendanceRecords?.[0]?.EmpName || user?.name || "Employee") + " · " + currentMonthTitle}
                </p>
              </div>

              {/* Stats Rows */}
              <div>
                {statItems.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-[11px] p-[10px_18px] border-b border-[var(--border)] hover:bg-[var(--sub)] transition-colors"
                  >
                    <span
                      className="w-[10px] h-[10px] rounded-[3px] shrink-0"
                      style={{ backgroundColor: s.tint }}
                    />
                    <span className="flex-1 min-w-0 text-[12.5px] font-[500] text-[var(--fg)]">
                      {s.label}
                    </span>
                    <span
                      className="shrink-0 text-[13.5px] font-[650] tabular-nums"
                      style={{
                        color: s.value === 0 ? "var(--muted)" : "var(--fg)",
                      }}
                    >
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Paid days Footer row */}
              <div className="flex items-center gap-[11px] p-[13px_18px] bg-[var(--sub)]">
                <span className="flex-1 min-w-0 text-[12.5px] font-[600] text-[var(--fg)]">
                  Paid days
                </span>
                <span
                  className="text-[17px] font-[650] tabular-nums"
                  style={{ color: paidFg }}
                >
                  {paidDaysVal.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Card 2: Selected Day Details Card */}
            {selectedDay ? (
              // Active State: Day details & Mis-punch action
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[12px] shadow-[var(--shadow)] p-[15px_18px_17px_18px]">
                <div className="flex items-center gap-[9px] mb-3">
                  <span
                    className="w-[26px] h-[26px] rounded-[8px] grid place-items-center shrink-0"
                    style={{
                      backgroundColor: pickTintBg,
                      color: pickTint,
                    }}
                  >
                    <CalendarDays size={15} />
                  </span>
                  <h2 className="m-0 text-[14px] font-[600] text-[var(--fg)] truncate">
                    {selectedDateFormatted}
                  </h2>
                  <div className="flex-1" />
                  <span
                    className="text-[10.5px] font-[700] px-[9px] py-[3px] rounded-full whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: pickTintBg,
                      color: pickTint,
                    }}
                  >
                    {selectedStatus?.label || "Regular"}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-[10px] items-baseline text-[12.5px]">
                    <span className="shrink-0 w-[104px] text-[var(--muted)]">
                      In time
                    </span>
                    <span
                      className="flex-1 min-w-0 font-[500]"
                      style={{
                        color: selectedRecord?.In1
                          ? "var(--fg)"
                          : "var(--muted)",
                      }}
                    >
                      {selectedRecord?.In1 || "Not punched"}
                    </span>
                  </div>

                  <div className="flex gap-[10px] items-baseline text-[12.5px]">
                    <span className="shrink-0 w-[104px] text-[var(--muted)]">
                      Out time
                    </span>
                    <span
                      className="flex-1 min-w-0 font-[500]"
                      style={{
                        color: selectedRecord?.Out1
                          ? "var(--fg)"
                          : "var(--muted)",
                      }}
                    >
                      {selectedRecord?.Out1 || "Not punched"}
                    </span>
                  </div>

                  <div className="flex gap-[10px] items-baseline text-[12.5px]">
                    <span className="shrink-0 w-[104px] text-[var(--muted)]">
                      Shift
                    </span>
                    <span className="flex-1 min-w-0 font-[500] text-[var(--fg)]">
                      {selectedRecord?.Shift ||
                        selectedRecord?.ShiftName ||
                        "09:00 – 18:00"}
                    </span>
                  </div>

                  <div className="flex gap-[10px] items-baseline text-[12.5px]">
                    <span className="shrink-0 w-[104px] text-[var(--muted)]">
                      Worked
                    </span>
                    <span
                      className="flex-1 min-w-0 font-[500]"
                      style={{
                        color:
                          selectedRecord?.In1 && selectedRecord?.Out1
                            ? "var(--fg)"
                            : "#E11D48",
                      }}
                    >
                      {selectedRecord?.In1 && selectedRecord?.Out1
                        ? "recorded"
                        : "incomplete"}
                    </span>
                  </div>

                  <div className="flex gap-[10px] items-baseline text-[12.5px]">
                    <span className="shrink-0 w-[104px] text-[var(--muted)]">
                      Reason
                    </span>
                    <span className="flex-1 min-w-0 font-[500] text-[var(--fg)]">
                      {selectedRecord?.Reason ||
                        selectedRecord?.Remarks ||
                        (selectedStatus
                          ? REASONS[selectedStatus.code]
                          : "Regular attendance") ||
                        "—"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRaiseMispunch}
                  className="w-full mt-[13px] flex items-center justify-center gap-[7px] border border-[var(--border)] bg-transparent text-[var(--brand)] text-[12.5px] font-[600] p-[9px_12px] rounded-[9px] cursor-pointer hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] transition-colors h-auto shadow-none"
                >
                  <Clock size={15} />
                  Raise mis-punch for this day
                </Button>
              </div>
            ) : (
              // Empty State matching prototype & Screenshot 2
              <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-[12px] p-[26px_18px] text-center">
                <span className="inline-grid place-items-center w-[38px] h-[38px] rounded-[11px] bg-[var(--sub)] text-[var(--muted)] mx-auto mb-0">
                  <MousePointerClick size={18} />
                </span>
                <div className="text-[12.5px] font-[550] mt-[11px] text-[var(--fg)]">
                  Click any day
                </div>
                <div className="text-[11.5px] text-[var(--muted)] mt-1 leading-[1.5]">
                  Punch times, shift and the reason for the marking appear here.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast Notification matching prototype */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-[var(--card)] border border-[var(--border)] rounded-[11px] shadow-[0_20px_50px_-20px_rgba(2,6,16,.5)] px-4 py-[11px] flex items-center gap-[10px] text-[13px] whitespace-nowrap text-[var(--fg)] animate-in fade-in slide-in-from-bottom-2">
          <span className="grid place-items-center text-[#10B981]">
            <CheckCircle2 size={16} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

