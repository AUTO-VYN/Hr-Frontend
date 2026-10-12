"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  Clock,
  Hourglass,
  UserCheck,
  CalendarPlus,
  FileText,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { StatCard } from "@/components/Templates/card";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

export default function ConfirmationStatusPage() {
  const user = useCurrentUser();
  const { DATE_FROM, DATE_TO } = useDateRange();

  // ── Helper: Date formatting & utilities ──────────────────────────────────
  const getDefaultDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (dateString: any) => {
    if (!dateString || dateString === "null" || dateString === "—") return "—";
    try {
      const cleanDate = String(dateString).replace("Z", "");
      const d = new Date(cleanDate);
      if (isNaN(d.getTime())) return String(dateString);

      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return String(dateString);
    }
  };

  const getAvatarColors = (name: any) => {
    if (!name || name === "N/A") {
      return { bg: "#EEF2FF", text: "#4338CA" };
    }
    const palettes = [
      { bg: "#EDE9FE", text: "#7C3AED" }, // Purple
      { bg: "#D1FAE5", text: "#059669" }, // Emerald
      { bg: "#FEF3C7", text: "#D97706" }, // Amber
      { bg: "#FCE7F3", text: "#DB2777" }, // Pink
      { bg: "#E0F2FE", text: "#0284C7" }, // Sky
      { bg: "#FEE2E2", text: "#DC2626" }, // Rose
      { bg: "#E0E7FF", text: "#4F46E5" }, // Indigo
      { bg: "#CCFBF1", text: "#0D9488" }, // Teal
      { bg: "#FFEDD5", text: "#EA580C" }, // Orange
    ];
    const hash = String(name)
      .split("")
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return palettes[hash % palettes.length];
  };

  const getInitials = (name: any) => {
    if (!name || name === "N/A" || name === "—") return "??";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return String(name).substring(0, 2).toUpperCase();
  };

  const showSideAlert = (
    message: string,
    type: "success" | "warning" | "error" | "info" = "info",
  ) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    Toast.fire({
      icon: type,
      title: message,
    });
  };

  // ── Filter States ──────────────────────────────────────────────────────────
  const [dates, setDates] = useState({
    DATE_FROM: DATE_FROM || getDefaultDate(1),
    DATE_TO: DATE_TO || getDefaultDate(0),
    department: "ALL",
    status: "ALL",
  });

  const [activeStatCard, setActiveStatCard] = useState<string | null>(null);

  // ── Table Data & UI States ────────────────────────────────────────────────
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [confirmationRemark, setConfirmationRemark] = useState("");
  const [confirmationDate, setConfirmationDate] = useState(getDefaultDate(0));

  // ── Calculate Progress & Status for Employee Row ─────────────────────────
  const enrichEmployeeData = (records: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return records.map((item: any, idx: number) => {
      const isConfirmed =
        item.Confirmation_NewDate !== null &&
        item.Confirmation_NewDate !== undefined &&
        item.Confirmation_NewDate !== "";

      const rawProbDays = Number(item.PROBATIONPERIOD);
      const totalProbationDays = rawProbDays > 1 ? rawProbDays : 90;

      let daysRemaining = 999;
      let elapsedDays = 0;
      let computedStatus:
        | "overdue"
        | "due_soon"
        | "in_probation"
        | "confirmed" = "in_probation";

      if (isConfirmed) {
        computedStatus = "confirmed";
        elapsedDays = totalProbationDays;
      } else if (item.Prob_periodDate) {
        const probDate = new Date(
          String(item.Prob_periodDate).replace("Z", ""),
        );
        probDate.setHours(0, 0, 0, 0);

        if (!isNaN(probDate.getTime())) {
          const diffMs = probDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysRemaining < 0) {
            computedStatus = "overdue";
            elapsedDays = totalProbationDays + Math.abs(daysRemaining);
          } else if (daysRemaining <= 15) {
            computedStatus = "due_soon";
            elapsedDays = Math.max(0, totalProbationDays - daysRemaining);
          } else {
            computedStatus = "in_probation";
            elapsedDays = Math.max(0, totalProbationDays - daysRemaining);
          }
        }
      }

      const progressPercent = Math.min(
        100,
        Math.round((elapsedDays / totalProbationDays) * 100),
      );

      return {
        ...item,
        row_id: item.EMPCODE || `emp_${idx}`,
        isConfirmed,
        totalProbationDays,
        elapsedDays,
        daysRemaining,
        computedStatus,
        progressPercent,
      };
    });
  };

  // ── Fetch Employee Confirmation View Data ─────────────────────────────────
  const fetchConfirmationData = useCallback(async () => {
    if (!user?.Comp_Code) return;

    if (!dates?.DATE_FROM || !dates?.DATE_TO) {
      showSideAlert("Please select Date From and Date To.", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ConfirmationDataView`,
        {
          Loc_code: user?.branch,
          DateFrom: dates?.DATE_FROM,
          DateTo: dates?.DATE_TO,
        },
        {
          headers: { compcode: user?.Comp_Code },
        },
      );

      const records = result?.data?.Result || result?.data?.data || [];
      if (Array.isArray(records)) {
        const enriched = enrichEmployeeData(records);
        setTableData(enriched);
      } else {
        setTableData([]);
      }
      setSelectedRows([]);
    } catch (error) {
      console.error("Error fetching confirmation data:", error);
      showSideAlert("Failed to fetch confirmation data", "error");
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, dates.DATE_FROM, dates.DATE_TO]);

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchConfirmationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  // ── Department & Status Options ───────────────────────────────────────────
  const departmentOptions = useMemo(() => {
    const deptSet = new Set<string>();
    tableData.forEach((row) => {
      const dept = row.Department || row.department || row.SECTION;
      if (dept && typeof dept === "string" && dept.trim() !== "") {
        deptSet.add(dept.trim());
      }
    });

    const list = Array.from(deptSet)
      .sort()
      .map((d) => ({
        value: d,
        label: d,
      }));

    return [{ value: "ALL", label: "All departments" }, ...list];
  }, [tableData]);

  const statusOptions = [
    { value: "ALL", label: "All" },
    { value: "in_probation", label: "In probation" },
    { value: "due_soon", label: "Due within 15 days" },
    { value: "overdue", label: "Confirmation Overdue" },
    { value: "confirmed", label: "Confirmed" },
  ];

  // ── Top Metric Summary Counts ─────────────────────────────────────────────
  const metricCounts = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let inProbation = 0;
    let confirmed = 0;

    tableData.forEach((row) => {
      if (row.computedStatus === "overdue") overdue++;
      else if (row.computedStatus === "due_soon") dueSoon++;
      else if (row.computedStatus === "in_probation") inProbation++;
      else if (row.computedStatus === "confirmed") confirmed++;
    });

    return { overdue, dueSoon, inProbation, confirmed };
  }, [tableData]);

  // ── Filtered Table Data ───────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      // 1. StatCard / Active Status Filter
      const activeFilter = activeStatCard || dates.status;
      if (activeFilter && activeFilter !== "ALL") {
        if (row.computedStatus !== activeFilter) return false;
      }

      // 2. Department Filter
      if (dates.department && dates.department !== "ALL") {
        const rowDept = row.Department || row.department || row.SECTION;
        if (
          String(rowDept).toLowerCase() !==
          String(dates.department).toLowerCase()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tableData, activeStatCard, dates.status, dates.department]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatCardClick = (cardKey: string) => {
    if (activeStatCard === cardKey) {
      setActiveStatCard(null);
      setDates((prev) => ({ ...prev, status: "ALL" }));
    } else {
      setActiveStatCard(cardKey);
      setDates((prev) => ({ ...prev, status: cardKey }));
    }
  };

  // ── Update Confirmation Date (Confirm Employment) ─────────────────────────
  const handleConfirmEmployment = async () => {
    if (selectedRows.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Employee Not Selected",
        text: "Please select at least one employee",
      });
      return;
    }

    const targetDate = confirmationDate || getDefaultDate(0);
    const empcodes = selectedRows.map(
      (row) => row.rowData?.EMPCODE || row.EMPCODE || row.id,
    );

    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/UpdateConfirmationDate`,
        {
          Loc_code: user?.branch,
          EmpCodes: empcodes,
          Confirmation_Date: targetDate,
          Updated_By: user?.name,
          Remark: confirmationRemark,
        },
        {
          headers: { compcode: user?.Comp_Code },
        },
      );

      Swal.fire({
        icon: "success",
        title: "Success",
        text: result.data?.message || "Confirmation date updated successfully",
      });

      setSelectedRows([]);
      setConfirmationRemark("");
      fetchConfirmationData();
    } catch (error) {
      console.error("Error updating confirmation date:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update confirmation date",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Extend Probation 30 Days ──────────────────────────────────────────────
  const handleExtendProbation = async () => {
    if (selectedRows.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Employee Not Selected",
        text: "Please select at least one employee to extend probation",
      });
      return;
    }

    const empcodes = selectedRows.map(
      (row) => row.rowData?.EMPCODE || row.EMPCODE || row.id,
    );

    // Calculate +30 days date
    const extendDate = new Date();
    extendDate.setDate(extendDate.getDate() + 30);
    const newProbationDateStr = extendDate.toISOString().split("T")[0];

    try {
      setIsLoading(true);
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/UpdateConfirmationDate`,
        {
          Loc_code: user?.branch,
          EmpCodes: empcodes,
          Confirmation_Date: null, // Keeps in probation
          Probation_Date: newProbationDateStr,
          Updated_By: user?.name,
          Remark: confirmationRemark || "Probation extended by 30 days",
        },
        {
          headers: { compcode: user?.Comp_Code },
        },
      );

      Swal.fire({
        icon: "success",
        title: "Probation Extended",
        text: `Probation extended by 30 days for ${empcodes.length} employee(s)`,
      });

      setSelectedRows([]);
      setConfirmationRemark("");
      fetchConfirmationData();
    } catch (error) {
      console.error("Error extending probation:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to extend probation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Table Column Definitions ──────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "EMPCODE",
        width: 130,
        filterPlaceholder: "All emp code",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[14px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMP NAME",
        accessor: "EmpName",
        width: 220,
        filterPlaceholder: "All emp name",
        Cell: ({ value, row }: any) => {
          const name =
            value ||
            row.original?.EMPNAME ||
            row.original?.Employee_Name ||
            "N/A";
          const colors = getAvatarColors(name);
          const initials = getInitials(name);

          return (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {initials}
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-[14px] truncate">
                {name}
              </span>
            </div>
          );
        },
      },
      {
        Header: "REGION",
        accessor: "region1",
        width: 120,
        filterPlaceholder: "All region",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 text-[14px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "CHANNEL",
        accessor: "CHANNEL",
        width: 110,
        filterPlaceholder: "All channel",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 text-[14px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "LOCATION",
        accessor: "Location",
        width: 140,
        filterPlaceholder: "All location",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 text-[14px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DEPARTMENT",
        accessor: "Department",
        width: 140,
        filterPlaceholder: "All department",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.SECTION || "—";
          return (
            <span className="font-medium text-slate-700 dark:text-slate-300 text-[14px]">
              {val}
            </span>
          );
        },
      },
      {
        Header: "DESIGNATION",
        accessor: "EMPLOYEEDESIGNATION",
        width: 180,
        filterPlaceholder: "All designation",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 text-[14px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "MOBILE NO",
        accessor: "mobileno",
        width: 130,
        filterPlaceholder: "All mobile no",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[14px] tracking-wide">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "PROBATION PROGRESS",
        accessor: "progress",
        width: 200,
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const { elapsedDays, totalProbationDays, computedStatus } =
            row.original;

          const fillPercent = Math.min(
            100,
            Math.max(5, Math.round((elapsedDays / totalProbationDays) * 100)),
          );

          let barColor = "bg-[#0284C7]"; // Blue default
          let textStyle = "text-[#0284C7] dark:text-sky-400";

          if (computedStatus === "overdue") {
            barColor = "bg-[#E11D48]"; // Red
            textStyle = "text-[#E11D48] dark:text-rose-400";
          } else if (computedStatus === "due_soon") {
            barColor = "bg-[#D97706]"; // Amber
            textStyle = "text-[#D97706] dark:text-amber-400";
          } else if (computedStatus === "confirmed") {
            barColor = "bg-[#059669]"; // Green
            textStyle = "text-[#059669] dark:text-emerald-400";
          }

          return (
            <div className="flex items-center gap-3 w-full min-w-[150px] max-w-[190px]">
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <span
                className={`text-[13px] font-bold shrink-0 tabular-nums ${textStyle}`}
              >
                {elapsedDays}/{totalProbationDays}
              </span>
            </div>
          );
        },
      },
      {
        Header: "PROBATION DATE",
        accessor: "Prob_periodDate",
        width: 140,
        filterPlaceholder: "All probation date",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[14px] whitespace-nowrap">
            {formatDateDisplay(value)}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "computedStatus",
        width: 190,
        filterPlaceholder: "All status",
        filterOptions: [
          { value: "", label: "All status" },
          { value: "in_probation", label: "In probation" },
          { value: "due_soon", label: "Due soon" },
          { value: "overdue", label: "Overdue" },
          { value: "confirmed", label: "Confirmed" },
        ],
        Cell: ({ value, row }: any) => {
          const status = value || row.original?.computedStatus;

          let badge = (
            <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[12px] font-semibold bg-sky-50 text-sky-600 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40 min-w-[96px] text-center">
              In probation
            </span>
          );

          if (status === "overdue") {
            badge = (
              <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 min-w-[96px] text-center">
                Overdue
              </span>
            );
          } else if (status === "due_soon") {
            badge = (
              <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[12px] font-semibold bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 min-w-[96px] text-center">
                Due soon
              </span>
            );
          } else if (status === "confirmed") {
            badge = (
              <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 min-w-[96px] text-center">
                Confirmed
              </span>
            );
          }

          return (
            <div className="flex items-center gap-2.5 whitespace-nowrap min-w-[140px]">
              {badge}
              <button
                type="button"
                title="View Letter"
                className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 shadow-2xs hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
              >
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAFC] dark:bg-[#070D18] px-3 sm:px-5 lg:px-7 py-4 sm:py-5 text-slate-900 dark:text-slate-100 pb-64 sm:pb-40 lg:pb-28">
      <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-4">
        {/* ── 1. HEADER ─────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Employee confirmation
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Probation tracking with days remaining. Confirm, extend or issue the
            letter straight from the row.
          </p>
        </div>

        {/* ── 2. TOP METRIC SUMMARY CARDS ───────────────────────────────── */}
       <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
  {/* Card 1: CONFIRMATION OVERDUE */}
  <div className="[&>div]:!min-h-[112px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_2px_6px_rgba(15,23,42,0.05)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-700 dark:[&>div]:!bg-[#111827]">
    <StatCard
      title="CONFIRMATION OVERDUE"
      count={metricCounts.overdue}
      variant="rose"
      icon={
        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
      }
      isActive={activeStatCard === "overdue"}
      onClick={() => handleStatCardClick("overdue")}
    />
  </div>

  {/* Card 2: DUE WITHIN 15 DAYS */}
  <div className="[&>div]:!min-h-[112px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_2px_6px_rgba(15,23,42,0.05)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-700 dark:[&>div]:!bg-[#111827]">
    <StatCard
      title="DUE WITHIN 15 DAYS"
      count={metricCounts.dueSoon}
      variant="amber"
      icon={
        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      }
      isActive={activeStatCard === "due_soon"}
      onClick={() => handleStatCardClick("due_soon")}
    />
  </div>

  {/* Card 3: IN PROBATION */}
  <div className="[&>div]:!min-h-[112px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_2px_6px_rgba(15,23,42,0.05)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-700 dark:[&>div]:!bg-[#111827]">
    <StatCard
      title="IN PROBATION"
      count={metricCounts.inProbation}
      variant="sky"
      icon={
        <Hourglass className="w-5 h-5 text-sky-600 dark:text-sky-400" />
      }
      isActive={activeStatCard === "in_probation"}
      onClick={() => handleStatCardClick("in_probation")}
    />
  </div>

  {/* Card 4: CONFIRMED */}
  <div className="[&>div]:!min-h-[112px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_2px_6px_rgba(15,23,42,0.05)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-700 dark:[&>div]:!bg-[#111827]">
    <StatCard
      title="CONFIRMED"
      count={metricCounts.confirmed}
      variant="emerald"
      icon={
        <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      }
      isActive={activeStatCard === "confirmed"}
      onClick={() => handleStatCardClick("confirmed")}
    />
  </div>
</div>

        {/* ── 3. FILTER BAR CARD ─────────────────────────────────────────── */}
        <div className="w-full min-w-0 overflow-visible rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 sm:p-4 lg:p-5 shadow-2xs">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[160px_160px_minmax(180px,1.2fr)_minmax(150px,1fr)_auto] gap-3 sm:gap-3.5 items-end">
            {/* DATE FROM */}
            <div className="min-w-0">
              <Einput
                title="DATE FROM"
                name="DATE_FROM"
                type="date"
                ShortName={true}
                className="h-[32px]"
                value={dates.DATE_FROM}
                handleInputChange={handleDateChange}
              />
            </div>

            {/* DATE TO */}
            <div className="min-w-0">
              <Einput
                title="DATE TO"
                name="DATE_TO"
                type="date"
                ShortName={true}
                className="h-[32px]"
                value={dates.DATE_TO}
                handleInputChange={handleDateChange}
              />
            </div>

            {/* DEPARTMENT */}
            <div className="min-w-0">
              <Eselect
                title="DEPARTMENT"
                name="department"
                ShortName={true}
                placeholder="All departments"
                className="h-[32px]"
                option={departmentOptions}
                initialValue={dates.department}
                handleInputChange={(name, val) => {
                  setDates((prev) => ({
                    ...prev,
                    department: val ? String(val.value || val) : "ALL",
                  }));
                }}
              />
            </div>

            {/* STATUS */}
            <div className="min-w-0">
              <Eselect
                title="STATUS"
                name="status"
                ShortName={true}
                className="h-[32px]"
                placeholder="All"
                option={statusOptions}
                initialValue={dates.status}
                handleInputChange={(name, val) => {
                  const selectedVal = val ? String(val.value || val) : "ALL";
                  setDates((prev) => ({ ...prev, status: selectedVal }));
                  setActiveStatCard(selectedVal === "ALL" ? null : selectedVal);
                }}
              />
            </div>

            {/* SHOW BUTTON */}
            <div className="flex items-end min-w-0 min-[420px]:col-span-2 lg:col-span-4 xl:col-span-1">
              <AButton
                type="button"
                variant="primary"
                size="lg"
                loading={isLoading}
                onClick={fetchConfirmationData}
                className="!h-10 sm:!h-12 w-full xl:w-auto !bg-[#4F46E5] hover:!bg-[#4338CA] text-white font-semibold !rounded-xl !px-5 sm:!px-7 text-base sm:text-lg shadow-sm"
              >
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 4. DATA TABLE CARD WITH REACTTABLE ─────────────────────────── */}
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs">
          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
            <div className="min-w-[1050px]">
              <DataTable
                columns={columns}
                data={filteredData}
                check={true}
                selectValue="row_id"
                showColumnFilters={false}
                showTopSearch={false}
                showExcelExport={false}
                showPageSizeInFooter={true}
                setSelectedRows={setSelectedRows}
                selectedRows={selectedRows}
                initialPageSize={10}
                footerTextMode="showing"
              />
            </div>
          </div>

          {/* Existing Table Legend Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
              {filteredData.length} employees
            </span>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E11D48] shrink-0" />
                <span>Overdue</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#D97706] shrink-0" />
                <span>Due in 15 days</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#059669] shrink-0" />
                <span>Confirmed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

     
{/* Bottom Fixed Action Bar */}
{/* Bottom Fixed Action Bar - Responsive */}
<div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-3 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-[left] duration-150 ease-in-out sm:left-[var(--sidebar-width,68px)] sm:px-5 sm:py-4 lg:px-8 dark:border-slate-800 dark:bg-[#0B1220]/95">
  <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">

    {/* Selected Count + Remark */}
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 lg:flex-1">
      <div className="flex items-center justify-between gap-3 sm:block">
        <span className="whitespace-nowrap text-base font-bold text-slate-900 sm:text-lg lg:text-xl dark:text-white">
          {selectedRows.length} Selected
        </span>

        <span className="text-xs text-slate-500 sm:hidden dark:text-slate-400">
          Select employees from the table
        </span>
      </div>

      <div className="w-full min-w-0">
        <Einput
          title=""
          ShortName={true}
          name="confirmationRemark"
          type="text"
          placeholder="Remark for the confirmation / extension..."
          value={confirmationRemark}
          handleInputChange={(name, val) => setConfirmationRemark(val)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] sm:px-4 dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-100"
        />
      </div>
    </div>

    {/* Action Buttons */}
    <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:w-auto lg:shrink-0">
      <AButton
        type="button"
        variant="outline"
        size="lg"
        disabled={selectedRows.length === 0}
        onClick={handleExtendProbation}
        icon={
          <CalendarPlus className="h-4 w-4 shrink-0 text-slate-700 dark:text-slate-300" />
        }
        className="!h-auto !min-h-10 !w-full !whitespace-normal !rounded-xl !border-slate-300 !bg-white !px-2 !py-2 !text-[11px] !font-semibold leading-tight text-slate-800 shadow-2xs hover:!bg-slate-50 sm:!px-4 sm:!text-sm lg:!w-auto lg:!whitespace-nowrap dark:!border-slate-700 dark:!bg-[#1E293B] dark:!text-slate-200 dark:hover:!bg-slate-800"
      >
        <span className="text-center">Extend probation 30 days</span>
      </AButton>

      <AButton
        type="button"
        variant="primary"
        size="lg"
        disabled={selectedRows.length === 0}
        onClick={handleConfirmEmployment}
        icon={<UserCheck className="h-4 w-4 shrink-0 text-white" />}
        className={`!h-auto !min-h-10 !w-full !whitespace-normal !rounded-xl !px-2 !py-2 !text-[11px] !font-semibold leading-tight text-white shadow-sm sm:!px-4 sm:!text-sm lg:!w-auto lg:!whitespace-nowrap ${
          selectedRows.length > 0
            ? "!bg-[#059669] hover:!bg-[#047857]"
            : "!bg-[#5A6A80] hover:!bg-[#475569]"
        }`}
      >
        <span className="text-center">Confirm employment</span>
      </AButton>
    </div>
  </div>
</div>


      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
