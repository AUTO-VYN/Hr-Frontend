"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, ArrowUp, ArrowDown } from "lucide-react";
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

type DeviationRow = {
  UTD?: number;
  EMPCODE?: string;
  EMPNAME?: string;
  EMPFIRSTNAME?: string;
  EMPLASTNAME?: string;
  EmpMst?: {
    EMPFIRSTNAME?: string;
    EMPLASTNAME?: string;
  } | null;
  DEPT_NAME?: string;
  BRANCH_NAME?: string;
  DEV_DAYS?: number | string | null;
  Created_By?: string;
  Created_At?: string;
  SAL_MNTH?: string | number;
  SAL_YR?: string | number;
  status_khud_ka?: number | string | null;
  [key: string]: any;
};

type StatusType = "approved" | "pending" | "rejected";

/* =========================================================
   CONSTANTS
========================================================= */

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

const MONTH_OPTIONS = MONTHS.map((month, index) => ({
  label: month.substring(0, 3),
  value: String(index + 1),
}));

const currentYear = new Date().getFullYear();

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => {
  const year = currentYear - 4 + index;
  return {
    label: String(year),
    value: String(year),
  };
});

/* =========================================================
   HELPERS
========================================================= */

const getEmployeeName = (item: DeviationRow) => {
  if (item.EMPNAME) return item.EMPNAME;

  const first = item.EmpMst?.EMPFIRSTNAME || item.EMPFIRSTNAME || "";

  const last = item.EmpMst?.EMPLASTNAME || item.EMPLASTNAME || "";

  return `${first} ${last}`.trim() || item.EMPCODE || "-";
};

const getStatus = (item: DeviationRow): StatusType => {
  const status = item.status_khud_ka;

  if (status === 1 || status === "1") {
    return "approved";
  }

  if (status === 0 || status === "0") {
    return "rejected";
  }

  return "pending";
};

const formatDays = (value: number) => {
  if (!Number.isFinite(value)) return "0";

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const formatSignedDays = (value: number) =>
  `${value > 0 ? "+" : ""}${formatDays(value)}`;

const formatDate = (date?: string | null) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "-";

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = MONTHS[parsed.getMonth()].substring(0, 3);

  return `${day} ${month} ${parsed.getFullYear()}`;
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({ type }: { type: StatusType }) => {
  const config = {
    approved: {
      label: "Approved",
      style: "bg-emerald-50 text-emerald-600",
    },
    pending: {
      label: "Pending",
      style: "bg-amber-50 text-amber-600",
    },
    rejected: {
      label: "Rejected",
      style: "bg-rose-50 text-rose-600",
    },
  }[type];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-[9px] py-[3px] text-[10.5px] font-[700] ${config.style}`}
    >
      {config.label}
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
  <div className="min-w-0 rounded-[16px] border border-[var(--border)] bg-[var(--card)] px-[18px] py-[15px] shadow-[var(--shadow)]">
    <div className="flex items-center gap-[8px]">
      <span className={`h-[7px] w-[7px] rounded-full ${dotColor}`} />

      <p className="m-0 text-[12.5px] font-[500] text-[var(--muted)]">
        {label}
      </p>
    </div>

    <h2 className="mb-0 mt-[8px] text-[26px] font-[750] leading-none text-[var(--fg)]">
      {value}
    </h2>

    <p className="mb-0 mt-[8px] text-[12px] text-[var(--muted)]">
      {description}
    </p>
  </div>
);

/* =========================================================
   PAGE
========================================================= */

export default function EmployeeDeviationView() {
  const user = useCurrentUser();

  const now = new Date();

  const [month, setMonth] = useState(String(now.getMonth() + 1));

  const [year, setYear] = useState(String(now.getFullYear()));

  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<DeviationRow[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [sortAscending, setSortAscending] = useState(true);

  const [loadedPeriod, setLoadedPeriod] = useState(
    `${MONTHS[now.getMonth()].substring(0, 3)} ${now.getFullYear()}`,
  );

  /* ---------------- TOAST ---------------- */

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

  /* ---------------- FETCH DATA ---------------- */

  const fetchData = async (selectedMonth = month, selectedYear = year) => {
    if (!user?.Comp_Code) {
      showToast("Company code not found", "warning");
      return;
    }

    if (!selectedMonth || !selectedYear) {
      showToast("Please select month and year", "warning");
      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/ViewEmpDevationData`,
        {
          Created_by: user?.name,

          filterData: {
            DATE_FROM: selectedMonth,
            DATE_TO: selectedYear,

            DedType: null,
            Region: null,
            Cluster: null,
            Channel: null,

            loc_code: user?.branch,
          },
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log("Employee Deviation API Response:", response.data);

      const responseData = response?.data?.result || response?.data?.data || [];

      setRows(Array.isArray(responseData) ? responseData : []);

      setLoadedPeriod(
        `${MONTHS[Number(selectedMonth) - 1].substring(0, 3)} ${selectedYear}`,
      );
    } catch (error: any) {
      console.error("Deviation view fetch error:", error);

      setRows([]);

      showToast(
        error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Unable to fetch deviations",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- INITIAL API CALL ---------------- */

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  /* ---------------- RESET ---------------- */

  const handleReset = () => {
    const today = new Date();

    const resetMonth = String(today.getMonth() + 1);

    const resetYear = String(today.getFullYear());

    setMonth(resetMonth);
    setYear(resetYear);
    setSearch("");

    fetchData(resetMonth, resetYear);
  };

  /* ---------------- SEARCH + SORT ---------------- */

  const visibleRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return rows
      .filter((item) => {
        if (!text) return true;

        return (
          getEmployeeName(item).toLowerCase().includes(text) ||
          String(item.EMPCODE || "")
            .toLowerCase()
            .includes(text) ||
          String(item.Created_By || "")
            .toLowerCase()
            .includes(text)
        );
      })
      .sort((a, b) => {
        const result = getEmployeeName(a).localeCompare(getEmployeeName(b));

        return sortAscending ? result : -result;
      });
  }, [rows, search, sortAscending]);

  /* ---------------- SUMMARY ---------------- */

  const netDays = rows.reduce(
    (total, item) => total + Number(item.DEV_DAYS || 0),
    0,
  );

  const pendingCount = rows.filter(
    (item) => getStatus(item) === "pending",
  ).length;

  const rejectedCount = rows.filter(
    (item) => getStatus(item) === "rejected",
  ).length;

  /* ---------------- EXPORT ---------------- */

  const handleExport = () => {
    if (visibleRows.length === 0) {
      showToast("No data to export", "warning");
      return;
    }

    const escapeCell = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const header = [
      "Employee",
      "Employee Code",
      "Department",
      "Branch",
      "Deviation Days",
      "Created By",
      "Created Date",
      "Status",
    ];

    const body = visibleRows.map((item) => [
      getEmployeeName(item),
      item.EMPCODE,
      item.DEPT_NAME,
      item.BRANCH_NAME,
      item.DEV_DAYS,
      item.Created_By,
      formatDate(item.Created_At),
      getStatus(item),
    ]);

    const csv = [header, ...body]
      .map((line) => line.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `employee-deviations-${loadedPeriod.replace(" ", "-")}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  /* ---------------- COLUMNS ---------------- */

  const columns = useMemo(
    () => [
      {
        Header: () => (
          <button
            type="button"
            onClick={() => setSortAscending((previous) => !previous)}
            className="inline-flex items-center gap-[4px] whitespace-nowrap text-[10.5px] font-[750] tracking-[0.04em] text-indigo-600"
          >
            EMPLOYEE
            {sortAscending ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </button>
        ),

        id: "employee",
        accessor: "EMPCODE",
        width: 320,

        Cell: ({ row }: any) => {
          const item: DeviationRow = row.original;

          const subtitle = [item.DEPT_NAME, item.BRANCH_NAME, item.EMPCODE]
            .filter(Boolean)
            .join(" · ");

          return (
            <div className="min-w-[220px] py-[3px]">
              <p className="m-0 whitespace-nowrap text-[13px] font-[700] text-[var(--fg)]">
                {getEmployeeName(item)}
              </p>

              <p className="mb-0 mt-[3px] whitespace-nowrap text-[11.5px] text-[var(--muted)]">
                {subtitle || "-"}
              </p>
            </div>
          );
        },
      },

      {
        Header: "DEVIATION DAYS",
        accessor: "DEV_DAYS",
        width: 150,
        Cell: ({ value }: any) => {
          const days = Number(value || 0);

          return (
            <div
              className={`w-full text-center text-[13px] font-[750] ${
                days >= 0 ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {formatSignedDays(days)}
            </div>
          );
        },
      },

      {
        Header: "CREATED BY",
        accessor: "Created_By",
        width: 170,

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-[var(--fg)]">
            {value || "-"}
          </span>
        ),
      },

      {
        Header: "CREATED DATE",
        accessor: "Created_At",
        width: 170,

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-[var(--muted)]">
            {formatDate(value)}
          </span>
        ),
      },

      {
        Header: "STATUS",
        id: "status",
        accessor: "status_khud_ka",
        width: 130,

        Cell: ({ row }: any) => <StatusBadge type="approved" />,
      },
    ],
    [sortAscending],
  );

  /* ---------------- JSX ---------------- */

  return (
    <main className="min-h-screen bg-[var(--bg)] px-[14px] py-[18px] text-[var(--fg)]">
      {/* HEADER */}

      <div className="mb-[17px]">
        <h1 className="m-0 text-[22px] font-[750] leading-tight tracking-[-0.02em]">
          Employee deviation view
        </h1>

        <p className="mb-0 mt-[5px] text-[13px] text-[var(--muted)]">
          Every paid-days deviation raised for a salary month, with who raised
          it and where it stands in the approval chain.
        </p>
      </div>

      {/* FILTER BAR */}

      <div className="mb-[14px] rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-[16px] shadow-[var(--shadow)]">
        <div className="grid grid-cols-1 items-end gap-[13px] sm:grid-cols-2 xl:grid-cols-[160px_140px_minmax(200px,1fr)_100px_80px]">
          <Eselect
            title="MONTH *"
            name="month"
            className="h-[40px] w-full"
            option={MONTH_OPTIONS}
            initialValue={month}
            handleInputChange={(name: string, value: any) => setMonth(value)}
          />

          <Eselect
            title="YEAR *"
            name="year"
            className="h-[40px] w-full"
            option={YEAR_OPTIONS}
            initialValue={year}
            handleInputChange={(name: string, value: any) => setYear(value)}
          />

          <Einput
            title="SEARCH"
            type="text"
            name="search"
            value={search}
            handleInputChange={(name: string, value: any) => setSearch(value)}
            placeholder="Code, name or creator"
            className="h-[40px] w-full"
          />

          <AButton
            type="button"
            onClick={() => fetchData()}
            className="inline-flex h-[40px] w-full items-center justify-center gap-[7px] rounded-[9px] bg-indigo-600 px-[15px] text-[12.5px] font-[650] text-white transition hover:bg-indigo-700"
          >
            <Search size={14} />
            Show
          </AButton>

          <AButton
            type="button"
            onClick={handleReset}
            className="inline-flex h-[40px] w-full items-center justify-center rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-[15px] text-[12.5px] font-[650] text-[var(--muted)] transition hover:bg-slate-50"
          >
            Reset
          </AButton>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="mb-[14px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Deviations"
          value={String(rows.length)}
          description={loadedPeriod}
          dotColor="bg-indigo-600"
        />

        <SummaryCard
          label="Net days added"
          value={formatSignedDays(netDays)}
          description="Across all rows"
          dotColor="bg-emerald-500"
        />

        <SummaryCard
          label=" approval"
          value={String(pendingCount)}
          description="Not in payroll yet"
          dotColor="bg-emerald-500"
        />

        <SummaryCard
          label="Rejected"
          value={String(rejectedCount)}
          description="Attendance days stand"
          dotColor="bg-rose-500"
        />
      </div>

      {/* TABLE CARD */}

      <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]">
        {/* TABLE TOP BAR */}

        <div className="flex min-h-[60px] flex-wrap items-center justify-between gap-[10px] border-b border-[var(--border)] px-[18px] py-[10px]">
          <span className="text-[14px] font-[700] text-[var(--fg)]">
            {visibleRows.length} deviations
          </span>

          <AButton
            type="button"
            onClick={handleExport}
            className="inline-flex h-[36px] items-center justify-center gap-[8px] rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-[14px] text-[12.5px] font-[650] text-[var(--fg)] transition hover:bg-slate-50"
          >
            <Download size={14} />
            Export to Excel
          </AButton>
        </div>

        {/* REUSABLE REACT TABLE */}

        <div className="w-full min-w-0 overflow-x-auto">
          <DataTable
            columns={columns}
            data={visibleRows}
            showTopSearch={false}
            showExcelExport={false}
            initialPageSize={10}
          />
        </div>
      </div>

      {/* LOADER */}

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
