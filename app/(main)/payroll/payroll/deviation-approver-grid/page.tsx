"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

import { useCurrentUser } from "@/app/hooks/use-current-user";

/* =========================================================
   TYPES
========================================================= */

type ApprovalStatus = "Pending" | "Approved" | "Rejected";

type DeviationRequest = {
  UTD: number;
  EMPCODE?: string;
  EMPNAME?: string;
  EmpMst?: {
    EMPFIRSTNAME?: string;
    EMPLASTNAME?: string;
  } | null;

  SAL_MNTH?: string | number;
  SAL_YR?: string | number;
  Total_Paid_Days?: number;
  DEV_DAYS?: number;

  APPR_1_DEV_DAYS?: number | null;
  APPR_2_DEV_DAYS?: number | null;
  APPR_3_DEV_DAYS?: number | null;
  APPR_DEV_DAYS?: number | null;

  APPR_1_STAT?: number | null;
  APPR_2_STAT?: number | null;
  APPR_3_STAT?: number | null;
  FIN_APPR?: number | null;

  apr1_name?: string;
  apr2_name?: string;
  apr3_name?: string;

  APPR_1_REM?: string;
  APPR_2_REM?: string;
  APPR_3_REM?: string;

  APPR_1_DATE?: string;
  APPR_2_DATE?: string;
  APPR_3_DATE?: string;

  Created_By?: string;
  Created_At?: string;
  status_khud_ka?: number | null;

  [key: string]: any;
};

type SelectedRequest = {
  id: number;
  rowData: DeviationRequest;
};

type DeviationValues = {
  appr1?: string;
  appr2?: string;
  appr3?: string;
};

type SalaryInfo = {
  Gross_Salary: number;
  Month_Days: number;
  Per_Day_Rate: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_OPTIONS = [
  { label: "Pending", value: "2" },
  { label: "Approved", value: "1" },
  { label: "Reject", value: "0" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getToday = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .substring(0, 10);
};

const getOneMonthAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);

  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .substring(0, 10);
};

/* =========================================================
   HELPERS
========================================================= */

const getEmployeeName = (item: DeviationRequest) => {
  if (item.EMPNAME) return item.EMPNAME;

  const firstName = item.EmpMst?.EMPFIRSTNAME || "";
  const lastName = item.EmpMst?.EMPLASTNAME || "";

  return `${firstName} ${lastName}`.trim() || "-";
};

const formatDays = (value: number | string | null | undefined) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

const formatSignedDays = (value: number) => {
  return `${value > 0 ? "+" : ""}${formatDays(value)}`;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
};

/*
  SAL_MNTH can be:
  1, 01, January, Jan, etc.
*/
const getMonthNumber = (monthValue?: string | number) => {
  if (monthValue === undefined || monthValue === null || monthValue === "") {
    return null;
  }

  const monthText = String(monthValue).trim();

  const numericMonth = Number(monthText);

  if (
    Number.isInteger(numericMonth) &&
    numericMonth >= 1 &&
    numericMonth <= 12
  ) {
    return numericMonth;
  }

  const monthIndex = MONTHS.findIndex(
    (month) =>
      month.toLowerCase() === monthText.toLowerCase() ||
      month.substring(0, 3).toLowerCase() === monthText.toLowerCase(),
  );

  return monthIndex >= 0 ? monthIndex + 1 : null;
};

const getMonthDateRange = (item: DeviationRequest) => {
  const month = getMonthNumber(item.SAL_MNTH);
  const year = Number(item.SAL_YR);

  if (!month || !Number.isInteger(year) || year < 1900) {
    return null;
  }

  const lastDay = new Date(year, month, 0).getDate();

  return {
    month,
    year,
    DATE_FROM: `${year}-${String(month).padStart(2, "0")}-01`,
    DATE_TO: `${year}-${String(month).padStart(2, "0")}-${String(
      lastDay,
    ).padStart(2, "0")}`,
  };
};

const getSalaryKey = (empCode?: string, month?: number, year?: number) => {
  return `${String(empCode || "").trim()}_${month}_${year}`;
};

const getFinalDays = (
  item: DeviationRequest,
  devDays: Record<number, DeviationValues>,
) => {
  const actualDays = Number(item.Total_Paid_Days || 0);
  const stage = getApprovalStage(item);

  const approvedDeviation = stage
    ? getStageValue(item, stage, devDays)
    : String(
        item.APPR_3_DEV_DAYS ??
          item.APPR_2_DEV_DAYS ??
          item.APPR_1_DEV_DAYS ??
          item.DEV_DAYS ??
          0,
      );

  return actualDays + Number(approvedDeviation || 0);
};

const formatDate = (date?: string | null) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}-${month}-${year}`;
};

const getSalaryPeriod = (item: DeviationRequest) => {
  if (!item.SAL_MNTH && !item.SAL_YR) return "-";

  const monthNumber = getMonthNumber(item.SAL_MNTH);

  const monthName = monthNumber
    ? MONTHS[monthNumber - 1].substring(0, 3)
    : (item.SAL_MNTH ?? "");

  return `${monthName} ${item.SAL_YR ?? ""}`.trim();
};

const getApprovalStage = (item: DeviationRequest) => {
  if (item.APPR_1_STAT === null || item.APPR_1_STAT === undefined) {
    return "appr1";
  }

  if (
    item.APPR_1_STAT === 1 &&
    (item.APPR_2_STAT === null || item.APPR_2_STAT === undefined)
  ) {
    return "appr2";
  }

  if (
    item.APPR_2_STAT === 1 &&
    (item.APPR_3_STAT === null || item.APPR_3_STAT === undefined)
  ) {
    return "appr3";
  }

  return null;
};

const isPendingRequest = (item: DeviationRequest) => {
  return item.status_khud_ka === null || item.status_khud_ka === undefined;
};

const getStageValue = (
  item: DeviationRequest,
  stage: keyof DeviationValues,
  devDays: Record<number, DeviationValues>,
) => {
  const editedValue = devDays[item.UTD]?.[stage];

  if (editedValue !== undefined) return editedValue;

  if (stage === "appr1") {
    return String(item.APPR_1_DEV_DAYS ?? item.DEV_DAYS ?? "");
  }

  if (stage === "appr2") {
    return String(item.APPR_2_DEV_DAYS ?? item.DEV_DAYS ?? "");
  }

  return String(item.APPR_3_DEV_DAYS ?? item.DEV_DAYS ?? "");
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({
  label,
  type,
}: {
  label: string;
  type: "success" | "pending" | "muted" | "danger";
}) => {
  const styles = {
    success: "bg-emerald-50 text-emerald-600",
    pending: "bg-amber-50 text-amber-600",
    muted: "bg-slate-100 text-slate-500",
    danger: "bg-rose-50 text-rose-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-[5px] px-[7px] py-[3px] text-[10px] font-[700] ${styles[type]}`}
    >
      {label}
    </span>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  label,
  value,
  description,
  dotColor,
}: {
  label: string;
  value: string;
  description: string;
  dotColor: string;
}) => (
  <div className="min-w-0 rounded-[13px] border border-[var(--border)] bg-[var(--card)] px-[16px] py-[13px] shadow-[var(--shadow)]">
    <div className="flex items-center gap-[8px]">
      <span className={`h-[7px] w-[7px] rounded-full ${dotColor}`} />

      <p className="m-0 text-[12px] text-[var(--muted)]">{label}</p>
    </div>

    <h2 className="mb-0 mt-[6px] text-[22px] font-[750] leading-none text-[var(--fg)]">
      {value}
    </h2>

    <p className="mb-0 mt-[6px] text-[11px] text-[var(--muted)]">
      {description}
    </p>
  </div>
);

/* =========================================================
   PAGE
========================================================= */

export default function SalaryPaidDaysDeviationApprovals() {
  const user = useCurrentUser();

  const [tabledata, setTabledata] = useState<DeviationRequest[]>([]);
  const [filtereddata, setFiltereddata] = useState<DeviationRequest[]>([]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [devDays, setDevDays] = useState<Record<number, DeviationValues>>({});

  // Employee-wise salary information
  const [salaryRates, setSalaryRates] = useState<Record<string, SalaryInfo>>(
    {},
  );

  const [salaryLoading, setSalaryLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState(getOneMonthAgo());
  const [dateTo, setDateTo] = useState(getToday());

  const [status, setStatus] = useState("2");
  const [search, setSearch] = useState("");
  const [remark, setRemark] = useState("");

  const [isClicked, setIsClicked] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);

  /* =======================================================
     SWEETALERT2 TOAST
  ======================================================= */

  const showToast = (
    title: string,
    icon: "success" | "error" | "warning" | "info" = "success",
  ) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  };

  /* =======================================================
     FILTER BY STATUS
  ======================================================= */

  const filterByStatus = (data: DeviationRequest[], selectedStatus: string) => {
    if (selectedStatus === "2") {
      return data.filter((item) => isPendingRequest(item));
    }

    if (selectedStatus === "1") {
      return data.filter((item) => item.status_khud_ka == 1);
    }

    if (selectedStatus === "0") {
      return data.filter((item) => item.status_khud_ka == 0);
    }

    return data;
  };

  /* =======================================================
     FETCH SALARY STRUCTURE FOR EMPLOYEES
  ======================================================= */

  const fetchSalaryRates = async (requests: DeviationRequest[]) => {
    if (!user?.Comp_Code) return;

    // One API request per unique employee + month + year
    const uniqueRequests = new Map<
      string,
      {
        EMPCODE: string;
        DATE_FROM: string;
        DATE_TO: string;
        key: string;
      }
    >();

    requests.forEach((item) => {
      const empCode = String(item.EMPCODE || "").trim();
      const dateRange = getMonthDateRange(item);

      if (!empCode || !dateRange) return;

      const key = getSalaryKey(empCode, dateRange.month, dateRange.year);

      if (!uniqueRequests.has(key)) {
        uniqueRequests.set(key, {
          EMPCODE: empCode,
          DATE_FROM: dateRange.DATE_FROM,
          DATE_TO: dateRange.DATE_TO,
          key,
        });
      }
    });

    if (uniqueRequests.size === 0) {
      setSalaryRates({});
      return;
    }

    setSalaryLoading(true);

    try {
      const salaryRequests = Array.from(uniqueRequests.values());

      const responses = await Promise.allSettled(
        salaryRequests.map(async (salaryRequest) => {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/ars/getEmployeeSalaryStructure`,
            {
              EMPCODE: salaryRequest.EMPCODE,
              DATE_FROM: salaryRequest.DATE_FROM,
              DATE_TO: salaryRequest.DATE_TO,
            },
            {
              headers: {
                compcode: user?.Comp_Code,
                name: user?.name,
              },
            },
          );

          const salaryData = response?.data?.data;

          if (!response?.data?.success || !salaryData) {
            throw new Error(
              response?.data?.message || "Salary structure not found",
            );
          }

          const grossSalary = Number(salaryData.Gross_Salary) || 0;
          const monthDays = Number(salaryData.Month_Days) || 0;

          const perDayRate =
            Number(salaryData.Per_Day_Rate) ||
            (monthDays > 0 ? grossSalary / monthDays : 0);

          return {
            key: salaryRequest.key,
            salary: {
              Gross_Salary: grossSalary,
              Month_Days: monthDays,
              Per_Day_Rate: perDayRate,
            } as SalaryInfo,
          };
        }),
      );

      const salaryMap: Record<string, SalaryInfo> = {};

      responses.forEach((result) => {
        if (result.status === "fulfilled") {
          salaryMap[result.value.key] = result.value.salary;
        } else {
          console.error("Salary structure fetch error:", result.reason);
        }
      });

      setSalaryRates(salaryMap);
    } catch (error) {
      console.error("Salary rates fetch error:", error);
      setSalaryRates({});
    } finally {
      setSalaryLoading(false);
    }
  };

  /* =======================================================
     GET ROW SALARY RATE
  ======================================================= */

  const getRowSalaryInfo = (item: DeviationRequest) => {
    const dateRange = getMonthDateRange(item);

    if (!dateRange || !item.EMPCODE) return undefined;

    const key = getSalaryKey(item.EMPCODE, dateRange.month, dateRange.year);

    return salaryRates[key];
  };

  /* =======================================================
     GET AMOUNT IMPACT
  ======================================================= */

  const getAmountImpact = (
    item: DeviationRequest,
    values: Record<number, DeviationValues>,
  ): number | null => {
    const salaryInfo = getRowSalaryInfo(item);

    if (!salaryInfo) return null;

    const stage = getApprovalStage(item);

    const deviation = stage
      ? getStageValue(item, stage, values)
      : String(
          item.APPR_3_DEV_DAYS ??
            item.APPR_2_DEV_DAYS ??
            item.APPR_1_DEV_DAYS ??
            item.DEV_DAYS ??
            0,
        );

    if (deviation === "") return 0;

    const days = Number(deviation);

    if (!Number.isFinite(days)) return null;

    return days * salaryInfo.Per_Day_Rate;
  };

  /* =======================================================
     FETCH DEVIATION DATA API
  ======================================================= */

  const fetchData = async (selectedStatus = status) => {
    if (!user?.Comp_Code || !user?.EMPCODE) return;

    try {
      setIsClicked(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/viewapproalDeviation`,
        {
          username: user?.name,
          status: selectedStatus,
          Appr_Code: user?.EMPCODE,
          DateFrom: dateTo,
          DateTo: dateFrom,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const result: DeviationRequest[] = response?.data?.result || [];

      setTabledata(result);
      setFiltereddata(filterByStatus(result, selectedStatus));

      setSelectedIds([]);
      setDevDays({});

      // Fetch salary structure for all unique employees/months
      await fetchSalaryRates(result);
    } catch (error: any) {
      console.error("Deviation fetch error:", error);

      showToast(
        error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Unable to fetch deviation requests",
        "error",
      );
    } finally {
      setIsClicked(false);
    }
  };

  /* =======================================================
     INITIAL FETCH
  ======================================================= */

  useEffect(() => {
    if (user?.Comp_Code && user?.EMPCODE) {
      fetchData(status);
    }

    // Initial fetch after user details become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, user?.EMPCODE]);

  /* =======================================================
     SEARCH + SORT
  ======================================================= */

  const visibleRequests = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return filtereddata
      .filter((item) => {
        if (!searchText) return true;

        return (
          getEmployeeName(item).toLowerCase().includes(searchText) ||
          String(item.EMPCODE || "")
            .toLowerCase()
            .includes(searchText) ||
          String(item.Created_By || "")
            .toLowerCase()
            .includes(searchText) ||
          String(item.UTD || "")
            .toLowerCase()
            .includes(searchText)
        );
      })
      .sort((a, b) => {
        const first = new Date(
          `${a.SAL_YR || ""} ${a.SAL_MNTH || ""} 1`,
        ).getTime();

        const second = new Date(
          `${b.SAL_YR || ""} ${b.SAL_MNTH || ""} 1`,
        ).getTime();

        return sortAscending ? second - first : first - second;
      });
  }, [filtereddata, search, sortAscending]);

  /* =======================================================
     SUMMARY DATA
  ======================================================= */

  const pendingRequests = tabledata.filter(isPendingRequest);

  const netDaysRequested = pendingRequests.reduce(
    (total, item) => total + Number(item.DEV_DAYS || 0),
    0,
  );

  const netSalaryImpact = pendingRequests.reduce((total, item) => {
    const impact = getAmountImpact(item, devDays);

    return impact === null ? total : total + impact;
  }, 0);

  const salaryImpactAvailable = pendingRequests.some(
    (item) => getRowSalaryInfo(item) !== undefined,
  );

  const amendedCount = pendingRequests.filter((item) => {
    const stage = getApprovalStage(item);

    if (!stage) return false;

    const enteredValue = devDays[item.UTD]?.[stage];

    if (enteredValue === undefined || enteredValue === "") {
      return false;
    }

    return Number(enteredValue) !== Number(item.DEV_DAYS || 0);
  }).length;

  const visiblePendingRequests = visibleRequests.filter(isPendingRequest);

  const allVisibleSelected =
    visiblePendingRequests.length > 0 &&
    visiblePendingRequests.every((item) => selectedIds.includes(item.UTD));

  /* =======================================================
     SELECTION
  ======================================================= */

  const toggleSelectRow = (item: DeviationRequest) => {
    if (!isPendingRequest(item)) return;

    setSelectedIds((previous) =>
      previous.includes(item.UTD)
        ? previous.filter((id) => id !== item.UTD)
        : [...previous, item.UTD],
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((previous) =>
        previous.filter(
          (id) => !visiblePendingRequests.some((item) => item.UTD === id),
        ),
      );
    } else {
      setSelectedIds((previous) =>
        Array.from(
          new Set([
            ...previous,
            ...visiblePendingRequests.map((item) => item.UTD),
          ]),
        ),
      );
    }
  };

  const selectedRows: SelectedRequest[] = selectedIds
    .map((id) => {
      const rowData = tabledata.find((item) => item.UTD === id);

      return rowData ? { id, rowData } : null;
    })
    .filter((item): item is SelectedRequest => item !== null);

  /* =======================================================
     DEVIATION INPUT
  ======================================================= */

  const handleDeviationChange = (
    id: number,
    stage: keyof DeviationValues,
    value: string,
  ) => {
    if (value !== "" && !/^[-+]?\d*\.?\d*$/.test(value)) {
      return;
    }

    setDevDays((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        [stage]: value,
      },
    }));
  };

  /* =======================================================
     ACTION ROWS
  ======================================================= */

  const getActionRows = () => {
    const rows =
      selectedIds.length > 0
        ? selectedRows
        : visiblePendingRequests.map((item) => ({
            id: item.UTD,
            rowData: item,
          }));

    return rows.filter((item) => isPendingRequest(item.rowData));
  };

  /* =======================================================
     API PAYLOAD
  ======================================================= */

  const getTransactionPayload = (rows: SelectedRequest[]) => {
    return rows.map(({ id, rowData }) => ({
      ...rowData,
      UTD: id,

      APPR_1_DEV_DAYS:
        devDays[id]?.appr1 !== undefined
          ? devDays[id].appr1 || null
          : (rowData.APPR_1_DEV_DAYS ?? null),

      APPR_2_DEV_DAYS:
        devDays[id]?.appr2 !== undefined
          ? devDays[id].appr2 || null
          : (rowData.APPR_2_DEV_DAYS ?? null),

      APPR_3_DEV_DAYS:
        devDays[id]?.appr3 !== undefined
          ? devDays[id].appr3 || null
          : (rowData.APPR_3_DEV_DAYS ?? null),
    }));
  };

  /* =======================================================
     APPROVE API
  ======================================================= */

  const handleApprove = async () => {
    const rows = getActionRows();

    if (rows.length === 0) {
      showToast("Please select at least one pending request", "warning");
      return;
    }

    const invalidRow = rows.find(({ id, rowData }) => {
      const stage = getApprovalStage(rowData);

      if (!stage) return false;

      const value = getStageValue(rowData, stage, devDays);

      if (value === "") return false;

      const number = Number(value);

      return !Number.isFinite(number) || number < -31 || number > 31;
    });

    if (invalidRow) {
      showToast(
        `Please check deviation days for ${getEmployeeName(
          invalidRow.rowData,
        )}`,
        "warning",
      );
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action is irreversible and cannot be undone. Do you want to proceed?",
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (!confirmed.isConfirmed) return;

    try {
      setIsClicked(true);

      const tran_id = getTransactionPayload(rows);

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/ApproveDevDays`,
        {
          tran_id,
          Appr_Code: user?.EMPCODE,
          Remark: remark,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (result?.data?.status === true || result?.data?.status === "true") {
        showToast("Approved Successfully", "success");

        setSelectedIds([]);
        setDevDays({});
        setRemark("");

        await fetchData(status);
      } else {
        showToast(
          result?.data?.Message || result?.data?.message || "Approval failed",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Approve deviation error:", error);

      showToast(
        error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Unable to approve requests",
        "error",
      );
    } finally {
      setIsClicked(false);
    }
  };

  /* =======================================================
     REJECT API
  ======================================================= */

  const handleReject = async () => {
    const rows = getActionRows();

    if (rows.length === 0) {
      showToast("Please select at least one pending request", "warning");
      return;
    }

    if (!remark.trim()) {
      showToast("Please enter a remark before rejecting", "warning");
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action is irreversible and cannot be undone. Do you want to proceed?",
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (!confirmed.isConfirmed) return;

    try {
      setIsClicked(true);

      const tran_id = getTransactionPayload(rows);

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/RejectDevDays`,
        {
          tran_id,
          Appr_Code: user?.EMPCODE,
          Remark: remark,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (result?.data?.status === true || result?.data?.status === "true") {
        showToast("Rejected Successfully", "success");

        setSelectedIds([]);
        setDevDays({});
        setRemark("");

        await fetchData(status);
      } else {
        showToast(
          result?.data?.Message || result?.data?.message || "Rejection failed",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Reject deviation error:", error);

      showToast(
        error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Unable to reject requests",
        "error",
      );
    } finally {
      setIsClicked(false);
    }
  };

  /* =======================================================
     FILTER HANDLERS
  ======================================================= */

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setSelectedIds([]);

    setFiltereddata(filterByStatus(tabledata, value));
  };

  const handleShow = async () => {
    setSelectedIds([]);
    setDevDays({});
    await fetchData(status);
  };

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const approvalColumns = useMemo(
    () => [
      {
        Header: " ",
        id: "select",
        accessor: "UTD",
        width: 55,
        Cell: ({ row }: any) => {
          const item: DeviationRequest = row.original;

          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.UTD)}
                disabled={!isPendingRequest(item)}
                onChange={() => toggleSelectRow(item)}
                className="h-[16px] w-[16px] cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
              />
            </div>
          );
        },
      },
      {
        Header: "EMPLOYEE",
        id: "employee",
        accessor: "EMPCODE",
        width: 220,
        Cell: ({ row }: any) => {
          const item: DeviationRequest = row.original;

          return (
            <div className="min-w-[160px] py-[3px]">
              <p className="m-0 whitespace-nowrap text-[12px] font-[750] text-[var(--fg)]">
                {getEmployeeName(item) === "-"
                  ? item.EMPCODE || "-"
                  : getEmployeeName(item)}
              </p>

              <p className="mb-0 mt-[3px] whitespace-nowrap text-[10.5px] text-[var(--muted)]">
                Code: {item.EMPCODE || "-"}
              </p>
            </div>
          );
        },
      },
      {
        Header: () => (
          <button
            type="button"
            onClick={() => setSortAscending((previous) => !previous)}
            className="inline-flex items-center gap-[4px] whitespace-nowrap text-[10px] font-[750] tracking-[0.04em] text-indigo-600"
          >
            SALARY PERIOD
            {sortAscending ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>
        ),
        id: "salaryPeriod",
        accessor: "SAL_MNTH",
        width: 125,
        Cell: ({ row }: any) => (
          <span className="whitespace-nowrap text-[11.5px] text-[var(--muted)]">
            {getSalaryPeriod(row.original)}
          </span>
        ),
      },
      {
        Header: "ACTUAL DAYS",
        accessor: "Total_Paid_Days",
        width: 105,
        Cell: ({ value }: any) => (
          <div className="text-center text-[12px] text-[var(--muted)]">
            {formatDays(value)}
          </div>
        ),
      },
      {
        Header: "REQUESTED",
        accessor: "DEV_DAYS",
        width: 100,
        Cell: ({ value }: any) => (
          <div
            className={`text-center text-[12px] font-[750] ${
              Number(value) >= 0 ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {formatSignedDays(Number(value || 0))}
          </div>
        ),
      },
      {
        Header: "YOU APPROVE",
        id: "youApprove",
        accessor: "APPR_1_DEV_DAYS",
        width: 125,
        Cell: ({ row }: any) => {
          const item: DeviationRequest = row.original;
          const stage = getApprovalStage(item);
          const isSelected = selectedIds.includes(item.UTD);
          const isEditable = isSelected && !!stage && isPendingRequest(item);

          if (!isEditable || !stage) {
            const value =
              stage === "appr2"
                ? item.APPR_2_DEV_DAYS
                : stage === "appr3"
                  ? item.APPR_3_DEV_DAYS
                  : item.APPR_1_DEV_DAYS;

            return (
              <div className="text-center text-[12px] text-[var(--muted)]">
                {value ?? "-"}
              </div>
            );
          }

          return (
            <div className="flex justify-center">
              <input
                type="text"
                value={getStageValue(item, stage, devDays)}
                onClick={(event) => event.stopPropagation()}
                onFocus={(event) => event.stopPropagation()}
                onChange={(event) =>
                  handleDeviationChange(item.UTD, stage, event.target.value)
                }
                className="h-[30px] w-[74px] rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-[8px] text-right text-[12px] font-[650] text-[var(--fg)] outline-none transition focus:border-indigo-500"
              />
            </div>
          );
        },
      },
      
      {
        Header: "FINAL DAYS",
        id: "finalDays",
        accessor: "APPR_DEV_DAYS",
        width: 100,
        Cell: ({ row }: any) => {
          const item: DeviationRequest = row.original;

          return (
            <div className="text-center text-[12px] font-[750] text-[var(--fg)]">
              {formatDays(getFinalDays(item, devDays))}
            </div>
          );
        },
      },
      {
        Header: "AMOUNT IMPACT",
        id: "amountImpact",
        accessor: "UTD",
        width: 145,
        Cell: ({ row }: any) => {
          const item: DeviationRequest = row.original;
          const impact = getAmountImpact(item, devDays);

          return (
            <div className="text-center">
              <p
                className={`m-0 whitespace-nowrap text-[12px] font-[750] ${
                  impact === null
                    ? "text-[var(--muted)]"
                    : impact > 0
                      ? "text-emerald-600"
                      : impact < 0
                        ? "text-rose-500"
                        : "text-[var(--fg)]"
                }`}
              >
                {impact === null ? "—" : formatCurrency(impact)}
              </p>

              <p className="mb-0 mt-[3px] whitespace-nowrap text-[9.5px] text-[var(--muted)]">
                {getRowSalaryInfo(item)
                  ? `${formatCurrency(
                      getRowSalaryInfo(item)?.Per_Day_Rate,
                    )} / day`
                  : salaryLoading
                    ? "Calculating..."
                    : "Salary unavailable"}
              </p>
            </div>
          );
        },
      },
      // {
      //   Header: "CREATED BY",
      //   accessor: "Created_By",
      //   width: 130,
      //   Cell: ({ value }: any) => (
      //     <span className="whitespace-nowrap text-[11.5px] text-[var(--muted)]">
      //       {value || "-"}
      //     </span>
      //   ),
      // },
      {
        Header: "APPROVAL CHAIN",
        id: "approvalChain",
        accessor: "apr1_name",
        width: 360,
        Cell: ({ row }: any) => {
          const item: DeviationRequest = row.original;

          const getStatusType = (value: number | null | undefined) => {
            if (value === 1) return "success";
            if (value === 0) return "danger";
            return "pending";
          };

          const getStatusLabel = (
            name: string | undefined,
            value: number | null | undefined,
            number: number,
          ) => {
            if (value === 1) {
              return `${name || `Approver ${number}`} ✓`;
            }

            if (value === 0) {
              return `${name || `Approver ${number}`} Rejected`;
            }

            return `${name || `Approver ${number}`} pending`;
          };

          return (
            <div className="min-w-[330px] py-[3px]">
              <div className="flex flex-wrap items-center gap-[5px]">
                <StatusBadge
                  label={getStatusLabel(item.apr1_name, item.APPR_1_STAT, 1)}
                  type={getStatusType(item.APPR_1_STAT)}
                />

                <StatusBadge
                  label={getStatusLabel(item.apr2_name, item.APPR_2_STAT, 2)}
                  type={getStatusType(item.APPR_2_STAT)}
                />

                <StatusBadge
                  label={getStatusLabel(item.apr3_name, item.APPR_3_STAT, 3)}
                  type={getStatusType(item.APPR_3_STAT)}
                />
              </div>

              <p className="mb-0 mt-[5px] whitespace-nowrap text-[10.5px] text-[var(--muted)]">
                {item.APPR_1_REM ||
                  item.APPR_2_REM ||
                  item.APPR_3_REM ||
                  "No remark"}
              </p>
            </div>
          );
        },
      },
      {
        Header: "FINAL APPROVAL",
        accessor: "FIN_APPR",
        width: 135,
        Cell: ({ value }: any) => {
          const label =
            value == 1
              ? "Finally Approved"
              : value == 0
                ? "Rejected"
                : "Pending";

          const type =
            value == 1 ? "success" : value == 0 ? "danger" : "pending";

          return <StatusBadge label={label} type={type} />;
        },
      },
      // {
      //   Header: "CREATED DATE",
      //   accessor: "Created_At",
      //   width: 120,
      //   Cell: ({ value }: any) => (
      //     <span className="whitespace-nowrap text-[11px] text-[var(--muted)]">
      //       {formatDate(value)}
      //     </span>
      //   ),
      // },
    ],
    [selectedIds, devDays, sortAscending, salaryRates, salaryLoading],
  );

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <main className="min-h-screen bg-[var(--bg)] px-[14px] py-[18px] text-[var(--fg)]">
      {/* HEADER */}

      <div className="mb-[17px]">
        <h1 className="m-0 text-[20px] font-[750] leading-tight tracking-[-0.02em]">
          Paid days deviation approvals
        </h1>

        <p className="mb-0 mt-[5px] text-[13px] text-[var(--muted)]">
          You can approve the requested days as-is or amend them. The amount
          column shows what your decision costs before you commit it.
        </p>
      </div>

      {/* FILTER BAR */}

      <div className="mb-[14px] rounded-[13px] border border-[var(--border)] bg-[var(--card)] p-[16px] shadow-[var(--shadow)]">
        <div className="grid grid-cols-1 items-end gap-[13px] sm:grid-cols-2 xl:grid-cols-[170px_170px_180px_minmax(180px,1fr)_92px]">
          <Einput
            title="DATE FROM"
            type="date"
            name="dateFrom"
            value={dateFrom}
            handleInputChange={(name: string, value: any) => setDateFrom(value)}
            className="h-[40px] w-full"
          />

          <Einput
            title="DATE TO"
            type="date"
            name="dateTo"
            value={dateTo}
            handleInputChange={(name: string, value: any) => setDateTo(value)}
            className="h-[40px] w-full"
          />

          <Eselect
            title="STATUS"
            name="status"
            className="h-[40px] w-full"
            option={STATUS_OPTIONS}
            initialValue={status}
            handleInputChange={(name: string, value: any) => {
              handleStatusChange(value);
            }}
          />

          <div>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />

              <Einput
                title="SEARCH"
                type="text"
                name="search"
                value={search}
                handleInputChange={(name: string, value: any) =>
                  setSearch(value)
                }
                placeholder="Employee code, name or creator"
                className="h-[40px] w-full"
              />
            </div>
          </div>

          <AButton
            type="button"
            onClick={handleShow}
            className="inline-flex h-[37px] w-full items-center justify-center gap-[7px] rounded-[9px] bg-indigo-600 px-[15px] text-[12px] font-[650] text-white transition hover:bg-indigo-700"
          >
            <Search size={14} />
            Show
          </AButton>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="mb-[14px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Pending with you"
          value={String(pendingRequests.length)}
          description="Pending deviation requests"
          dotColor="bg-yellow-500"
        />

        <SummaryCard
          label="Net days requested"
          value={formatSignedDays(netDaysRequested)}
          description="Across pending rows"
          dotColor="bg-indigo-600"
        />

        <SummaryCard
          label="Net salary impact"
          value={
            salaryLoading
              ? "Calculating..."
              : salaryImpactAvailable
                ? formatCurrency(netSalaryImpact)
                : "—"
          }
          description={
            salaryLoading
              ? "Fetching employee salary structures"
              : salaryImpactAvailable
                ? "Based on current approval values"
                : "Salary structure unavailable"
          }
          dotColor="bg-emerald-500"
        />

        <SummaryCard
          label="Amended by you"
          value={String(amendedCount)}
          description="Edited deviation values"
          dotColor="bg-violet-600"
        />
      </div>

      {/* APPROVAL TABLE */}

      <div className="overflow-hidden rounded-[13px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]">
        {/* TABLE TOP BAR */}

        <div className="flex min-h-[39px] flex-wrap items-center gap-[10px] border-b border-[var(--border)] px-[15px] py-[8px]">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAll}
            disabled={visiblePendingRequests.length === 0}
            className="h-[16px] w-[16px] cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
          />

          <span className="text-[12px] font-[700] text-[var(--fg)]">
            {visibleRequests.length} requests
          </span>

          <span className="text-[11px] text-[var(--muted)]">
            Amend the days inline before approving
          </span>

          {selectedIds.length > 0 && (
            <span className="ml-auto text-[11px] font-[650] text-indigo-600">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        {/* REUSABLE REACT TABLE */}

        <div className="w-full min-w-0 overflow-x-auto">
          <DataTable
            columns={approvalColumns}
            data={visibleRequests}
            showTopSearch={false}
            showExcelExport={false}
            initialPageSize={10}
          />
        </div>

        {/* TABLE FOOTER */}

        <div className="flex flex-col justify-between gap-[12px] border-t border-[var(--border)] bg-[var(--field)] px-[15px] py-[12px] lg:flex-row lg:items-center">
          <p className="m-0 text-[11px] text-[var(--muted)]">
            {visibleRequests.length} items · status{" "}
            {STATUS_OPTIONS.find((item) => item.value === status)?.label}
          </p>

          <div className="flex flex-col gap-[9px] sm:flex-row sm:items-center">
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Remark — required to reject"
              className="h-[35px] min-w-0 rounded-[9px] border border-indigo-400 bg-[var(--card)] px-[11px] text-[11px] text-[var(--fg)] outline-none placeholder:text-slate-400 focus:border-indigo-600 sm:w-[320px]"
            />

            <AButton
              type="button"
              onClick={handleReject}
              disabled={getActionRows().length === 0 || isClicked}
              className="inline-flex h-[35px] items-center justify-center gap-[7px] rounded-[9px] border border-rose-300 bg-[var(--card)] px-[15px] text-[12px] font-[650] text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={14} />
              Reject
            </AButton>

            <AButton
              type="button"
              onClick={handleApprove}
              disabled={getActionRows().length === 0 || isClicked}
              className="inline-flex h-[35px] items-center justify-center gap-[7px] rounded-[9px] bg-slate-500 px-[16px] text-[12px] font-[650] text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={14} />
              Approve
            </AButton>
          </div>
        </div>
      </div>

      {/* LOADER */}

      <HashloaderComponent isLoading={isClicked} />
    </main>
  );
}
