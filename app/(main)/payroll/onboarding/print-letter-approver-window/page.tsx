"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  BadgeCheck,
  XCircle,
  Layers,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Minus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Eye,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useToast } from "@/app/hooks/useToast";
import useExcelDownload from "@/app/hooks/excel-download";

import { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";
import Ainput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const formatDate = (dateString: any) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function PrintLetterApproverWindowPage() {
  const user = useCurrentUser() as any;
  const { toast } = useToast();
  const { handleExcelDownload } = useExcelDownload();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtereddata, setFiltereddata] = useState<any[]>([]);
  const [branch, setBranch] = useState<any[]>([]);
  const [selectedrowdata, setsellectedrowdata] = useState<any[]>([]);
  const [remark, setRemark] = useState<string>("");
  const [activeTabFilter, setActiveTabFilter] = useState<number | string>(2); // 2: Pending, 1: Approved, 0: Rejected, 'ALL': All

  // Detail Modal for Approver Chain
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const [dates, setDates] = useState({
    DATE_FROM: getCurrentDate(1),
    DATE_TO: getCurrentDate(),
    branch: user?.branch || "",
    status: 2,
  });

  const StatusOptions = [
    { value: 2, label: "Pending" },
    { value: 1, label: "Approved" },
    { value: 0, label: "Reject" },
    { value: "ALL", label: "All Requests" },
  ];

  // Helper for compCode
  const getCompCode = useCallback(() => {
    return (
      user?.Comp_Code ||
      user?.compcode ||
      user?.comp_code ||
      user?.COMP_CODE ||
      user?.company_code ||
      user?.DB ||
      ""
    );
  }, [user]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/payout/payout`,
        {
          dateFrom: dates.DATE_FROM,
          dateto: dates.DATE_TO,
          multi_loc: user?.branch || "",
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name,
            token: user?.email,
          },
        }
      );
      if (result.data?.branch && Array.isArray(result.data.branch)) {
        setBranch(result.data.branch);
        if (!dates.branch && result.data.branch.length > 0) {
          setDates((prev) => ({
            ...prev,
            branch: result.data.branch[0].value || result.data.branch[0].label || "",
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  }, [getCompCode, user?.branch, user?.name, user?.email, dates.DATE_FROM, dates.DATE_TO, dates.branch]);

  // Filter helper
  const filterByStatus = useCallback((data: any[], status: any) => {
    if (status === "ALL" || status === null || status === undefined) {
      return data;
    }
    return data.filter((item: any) => {
      if (status === 2 || status === "2") {
        return item.status_khud_ka == null || item.status_khud_ka == 2 || item.APPR_1_STAT == 2 || item.APPR_2_STAT == 2 || item.APPR_3_STAT == 2;
      }
      return item.status_khud_ka == status;
    });
  }, []);

  // Fetch data
  const showdata = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;

    setIsLoading(true);
    setsellectedrowdata([]);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/ApproverViewTemplates`,
        {
          username: user?.name,
          loc_code: dates?.branch || user?.branch || "",
          status: "", // Fetch all to calculate accurate counts for pending, approved, rejected, and all
          Appr_Code: user?.EMPCODE,
          DateFrom: dates.DATE_FROM,
          DateTo: dates.DATE_TO,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name,
          },
        }
      );

      const resData = result.data?.Result || [];
      setTabledata(resData);
      setFiltereddata(filterByStatus(resData, dates.status));
    } catch (err: any) {
      console.error("Error fetching approver data:", err);
      toast({
        title: err?.response?.data?.Message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getCompCode, user?.name, user?.EMPCODE, user?.branch, dates.branch, dates.status, dates.DATE_FROM, dates.DATE_TO, filterByStatus, toast]);

  // Initial load
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (getCompCode()) {
      showdata();
    }
  }, [user, getCompCode]);

  // Handle Input Changes
  const handleInputChange = (name: string, value: any) => {
    if (name === "status") {
      setActiveTabFilter(value);
      let newFiltered = filterByStatus(tabledata, value);
      setFiltereddata(newFiltered);
    }
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Stat Card click to filter
  const handleStatCardClick = (statusVal: number | string) => {
    setActiveTabFilter(statusVal);
    setDates((prev) => ({
      ...prev,
      status: statusVal as any,
    }));
    setFiltereddata(filterByStatus(tabledata, statusVal));
  };

  // Counts for Metric Cards
  const statsCounts = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    tabledata.forEach((item: any) => {
      if (item.status_khud_ka == 1) {
        approvedCount++;
      } else if (item.status_khud_ka == 0) {
        rejectedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      all: tabledata.length,
    };
  }, [tabledata]);

  // Approve action
  const handleApprove = async () => {
    if (selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Selection",
        text: "Please select at least one request to approve.",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Approve Letters?",
      text: `Are you sure you want to approve ${selectedrowdata.length} selected letter(s)?`,
      confirmButtonText: "Yes, Approve",
      confirmButtonColor: "#059669",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (confirmed.isConfirmed) {
      setIsLoading(true);
      const compCode = getCompCode();

      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/template/approveby2`,
          {
            tran_id: selectedrowdata,
            Appr_Code: user?.EMPCODE,
            Remark: remark || "",
          },
          {
            headers: {
              compcode: compCode,
              name: user?.name,
            },
          }
        );

        if (result.data?.status || result.status === 200) {
          toast({
            title: "Approved Successfully",
            variant: "default",
          });
          Swal.fire({
            icon: "success",
            title: "Approved",
            text: "Letters have been approved successfully.",
          });
          setsellectedrowdata([]);
          setRemark("");
          await showdata();
        }
      } catch (err: any) {
        toast({
          title: err?.response?.data?.Message || "Approval failed",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Reject action
  const handleReject = async () => {
    if (selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Selection",
        text: "Please select at least one request to reject.",
      });
      return;
    }

    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Please enter a remark before rejecting the letter(s).",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Reject Letters?",
      text: `This action will reject ${selectedrowdata.length} selected letter(s). Do you want to proceed?`,
      confirmButtonText: "Yes, Reject",
      confirmButtonColor: "#DC2626",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (confirmed.isConfirmed) {
      setIsLoading(true);
      const compCode = getCompCode();

      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/template/rejectby2`,
          {
            tran_id: selectedrowdata,
            Appr_Code: user?.EMPCODE,
            Remark: remark,
          },
          {
            headers: {
              compcode: compCode,
              name: user?.name,
            },
          }
        );

        if (result.data?.status || result.status === 200) {
          toast({
            title: "Rejected Successfully",
            variant: "default",
          });
          Swal.fire({
            icon: "info",
            title: "Rejected",
            text: "Letters have been rejected.",
          });
          setsellectedrowdata([]);
          setRemark("");
          await showdata();
        }
      } catch (err: any) {
        toast({
          title: err?.response?.data?.Message || "Rejection failed",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Excel export
  const exportToExcel = () => {
    if (filtereddata.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Data",
        text: "No requests available to export.",
      });
      return;
    }

    const excelColumns = [
      { Header: "ID", accessor: "TRAN_ID" },
      { Header: "Employee Code", accessor: "EMPCODE" },
      { Header: "Employee Name", accessor: "EMPLOYEENAME" },
      { Header: "Template Name", accessor: "TEMPLATENAME" },
      {
        Header: "Request Date",
        accessor: "REQUESTDATE",
        Cell: ({ value }: any) => formatDate(value),
      },
      { Header: "Requested By", accessor: "REQYESTEDEMPNAME" },
      { Header: "Approver 1", accessor: "apr1_name" },
      { Header: "Approver 1 Status", accessor: "APPR_1_STAT" },
      { Header: "Approver 1 Remark", accessor: "APPR_1_REM" },
      { Header: "Approver 2", accessor: "apr2_name" },
      { Header: "Approver 2 Status", accessor: "APPR_2_STAT" },
      { Header: "Approver 2 Remark", accessor: "APPR_2_REM" },
      { Header: "Approver 3", accessor: "apr3_name" },
      { Header: "Approver 3 Status", accessor: "APPR_3_STAT" },
      { Header: "Approver 3 Remark", accessor: "APPR_3_REM" },
    ];

    handleExcelDownload(excelColumns, filtereddata);
  };

  // Avatar helper
  const getAvatar = (name: string = "A") => {
    const palettes = [
      { bg: "#EEF2FF", text: "#4338CA" },
      { bg: "#ECFDF5", text: "#059669" },
      { bg: "#FEF3C7", text: "#D97706" },
      { bg: "#FEE2E2", text: "#DC2626" },
      { bg: "#F3E8FF", text: "#7C3AED" },
      { bg: "#E0F2FE", text: "#0284C7" },
    ];
    const initial = (name || "A").trim().charAt(0).toUpperCase();
    const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const color = palettes[hash % palettes.length];
    return { initial, color };
  };

  // Render chain level pill
  const renderChainPill = (level: string, status: any, isDefined: boolean, activeLevel: boolean) => {
    if (status == 1) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 w-[70px] h-8 sm:h-8.5 rounded-xl text-sm sm:text-base font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shadow-2xs shrink-0">
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{level}</span>
        </span>
      );
    }
    if (status == 0) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 w-[70px] h-8 sm:h-8.5 rounded-xl text-sm sm:text-base font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 shadow-2xs shrink-0">
          <X className="w-4 h-4 stroke-[2.5]" />
          <span>{level}</span>
        </span>
      );
    }
    if (isDefined && (status == 2 || (activeLevel && (status === null || status === undefined || status === "")))) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 w-[70px] h-8 sm:h-8.5 rounded-xl text-sm sm:text-base font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-2xs shrink-0">
          <Clock className="w-4 h-4 stroke-[2]" />
          <span>{level}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center gap-1.5 w-[70px] h-8 sm:h-8.5 rounded-xl text-sm sm:text-base font-semibold bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800 shrink-0">
        <span className="text-[#94A3B8] dark:text-slate-500 font-bold">—</span>
        <span>{level}</span>
      </span>
    );
  };

  // Render detail card inside modal / details
  const renderApproverCard = (levelNum: number, name: string, status: any, remarkText: string, prevStatusPassed: boolean) => {
    const isDefined = Boolean(name && name !== "null" && name !== "—" && name.trim() !== "");
    let statusLabel = "NOT REACHED";
    let badgeStyle = "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
    let icon = <Minus className="w-3.5 h-3.5 text-slate-400" />;

    if (!isDefined && status != 1 && status != 0) {
      statusLabel = "NOT DEFINED";
      badgeStyle = "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
      icon = <Minus className="w-3.5 h-3.5 text-slate-400" />;
    } else if (status == 1) {
      statusLabel = "APPROVED";
      badgeStyle = "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
      icon = <Check className="w-3.5 h-3.5 stroke-[2.5]" />;
    } else if (status == 0) {
      statusLabel = "REJECTED";
      badgeStyle = "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3] dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
      icon = <X className="w-3.5 h-3.5 stroke-[2.5]" />;
    } else if (status == 2 || (prevStatusPassed && (status === null || status === undefined))) {
      statusLabel = "PENDING";
      badgeStyle = "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A] dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800";
      icon = <Clock className="w-3.5 h-3.5 stroke-[2] text-[#D97706]" />;
    }

    return (
      <div className="bg-slate-50/70 dark:bg-[#0F172A] rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-5 flex flex-col justify-between min-h-0 sm:min-h-[145px] shadow-2xs">
        <div>
          <div className="flex items-center mb-1.5 sm:mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[11px] font-bold border uppercase tracking-wider whitespace-nowrap ${badgeStyle}`}>
              <span>{icon}</span>
              <span>APPROVER {levelNum} · {statusLabel}</span>
            </span>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-base leading-snug truncate">
            {name && name !== "null" ? name : "—"}
          </h4>
        </div>
        <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-slate-200/70 dark:border-slate-800/70 truncate">
          {!isDefined && status != 1 && status != 0
            ? "No approver defined for this level"
            : remarkText ||
            (status == 1
              ? "Approved without remarks"
              : statusLabel === "NOT REACHED"
                ? "Waiting for the previous level"
                : "No remark recorded")}
        </p>
      </div>
    );
  };

  // Columns definition for ServiceTablePagination
  const tableColumns = useMemo(
    () => [
      {
        Header: "ID",
        accessor: "TRAN_ID",
        Cell: ({ row }: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:text-xl">
            {row.original.TRAN_ID}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE CODE",
        accessor: "EMPCODE",
        Cell: ({ row }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 text-sm md:text-xl">
            {row.original.EMPCODE}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMPLOYEENAME",
        Cell: ({ row }: any) => {
          const { initial, color } = getAvatar(row.original.EMPLOYEENAME);
          return (
            <div className="flex items-center gap-2 md:gap-3">
              <div
                className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {initial}
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-xl truncate max-w-[140px] md:max-w-[180px]">
                {row.original.EMPLOYEENAME || "—"}
              </span>
            </div>
          );
        },
      },
      {
        Header: "TEMPLATE NAME",
        accessor: "TEMPLATENAME",
        Cell: ({ row }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 text-sm md:text-xl">
            {row.original.TEMPLATENAME || row.original.TEMPLATE_NAME || "Letter"}
          </span>
        ),
      },
      {
        Header: "REQUEST DATE",
        accessor: "REQUESTDATE",
        Cell: ({ row }: any) => (
          <span className="text-slate-500 dark:text-slate-400 text-sm md:text-xl font-medium">
            {formatDate(row.original.REQUESTDATE || row.original.REQ_DATE)}
          </span>
        ),
      },
      {
        Header: "REQUESTED BY",
        accessor: "REQYESTEDEMPNAME",
        Cell: ({ row }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-sm md:text-xl truncate block max-w-[140px] md:max-w-[180px]">
            {row.original.REQYESTEDEMPNAME || row.original.Created_By || "—"}
          </span>
        ),
      },
      {
        Header: "APPROVAL CHAIN",
        accessor: "APPROVAL_CHAIN",
        Cell: ({ row }: any) => {
          const isL1 = Boolean(row.original.apr1_name && row.original.apr1_name !== "null" && row.original.apr1_name !== "—");
          const isL2 = Boolean(row.original.apr2_name && row.original.apr2_name !== "null" && row.original.apr2_name !== "—");
          const isL3 = Boolean(row.original.apr3_name && row.original.apr3_name !== "null" && row.original.apr3_name !== "—");

          return (
            <div className="flex items-center justify-start gap-1.5 min-w-[225px]">
              {renderChainPill("L1", row.original.APPR_1_STAT, isL1 || true, true)}
              {renderChainPill("L2", row.original.APPR_2_STAT, isL2, row.original.APPR_1_STAT == 1 && isL2)}
              {renderChainPill("L3", row.original.APPR_3_STAT, isL3, row.original.APPR_2_STAT == 1 && isL3)}
            </div>
          );
        },
      },
      {
        Header: "DOCUMENT",
        accessor: "PDF_PATH",
        Cell: ({ row }: any) => {
          const fileLink = row.original.PDF_PATH
            ? `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(row.original.PDF_PATH)}`
            : null;

          return (
            <div className="flex items-center justify-end">
              <div className="inline-flex items-center rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 overflow-hidden shadow-2xs">
                {fileLink ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(fileLink, "_blank");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 transition-colors"
                    title="View PDF"
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 text-sm font-semibold text-slate-400">
                    No PDF
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRowDetail(row.original);
                    setIsDetailModalOpen(true);
                  }}
                  className="px-2 py-1.5 border-l border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 transition-colors"
                  title="View Approver Chain Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
},
      },
    ],
[]
  );

return (
  <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#070D18] flex flex-col justify-between text-slate-800 dark:text-slate-100 pb-28">
    {/* ── TOP HEADER ──────────────────────────────────────────────── */}
    <div className="w-full px-4 sm:px-6 pt-5 pb-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Print letter approver grid
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mt-0.5">
            Three-level sign-off on every letter before it reaches the employee. Your pending queue is highlighted.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xl font-semibold shadow-2xs transition-all duration-150"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* ── 4 STAT CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        <StatCard
          title="AWAITING MY SIGN-OFF"
          count={statsCounts.pending}
          icon={<Clock className="w-5 h-5 !text-yellow-500 dark:!text-yellow-400" style={{ color: "#EAB308" }} />}
          isActive={activeTabFilter === 2}
          onClick={() => handleStatCardClick(2)}
          activeClassName="bg-white dark:bg-[#0B1220] border-2 border-indigo-500 dark:border-indigo-400 shadow-sm"
          inactiveClassName="bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
          iconClassName="!w-8 !h-8 !rounded-lg !bg-yellow-50 dark:!bg-yellow-950/40 !border !border-yellow-200 dark:!border-yellow-800/60 !text-yellow-500 dark:!text-yellow-400"
          titleClassName="!text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider"
          countClassName="!text-3xl font-extrabold text-slate-900 dark:text-slate-100"
          className="!h-[108px] !min-h-[108px] !rounded-2xl !p-4 flex flex-col justify-between"
        />

        <StatCard
          title="APPROVED"
          count={statsCounts.approved}
          icon={<CheckCircle2 className="w-5 h-5 !text-emerald-500 dark:!text-emerald-400" style={{ color: "#10B981" }} />}
          isActive={activeTabFilter === 1}
          onClick={() => handleStatCardClick(1)}
          activeClassName="bg-white dark:bg-[#0B1220] border-2 border-indigo-500 dark:border-indigo-400 shadow-sm"
          inactiveClassName="bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
          iconClassName="!w-8 !h-8 !rounded-lg !bg-emerald-50 dark:bg-emerald-950/40 !border !border-emerald-200 dark:!border-emerald-800/60 !text-emerald-500 dark:!text-emerald-400"
          titleClassName="!text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider"
          countClassName="!text-3xl font-extrabold text-slate-900 dark:text-slate-100"
          className="!h-[108px] !min-h-[108px] !rounded-2xl !p-4 flex flex-col justify-between"
        />

        <StatCard
          title="REJECTED"
          count={statsCounts.rejected}
          icon={<XCircle className="w-5 h-5 !text-rose-500 dark:!text-rose-400" style={{ color: "#F43F5E" }} />}
          isActive={activeTabFilter === 0}
          onClick={() => handleStatCardClick(0)}
          activeClassName="bg-white dark:bg-[#0B1220] border-2 border-indigo-500 dark:border-indigo-400 shadow-sm"
          inactiveClassName="bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
          iconClassName="!w-8 !h-8 !rounded-lg !bg-rose-50 dark:bg-rose-950/40 !border !border-rose-200 dark:!border-rose-800/60 !text-rose-500 dark:text-rose-400"
          titleClassName="!text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider"
          countClassName="!text-3xl font-extrabold text-slate-900 dark:text-slate-100"
          className="!h-[108px] !min-h-[108px] !rounded-2xl !p-4 flex flex-col justify-between"
        />

        <StatCard
          title="ALL REQUESTS"
          count={statsCounts.all}
          icon={<Layers className="w-5 h-5 !text-purple-500 dark:!text-purple-400" style={{ color: "#A855F7" }} />}
          isActive={activeTabFilter === "ALL"}
          onClick={() => handleStatCardClick("ALL")}
          activeClassName="bg-white dark:bg-[#0B1220] border-2 border-indigo-500 dark:border-indigo-400 shadow-sm"
          inactiveClassName="bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
          iconClassName="!w-8 !h-8 !rounded-lg !bg-purple-50 dark:bg-purple-950/40 !border !border-purple-200 dark:!border-purple-800/60 !text-purple-500 dark:!text-purple-400"
          titleClassName="!text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider"
          countClassName="!text-3xl font-extrabold text-slate-900 dark:text-slate-100"
          className="!h-[108px] !min-h-[108px] !rounded-2xl !p-4 flex flex-col justify-between"
        />
      </div>

      {/* ── FILTER CONTROLS CARD ─────────────────────────────────── */}
      <div className="mt-4 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-2">
            <Ainput
              title="DATE FROM"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleInputChange}
            />
          </div>

          <div className="md:col-span-2">
            <Ainput
              title="DATE TO"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleInputChange}
            />
          </div>

          <div className="md:col-span-4">
            <Eselect
              title="BRANCH"
              name="branch"
              option={[{ value: "", label: "All Branches" }, ...branch]}
              initialValue={dates.branch}
              handleInputChange={handleInputChange}
              placeholder="Select Branch"
            />
          </div>

          <div className="md:col-span-3">
            <Eselect
              title="STATUS"
              name="status"
              option={StatusOptions}
              initialValue={dates.status}
              handleInputChange={handleInputChange}
              placeholder="Select Status"
            />
          </div>

          <div className="md:col-span-1">
            <button
              onClick={showdata}
              className="h-9 w-full rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-xs flex items-center justify-center transition-all duration-150"
            >
              Show
            </button>
          </div>
        </div>
      </div>

      {/* ── SERVICE TABLE PAGINATION (ReactTable Component) ──────── */}
      <div className="mt-4 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        <ServiceTablePagination
          columns={tableColumns}
          data={filtereddata}
          check={dates.status == 2 || activeTabFilter == 2}
          selectValue="TRAN_ID"
          selectedRows={selectedrowdata}
          setsellectedrowdata={setsellectedrowdata}
          height={520}
          showTopSearch={true}
          searchPlaceholder="Search by ID, name, code, template..."
          showExcelExport={false}
          onRowDoubleClick={(row: any) => {
            setSelectedRowDetail(row);
            setIsDetailModalOpen(true);
          }}
        />

        {/* Legend row */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 flex items-center justify-end gap-5 text-base font-medium text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span>Approved</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-400 border border-orange-400 shadow-2xs shrink-0" />
            <span>Pending</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
            <span>Rejected</span>
          </span>
        </div>
      </div>
    </div>

    {/* ── BOTTOM STICKY ACTION BAR (Only in Pending view) ──────────── */}
    {(dates.status == 2 || activeTabFilter == 2) && (
      <div className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-4 sm:px-8 py-3 sm:py-3.5 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-[left] duration-150 ease-in-out">
        <div className="flex items-center gap-3 flex-1 sm:max-w-2xl">
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 shrink-0">
            {selectedrowdata.length} selected
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder="Remark (required when rejecting)..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full h-10 sm:h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1A2D] px-3.5 sm:px-4 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-2xs outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={handleReject}
            disabled={selectedrowdata.length === 0}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-12 px-4 sm:px-7 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/40 text-sm sm:text-base font-bold shadow-2xs transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Reject</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={selectedrowdata.length === 0}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-12 px-4 sm:px-7 rounded-xl bg-[#64748B] hover:bg-[#475569] dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm sm:text-base font-bold shadow-xs transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Approve</span>
          </button>
        </div>
      </div>
    )}

    {/* ── DETAIL MODAL: 3 APPROVER CARDS ───────────────────────────── */}
    <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
      <DialogContent
        style={{ maxWidth: "880px" }}
        className="bg-white dark:bg-[#0B1220] !border !border-slate-200 dark:!border-slate-800 p-3.5 sm:p-7 rounded-2xl !shadow-2xl w-[94vw] max-h-[92vh] overflow-y-auto"
      >
        <DialogHeader className="pr-6 sm:pr-0 mb-2 sm:mb-4">
          <DialogTitle className="text-xs sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between leading-snug">
            <span>
              Approval Chain Details — {selectedRowDetail?.EMPLOYEENAME || "Employee"} (
              {selectedRowDetail?.EMPCODE || "—"})
            </span>
          </DialogTitle>
        </DialogHeader>

        {selectedRowDetail && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 mt-1 sm:mt-4">
            {renderApproverCard(
              1,
              selectedRowDetail.apr1_name,
              selectedRowDetail.APPR_1_STAT,
              selectedRowDetail.APPR_1_REM,
              true
            )}
            {renderApproverCard(
              2,
              selectedRowDetail.apr2_name,
              selectedRowDetail.APPR_2_STAT,
              selectedRowDetail.APPR_2_REM,
              selectedRowDetail.APPR_1_STAT == 1
            )}
            {renderApproverCard(
              3,
              selectedRowDetail.apr3_name,
              selectedRowDetail.APPR_3_STAT,
              selectedRowDetail.APPR_3_REM,
              selectedRowDetail.APPR_2_STAT == 1
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    <HashloaderComponent isLoading={isLoading} />
  </div>
);
}
