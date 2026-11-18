"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import HashloaderComponent from "@/components/Templates/hashloader";
import { StatCard } from "@/components/Templates/card";
import ReactTable from "@/components/Templates/reacttable";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Button from "@/components/atoms/Button";
import {
  Search,
  X,
  Gift,
  ArrowLeft,
  Calendar,
  CalendarCheck,
} from "lucide-react";

const Status = [
  { value: "0", label: "Not raised" },
  { value: "1", label: "Raised" },
  { value: "2", label: "Approved" },
  { value: "3", label: "Rejected" },
];

const statusOptions: Record<number, string> = {
  0: "Not raised",
  1: "Raised",
  2: "Approved",
  3: "Rejected",
};

function getCurrentDate(monthsBack = 0) {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsBack);
  const year = today.getFullYear();
  let month: any = today.getMonth() + 1;
  let day: any = today.getDate();
  if (month < 10) month = "0" + month;
  if (day < 10) day = "0" + day;
  return `${year}-${month}-${day}`;
}

export default function CompOffHRRequestPage() {
  const user: any = useCurrentUser();
  const dateRange = useDateRange();

  const [dates, setDates] = useState({
    DATE_FROM: dateRange?.DATE_FROM || getCurrentDate(2),
    DATE_TO: dateRange?.DATE_TO || getCurrentDate(0),
    branch: user?.branch || "",
    status: 0,
  });

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtereddata, setFiltereddata] = useState<any[]>([]);
  const [selectedrowdata, setsellectedrowdata] = useState<any[]>([]);
  const [remark, setRemark] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const [check] = useState<boolean>(true);

  // Sync user's branch when user loads
  useEffect(() => {
    if (user?.branch && !dates.branch) {
      setDates((prev) => ({ ...prev, branch: user.branch }));
    }
  }, [user?.branch]);

  /* ------------------------------------------------------------------ */
  /*  Toast Alert Helper                                                */
  /* ------------------------------------------------------------------ */
  function showSideAlert(
    message: string,
    type: "success" | "error" | "warning" | "info" = "info"
  ) {
    Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      customClass: {
        container: "side-alert-container",
        popup: `side-alert-${type}`,
        title: "side-alert-title",
        icon: "side-alert-icon",
      },
    }).fire({
      icon: type,
      title: message,
    });
  }

  function filterByStatus(data: any[], status: number) {
    return data.filter((item) => Number(item.status) === Number(status));
  }

  /* ------------------------------------------------------------------ */
  /*  Fetch Data from API                                               */
  /* ------------------------------------------------------------------ */
  const showdata = async () => {
    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);

    const branchToUse = dates.branch || user?.branch;
    if (!branchToUse) {
      showSideAlert("Please Select Branch", "warning");
      return;
    }

    setIsClicked(true);
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getCompOffReqData`,
        {
          params: {
            username: user?.name,
            loc_code: branchToUse,
            EMPCODE: user?.EMPCODE,
            dateFrom: dates?.DATE_FROM,
            dateTo: dates?.DATE_TO,
            forHR: 1,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const raw = Array.isArray(result?.data?.Result) ? result.data.Result : [];
      const dataWithSrNo = raw.map((row: any, i: number) => ({
        ...row,
        srno: i + 1,
      }));

      setTabledata(dataWithSrNo);
      setFiltereddata(filterByStatus(dataWithSrNo, dates.status));
    } catch (err) {
      console.error("Error fetching comp off data:", err);
      showSideAlert("Failed to load records.", "error");
    } finally {
      setIsClicked(false);
    }
  };

  useEffect(() => {
    if (user?.branch || dates.branch) {
      showdata();
    }
  }, [dates.status]);

  /* ------------------------------------------------------------------ */
  /*  Filters & Actions                                                 */
  /* ------------------------------------------------------------------ */
  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStatusChange = (val: string | number) => {
    const num = Number(val);
    setDates((prev) => ({ ...prev, status: num }));
    setFiltereddata(filterByStatus(tabledata, num));
  };

  const doubleclicked = (row: any) => {
    console.log("Double clicked row:", row);
  };

  /* ------------------------------------------------------------------ */
  /*  API Action 1: Raise CO Request (approver)                         */
  /* ------------------------------------------------------------------ */
  const approver = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      showSideAlert("Please select at least one row.", "warning");
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

    setIsClicked(true);
    let successCount = 0;
    const failMessages: string[] = [];

    for (const row of selectedrowdata) {
      const r = row?.rowData;
      if (!r) continue;
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/insertCompOffReqData`,
          {
            EMPCODE: r.Emp_Code,
            date: r.DateOffice,
            type: r.coType,
            value: r?.coValue,
            Remark: remark,
          },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );
        if (result.data?.Status === true || result.data?.status === true) {
          successCount++;
        } else {
          failMessages.push(`${r.Emp_Code}: ${result.data?.Message || "Failed"}`);
        }
      } catch (err: any) {
        failMessages.push(`${r.Emp_Code}: ${err.response?.data?.Message || "Failed"}`);
      }
    }

    if (successCount > 0) {
      showSideAlert(`${successCount} record raised successfully`, "success");
    }
    if (failMessages.length > 0) {
      showSideAlert(`${failMessages.length} failed: ${failMessages.join(", ")}`, "error");
    }

    setsellectedrowdata([]);
    setRemark(null);
    setIsClicked(false);
    await showdata();
  };

  /* ------------------------------------------------------------------ */
  /*  API Action 2: Reject Comp-Off Request                             */
  /* ------------------------------------------------------------------ */
  const reject = async () => {
    if (!remark) {
      showSideAlert("Please enter a remark before reject proceeding.", "warning");
      return;
    }
    if (!selectedrowdata || selectedrowdata.length === 0) {
      showSideAlert("Please select at least one row.", "warning");
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

    setIsClicked(true);
    let successCount = 0;
    const failMessages: string[] = [];

    for (const row of selectedrowdata) {
      const r = row?.rowData;
      if (!r) continue;
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/RejectCompOffReqByEmpcode`,
          {
            EMPCODE: r.Emp_Code,
            date: r.DateOffice,
            type: r.coType,
            value: r?.coValue,
            rem: remark,
          },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );
        if (result.data?.Status === true || result.data?.status === true) {
          successCount++;
        } else {
          failMessages.push(`${r.Emp_Code}: ${result.data?.Message || "Failed"}`);
        }
      } catch (err: any) {
        failMessages.push(`${r.Emp_Code}: ${err.response?.data?.Message || "Failed"}`);
      }
    }

    if (successCount > 0) {
      showSideAlert(`${successCount} record rejected successfully`, "success");
    }
    if (failMessages.length > 0) {
      showSideAlert(`${failMessages.length} failed: ${failMessages.join(", ")}`, "error");
    }

    setsellectedrowdata([]);
    setRemark(null);
    setIsClicked(false);
    await showdata();
  };

  /* ------------------------------------------------------------------ */
  /*  API Action 3: Generate Comp-Off Leave (leaveGrant)                */
  /* ------------------------------------------------------------------ */
  const leaveGrant = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      showSideAlert("Please select at least one row.", "warning");
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This will generate Comp-Off for the selected records. Do you want to proceed?",
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });
    if (!confirmed.isConfirmed) return;

    setIsClicked(true);

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/generateCompOffleave`,
        {
          records: selectedrowdata
            .map((row) => {
              const r = row?.rowData;
              if (!r) return null;
              return {
                empCode: String(r.Emp_Code).trim(),
                date: String(r.DateOffice).slice(0, 10),
              };
            })
            .filter(Boolean),
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const s = data?.summary;
      if (!data?.success && !s) {
        showSideAlert(data?.message || "Failed to generate Comp-Off", "error");
      } else {
        if (s?.created > 0)
          showSideAlert(`${s.created} Comp-Off generated`, "success");
        if (s?.skippedAlreadyExists > 0)
          showSideAlert(`${s.skippedAlreadyExists} already generated`, "info");
        if (s?.notEligible > 0)
          showSideAlert(`${s.notEligible} not eligible`, "warning");
        if (s?.failed > 0)
          showSideAlert(`${s.failed} failed`, "error");
      }
    } catch (err: any) {
      showSideAlert(
        err?.response?.data?.message || "Failed to generate Comp-Off",
        "error"
      );
    } finally {
      setsellectedrowdata([]);
      setRemark(null);
      setIsClicked(false);
      await showdata();
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Search & Filter Logic                                             */
  /* ------------------------------------------------------------------ */
  const displayedData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtereddata;
    return filtereddata.filter((item: any) => {
      const code = String(item.Emp_Code || "").toLowerCase();
      const name = String(item.empName || "").toLowerCase();
      const desig = String(item.empDesignation || "").toLowerCase();
      const branch = String(item.Branch || item.branch || "").toLowerCase();
      return (
        code.includes(q) ||
        name.includes(q) ||
        desig.includes(q) ||
        branch.includes(q)
      );
    });
  }, [filtereddata, searchQuery]);

  /* ------------------------------------------------------------------ */
  /*  Stat counts                                                       */
  /* ------------------------------------------------------------------ */
  const notRaisedCount = useMemo(
    () => tabledata.filter((r: any) => Number(r.status) === 0).length,
    [tabledata]
  );
  const raisedCount = useMemo(
    () => tabledata.filter((r: any) => Number(r.status) === 1).length,
    [tabledata]
  );
  const approvedCount = useMemo(
    () => tabledata.filter((r: any) => Number(r.status) === 2).length,
    [tabledata]
  );
  const lapsingCount = useMemo(() => {
    return tabledata.filter((r: any) => {
      if (!r.laps_date) return false;
      const ld = new Date(r.laps_date);
      if (isNaN(ld.getTime())) return false;
      const now = new Date();
      const diffDays = Math.ceil(
        (ld.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays >= 0 && diffDays <= 60;
    }).length;
  }, [tabledata]);

  /* ------------------------------------------------------------------ */
  /*  Table Columns (Preserving ALL columns from old code)              */
  /* ------------------------------------------------------------------ */
  const columns = useMemo(
    () => [
      {
        Header: "EMPLOYEE",
        accessor: "empName",
        Cell: ({ row }: any) => {
          const r = row.original;
          const branch = r.Branch || r.branch || user?.branch || "1";
          return (
            <div className="flex flex-col py-0.5">
              <span className="font-[650] text-[#1E293B] dark:text-[#E7ECF3] text-[13px]">
                {r.empName || "—"}
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                {[r.empDesignation, `BRANCH - ${branch}`, r.Emp_Code]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          );
        },
      },
      {
        Header: "OFFICE DATE",
        accessor: "DateOffice",
        Cell: ({ value }: any) => {
          if (!value) return <span className="text-slate-400">waiting</span>;
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) return String(value);

          const currentDate = new Date();
          const futureDate = new Date(currentDate);
          futureDate.setDate(currentDate.getDate() + 10);
          const isFutureDate = dateObj >= futureDate;

          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = dateObj.toLocaleString("en-US", { month: "short" });
          const year = dateObj.getFullYear();
          const formatted = `${day} ${month} ${year}`;

          return (
            <span
              className={`font-medium ${
                isFutureDate
                  ? "rounded border border-red-500 bg-red-50 px-1.5 py-0.5 text-red-600 font-semibold"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {formatted}
            </span>
          );
        },
      },
      {
        Header: "SHIFT",
        accessor: "ShiftStartTime",
        Cell: ({ row }: any) => {
          const r = row.original;
          const start = r.ShiftStartTime
            ? String(r.ShiftStartTime).slice(0, 5)
            : "";
          const end = r.ShiftEndTime
            ? String(r.ShiftEndTime).slice(0, 5)
            : "";
          if (!start && !end) return <span className="text-slate-400">—</span>;
          return (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {start} - {end}
            </span>
          );
        },
      },
      {
        Header: "HOURS WORKED",
        accessor: "HoursWorked",
        Cell: ({ row }: any) => {
          const r = row.original;
          const h = r.HoursWorked ?? 0;
          const m = r.HoursWorkedMin ?? 0;
          const timeStr = `${h}:${String(m).padStart(2, "0")}`;
          const isFull = Number(h) >= 8;
          const shiftMins = Number(r.ShiftMinutes) || 540;
          const shiftHrs = (shiftMins / 60).toFixed(0);

          return (
            <div className="flex flex-col gap-1 min-w-[110px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                  {timeStr}
                </span>
                <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isFull ? "bg-[#10B981]" : "bg-[#F59E0B]"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        ((Number(h) * 60 + Number(m)) / shiftMins) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                of {shiftHrs}:00 shift hrs
              </span>
            </div>
          );
        },
      },
      {
        Header: "CO TYPE",
        accessor: "coType",
        Cell: ({ value }: any) => {
          const val = String(value || "").toLowerCase();
          const isFull =
            val.includes("full") || val === "1" || val === "fd";
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isFull
                  ? "bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-[#FEF3C7] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400"
              }`}
            >
              {isFull ? "Full day" : "Half day"}
            </span>
          );
        },
      },
      {
        Header: "CO VALUE",
        accessor: "coValue",
        Cell: ({ value }: any) => (
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {value ?? "1"}
          </span>
        ),
      },
      {
        Header: "LAPSES ON",
        accessor: "laps_date",
        Cell: ({ value }: any) => {
          if (!value) return <span className="text-slate-400">—</span>;
          const d = new Date(value);
          if (isNaN(d.getTime())) return String(value);

          const day = String(d.getDate()).padStart(2, "0");
          const month = d.toLocaleString("en-US", { month: "short" });
          const year = d.getFullYear();
          const formatted = `${day} ${month} ${year}`;

          const now = new Date();
          const diff = Math.ceil(
            (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const isExpired = diff < 0;

          return (
            <span
              className={`font-semibold text-[12px] ${
                isExpired ? "text-[#E11D48]" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {formatted}
            </span>
          );
        },
      },
      {
        Header: "STATUS",
        accessor: "status",
        Cell: ({ value }: any) => {
          const s = Number(value);
          if (s === 2) {
            return (
              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Approved
              </span>
            );
          }
          if (s === 3) {
            return (
              <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                Rejected
              </span>
            );
          }
          if (s === 1) {
            return (
              <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Raised
              </span>
            );
          }
          return (
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Not raised
            </span>
          );
        },
      },
      {
        Header: "REMARK",
        accessor: "Remark",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-[150px] inline-block">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "APPROVE BY",
        accessor: "txtApprBy",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 text-xs">
            {value || "—"}
          </span>
        ),
      },
    ],
    [user?.branch]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] dark:bg-[#0A0F1C] dark:text-[#E7ECF3] px-6 py-5 md:px-8 md:py-6 font-['Inter',system-ui,sans-serif] antialiased [font-feature-settings:'tnum'_1]">
      {/* Top Header */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Comp off requests on behalf of employees
          </h1>
          <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Every day worked on a week off or holiday shows here with the hours that earned it. Raise the comp off before it lapses, or reject it with a reason.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="!h-[34px] !rounded-[9px] !px-3.5 !text-[12px] !font-[550] !border-[#E2E8F0] dark:!border-[#1F2937] !shadow-none"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back
        </Button>
      </div>

      <div className="flex flex-col gap-3.5">
        {/* CARD 1: Filters */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* DATE FROM */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                DATE FROM
              </span>
              <Einput
                type="date"
                name="DATE_FROM"
                value={dates.DATE_FROM}
                onChange={(e) => handleDateChange("DATE_FROM", e.target.value)}
                hideLabel
                wrapperClassName="w-full"
                className="!h-[38px] !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
              />
            </div>

            {/* DATE TO */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                DATE TO
              </span>
              <Einput
                type="date"
                name="DATE_TO"
                value={dates.DATE_TO}
                onChange={(e) => handleDateChange("DATE_TO", e.target.value)}
                hideLabel
                wrapperClassName="w-full"
                className="!h-[38px] !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
              />
            </div>

            {/* STATUS */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                STATUS
              </span>
              <Eselect
                name="status"
                option={Status}
                initialValue={String(dates.status)}
                handleInputChange={(_name, val) => handleStatusChange(val)}
                mb={0}
                className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
              />
            </div>

            {/* SEARCH + SHOW */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                SEARCH
              </span>
              <div className="flex items-center gap-2 w-full">
                <Einput
                  type="text"
                  name="searchQuery"
                  placeholder="Code, name or designation"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  hideLabel
                  wrapperClassName="w-full flex-1 min-w-0"
                  className="!h-[38px] !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none placeholder:!text-[#64748B]/60 focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
                />
                <Button
                  type="button"
                  onClick={showdata}
                  icon={<Search className="h-4 w-4" />}
                  className="!h-[38px] !shrink-0 !rounded-[9px] !px-4 sm:!px-5 !text-[12.5px] !font-semibold !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !shadow-none active:scale-[0.98] transition-all"
                >
                  Show
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD ROW: 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Not raised"
            count={notRaisedCount}
            subtitle="Waiting on HR"
            isActive={String(dates.status) === "0"}
            onClick={() => handleStatusChange("0")}
            variant="amber"
            iconBox={false}
            uppercase={false}
            icon={<span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />}
            className="!h-[95px] !min-h-[95px] !rounded-2xl border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-sm cursor-pointer"
          />

          <StatCard
            title="Raised"
            count={raisedCount}
            subtitle="With the approver"
            isActive={String(dates.status) === "1"}
            onClick={() => handleStatusChange("1")}
            variant="indigo"
            iconBox={false}
            uppercase={false}
            icon={<span className="h-2.5 w-2.5 rounded-full bg-[#4F46E5]" />}
            className="!h-[95px] !min-h-[95px] !rounded-2xl border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-sm cursor-pointer"
          />

          <StatCard
            title="Approved"
            count={approvedCount}
            subtitle="Credited to balance"
            isActive={String(dates.status) === "2"}
            onClick={() => handleStatusChange("2")}
            variant="emerald"
            iconBox={false}
            uppercase={false}
            icon={<span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />}
            className="!h-[95px] !min-h-[95px] !rounded-2xl border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-sm cursor-pointer"
          />

          <StatCard
            title="Lapsing in 60 days"
            count={lapsingCount}
            subtitle="Raise before the lapse date"
            isActive={false}
            variant="red"
            iconBox={false}
            uppercase={false}
            icon={<span className="h-2.5 w-2.5 rounded-full bg-[#E11D48]" />}
            className="!h-[95px] !min-h-[95px] !rounded-2xl border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-sm"
          />
        </div>

        {/* TABLE CARD */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm dark:border-[#1F2937] dark:bg-[#111827]">
          {/* Table Header Bar */}
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1F2937] px-4 py-3 bg-white dark:bg-[#111827]">
            <span className="text-[12.5px] font-bold text-[#1E293B] dark:text-[#E7ECF3]">
              {displayedData.length} eligible days
            </span>
            <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Select the days you want to raise
            </span>
          </div>

          {/* ReactTable with Checkbox column */}
          <ReactTable
            columns={columns}
            data={displayedData}
            check={check}
            selectValue="srno"
            setsellectedrowdata={(newSelected) => {
              setsellectedrowdata(newSelected || []);
            }}
            onRowDoubleClick={(row) => doubleclicked(row)}
            height={430}
            showTopSearch={false}
            showExcelExport={false}
            showPageSizeInFooter={true}
            containerClassName="!border-none !shadow-none !rounded-none !bg-transparent"
          />

          {/* Action Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-[#1F2937] dark:bg-[#0E1524]">
            <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Page 1 of 1 · {displayedData.length} items · status{" "}
              {statusOptions[dates.status as 0 | 1 | 2 | 3] || "Not raised"}
            </span>

            <div className="flex flex-wrap items-center gap-2.5">
              <Einput
                type="text"
                name="remark"
                hideLabel
                value={remark ?? ""}
                placeholder="Remark — required to reject"
                onChange={(e) => setRemark(e.target.value)}
                wrapperClassName="w-60 sm:w-72"
                className="!h-[38px] !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] shadow-none placeholder:!text-[#64748B]/60 focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
              />

              <Button
                type="button"
                variant="outline"
                onClick={reject}
                icon={<X className="h-4 w-4 text-[#E11D48]" />}
                className="!h-[38px] !rounded-[9px] !border-rose-200 !text-[#E11D48] hover:!bg-rose-50 dark:!border-rose-900/60 dark:hover:!bg-rose-950/40 text-[12.5px] font-semibold !shadow-none active:scale-[0.98]"
              >
                Reject
              </Button>

              <Button
                type="button"
                onClick={approver}
                icon={<Gift className="h-4 w-4 text-white" />}
                className="!h-[38px] !rounded-[9px] !bg-[#334155] text-white hover:!bg-[#1E293B] text-[12.5px] font-semibold !shadow-none active:scale-[0.98]"
              >
                Raise CO request
              </Button>

              <Button
                type="button"
                onClick={leaveGrant}
                icon={<CalendarCheck className="h-4 w-4 text-white" />}
                className="!h-[38px] !rounded-[9px] !bg-[#059669] text-white hover:!bg-[#047857] text-[12.5px] font-semibold !shadow-none active:scale-[0.98]"
              >
                Generate Leave
              </Button>
            </div>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
