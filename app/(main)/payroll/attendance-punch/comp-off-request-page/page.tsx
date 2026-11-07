"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  ListChecks,
  FileSpreadsheet,
  PlusCircle,
} from "lucide-react";

import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import { StatCard } from "@/components/Templates/card";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import { useToast } from "@/app/hooks/useToast";
import useExcelDownload from "@/app/hooks/excel-download";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function CompOffRequestPage() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const dateRange = useDateRange();
  const { handleExcelDownload, isLoading: isExporting } = useExcelDownload();

  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dates, setDates] = useState({
    DATE_FROM: dateRange?.DATE_FROM || getCurrentDate(1),
    DATE_TO: dateRange?.DATE_TO || getCurrentDate(0),
    branch: user?.branch || "ALL",
    status: 0, // 0: Not raised, 1: Raised / Pending, 2: Approved, 3: Rejected, "ALL": All
  });

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtereddata, setFiltereddata] = useState<any[]>([]);
  const [selectedrowdata, setsellectedrowdata] = useState<any[]>([]);
  const [branchList, setBranchList] = useState<any[]>([]);
  const [remark, setRemark] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);

  // Approver List Modal State
  const [isModalVisible1, setIsModalVisible1] = useState(false);
  const [apprData, setApprData] = useState<any[]>([]);

  function filterByStatus(data: any[], status: any) {
    if (status === "ALL" || status === "" || status === undefined) return data;
    const target = String(status).toLowerCase().trim();
    return data.filter((item) => {
      const s = String(item.status ?? "").toLowerCase().trim();
      if (target === "0" || target === "not raise" || target === "not raised") {
        return s === "0" || s === "not raise" || s === "not raised";
      }
      if (target === "1" || target === "pending" || target === "raised") {
        return s === "1" || s === "pending" || s === "raised";
      }
      if (target === "2" || target === "approved") {
        return s === "2" || s === "approved";
      }
      if (target === "3" || target === "rejected") {
        return s === "3" || s === "rejected";
      }
      return s === target;
    });
  }

  const handleInputChange = (name: string, value: any) => {
    if (name === "status") {
      setFiltereddata(filterByStatus(tabledata, value));
      setsellectedrowdata([]);
    }
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCardClick = (statusVal: any) => {
    setDates((prev) => ({
      ...prev,
      status: statusVal,
    }));
    setsellectedrowdata([]);
    setFiltereddata(filterByStatus(tabledata, statusVal));
  };

  const handleResetFilters = () => {
    const resetDates = {
      DATE_FROM: dateRange?.DATE_FROM || getCurrentDate(1),
      DATE_TO: dateRange?.DATE_TO || getCurrentDate(0),
      branch: user?.branch || "ALL",
      status: 0,
    };
    setDates(resetDates);
    setsellectedrowdata([]);
    setRemark("");
    setFiltereddata(filterByStatus(tabledata, 0));
  };

  // Ref to always access latest dates inside callbacks without re-triggering effects
  const datesRef = React.useRef(dates);
  useEffect(() => {
    datesRef.current = dates;
  }, [dates]);

  // ── Fetch Branch List ──────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    if (!user?.Comp_Code) return;
    try {
      const currentDates = datesRef.current;
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/payout/payout`,
        {
          dateFrom: currentDates.DATE_FROM,
          dateto: currentDates.DATE_TO,
          multi_loc: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        },
      );
      if (Array.isArray(result.data?.branch)) {
        setBranchList(result.data.branch);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  }, [user?.Comp_Code, user?.name, user?.email, user?.branch]);

  // ── Fetch Approver Hierarchy List ──────────────────────────────────────────
  const showDataOFAPPRVL = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: "compoff",
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );
      if (Array.isArray(response.data?.Result)) {
        setApprData(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  // ── Fetch Comp Off Data ────────────────────────────────────────────────────
  const showdata = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;

    const currentDates = datesRef.current;

    if (!currentDates.branch) {
      toast({
        title: "Please Select Branch",
        variant: "destructive",
      });
      return;
    }

    setIsClicked(true);
    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);

    try {
      const locCode = currentDates.branch === "ALL" ? "" : currentDates.branch;

      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getCompOffReqData`,
        {
          params: {
            username: user?.name,
            loc_code: locCode,
            EMPCODE: user?.EMPCODE,
            dateFrom: currentDates.DATE_FROM,
            dateTo: currentDates.DATE_TO,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const records = Array.isArray(result.data?.Result)
        ? result.data.Result.map((row: any, i: number) => ({
            ...row,
            srno: row.srno ?? i + 1,
          }))
        : [];

      setTabledata(records);
      setFiltereddata(filterByStatus(records, currentDates.status));
    } catch (err: any) {
      console.error("Error fetching comp off data:", err);
      toast({
        title: err?.response?.data?.Message || "Failed to fetch comp off requests",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  }, [user?.name, user?.EMPCODE, user?.Comp_Code, toast]);

  // Initial load
  const initialFetchDone = React.useRef(false);
  useEffect(() => {
    if (user?.EMPCODE && user?.Comp_Code && !initialFetchDone.current) {
      initialFetchDone.current = true;
      showdata();
      fetchBranches();
      showDataOFAPPRVL();
    }
  }, [user?.EMPCODE, user?.Comp_Code, showdata, fetchBranches, showDataOFAPPRVL]);

  // ── Raise / Approve Comp Off Action ────────────────────────────────────────
  const approver = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Request Selected",
        text: "Please select at least one record to raise comp off request.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Are you sure?",
      text: `Do you want to raise comp off request for ${selectedrowdata.length} selected record(s)?`,
      confirmButtonText: "Yes, raise request",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
    });

    if (confirmed.isConfirmed) {
      setIsClicked(true);
      try {
        let hasError = false;
        let lastErrorMsg = "";

        for (const item of selectedrowdata) {
          const row = item.rowData || item;
          try {
            const result = await axios.post(
              `${process.env.NEXT_PUBLIC_URL}/mobile/insertCompOffReqData`,
              {
                EMPCODE: row.Emp_Code,
                date: row.DateOffice,
                type: row.coType,
                value: row?.coValue,
                Remark: remark || "",
              },
              {
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              },
            );

            const isSuccess =
              result.data?.status === true ||
              result.data?.Status === true ||
              result.data?.status === "true" ||
              result.data?.Status === "true" ||
              result.data?.success === true;

            if (!isSuccess && (result.data?.Message || result.data?.message)) {
              hasError = true;
              lastErrorMsg = result.data?.Message || result.data?.message;
            }
          } catch (innerErr: any) {
            hasError = true;
            lastErrorMsg =
              innerErr?.response?.data?.Message ||
              innerErr?.response?.data?.message ||
              innerErr?.message;
          }
        }

        if (hasError && lastErrorMsg) {
          await Swal.fire({
            icon: "warning",
            title: "Process Completed with Notice",
            text: lastErrorMsg,
            confirmButtonColor: "#4F46E5",
          });
        } else {
          await Swal.fire({
            icon: "success",
            title: "Raised Successfully",
            text: "Comp off request(s) raised successfully.",
            confirmButtonColor: "#4F46E5",
          });
          toast({
            title: "Raised Successfully",
            variant: "default",
          });
        }

        setsellectedrowdata([]);
        setRemark("");
        await showdata();
      } catch (err: any) {
        console.error("Raise comp off error:", err);
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: err?.response?.data?.Message || "Failed to raise comp off request.",
          confirmButtonColor: "#E11D48",
        });
      } finally {
        setIsClicked(false);
      }
    }
  };

  // ── Reject Comp Off Action ─────────────────────────────────────────────────
  const reject = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Request Selected",
        text: "Please select at least one record to reject.",
        confirmButtonColor: "#E11D48",
      });
      return;
    }

    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Please enter a remark before rejecting the request.",
        confirmButtonColor: "#E11D48",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: `Do you want to reject ${selectedrowdata.length} selected record(s)?`,
      confirmButtonText: "Yes, reject",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#E11D48",
      cancelButtonColor: "#64748B",
    });

    if (confirmed.isConfirmed) {
      setIsClicked(true);
      try {
        let hasError = false;
        let lastErrorMsg = "";

        for (const item of selectedrowdata) {
          const row = item.rowData || item;
          try {
            const result = await axios.post(
              `${process.env.NEXT_PUBLIC_URL}/mobile/RejectCompOffReqByEmpcode`,
              {
                EMPCODE: row.Emp_Code,
                date: row.DateOffice,
                type: row.coType,
                value: row?.coValue,
                rem: remark,
              },
              {
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              },
            );

            const isSuccess =
              result.data?.status === true ||
              result.data?.Status === true ||
              result.data?.status === "true" ||
              result.data?.Status === "true" ||
              result.data?.success === true;

            if (!isSuccess && (result.data?.Message || result.data?.message)) {
              hasError = true;
              lastErrorMsg = result.data?.Message || result.data?.message;
            }
          } catch (innerErr: any) {
            hasError = true;
            lastErrorMsg =
              innerErr?.response?.data?.Message ||
              innerErr?.response?.data?.message ||
              innerErr?.message;
          }
        }

        if (hasError && lastErrorMsg) {
          await Swal.fire({
            icon: "warning",
            title: "Process Notice",
            text: lastErrorMsg,
            confirmButtonColor: "#E11D48",
          });
        } else {
          await Swal.fire({
            icon: "success",
            title: "Rejected Successfully",
            text: "Selected request(s) rejected successfully.",
            confirmButtonColor: "#E11D48",
          });
          toast({
            title: "Rejected Successfully",
            variant: "default",
          });
        }

        setsellectedrowdata([]);
        setRemark("");
        await showdata();
      } catch (err: any) {
        console.error("Reject comp off error:", err);
        await Swal.fire({
          icon: "error",
          title: "Reject Error",
          text: err?.response?.data?.Message || "Failed to reject comp off request.",
          confirmButtonColor: "#E11D48",
        });
      } finally {
        setIsClicked(false);
      }
    }
  };

  const doubleclicked = (row: any) => {
    console.log("Row double clicked:", row);
  };

  // ── Metric Counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let notRaised = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    tabledata.forEach((item: any) => {
      const s = String(item.status ?? "").toLowerCase().trim();
      if (s === "0" || s === "not raise" || s === "not raised") notRaised++;
      else if (s === "1" || s === "pending" || s === "raised") pending++;
      else if (s === "2" || s === "approved") approved++;
      else if (s === "3" || s === "rejected") rejected++;
    });

    return {
      notRaised,
      pending,
      approved,
      rejected,
      all: tabledata.length,
    };
  }, [tabledata]);

  // ── Row Selectable Condition: ONLY Not Raised records have checkbox ────────
  const isRowSelectable = useCallback((row: any) => {
    if (!row) return false;
    const s = String(row.status ?? "").toLowerCase().trim();
    return s === "0" || s === "not raise" || s === "not raised";
  }, []);

  // ── Format Office Date Helper ──────────────────────────────────────────────
  const formatOfficeDate = (value: any) => {
    if (!value) return { formatted: "waiting", isFuture: false };
    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime())) return { formatted: String(value), isFuture: false };

    const currentDate = new Date();
    const futureDate = new Date(currentDate);
    futureDate.setDate(currentDate.getDate() + 10);

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = dateObj.toLocaleString("en-US", { month: "short" });
    const year = dateObj.getFullYear();
    const formatted = `${day} ${month} ${year}`;
    const isFuture = dateObj >= futureDate;

    return { formatted, isFuture };
  };

  // ── Table Columns ──────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "srno",
        width: 70,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE CODE",
        accessor: "Emp_Code",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "empName",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-[#4F46E5] dark:text-indigo-400">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "empDesignation",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 font-medium">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "OFFICE DATE",
        accessor: "DateOffice",
        Cell: ({ value }: any) => {
          const { formatted, isFuture } = formatOfficeDate(value);
          return (
            <div
              style={
                isFuture
                  ? { border: "2px solid #E11D48", padding: "2px 6px", borderRadius: "6px" }
                  : {}
              }
              className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium"
            >
              {formatted}
            </div>
          );
        },
      },
      {
        Header: "HOURS WORKED",
        accessor: "HoursWorked",
        Cell: ({ value }: any) => (
          <span className="tabular-nums font-medium text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "SHIFT",
        accessor: "ShiftStartTime",
        Cell: ({ row }: any) => {
          const start = row.original?.ShiftStartTime;
          const end = row.original?.ShiftEndTime;
          if (!start && !end) return <span className="text-slate-400">—</span>;
          return (
            <span className="tabular-nums font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {start || "--:--"} - {end || "--:--"}
            </span>
          );
        },
      },
      {
        Header: "CO TYPE",
        accessor: "coType",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "CO VALUE",
        accessor: "coValue",
        Cell: ({ value }: any) => (
          <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        Cell: ({ value }: any) => {
          const raw = String(value ?? "").toLowerCase().trim();

          if (raw === "2" || raw === "approved") {
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Approved
              </span>
            );
          }
          if (raw === "3" || raw === "rejected") {
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Rejected
              </span>
            );
          }
          if (raw === "1" || raw === "pending" || raw === "raised") {
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200/80 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Pending
              </span>
            );
          }
          if (raw === "0" || raw === "not raise" || raw === "not raised") {
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Not Raised
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200/80 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              {value || "Pending"}
            </span>
          );
        },
      },
      {
        Header: "LAPS DATE",
        accessor: "laps_date",
        Cell: ({ value }: any) => {
          const { formatted, isFuture } = formatOfficeDate(value);
          return (
            <div
              style={
                isFuture
                  ? { border: "2px solid #E11D48", padding: "2px 6px", borderRadius: "6px" }
                  : {}
              }
              className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium"
            >
              {formatted}
            </div>
          );
        },
      },
      {
        Header: "REMARK",
        accessor: "Remark",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 max-w-[200px] truncate block" title={value}>
            {value || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const statusOptions = [
    { value: 0, label: "Not raised" },
    { value: 1, label: "Pending" },
    { value: 2, label: "Approved" },
    { value: 3, label: "Rejected" },
    { value: "ALL", label: "All records" },
  ];

  const branchOptions = useMemo(() => {
    const list = Array.isArray(branchList)
      ? branchList.map((b: any) => ({
          value: String(b.value ?? b.loc_code ?? b.branch_code ?? b),
          label: String(b.label ?? b.loc_name ?? b.branch_name ?? b),
        }))
      : [];
    return [{ value: "ALL", label: "All branches" }, ...list];
  }, [branchList]);

  const showFooter =
    dates.status === 0 ||
    dates.status === "0" ||
    (dates.status === "ALL" && selectedrowdata.length > 0);

  return (
    <div className={`min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAFC] dark:bg-[#070D18] px-3 sm:px-5 lg:px-7 py-4 sm:py-5 text-slate-900 dark:text-slate-100 ${showFooter ? "pb-24" : "pb-6"}`}>
      <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-4">
        {/* ── 1. HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Comp off request
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Days worked on a week-off or holiday. Raise the comp off request from here and it goes to the approver.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <AButton
              type="button"
              variant="outline"
              onClick={() => setIsModalVisible1(true)}
              icon={<ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              className="!h-9 !px-3.5 !rounded-lg !border-slate-200 !text-slate-700 !text-sm !font-semibold hover:!bg-slate-50 dark:!border-slate-700 dark:!text-slate-200 dark:!bg-[#111827]"
            >
              Approver list
            </AButton>

            <AButton
              type="button"
              variant="outline"
              onClick={() => handleExcelDownload(columns, filtereddata)}
              loading={isExporting}
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              className="!h-9 !px-3.5 !rounded-lg !border-slate-200 !text-slate-700 !text-sm !font-semibold hover:!bg-slate-50 dark:!border-slate-700 dark:!text-slate-200 dark:!bg-[#111827]"
            >
              Export to Excel
            </AButton>
          </div>
        </div>

        {/* ── 2. STAT CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: NOT RAISED */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="NOT RAISED"
              count={counts.notRaised}
              variant="indigo"
              icon={<Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              isActive={dates.status === 0 || dates.status === "0"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick(0)}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>

          {/* Card 2: PENDING */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="PENDING"
              count={counts.pending}
              variant="amber"
              icon={<Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              isActive={dates.status === 1 || dates.status === "1"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick(1)}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>

          {/* Card 3: APPROVED */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="APPROVED"
              count={counts.approved}
              variant="emerald"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              isActive={dates.status === 2 || dates.status === "2"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick(2)}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>

          {/* Card 4: REJECTED */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="REJECTED"
              count={counts.rejected}
              variant="rose"
              icon={<XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              isActive={dates.status === 3 || dates.status === "3"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick(3)}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>

          {/* Card 5: ALL RECORDS */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="ALL RECORDS"
              count={counts.all}
              variant="indigo"
              icon={<Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              isActive={dates.status === "ALL"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick("ALL")}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>
        </div>

        {/* ── 3. FILTER BAR ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-1 min-[540px]:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <Einput
                title="DATE FROM"
                type="date"
                name="DATE_FROM"
                value={dates.DATE_FROM}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-3">
              <Einput
                title="DATE TO"
                type="date"
                name="DATE_TO"
                value={dates.DATE_TO}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-2">
              <Eselect
                title="STATUS"
                name="status"
                option={statusOptions}
                initialValue={dates.status}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-2">
              <Eselect
                title="BRANCH"
                name="branch"
                option={branchOptions}
                initialValue={dates.branch}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="min-[540px]:col-span-2 lg:col-span-2 flex items-center gap-2 pb-[1px]">
              <AButton
                type="button"
                variant="primary"
                onClick={showdata}
                loading={isClicked}
                className="!h-[36px] flex-1 !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !rounded-lg !font-semibold !text-[13px] shadow-sm whitespace-nowrap"
              >
                Show
              </AButton>
              <AButton
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="!h-[36px] !px-3.5 !rounded-lg !border-slate-200 hover:!bg-slate-50 text-slate-700 dark:!border-slate-700 dark:text-slate-300 dark:hover:!bg-slate-800 !font-semibold !text-[13px] whitespace-nowrap"
              >
                Reset
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 4. DATA TABLE ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
          <DataTable
            title={`Eligible working days  ${filtereddata.length} of ${tabledata.length} rows`}
            columns={columns}
            data={filtereddata}
            check={dates.status === 0 || dates.status === "0" || dates.status === "ALL"}
            isRowSelectable={isRowSelectable}
            selectValue="srno"
            selectedRows={selectedrowdata}
            setSelectedRows={setsellectedrowdata}
            onRowDoubleClick={doubleclicked}
            showExcelExport={false}
            showTopSearch={false}
            initialPageSize={25}
            footerTextMode="pageItems"
            containerClassName="border-0 shadow-none rounded-none"
          />
        </div>
      </div>

      {/* ── 5. FIXED BOTTOM ACTION FOOTER ───────────────────────────────────── */}
      {showFooter && (
        <footer className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] transition-[left] duration-150 ease-in-out">
          <span className="text-[12.5px] font-[600] tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100 min-w-[75px]">
            {selectedrowdata.length} selected
          </span>

          <input
            type="text"
            placeholder="Remark (required when rejecting)..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="flex-1 min-w-0 max-w-[540px] h-[38px] px-3.5 text-[12.5px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1524] text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-[#4F46E5] transition-all"
          />

          <div className="flex-1" />

          <AButton
            type="button"
            variant="outline"
            onClick={reject}
            disabled={isClicked}
            icon={<XCircle className="w-4 h-4 text-[#E11D48]" />}
            className="!h-[38px] !px-4 !rounded-xl !border-[rgba(225,29,72,0.4)] !bg-transparent hover:!bg-rose-50 text-[#E11D48] hover:text-[#BE123C] dark:hover:!bg-rose-950/30 !text-[12.5px] !font-semibold whitespace-nowrap cursor-pointer transition-all"
          >
            Reject
          </AButton>

          <AButton
            type="button"
            variant="primary"
            onClick={approver}
            disabled={isClicked}
            icon={<PlusCircle className="w-4 h-4 text-white" />}
            className={`!h-[38px] !px-5 !rounded-xl !text-white !text-[12.5px] !font-semibold whitespace-nowrap transition-all shadow-sm ${
              selectedrowdata.length > 0
                ? "!bg-[#4F46E5] hover:!bg-[#4338CA] cursor-pointer"
                : "!bg-[#475569] dark:!bg-[#334155] cursor-not-allowed opacity-90"
            }`}
          >
            Raise CO request
          </AButton>
        </footer>
      )}

      {/* ── 6. APPROVER LIST MODAL ─────────────────────────────────────────── */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827]">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
              Approver List
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Hierarchy of approvers configured for compensatory off requests.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[calc(85vh-90px)]">
            {apprData.length === 0 ? (
              <div className="text-center text-slate-500 py-10 text-sm">
                No Approver Found
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border border-slate-200 dark:border-slate-800 text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300">
                        <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 1A</th>
                        <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 1B</th>
                        <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 2A</th>
                        <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 2B</th>
                        <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 3A</th>
                        <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 3B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apprData.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver1_A || "—"}</td>
                          <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver1_B || "—"}</td>
                          <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver2_A || "—"}</td>
                          <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver2_B || "—"}</td>
                          <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver3_A || "—"}</td>
                          <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver3_B || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {apprData.map((item, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl bg-white dark:bg-slate-900 shadow-xs"
                    >
                      <div className="grid grid-cols-2 gap-y-2 text-[12.5px]">
                        <span className="font-semibold text-slate-500">Approver 1A:</span>
                        <span className="text-slate-800 dark:text-slate-200">{item.approver1_A || "—"}</span>
                        <span className="font-semibold text-slate-500">Approver 1B:</span>
                        <span className="text-slate-800 dark:text-slate-200">{item.approver1_B || "—"}</span>
                        <span className="font-semibold text-slate-500">Approver 2A:</span>
                        <span className="text-slate-800 dark:text-slate-200">{item.approver2_A || "—"}</span>
                        <span className="font-semibold text-slate-500">Approver 2B:</span>
                        <span className="text-slate-800 dark:text-slate-200">{item.approver2_B || "—"}</span>
                        <span className="font-semibold text-slate-500">Approver 3A:</span>
                        <span className="text-slate-800 dark:text-slate-200">{item.approver3_A || "—"}</span>
                        <span className="font-semibold text-slate-500">Approver 3B:</span>
                        <span className="text-slate-800 dark:text-slate-200">{item.approver3_B || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Loading Spinner */}
      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
