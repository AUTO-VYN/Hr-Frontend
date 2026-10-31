"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import HashloaderComponent from "@/components/Templates/hashloader";
import ReactTable from "@/components/Templates/reacttable";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import FileViewer from "@/components/atoms/Fileviewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Layers,
  ListChecks,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { FaImage } from "react-icons/fa";

/* ------------------------------------------------------------------ */
/* Stat card (local, flat style: no glass, no colored background)      */
/* ------------------------------------------------------------------ */
type StatVariant = "amber" | "emerald" | "rose" | "purple";

const statIconTone: Record<StatVariant, string> = {
  amber:
    "bg-yellow-50 text-yellow-500 dark:bg-yellow-500/20 dark:text-yellow-400",
  emerald:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  purple:
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
};

function StatCard({
  title,
  count,
  variant,
  isActive,
  onClick,
  icon,
}: {
  title: string;
  count: number;
  variant: StatVariant;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`group w-full text-left rounded-2xl border bg-white dark:bg-[#0E1626] p-3.5 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isActive
          ? "border-indigo-500 ring-1 ring-indigo-500 dark:border-indigo-400 dark:ring-indigo-400"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span
          className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${statIconTone[variant]}`}
        >
          {icon}
        </span>
        <span className="text-[10.5px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {title}
        </span>
      </div>
      <div className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {count}
      </div>
    </button>
  );
}

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

const formatDate = (value: any) => {
  if (!value) return "—";
  let dateObj: Date;

  if (
    typeof value === "string" &&
    /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(value)
  ) {
    const [day, month, year] = value.split(/[/-]/);
    dateObj = new Date(+year, +month - 1, +day);
  } else {
    dateObj = new Date(value);
  }

  if (isNaN(dateObj.getTime())) return String(value);

  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getImageUrl = (path?: string) => {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  // 1. Agar already complete HTTP/HTTPS URL hai
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // 2. Windows backslash ko forward slash me convert karein
  // const cleanPath = trimmed.replace(/\\/g, "/");

  // 3. Backend fetch endpoint lagayein
  const basePath =
    process.env.NEXT_PUBLIC_imagepath 

    const cleanPath = trimmed.replace(/^undefined/i, "").replace(/\\/g, "/");


  return `${basePath}${cleanPath}`;
};

export default function AttendancePunchingApprovalPage() {
  const user: any = useCurrentUser();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // Loading & Data States
  const [isLoading, setIsLoading] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [apprData, setApprData] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Filter States
  const todayOneMonthBack = getCurrentDate(1);
  const todayDate = getCurrentDate(0);

  const [dateFrom, setDateFrom] = useState(todayOneMonthBack);
  const [dateTo, setDateTo] = useState(todayDate);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection & Action States
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [quickRemark, setQuickRemark] = useState("");

  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false); // Punch details modal
  const [isModalVisible1, setIsModalVisible1] = useState(false); // Approver list modal
  const [headRemark, setHeadRemark] = useState("");
  const [model, setModel] = useState<any>({
    Utd: "",
    EmpCode: "",
    EmpName: "",
    EmployeeDesignation: "",
    In1: "",
    Out1: "",
    Date: "",
    Mipunch_Reason: "",
    MI_Remark: "",
    Spl_Remark: "",
    head_remark_by: "",
    head_remark: "",
    fileIn: "",
    fileOut: "",
    AtnStatus: "",
    stat: "",
    status_khud_ka: "",
    Man_Rej: "",
  });

  // SweetAlert Toast Notification
  function showSideAlert(
    message: string,
    type: "success" | "warning" | "error" | "info",
  ) {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        container: "side-alert-container",
        popup: `side-alert-${type}`,
        title: "side-alert-title",
        icon: "side-alert-icon",
      },
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  }

  // Determine Approval status for each item
  const getItemStatus = useCallback(
    (item: any): "Pending" | "Approved" | "Rejected" => {
      if (
        item.Man_Rej === "Y" ||
        item.status_khud_ka === 0 ||
        item.status_khud_ka === "0" ||
        item.stat === 0 ||
        item.stat === "0"
      ) {
        return "Rejected";
      }
      if (
        item.status_khud_ka === 1 ||
        item.status_khud_ka === "1" ||
        item.stat === 4 ||
        item.stat === "4" ||
        item.AtnStatus === "Approved"
      ) {
        return "Approved";
      }
      return "Pending";
    },
    [],
  );

  // 3-dot status color logic: Pending = Yellow, Approval = Green, Reject = Red
  const getDotColor = (index: number, stat: any, isLastDotRed: any) => {
    const numStat = Number(stat || 1);

    if (numStat === 4) {
      if (isLastDotRed === "Y" || isLastDotRed === "y") {
        return index === 2 ? "bg-red-500" : "bg-emerald-500";
      }
      return "bg-emerald-500";
    }

    if (isLastDotRed === "Y" || isLastDotRed === "y") {
      if (index === numStat - 1) return "bg-red-500";
      if (index < numStat - 1) return "bg-emerald-500";
      return "bg-yellow-400";
    }

    if (index < numStat - 1) {
      return "bg-emerald-500";
    }
    return "bg-yellow-400";
  };

  // API 1: Fetch Pending Attendance List
  const showData = async () => {
    if (!user?.EMPCODE && !user?.Comp_Code) return;

    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getPendingAppList`,
        {
          params: {
            Appr_Code: user?.EMPCODE,
            StartDate: dateFrom,
            EndDate: dateTo,
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );
      setTabledata(response.data?.Result || []);
      setSelectedRows([]);
    } catch (error) {
      console.error("Error fetching attendance list:", error);
      showSideAlert("Failed to fetch records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // API 2: Fetch Approver Hierarchy List
  const showDataOFAPPRVL = async () => {
    if (!user?.EMPCODE && !user?.Comp_Code) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: "attdence",
            isPayroll: 1,
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  };

  // Initial Fetch
  useEffect(() => {
    if (user?.EMPCODE || user?.Comp_Code) {
      showData();
      showDataOFAPPRVL();
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  // Branch Options for Eselect
  const branchOptions = useMemo(() => {
    const branches = new Set<string>();
    tabledata.forEach((item: any) => {
      const b =
        item.branch || item.Branch_Name || item.Location || item.Location_Lable;
      if (b) branches.add(String(b).trim());
    });
    if (user?.branch) {
      branches.add(String(user.branch).trim());
    }
    if (branches.size === 0) {
      branches.add("BRANCH - 1");
    }
    return [
      { value: "All", label: "All Branches" },
      ...Array.from(branches).map((b) => ({ value: b, label: b })),
    ];
  }, [tabledata, user?.branch]);

  const statusOptions = [
    { value: "All", label: "All Status" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];

  // KPI Calculations
  const stats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    tabledata.forEach((item: any) => {
      const s = getItemStatus(item);
      if (s === "Pending") pendingCount++;
      else if (s === "Approved") approvedCount++;
      else if (s === "Rejected") rejectedCount++;
    });

    return {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      all: tabledata.length,
    };
  }, [tabledata, getItemStatus]);

  // Filtered Data (by status card/select and branch)
  const filteredData = useMemo(() => {
    return tabledata.filter((item: any) => {
      // 1. Status Filter
      if (selectedStatusFilter !== "All") {
        const itemStatus = getItemStatus(item);
        if (itemStatus !== selectedStatusFilter) return false;
      }

      // 2. Branch Filter
      if (selectedBranch !== "All") {
        const itemBranch =
          item.branch ||
          item.Branch_Name ||
          item.Location ||
          item.Location_Lable ||
          "";
        if (
          String(itemBranch).toLowerCase() !==
          String(selectedBranch).toLowerCase()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tabledata, selectedStatusFilter, selectedBranch, getItemStatus]);

  // Double Click Row to Open Modal
  const onRowDoubleClick = (rowData: any) => {
    const item = rowData?.original ? rowData.original : rowData;
    setModel(item);
    setHeadRemark("");
    setIsModalVisible(true);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setDateFrom(todayOneMonthBack);
    setDateTo(todayDate);
    setSelectedStatusFilter("All");
    setSelectedBranch("All");
    setSearchQuery("");
    setSelectedRows([]);
  };

  // Single Action (Approve / Reject)
  const handleAction = async (
    ApproveOrRej: "1" | "0",
    targetItem?: any,
    customRemark?: string,
  ) => {
    const item = targetItem || model;
    const remarkToSubmit = (customRemark ?? headRemark ?? "").trim();

    if (!remarkToSubmit) {
      showSideAlert("Please enter Remark", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveAttendance_New`,
        {
          params: {
            EMPCODE: item?.EmpCode,
            Appr_Code: user?.EMPCODE,
            Utd: item?.Utd,
            Remark: remarkToSubmit,
            ApproveOrRej,
            module: "attdence",
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );

      const isSuccess =
        response.data?.Status === true || response.data?.status === true;

      Swal.fire({
        icon: isSuccess ? "success" : "info",
        title: isSuccess ? "Success!" : "Info",
        text:
          response.data?.Message ||
          response.data?.message ||
          "Operation completed.",
        confirmButtonColor: isSuccess ? "#059669" : "#4338CA",
      });

      setHeadRemark("");
      setQuickRemark("");
      setIsModalVisible(false);
      setSelectedRows([]);
      await showData();
    } catch (error: any) {
      console.error("Error approving/rejecting attendance:", error);
      Swal.fire({
        icon: "error",
        title: "Action Failed",
        text:
          error?.response?.data?.Message ||
          "Something went wrong while processing the request.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk Action from floating selection bar
  const handleBulkAction = async (ApproveOrRej: "1" | "0") => {
    if (selectedRows.length === 0) {
      showSideAlert("Please select at least one item", "warning");
      return;
    }
    if (selectedRows.length > 1) {
      showSideAlert("Only one record can be processed at a time", "warning");
      return;
    }
    if (!quickRemark.trim()) {
      showSideAlert("Please enter remark for selected records", "warning");
      return;
    }

    const actionText = ApproveOrRej === "1" ? "Approve" : "Reject";
    const confirmed = await Swal.fire({
      icon: "warning",
      title: `${actionText} ${selectedRows.length} Records?`,
      text: `Are you sure you want to ${actionText.toLowerCase()} all selected punch records?`,
      confirmButtonText: `Yes, ${actionText}`,
      confirmButtonColor: ApproveOrRej === "1" ? "#059669" : "#EF4444",
      showCancelButton: true,
      cancelButtonText: "Cancel",
    });

    if (!confirmed.isConfirmed) return;

    setIsLoading(true);
    let successCount = 0;
    try {
      for (const selected of selectedRows) {
        const item = selected.rowData || selected;
        try {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_URL}/mobile/ApproveAttendance_New`,
            {
              params: {
                EMPCODE: item.EmpCode,
                Appr_Code: user?.EMPCODE,
                Utd: item.Utd,
                Remark: quickRemark.trim(),
                ApproveOrRej,
                module: "attdence",
              },
              headers: {
                compcode: user?.Comp_Code,
              },
            },
          );
          if (res.data?.Status === true || res.data?.status === true) {
            successCount++;
          }
        } catch (e) {
          console.error("Error in bulk item:", item.Utd, e);
        }
      }

      await Swal.fire({
        icon: "success",
        title: "Completed",
        text: `Processed ${successCount} of ${selectedRows.length} requests successfully.`,
        confirmButtonColor: "#059669",
      });

      setSelectedRows([]);
      setQuickRemark("");
      await showData();
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Export to Excel Handler
  const handleExport = () => {
    const exportColumns = [
      { Header: "Status", accessor: "excel_status" },
      { Header: "SR NO", accessor: "Utd" },
      { Header: "EMP. CODE", accessor: "EmpCode" },
      { Header: "EMPLOYEE NAME", accessor: "EmpName" },
      { Header: "DESIGNATION", accessor: "EmployeeDesignation" },
      { Header: "IN TIME", accessor: "In1" },
      { Header: "OUT TIME", accessor: "Out1" },
      { Header: "DATE", accessor: "excel_date" },
      { Header: "REASON", accessor: "Mipunch_Reason" },
      { Header: "REMARK", accessor: "MI_Remark" },
      { Header: "SPECIAL REMARK", accessor: "Spl_Remark" },
      { Header: "HEAD NAME", accessor: "head_remark_by" },
      { Header: "HEAD REMARK", accessor: "head_remark" },
    ];

    const exportRows = filteredData.map((item: any) => ({
      ...item,
      excel_status: getItemStatus(item),
      excel_date: formatDate(item.Date),
      Mipunch_Reason: item.Mipunch_Reason || "—",
      MI_Remark: item.MI_Remark || "—",
      Spl_Remark: item.Spl_Remark || "—",
      head_remark_by: item.head_remark_by || "—",
      head_remark: item.head_remark || "—",
    }));

    handleExcelDownload(exportColumns, exportRows);
  };

  // Render Status Badge matching reference screenshot
  const renderStatusBadge = (status: "Pending" | "Approved" | "Rejected") => {
    if (status === "Approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-md font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
          Approved
        </span>
      );
    }
    if (status === "Rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-md font-medium bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]"></span>
          Rejected
        </span>
      );
    }
    // Pending (Amber / Yellow pill)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-md font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
        Pending
      </span>
    );
  };

  // ReactTable Column Definitions
  const columns = useMemo(
    () => [
      {
        Header: "STATUS",
        id: "status",
        accessor: (row: any) => getItemStatus(row),
        Cell: ({ row }: any) => {
          const status = getItemStatus(row.original);
          return renderStatusBadge(status);
        },
      },
      {
        Header: "SR NO",
        accessor: "Utd",
        Cell: ({ value }: any) => (
          <span className="text-md font-medium font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMP. CODE",
        accessor: "EmpCode",
        Cell: ({ value }: any) => (
          <span className="text-md font-medium font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EmpName",
        Cell: ({ value }: any) => (
          <span
            className="text-md font-medium text-slate-900 dark:text-slate-100 max-w-[170px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EmployeeDesignation",
        Cell: ({ value }: any) => (
          <span
            className="text-md font-medium text-slate-600 dark:text-slate-300 max-w-[130px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "IN TIME",
        accessor: "In1",
        Cell: ({ value }: any) => (
          <span className="text-md font-medium font-mono text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "OUT TIME",
        accessor: "Out1",
        Cell: ({ value }: any) => (
          <span className="text-md font-medium font-mono text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DATE",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-md font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "REASON",
        accessor: "Mipunch_Reason",
        Cell: ({ value }: any) => (
          <span
            className="text-md font-medium text-slate-500 dark:text-slate-400 max-w-[140px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK",
        accessor: "MI_Remark",
        Cell: ({ value }: any) => (
          <span
            className="text-md font-medium text-slate-600 dark:text-slate-300 max-w-[180px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      // 1. Naya column: SPECIAL REMARK
      {
        Header: "SPECIAL REMARK",
        accessor: "Spl_Remark",
        Cell: ({ value }: any) => (
          <span
            className="text-md font-medium text-slate-600 dark:text-slate-300 max-w-[180px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HEAD NAME",
        accessor: "head_remark_by",
        Cell: ({ value }: any) => (
          <span
            className="text-md font-medium text-slate-600 dark:text-slate-300 max-w-[140px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      // 2. Naya column: HEAD REMARK
      {
        Header: "HEAD REMARK",
        accessor: "head_remark",
        Cell: ({ value }: any) => (
          <span
            className="text-md font-medium text-slate-600 dark:text-slate-300 max-w-[180px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
    ],
    [getItemStatus],
  );

  const columnsForExcel = [
    { Header: "STATUS", accessor: (row: any) => getItemStatus(row) },
    { Header: "SR NO", accessor: "Utd" },
    { Header: "EMP. CODE", accessor: "EmpCode" },
    { Header: "EMPLOYEE NAME", accessor: "EmpName" },
    { Header: "DESIGNATION", accessor: "EmployeeDesignation" },
    { Header: "IN TIME", accessor: "In1" },
    { Header: "OUT TIME", accessor: "Out1" },
    { Header: "DATE", accessor: (row: any) => formatDate(row?.Date) },
    { Header: "REASON", accessor: "Mipunch_Reason" },
    { Header: "REMARK", accessor: "MI_Remark" },
    { Header: "SPECIAL REMARK", accessor: "Spl_Remark" },
    { Header: "HEAD NAME", accessor: "head_remark_by" },
    { Header: "HEAD REMARK", accessor: "head_remark" },
  ];

  const handleSingleSelect = (incoming: any[]) => {
    const keyOf = (row: any) => String((row?.rowData ?? row)?.Utd ?? "");
    const prevKeys = new Set(selectedRows.map(keyOf));
    const newlyAdded = incoming.filter((row) => !prevKeys.has(keyOf(row)));

    // Keep only the row the user just clicked; an empty result clears the selection.
    setSelectedRows(
      newlyAdded.length > 0 ? [newlyAdded[newlyAdded.length - 1]] : [],
    );
  };
  const hasSelection = selectedRows.length > 0;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#060B13] text-slate-800 dark:text-slate-100 p-3 sm:p-6 space-y-5 pb-6">
      {/* 1. Page Title & Subtitle + Approver Matrix Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Attendance approval
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Every in/out punch raised in the period, with the reason and remark
            the employee gave.
          </p>
        </div>

        <AButton
          variant="outline"
          size="sm"
          icon={<ListChecks className="w-4 h-4 text-indigo-500" />}
          onClick={() => setIsModalVisible1(true)}
          className="h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
          title="Approver Hierarchy Matrix"
        >
          <span>Approvers</span>
        </AButton>
      </div>

      {/* 3. Four KPI Stat Summary Cards (flat style, responsive 2x2 on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: PENDING */}
        <StatCard
          title="PENDING"
          count={stats.pending}
          variant="amber"
          isActive={selectedStatusFilter === "Pending"}
          onClick={() => {
            setSelectedStatusFilter((prev) =>
              prev === "Pending" ? "All" : "Pending",
            );
          }}
          icon={<Clock className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />}
        />

        {/* Card 2: APPROVED */}
        <StatCard
          title="APPROVED"
          count={stats.approved}
          variant="emerald"
          isActive={selectedStatusFilter === "Approved"}
          onClick={() => {
            setSelectedStatusFilter((prev) =>
              prev === "Approved" ? "All" : "Approved",
            );
          }}
          icon={<CheckCircle2 className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />}
        />

        {/* Card 3: REJECTED */}
        <StatCard
          title="REJECTED"
          count={stats.rejected}
          variant="rose"
          isActive={selectedStatusFilter === "Rejected"}
          onClick={() => {
            setSelectedStatusFilter((prev) =>
              prev === "Rejected" ? "All" : "Rejected",
            );
          }}
          icon={<XCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />}
        />

        {/* Card 4: ALL RECORDS */}
        <StatCard
          title="ALL RECORDS"
          count={stats.all}
          variant="purple"
          isActive={selectedStatusFilter === "All"}
          onClick={() => {
            setSelectedStatusFilter("All");
          }}
          icon={<Layers className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />}
        />
      </div>

      {/* 4. Filter Bar Card (Fully responsive with no overflowing date fields) */}
      <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[175px_175px_1fr_1fr_auto] gap-3 sm:gap-3.5 items-end">
          {/* DATE FROM */}
          <div className="w-full min-w-0">
            <Einput
              type="date"
              title="DATE FROM"
              name="dateFrom"
              value={dateFrom}
              handleInputChange={(_, val) => setDateFrom(val)}
              ShortName
              className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-md font-medium text-slate-800 dark:text-slate-100 w-full"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            />
          </div>

          {/* DATE TO */}
          <div className="w-full min-w-0">
            <Einput
              type="date"
              title="DATE TO"
              name="dateTo"
              value={dateTo}
              handleInputChange={(_, val) => setDateTo(val)}
              ShortName
              className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-md font-medium text-slate-800 dark:text-slate-100 w-full"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            />
          </div>

          {/* STATUS (Eselect) */}
          <div className="w-full min-w-0">
            <Eselect
              title="STATUS"
              name="status"
              option={statusOptions}
              initialValue={selectedStatusFilter}
              handleInputChange={(_, val) => setSelectedStatusFilter(val)}
              ShortName
              placeholder="Select status"
              className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl font-medium w-full"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            />
          </div>

          {/* BRANCH (Eselect) */}
          <div className="w-full min-w-0">
            <Eselect
              title="BRANCH"
              name="branch"
              option={branchOptions}
              initialValue={selectedBranch}
              handleInputChange={(_, val) => setSelectedBranch(val)}
              ShortName
              placeholder="Select branch"
              className="!h-10 border-slate-300 dark:border-slate-700 rounded-xl font-medium w-full"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            />
          </div>

          {/* ACTION BUTTONS (Show & Reset using atoms/Button) */}
          <div className="sm:col-span-2 lg:col-span-1 flex items-center gap-2 w-full lg:w-auto">
            <AButton
              variant="primary"
              size="md"
              onClick={showData}
              className="flex-1 lg:flex-initial h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
            >
              Show
            </AButton>
            <AButton
              variant="outline"
              size="md"
              onClick={handleResetFilters}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
            >
              Reset
            </AButton>
          </div>
        </div>
      </div>

      {/* 5. Main Table Card Using Templates/reacttable (ReactTable) */}
      <ReactTable
        title="Punch records awaiting sign-off"
        columns={columns}
        data={filteredData}
        check={false}
        onlyOnecheck={false}
        selectValue="Utd"
        setsellectedrowdata={setSelectedRows}
        selectedRows={selectedRows}
        onRowDoubleClick={onRowDoubleClick}
        showColumnFilters={true}
        height={540}
        showTopSearch={false}
        showPageSizeInFooter={true}
        showExcelExport={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        columnsDownload={columnsForExcel}
        onExportAll={() => filteredData}
      />

      {/* 6. Punch Details Modal Dialog (Triggered on Row Double Click) */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mb-2">
              {/* 3-Dot Status Indicators */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((dot, index) => (
                  <span
                    key={index}
                    title={`Approval Level ${index + 1}`}
                    className={`w-3.5 h-3.5 rounded-full ${getDotColor(
                      index,
                      model.stat,
                      model.Man_Rej,
                    )}`}
                  />
                ))}
              </div>
            </div>

            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Employee Punch Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Review employee punch timings, reasons, and location photos before
              deciding.
            </DialogDescription>
          </DialogHeader>

          <hr className="my-4 border-slate-200 dark:border-slate-800" />

          {/* Employee Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Employee Code
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {model?.EmpCode || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Employee Name
              </span>
              <span
                className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                title={model?.EmpName}
              >
                {model?.EmpName || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Designation
              </span>
              <span
                className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                title={model?.EmployeeDesignation}
              >
                {model?.EmployeeDesignation || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Punch Date
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {formatDate(model?.Date)}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                In Time
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {model?.In1 || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Out Time
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {model?.Out1 || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Reason
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[65%] break-words">
                {model?.Mipunch_Reason || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Remark
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[65%] break-words">
                {model?.MI_Remark || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Special Remark
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[65%] break-words">
                {model?.Spl_Remark || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Head Name
              </span>
              <span
                className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                title={model?.head_remark_by}
              >
                {model?.head_remark_by || "N/A"}
              </span>
            </div>

            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/60 pb-2 gap-2">
              <span className="text-slate-500 font-medium shrink-0">
                Head Remark
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right max-w-[65%] break-words">
                {model?.head_remark || "N/A"}
              </span>
            </div>
          </div>

          {/* Punch Photos Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {/* In Image */}
            <div className="flex flex-col items-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                Punch In Image
              </span>
              <div className="h-44 w-full flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                {model?.fileIn && getImageUrl(model.fileIn) ? (
                  <img
                    src={getImageUrl(model.fileIn)}
                    alt="Punch In"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : null}
                <FaImage
                  className={`w-16 h-16 text-slate-300 dark:text-slate-700 ${
                    model?.fileIn && getImageUrl(model.fileIn) ? "hidden" : "block"
                  }`}
                />
              </div>
              <div className="mt-2">
                <FileViewer fileLink={getImageUrl(model?.fileIn)} celldata="" />
              </div>
            </div>

            {/* Out Image */}
            <div className="flex flex-col items-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2">
                Punch Out Image
              </span>
              <div className="h-44 w-full flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                {model?.fileOut && getImageUrl(model.fileOut) ? (
                  <img
                    src={getImageUrl(model.fileOut)}
                    alt="Punch Out"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : null}
                <FaImage
                  className={`w-16 h-16 text-slate-300 dark:text-slate-700 ${
                    model?.fileOut && getImageUrl(model.fileOut) ? "hidden" : "block"
                  }`}
                />
              </div>
              <div className="mt-2">
                <FileViewer fileLink={getImageUrl(model?.fileOut)} celldata="" />
              </div>
            </div>
          </div>

          {/* Action Box (Approve / Reject) */}
          {(model?.status_khud_ka == null ||
            model?.status_khud_ka === "" ||
            model?.status_khud_ka == 2) && (
            <div className="mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Approver Remark <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Enter remark for approval or rejection..."
                value={headRemark}
                onChange={(e) => setHeadRemark(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <AButton
                  variant="danger"
                  size="md"
                  icon={<X className="w-4 h-4 stroke-[2.5]" />}
                  onClick={() => handleAction("0")}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm"
                >
                  Reject
                </AButton>

                <AButton
                  variant="primary"
                  size="md"
                  icon={<Check className="w-4 h-4 stroke-[2.5]" />}
                  onClick={() => handleAction("1")}
                  className="px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700"
                >
                  Approve
                </AButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 8. Approver Hierarchy Modal Dialog */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Approver List
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Multi-tier approval matrix configured for attendance requests.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {apprData.length === 0 ? (
              <div className="text-center text-slate-400 py-10 text-sm">
                No approvers found for this module.
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                        <th className="p-3">Approver 1A</th>
                        <th className="p-3">Approver 1B</th>
                        <th className="p-3">Approver 2A</th>
                        <th className="p-3">Approver 2B</th>
                        <th className="p-3">Approver 3A</th>
                        <th className="p-3">Approver 3B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {apprData.map((item: any, idx: number) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="p-3 capitalize">
                            {item.approver1_A || "—"}
                          </td>
                          <td className="p-3 capitalize">
                            {item.approver1_B || "—"}
                          </td>
                          <td className="p-3 capitalize">
                            {item.approver2_A || "—"}
                          </td>
                          <td className="p-3 capitalize">
                            {item.approver2_B || "—"}
                          </td>
                          <td className="p-3 capitalize">
                            {item.approver3_A || "—"}
                          </td>
                          <td className="p-3 capitalize">
                            {item.approver3_B || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden space-y-3">
                  {apprData.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl bg-white dark:bg-slate-900 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-semibold text-slate-500">
                          Approver 1A:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {item.approver1_A || "—"}
                        </span>

                        <span className="font-semibold text-slate-500">
                          Approver 1B:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {item.approver1_B || "—"}
                        </span>

                        <span className="font-semibold text-slate-500">
                          Approver 2A:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {item.approver2_A || "—"}
                        </span>

                        <span className="font-semibold text-slate-500">
                          Approver 2B:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {item.approver2_B || "—"}
                        </span>

                        <span className="font-semibold text-slate-500">
                          Approver 3A:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {item.approver3_A || "—"}
                        </span>

                        <span className="font-semibold text-slate-500">
                          Approver 3B:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {item.approver3_B || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
