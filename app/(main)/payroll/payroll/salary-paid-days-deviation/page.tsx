
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import Swal from "sweetalert2";

import {
  Send,
  CheckCircle2,
  Clock3,
  XCircle,
  RotateCcw,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

/* =========================================================
   TYPES
========================================================= */

type Deviation = {
  id: number;
  name: string;
  empCode: string;
  days: number;
  reason: string;
  status: "Approved" | "Pending" | "Rejected" | "Draft";
};

type EmployeeOption = {
  value: string;
  label: string;
};

type FilterData = {
  DATE_FROM: string;
  DATE_TO: string;
  EMPCODE: string;
  attnPaidDays: number | string | null;
  FPDays: number | string | null;
  devationDays: string;
  branch?: string;
  Reason?: string;
  Remark?: string;
};

type SalaryStructure = {
  Emp_Code?: string;
  Gross_Salary: number;
  Basic?: number;
  HRA?: number;
  Conveyance?: number;
  Medical?: number;
  Other?: number;
  Uniform?: number;
  Washing?: number;
  BONUS_AMOUNT?: number;
  Daily_Wages?: number;
  GRATUITY?: number;
  PF_Amount?: number;
  Loc_Code?: string;
  Effective_date?: string;
  Rec_date?: string;
  Month_Days: number;
  Per_Day_Rate: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MONTH_OPTIONS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const YEAR_OPTIONS = [
  { value: "2023", label: "2023" },
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
  { value: "2028", label: "2028" },
];

const REASON_OPTIONS = [
  { value: "Approved leave not applied", label: "Approved leave not applied" },
  { value: "Attendance correction", label: "Attendance correction" },
  { value: "Late joining not captured", label: "Late joining not captured" },
  { value: "System attendance issue", label: "System attendance issue" },
  { value: "Manual correction", label: "Manual correction" },
  { value: "Other", label: "Other" },
];

const INITIAL_DEVIATIONS: Deviation[] = [];

const INITIAL_FILTER_DATA: FilterData = {
  DATE_FROM: "7",
  DATE_TO: "2026",
  EMPCODE: "",
  attnPaidDays: null,
  FPDays: null,
  devationDays: "",
};

/* =========================================================
   ALERT
========================================================= */

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info",
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

/* =========================================================
   PAGE
========================================================= */

export default function SalaryPaidDaysDeviation() {
  const user = useCurrentUser();

  /* =======================================================
     STATE
  ======================================================= */

  const [dates, setDates] = useState<FilterData>(INITIAL_FILTER_DATA);

  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);

  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  const [salaryData, setSalaryData] = useState<SalaryStructure | null>(null);

  const [isFetchingSalary, setIsFetchingSalary] = useState(false);

  const [deviations, setDeviations] = useState<Deviation[]>(INITIAL_DEVIATIONS);

  const [showAll, setShowAll] = useState(false);

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const month = dates.DATE_FROM;
  const year = dates.DATE_TO;
  const employeeCode = dates.EMPCODE;

  const selectedMonth = MONTH_OPTIONS.find(
    (item) => item.value === month,
  )?.label;

  const employeeName =
    employeeOptions.find(
      (item) => String(item.value) === String(employeeCode),
    )?.label || "";

  const attendancePaidDays = dates.attnPaidDays;
  const deviationDays = dates.devationDays;
  const finalPaidDays = dates.FPDays;

  const totalMonthDays = useMemo(() => {
    if (!month || !year || !Number.isInteger(Number(year))) return 31;

    return new Date(Number(year), Number(month), 0).getDate();
  }, [month, year]);

  const numericFinalDays =
    finalPaidDays === null || finalPaidDays === ""
      ? null
      : Number(finalPaidDays);

  const finalDaysInvalid =
    numericFinalDays !== null &&
    (!Number.isFinite(numericFinalDays) ||
      numericFinalDays < 0 ||
      numericFinalDays > totalMonthDays);

  const grossSalary = Number(salaryData?.Gross_Salary) || 0;

  const perDayRate =
    salaryData?.Per_Day_Rate != null
      ? Number(salaryData.Per_Day_Rate)
      : totalMonthDays > 0
        ? grossSalary / totalMonthDays
        : 0;

  const payableBefore =
    salaryData && attendancePaidDays !== null && attendancePaidDays !== ""
      ? perDayRate * Number(attendancePaidDays)
      : null;

  const payableAfter =
    salaryData &&
    numericFinalDays !== null &&
    Number.isFinite(numericFinalDays) &&
    !finalDaysInvalid
      ? perDayRate * numericFinalDays
      : null;

  const deviationAmount =
    salaryData && deviationDays !== "" && Number.isFinite(Number(deviationDays))
      ? Number(deviationDays) * perDayRate
      : null;

  const formatCurrency = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return "—";

    return `₹${value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatSignedCurrency = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return "—";

    const sign = value > 0 ? "+" : value < 0 ? "-" : "";

    return `${sign}${formatCurrency(Math.abs(value))}`;
  };

  const canSubmit = Boolean(reason) && !isLoading && !isFetchingAttendance;

  const employeeInitials = employeeName
    ? employeeName
        .split(/[\s·]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
    : "EM";

  const displayDeviations = useMemo(() => {
    const hasDraft =
      Boolean(employeeCode) &&
      deviationDays.trim() !== "" &&
      Number.isFinite(Number(deviationDays));

    if (!hasDraft) return deviations;

    const draftDeviation: Deviation = {
      id: -1,
      name: employeeName || `Employee ${employeeCode}`,
      empCode: employeeCode,
      days: Number(deviationDays),
      reason: reason || "Reason not selected",
      status: "Draft",
    };

    return [draftDeviation, ...deviations.filter((item) => item.id !== -1)];
  }, [employeeCode, employeeName, deviationDays, reason, deviations]);

  /* =======================================================
     FETCH EMPLOYEE LIST
======================================================= */

  const fetchEmployees = async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      setIsLoading(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/users/findAllEmployee`,
        {
          branch: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const employees = response?.data?.data || [];

      setEmployeeOptions(
        employees.map((item: any) => ({
          label: item.label,
          value: String(item.value),
        })),
      );
    } catch (error: any) {
      console.error("Employee fetching error:", error);

      showSideAlert(
        error?.response?.data?.message || "Unable to load employees",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, user?.branch]);

  /* =======================================================
     FETCH ATTENDANCE / DEVIATION DATA
======================================================= */

  const fetchEmpdata = async (filterData: FilterData) => {
    if (!filterData.DATE_FROM || !filterData.DATE_TO || !filterData.EMPCODE) {
      return;
    }

    try {
      setIsFetchingAttendance(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/getempdeveationData`,
        {
          filterData: {
            ...filterData,
            branch: user?.branch,
          },
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (response?.data?.success) {
        const result = response.data.data || {};

        const attendanceDays = result.attnPaidDays ?? null;
        const deviation = String(result.devationDays ?? 0);
        const finalDays = result.FPDays ?? null;

        setDates((previous) => ({
          ...previous,
          attnPaidDays: attendanceDays,
          devationDays: deviation,
          FPDays: finalDays,
        }));
      } else {
        setDates((previous) => ({
          ...previous,
          attnPaidDays: null,
          devationDays: "",
          FPDays: null,
        }));

        showSideAlert(
          response?.data?.message || "Attendance data not found",
          "info",
        );
      }
    } catch (error: any) {
      console.error("Attendance fetching error:", error);

      setDates((previous) => ({
        ...previous,
        attnPaidDays: null,
        devationDays: "",
        FPDays: null,
      }));

      showSideAlert(
        error?.response?.data?.message || "Error fetching attendance data",
        "error",
      );
    } finally {
      setIsFetchingAttendance(false);
    }
  };

  /* =======================================================
     FETCH EMPLOYEE SALARY STRUCTURE
======================================================= */

  const fetchEmployeeSalary = async (filterData: FilterData) => {
    if (
      !filterData.DATE_FROM ||
      !filterData.DATE_TO ||
      !filterData.EMPCODE ||
      !user?.Comp_Code
    ) {
      setSalaryData(null);
      return;
    }

    try {
      setIsFetchingSalary(true);
      setSalaryData(null);

      const month = Number(filterData.DATE_FROM);
      const year = Number(filterData.DATE_TO);

      const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;

      const lastDay = new Date(year, month, 0).getDate();

      const dateTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/getEmployeeSalaryStructure`,
        {
          EMPCODE: filterData.EMPCODE,
          DATE_FROM: dateFrom,
          DATE_TO: dateTo,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (response?.data?.success && response?.data?.data) {
        setSalaryData(response.data.data);
      } else {
        setSalaryData(null);

        showSideAlert(
          response?.data?.message || "Salary structure not found",
          "info",
        );
      }
    } catch (error: any) {
      console.error("Employee salary fetching error:", error);

      setSalaryData(null);

      showSideAlert(
        error?.response?.data?.message || "Unable to fetch employee salary",
        "error",
      );
    } finally {
      setIsFetchingSalary(false);
    }
  };

  /* =======================================================
     FILTER CHANGE
======================================================= */

  const handleFilterChange = (name: string, value: any) => {
    const updatedValue = value == null ? "" : String(value);

    const updatedDates: FilterData = {
      ...dates,
      [name]: updatedValue,
      attnPaidDays: null,
      devationDays: "",
      FPDays: null,
    };

    setDates(updatedDates);

    setReason("");
    setRemark("");

    if (
      updatedDates.DATE_FROM &&
      updatedDates.DATE_TO &&
      updatedDates.EMPCODE
    ) {
      fetchEmpdata(updatedDates);
      fetchEmployeeSalary(updatedDates);
    } else {
      setSalaryData(null);
    }
  };

  const handleMonthChange = (name: string, value: any) => {
    handleFilterChange("DATE_FROM", value);
  };

  const handleYearChange = (name: string, value: any) => {
    handleFilterChange("DATE_TO", value);
  };

  const handleEmployeeChange = (name: string, value: any) => {
    handleFilterChange("EMPCODE", value);
  };

  /* =======================================================
     DEVIATION DAYS CHANGE
======================================================= */

  const handleDeviationChange = (name: string, value: any) => {
    const inputValue = value == null ? "" : String(value);

    if (inputValue !== "" && !/^-?\d*\.?\d*$/.test(inputValue)) {
      return;
    }

    const paidDays = Number(dates.attnPaidDays);

    let calculatedFinalDays: number | null = null;

    if (
      dates.attnPaidDays !== null &&
      dates.attnPaidDays !== "" &&
      inputValue !== ""
    ) {
      calculatedFinalDays = paidDays + Number(inputValue);
    } else if (dates.attnPaidDays !== null && inputValue === "") {
      calculatedFinalDays = paidDays;
    }

    setDates((previous) => ({
      ...previous,
      devationDays: inputValue,
      FPDays: calculatedFinalDays,
    }));
  };

  const handleReasonChange = (name: string, value: any) => {
    setReason(value ?? "");
  };

  /* =======================================================
     CLEAR FORM
======================================================= */

  const handleClear = () => {
    setDates((previous) => ({
      ...INITIAL_FILTER_DATA,
      DATE_FROM: previous.DATE_FROM,
      DATE_TO: previous.DATE_TO,
    }));

    setReason("");
    setRemark("");
    setSalaryData(null);
  };

  /* =======================================================
     SAVE EMPLOYEE DEVIATION
======================================================= */

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!dates.DATE_FROM) {
      showSideAlert("Please select month", "info");
      return;
    }

    if (!dates.DATE_TO) {
      showSideAlert("Please select year", "info");
      return;
    }

    if (!dates.EMPCODE) {
      showSideAlert("Please select employee code", "info");
      return;
    }

    if (dates.attnPaidDays === null) {
      showSideAlert("Attendance paid days not available", "warning");
      return;
    }

    if (dates.devationDays.trim() === "") {
      showSideAlert("Please enter deviation days", "info");
      return;
    }

    if (!reason) {
      showSideAlert("Please select deviation reason", "info");
      return;
    }

    const deviation = Number(dates.devationDays);

    if (!Number.isFinite(deviation)) {
      showSideAlert("Please enter valid deviation days", "warning");
      return;
    }

    const finalDays = Number(dates.attnPaidDays) + deviation;

    if (finalDays < 0) {
      showSideAlert("Final paid days cannot be negative", "warning");
      return;
    }

    if (finalDays > totalMonthDays) {
      showSideAlert(
        `Final paid days cannot exceed ${totalMonthDays} days`,
        "warning",
      );
      return;
    }

    if (!user?.EMPCODE) {
      showSideAlert("User information not available", "error");
      return;
    }

    const newDeviation: Deviation = {
      id: Date.now(),
      name: employeeName || `Employee ${dates.EMPCODE}`,
      empCode: dates.EMPCODE,
      days: deviation,
      reason: reason,
      status: "Pending",
    };

    try {
      setIsLoading(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/InsertEmpDevationData`,
        {
          Created_by: user?.EMPCODE,
          filterData: {
            ...dates,
            branch: user?.branch,
            Reason: reason,
            Remark: remark,
          },
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (response?.data?.success) {
        setDeviations((previous) => [newDeviation, ...previous]);

        showSideAlert(
          response?.data?.message || "Employee deviation saved successfully",
          "success",
        );

        setDates((previous) => ({
          ...INITIAL_FILTER_DATA,
          DATE_FROM: previous.DATE_FROM,
          DATE_TO: previous.DATE_TO,
        }));

        setReason("");
        setRemark("");
        setSalaryData(null);
      } else {
        showSideAlert(
          response?.data?.message || "Failed to save employee deviation",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Save deviation error:", error);

      showSideAlert(
        error?.response?.data?.message ||
          "Unknown error found while saving deviation",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =======================================================
     STATUS CONFIG
======================================================= */

  const getStatusConfig = (status: Deviation["status"]) => {
    switch (status) {
      case "Approved":
        return {
          icon: <CheckCircle2 size={12} />,
          className: "bg-emerald-50 text-emerald-600",
        };

      case "Pending":
        return {
          icon: <Clock3 size={12} />,
          className: "bg-amber-50 text-amber-600",
        };

      case "Draft":
        return {
          icon: <Clock3 size={12} />,
          className: "bg-indigo-50 text-indigo-600",
        };

      default:
        return {
          icon: <XCircle size={12} />,
          className: "bg-rose-50 text-rose-600",
        };
    }
  };

  /* =======================================================
     JSX
======================================================= */

  return (
    <main className="min-h-screen bg-[var(--bg)] px-[14px] py-[14px] text-[var(--fg)]">

      {/* PAGE HEADER */}

      <div className="mb-[14px]">
        <h1 className="m-0 text-[19px] font-[700] leading-tight tracking-[-0.02em] text-[var(--fg)]">
          Salary paid days deviation
        </h1>

        <p className="mb-0 mt-[4px] max-w-[1100px] text-[12px] leading-[1.5] text-[var(--muted)]">
          Override the paid days attendance calculated, for one employee and
          month. Every deviation goes through the approver chain before payroll
          picks it up.
        </p>
      </div>

      {/* MAIN GRID */}

      <div className="grid grid-cols-1 items-start gap-[14px] xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.34fr)]">

        {/* LEFT FORM */}

        <form
          onSubmit={handleSubmit}
          className="
            min-w-0
            rounded-[13px]
            border border-[var(--border)]
            bg-[var(--card)]
            p-[15px]
            shadow-[var(--shadow)]
            sm:p-[18px]
          "
        >

          {/* MONTH / YEAR / EMPLOYEE */}

          <div className="grid grid-cols-1 items-start gap-x-[12px] gap-y-[12px] md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,3.8fr)]">

            <div className="min-w-0">
              <Eselect
                title="MONTH"
                name="DATE_FROM"
                redlabel="*"
                required
                ShortName
                placeholder="Select month"
                option={MONTH_OPTIONS}
                initialValue={month}
                handleInputChange={handleMonthChange}
                className="h-[34px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="YEAR"
                name="DATE_TO"
                redlabel="*"
                required
                placeholder="Select year"
                option={YEAR_OPTIONS}
                initialValue={year}
                handleInputChange={handleYearChange}
                className="h-[34px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="EMPLOYEE CODE"
                name="EMPCODE"
                redlabel="*"
                required
                placeholder="Select Employee"
                option={employeeOptions}
                initialValue={employeeCode}
                handleInputChange={handleEmployeeChange}
                className="h-[34px] w-full"
              />
            </div>

          </div>

          {/* EMPLOYEE DETAILS CARD */}

          {employeeCode && (
            <div className="mt-[12px] flex flex-wrap items-center justify-between gap-3 rounded-[11px] border border-[var(--border)] bg-white px-[12px] py-[8px]">

              <div className="flex min-w-0 items-center gap-[10px]">

                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-indigo-100 text-[12px] font-[700] text-indigo-600">
                  {employeeInitials}
                </div>

                <div className="min-w-0">
                  <h4 className="m-0 truncate text-[13px] font-[700] text-[var(--fg)]">
                    {employeeName || "Employee"}
                  </h4>

                  <p className="m-0 mt-[2px] text-[11px] text-[var(--muted)]">
                    Branch: {user?.branch || "—"} · Code: {employeeCode}
                  </p>
                </div>

              </div>

              <div className="text-right">
                <p className="m-0 text-[11px] text-[var(--muted)]">
                  Gross / month
                </p>

                <p className="m-0 mt-[2px] text-[15px] font-[750] text-[var(--fg)]">
                  {isFetchingSalary
                    ? "Loading..."
                    : salaryData
                      ? formatCurrency(grossSalary)
                      : "—"}
                </p>
              </div>

            </div>
          )}

          {/* ATTENDANCE / DEVIATION / FINAL DAYS */}

          <div className="mt-[14px] grid grid-cols-1 items-start gap-x-[12px] gap-y-[12px] md:grid-cols-3">

            {/* ATTENDANCE PAID DAYS */}

            <div className="min-w-0">
              <Einput
                title="ATTN. PAID DAYS"
                name="AttendancePaidDays"
                type="text"
                value={attendancePaidDays ?? "—"}
               
                className="h-[34px] w-full"
              />

              <p className="mt-[4px] text-[11px] leading-[1.5] text-[var(--muted)]">
                {isFetchingAttendance
                  ? "Loading attendance days..."
                  : `From attendance calculation · ${totalMonthDays} day month`}
              </p>
            </div>

            {/* DEVIATION DAYS */}

            <div className="min-w-0">
              <Einput
                title="DEVIATION DAYS"
                name="DeviationDays"
                redlabel="*"
                type="number"
                value={deviationDays}
                placeholder="e.g. 1.5 or -2"
                handleInputChange={handleDeviationChange}
                className="h-[34px] w-full"
              />

              <p className="mt-[4px] text-[11px] leading-[1.5] text-[var(--muted)]">
                {deviationDays !== ""
                  ? `${Number(deviationDays) > 0 ? "Adding" : Number(deviationDays) < 0 ? "Removing" : "No change in"} ${Math.abs(Number(deviationDays))} paid day(s)`
                  : "Positive adds days, negative removes them"}
              </p>
            </div>

            {/* FINAL PAID DAYS */}

            <div className="min-w-0">
              <Einput
                title="FINAL PAID DAYS"
                name="FinalPaidDays"
                type="text"
                value={
                  numericFinalDays !== null && Number.isFinite(numericFinalDays)
                    ? numericFinalDays.toFixed(2).replace(/\.?0+$/, "")
                    : "—"
                }
               
                className={`h-[34px] w-full ${
                  finalDaysInvalid ? "!border-rose-400 !text-rose-600" : ""
                }`}
              />

              <p
                className={`mt-[4px] text-[11px] leading-[1.5] ${
                  finalDaysInvalid
                    ? "font-[600] text-rose-500"
                    : "text-[var(--muted)]"
                }`}
              >
                {finalDaysInvalid
                  ? `Final paid days must be between 0 and ${totalMonthDays}`
                  : `Cannot exceed ${totalMonthDays} days in ${selectedMonth} ${year}`}
              </p>
            </div>

          </div>

          {/* REASON / REMARK */}

          <div className="mt-[14px] grid grid-cols-1 items-start gap-x-[12px] gap-y-[12px] md:grid-cols-2">

            <div className="min-w-0">
              <Eselect
                title="DEVIATION REASON"
                name="Reason"
                redlabel="*"
                required
                placeholder="Select reason"
                option={REASON_OPTIONS}
                initialValue={reason}
                handleInputChange={handleReasonChange}
                className="h-[34px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Einput
                title="REMARK FOR APPROVER"
                name="Remark"
                type="text"
                value={remark}
                placeholder="What the approver needs to know..."
                handleInputChange={(name: string, value: any) =>
                  setRemark(value ?? "")
                }
                className="h-[34px] w-full"
              />
            </div>

          </div>

          {/* SALARY IMPACT */}

          <div className="mt-[14px] min-w-0 overflow-hidden rounded-[11px] border border-[var(--border)] bg-white dark:bg-slate-900">

  {/* HEADER */}
  <div className="border-b border-[var(--border)] bg-slate-100 px-[12px] py-[8px] dark:bg-slate-800">
    <h3 className="m-0 text-[11px] font-[750] tracking-[0.03em] text-[var(--muted)]">
      SALARY IMPACT OF THIS DEVIATION
    </h3>
  </div>

  <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-y-0 md:grid-cols-4">

    {/* PER DAY RATE */}
    <div className="min-w-0 p-[10px]">
      <p className="m-0 text-[11px] text-[var(--muted)]">
        Per-day rate
      </p>

      <h3 className="mb-0 mt-[4px] text-[18px] font-[750] text-[var(--fg)]">
        {isFetchingSalary
          ? "..."
          : formatCurrency(salaryData ? perDayRate : null)}
      </h3>

      <p className="mb-0 mt-[2px] text-[10px] text-[var(--muted)]">
        Gross ÷ {totalMonthDays} days
      </p>
    </div>

    {/* DEVIATION VALUE */}
    <div className="min-w-0 border-[var(--border)] p-[10px] sm:border-l">
      <p className="m-0 text-[11px] font-medium text-[var(--muted)]">
        Deviation value
      </p>

      <h3
        className={`mb-0 mt-[3px] text-[19px] font-[750] leading-tight ${
          Number(deviationDays) > 0
            ? "text-emerald-500"
            : Number(deviationDays) < 0
              ? "text-rose-500"
              : "text-[var(--fg)]"
        }`}
      >
        {isFetchingSalary
          ? "..."
          : deviationDays !== ""
            ? formatSignedCurrency(deviationAmount)
            : "—"}
      </h3>

      <p className="mb-0 mt-[2px] text-[11px] text-[var(--muted)]">
        {deviationDays !== ""
          ? `${Math.abs(Number(deviationDays))} days`
          : "—"}
      </p>
    </div>

    {/* PAYABLE BEFORE */}
    <div className="min-w-0 border-[var(--border)] p-[10px] sm:border-l md:border-l">
      <p className="m-0 text-[11px] text-[var(--muted)]">
        Payable before
      </p>

      <h3 className="mb-0 mt-[4px] text-[18px] font-[750] text-[var(--muted)]">
        {isFetchingSalary ? "..." : formatCurrency(payableBefore)}
      </h3>

      <p className="mb-0 mt-[2px] text-[10px] text-[var(--muted)]">
        {attendancePaidDays ?? "—"} paid days
      </p>
    </div>

    {/* PAYABLE AFTER */}
    <div className="min-w-0 border-[var(--border)] p-[10px] sm:border-l md:border-l">
      <p className="m-0 text-[11px] text-[var(--muted)]">
        Payable after
      </p>

      <h3
        className={`mb-0 mt-[4px] text-[18px] font-[750] ${
          finalDaysInvalid
            ? "text-rose-500"
            : "text-indigo-600 dark:text-indigo-400"
        }`}
      >
        {isFetchingSalary ? "..." : formatCurrency(payableAfter)}
      </h3>

      <p className="mb-0 mt-[2px] text-[10px] text-[var(--muted)]">
        {finalPaidDays ?? "—"} paid days
      </p>
    </div>

  </div>
</div>

          {/* FORM FOOTER */}

          <div className="mt-[15px] flex flex-col justify-between gap-[10px] border-t border-[var(--border)] pt-[12px] sm:flex-row sm:items-center">

            <div className="min-w-0">
              <p
                className={`m-0 text-[11px] ${
                  finalDaysInvalid
                    ? "font-[600] text-rose-500"
                    : "text-[var(--muted)]"
                }`}
              >
                {finalDaysInvalid
                  ? `Final paid days must sit between 0 and ${totalMonthDays}`
                  : !employeeCode
                    ? "Pick the employee"
                    : !reason
                      ? "Please select deviation reason to continue"
                      : "Review deviation details before submitting"}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-[9px]">

              <AButton
                type="button"
                onClick={handleClear}
                className="
                  inline-flex
                  h-[34px]
                  items-center
                  gap-2
                  rounded-[9px]
                  border
                  border-[var(--border)]
                  bg-[var(--card)]
                  px-[14px]
                  text-[12px]
                  font-[600]
                  text-[var(--fg)]
                  transition
                  hover:bg-[var(--hover)]
                "
              >
                <RotateCcw size={13} />
                Clear
              </AButton>

              <AButton
                type="submit"
                disabled={!canSubmit}
                className={`
                  inline-flex
                  h-[34px]
                  items-center
                  justify-center
                  gap-2
                  rounded-[9px]
                  px-[16px]
                  text-[12px]
                  font-[650]
                  text-white
                  shadow-sm
                  transition-all
                  duration-200
                  ${
                    reason
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-400 opacity-60"
                  }
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                `}
              >
                <Send size={14} />
                Save & send to approver
              </AButton>

            </div>
          </div>

        </form>

        {/* RIGHT SIDEBAR */}

        <div className="flex min-w-0 flex-col gap-[12px]">

          {/* APPROVAL CHAIN */}

          <div className="rounded-[13px] border border-[var(--border)] bg-[var(--card)] p-[15px] shadow-[var(--shadow)]">

            <h3 className="mb-[12px] text-[11px] font-[700] tracking-[0.04em] text-[var(--muted)]">
              APPROVAL CHAIN
            </h3>

            <div className="relative flex flex-col gap-[12px]">

              {/* STEP 1 */}

              <div className="relative flex gap-[11px]">

                <div className="relative z-[1] flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[12px] font-[700] text-indigo-600">
                  1
                </div>

                <div className="absolute left-[12px] top-[26px] h-[24px] border-l border-[#DCE3F0]" />

                <div>
                  <h4 className="m-0 text-[12px] font-[700] text-[var(--fg)]">
                    Branch HR — you
                  </h4>

                  <p className="mb-0 mt-[3px] text-[11.5px] leading-[1.5] text-[var(--muted)]">
                    Raises the deviation with reason and remark.
                  </p>
                </div>

              </div>

              {/* STEP 2 */}

              <div className="relative flex gap-[11px]">

                <div className="relative z-[1] flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-sky-100 text-[12px] font-[700] text-sky-600">
                  2
                </div>

                <div className="absolute left-[12px] top-[26px] h-[24px] border-l border-[#DCE3F0]" />

                <div>
                  <h4 className="m-0 text-[12px] font-[700] text-[var(--fg)]">
                    Approver 1 · Branch HOD
                  </h4>

                  <p className="mb-0 mt-[3px] text-[11.5px] leading-[1.5] text-[var(--muted)]">
                    Confirms the days actually worked at the branch.
                  </p>
                </div>

              </div>

              {/* STEP 3 */}

              <div className="flex gap-[11px]">

                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-[700] text-emerald-600">
                  3
                </div>

                <div>
                  <h4 className="m-0 text-[12px] font-[700] text-[var(--fg)]">
                    Approver 2 · Payroll head
                  </h4>

                  <p className="mb-0 mt-[3px] text-[11.5px] leading-[1.5] text-[var(--muted)]">
                    Final sign-off; the deviation then enters salary
                    calculation.
                  </p>
                </div>

              </div>

            </div>
          </div>

          {/* MONTHLY DEVIATIONS */}

          <div className="rounded-[13px] border border-[var(--border)] bg-[var(--card)] p-[15px] shadow-[var(--shadow)]">

            <div className="mb-[10px] flex items-center justify-between gap-2">

              <h3 className="m-0 text-[11px] font-[700] tracking-[0.04em] text-[var(--muted)]">
                DEVIATIONS THIS MONTH
              </h3>

              <button
                type="button"
                onClick={() => setShowAll((previous) => !previous)}
                className="shrink-0 text-[11px] font-[650] text-indigo-600 hover:text-indigo-800"
              >
                {showAll ? "Show less" : "View all"}
              </button>

            </div>

            <div className="flex flex-col gap-[7px]">

              {(showAll
                ? displayDeviations
                : displayDeviations.slice(0, 3)
              ).map((item) => {

                const statusConfig = getStatusConfig(item.status);

                return (
                  <div
                    key={item.id}
                    className="
                      rounded-[10px]
                      border
                      border-[var(--border)]
                      bg-[var(--card)]
                      px-[11px]
                      py-[9px]
                      transition
                      hover:border-indigo-200
                    "
                  >

                    <div className="flex items-center justify-between gap-2">

                      <h4 className="m-0 min-w-0 truncate text-[12px] font-[700] text-[var(--fg)]">
                        {item.name} · {item.empCode}
                      </h4>

                      <span
                        className={`shrink-0 text-[12px] font-[750] ${
                          item.days > 0
                            ? "text-emerald-500"
                            : "text-rose-500"
                        }`}
                      >
                        {item.days > 0 ? "+" : ""}
                        {item.days.toFixed(1)}
                      </span>

                    </div>

                    <div className="mt-[5px] flex items-center justify-between gap-2">

                      <p className="m-0 min-w-0 truncate text-[11px] text-[var(--muted)]">
                        {item.reason}
                      </p>

                      <span
                        className={`
                          inline-flex
                          shrink-0
                          items-center
                          gap-1
                          rounded-full
                          px-[8px]
                          py-[2px]
                          text-[10px]
                          font-[700]
                          ${statusConfig.className}
                        `}
                      >
                        {statusConfig.icon}
                        {item.status}
                      </span>

                    </div>

                  </div>
                );
              })}

              {displayDeviations.length === 0 && (
                <div className="py-[18px] text-center text-[11px] text-[var(--muted)]">
                  No deviations found for this month.
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* LOADER */}

      <HashloaderComponent isLoading={isLoading} />

    </main>
  );
}
