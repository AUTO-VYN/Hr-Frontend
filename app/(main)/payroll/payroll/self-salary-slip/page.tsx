"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  TrendingUp,
  Wallet,
  Building2,
  IndianRupee,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

type SalaryItem = {
  label: string;
  amount: number;
};

type EmployeeItem = {
  label: string;
  value: string | number;
};

type DayItem = {
  label: string;
  value: string | number;
  isHighlight?: boolean;
};

type HistoryItem = {
  label: string;
  value: number | null;
  isCurrent: boolean;
};

type YtdSummary = {
  gross: number;
  net: number;
  pf: number;
  tds: number;
};

const monthOptions = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
].map((month) => ({ label: month, value: month }));

const monthNumbers: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4,
  May: 5, Jun: 6, Jul: 7, Aug: 8,
  Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

const formatMoney = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return "—";

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return `₹${amount.toLocaleString("en-IN")}`;
};

// 48500 -> ₹49k
const formatThousands = (value: number) =>
  value >= 1000
    ? `₹${Math.round(value / 1000)}k`
    : formatMoney(value);

// 342000 -> ₹3.42 L, smaller values stay in full
const formatLakh = (value: number) =>
  value >= 100000
    ? `₹${(value / 100000).toFixed(2)} L`
    : formatMoney(value);

const getNumber = (value: any): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getValue = (...values: any[]) =>
  values.find(
    (value) => value !== undefined && value !== null && value !== "",
  ) ?? "—";

const maskAccount = (account: any) => {
  const value = String(account ?? "").trim();

  if (!value) return "—";
  if (value.length <= 9) return value;

  return `${value.slice(0, 5)}${"X".repeat(value.length - 9)}${value.slice(-4)}`;
};

const normalizeSalaryResponse = (payload: any, depth = 0): any[] => {
  if (!payload || depth > 5) return [];

  if (Array.isArray(payload)) {
    return payload.filter((item) => item && typeof item === "object");
  }

  if (typeof payload !== "object") return [];

  const salaryKeys = [
    "Employee Code",
    "Employee Name",
    "Net Salary",
    "total Wages",
    "Total Wages",
    "GrossSalary",
    "earnings",
    "salary",
    "EMPCODE",
    "Emp_Name",
  ];

  if (salaryKeys.some((key) => payload[key] !== undefined)) {
    return [payload];
  }

  const wrapperKeys = [
    "data",
    "Data",
    "Result",
    "result",
    "recordset",
    "recordsets",
    "Table",
    "Table1",
    "rows",
    "Rows",
    "response",
    "Response",
  ];

  for (const key of wrapperKeys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      const records = normalizeSalaryResponse(payload[key], depth + 1);

      if (records.length) return records;
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      const records = normalizeSalaryResponse(value, depth + 1);

      if (records.length) return records;
    }
  }

  return [];
};

const formatDate = (value: any) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function convertAmountToWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const words = (num: number): string => {
    if (!num) return "";

    if (num < 20) return ones[num];

    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    }

    if (num < 1000) {
      return (
        ones[Math.floor(num / 100)] +
        " Hundred" +
        (num % 100 ? " " + words(num % 100) : "")
      );
    }

    if (num < 100000) {
      return (
        words(Math.floor(num / 1000)) +
        " Thousand" +
        (num % 1000 ? " " + words(num % 1000) : "")
      );
    }

    if (num < 10000000) {
      return (
        words(Math.floor(num / 100000)) +
        " Lakh" +
        (num % 100000 ? " " + words(num % 100000) : "")
      );
    }

    return (
      words(Math.floor(num / 10000000)) +
      " Crore" +
      (num % 10000000 ? " " + words(num % 10000000) : "")
    );
  };

  const absolute = Math.abs(amount);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  let result = rupees ? `${words(rupees)} Rupees` : "";

  if (paise) {
    result += `${result ? " And " : ""}${words(paise)} Paise`;
  }

  return result ? `(${result} Only)` : "";
}

const getEarningsList = (record: any): any[] =>
  Array.isArray(record?.earnings)
    ? record.earnings
    : Array.isArray(record?.salary)
      ? record.salary
      : [];

const getDeductionsList = (record: any): any[] =>
  Array.isArray(record?.deductions) ? record.deductions : [];

const sumDeductionsByHead = (record: any, pattern: RegExp) =>
  getDeductionsList(record).reduce(
    (sum: number, item: any) =>
      pattern.test(String(item?.head ?? ""))
        ? sum + getNumber(item?.amount)
        : sum,
    0,
  );

const summarizeRecord = (record: any) => {
  const gross = getNumber(
    getValue(
      record?.["total Wages"],
      record?.["Total Wages"],
      record?.GrossSalary,
      0,
    ),
  );

  const net = getNumber(getValue(record?.["Net Salary"], 0));

  return {
    gross,
    net,
    pf: sumDeductionsByHead(record, /provident|\bpf\b/i),
    tds: sumDeductionsByHead(record, /\btds\b|income\s*tax/i),
  };
};

// Payroll window used by the existing API: 2nd of month -> 1st of next month
const calculateDates = (year: string, monthNumber: number) => {
  const monthIndex = monthNumber - 1;

  const startDate = new Date(Number(year), monthIndex, 2);
  const endDate = new Date(Number(year), monthIndex + 1, 1);

  const localDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return {
    start: localDate(startDate),
    end: localDate(endDate),
  };
};

const sectionHeadingClass =
  "mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400";

const emptyTextClass =
  "py-3 text-center text-[11px] text-slate-400 dark:text-slate-500";

const rowClass =
  "flex items-center justify-between gap-3 border-b border-slate-100 py-[7px] dark:border-slate-800/60";

function MySalarySlipContent() {
  const currentUser = useCurrentUser();
  const user = currentUser?.user ?? currentUser;

  const searchParams = useSearchParams();

  // List page se aaya hua employee (eye icon). Na ho to logged-in user.
  const targetEmpCode = searchParams.get("empcode") || "";
  const targetName = searchParams.get("name") || "";
  const targetLocation = searchParams.get("location") || "";
  const targetType = searchParams.get("type") || "";

  const empCode = targetEmpCode || user?.EMPCODE;
  const slipLocation = targetLocation || user?.branch;
  const slipName = targetName || user?.name;
  const isViewingOther = !!targetEmpCode && targetEmpCode !== user?.EMPCODE;

  const paramMonth = searchParams.get("month") || "";
  const paramYear = searchParams.get("year") || "";

  const [month, setMonth] = useState(
    monthNumbers[paramMonth]
      ? paramMonth
      : monthOptions[new Date().getMonth()].value,
  );

  const [year, setYear] = useState(
    /^\d{4}$/.test(paramYear) ? paramYear : String(new Date().getFullYear()),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSalaryRecord, setHasSalaryRecord] = useState(false);

  const [employeeData, setEmployeeData] = useState<EmployeeItem[]>([]);
  const [daysData, setDaysData] = useState<DayItem[]>([]);

  const [earningsData, setEarningsData] = useState<SalaryItem[]>([]);
  const [deductionsData, setDeductionsData] = useState<SalaryItem[]>([]);

  const [grossSalary, setGrossSalary] = useState<number | null>(null);
  const [totalDeduction, setTotalDeduction] = useState<number | null>(null);
  const [netPay, setNetPay] = useState<number | null>(null);

  const [paidDays, setPaidDays] = useState<string | number>("—");
  const [periodDays, setPeriodDays] = useState<number | null>(null);
  const [bankName, setBankName] = useState("—");
  const [accountLast4, setAccountLast4] = useState("");
  const [netPayInWords, setNetPayInWords] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [companyName, setCompanyName] = useState("—");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [ytd, setYtd] = useState<YtdSummary | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const slipCache = useRef<Map<string, any>>(new Map());
  const requestIdRef = useRef(0);

  const currentYear = new Date().getFullYear();

  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = String(currentYear - index);
    return { label: value, value };
  });

  const emptyDays = (): DayItem[] => [
    { label: "Present", value: "—" },
    { label: "Week off", value: "—" },
    { label: "Holiday", value: "—" },
    { label: "Leave", value: "—" },
    { label: "Absent", value: "—", isHighlight: true },
  ];

  const resetSalaryData = useCallback(() => {
    setHasSalaryRecord(false);

    setEmployeeData([
      { label: "Employee code", value: empCode || "—" },
      { label: "Employee name", value: slipName || "—" },
      { label: "Father's name", value: "—" },
      { label: "Designation", value: "—" },
      { label: "Location", value: slipLocation || "—" },
      { label: "Department", value: "—" },
      { label: "Bank", value: "—" },
      { label: "A/c no.", value: "—" },
      { label: "IFSC", value: "—" },
      { label: "Date of joining", value: "—" },
      { label: "PF no.", value: "—" },
      { label: "ESI no.", value: "—" },
      { label: "UAN", value: "—" },
    ]);

    setDaysData(emptyDays());

    setEarningsData([]);
    setDeductionsData([]);

    setGrossSalary(null);
    setTotalDeduction(null);
    setNetPay(null);

    setPaidDays("—");
    setPeriodDays(null);
    setBankName("—");
    setAccountLast4("");
    setNetPayInWords("");
    setPaidDate("");
    setCompanyName("—");

    setHistory([]);
    setYtd(null);
  }, [empCode, slipName, slipLocation]);

  const mapSalaryData = useCallback(
    (record: any, selectedYear: string, selectedMonthNumber: number) => {
      setHasSalaryRecord(true);

      const company = getValue(
        record?.comp_name,
        record?.Comp_Name,
        record?.CompanyName,
      );

      setCompanyName(company === "—" ? "—" : String(company));

      setEmployeeData([
        {
          label: "Employee code",
          value: getValue(record?.["Employee Code"], record?.EMPCODE),
        },
        {
          label: "Employee name",
          value: getValue(record?.["Employee Name"], record?.Emp_Name),
        },
        { label: "Father's name", value: getValue(record?.FATHERNAME) },
        { label: "Designation", value: getValue(record?.Designation) },
        { label: "Location", value: getValue(record?.Branch) },
        { label: "Department", value: getValue(record?.Department) },
        { label: "Bank", value: getValue(record?.["Bank Name"]) },
        { label: "A/c no.", value: maskAccount(record?.["Account No"]) },
        { label: "IFSC", value: getValue(record?.["IFSC Code"]) },
        {
          label: "Date of joining",
          value: formatDate(record?.["Joining Date"]),
        },
        { label: "PF no.", value: getValue(record?.pfnumber) },
        { label: "ESI no.", value: getValue(record?.esinumber) },
        { label: "UAN", value: getValue(record?.UAN_NO) },
      ]);

      setDaysData([
        { label: "Present", value: getValue(record?.Present_days, "0") },
        { label: "Week off", value: getValue(record?.off_days, "0") },
        { label: "Holiday", value: getValue(record?.Holiday_Leaves, "0") },
        { label: "Leave", value: getValue(record?.LEAVEVALUE, "0") },
        {
          label: "Absent",
          value: getValue(record?.ABSENTVALUE, "0"),
          isHighlight: true,
        },
      ]);

      setEarningsData(
        getEarningsList(record)
          .filter((item: any) => getNumber(item?.amount) > 0)
          .map((item: any) => ({
            label: String(item?.head ?? "Other"),
            amount: getNumber(item?.amount),
          })),
      );

      // Keep zero deductions too (shown as "—") so the full structure is visible
      setDeductionsData(
        getDeductionsList(record).map((item: any) => ({
          label: String(item?.head ?? "Other"),
          amount: getNumber(item?.amount),
        })),
      );

      const grossRaw = getValue(
        record?.["total Wages"],
        record?.["Total Wages"],
        record?.GrossSalary,
      );

      const deductionRaw = getValue(record?.["Total Deductions"]);
      const netRaw = getValue(record?.["Net Salary"]);

      setGrossSalary(grossRaw === "—" ? null : getNumber(grossRaw));
      setTotalDeduction(deductionRaw === "—" ? null : getNumber(deductionRaw));
      setNetPay(netRaw === "—" ? null : getNumber(netRaw));

      setPaidDays(getValue(record?.["Days Paid"], record?.Present_days));
      setPeriodDays(new Date(Number(selectedYear), selectedMonthNumber, 0).getDate());

      setBankName(String(getValue(record?.["Bank Name"])));

      const account = String(record?.["Account No"] ?? "").trim();
      setAccountLast4(account ? account.slice(-4) : "");

      const netAmount = netRaw === "—" ? 0 : getNumber(netRaw);

      setNetPayInWords(netAmount > 0 ? convertAmountToWords(netAmount) : "");

      setPaidDate(
        record?.PaidDate
          ? formatDate(record.PaidDate)
          : record?.["Payment Date"]
            ? formatDate(record["Payment Date"])
            : "",
      );
    },
    [],
  );

  const requestSlip = useCallback(
    async (selectedYear: string, selectedMonthNumber: number) => {
      const { start, end } = calculateDates(selectedYear, selectedMonthNumber);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/PaySlipDataWeb`,
        {
          location: slipLocation,
          empcode: [empCode],
          dateFrom: start,
          dateto: end,
          ...(targetType
            ? { employeeType: targetType, EmpType: targetType }
            : {}),
          web: 1,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const records = normalizeSalaryResponse(response.data);

      const rejected =
        response.data?.rejected ??
        response.data?.Rejected ??
        response.data?.data?.rejected ??
        [];

      return {
        record: records[0] ?? null,
        hasRejected: Array.isArray(rejected) && rejected.length > 0,
      };
    },
    [empCode, slipLocation, targetType, user?.Comp_Code, user?.name],
  );

  // Builds "last 6 months" and "year to date" from the same payslip API
  const loadInsights = useCallback(
    async (
      selectedYear: number,
      selectedMonthNumber: number,
      currentRecord: any,
      requestId: number,
    ) => {
      const cacheKey = (y: number, m: number) => `${empCode}-${y}-${m}`;

      slipCache.current.set(
        cacheKey(selectedYear, selectedMonthNumber),
        currentRecord,
      );

      // Last 6 months ending with the selected month
      const historyMonths: { y: number; m: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonthNumber - 1 - i, 1);
        historyMonths.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
      }

      // Indian financial year: April -> selected month
      const fyStartYear =
        selectedMonthNumber >= 4 ? selectedYear : selectedYear - 1;

      const fyMonths: { y: number; m: number }[] = [];

      {
        let y = fyStartYear;
        let m = 4;

        while (
          y < selectedYear ||
          (y === selectedYear && m <= selectedMonthNumber)
        ) {
          fyMonths.push({ y, m });
          m += 1;
          if (m > 12) {
            m = 1;
            y += 1;
          }
        }
      }

      const unique = new Map<string, { y: number; m: number }>();

      [...historyMonths, ...fyMonths].forEach((item) =>
        unique.set(cacheKey(item.y, item.m), item),
      );

      setInsightsLoading(true);

      await Promise.all(
        Array.from(unique.entries()).map(async ([key, { y, m }]) => {
          if (slipCache.current.has(key)) return;

          try {
            const { record } = await requestSlip(String(y), m);
            if (record) slipCache.current.set(key, record);
          } catch {
            // ignore — month simply shows as unavailable
          }
        }),
      );

      if (requestId !== requestIdRef.current) return;

      setHistory(
        historyMonths.map(({ y, m }, index) => {
          const record = slipCache.current.get(cacheKey(y, m));

          return {
            label: monthOptions[m - 1].label,
            value: record ? summarizeRecord(record).net : null,
            isCurrent: index === historyMonths.length - 1,
          };
        }),
      );

      const totals = fyMonths.reduce(
        (acc, { y, m }) => {
          const record = slipCache.current.get(cacheKey(y, m));

          if (!record) return acc;

          const summary = summarizeRecord(record);

          return {
            gross: acc.gross + summary.gross,
            net: acc.net + summary.net,
            pf: acc.pf + summary.pf,
            tds: acc.tds + summary.tds,
          };
        },
        { gross: 0, net: 0, pf: 0, tds: 0 },
      );

      setYtd(totals);
      setInsightsLoading(false);
    },
    [empCode, requestSlip],
  );

  const fetchSalarySlip = useCallback(async () => {
    if (!empCode || !user?.Comp_Code) {
      resetSalaryData();

      setError("Employee login details are not available. Please login again.");

      return;
    }

    if (!month || !year || !monthNumbers[month]) {
      setError("Please select a valid month and year.");
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError("");

      resetSalaryData();

      const monthNumber = monthNumbers[month];

      const { record, hasRejected } = await requestSlip(year, monthNumber);

      if (requestId !== requestIdRef.current) return;

      if (!record) {
        setError(
          hasRejected
            ? "Salary slip is pending HR approval."
            : `No salary slip record found for ${month} ${year}.`,
        );

        return;
      }

      mapSalaryData(record, year, monthNumber);
      setError("");

      // Sidebar data loads in the background, without blocking the slip
      loadInsights(Number(year), monthNumber, record, requestId);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          "Failed to fetch salary slip. Please try again.",
      );

      resetSalaryData();
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [
    empCode,
    user?.Comp_Code,
    month,
    year,
    resetSalaryData,
    requestSlip,
    mapSalaryData,
    loadInsights,
  ]);

  // Clear cached months when the viewed employee changes
  useEffect(() => {
    slipCache.current.clear();
  }, [empCode]);

  useEffect(() => {
    if (empCode && user?.Comp_Code) {
      fetchSalarySlip();
    } else {
      resetSalaryData();
    }
  }, [empCode, user?.Comp_Code, fetchSalarySlip, resetSalaryData]);

  const handleSalaryFilterChange = useCallback((name: string, value: any) => {
    if (name === "month") setMonth(String(value ?? ""));
    if (name === "year") setYear(String(value ?? ""));
  }, []);

  const companyInitials =
    companyName === "—"
      ? "HR"
      : companyName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase();

  const maxHistory = Math.max(
    ...history.map((item) => item.value ?? 0),
    0,
  );

  const ytdCards = [
    {
      label: "Gross earned",
      icon: TrendingUp,
      color: "bg-sky-50 text-sky-500 dark:bg-sky-950 dark:text-sky-400",
      value: ytd ? formatLakh(ytd.gross) : "—",
    },
    {
      label: "Net received",
      icon: Wallet,
      color:
        "bg-emerald-50 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-400",
      value: ytd ? formatLakh(ytd.net) : "—",
    },
    {
      label: "PF contributed",
      icon: Building2,
      color:
        "bg-purple-50 text-purple-500 dark:bg-purple-950 dark:text-purple-400",
      value: ytd ? formatLakh(ytd.pf) : "—",
    },
    {
      label: "TDS deducted",
      icon: IndianRupee,
      color: "bg-rose-50 text-rose-500 dark:bg-rose-950 dark:text-rose-400",
      value: ytd ? formatLakh(ytd.tds) : "—",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-slate-700 dark:bg-slate-950 dark:text-slate-200">
      {loading && <HashloaderComponent loading={loading} />}

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isViewingOther
              ? `Salary slip · ${slipName || empCode}`
              : "My salary slip"}
          </h1>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isViewingOther
              ? `Employee code ${empCode} · register for the month, as payroll issued it.`
              : "Your own register for the month, exactly as payroll issued it."}
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              MONTH
            </label>

            <div className="w-36">
              <Eselect
                name="month"
                option={monthOptions}
                initialValue={month}
                handleInputChange={handleSalaryFilterChange}
                placeholder="Month"
                className="w-full rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              YEAR
            </label>

            <div className="w-28">
              <Eselect
                name="year"
                option={yearOptions}
                initialValue={year}
                handleInputChange={handleSalaryFilterChange}
                placeholder="Year"
                className="w-full rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* API Warning */}
      {error && !loading && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          />

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Salary information unavailable
            </p>

            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main Salary Slip */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Company banner */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">
                {companyInitials}
              </div>

              <div>
                <h2 className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white">
                  {companyName}
                </h2>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Salary register for {month} {year}
                </p>
              </div>
            </div>

            <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              Paid on {paidDate || "—"}
            </div>
          </div>

          {/* Employee Particulars & Days */}
          <div className="grid grid-cols-1 border-b border-slate-100 dark:border-slate-800 md:grid-cols-12">
            {/* Employee Particulars */}
            <div className="p-6 md:col-span-7 md:border-r md:border-slate-100 dark:md:border-slate-800">
              <h3 className={sectionHeadingClass}>EMPLOYEE PARTICULARS</h3>

              <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-[9px] text-[11px]">
                {employeeData.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.label}
                    </span>

                    <span className="break-words font-semibold text-slate-900 dark:text-slate-100">
                      {item.value || "—"}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Days */}
            <div className="p-6 md:col-span-5">
              <h3 className={sectionHeadingClass}>DAYS</h3>

              <div className="text-[11px]">
                {daysData.map((item, idx) => (
                  <div key={idx} className={rowClass}>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {item.label}
                    </span>

                    <span
                      className={`font-semibold ${
                        item.isHighlight
                          ? "text-rose-500 dark:text-rose-400"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-[7px] font-bold">
                  <span className="text-slate-900 dark:text-white">
                    Paid days
                  </span>

                  <span className="text-indigo-600 dark:text-indigo-400">
                    {paidDays === "—" || periodDays === null
                      ? paidDays
                      : `${paidDays} / ${periodDays}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Earnings */}
            <div className="p-6 md:border-r md:border-slate-100 dark:md:border-slate-800">
              <h3 className={sectionHeadingClass}>EARNINGS</h3>

              <div className="text-[11px]">
                {earningsData.length > 0 ? (
                  earningsData.map((item, index) => (
                    <div key={index} className={rowClass}>
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.label}
                      </span>

                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={emptyTextClass}>
                    {hasSalaryRecord
                      ? "No earnings details available."
                      : "No salary data available."}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 text-[11px] font-bold text-slate-900 dark:text-white">
                  <span>Gross earnings</span>
                  <span>{formatMoney(grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="p-6">
              <h3 className={sectionHeadingClass}>DEDUCTIONS</h3>

              <div className="text-[11px]">
                {deductionsData.length > 0 ? (
                  deductionsData.map((item, index) => (
                    <div key={index} className={rowClass}>
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.label}
                      </span>

                      <span className="font-semibold text-rose-500 dark:text-rose-400">
                        {item.amount > 0 ? `-${formatMoney(item.amount)}` : "—"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={emptyTextClass}>
                    {hasSalaryRecord
                      ? "No deduction details available."
                      : "No salary data available."}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 text-[11px] font-bold text-slate-900 dark:text-white">
                  <span>Total deductions</span>

                  <span className="text-rose-500 dark:text-rose-400">
                    {totalDeduction === null
                      ? "—"
                      : `-${formatMoney(totalDeduction)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="flex flex-col justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/30 md:flex-row md:items-center">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                NET PAY
              </span>

              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {netPayInWords || "—"}
              </p>
            </div>

            <div className="text-left md:text-right">
              <div className="text-[26px] font-bold leading-none text-emerald-500 dark:text-emerald-400">
                {formatMoney(netPay)}
              </div>

              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                Credited to {bankName}
                {accountLast4 ? ` ${accountLast4}` : ""}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 py-3 text-center text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-500">
            This is a computer generated statement, hence no signature required.
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Salary History */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className={sectionHeadingClass}>NET PAY · LAST 6 MONTHS</h3>

            {history.length > 0 ? (
              <div className="flex items-end justify-between gap-2">
                {history.map((item, index) => {
                  const barHeight =
                    item.value !== null && maxHistory > 0
                      ? Math.max(14, Math.round((item.value / maxHistory) * 56))
                      : 8;

                  return (
                    <div
                      key={`${item.label}-${index}`}
                      className="flex flex-1 flex-col items-center gap-1.5"
                    >
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">
                        {item.label}
                      </span>

                      <div
                        style={{ height: barHeight }}
                        className={`w-full rounded-[3px] ${
                          item.value === null
                            ? "bg-slate-100 dark:bg-slate-800"
                            : item.isCurrent
                              ? "bg-indigo-600"
                              : "bg-indigo-200 dark:bg-indigo-900/60"
                        }`}
                      />

                      <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-300">
                        {item.value === null ? "—" : formatThousands(item.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-center">
                <TrendingUp
                  size={22}
                  className="text-slate-300 dark:text-slate-600"
                />

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {insightsLoading
                    ? "Loading salary history…"
                    : "Salary history is not available."}
                </p>
              </div>
            )}
          </div>

          {/* Year to Date */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className={sectionHeadingClass}>YEAR TO DATE</h3>

            <div className="space-y-3">
              {ytdCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`rounded-md p-1.5 ${item.color}`}>
                        <Icon size={14} />
                      </div>

                      <span className="text-[11px] text-slate-500 dark:text-slate-300">
                        {item.label}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Support */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SOMETHING WRONG?
            </h3>

            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              If the paid days look wrong, raise it with your branch HR — they
              can raise a paid-days deviation for the month.
            </p>

            <AButton
              variant="link"
              className="mt-3 flex items-center gap-1.5 p-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
            >
              <span>Raise with HR</span>
              <ArrowRight size={12} />
            </AButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams ke liye Suspense zaroori hai (Next.js build)
export default function MySalarySlipPage() {
  return (
    <Suspense fallback={null}>
      <MySalarySlipContent />
    </Suspense>
  );
}