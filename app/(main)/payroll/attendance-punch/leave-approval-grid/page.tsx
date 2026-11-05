"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Button from "@/components/atoms/Button";

// Auxiliary components
import HashloaderComponent from "@/components/Templates/hashloader";
import FileViewer from "@/components/atoms/FileviewerBank";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";

export default function LeaveApprovalGridPage() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const router = useRouter();
  const dateRangeResult = useDateRange();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // State
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtereddata, setFiltereddata] = useState<any[]>([]);
  const [selectedrowdata, setsellectedrowdata] = useState<any[]>([]);
  const [remark, setRemark] = useState<string>("");
  const [dialogRemark, setDialogRemark] = useState<string>("");
  const [MissPunchData, setMissPunchData] = useState<any>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModalVisible1, setIsModalVisible1] = useState(false);
  const [apprData, setApprData] = useState<any[]>([]);
  const [isClicked, setIsClicked] = useState(false);

  // Helper date function
  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dates, setDates] = useState({
    DATE_FROM: dateRangeResult?.DATE_FROM || getCurrentDate(1),
    DATE_TO: dateRangeResult?.DATE_TO || getCurrentDate(0),
    branch: user?.branch || "",
    status: 1, // 1 = Pending, 2 = Approved, 3 = Rejected, 0 = All
  });

  const StatusOptions = useMemo(
    () => [
      { value: 1, label: "Pending" },
      { value: 2, label: "Approved" },
      { value: 3, label: "Rejected" },
      { value: 0, label: "All" },
    ],
    [],
  );

  const branchOptions = useMemo(() => {
    const opts = [{ value: "", label: "All branches" }];
    if (user?.branch) {
      opts.push({ value: String(user.branch), label: String(user.branch) });
    }
    return opts;
  }, [user?.branch]);

  // Date formatter for display e.g. "17 Jul 2026"
  const formatDateDisplay = (dateString: any) => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
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
        return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    } catch {}
    return String(dateString);
  };

  // 3-dot status color logic from original Approver2 code
  const getDotColor = (index: number, stat: any, isLastDotRed: any) => {
    if (stat == 4) {
      return isLastDotRed === "Y" ? "bg-[#EF4444]" : "bg-[#10B981]";
    }
    if (index < Number(stat) - 1) {
      return "bg-[#10B981]";
    }
    return "bg-[#F59E0B]";
  };

  // Counts for Metric Cards
  const stats = useMemo(() => {
    const pending = tabledata.filter((item) => Number(item.status) === 1).length;
    const approved = tabledata.filter((item) => Number(item.status) === 2).length;
    const rejected = tabledata.filter((item) => Number(item.status) === 3).length;
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
            module: "leave",
            isPayroll: 1,
          },
          headers: { compcode: user.Comp_Code },
        },
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  // Fetch initial date range
  const FetchgetDateRange = useCallback(async () => {
    if (!user?.Comp_Code) return;
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/ars/getDateRange`,
        { headers: { compcode: user.Comp_Code } },
      );
      const { DATE_FROM, DATE_TO } = res.data?.result || {};
      if (DATE_FROM && DATE_TO) {
        setDates((prev) => ({ ...prev, DATE_FROM, DATE_TO }));
      } else {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDates((prev) => ({
          ...prev,
          DATE_FROM: firstDay.toISOString().split("T")[0],
          DATE_TO: lastDay.toISOString().split("T")[0],
        }));
      }
    } catch (error) {
      console.error("Date range API failed", error);
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDates((prev) => ({
        ...prev,
        DATE_FROM: firstDay.toISOString().split("T")[0],
        DATE_TO: lastDay.toISOString().split("T")[0],
      }));
    }
  }, [user?.Comp_Code]);

  useEffect(() => {
    if (user?.Comp_Code) {
      showDataOFAPPRVL();
      FetchgetDateRange();
    }
  }, [user?.Comp_Code, showDataOFAPPRVL, FetchgetDateRange]);

  // Filter helper
  const filterByStatus = (data: any[], statusVal: any) => {
    if (!statusVal || Number(statusVal) === 0) return data;
    return data.filter((item) => Number(item.status) === Number(statusVal));
  };

  // Fetch Leave Data
  const showdata = async () => {
    if (!dates.DATE_FROM || !dates.DATE_TO) {
      toast({
        title: "Please select Date From and Date To",
        variant: "destructive",
      });
      return;
    }

    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);
    setIsClicked(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getLeaveData`,
        {
          Appr_Code: user?.EMPCODE,
          StartDate: dates.DATE_FROM,
          EndDate: dates.DATE_TO,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const rawResult = result.data?.Result || [];
      const dataWithSrNo = rawResult.map((row: any, i: number) => {
        const MAN_APPR = (row.MAN_APPR || "").trim().toUpperCase();
        const Man_Rej = (row.Man_Rej || "").trim().toUpperCase();
        let status = 1; // Pending
        if (MAN_APPR === "Y" && Man_Rej !== "Y") {
          status = 2; // Approved
        } else if (MAN_APPR !== "Y" && Man_Rej === "Y") {
          status = 3; // Rejected
        } else if (MAN_APPR === "N" && Man_Rej === "N" && row.status_khud_ka != null) {
          status = 2;
        }

        return {
          ...row,
          Utd: row.Utd ?? row.UTD ?? row.id ?? row.tran_id ?? i + 1,
          srno: i + 1,
          status,
        };
      });

      setTabledata(dataWithSrNo);
      setFiltereddata(filterByStatus(dataWithSrNo, dates.status));
    } catch (err: any) {
      console.error(err);
      toast({
        title: err?.response?.data?.Message || "Failed to load leave data",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  };

  // Load data ONLY on initial page mount once dates are fetched
  const isInitialLoadedRef = useRef(false);
  useEffect(() => {
    if (user?.Comp_Code && dates.DATE_FROM && dates.DATE_TO && !isInitialLoadedRef.current) {
      isInitialLoadedRef.current = true;
      showdata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, dates.DATE_FROM, dates.DATE_TO]);

  // Handle Date & Filter changes (Date changes do NOT call showdata; only Show button does)
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

  // Status Card Click
  const handleStatusFilter = (statusVal: number) => {
    setDates((prev) => ({ ...prev, status: statusVal }));
    setFiltereddata(filterByStatus(tabledata, statusVal));
    setsellectedrowdata([]);
  };

  // Reset filters
  const handleResetFilters = () => {
    FetchgetDateRange();
    setDates((prev) => ({
      ...prev,
      status: 1,
      branch: user?.branch || "",
    }));
    setFiltereddata(filterByStatus(tabledata, 1));
    setsellectedrowdata([]);
  };

  // Double click row handler
  const doubleclicked = (rowData: any) => {
    setMissPunchData(rowData);
    setDialogRemark(rowData?.spl_remark || "");
    setIsDialogOpen(true);
  };

  // Single Approve (from Details Dialog)
  const approver = async () => {
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "Are you sure you want to approve this leave?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsClicked(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveLeave`,
        {
          EMPCODE: MissPunchData.EmpCode,
          Appr_Code: user?.EMPCODE,
          ApproveOrRej: "1",
          Utd: MissPunchData.Utd,
          Remark: dialogRemark || "Approved",
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        },
      );

      if (result.data?.Status === true || result.data?.Status === "true") {
        toast({
          title: result.data.Message || "Approve Successfully",
          variant: "default",
        });
      } else {
        toast({
          title: result.data?.Message || "Failed to approve",
          variant: "destructive",
        });
      }
      setsellectedrowdata([]);
      setDialogRemark("");
      setIsDialogOpen(false);
      await showdata();
    } catch (err: any) {
      toast({
        title: err?.response?.data?.Message || "Error approving leave",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  };

  // Single Reject (from Details Dialog)
  const reject = async () => {
    if (!dialogRemark || !dialogRemark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Without remark you cannot reject this leave. Please enter a remark.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "Are you sure you want to reject this leave?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#E11D48",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, reject",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsClicked(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveLeave`,
        {
          EMPCODE: MissPunchData.EmpCode,
          Appr_Code: user?.EMPCODE,
          ApproveOrRej: "0",
          Remark: dialogRemark,
          Utd: MissPunchData.Utd,
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        },
      );

      if (
        result.data?.Status === true ||
        result.data?.Status === "true" ||
        result.data?.status === true
      ) {
        toast({
          title: "Rejected Successfully",
          variant: "default",
        });
      } else {
        toast({
          title: result.data?.Message || "Failed when Reject Data",
          variant: "destructive",
        });
      }
      setsellectedrowdata([]);
      setDialogRemark("");
      setIsDialogOpen(false);
      await showdata();
    } catch (err: any) {
      toast({
        title: err?.response?.data?.Message || "Error rejecting leave",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  };

  // Batch Approve (from Bottom Sticky Bar)
  const handleBatchApprove = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "Please select at least one leave request.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "Are you sure you want to approve this leave?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsClicked(true);
    let successCount = 0;
    try {
      for (const item of selectedrowdata) {
        const row = item.rowData || item;
        const utd = row.Utd ?? row.UTD ?? row.id ?? item.id;
        const empCode = row.EmpCode ?? row.EMPCODE;

        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveLeave`,
          {
            EMPCODE: empCode,
            Appr_Code: user?.EMPCODE,
            ApproveOrRej: "1",
            Utd: utd,
            Remark: remark || "Approved",
          },
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          },
        );
        if (res.data?.Status === true || res.data?.Status === "true") {
          successCount++;
        }
      }

      toast({
        title: `${successCount} leave request(s) approved successfully.`,
        variant: "default",
      });
      setsellectedrowdata([]);
      setRemark("");
      await showdata();
    } catch (err: any) {
      toast({
        title: err?.response?.data?.Message || "Error in batch approval",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  };

  // Batch Reject (from Bottom Sticky Bar)
  const handleBatchReject = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "Please select at least one leave request to reject.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }
    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Without remark you cannot reject this leave. Please enter a remark.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "Are you sure you want to reject this leave?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#E11D48",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, reject",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsClicked(true);
    let successCount = 0;
    try {
      for (const item of selectedrowdata) {
        const row = item.rowData || item;
        const utd = row.Utd ?? row.UTD ?? row.id ?? item.id;
        const empCode = row.EmpCode ?? row.EMPCODE;

        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveLeave`,
          {
            EMPCODE: empCode,
            Appr_Code: user?.EMPCODE,
            ApproveOrRej: "0",
            Remark: remark,
            Utd: utd,
          },
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          },
        );
        if (
          res.data?.Status === true ||
          res.data?.Status === "true" ||
          res.data?.status === true
        ) {
          successCount++;
        }
      }

      toast({
        title: `${successCount} leave request(s) rejected successfully.`,
        variant: "default",
      });
      setsellectedrowdata([]);
      setRemark("");
      await showdata();
    } catch (err: any) {
      toast({
        title: err?.response?.data?.Message || "Error in batch rejection",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  };

  const statusOptions: Record<any, string> = {
    1: "Pending",
    2: "Approved",
    3: "Rejected",
  };

  // Table Columns matching original Approver2 code with Prototype Badge styling
  const columns = useMemo(
    () => [
      {
        Header: "STATUS",
        accessor: "status",
        width: 120,
        Cell: ({ value }: any) => {
          const s = Number(value);
          const isAppr = s === 2;
          const isRej = s === 3;
          const label = isAppr ? "Approved" : isRej ? "Rejected" : "Pending";
          const tint = isAppr ? "#10B981" : isRej ? "#E11D48" : "#F59E0B";
          const tintBg = isAppr
            ? "rgba(16, 185, 129, 0.08)"
            : isRej
            ? "rgba(225, 29, 72, 0.08)"
            : "rgba(245, 158, 11, 0.08)";
          const tintBorder = isAppr
            ? "rgba(16, 185, 129, 0.35)"
            : isRej
            ? "rgba(225, 29, 72, 0.35)"
            : "rgba(245, 158, 11, 0.35)";

          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: tint,
                backgroundColor: tintBg,
                border: `1px solid ${tintBorder}`,
                padding: "3.5px 8.5px",
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
        Header: "SR NO",
        accessor: "srno",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal tabular-nums">
            {value}
          </span>
        ),
      },
      {
        Header: "REQUEST DATE",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal whitespace-nowrap">
            {formatDateDisplay(value)}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE",
        accessor: "EmpName",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-[600] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EmployeeDesignation",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMP CODE",
        accessor: "EmpCode",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal tabular-nums">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REASON",
        accessor: "Mipunch_Reason",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK",
        accessor: "spl_remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HEAD NAME",
        accessor: "head_remark_by",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HEAD REMARK",
        accessor: "head_remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "APPROVAL CHAIN",
        accessor: "stat",
        Cell: ({ row }: any) => (
          <div className="flex space-x-1.5 items-center">
            {[1, 2, 3].map((dot, index) => (
              <span
                key={index}
                className={`w-3.5 h-3.5 rounded-full ${getDotColor(
                  index,
                  row.original.stat,
                  row.original.Man_Rej,
                )}`}
              />
            ))}
          </div>
        ),
      },
      {
        Header: "AVAILABLE BALANCE",
        accessor: "Available_bal",
        Cell: ({ value, row }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal tabular-nums">
            {value ?? row.original.Available_balance ?? "—"}
          </span>
        ),
      },
    ],
    [],
  );

  // Export to Excel handler
  const handleExportExcel = () => {
    handleExcelDownload(columns, filtereddata);
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Leave approver grid
          </h1>
          <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Leave applications with the applicant&apos;s remaining balance, so you can approve without leaving the row.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalVisible1(true)}
            icon={<ListChecks className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />}
            className="!rounded-[10px] !h-[35px] !px-3 !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !font-[550] whitespace-nowrap cursor-pointer transition-all"
          >
            Approver list
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExcelLoading || filtereddata.length === 0}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />}
            className="!rounded-[10px] !h-[35px] !px-3.5 !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !font-[550] whitespace-nowrap cursor-pointer transition-all"
          >
            {isExcelLoading ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </div>

      {/* Top 4 StatCards using Template Card with exact HTML Styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[14px]">
        {/* PENDING CARD */}
        <StatCard
          title="PENDING"
          count={stats.pending}
          icon={<Clock className="w-3.5 h-3.5 text-[#F59E0B]" />}
          isActive={dates.status === 1}
          onClick={() => handleStatusFilter(1)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#F59E0B1F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-[#E7ECF3]"
        />

        {/* APPROVED CARD */}
        <StatCard
          title="APPROVED"
          count={stats.approved}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
          isActive={dates.status === 2}
          onClick={() => handleStatusFilter(2)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#10B9811F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-[#E7ECF3]"
        />

        {/* REJECTED CARD */}
        <StatCard
          title="REJECTED"
          count={stats.rejected}
          icon={<XCircle className="w-3.5 h-3.5 text-[#E11D48]" />}
          isActive={dates.status === 3}
          onClick={() => handleStatusFilter(3)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#E11D481F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-[#E7ECF3]"
        />

        {/* ALL RECORDS CARD */}
        <StatCard
          title="ALL RECORDS"
          count={stats.all}
          icon={<Layers className="w-3.5 h-3.5 text-[#4F46E5]" />}
          isActive={dates.status === 0}
          onClick={() => handleStatusFilter(0)}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-[#FFFFFF] dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-1 ring-[#4F46E5]/40"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#4F46E51F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] tabular-nums !text-[#1E293B] dark:!text-[#E7ECF3]"
        />
      </div>

      {/* Filter Section Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[14px_18px_16px_18px] mb-[14px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[175px_175px_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 items-end">
          {/* DATE FROM */}
          <div className="w-full">
            <Einput
              title="DATE FROM"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1 block"
            />
          </div>

          {/* DATE TO */}
          <div className="w-full">
            <Einput
              title="DATE TO"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1 block"
            />
          </div>

          {/* STATUS */}
          <div className="w-full min-w-0">
            <Eselect
              title="STATUS"
              name="status"
              option={StatusOptions}
              initialValue={dates.status}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1 block"
            />
          </div>

          {/* BRANCH */}
          <div className="w-full min-w-0">
            <Eselect
              title="BRANCH"
              name="branch"
              option={branchOptions}
              initialValue={dates.branch}
              handleInputChange={handleDateChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1 block"
            />
          </div>

          {/* SHOW BUTTON */}
          <div className="shrink-0">
            <Button
              variant="primary"
              onClick={showdata}
              disabled={isClicked}
              className="!h-[38px] !rounded-[9px] !border-transparent !bg-[#4F46E5] hover:!brightness-[1.08] !text-white !font-semibold !text-[12.5px] !px-5 whitespace-nowrap cursor-pointer transition-all"
            >
              Show
            </Button>
          </div>

          {/* RESET BUTTON */}
          <div className="shrink-0">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#64748B] hover:!text-[#1E293B] dark:!text-[#94A3B8] dark:hover:!text-[#E7ECF3] !font-[550] !text-[12.5px] !px-3.5 whitespace-nowrap cursor-pointer transition-all"
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
            Leave requests
          </h2>
          <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {filtereddata.length} of {tabledata.length} rows
          </span>
          <div className="flex-1" />
        </div>
        <ServiceTablePagination
          columns={columns}
          data={filtereddata}
          check={Number(dates.status) === 1}
          selectValue="Utd"
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

      {/* Fixed Bottom Action Footer */}
      <footer className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-[#FFFFFF] dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] px-4 sm:px-6 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] transition-[left] duration-150 ease-in-out">
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
          onClick={handleBatchReject}
          disabled={isClicked}
          icon={<XCircle className="w-4 h-4 text-[#E11D48]" />}
          className="!rounded-[10px] !h-[38px] !px-[15px] !border-[rgba(225,29,72,0.4)] !bg-transparent hover:!bg-[rgba(225,29,72,0.09)] !text-[#E11D48] !text-[12.5px] !font-[600] whitespace-nowrap cursor-pointer transition-all"
        >
          Reject
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleBatchApprove}
          disabled={isClicked}
          icon={<CheckCircle2 className="w-4 h-4 text-white" />}
          className={`!rounded-[10px] !h-[38px] !px-[17px] !border-transparent !text-white !text-[12.5px] !font-[600] whitespace-nowrap transition-all shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] ${
            selectedrowdata.length > 0
              ? "!bg-[#4F46E5] hover:!brightness-[1.08] cursor-pointer"
              : "!bg-[#475569] dark:!bg-[#334155] cursor-not-allowed opacity-90"
          }`}
        >
          Approve leave
        </Button>
      </footer>

      {/* Approver List Dialog */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-screen-lg overflow-y-auto p-0 overflow-hidden bg-[#FFFFFF] dark:bg-[#111827] max-h-[90vh] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px]">
          <div className="flex justify-between items-center px-6 py-3.5 bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <h2 className="text-[15px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              APPROVER LIST
            </h2>
          </div>
          <div className="p-5">
            <DialogDescription asChild>
              <div className="max-h-[500px] overflow-y-auto">
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
                    <div className="md:hidden space-y-3">
                      {apprData.map((item, index) => (
                        <div
                          key={index}
                          className="border border-[#E2E8F0] dark:border-[#1F2937] p-3 rounded-[10px] shadow-sm bg-[#FFFFFF] dark:bg-[#111827]"
                        >
                          <div className="grid grid-cols-2 gap-y-2 text-[12px]">
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

      {/* Row Double-Click Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-screen-lg overflow-y-auto p-0 overflow-hidden bg-[#FFFFFF] dark:bg-[#111827] max-h-[90vh] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px]">
          <div className="flex justify-between items-center px-6 py-3.5 bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <h2 className="text-[15px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              LEAVE DETAILS
            </h2>
          </div>
          <div className="p-6">
            <DialogDescription asChild>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Date</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.Date || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Employee Code</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.EmpCode || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Employee Name</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.EmpName || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Designation</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.EmployeeDesignation || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">In Time</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-[650] text-[#E11D48]">
                      {MissPunchData.In1 || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Out Time</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-[650] text-[#E11D48]">
                      {MissPunchData.Out1 || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Reason</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.Mipunch_Reason || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Remark</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.MI_Remark || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Head Remark By</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.head_remark_by || "—"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-1/3 font-[600] text-[#64748B]">Head Remark</span>
                    <span className="w-8 text-center text-[#64748B]">:</span>
                    <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                      {MissPunchData.head_remark || "—"}
                    </span>
                  </div>
                </div>

                {/* Medical Certificate Preview */}
                {MissPunchData?.PROFILE && (
                  <div className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-3">
                    <p className="text-[11px] font-[600] text-[#64748B] uppercase mb-2 tracking-[0.03em]">
                      Medical Certificate :
                    </p>
                    <div className="flex items-center gap-4">
                      <Image
                        src={MissPunchData.PROFILE}
                        alt="Medical Certificate"
                        width={120}
                        height={70}
                        className="rounded border border-[#E2E8F0] object-cover cursor-pointer hover:opacity-90"
                        onClick={() => window.open(MissPunchData.PROFILE, "_blank")}
                      />
                      <FileViewer fileLink={MissPunchData.PROFILE} />
                    </div>
                  </div>
                )}

                {/* Remarks Input */}
                <div className="mt-4">
                  <label className="block text-[11px] font-[600] text-[#64748B] uppercase tracking-[0.03em] mb-1">
                    Remark
                  </label>
                  <input
                    type="text"
                    value={dialogRemark}
                    onChange={(e) => setDialogRemark(e.target.value)}
                    placeholder="Enter remark here..."
                    className="w-full h-[38px] px-3 text-[12.5px] rounded-[9px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] focus:border-[#4F46E5] outline-none"
                  />
                </div>

                {/* Modal Action Buttons */}
                {!MissPunchData.status_khud_ka && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#1F2937]">
                    <Button
                      variant="outline"
                      onClick={reject}
                      className="!rounded-[10px] !px-5 !h-[36px] !text-[12.5px] !font-[600] !text-[#E11D48] !border-[rgba(225,29,72,0.4)] hover:!bg-[rgba(225,29,72,0.09)]"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      onClick={approver}
                      className="!rounded-[10px] !px-5 !h-[36px] !text-[12.5px] !font-[600] !bg-[#4F46E5] !text-white hover:!brightness-[1.08]"
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
