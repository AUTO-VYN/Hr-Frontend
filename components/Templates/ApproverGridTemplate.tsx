"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
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

// Required UI components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Universal Safe Date Formatter (handles both Indian DD/MM/YYYY and ISO formats)
export const formatDisplayDate = (dateString: any): string => {
  if (!dateString) return "—";

  // Handle DD/MM/YYYY or DD-MM-YYYY strings from backend
  if (typeof dateString === "string") {
    const separator = dateString.includes("/")
      ? "/"
      : dateString.includes("-")
      ? "-"
      : null;
    if (separator) {
      const parts = dateString.trim().split(separator);
      // If day is 1-2 digits, month 1-2 digits, year 4 digits (e.g. 12/11/2026 or 12-11-2026)
      if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
          return `${day} ${months[monthIndex]} ${year}`;
        }
      }
    }
  }

  // Fallback for ISO or other standard date representations
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const day = date.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatDate = formatDisplayDate;

export interface ApproverGridTemplateProps {
  // Page Information
  pageTitle: string;
  pageSubtitle?: string;
  tableTitle?: string;
  approveButtonText?: string;

  // Table Configuration
  columns: any[];
  selectKey?: string; // Default: "srno"

  // APIs & Logic
  fetchApiUrl: string;
  fetchMethod?: "GET" | "POST";
  buildFetchParams?: (dates: any, user: any) => any;
  mapRowData?: (row: any, index: number) => any;

  // Custom Actions (or default handlers using actionApiUrl)
  actionApiUrl?: string;
  moduleName?: string; // For GetApprList, e.g. "leave"
  onApproveRows?: (selectedRows: any[], remark: string) => Promise<boolean>;
  onRejectRows?: (selectedRows: any[], remark: string) => Promise<boolean>;

  // Row Interaction
  onRowDoubleClick?: (row: any) => void;
  renderDetailsDialog?: (
    selectedRow: any,
    isOpen: boolean,
    onClose: () => void,
    onSuccess: () => void
  ) => React.ReactNode;
}

export default function ApproverGridTemplate({
  pageTitle,
  pageSubtitle,
  tableTitle = "Requests",
  approveButtonText = "Approve",
  columns,
  selectKey = "srno",
  fetchApiUrl,
  fetchMethod = "POST",
  buildFetchParams,
  mapRowData,
  actionApiUrl,
  moduleName = "leave",
  onApproveRows,
  onRejectRows,
  onRowDoubleClick,
  renderDetailsDialog,
}: ApproverGridTemplateProps) {
  const user = useCurrentUser();
  const { toast } = useToast();
  const globalDateRange = useDateRange();
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

  // Modal States
  const [isModalVisible1, setIsModalVisible1] = useState(false);
  const [apprData, setApprData] = useState<any[]>([]);
  const [activeModalRow, setActiveModalRow] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filter dates & status state
  // 1: Pending, 2: Approved, 3: Rejected, 0: All
  const [dates, setDates] = useState({
    DATE_FROM: globalDateRange?.DATE_FROM || globalDateRange?.from || getCurrentDate(1),
    DATE_TO: globalDateRange?.DATE_TO || globalDateRange?.to || getCurrentDate(0),
    branch: user?.branch || "",
    status: 1,
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

  // Filtering Logic
  function filterByStatus(data: any[], status: number | string) {
    if (status === 0 || status === "0" || status === "All" || status === "all") {
      return data;
    }
    return data.filter((item) => Number(item.status) === Number(status));
  }

  // Counts for Metric Cards
  const stats = useMemo(() => {
    const pending = tabledata.filter((item) => Number(item.status) === 1).length;
    const approved = tabledata.filter((item) => Number(item.status) === 2).length;
    const rejected = tabledata.filter((item) => Number(item.status) === 3).length;
    const all = tabledata.length;
    return { pending, approved, rejected, all };
  }, [tabledata]);

  // Fetch Approvers Hierarchy
  const showDataOFAPPRVL = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: moduleName,
            isPayroll: 1,
          },
          headers: { compcode: user?.Comp_Code },
        }
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approvers:", error);
    }
  };

  // Fetch Date Range from Backend
  const FetchgetDateRange = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/ars/getDateRange`,
        { headers: { compcode: user?.Comp_Code } }
      );
      const { DATE_FROM, DATE_TO } = res.data?.result || {};
      if (DATE_FROM && DATE_TO) {
        setDates((prev) => ({ ...prev, DATE_FROM, DATE_TO }));
      }
    } catch (error) {
      console.error("Date range API failed", error);
    }
  };

  // Fetch Main Grid Data
  const showdata = async () => {
    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);

    setIsClicked(true);
    try {
      const payload = buildFetchParams
        ? buildFetchParams(dates, user)
        : {
            Appr_Code: user?.EMPCODE,
            StartDate: dates.DATE_FROM,
            EndDate: dates.DATE_TO,
          };

      const result =
        fetchMethod === "GET"
          ? await axios.get(fetchApiUrl, {
              params: payload,
              headers: {
                compcode: user?.Comp_Code,
                name: user?.name,
              },
            })
          : await axios.post(fetchApiUrl, payload, {
              headers: {
                compcode: user?.Comp_Code,
                name: user?.name,
              },
            });

      const rawList = result.data?.Result || [];
      const dataWithSrNo = rawList.map((row: any, i: number) => {
        if (mapRowData) {
          return mapRowData(row, i);
        }
        // Standard default status mapping
        let status = 1;
        if (row.Canc_Fin == 1 || row.status == 2) status = 2;
        else if (row.Canc_Fin == 2 || row.status == 3) status = 3;
        else if (row.Canc_Fin == 0 && row.status_khud_ka != null) status = 2;

        return {
          ...row,
          srno: i + 1,
          status,
          Utd: row.Utd ?? row.utd ?? row.id ?? i + 1,
        };
      });

      setTabledata(dataWithSrNo);
      setFiltereddata(filterByStatus(dataWithSrNo, dates.status));
    } catch (err: any) {
      console.error("Error fetching data:", err);
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
      FetchgetDateRange();
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
    const defaultFrom =
      globalDateRange?.DATE_FROM || globalDateRange?.from || getCurrentDate(1);
    const defaultTo =
      globalDateRange?.DATE_TO || globalDateRange?.to || getCurrentDate(0);
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

  // Double Click Handler
  const handleRowDoubleClickInternal = (rowData: any) => {
    if (onRowDoubleClick) {
      onRowDoubleClick(rowData);
    } else {
      setActiveModalRow(rowData);
      setIsDetailsOpen(true);
    }
  };

  // Common Approve Handler
  const handleApprove = async () => {
    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Without remark you cannot approve this request. Please enter a remark.",
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

    if (confirmed.isConfirmed) {
      setIsClicked(true);
      if (onApproveRows) {
        await onApproveRows(selectedrowdata, remark);
      } else if (actionApiUrl) {
        let successCount = 0;
        for (const row of selectedrowdata) {
          const selectedRowData = row.rowData || row;
          try {
            const res = await axios.post(
              actionApiUrl,
              {
                EMPCODE: selectedRowData.EmpCode || selectedRowData.Emp_Code,
                Appr_Code: user?.EMPCODE,
                ApproveOrRej: "1",
                Utd: selectedRowData.Utd || selectedRowData.UTD,
                Remark: remark,
              },
              { headers: { compcode: user?.Comp_Code, name: user?.name } }
            );
            if (res.data?.status === true || res.data?.Status === true) {
              successCount++;
            }
          } catch (e) {
            console.error(e);
          }
        }
        if (successCount > 0) {
          await Swal.fire({
            icon: "success",
            title: "Approved Successfully",
            text: `${successCount} request(s) approved successfully.`,
            confirmButtonColor: "#4F46E5",
          });
        }
      }
      setsellectedrowdata([]);
      setRemark("");
      setIsClicked(false);
      await showdata();
    }
  };

  // Common Reject Handler
  const handleReject = async () => {
    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Without remark you cannot reject this request. Please enter a remark.",
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

    if (confirmed.isConfirmed) {
      setIsClicked(true);
      if (onRejectRows) {
        await onRejectRows(selectedrowdata, remark);
      } else if (actionApiUrl) {
        let successCount = 0;
        for (const row of selectedrowdata) {
          const selectedRowData = row.rowData || row;
          try {
            const res = await axios.post(
              actionApiUrl,
              {
                EMPCODE: selectedRowData.EmpCode || selectedRowData.Emp_Code,
                Appr_Code: user?.EMPCODE,
                ApproveOrRej: "0",
                Utd: selectedRowData.Utd || selectedRowData.UTD,
                Remark: remark,
              },
              { headers: { compcode: user?.Comp_Code, name: user?.name } }
            );
            if (res.data?.status === true || res.data?.Status === true) {
              successCount++;
            }
          } catch (e) {
            console.error(e);
          }
        }
        if (successCount > 0) {
          await Swal.fire({
            icon: "success",
            title: "Rejected Successfully",
            text: `${successCount} request(s) rejected successfully.`,
            confirmButtonColor: "#E11D48",
          });
        }
      }
      setsellectedrowdata([]);
      setRemark("");
      setIsClicked(false);
      await showdata();
    }
  };

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-[22px_24px_96px_24px]"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* 1. Page Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[20px] mb-[18px]">
        <div>
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              {pageSubtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-[8px] self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalVisible1(true)}
            icon={<ListChecks className="w-[14px] h-[14px] text-[#64748B] dark:text-[#94A3B8]" />}
            className="!rounded-[10px] !h-[35px] !px-[13px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !font-[550] whitespace-nowrap cursor-pointer transition-all"
          >
            Approver List
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExcelDownload(columns, filtereddata)}
            disabled={isExcelLoading || filtereddata.length === 0}
            icon={<FileSpreadsheet className="w-[14px] h-[14px] text-[#64748B] dark:text-[#94A3B8]" />}
            className="!rounded-[10px] !h-[35px] !px-[13px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !font-[550] whitespace-nowrap cursor-pointer transition-all"
          >
            {isExcelLoading ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </div>

      {/* 2. 4 StatCards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[14px] mb-[14px]">
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

      {/* 3. Filter Section Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[14px_18px_16px_18px] mb-[14px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[175px_175px_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-[12px] items-end">
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

          <div className="shrink-0">
            <Button
              variant="primary"
              onClick={showdata}
              disabled={isClicked}
              className="!h-[38px] !rounded-[9px] !border-transparent !bg-[#4F46E5] hover:!brightness-[1.08] !text-white !font-[600] !text-[12.5px] !px-[20px] whitespace-nowrap cursor-pointer transition-all shadow-sm"
            >
              Show
            </Button>
          </div>

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

      {/* 4. Main ServiceTablePagination Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden mb-16">
        <div className="flex items-center gap-[10px] px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
          <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            {tableTitle}
          </h2>
          <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {filtereddata.length} of {tabledata.length} rows
          </span>
          <div className="flex-1" />
        </div>
        <ServiceTablePagination
          columns={columns}
          data={filtereddata}
          check={dates.status === 1 || dates.status === 0}
          selectValue={selectKey}
          selectedRows={selectedrowdata}
          setSelectedRows={setsellectedrowdata}
          isRowSelectable={(row) => row.status === 1 || row.Canc_Fin == 0}
          onRowDoubleClick={handleRowDoubleClickInternal}
          height={430}
          showExcelExport={false}
          footerTextMode="pageItems"
          initialPageSize={25}
          showPageSizeInFooter={true}
          containerClassName="!border-none !shadow-none !rounded-none !bg-transparent"
          headerClassName="!bg-[#F8FAFC] dark:!bg-[#0E1524] !border-b !border-[#E2E8F0] dark:!border-[#1F2937] !text-[10.5px] !font-[700] !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8] !px-[11px] !py-[10px]"
        />
      </div>

      {/* 5. Sticky Bottom Action Bar */}
      {(dates.status === 1 || dates.status === 0) && (
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
            onClick={handleReject}
            disabled={isClicked || selectedrowdata.length === 0}
            icon={<XCircle className="w-[15px] h-[15px] text-[#E11D48]" />}
            className={`!rounded-[10px] !h-[38px] !px-[17px] !border-[#E11D48]/40 hover:!border-[#E11D48] !bg-[#FFFFFF] dark:!bg-[#111827] hover:!bg-[#E11D48]/10 !text-[#E11D48] !text-[12.5px] !font-[600] whitespace-nowrap transition-all shadow-sm ${
              selectedrowdata.length > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-70"
            }`}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApprove}
            disabled={isClicked || selectedrowdata.length === 0}
            icon={<CheckCircle2 className="w-[15px] h-[15px] text-white" />}
            className={`!rounded-[10px] !h-[38px] !px-[17px] !border-transparent !text-white !text-[12.5px] !font-[600] whitespace-nowrap transition-all shadow-sm ${
              selectedrowdata.length > 0
                ? "!bg-[#4F46E5] hover:!brightness-[1.08] cursor-pointer"
                : "!bg-[#64748B] dark:!bg-[#475569] cursor-not-allowed opacity-80"
            }`}
          >
            {approveButtonText}
          </Button>
        </footer>
      )}

      {/* Approver List Modal */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[14px] p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              Approver List
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Designated approvers hierarchy.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 max-h-[350px] overflow-y-auto">
            {apprData.length === 0 ? (
              <div className="text-center text-[#64748B] py-10 text-[12.5px]">No Approver Found</div>
            ) : (
              <div className="hidden md:block">
                <table className="w-full border border-[#E2E8F0] dark:border-[#1F2937] text-[12px]">
                  <thead className="bg-[#F8FAFC] dark:bg-[#0E1524]">
                    <tr>
                      <th className="border p-2 uppercase text-[11px] text-[#64748B]">Approver 1A</th>
                      <th className="border p-2 uppercase text-[11px] text-[#64748B]">Approver 1B</th>
                      <th className="border p-2 uppercase text-[11px] text-[#64748B]">Approver 2A</th>
                      <th className="border p-2 uppercase text-[11px] text-[#64748B]">Approver 2B</th>
                      <th className="border p-2 uppercase text-[11px] text-[#64748B]">Approver 3A</th>
                      <th className="border p-2 uppercase text-[11px] text-[#64748B]">Approver 3B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apprData.map((item, index) => (
                      <tr key={index} className="hover:bg-[#F1F5F9] dark:hover:bg-[#182235]">
                        <td className="border p-2 capitalize">{item.approver1_A || "—"}</td>
                        <td className="border p-2 capitalize">{item.approver1_B || "—"}</td>
                        <td className="border p-2 capitalize">{item.approver2_A || "—"}</td>
                        <td className="border p-2 capitalize">{item.approver2_B || "—"}</td>
                        <td className="border p-2 capitalize">{item.approver3_A || "—"}</td>
                        <td className="border p-2 capitalize">{item.approver3_B || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Render Custom Details Dialog if provided */}
      {renderDetailsDialog &&
        renderDetailsDialog(activeModalRow, isDetailsOpen, () => setIsDetailsOpen(false), showdata)}

      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
