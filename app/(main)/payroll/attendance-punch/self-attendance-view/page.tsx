"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import {
  CheckCircle2,
  CircleX,
  Coffee,
  AlertTriangle,
  Wallet,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useToast } from "@/app/hooks/useToast";
import { useSecureStorage } from "@/app/hooks/comp-key-data";

// Mandatory components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import { StatCard } from "@/components/Templates/card";
import HashloaderComponent from "@/components/Templates/hashloader";

export default function SelfAttendanceViewPage() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const { compdata } = useSecureStorage();

  // Helper date function (monthsBack = 0 -> today, monthsBack = 1 -> 1 month back)
  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Fiscal/Month date calculator from original code
  const calculateDates = (year: number, monthStart: number, monthEnd: number, month: number) => {
    const fiscalYearstart = monthStart >= month ? year : year + 1;
    const fiscalYearend = monthEnd >= month ? year : year + 1;
    const startDate = new Date(fiscalYearstart, monthStart - 1, 2);
    const yearStart = new Date(year, month - 1, 2);
    const endDate = new Date(fiscalYearend, monthEnd, 1);
    return {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
      yearStart: yearStart.toISOString().slice(0, 10),
    };
  };

  const dates1 = useMemo(() => {
    const now = new Date();
    return calculateDates(now.getFullYear(), now.getMonth() + 1, now.getMonth() + 1, 1);
  }, []);

  // Filter Dates State
  const [dates, setDates] = useState({
    DATE_FROM: dates1.start || getCurrentDate(1),
    DATE_TO: getCurrentDate(0),
  });

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "PRESENT" | "ABSENT" | "LEAVEOFF">("ALL");
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // Date slash format for header subtitle: "01/07/2026"
  const formatSlashDate = (dStr: any) => {
    if (!dStr) return "";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return String(dStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Card Date & Day of Week parser: "1 Jul 2026", "Wednesday"
  const getCardDateInfo = (dateStr: any) => {
    if (!dateStr) return { formattedDate: "—", dayOfWeek: "" };
    let d: Date;
    if (typeof dateStr === "string" && (dateStr.includes("/") || dateStr.includes("-"))) {
      const sep = dateStr.includes("/") ? "/" : "-";
      const parts = dateStr.trim().split(sep);
      if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        d = new Date(dateStr);
      }
    } else {
      d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) return { formattedDate: String(dateStr), dayOfWeek: "" };

    const day = d.getDate();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const daysOfWeek = [
      "Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday",
    ];

    return {
      formattedDate: `${day} ${months[d.getMonth()]} ${d.getFullYear()}`,
      dayOfWeek: daysOfWeek[d.getDay()],
    };
  };

  // Helper to determine Card status type, colors and labels
  const getCardStatusMeta = (item: any) => {
    const statusStr = String(item.AtnStatus || "").toLowerCase();
    const hasIn = item.In1 && item.In1 !== "" && item.In1 !== "—" && item.In1 !== "00:00";
    const hasOut = item.Out1 && item.Out1 !== "" && item.Out1 !== "—" && item.Out1 !== "00:00";
    const isIncomplete = (hasIn && !hasOut) || (!hasIn && hasOut);

    // Present
    if (statusStr.includes("present") || statusStr === "p") {
      return {
        category: "PRESENT",
        label: isIncomplete ? "Punch pair incomplete" : "Present",
        badgeText: "P",
        borderColor: "#10B981", // green
        badgeBg: "#10B981",
        paidText: item.paidDays != null ? String(item.paidDays) : "1.0",
        isPaidPositive: true,
        isIncomplete,
      };
    }

    // Absent
    if (statusStr.includes("absent") || statusStr === "a") {
      return {
        category: "ABSENT",
        label: "Absent",
        badgeText: "A",
        borderColor: "#EF4444", // red
        badgeBg: "#EF4444",
        paidText: item.paidDays != null ? (Number(item.paidDays) > 0 ? `-${item.paidDays}` : String(item.paidDays)) : "- 1.0",
        isPaidPositive: false,
        isIncomplete: false,
      };
    }

    // Week off
    if (statusStr.includes("week") || statusStr.includes("wo") || statusStr.includes("off")) {
      return {
        category: "LEAVEOFF",
        label: "Week off",
        badgeText: "WO",
        borderColor: "#06B6D4", // cyan
        badgeBg: "#06B6D4",
        paidText: item.paidDays != null ? String(item.paidDays) : "1.0",
        isPaidPositive: true,
        isIncomplete: false,
      };
    }

    // Leave
    if (statusStr.includes("leave") || statusStr === "l") {
      return {
        category: "LEAVEOFF",
        label: "Leave",
        badgeText: "L",
        borderColor: "#F59E0B", // amber
        badgeBg: "#F59E0B",
        paidText: item.paidDays != null ? String(item.paidDays) : "1.0",
        isPaidPositive: true,
        isIncomplete: false,
      };
    }

    // Holiday
    if (statusStr.includes("holiday") || statusStr === "ho") {
      return {
        category: "LEAVEOFF",
        label: "Holiday",
        badgeText: "HO",
        borderColor: "#8B5CF6", // purple
        badgeBg: "#8B5CF6",
        paidText: item.paidDays != null ? String(item.paidDays) : "1.0",
        isPaidPositive: true,
        isIncomplete: false,
      };
    }

    // Fallback
    return {
      category: "OTHER",
      label: item.AtnStatus || "Unknown",
      badgeText: String(item.AtnStatus || "?").substring(0, 2).toUpperCase(),
      borderColor: item.colorCode || "#64748B",
      badgeBg: item.colorCode || "#64748B",
      paidText: item.paidDays != null ? String(item.paidDays) : "0.0",
      isPaidPositive: Number(item.paidDays) > 0,
      isIncomplete,
    };
  };

  // Main Data Fetcher
  const handleSingleLine = async () => {
    if (dates.DATE_FROM && dates.DATE_TO && new Date(dates.DATE_FROM) > new Date(dates.DATE_TO)) {
      toast({
        title: "Date From cannot be greater than Date To",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSelectedCardIndex(null);

    try {
      const response1 = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getAttendance1`,
        {
          params: {
            empCode: user?.EMPCODE,
            startDate: dates.DATE_FROM,
            endDate: dates.DATE_TO,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const list = response1.data?.Result || [];
      setAttendanceData(list);

      if (response1.data?.Status === true && list.length === 0) {
        toast({
          title: "Data Not Found.",
          variant: "default",
        });
      } else {
        toast({
          title: "Successfully Found Data.",
          variant: "default",
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: err?.response?.data?.Message || "Error found due to get data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  const isInitialLoadedRef = useRef(false);
  useEffect(() => {
    if (user?.EMPCODE && !isInitialLoadedRef.current) {
      isInitialLoadedRef.current = true;
      handleSingleLine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.EMPCODE]);

  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Dynamic Statistics Calculations for the 5 StatCards
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let incomplete = 0;
    let paidDaysSum = 0;
    let leaveOff = 0;

    for (const item of attendanceData) {
      const meta = getCardStatusMeta(item);

      if (meta.category === "PRESENT") present++;
      if (meta.category === "ABSENT") absent++;
      if (meta.category === "LEAVEOFF") leaveOff++;
      if (meta.label === "Leave") leave++;
      if (meta.isIncomplete) incomplete++;

      if (item.paidDays != null && !isNaN(Number(item.paidDays))) {
        paidDaysSum += Number(item.paidDays);
      }
    }

    const paidFormatted =
      paidDaysSum < 0
        ? `- ${Math.abs(paidDaysSum).toFixed(1)}`
        : paidDaysSum.toFixed(1);

    return {
      all: attendanceData.length,
      present,
      absent,
      leave,
      leaveOff,
      incomplete,
      paidDaysFormatted: paidFormatted,
    };
  }, [attendanceData]);

  // Filtered Cards according to active pill tab
  const filteredCards = useMemo(() => {
    if (activeTab === "PRESENT") {
      return attendanceData.filter((item) => getCardStatusMeta(item).category === "PRESENT");
    }
    if (activeTab === "ABSENT") {
      return attendanceData.filter((item) => getCardStatusMeta(item).category === "ABSENT");
    }
    if (activeTab === "LEAVEOFF") {
      return attendanceData.filter((item) => getCardStatusMeta(item).category === "LEAVEOFF");
    }
    return attendanceData;
  }, [attendanceData, activeTab]);

  const employeeName = user?.name || attendanceData[0]?.EmpName || "Employee";
  const employeeCode = user?.EMPCODE || attendanceData[0]?.EmpCode || "";

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-[22px_24px_64px_24px]"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        fontFeatureSettings: "'tnum' 1",
      }}
    >
      {/* 1. Page Header (Title, Subtitle & Status Filter Pills) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-[16px] mb-[18px]">
        <div>
          <h1 className="m-0 text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            My attendance
          </h1>
          <p className="mt-[4px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            {employeeName} · {employeeCode} · {formatSlashDate(dates.DATE_FROM)} to {formatSlashDate(dates.DATE_TO)}
          </p>
        </div>

        {/* Status Filter Pill Tabs */}
        <div className="flex items-center gap-[4px] p-[4px] rounded-[10px] bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-xs self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-[12px] py-[6px] text-[12px] font-[600] rounded-[7px] transition-all cursor-pointer ${
              activeTab === "ALL"
                ? "bg-[#4338CA] text-white shadow-xs"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
          >
            All days {stats.all}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PRESENT")}
            className={`px-[12px] py-[6px] text-[12px] font-[600] rounded-[7px] transition-all cursor-pointer ${
              activeTab === "PRESENT"
                ? "bg-[#4338CA] text-white shadow-xs"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
          >
            Present {stats.present}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ABSENT")}
            className={`px-[12px] py-[6px] text-[12px] font-[600] rounded-[7px] transition-all cursor-pointer ${
              activeTab === "ABSENT"
                ? "bg-[#4338CA] text-white shadow-xs"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
          >
            Absent {stats.absent}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LEAVEOFF")}
            className={`px-[12px] py-[6px] text-[12px] font-[600] rounded-[7px] transition-all cursor-pointer ${
              activeTab === "LEAVEOFF"
                ? "bg-[#4338CA] text-white shadow-xs"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
          >
            Leave & off {stats.leaveOff}
          </button>
        </div>
      </div>

      {/* 2. Date Filter Bar right below heading */}
      <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[12px_18px] mb-[16px]">
        <div className="flex flex-wrap items-end gap-[14px]">
          <div className="w-[160px] sm:w-[175px]">
            <Einput
              title="Date From"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[36px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11.5px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] mb-[4px] block"
            />
          </div>

          <div className="w-[160px] sm:w-[175px]">
            <Einput
              title="Date To"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[36px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11.5px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] mb-[4px] block"
            />
          </div>

          <div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSingleLine}
              disabled={isLoading}
              className="!h-[36px] !rounded-[9px] !border-transparent !bg-[#4F46E5] hover:!brightness-[1.08] !text-white !font-[600] !text-[12.5px] !px-[18px] cursor-pointer shadow-sm transition-all whitespace-nowrap"
            >
              {isLoading ? "Fetching..." : "Get Self Attendance"}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. 5 KPI StatCards as in Prototype Screenshots */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[14px] mb-[18px]">
        {/* PRESENT */}
        <StatCard
          title="PRESENT"
          count={stats.present}
          icon={<CheckCircle2 className="w-[14px] h-[14px] text-[#10B981]" />}
          isActive={activeTab === "PRESENT"}
          onClick={() => setActiveTab(activeTab === "PRESENT" ? "ALL" : "PRESENT")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#10B9811F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-white"
        />

        {/* ABSENT */}
        <StatCard
          title="ABSENT"
          count={stats.absent}
          icon={<CircleX className="w-[14px] h-[14px] text-[#EF4444]" />}
          isActive={activeTab === "ABSENT"}
          onClick={() => setActiveTab(activeTab === "ABSENT" ? "ALL" : "ABSENT")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#EF44441F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#EF4444] dark:!text-[#F87171]"
        />

        {/* LEAVE */}
        <StatCard
          title="LEAVE"
          count={stats.leave}
          icon={<Coffee className="w-[14px] h-[14px] text-[#F59E0B]" />}
          isActive={activeTab === "LEAVEOFF"}
          onClick={() => setActiveTab(activeTab === "LEAVEOFF" ? "ALL" : "LEAVEOFF")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#F59E0B1F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-white"
        />

        {/* INCOMPLETE PUNCHES */}
        <StatCard
          title="INCOMPLETE PUNCHES"
          count={stats.incomplete}
          icon={<AlertTriangle className="w-[14px] h-[14px] text-[#D97706]" />}
          isActive={false}
          onClick={() => {}}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#D977061F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#D97706] dark:!text-[#FBBF24]"
        />

        {/* PAID DAYS */}
        <StatCard
          title="PAID DAYS"
          count={stats.paidDaysFormatted}
          icon={<Wallet className="w-[14px] h-[14px] text-[#4F46E5]" />}
          isActive={false}
          onClick={() => setActiveTab("ALL")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#4F46E51F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName={`!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums ${
            stats.paidDaysFormatted.startsWith("-")
              ? "!text-[#EF4444] dark:!text-[#F87171]"
              : "!text-[#1E293B] dark:!text-white"
          }`}
        />
      </div>

      {/* 4. Responsive Attendance Day Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[14px] p-12 text-center shadow-xs">
          <p className="text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] m-0">
            No attendance records found
          </p>
          <p className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-1 mb-0">
            Try adjusting your date range or select another status filter above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {filteredCards.map((item, index) => {
            const dateInfo = getCardDateInfo(item.DateDisplay || item.DateOffice || item.Date);
            const meta = getCardStatusMeta(item);

            const shiftStart = item.StTime ? String(item.StTime).replace(".", ":") : "09:00";
            const shiftEnd = item.EndTime ? String(item.EndTime).replace(".", ":") : "18:00";
            const shiftDisplay = `${shiftStart} – ${shiftEnd}`;

            const isSelected = selectedCardIndex === index;

            return (
              <div
                key={index}
                onClick={() => setSelectedCardIndex(isSelected ? null : index)}
                className={`rounded-[12px] p-[14px_16px] bg-[#FFFFFF] dark:bg-[#111827] border shadow-[0_1px_2px_rgba(15,23,42,.04),0_6px_18px_-8px_rgba(15,23,42,.08)] transition-all flex flex-col justify-between cursor-pointer select-none ${
                  isSelected
                    ? "ring-2 ring-[#4F46E5] border-transparent"
                    : "border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#CBD5E1] dark:hover:border-[#374151]"
                }`}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: meta.borderColor,
                }}
              >
                {/* Card Top: Date & Shift on Left; Status Badge on Right */}
                <div className="flex items-start justify-between gap-[8px] mb-[12px]">
                  <div>
                    <div className="text-[13.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                      {dateInfo.formattedDate}
                    </div>
                    {Number(compdata?.Show_Shift_Time) === 1 && (
                      <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                        shift {shiftDisplay}
                      </div>
                    )}
                  </div>
                  <div
                    className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[10.5px] font-[700] text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: meta.badgeBg }}
                  >
                    {meta.badgeText}
                  </div>
                </div>

                {/* Card Middle: IN / OUT Rounded Boxes */}
                <div className="grid grid-cols-2 gap-[8px] mb-[12px]">
                  {/* IN Box */}
                  <div className="bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] p-[6px_10px]">
                    <div className="text-[9.5px] font-[700] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em]">
                      IN
                    </div>
                    <div className="text-[13px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums mt-[2px]">
                      {item.In1 && item.In1 !== "" && item.In1 !== "—" && item.In1 !== "00:00" ? item.In1 : "—"}
                    </div>
                  </div>

                  {/* OUT Box */}
                  <div className="bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] p-[6px_10px]">
                    <div className="text-[9.5px] font-[700] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em]">
                      OUT
                    </div>
                    <div
                      className={`text-[13px] font-[650] tabular-nums mt-[2px] ${
                        item.Out1 && item.Out1 !== "" && item.Out1 !== "—" && item.Out1 !== "00:00"
                          ? "text-[#1E293B] dark:text-[#E7ECF3]"
                          : "text-[#EF4444]"
                      }`}
                    >
                      {item.Out1 && item.Out1 !== "" && item.Out1 !== "—" && item.Out1 !== "00:00" ? item.Out1 : "—"}
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Status Label on Left; Paid Days on Right */}
                <div className="flex items-center justify-between text-[11.5px] pt-[6px] border-t border-[#F1F5F9] dark:border-[#1F2937]">
                  <span className="text-[#64748B] dark:text-[#94A3B8] font-[500]">
                    {meta.label}
                  </span>
                  <span
                    className={`font-[650] tabular-nums ${
                      meta.isPaidPositive ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {meta.paidText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
