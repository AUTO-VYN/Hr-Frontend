"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Swal from "sweetalert2";
import {
  CheckCircle2,
  CircleX,
  Clock3,
  Layers3,
  ListChecks,
  FileSpreadsheet,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Ainput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ReactTable from "@/components/Templates/reacttable";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import useExcelDownload from "@/app/hooks/excel-download";
import HashloaderComponent from "@/components/Templates/hashloader";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FileViewer from "@/components/atoms/Fileviewer";
import { useToast } from "@/app/hooks/useToast";

type Approver2Props = {
  back?: () => void;
};

type MissPunchRow = {
  Utd?: number | string;
  EmpCode?: string;
  EmpName?: string;
  EmployeeDesignation?: string;
  Date?: string;
  In1?: string;
  Out1?: string;
  Actual_In?: string;
  Actual_Out?: string;
  Mipunch_Reason?: string;
  MI_Remark?: string;
  Spl_Remark?: string;
  spl_remark?: string;
  head_remark_by?: string;
  head_remark?: string;
  Mispunch_applied_on?: string;
  MAN_APPR?: string;
  Man_Rej?: string;
  status_khud_ka?: unknown;
  status?: number;
  [key: string]: any;
};

const STATUS_OPTIONS = [
  { value: "1", label: "Pending" },
  { value: "2", label: "Approved" },
  { value: "3", label: "Rejected" },
  { value: "0", label: "All Records" },
];

const STATUS_LABELS: Record<number, string> = {
  1: "Pending",
  2: "Approved",
  3: "Rejected",
};

const getCurrentDate = (monthsBack = 0) => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsBack);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateString?: string) => {
  if (!dateString || dateString === "null" || dateString === "—") return "—";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "" || value === "null") {
    return "—";
  }
  return String(value);
};

const getStatus = (row: MissPunchRow) => {
  const MAN_APPR = String(row.MAN_APPR || "").trim().toUpperCase();
  const Man_Rej = String(row.Man_Rej || "").trim().toUpperCase();
  const statusValue = String(row.status_khud_ka ?? "").trim();
  const stat = String(row.stat ?? "").trim();
  const attendanceStatus = String(row.AtnStatus || "").trim().toUpperCase();

  let status = 1;

  if (
    Man_Rej === "Y" ||
    statusValue === "0" ||
    stat === "0" ||
    stat.toUpperCase() === "R" ||
    attendanceStatus.includes("REJECT")
  ) {
    status = 3;
  } else if (
    MAN_APPR === "Y" ||
    statusValue === "1" ||
    stat === "4" ||
    attendanceStatus.includes("APPROV")
  ) {
    status = 2;
  } else if (MAN_APPR === "N" && Man_Rej === "N" && row.status_khud_ka != null) {
    // Preserves the status mapping used by the supplied reference component.
    status = 2;
  }

  return status;
};

const getBranchValue = (row: MissPunchRow) => {
  return (
    row.BranchName ??
    row.branch_name ??
    row.Branch ??
    row.branch ??
    row.Branch_Name ??
    ""
  );
};

const statusBadge = (status: number) => {
  const styles: Record<number, string> = {
    1: "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
    2: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400",
    3: "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400",
  };

  const dotStyles: Record<number, string> = {
    1: "bg-yellow-500",
    2: "bg-emerald-500",
    3: "bg-rose-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
        styles[status] || styles[1]
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${dotStyles[status] || dotStyles[1]}`} />
      {STATUS_LABELS[status] || "Pending"}
    </span>
  );
};

const Approver2 = ({ back }: Approver2Props) => {
  const user = useCurrentUser();
  const { toast } = useToast();
  const globalDateRange = useDateRange();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  const [tabledata, setTabledata] = useState<MissPunchRow[]>([]);
  const [filtereddata, setFiltereddata] = useState<MissPunchRow[]>([]);
  const [selectedrowdata, setSelectedrowdata] = useState<any[]>([]);
  const [remark, setRemark] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApproverListOpen, setIsApproverListOpen] = useState(false);

  const [missPunchData, setMissPunchData] = useState<MissPunchRow>({});
  const [apprData, setApprData] = useState<any[]>([]);

  const [dates, setDates] = useState({
    DATE_FROM: globalDateRange.DATE_FROM || getCurrentDate(),
    DATE_TO: globalDateRange.DATE_TO || getCurrentDate(),
    branch: "ALL",
    status: "1",
  });

  const [check] = useState(true);

  const getFilteredRows = useCallback(
    (rows: MissPunchRow[], statusValue = dates.status, branchValue = dates.branch) => {
      let result = Array.isArray(rows) ? rows : [];

      if (statusValue !== "0") {
        result = result.filter((item) => Number(item.status) === Number(statusValue));
      }

      if (branchValue !== "ALL") {
        result = result.filter(
          (item) => String(getBranchValue(item)) === String(branchValue)
        );
      }

      return result;
    },
    [dates.status, dates.branch]
  );

  const branchOptions = useMemo(() => {
    const branches = Array.from(
      new Set(
        tabledata
          .map((row) => String(getBranchValue(row) || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: "ALL", label: "All branches" },
      ...branches.map((branch) => ({ value: branch, label: branch })),
    ];
  }, [tabledata]);

  const summary = useMemo(() => {
    const all = tabledata.length;
    const pending = tabledata.filter((row) => Number(row.status) === 1).length;
    const approved = tabledata.filter((row) => Number(row.status) === 2).length;
    const rejected = tabledata.filter((row) => Number(row.status) === 3).length;

    return { pending, approved, rejected, all };
  }, [tabledata]);

  const showDataOfApproval = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: "misspunch",
            isPayroll: 1,
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        }
      );

      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  const fetchGetDateRange = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/ars/getDateRange`,
        {
          headers: { compcode: user?.Comp_Code },
        }
      );

      const { DATE_FROM, DATE_TO } = response.data?.result || {};

      if (DATE_FROM && DATE_TO) {
        setDates((previous) => ({
          ...previous,
          DATE_FROM,
          DATE_TO,
        }));
      } else {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setDates((previous) => ({
          ...previous,
          DATE_FROM: firstDay.toISOString().split("T")[0],
          DATE_TO: lastDay.toISOString().split("T")[0],
        }));
      }
    } catch (error) {
      console.error("Date range API failed:", error);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setDates((previous) => ({
        ...previous,
        DATE_FROM: firstDay.toISOString().split("T")[0],
        DATE_TO: lastDay.toISOString().split("T")[0],
      }));
    }
  }, [user?.Comp_Code]);

  const showdata = useCallback(async () => {
    if (!dates.DATE_FROM || !dates.DATE_TO) {
      toast({
        title: "Please select date from and date to",
        variant: "destructive",
      });
      return;
    }

    if (new Date(dates.DATE_FROM) > new Date(dates.DATE_TO)) {
      toast({
        title: "Date From cannot be greater than Date To",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setFiltereddata([]);
    setTabledata([]);
    setSelectedrowdata([]);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getMispunch_Employee_new`,
        {
          params: {
            Appr_Code: user?.EMPCODE,
            StartDate: dates.DATE_FROM,
            EndDate: dates.DATE_TO,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const resultRows = Array.isArray(response.data?.Result)
        ? response.data.Result
        : [];

      const dataWithSrNo = resultRows.map((row: MissPunchRow, index: number) => ({
        ...row,
        srno: index + 1,
        status: getStatus(row),
      }));

      setTabledata(dataWithSrNo);
      setFiltereddata(
        getFilteredRows(dataWithSrNo, dates.status, dates.branch)
      );
    } catch (error: any) {
      console.error("Error fetching miss-punch records:", error);
      toast({
        title:
          error?.response?.data?.Message ||
          "Unable to fetch miss-punch records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    dates.DATE_FROM,
    dates.DATE_TO,
    dates.status,
    dates.branch,
    user?.EMPCODE,
    user?.Comp_Code,
    user?.name,
    getFilteredRows,
    toast,
  ]);

  useEffect(() => {
    showDataOfApproval();
    fetchGetDateRange();
  }, [showDataOfApproval, fetchGetDateRange]);

  useEffect(() => {
    showdata();
  }, [dates.status]); // Retains reference behaviour: reload when status changes.

  const handleDateChange = (name: string, value: any) => {
    setDates((previous) => ({ ...previous, [name]: value }));

    if (name === "status" || name === "branch") {
      const nextStatus = name === "status" ? String(value ?? "1") : dates.status;
      const nextBranch = name === "branch" ? String(value ?? "ALL") : dates.branch;
      setFiltereddata(getFilteredRows(tabledata, nextStatus, nextBranch));
    }
  };

  const handleRemark = (_name: string, value: any) => {
    setRemark(value);
  };

  const handleRowDoubleClick = (rowData: MissPunchRow) => {
    setMissPunchData(rowData);
    setSelectedrowdata([{ rowData }]);
    setIsDialogOpen(true);
  };

  const validateAction = () => {
    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark required",
        text: "Please enter a remark before proceeding.",
        confirmButtonColor: "#4338CA",
      });
      return false;
    }

    if (!selectedrowdata || selectedrowdata.length === 0) {
      toast({
        title: "Please select at least one row.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processApproval = async (approve: boolean) => {
    if (!validateAction()) return;

    setIsLoading(true);

    try {
      const utd = selectedrowdata
        .map((item) => item.rowData?.Utd)
        .filter((value) => value !== undefined && value !== null && value !== "")
        .join(",");

      const empCodes = selectedrowdata
        .map((item) => String(item.rowData?.EmpCode ?? "").trim())
        .filter(Boolean)
        .join(",");

      if (!utd || !empCodes) {
        toast({
          title: "Selected employee information is incomplete.",
          variant: "destructive",
        });
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveAttendance_New`,
        {
          params: {
            EMPCODE: empCodes,
            Appr_Code: user?.EMPCODE,
            ApproveOrRej: approve ? "1" : "0",
            Utd: utd,
            Remark: remark,
            module: "misspunch",
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const isSuccess =
        response.data?.status === true || response.data?.Status === true;

      if (isSuccess) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text:
            response.data?.Message ||
            `${selectedrowdata.length} record(s) ${
              approve ? "approved" : "rejected"
            } successfully`,
          confirmButtonColor: "#4338CA",
        });

        setSelectedrowdata([]);
        setRemark(null);
        setIsDialogOpen(false);
        await showdata();
      } else {
        Swal.fire({
          icon: "error",
          title: approve ? "Approval failed" : "Rejection failed",
          text:
            response.data?.Message ||
            `${approve ? "Approval" : "Rejection"} failed`,
          confirmButtonColor: "#4338CA",
        });
      }
    } catch (error: any) {
      console.error(approve ? "Approval failed:" : "Rejection failed:", error);
      Swal.fire({
        icon: "error",
        title: approve ? "Approval failed" : "Rejection failed",
        text:
          error?.response?.data?.Message ||
          `${approve ? "Approval" : "Rejection"} failed`,
        confirmButtonColor: "#4338CA",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const approver = () => processApproval(true);
  const reject = () => processApproval(false);

  const columns = useMemo(
    () => [
      {
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: any) => statusBadge(Number(row.original.status)),
      },
      {
        Header: "Sr No",
        accessor: "Utd",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Request Date",
        accessor: "Date",
        Cell: ({ value }: any) => formatDisplayDate(value),
      },
      {
        Header: "Employee",
        accessor: "EmpName",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {displayValue(value)}
          </span>
        ),
      },
      {
        Header: "Designation",
        accessor: "EmployeeDesignation",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Emp Code",
        accessor: "EmpCode",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "In Time",
        accessor: "In1",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Out Time",
        accessor: "Out1",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Actual In",
        accessor: "Actual_In",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Actual Out",
        accessor: "Actual_Out",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Reason",
        accessor: "Mipunch_Reason",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Remark",
        accessor: "MI_Remark",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Special Remark",
        accessor: "Spl_Remark",
        Cell: ({ row }: any) =>
          displayValue(row.original.Spl_Remark ?? row.original.spl_remark),
      },
      {
        Header: "Head Name",
        accessor: "head_remark_by",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Head Remark",
        accessor: "head_remark",
        Cell: ({ value }: any) => displayValue(value),
      },
      {
        Header: "Applied On",
        accessor: "Mispunch_applied_on",
        Cell: ({ value }: any) => formatDisplayDate(value),
      },
    ],
    []
  );

  const handleBack = () => {
    if (back) {
      back();
    } else {
      window.history.back();
    }
  };

  const handleExportExcel = () => {
    const downloadColumns = columns.filter(
      (column: any) => column && column.showInExcel !== false
    );
    handleExcelDownload(downloadColumns, filtereddata);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] pb-28 text-slate-900 dark:bg-[#070D18] dark:text-slate-100">
      <div className="mx-auto w-full max-w-[1800px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">
              Mis-punch approver grid
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Regularisation requests with the actual punch alongside the corrected time, so you can see the gap.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AButton
              type="button"
              variant="outline"
              size="lg"
              icon={<FileSpreadsheet className="h-5 w-5" />}
              loading={isExcelLoading}
              onClick={handleExportExcel}
            >
              Export to Excel
            </AButton>
            <AButton
              type="button"
              variant="outline"
              size="lg"
              icon={<ListChecks className="h-5 w-5" />}
              onClick={() => setIsApproverListOpen(true)}
              aria-label="View approver list"
            >
              Approvers
            </AButton>
            <AButton
              type="button"
              variant="outline"
              size="lg"
              onClick={handleBack}
            >
              Back
            </AButton>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Pending"
            count={summary.pending}
            icon={<Clock3 className="h-5 w-5" />}
            tone="amber"
            active={dates.status === "1"}
          />
          <SummaryCard
            label="Approved"
            count={summary.approved}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="emerald"
            active={dates.status === "2"}
          />
          <SummaryCard
            label="Rejected"
            count={summary.rejected}
            icon={<CircleX className="h-5 w-5" />}
            tone="rose"
            active={dates.status === "3"}
          />
          <SummaryCard
            label="All Records"
            count={summary.all}
            icon={<Layers3 className="h-5 w-5" />}
            tone="indigo"
            active={dates.status === "0"}
          />
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0B1220] sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_1.1fr_auto_auto]">
            <Ainput
              title="Date From"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              ShortName
            />
            <Ainput
              title="Date To"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              ShortName
            />
            <Eselect
              title="Status"
              name="status"
              option={STATUS_OPTIONS}
              initialValue={dates.status}
              handleInputChange={handleDateChange}
              placeholder="Select status"
              ShortName
            />
            <Eselect
              title="Branch"
              name="branch"
              option={branchOptions}
              initialValue={dates.branch}
              handleInputChange={handleDateChange}
              placeholder="All branches"
              ShortName
            />
            <AButton
              type="button"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto sm:min-w-[112px]"
              loading={isLoading}
              onClick={showdata}
            >
              Show
            </AButton>
            <AButton
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              disabled={isLoading}
              onClick={() => {
                const resetDates = {
                  DATE_FROM: globalDateRange.DATE_FROM || getCurrentDate(),
                  DATE_TO: globalDateRange.DATE_TO || getCurrentDate(),
                  branch: "ALL",
                  status: "1",
                };
                setDates(resetDates);
                setRemark(null);
                setSelectedrowdata([]);
                setFiltereddata(getFilteredRows(tabledata, "1", "ALL"));
              }}
            >
              Reset
            </AButton>
          </div>
        </section>

        {/* Requests table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0B1220]">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Mis-punch requests
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filtereddata.length} of {tabledata.length} rows
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Rows</span>
              <span className="flex h-10 min-w-16 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                25
              </span>
            </div>
          </div>

          <ReactTable
            title=""
            columns={columns}
            data={filtereddata}
            check={check}
            selectValue="srno"
            setsellectedrowdata={setSelectedrowdata}
            height="430px"
            onRowDoubleClick={handleRowDoubleClick}
            showExcelExport={false}
            showPageSizeInFooter={true}
            footerTextMode="pageItems"
            containerClassName="w-full"
          />
        </section>
      </div>

      {/* Fixed bulk action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur transition-[left] duration-150 ease-in-out dark:border-slate-800 dark:bg-[#0B1220]/95 sm:left-[var(--sidebar-width,68px)] sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>{selectedrowdata.length} selected</span>
          </div>

          <div className="w-full sm:max-w-[465px]">
            <input
              type="text"
              value={remark || ""}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Remark (required when rejecting)..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950/40"
            />
          </div>

          <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AButton
              type="button"
              variant="danger"
              size="lg"
              className="border border-rose-300 bg-white !text-rose-600 hover:!bg-rose-50 dark:border-rose-900 dark:bg-transparent dark:!text-rose-400 dark:hover:!bg-rose-950/30"
              icon={<CircleX className="h-5 w-5" />}
              disabled={isLoading || selectedrowdata.length === 0}
              loading={isLoading}
              onClick={reject}
            >
              Reject
            </AButton>
            <AButton
              type="button"
              variant="secondary"
              size="lg"
              className="min-w-[210px]"
              icon={<CheckCircle2 className="h-5 w-5" />}
              disabled={isLoading || selectedrowdata.length === 0}
              loading={isLoading}
              onClick={approver}
            >
              Approve requests
            </AButton>
          </div>
        </div>
      </div>

      {/* Employee details dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-24px)] max-w-5xl overflow-y-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-2">
              {statusBadge(Number(missPunchData.status || 1))}
            </div>
            <DialogTitle>Miss-punch request details</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                <DetailItem label="Date" value={formatDisplayDate(missPunchData.Date)} />
                <DetailItem label="Employee Code" value={missPunchData.EmpCode} />
                <DetailItem label="Employee Name" value={missPunchData.EmpName} />
                <DetailItem label="Designation" value={missPunchData.EmployeeDesignation} />
                <DetailItem label="In Time" value={missPunchData.In1} />
                <DetailItem label="Out Time" value={missPunchData.Out1} />
                <DetailItem label="Actual In" value={missPunchData.Actual_In} />
                <DetailItem label="Actual Out" value={missPunchData.Actual_Out} />
                <DetailItem label="Miss-punch Reason" value={missPunchData.Mipunch_Reason} />
                <DetailItem label="Miss-punch Remark" value={missPunchData.MI_Remark} />
                <DetailItem label="Head Remark By" value={missPunchData.head_remark_by} />
                <DetailItem label="Head Remark" value={missPunchData.head_remark} />
                <DetailItem
                  label="Special Remark"
                  value={missPunchData.Spl_Remark ?? missPunchData.spl_remark}
                />

                <div className="col-span-1 flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span className="font-semibold">In Punch Image</span>
                  {missPunchData.fileIn ? (
                    <>
                      <Image
                        src={missPunchData.fileIn}
                        alt="In punch attachment"
                        width={180}
                        height={100}
                        unoptimized
                        className="max-h-36 w-fit rounded-lg object-contain"
                      />
                      <FileViewer
                        fileLink={missPunchData.fileIn}
                        celldata={missPunchData.fileIn}
                      />
                    </>
                  ) : (
                    <span className="text-slate-400">No image available</span>
                  )}
                </div>

                <div className="col-span-1 flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span className="font-semibold">Out Punch Image</span>
                  {missPunchData.fileOut ? (
                    <>
                      <Image
                        src={missPunchData.fileOut}
                        alt="Out punch attachment"
                        width={180}
                        height={100}
                        unoptimized
                        className="max-h-36 w-fit rounded-lg object-contain"
                      />
                      <FileViewer fileLink={missPunchData.fileOut} />
                    </>
                  ) : (
                    <span className="text-slate-400">No image available</span>
                  )}
                </div>

                {!missPunchData.status_khud_ka && (
                  <div className="col-span-1 space-y-3 pt-2 sm:col-span-2">
                    <Ainput
                      type="text"
                      title="Remark"
                      name="remark"
                      value={remark}
                      handleInputChange={handleRemark}
                      placeholder="Enter remark"
                    />
                    <div className="flex flex-wrap gap-2">
                      <AButton
                        type="button"
                        variant="primary"
                        disabled={isLoading}
                        loading={isLoading}
                        onClick={approver}
                      >
                        Approve
                      </AButton>
                      <AButton
                        type="button"
                        variant="danger"
                        disabled={isLoading}
                        onClick={reject}
                      >
                        Reject
                      </AButton>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Approver list dialog */}
      <Dialog open={isApproverListOpen} onOpenChange={setIsApproverListOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-24px)] max-w-4xl overflow-y-auto rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle>Approver List</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-4">
                {apprData.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    No Approver Found
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-left dark:bg-slate-800">
                            {["Approver 1A", "Approver 1B", "Approver 2A", "Approver 2B", "Approver 3A", "Approver 3B"].map(
                              (heading) => (
                                <th key={heading} className="border border-slate-200 p-3 dark:border-slate-700">
                                  {heading}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {apprData.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                              <ApproverCell value={item.approver1_A} />
                              <ApproverCell value={item.approver1_B} />
                              <ApproverCell value={item.approver2_A} />
                              <ApproverCell value={item.approver2_B} />
                              <ApproverCell value={item.approver3_A} />
                              <ApproverCell value={item.approver3_B} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 md:hidden">
                      {apprData.map((item, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                          <ApproverMobileItem label="Approver 1A" value={item.approver1_A} />
                          <ApproverMobileItem label="Approver 1B" value={item.approver1_B} />
                          <ApproverMobileItem label="Approver 2A" value={item.approver2_A} />
                          <ApproverMobileItem label="Approver 2B" value={item.approver2_B} />
                          <ApproverMobileItem label="Approver 3A" value={item.approver3_A} />
                          <ApproverMobileItem label="Approver 3B" value={item.approver3_B} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
};

type SummaryCardProps = {
  label: string;
  count: number;
  icon: React.ReactNode;
  tone: "amber" | "emerald" | "rose" | "indigo";
  active?: boolean;
};

const SummaryCard = ({ label, count, icon, tone, active }: SummaryCardProps) => {
  const tones = {
    amber: {
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
      border: "border-amber-300 dark:border-amber-800",
    },
    emerald: {
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
      border: "border-emerald-300 dark:border-emerald-800",
    },
    rose: {
      icon: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
      border: "border-rose-300 dark:border-rose-800",
    },
    indigo: {
      icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
      border: "border-indigo-300 dark:border-indigo-800",
    },
  };

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors dark:bg-[#0B1220] ${
        active ? tones[tone].border : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone].icon}`}>
          {icon}
        </span>
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold leading-none text-slate-900 dark:text-white">
        {count}
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string; value: unknown }) => (
  <div className="grid grid-cols-[minmax(110px,1fr)_auto_minmax(0,2fr)] gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span>:</span>
    <span className="break-words font-medium text-slate-800 dark:text-slate-100">
      {displayValue(value)}
    </span>
  </div>
);

const ApproverCell = ({ value }: { value: unknown }) => (
  <td className="border border-slate-200 p-3 capitalize dark:border-slate-700">
    {displayValue(value)}
  </td>
);

const ApproverMobileItem = ({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) => (
  <>
    <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
    <span className="break-words text-slate-800 dark:text-slate-100">
      {displayValue(value)}
    </span>
  </>
);

export default Approver2;
