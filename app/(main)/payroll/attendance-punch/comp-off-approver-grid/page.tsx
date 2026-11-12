"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  ListChecks,
  FileSpreadsheet,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useToast } from "@/app/hooks/useToast";
import { useDateRange } from "@/app/hooks/use-date-range";
import useExcelDownload from "@/app/hooks/excel-download";

// Required components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";

// Auxiliary components
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";

const TINT = {
  Approved: "#10B981",
  Pending: "#F59E0B",
  Rejected: "#E11D48",
};

export default function CompOffApproverGridPage() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const dateRangeResult = useDateRange();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // Helper date function
  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // State
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtereddata, setFiltereddata] = useState<any[]>([]);
  const [selectedrowdata, setsellectedrowdata] = useState<any[]>([]);
  const [remark, setRemark] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);
  const [check, setCheck] = useState(true);

  // Approver modal state
  const [isModalVisible1, setIsModalVisible1] = useState(false);
  const [apprData, setApprData] = useState<any[]>([]);

  // Filter dates & status state
  const [dates, setDates] = useState({
    DATE_FROM: dateRangeResult?.DATE_FROM || getCurrentDate(1),
    DATE_TO: dateRangeResult?.DATE_TO || getCurrentDate(0),
    branch: user?.branch || "",
    status: 1, // 1: Pending, 2: Approved, 3: Rejected, 0: All
  });

  const StatusOptionsList = useMemo(
    () => [
      { value: 1, label: "Pending" },
      { value: 2, label: "Approved" },
      { value: 3, label: "Rejected" },
      { value: 0, label: "All" },
    ],
    []
  );

  const branchOptions = useMemo(() => {
    const opts = [{ value: "", label: "All branches" }];
    if (user?.branch) {
      opts.push({ value: String(user.branch), label: String(user.branch) });
    }
    return opts;
  }, [user?.branch]);

  // Original filter logic
  function filterByStatus(data: any[], status: number | string) {
    return data.filter((item) => {
      if (status === 0 || status === "0") return true;

      // PENDING
      if (status === 1 || status === "1") {
        return (
          item.status == 1 &&
          (item.status_khud_ka === null || item.status_khud_ka === undefined)
        );
      }
      // APPROVED
      if (status === 2 || status === "2") {
        return (
          (item.status == 2 || item.status == 1) &&
          item.status_khud_ka !== null &&
          item.status_khud_ka !== undefined
        );
      }
      // REJECT
      if (status === 3 || status === "3") {
        return item.status == 3;
      }
      return false;
    });
  }

  // Counts for Metric Cards
  const stats = useMemo(() => {
    const pending = filterByStatus(tabledata, 1).length;
    const approved = filterByStatus(tabledata, 2).length;
    const rejected = filterByStatus(tabledata, 3).length;
    const all = tabledata.length;
    return { pending, approved, rejected, all };
  }, [tabledata]);

  // Fetch Approver Hierarchy List
  const showDataOFAPPRVL = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user.EMPCODE,
            module: "compoff",
          },
          headers: {
            compcode: user.Comp_Code,
          },
        }
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  // Fetch Main Comp Off Grid Data
  const showdata = async () => {
    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);

    if (!dates.status && dates.status !== 0) {
      toast({
        title: "Please Select Status",
        variant: "destructive",
      });
      return;
    }

    setIsClicked(true);
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getCompOffApprData`,
        {
          params: {
            EMPCODE: user?.EMPCODE,
            dateFrom: dates.DATE_FROM,
            dateTo: dates.DATE_TO,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const rawData = result.data?.Result || [];
      const dataWithSrNo = rawData.map((row: any, i: number) => ({
        ...row,
        srno: i + 1,
        UTD: row.UTD ?? row.utd ?? row.id ?? i + 1,
      }));

      setTabledata(dataWithSrNo);
      setFiltereddata(filterByStatus(dataWithSrNo, dates.status));
    } catch (err: any) {
      console.error(err);
      toast({
        title: err?.response?.data?.Message || "Error fetching data",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  };

  // Initial load
  const isInitialLoadedRef = useRef(false);
  useEffect(() => {
    if (user?.Comp_Code && !isInitialLoadedRef.current) {
      isInitialLoadedRef.current = true;
      showDataOFAPPRVL();
      showdata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  // Handle Input Changes
  const handleDateChange = (name: string, value: any) => {
    if (name === "status") {
      const nextStatus = Number(value);
      setDates((prev) => ({ ...prev, status: nextStatus }));
      setFiltereddata(filterByStatus(tabledata, nextStatus));
      setsellectedrowdata([]);
      return;
    }
    setDates((prev) => ({ ...prev, [name]: value }));
  };

  // Status Card Click Filter
  const handleStatusFilter = (statusVal: number) => {
    setDates((prev) => ({ ...prev, status: statusVal }));
    setFiltereddata(filterByStatus(tabledata, statusVal));
    setsellectedrowdata([]);
  };

  // Reset Filters
  const handleResetFilters = () => {
    const defaultFrom = dateRangeResult?.DATE_FROM || getCurrentDate(1);
    const defaultTo = dateRangeResult?.DATE_TO || getCurrentDate(0);
    setDates({
      DATE_FROM: defaultFrom,
      DATE_TO: defaultTo,
      branch: user?.branch || "",
      status: 1,
    });
    setFiltereddata(filterByStatus(tabledata, 1));
    setsellectedrowdata([]);
    setRemark("");
  };

  // Double click handler
  const doubleclicked = (row: any) => {
    console.log("Double clicked row:", row);
  };

  // Approve Logic
  const approver = async () => {
    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Without remark you cannot approve this comp off request. Please enter a remark.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Selection Required",
        text: "Please select at least one row.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action is irreversible and cannot be undone. Do you want to proceed?",
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
    });

    if (!confirmed.isConfirmed) return;

    setCheck(true);
    setIsClicked(true);
    let successCount = 0;
    const failMessages: string[] = [];

    for (const item of selectedrowdata) {
      const selectedRowData = item?.rowData || item;
      if (!selectedRowData) continue;
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveCompOffReqByAppr`,
          {
            EMPCODE: selectedRowData.Emp_Code,
            ApprCode: user?.EMPCODE,
            date: selectedRowData.DateOffice,
            rem: remark,
            UTD: selectedRowData.UTD,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (result.data.Status === true || result.data.status === true) {
          successCount++;
        } else {
          failMessages.push(`${selectedRowData.Emp_Code}: ${result.data.Message}`);
        }
      } catch (err: any) {
        failMessages.push(
          `${selectedRowData.Emp_Code}: ${err.response?.data?.Message || "Failed"}`
        );
      }
    }

    if (successCount > 0) {
      await Swal.fire({
        icon: "success",
        title: "Approved Successfully",
        text: `${successCount} comp off request approved successfully.`,
        confirmButtonColor: "#4F46E5",
      });
    }
    if (failMessages.length > 0) {
      toast({
        title: `${failMessages.length} failed: ${failMessages.join(", ")}`,
        variant: "destructive",
      });
    }

    setsellectedrowdata([]);
    setCheck(false);
    setRemark("");
    setIsClicked(false);
    await showdata();
  };

  // Reject Logic
  const reject = async () => {
    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Without remark you cannot reject this comp off request. Please enter a remark.",
        confirmButtonColor: "#E11D48",
      });
      return;
    }
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Selection Required",
        text: "Please select at least one row.",
        confirmButtonColor: "#E11D48",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action is irreversible and cannot be undone. Do you want to proceed?",
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#E11D48",
    });

    if (!confirmed.isConfirmed) return;

    setIsClicked(true);
    let successCount = 0;
    const failMessages: string[] = [];

    for (const item of selectedrowdata) {
      const selectedRowData = item?.rowData || item;
      if (!selectedRowData) continue;
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/RejectCompOffReqByAppr`,
          {
            EMPCODE: selectedRowData.Emp_Code,
            ApprCode: user?.EMPCODE,
            date: selectedRowData.DateOffice,
            rem: remark,
            UTD: selectedRowData.UTD,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (result.data.Status === true || result.data.status === true) {
          successCount++;
        } else {
          failMessages.push(`${selectedRowData.Emp_Code}: ${result.data.Message}`);
        }
      } catch (err: any) {
        failMessages.push(
          `${selectedRowData.Emp_Code}: ${err.response?.data?.Message || "Failed"}`
        );
      }
    }

    if (successCount > 0) {
      await Swal.fire({
        icon: "success",
        title: "Rejected Successfully",
        text: `${successCount} comp off request rejected successfully.`,
        confirmButtonColor: "#E11D48",
      });
    }
    if (failMessages.length > 0) {
      toast({
        title: `${failMessages.length} failed: ${failMessages.join(", ")}`,
        variant: "destructive",
      });
    }

    setsellectedrowdata([]);
    setCheck(false);
    setRemark("");
    setIsClicked(false);
    await showdata();
  };

  // Table Columns (Exact columns as in the old code & design prototype)
  const columns1 = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "srno",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE CODE",
        accessor: "Emp_Code",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "empName",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "empDesignation",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DATE",
        accessor: "DateOffice",
        Cell: ({ value }: any) => {
          if (!value) return <span className="text-[#64748B] dark:text-[#94A3B8]">waiting</span>;
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) return "";
          const currentDate = new Date();
          const futureDate = new Date(currentDate);
          futureDate.setDate(currentDate.getDate() + 10);

          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = dateObj.toLocaleString("en-US", { month: "short" });
          const year = dateObj.getFullYear();
          const formattedDate = `${day} ${month} ${year}`;
          const isFutureDate = dateObj >= futureDate;
          const cellStyle = isFutureDate
            ? { border: "2px solid red", padding: "2px 6px", borderRadius: "4px" }
            : {};
          return (
            <div
              style={cellStyle}
              className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap tabular-nums"
            >
              {formattedDate}
            </div>
          );
        },
      },
      {
        Header: "HOURS WORK",
        accessor: "HoursWorked",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK",
        accessor: "Remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "APPROVE BY",
        accessor: "txtApprBy",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "CO VALUE",
        accessor: "coValue",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "CO TYPE",
        accessor: "coType",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] capitalize">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        Cell: ({ value }: any) => {
          const s = Number(value);
          const isAppr = s === 2;
          const isRej = s === 3;
          const label = isAppr ? "Approved" : isRej ? "Rejected" : "Pending";
          const tint = isAppr ? TINT.Approved : isRej ? TINT.Rejected : TINT.Pending;

          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: tint,
                backgroundColor: `${tint}14`,
                border: `1px solid ${tint}55`,
                padding: "4px 8px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: tint,
                  flex: "0 0 auto",
                }}
              />
              {label}
            </span>
          );
        },
      },
    ],
    []
  );

  // Export to Excel handler
  const handleExportExcel = () => {
    handleExcelDownload(columns1, filtereddata);
  };

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-[22px_24px_96px_24px]"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        fontFeatureSettings: "'tnum' 1",
      }}
    >
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[20px] mb-[18px]">
        <div>
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Comp off approver grid
          </h1>
          <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Approve the comp off and the credit lands in the employee&apos;s leave balance the same day.
          </p>
        </div>
        <div className="flex items-center gap-[8px] self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalVisible1(true)}
            icon={<ListChecks className="w-[14px] h-[14px] text-[#64748B] dark:text-[#94A3B8]" />}
            className="!rounded-[10px] !h-[35px] !px-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !font-[550] whitespace-nowrap cursor-pointer transition-all"
          >
            Approver list
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExcelLoading || filtereddata.length === 0}
            icon={<FileSpreadsheet className="w-[14px] h-[14px] text-[#64748B] dark:text-[#94A3B8]" />}
            className="!rounded-[10px] !h-[35px] !px-[13px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !font-[550] whitespace-nowrap cursor-pointer transition-all"
          >
            {isExcelLoading ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </div>

      {/* 4 KPI / StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[14px]">
        {/* PENDING CARD */}
        <StatCard
          title="PENDING"
          count={stats.pending}
          icon={<Clock className="w-[14px] h-[14px] text-[#F59E0B]" />}
          isActive={dates.status === 1}
          onClick={() => handleStatusFilter(1)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#F59E0B1F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-white"
        />

        {/* APPROVED CARD */}
        <StatCard
          title="APPROVED"
          count={stats.approved}
          icon={<CheckCircle2 className="w-[14px] h-[14px] text-[#10B981]" />}
          isActive={dates.status === 2}
          onClick={() => handleStatusFilter(2)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#10B9811F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-white"
        />

        {/* REJECTED CARD */}
        <StatCard
          title="REJECTED"
          count={stats.rejected}
          icon={<XCircle className="w-[14px] h-[14px] text-[#E11D48]" />}
          isActive={dates.status === 3}
          onClick={() => handleStatusFilter(3)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#E11D481F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-white"
        />

        {/* ALL RECORDS CARD */}
        <StatCard
          title="ALL RECORDS"
          count={stats.all}
          icon={<Layers className="w-[14px] h-[14px] text-[#4F46E5]" />}
          isActive={dates.status === 0}
          onClick={() => handleStatusFilter(0)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#4F46E51F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-white"
        />
      </div>

      {/* Filter Section Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[14px_18px_16px_18px] mb-[14px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[175px_175px_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-[12px] items-end">
          {/* DATE FROM */}
          <div className="w-full">
            <Einput
              title="Date from"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-[5px] block"
            />
          </div>

          {/* DATE TO */}
          <div className="w-full">
            <Einput
              title="Date to"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-[5px] block"
            />
          </div>

          {/* STATUS */}
          <div className="w-full min-w-0">
            <Eselect
              title="Status"
              name="status"
              option={StatusOptionsList}
              initialValue={dates.status}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-[5px] block"
            />
          </div>

          {/* BRANCH */}
          <div className="w-full min-w-0">
            <Eselect
              title="Branch"
              name="branch"
              option={branchOptions}
              initialValue={dates.branch}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-[5px] block"
            />
          </div>

          {/* SHOW BUTTON */}
          <div className="shrink-0">
            <Button
              variant="primary"
              onClick={showdata}
              disabled={isClicked}
              className="!h-[38px] !rounded-[9px] !border-transparent !bg-[#4F46E5] hover:!brightness-[1.08] !text-white !font-[600] !text-[12.5px] !px-[20px] whitespace-nowrap cursor-pointer transition-all shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)]"
            >
              Show
            </Button>
          </div>

          {/* RESET BUTTON */}
          <div className="shrink-0">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#64748B] hover:!text-[#1E293B] dark:!text-[#94A3B8] dark:hover:!text-[#E7ECF3] !font-[550] !text-[12.5px] !px-[14px] whitespace-nowrap cursor-pointer transition-all"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table with ServiceTablePagination */}
      <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden mb-16">
        <div className="flex items-center gap-[10px] px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
          <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            Comp off requests
          </h2>
          <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {filtereddata.length} of {tabledata.length} rows
          </span>
          <div className="flex-1" />
        </div>
        <ServiceTablePagination
          columns={columns1}
          data={filtereddata}
          check={Number(dates.status) === 1}
          selectValue="srno"
          selectedRows={selectedrowdata}
          setSelectedRows={setsellectedrowdata}
          onRowDoubleClick={doubleclicked}
          height={430}
          showExcelExport={false}
          footerTextMode="pageItems"
          initialPageSize={25}
          showPageSizeInFooter={true}
          containerClassName="!border-none !shadow-none !rounded-none !bg-transparent"
          headerClassName="!bg-[#F8FAFC] dark:!bg-[#0E1524] !border-b !border-[#E2E8F0] dark:!border-[#1F2937] !text-[10.5px] !font-[700] !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8] !px-[11px] !py-[10px]"
        />
      </div>

      {/* Bottom Sticky Action Footer for Status === 1 (Pending) */}
      {Number(dates.status) === 1 && (
        <footer className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-[#FFFFFF] dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] p-[12px_24px] flex items-center gap-[12px] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] transition-[left] duration-150 ease-in-out">
          <span className="text-[12.5px] font-[600] tabular-nums whitespace-nowrap text-[#1E293B] dark:text-[#E7ECF3]">
            {selectedrowdata.length} selected
          </span>
          <input
            type="text"
            placeholder="Remark (required when rejecting)..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="flex-1 min-w-0 max-w-[520px] h-[38px] px-[11px] text-[12.5px] rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] placeholder-[#64748B]/70 outline-none focus:border-[#4F46E5] transition-all"
          />
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={reject}
            disabled={isClicked}
            icon={<XCircle className="w-[15px] h-[15px] text-[#E11D48]" />}
            className="!rounded-[10px] !h-[38px] !px-[15px] !border-[rgba(225,29,72,0.4)] !bg-transparent hover:!bg-[rgba(225,29,72,0.09)] !text-[#E11D48] !text-[12.5px] !font-[600] whitespace-nowrap cursor-pointer transition-all"
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={approver}
            disabled={isClicked || selectedrowdata.length === 0}
            icon={<CheckCircle2 className="w-[15px] h-[15px] text-white" />}
            className={`!rounded-[10px] !h-[38px] !px-[17px] !border-transparent !text-white !text-[12.5px] !font-[600] whitespace-nowrap transition-all shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] ${
              selectedrowdata.length > 0
                ? "!bg-[#4F46E5] hover:!brightness-[1.08] cursor-pointer"
                : "!bg-[#64748B] dark:!bg-[#475569] cursor-not-allowed opacity-80"
            }`}
          >
            Approve comp off
          </Button>
        </footer>
      )}

      {/* Approver List Hierarchy Modal */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-2xl overflow-y-auto p-0 overflow-hidden bg-[#FFFFFF] dark:bg-[#111827] max-h-[85vh] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px]">
          <div className="flex justify-between items-center px-6 py-4 bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <h2 className="text-[15px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              Approver List
            </h2>
          </div>
          <div className="p-5">
            <DialogDescription asChild>
              <div className="max-h-[420px] overflow-y-auto">
                {apprData.length === 0 ? (
                  <div className="text-center text-[#64748B] py-10 text-[12.5px]">
                    No Approver Found
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <table className="w-full border border-[#E2E8F0] dark:border-[#1F2937] text-[12px]">
                        <thead className="bg-[#F8FAFC] dark:bg-[#0E1524] sticky top-0 z-10">
                          <tr>
                            <th className="border border-[#E2E8F0] dark:border-[#1F2937] p-2.5 text-[#64748B] dark:text-[#94A3B8] font-[600] text-left uppercase text-[11px] tracking-[0.03em]">
                              Approver 1A
                            </th>
                            <th className="border border-[#E2E8F0] dark:border-[#1F2937] p-2.5 text-[#64748B] dark:text-[#94A3B8] font-[600] text-left uppercase text-[11px] tracking-[0.03em]">
                              Approver 1B
                            </th>
                            <th className="border border-[#E2E8F0] dark:border-[#1F2937] p-2.5 text-[#64748B] dark:text-[#94A3B8] font-[600] text-left uppercase text-[11px] tracking-[0.03em]">
                              Approver 2A
                            </th>
                            <th className="border border-[#E2E8F0] dark:border-[#1F2937] p-2.5 text-[#64748B] dark:text-[#94A3B8] font-[600] text-left uppercase text-[11px] tracking-[0.03em]">
                              Approver 2B
                            </th>
                            <th className="border border-[#E2E8F0] dark:border-[#1F2937] p-2.5 text-[#64748B] dark:text-[#94A3B8] font-[600] text-left uppercase text-[11px] tracking-[0.03em]">
                              Approver 3A
                            </th>
                            <th className="border border-[#E2E8F0] dark:border-[#1F2937] p-2.5 text-[#64748B] dark:text-[#94A3B8] font-[600] text-left uppercase text-[11px] tracking-[0.03em]">
                              Approver 3B
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {apprData.map((item, index) => (
                            <tr
                              key={index}
                              className="hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors"
                            >
                              <td className="border border-[#E2E8F0] dark:border-[#1F2937] p-2 text-[#1E293B] dark:text-[#E7ECF3] capitalize">
                                {item.approver1_A || "—"}
                              </td>
                              <td className="border border-[#E2E8F0] dark:border-[#1F2937] p-2 text-[#1E293B] dark:text-[#E7ECF3] capitalize">
                                {item.approver1_B || "—"}
                              </td>
                              <td className="border border-[#E2E8F0] dark:border-[#1F2937] p-2 text-[#1E293B] dark:text-[#E7ECF3] capitalize">
                                {item.approver2_A || "—"}
                              </td>
                              <td className="border border-[#E2E8F0] dark:border-[#1F2937] p-2 text-[#1E293B] dark:text-[#E7ECF3] capitalize">
                                {item.approver2_B || "—"}
                              </td>
                              <td className="border border-[#E2E8F0] dark:border-[#1F2937] p-2 text-[#1E293B] dark:text-[#E7ECF3] capitalize">
                                {item.approver3_A || "—"}
                              </td>
                              <td className="border border-[#E2E8F0] dark:border-[#1F2937] p-2 text-[#1E293B] dark:text-[#E7ECF3] capitalize">
                                {item.approver3_B || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-2.5">
                      {apprData.map((item, index) => (
                        <div
                          key={index}
                          className="border border-[#E2E8F0] dark:border-[#1F2937] p-3 rounded-[10px] shadow-sm bg-[#FFFFFF] dark:bg-[#111827]"
                        >
                          <div className="grid grid-cols-2 gap-y-1.5 text-[12px]">
                            <span className="font-[600] text-[#64748B]">Approver 1A:</span>
                            <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                              {item.approver1_A || "—"}
                            </span>
                            <span className="font-[600] text-[#64748B]">Approver 1B:</span>
                            <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                              {item.approver1_B || "—"}
                            </span>
                            <span className="font-[600] text-[#64748B]">Approver 2A:</span>
                            <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                              {item.approver2_A || "—"}
                            </span>
                            <span className="font-[600] text-[#64748B]">Approver 2B:</span>
                            <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                              {item.approver2_B || "—"}
                            </span>
                            <span className="font-[600] text-[#64748B]">Approver 3A:</span>
                            <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                              {item.approver3_A || "—"}
                            </span>
                            <span className="font-[600] text-[#64748B]">Approver 3B:</span>
                            <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                              {item.approver3_B || "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
