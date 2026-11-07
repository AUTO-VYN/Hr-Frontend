"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { cn } from "@/lib/utils";

// Exact status mapping: H is Holiday (#7C3AED), HLF is Half Day (#EAB308)
export const KIND: Record<string, { label: string; color: string; code: string }> = {
  P: { label: "Present", color: "#10B981", code: "P" },
  A: { label: "Absent", color: "#E11D48", code: "A" },
  HLF: { label: "Half day", color: "#EAB308", code: "HLF" },
  H: { label: "Holiday", color: "#7C3AED", code: "HO" },
  WO: { label: "Week off", color: "#06B6D4", code: "WO" },
  R: { label: "Relaxation", color: "#2563EB", code: "R" },
  UM: { label: "Unapproved missed punch", color: "#C026D3", code: "UM" },
  L: { label: "Leave", color: "#F59E0B", code: "L" },
};

// Styling dictionary for calendar day cards matching screenshot design
const STATUS_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  P: {
    bg: "bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)]",
    border: "border-[#A7F3D0] dark:border-[rgba(16,185,129,0.3)]",
    dot: "#10B981",
  },
  A: {
    bg: "bg-[#FFF1F2] dark:bg-[rgba(225,29,72,0.1)]",
    border: "border-[#FECDD3] dark:border-[rgba(225,29,72,0.28)]",
    dot: "#E11D48",
  },
  WO: {
    bg: "bg-[#ECFEFF] dark:bg-[rgba(34,211,238,0.12)]",
    border: "border-[#A5F3FC] dark:border-[rgba(34,211,238,0.3)]",
    dot: "#06B6D4",
  },
  UM: {
    bg: "bg-[#FDF4FF] dark:bg-[rgba(217,70,239,0.1)]",
    border: "border-[#F5D0FE] dark:border-[rgba(217,70,239,0.28)]",
    dot: "#C026D3",
  },
  HO: {
    bg: "bg-[#F5F3FF] dark:bg-[rgba(124,58,237,0.1)]",
    border: "border-[#DDD6FE] dark:border-[rgba(124,58,237,0.28)]",
    dot: "#7C3AED",
  },
  H: {
    bg: "bg-[#F5F3FF] dark:bg-[rgba(124,58,237,0.1)]",
    border: "border-[#DDD6FE] dark:border-[rgba(124,58,237,0.28)]",
    dot: "#7C3AED",
  },
  L: {
    bg: "bg-[#FFFBEB] dark:bg-[rgba(245,158,11,0.1)]",
    border: "border-[#FDE68A] dark:border-[rgba(245,158,11,0.28)]",
    dot: "#F59E0B",
  },
  HLF: {
    bg: "bg-[#FEFCE8] dark:bg-[rgba(234,179,8,0.12)]",
    border: "border-[#FEF08A] dark:border-[rgba(234,179,8,0.3)]",
    dot: "#EAB308",
  },
  HD: {
    bg: "bg-[#FEFCE8] dark:bg-[rgba(234,179,8,0.12)]",
    border: "border-[#FEF08A] dark:border-[rgba(234,179,8,0.3)]",
    dot: "#EAB308",
  },
  R: {
    bg: "bg-[#EFF6FF] dark:bg-[rgba(37,99,235,0.1)]",
    border: "border-[#BFDBFE] dark:border-[rgba(37,99,235,0.28)]",
    dot: "#2563EB",
  },
};

const getCardStyle = (code?: string, colorCode?: string) => {
  if (code && STATUS_STYLES[code]) {
    return STATUS_STYLES[code];
  }
  if (colorCode) {
    return {
      bg: "",
      border: "",
      dot: colorCode,
      customBg: `${colorCode}14`,
      customBorder: `${colorCode}38`,
    };
  }
  return {
    bg: "bg-white dark:bg-[#111827]",
    border: "border-[#E2E8F0] dark:border-[#1F2937]",
    dot: "transparent",
  };
};

const formatPunchTime = (val?: any): string => {
  if (!val) return "";
  const s = String(val).trim();
  if (!s || s === "null" || s === "undefined" || s === "--:--" || s === "-") return "";
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return s;
};

export const getStatusInfo = (colorCode?: string, statusText?: string) => {
  const s = (statusText || "").toUpperCase().trim();
  const c = (colorCode || "").toLowerCase().trim();

  // Present
  if (s === "P" || s.includes("PRESENT") || c === "#22c55e" || c === "#10b981") {
    return KIND.P;
  }
  // Absent
  if (s === "A" || s.includes("ABSENT") || c === "#c50e0b" || c === "#ef4444" || c === "#e11d48") {
    return KIND.A;
  }
  // Half Day: HLF, HD, HALF
  if (s === "HLF" || s === "HD" || s.includes("HALF") || c === "#d7de0e" || c === "#eab308") {
    return KIND.HLF;
  }
  // Holiday: H, HO, HOLIDAY
  if (s === "H" || s === "HO" || s.includes("HOLIDAY") || c === "#7509da" || c === "#7c3aed") {
    return {
      label: "Holiday",
      color: "#7C3AED",
      code: s === "H" ? "H" : "HO",
    };
  }
  // Week Off
  if (s === "WO" || s.includes("WEEK") || c === "#0fc1e0" || c === "#22d3ee" || c === "#06b6d4") {
    return KIND.WO;
  }
  // Relaxation
  if (s === "R" || s.includes("RELAX") || c === "#0f2ee0" || c === "#2563eb" || c === "#3b82f6") {
    return KIND.R;
  }
  // Unapproved Mis-punch
  if (s === "UM" || s.includes("MIS") || s.includes("UNAPR") || c === "#d50fe0" || c === "#d946ef" || c === "#c026d3") {
    return KIND.UM;
  }
  // Leave
  if (s === "L" || s.includes("LEAVE") || c === "#ffc107" || c === "#f59e0b") {
    return KIND.L;
  }

  if (colorCode) {
    return {
      label: statusText || "Status",
      color: colorCode,
      code: statusText?.slice(0, 2).toUpperCase() || "•",
    };
  }

  return null;
};

interface CustomCalendarProps {
  startDate: any;
  endDate: any;
  setstartDate: (date: any) => void;
  setendDate: (date: any) => void;
  color: any[];
  setColor: (color: any[]) => void;
  selectedDay?: number | null;
  onSelectDay?: (day: number, record?: any) => void;
  onDataLoaded?: (data: any) => void;
  className?: string;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  startDate,
  endDate,
  setstartDate,
  setendDate,
  color = [],
  setColor,
  selectedDay,
  onSelectDay,
  onDataLoaded,
  className,
}) => {
  const [formattedStartDate, setFormattedStartDate] = useState(startDate);
  const [formattedEndDate, setFormattedEndDate] = useState(endDate);
  const user = useCurrentUser();

  useEffect(() => {
    setFormattedStartDate(startDate);
    setFormattedEndDate(endDate);
  }, [startDate, endDate]);

  const getDateRange = (sDate: any, eDate: any) => {
    if (!sDate || !eDate) return [];
    const start = new Date(sDate);
    const end = new Date(eDate);
    const dateRange = [];
    while (start <= end) {
      dateRange.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    return dateRange;
  };

  const dateRange = getDateRange(formattedStartDate, formattedEndDate);
  const startDayOfWeek = formattedStartDate ? new Date(formattedStartDate).getDay() : 0;

  // Month navigation: previous month
  const getCompCode = () => {
    return (
      user?.Comp_Code ||
      (user as any)?.comp_code ||
      (user as any)?.COMP_CODE ||
      (user as any)?.compcode ||
      (user as any)?.company_code ||
      user?.DB ||
      ""
    );
  };

  // Month navigation: previous month
  const goToPreviousMonth = async () => {
    if (!endDate) return;
    const compCode = getCompCode();
    if (!compCode) return;

    const current = new Date(endDate);
    current.setDate(1);
    current.setMonth(current.getMonth() - 1);
    const month = current.getMonth() + 1;
    const year = current.getFullYear();

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/MonthMasterRange`,
        {
          Comp_Code: compCode,
          comp_code: compCode,
          compcode: compCode,
          month,
          year,
        },
        {
          headers: {
            compcode: compCode,
            Comp_Code: compCode,
            name: user?.name,
          },
        }
      );

      const newStartDate = response.data?.Result?.[0]?.Misc_Dtl1_Date;
      const newEndDate = response.data?.Result?.[0]?.Misc_Dtl2_Date;

      if (newStartDate && newEndDate) {
        setstartDate(newStartDate);
        setendDate(newEndDate);

        const response1 = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}/mobile/getAttendance1`,
          {
            params: {
              empCode: user?.EMPCODE,
              startDate: newStartDate,
              endDate: newEndDate,
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

        const colorData = response1.data?.Result || [];
        const array: any[] = [];
        colorData.forEach((row: any) => {
          const day = row.DateDisplay?.split("/")[0];
          array.push({ day, colorCode: row.colorCode, status: row.AtnStatus, raw: row });
        });
        setColor(array);
        onDataLoaded?.(response1.data);
      }
    } catch (error) {
      console.error("Error fetching previous month attendance:", error);
    }
  };

  // Month navigation: next month
  const goToNextMonth = async () => {
    if (!endDate) return;
    const compCode = getCompCode();
    if (!compCode) return;

    const current = new Date(endDate);
    current.setDate(1);
    current.setMonth(current.getMonth() + 1);
    const month = current.getMonth() + 1;
    const year = current.getFullYear();

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/MonthMasterRange`,
        {
          Comp_Code: compCode,
          comp_code: compCode,
          compcode: compCode,
          month,
          year,
        },
        {
          headers: {
            compcode: compCode,
            Comp_Code: compCode,
            name: user?.name,
          },
        }
      );

      const newStartDate = response.data?.Result?.[0]?.Misc_Dtl1_Date;
      const newEndDate = response.data?.Result?.[0]?.Misc_Dtl2_Date;

      if (newStartDate && newEndDate) {
        setstartDate(newStartDate);
        setendDate(newEndDate);

        const response1 = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}/mobile/getAttendance1`,
          {
            params: {
              empCode: user?.EMPCODE,
              startDate: newStartDate,
              endDate: newEndDate,
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

        const colorData = response1.data?.Result || [];
        const array: any[] = [];
        colorData.forEach((row: any) => {
          const day = row.DateDisplay?.split("/")[0];
          array.push({ day, colorCode: row.colorCode, status: row.AtnStatus, raw: row });
        });
        setColor(array);
        onDataLoaded?.(response1.data);
      }
    } catch (error) {
      console.error("Error fetching next month attendance:", error);
    }
  };

  // Today button
  const goToToday = async () => {
    const compCode = getCompCode();
    if (!compCode) return;

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
      const newStartDate = response.data?.Result?.[0]?.Misc_Dtl1_Date;
      const newEndDate = response.data?.Result?.[0]?.Misc_Dtl2_Date;
      if (newStartDate && newEndDate) {
        setstartDate(newStartDate);
        setendDate(newEndDate);
      }
    } catch (err) {
      console.error("Error going to today's month:", err);
    }
  };

  const endMonthTitle = formattedEndDate
    ? new Date(formattedEndDate).toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    : "Calendar";

  // Build grid items (including leading empty slots)
  const calendarCells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push(null);
  }

  dateRange.forEach((date) => {
    const day = date.getDate();
    const colorObj = color.find((c) => parseInt(c.day, 10) === day);
    const colorCode = colorObj ? colorObj.colorCode : null;
    const statusText = colorObj ? colorObj.status || colorObj.raw?.AtnStatus : null;
    const statusInfo = getStatusInfo(colorCode, statusText);

    calendarCells.push({
      date: day,
      fullDate: date,
      colorCode,
      status: statusInfo,
      record: colorObj?.raw || null,
    });
  });

  return (
    <div
      className={cn(
        "bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[16px] shadow-[0_1px_3px_rgba(15,23,42,0.05),0_10px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden w-full",
        className
      )}
    >
      {/* Top Header bar with navigation matching screenshot */}
      <div className="flex items-center gap-2 sm:gap-3 p-3.5 sm:p-5 border-b border-[#F1F5F9] dark:border-[#1F2937]">
        {/* Previous Month Arrow Button */}
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E2E8F0] rounded-[10px] cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors p-0 shrink-0 shadow-xs"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Current Month Title */}
        <h1 className="m-0 text-[15px] sm:text-[17px] font-[700] tracking-tight flex-1 text-center text-[#0F172A] dark:text-[#F8FAFC] select-none truncate">
          {endMonthTitle}
        </h1>

        {/* Today Button */}
        <button
          type="button"
          onClick={goToToday}
          className="h-8 sm:h-9 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#4F46E5] dark:text-[#8B84FF] font-sans text-[12px] sm:text-[13px] font-[600] px-3 sm:px-4 rounded-[10px] cursor-pointer hover:bg-[#EEF2FF] dark:hover:bg-[#1E1B4B] transition-colors shrink-0 shadow-xs"
        >
          Today
        </button>

        {/* Next Month Arrow Button */}
        <button
          type="button"
          onClick={goToNextMonth}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E2E8F0] rounded-[10px] cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors p-0 shrink-0 shadow-xs"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Horizontally scrollable calendar grid on small viewports */}
      <div className="overflow-x-auto w-full">
        <div className="min-w-[600px] sm:min-w-0">
          {/* Weekdays Header Row */}
          <div className="grid grid-cols-7 border-b border-[#F1F5F9] dark:border-[#1F2937] py-2.5 sm:py-3 bg-white dark:bg-[#111827]">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
              <span
                key={day}
                className="text-[10.5px] sm:text-[11px] font-[700] tracking-[0.06em] uppercase text-[#64748B] dark:text-[#94A3B8] text-center select-none"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid (7 columns) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 p-2.5 sm:p-4 bg-white dark:bg-[#111827]">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                // Empty placeholder slot without border (matching screenshot)
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[76px] sm:min-h-[92px]"
                  />
                );
              }

              const isSelected = selectedDay === cell.date;
              const k = cell.status;
              const cardStyle = getCardStyle(k?.code, cell.colorCode);

              const raw = cell.record;
              const inTime = formatPunchTime(
                raw?.In1 || raw?.InTime || raw?.inTime || raw?.IN1 || raw?.in || raw?.IN_TIME
              );
              const outTime = formatPunchTime(
                raw?.Out1 || raw?.OutTime || raw?.outTime || raw?.OUT1 || raw?.out || raw?.OUT_TIME
              );
              const hasPunch = Boolean(inTime || outTime);

              return (
                <button
                  key={`day-${cell.date}`}
                  type="button"
                  onClick={() => onSelectDay?.(cell.date, cell.record)}
                  title={
                    k
                      ? `${cell.date} ${endMonthTitle} — ${k.label}`
                      : String(cell.date)
                  }
                  style={
                    cardStyle.customBg
                      ? {
                          backgroundColor: cardStyle.customBg,
                          borderColor: cardStyle.customBorder,
                        }
                      : undefined
                  }
                  className={cn(
                    "min-h-[76px] sm:min-h-[92px] p-1 sm:p-2 rounded-[11px] sm:rounded-[14px] flex flex-col items-center justify-center text-center transition-all duration-150 select-none cursor-pointer border",
                    cardStyle.bg,
                    cardStyle.border,
                    isSelected && "ring-2 ring-[#4F46E5] ring-offset-1 dark:ring-offset-[#111827]",
                    "hover:shadow-xs hover:brightness-[0.98] dark:hover:brightness-110"
                  )}
                >
                  {/* Day Number */}
                  <span className="text-[13px] sm:text-[15px] font-[750] text-[#0F172A] dark:text-[#F8FAFC] leading-none">
                    {cell.date}
                  </span>

                  {/* Status with colored dot */}
                  {k ? (
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5 shrink-0 whitespace-nowrap">
                      <span
                        className="w-[5px] h-[5px] sm:w-[6px] sm:h-[6px] rounded-full shrink-0"
                        style={{ backgroundColor: cardStyle.dot || k.color }}
                      />
                      <span className="text-[10px] sm:text-[11.5px] font-[700] text-[#0F172A] dark:text-[#E2E8F0] tracking-tight">
                        {k.code}
                      </span>
                    </div>
                  ) : (
                    <span className="h-[5px] sm:h-[6px] mt-1" />
                  )}

                  {/* In / Out punch times */}
                  {hasPunch && (
                    <div className="flex flex-col items-center justify-center mt-0.5 sm:mt-1.5 leading-tight text-[8.5px] sm:text-[10px] whitespace-nowrap">
                      <span className="text-[#64748B] dark:text-[#94A3B8]">
                        In{" "}
                        <span className="font-[600] text-[#334155] dark:text-[#CBD5E1]">
                          {inTime || "--:--"}
                        </span>
                      </span>
                      <span className="text-[#64748B] dark:text-[#94A3B8]">
                        Out{" "}
                        <span className="font-[600] text-[#334155] dark:text-[#CBD5E1]">
                          {outTime || "--:--"}
                        </span>
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Legend Bar matching screenshot */}
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap p-3 sm:p-4 border-t border-[#F1F5F9] dark:border-[#1F2937] bg-white dark:bg-[#111827]">
        {Object.values(KIND).map((l) => (
          <span
            key={l.code}
            className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] font-[500] text-[#475569] dark:text-[#94A3B8] select-none"
          >
            <span
              className="w-[7px] h-[7px] sm:w-[8px] sm:h-[8px] rounded-full shrink-0"
              style={{ backgroundColor: l.color }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
  
};

export default CustomCalendar;