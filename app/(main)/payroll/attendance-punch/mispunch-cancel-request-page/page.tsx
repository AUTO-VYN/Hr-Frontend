"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  Hourglass,
  CheckCircle2,
  XCircle,
  Layers,
  FileSpreadsheet,
  CornerUpLeft,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useToast } from "@/app/hooks/useToast";
import useExcelDownload from "@/app/hooks/excel-download";

// Required components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";

// Auxiliary components
import HashloaderComponent from "@/components/Templates/hashloader";

export default function MisPunchCancelRequestPage() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // Helper date function (monthsBack = 0 -> today, monthsBack = -1 -> 1 month future)
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

  // Filter dates & status state (3 = Cancel raised, 0 = Pending, 1 = Approved, 2 = Rejected, All = All)
  // Default: Today to 1 month future as in cancel request
  const [dates, setDates] = useState<{
    DATE_FROM: string;
    DATE_TO: string;
    branch: string;
    status: number | string;
  }>({
    DATE_FROM: getCurrentDate(0),
    DATE_TO: getCurrentDate(-1),
    branch: user?.branch || "",
    status: 3, // 3: Cancel raised, 0: Pending, 1: Approved, 2: Rejected, All: All
  });

  const StatusOptionsList = useMemo(
    () => [
      { value: 3, label: "Cancel raised" },
      { value: 0, label: "Pending" },
      { value: 1, label: "Approved" },
      { value: 2, label: "Rejected" },
      { value: "All", label: "All" },
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

  // Date formatting: "14 Jul 2026"
  const formatDate = (dateString: any) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const day = date.getDate();
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Original filter logic
  function filterByStatus(data: any[], status: number | string) {
    if (status === "All" || status === "all") return data;

    // Cancel Raise Req (Canc_Fin is null/undefined or 3)
    if (status === 3 || status === "3") {
      return data.filter(
        (item) => item.Canc_Fin == null || item.Canc_Fin === undefined || item.Canc_Fin == 3
      );
    }

    // Pending
    if (status === 0 || status === "0") {
      return data.filter((item) => item.Canc_Fin == 0);
    }

    // Approved
    if (status === 1 || status === "1") {
      return data.filter((item) => Number(item.Canc_Fin) === 1);
    }

    // Rejected
    if (status === 2 || status === "2") {
      return data.filter((item) => Number(item.Canc_Fin) === 2);
    }

    return data.filter((item) => item.Canc_Fin == status);
  }

  // Counts for Metric Cards (CANCEL RAISED, PENDING, APPROVED, REJECTED, ALL RECORDS)
  const stats = useMemo(() => {
    const cancelRaised = tabledata.filter(
      (item) => item.Canc_Fin == null || item.Canc_Fin === undefined || item.Canc_Fin == 3
    ).length;
    const pending = tabledata.filter((item) => item.Canc_Fin == 0).length;
    const approved = tabledata.filter((item) => Number(item.Canc_Fin) === 1).length;
    const rejected = tabledata.filter((item) => Number(item.Canc_Fin) === 2).length;
    const all = tabledata.length;
    return { cancelRaised, pending, approved, rejected, all };
  }, [tabledata]);

  // Fetch Main Mispunch Cancellation Data (GET /mobile/getMispunchCancelReqData)
  const showdata = async () => {
    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);

    setIsClicked(true);
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getMispunchCancelReqData`,
        {
          params: {
            username: user?.name,
            loc_code: dates?.branch,
            StartDate: dates?.DATE_FROM,
            EndDate: dates?.DATE_TO,
            EMPCODE: user?.EMPCODE,
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
        Utd: row.Utd ?? row.utd ?? row.id ?? i + 1,
      }));

      setTabledata(dataWithSrNo);
      setFiltereddata(filterByStatus(dataWithSrNo, dates.status));
    } catch (err: any) {
      console.error(err);
      toast({
        title: err?.response?.data?.Message || "Error fetching mis-punch cancellation data",
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
      showdata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  // Handle Input Changes with Back-Date check preservation
  const handleDateChange = (name: string, value: any) => {
    if (name === "DATE_FROM" || name === "DATE_TO") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const selected = new Date(value);
      selected.setHours(0, 0, 0, 0);

      // Back date validation from original code
      if (selected < today) {
        toast({
          title: "Back date not allowed!",
          variant: "destructive",
        });
        return; // stop update
      }
    }

    if (name === "status") {
      const nextStatus = value === "All" || value === "all" ? "All" : Number(value);
      setDates((prev) => ({ ...prev, status: nextStatus }));
      setFiltereddata(filterByStatus(tabledata, nextStatus));
      setsellectedrowdata([]);
      return;
    }
    setDates((prev) => ({ ...prev, [name]: value }));
  };

  // Status Card Click Filter
  const handleStatusFilter = (statusVal: number | string) => {
    setDates((prev) => ({ ...prev, status: statusVal }));
    setFiltereddata(filterByStatus(tabledata, statusVal));
    setsellectedrowdata([]);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setDates({
      DATE_FROM: getCurrentDate(0),
      DATE_TO: getCurrentDate(-1),
      branch: user?.branch || "",
      status: 3,
    });
    setFiltereddata(filterByStatus(tabledata, 3));
    setsellectedrowdata([]);
    setRemark("");
  };

  // Double click handler
  const doubleclicked = (row: any) => {
    console.log("Double clicked row:", row);
  };

  // Raise Cancel Request Logic (POST /mobile/cancelReq)
  const handleRaiseCancelReq = async () => {
    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Without remark you cannot raise cancel request. Please enter a remark.",
        confirmButtonColor: "#5E5CE6",
      });
      return;
    }
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Selection Required",
        text: "Please select at least one mis-punch request.",
        confirmButtonColor: "#5E5CE6",
      });
      return;
    }

    // Confirmation dialog before raising cancellation request
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action is irreversible and cannot be undone. Do you want to proceed?",
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#5E5CE6",
      cancelButtonColor: "#64748B",
    });

    // Agar user ne Cancel / No kiya toh request raise nahi hogi
    if (!confirmed.isConfirmed) {
      return;
    }

    // Agar user ne OK kiya toh request raise ho jayegi
    setCheck(true);
    setIsClicked(true);
 
    let successCount = 0;
    const failMessages: string[] = [];

    for (const row of selectedrowdata) {
      const selectedRowData = row.rowData || row;
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/cancelReq`,
          {
            Canc_Code: selectedRowData.EmpCode || selectedRowData.Emp_Code || selectedRowData.empCode,
            utd: selectedRowData.Utd ?? selectedRowData.utd ?? selectedRowData.id,
            Remark: remark,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (result.data?.status === true || result.data?.Status === true) {
          successCount++;
        } else {
          failMessages.push(
            `${selectedRowData.EmpCode || selectedRowData.Emp_Code || "Record"}: ${result.data?.Message || "Failed"}`
          );
        }
      } catch (err: any) {
        failMessages.push(
          `${selectedRowData.EmpCode || selectedRowData.Emp_Code || "Record"}: ${err.response?.data?.Message || "Failed"}`
        );
      }
    }

    if (successCount > 0) {
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: `${successCount} mis-punch cancellation request(s) raised successfully.`,
        confirmButtonColor: "#5E5CE6",
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

  // Table Columns Definition Matching Prototype & Original System
  const columns1 = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "srno",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[500] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE CODE",
        accessor: "EmpCode",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[500] text-[#64748B] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EmpName",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EmployeeDesignation",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DATE",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[500] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "START TIME",
        accessor: "In1",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "END TIME",
        accessor: "Out1",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "ACTUAL IN",
        accessor: "Actual_In",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "ACTUAL OUT",
        accessor: "Actual_Out",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "MISPUNCH REASON",
        accessor: "Mipunch_Reason",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK",
        accessor: "MI_Remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "SPECIAL REMARK",
        accessor: "Spl_Remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "stat",
        Cell: ({ value }: any) => {
          const statusOptionsShowAppr: Record<string | number, string> = {
            1: "1 level Pending",
            2: "2 level Pending",
            3: "3 level Pending",
          };

          const label = statusOptionsShowAppr[value] || "Approve";
          const isPending = label.toLowerCase().includes("pending");
          const tint = isPending ? "#F59E0B" : "#10B981";

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
      {
        Header: "CANCEL STATUS",
        accessor: "Canc_Fin",
        Cell: ({ value }: any) => {
          let label = "Cancel raised";
          let tint = "#0EA5E9"; // sky

          if (value == 1 || value === "Approved") {
            label = "Approved";
            tint = "#10B981";
          } else if (value == 2 || value === "Rejected") {
            label = "Rejected";
            tint = "#E11D48";
          } else if (value == 0 || value === "Pending") {
            label = "Pending";
            tint = "#F59E0B";
          } else {
            label = "Cancel raised";
            tint = "#0EA5E9";
          }

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
      {
        Header: "APPLIED ON",
        accessor: "Mispunch_applied_on",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
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
            Mis-punch cancel request
          </h1>
          <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Withdraw a mis-punch regularisation that was raised in error, before payroll picks it up.
          </p>
        </div>
        <div className="flex items-center gap-[8px] self-start sm:self-auto shrink-0">
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

      {/* 5 KPI StatCards matching all Status options */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[14px] mb-[14px]">
        {/* CANCEL RAISED CARD */}
        <StatCard
          title="CANCEL RAISED"
          count={stats.cancelRaised}
          icon={<Clock className="w-[14px] h-[14px] text-[#0EA5E9]" />}
          isActive={dates.status === 3 || dates.status === "3"}
          onClick={() => handleStatusFilter(3)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-[24px] !h-[24px] !rounded-[7px] !bg-[#0EA5E91F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-white"
        />

        {/* PENDING CARD */}
        <StatCard
          title="PENDING"
          count={stats.pending}
          icon={<Hourglass className="w-[14px] h-[14px] text-[#F59E0B]" />}
          isActive={dates.status === 0 || dates.status === "0"}
          onClick={() => handleStatusFilter(0)}
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
          isActive={dates.status === 1 || dates.status === "1"}
          onClick={() => handleStatusFilter(1)}
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
          isActive={dates.status === 2 || dates.status === "2"}
          onClick={() => handleStatusFilter(2)}
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
          isActive={dates.status === "All" || dates.status === "all"}
          onClick={() => handleStatusFilter("All")}
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
              title="Date From"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[12px] !font-[600] !text-[#1E293B] dark:!text-[#E7ECF3] mb-[5px] block"
            />
          </div>

          {/* DATE TO */}
          <div className="w-full">
            <Einput
              title="Date To"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[12px] !font-[600] !text-[#1E293B] dark:!text-[#E7ECF3] mb-[5px] block"
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
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#64748B] hover:!text-[#1E293B] dark:text-[#94A3B8] dark:hover:!text-[#E7ECF3] !font-[550] !text-[12.5px] !px-[14px] whitespace-nowrap cursor-pointer transition-all"
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
            Approved mis-punches
          </h2>
          <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {filtereddata.length} of {tabledata.length} rows
          </span>
          <div className="flex-1" />
        </div>
        <ServiceTablePagination
          columns={columns1}
          data={filtereddata}
          check={dates.status === 3 || dates.status === "3"}
          selectValue="srno"
          selectedRows={selectedrowdata}
          setSelectedRows={setsellectedrowdata}
          isRowSelectable={(row) => row.Canc_Fin == null || row.Canc_Fin === undefined || row.Canc_Fin == 3}
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

      {/* Bottom Sticky Action Footer */}
      {(dates.status === 3 || dates.status === "3") && (
        <footer className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-[#FFFFFF] dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] p-[12px_24px] flex items-center gap-[12px] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] transition-[left] duration-150 ease-in-out">
          <span className="text-[12.5px] font-[600] tabular-nums whitespace-nowrap text-[#1E293B] dark:text-[#E7ECF3]">
            {selectedrowdata.length} selected
          </span>
          <input
            type="text"
            placeholder="Remark for this action..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="flex-1 min-w-0 max-w-[520px] h-[38px] px-[11px] text-[12.5px] rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] placeholder-[#64748B]/70 outline-none focus:border-[#4F46E5] transition-all"
          />
          <div className="flex-1" />
          <Button
            variant="primary"
            size="sm"
            onClick={handleRaiseCancelReq}
            disabled={isClicked}
            icon={<CornerUpLeft className="w-[15px] h-[15px] text-white" />}
            className="!rounded-[10px] !h-[38px] !px-[17px] !border-transparent !text-white !text-[12.5px] !font-[600] whitespace-nowrap transition-all shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] !bg-[#4F46E5] hover:!brightness-[1.08] cursor-pointer"
          >
            Raise cancel request
          </Button>
        </footer>
      )}

      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
