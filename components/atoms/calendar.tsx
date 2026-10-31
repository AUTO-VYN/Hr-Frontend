"use client";

import React, { useState, useEffect } from "react";
import Button from "@/components/atoms/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { cn } from "@/lib/utils";

// Exact status mapping: H is Holiday (#7C3AED), HLF is Half Day (#EAB308)
export const KIND: Record<string, { label: string; color: string; code: string }> = {
  P: { label: "Present", color: "#10B981", code: "P" },
  A: { label: "Absent", color: "#E11D48", code: "A" },
  HLF: { label: "Half day", color: "#EAB308", code: "HLF" },
  H: { label: "Holiday", color: "#7C3AED", code: "H" },
  WO: { label: "Week off", color: "#22D3EE", code: "WO" },
  R: { label: "Relaxation", color: "#2563EB", code: "R" },
  UM: { label: "Unapproved mis-punch", color: "#D946EF", code: "UM" },
  L: { label: "Leave", color: "#F59E0B", code: "L" },
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
      code: s === "HO" ? "HO" : "H",
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
  if (s === "UM" || s.includes("MIS") || s.includes("UNAPR") || c === "#d50fe0" || c === "#d946ef") {
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
        "bg-[var(--card)] border border-[var(--border)] rounded-[12px] shadow-[var(--shadow)] overflow-hidden",
        className
      )}
    >
      {/* Top Header bar with navigation matching prototype */}
      <div className="flex items-center gap-3 p-[14px_18px] border-b border-[var(--border)]">
        {/* Previous Month Arrow Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousMonth}
          className="w-8 h-8 grid place-items-center border border-[var(--border)] bg-transparent text-[var(--fg)] rounded-[9px] cursor-pointer hover:bg-[var(--hover)] hover:text-[var(--fg)] shadow-none p-0 shrink-0"
          title="Previous Month"
        >
          <ChevronLeft size={16} />
        </Button>

        {/* Current Month Title */}
        <h1 className="m-0 text-[16px] font-[650] tracking-[-0.01em] flex-1 text-center text-[var(--fg)] select-none">
          {endMonthTitle}
        </h1>

        {/* Today Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="h-8 border border-[var(--border)] bg-transparent text-[var(--brand)] font-sans text-[12px] font-[600] px-3 py-[7px] rounded-[9px] cursor-pointer hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] shadow-none shrink-0"
        >
          Today
        </Button>

        {/* Next Month Arrow Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextMonth}
          className="w-8 h-8 grid place-items-center border border-[var(--border)] bg-transparent text-[var(--fg)] rounded-[9px] cursor-pointer hover:bg-[var(--hover)] hover:text-[var(--fg)] shadow-none p-0 shrink-0"
          title="Next Month"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Weekdays Header Row */}
      <div className="grid grid-cols-7 bg-[var(--sub)] border-b border-[var(--border)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span
            key={day}
            className="py-[9px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[var(--muted)] text-center select-none"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid (7 columns) */}
      <div className="grid grid-cols-7 gap-[6px] p-[12px_14px_16px_14px]">
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            // Empty placeholder slot
            return (
              <div
                key={`empty-${idx}`}
                className="aspect-square rounded-[10px] border border-[var(--border)]/35 bg-transparent"
              />
            );
          }

          const isSelected = selectedDay === cell.date;
          const k = cell.status;
          const bg = isSelected
            ? "var(--brand-soft)"
            : k
            ? `${k.color}14`
            : "transparent";
          const border = isSelected
            ? "var(--brand)"
            : k
            ? `${k.color}44`
            : "var(--border)";
          const weight = isSelected ? "700" : "550";

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
              style={{
                backgroundColor: bg,
                borderColor: border,
              }}
              className={cn(
                "aspect-square flex flex-col items-start justify-between border rounded-[10px] text-[var(--fg)] p-[8px_9px] cursor-pointer text-left transition-all font-sans select-none",
                "hover:border-[var(--brand)]",
                isSelected && "ring-1 ring-[var(--brand)]"
              )}
            >
              {/* Day number at top-left */}
              <span
                style={{ fontWeight: weight }}
                className="text-[12.5px] tabular-nums"
              >
                {cell.date}
              </span>

              {/* Status dot + code at bottom-left */}
              {k ? (
                <span className="flex items-center gap-[5px] w-full min-w-0">
                  <span
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ backgroundColor: k.color }}
                  />
                  <span
                    className="text-[10px] font-[700] tracking-[0.04em] overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: k.color }}
                  >
                    {k.code}
                  </span>
                </span>
              ) : (
                <span className="h-[6px]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Legend Bar matching prototype */}
      <div className="flex items-center gap-[14px] flex-wrap p-[12px_18px] border-t border-[var(--border)] bg-[var(--sub)]">
        {Object.values(KIND).map((l) => (
          <span
            key={l.code}
            className="flex items-center gap-[6px] text-[11.5px] text-[var(--muted)] select-none"
          >
            <span
              className="w-[9px] h-[9px] rounded-[3px] shrink-0"
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