"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock3,
  CircleCheck,
  CircleX,
  Layers3,
  Check,
  Minus,
  Eye,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import { useCurrentUser } from "@/app/hooks/use-current-user";

type ApprovalLevel = "approved" | "pending" | "waiting" | "rejected";

const cardClass =
  "min-w-0 rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] transition-colors dark:border-[#1F2937] dark:bg-[#111827] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]";

const inputClass =
  "!h-[38px] w-full min-w-0 !rounded-[9px] !border border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] px-2.5 py-2 !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] outline-none transition placeholder:text-[#64748B]/70 dark:placeholder:text-[#94A3B8]/70 focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!ring-0 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50 !shadow-none";

const selectTriggerClass =
  "!h-[38px] w-full min-w-0 !rounded-[9px] !border border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] px-2.5 !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] focus-within:!border-[#4F46E5] dark:focus-within:!border-[#8B84FF] focus-within:!ring-0 !shadow-none";

interface TransferRequest {
  UTD: number | string;
  EmpCode: string;
  Emp_Name: string;
  CurrtBranch_name: string;
  TransferTo_name: string;
  NewCreatedAt: string;
  RequestedBy: string;
  status_khud_ka?: number | string | null;
  APPR_1_STAT?: number | string | null;
  APPR_2_STAT?: number | string | null;
  APPR_3_STAT?: number | string | null;
  APPR_1_REM?: string;
  APPR_2_REM?: string;
  APPR_3_REM?: string;
  apr1_name?: string;
  apr2_name?: string;
  apr3_name?: string;
  [key: string]: any;
}

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "All", label: "All" },
];

const getCurrentDate = (monthsBack = 0) => {
  const today = new Date();

  if (monthsBack === 0) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(today.getDate()).padStart(2, "0")}`;
  }

  const target = new Date(
    today.getFullYear(),
    today.getMonth() - monthsBack,
    1,
  );

  const day = Math.min(
    today.getDate(),
    new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate(),
  );

  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
};

const getApprovalLevel = (value: any): ApprovalLevel => {
  if (value === 1 || value === "1") return "approved";
  if (value === 0 || value === "0") return "rejected";
  if (value === 2 || value === "2") return "pending";
  return "waiting";
};

// IMPORTANT: Keep this function outside the component and above
// stats, transferColumns, and filteredRequests.
const getRequestStatus = (
  item: TransferRequest,
): "Pending" | "Approved" | "Rejected" => {
  const currentStatus = String(item.status_khud_ka ?? "")
    .trim()
    .toLowerCase();

  if (["1", "approved", "approve"].includes(currentStatus)) {
    return "Approved";
  }

  if (["0", "rejected", "reject"].includes(currentStatus)) {
    return "Rejected";
  }

  if (["2", "pending"].includes(currentStatus)) {
    return "Pending";
  }

  const levels = [item.APPR_1_STAT, item.APPR_2_STAT, item.APPR_3_STAT].map(
    (value) => getApprovalLevel(value),
  );

  if (levels.includes("rejected")) return "Rejected";
  if (levels.includes("pending")) return "Pending";

  if (levels.every((value) => value === "approved")) {
    return "Approved";
  }

  return "Pending";
};

const formatDate = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB").replace(/\//g, "-");
};

export default function EmpLocTranshfr() {
  const user = useCurrentUser();

  const [expandedRows, setExpandedRows] = useState<(number | string)[]>([]);
  const [selectedRows, setSelectedRows] = useState<(number | string)[]>([]);
  const [remark, setRemark] = useState("");

  const [dateFrom, setDateFrom] = useState(getCurrentDate(1));
  const [dateTo, setDateTo] = useState(getCurrentDate());
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("Pending");

  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>(
    [],
  );

  const [branchOptions, setBranchOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [statusDialogRequest, setStatusDialogRequest] =
    useState<TransferRequest | null>(null);

  const getStepStatus = (
    value: unknown,
    previousStatus?: unknown,
  ): "approved" | "pending" | "rejected" | "waiting" => {
    const current = String(value ?? "")
      .trim()
      .toLowerCase();

    if (["1", "approved", "approve"].includes(current)) {
      return "approved";
    }

    if (["0", "rejected", "reject"].includes(current)) {
      return "rejected";
    }

    if (["2", "pending"].includes(current)) {
      return "pending";
    }

    const previous = String(previousStatus ?? "")
      .trim()
      .toLowerCase();

    if (["1", "approved", "approve"].includes(previous)) {
      return "pending";
    }

    return "waiting";
  };

  const getStepStatusLabel = (stepStatus: string) => {
    switch (stepStatus) {
      case "approved":
        return "APPROVED";
      case "pending":
        return "PENDING";
      case "rejected":
        return "REJECTED";
      default:
        return "NOT REACHED";
    }
  };

  const getStepIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case "approved":
        return <Check size={18} className="text-emerald-600" />;
      case "pending":
        return <Clock3 size={18} className="text-orange-500" />;
      case "rejected":
        return <CircleX size={18} className="text-rose-600" />;
      default:
        return <Minus size={18} className="text-slate-400" />;
    }
  };

  // -------------------------------------------------------
  // Notifications
  // -------------------------------------------------------

  const notify = (
    title: string,
    description?: string,
    variant: "default" | "destructive" = "default",
  ) => {
    void Swal.fire({
      icon: variant === "destructive" ? "error" : "success",
      title,
      text: description,
      confirmButtonText: "OK",
      confirmButtonColor: variant === "destructive" ? "#e11d48" : "#4f46e5",
    });
  };

  // -------------------------------------------------------
  // Normalize API records
  // -------------------------------------------------------

  const normalizeRequest = (item: any): TransferRequest => ({
    ...item,

    UTD: item.UTD ?? item.tran_id ?? item.TRAN_ID ?? item.id,

    EmpCode: item.EmpCode ?? item.EMPCODE ?? item.Emp_Code ?? "",

    Emp_Name:
      item.EMPLOYEENAME ?? item.Emp_Name ?? item.EMP_NAME ?? item.EmpName ?? "",

    CurrtBranch_name:
      item.CurrtBranchName ?? item.CurrtBranch_name ?? item.CurrtBranch ?? "",

    TransferTo_name:
      item.TransferToName ?? item.TransferTo_name ?? item.TransferTo ?? "",

    NewCreatedAt:
      item.REQUESTDATE ??
      item.NewCreatedAt ??
      item.CreatedAt ??
      item.CREATED_AT ??
      "",

    RequestedBy:
      item.REQYESTEDEMPNAME ?? item.RequestedBy ?? item.RequestedByName ?? "",

    status_khud_ka: item.status_khud_ka,

    APPR_1_STAT: item.APPR_1_STAT,
    APPR_2_STAT: item.APPR_2_STAT,
    APPR_3_STAT: item.APPR_3_STAT,

    APPR_1_REM: item.APPR_1_REM ?? "",
    APPR_2_REM: item.APPR_2_REM ?? "",
    APPR_3_REM: item.APPR_3_REM ?? "",

    apr1_name: item.apr1_name ?? item.APPR_1_NAME ?? "",
    apr2_name: item.apr2_name ?? item.APPR_2_NAME ?? "",
    apr3_name: item.apr3_name ?? item.APPR_3_NAME ?? "",
  });

  // -------------------------------------------------------
  // Fetch transfer requests
  // API: POST /employee/ApproverViewLocTransfr
  // -------------------------------------------------------

  const showdata = useCallback(async () => {
    if (!user?.Comp_Code || !user?.EMPCODE) {
      notify(
        "User information unavailable",
        "Please refresh the page and try again.",
        "destructive",
      );
      return;
    }

    if (!branch) {
      return;
    }

    if (!dateFrom || !dateTo) {
      notify("Dates required", "Please select both dates.", "destructive");
      return;
    }

    if (dateFrom > dateTo) {
      notify(
        "Invalid date range",
        "Date From cannot be later than Date To.",
        "destructive",
      );
      return;
    }

    const statusMap: Record<string, number | null> = {
      Pending: 2,
      Approved: 1,
      Rejected: 0,
      All: null,
    };

    setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ApproverViewLocTransfr`,
        {
          username: user.name,
          loc_code: branch,
          status: statusMap[status] ?? 2,
          Appr_Code: user.EMPCODE,
          DateFrom: dateFrom,
          DateTo: dateTo,
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      console.log("Approval requests:", result.data);

      const response = result.data;

      if (
        response?.success === false ||
        response?.Status === false ||
        response?.status === false
      ) {
        throw new Error(
          response?.Message ??
            response?.message ??
            "Unable to load transfer requests.",
        );
      }

      const records = Array.isArray(response?.Result)
        ? response.Result
        : Array.isArray(response?.data?.Result)
          ? response.data.Result
          : [];

      const normalizedRecords: TransferRequest[] = records
        .map(normalizeRequest)
        .filter((item: TransferRequest) => item.UTD != null);

      setTransferRequests(normalizedRecords);
      setSelectedRows([]);
      setExpandedRows([]);
      setRemark("");
      setHasLoaded(true);
    } catch (error: any) {
      console.error(
        "Approval requests API error:",
        error?.response?.data ?? error?.message ?? error,
      );

      setTransferRequests([]);
      setSelectedRows([]);
      setHasLoaded(false);

      notify(
        "Unable to load requests",
        error?.response?.data?.Message ??
          error?.response?.data?.message ??
          error?.message ??
          "Please try again.",
        "destructive",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.EMPCODE,
    user?.name,
    branch,
    dateFrom,
    dateTo,
    status,
  ]);

  // -------------------------------------------------------
  // Load branch options
  // API: POST /payout/payout
  // -------------------------------------------------------

  const api = useCallback(async () => {
    if (!user?.Comp_Code) return;

    setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/payout/payout`,
        {
          dateFrom,
          dateto: dateTo,
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

      const branchData = result.data?.branch;

      if (!Array.isArray(branchData)) {
        console.error("Invalid branch response:", result.data);
        setBranchOptions([]);
        setBranch("");
        return;
      }

      const options = branchData
        .map((item: any) => ({
          ...item,
          value: String(
            item.value ??
              item.LOC_CODE ??
              item.loc_code ??
              item.BRANCH_CODE ??
              "",
          ),
          label: String(
            item.label ??
              item.LOC_NAME ??
              item.loc_name ??
              item.BRANCH_NAME ??
              "",
          ),
        }))
        .filter((item: any) => item.value && item.label);

      setBranchOptions(options);

      setBranch((previous) => {
        if (previous && options.some((item: any) => item.value === previous)) {
          return previous;
        }

        const userBranch = String(user?.branch ?? "");

        return (
          options.find((item: any) => item.value === userBranch)?.value ??
          options[0]?.value ??
          ""
        );
      });
    } catch (error: any) {
      console.error(
        "Payout API error:",
        error?.response?.data ?? error?.message ?? error,
      );

      notify(
        "Unable to load branches",
        error?.response?.data?.Message ??
          error?.response?.data?.message ??
          "Please try again.",
        "destructive",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    user?.name,
    user?.email,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (user?.Comp_Code) {
      void api();
    }
  }, [api, user?.Comp_Code]);

  useEffect(() => {
    if (branch && user?.Comp_Code && user?.EMPCODE && dateFrom && dateTo) {
      void showdata();
    }
  }, [
    branch,
    dateFrom,
    dateTo,
    status,
    user?.Comp_Code,
    user?.EMPCODE,
    showdata,
  ]);

  // -------------------------------------------------------
  // Select / deselect rows
  // -------------------------------------------------------

  const toggleSelection = (id: number | string, checked: boolean) => {
    setSelectedRows((previous) => {
      if (checked) {
        return previous.includes(id) ? previous : [...previous, id];
      }

      return previous.filter((item) => item !== id);
    });
  };

  const toggleAllRows = (checked: boolean) => {
    if (checked && status === "Pending") {
      setSelectedRows(
        filteredRequests
          .filter((item) => item.UTD != null)
          .map((item) => item.UTD),
      );
    } else {
      setSelectedRows([]);
    }
  };

  const toggleRow = (id: number | string) => {
    setExpandedRows((previous) =>
      previous.includes(id)
        ? previous.filter((rowId) => rowId !== id)
        : [...previous, id],
    );
  };

  // -------------------------------------------------------
  // Approve / reject requests
  // -------------------------------------------------------

  const handleApprovalAction = async (action: "approve" | "reject") => {
    if (isLoading) return;

    if (!selectedRows.length) {
      notify(
        "No requests selected",
        "Please select at least one transfer request.",
        "destructive",
      );
      return;
    }

    if (!user?.Comp_Code || !user?.EMPCODE) {
      notify(
        "User information unavailable",
        "Please refresh the page and try again.",
        "destructive",
      );
      return;
    }

    if (action === "reject" && !remark.trim()) {
      notify(
        "Remark required",
        "Please enter a remark before rejecting.",
        "destructive",
      );
      return;
    }

    const confirmation = await Swal.fire({
      icon: "warning",
      title: action === "approve" ? "Approve requests?" : "Reject requests?",
      text: `You are about to ${
        action === "approve" ? "approve" : "reject"
      } ${selectedRows.length} selected request(s). This action may not be reversible.`,
      showCancelButton: true,
      confirmButtonText: action === "approve" ? "Yes, Approve" : "Yes, Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: action === "approve" ? "#4f46e5" : "#e11d48",
    });

    if (!confirmation.isConfirmed) return;

    setIsLoading(true);

    try {
      const endpoint =
        action === "approve"
          ? "/employee/approvechangeLoc"
          : "/employee/rejectchangeLoc";

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${endpoint}`,
        {
          tran_id: selectedRows,
          Appr_Code: user.EMPCODE,
          Remark: remark.trim(),
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      const response = result.data;

      console.log(`${action} API response:`, response);

      const apiStatus =
        response?.status ?? response?.Status ?? response?.success;

      const isSuccess =
        apiStatus === true ||
        apiStatus === 1 ||
        apiStatus === "1" ||
        apiStatus === "true" ||
        apiStatus === "success" ||
        apiStatus === "Success" ||
        response?.success === true;

      if (!isSuccess) {
        notify(
          "Action failed",
          response?.Message ??
            response?.message ??
            "The server did not confirm the action.",
          "destructive",
        );
        return;
      }

      setSelectedRows([]);
      setRemark("");

      await Swal.fire({
        icon: "success",
        title:
          action === "approve"
            ? "Approved successfully"
            : "Rejected successfully",
        text:
          response?.Message ??
          response?.message ??
          "The request has been processed successfully.",
        confirmButtonText: "OK",
        confirmButtonColor: "#4f46e5",
      });

      await showdata();
    } catch (error: any) {
      console.error(
        `${action} request error:`,
        error?.response?.data ?? error?.message ?? error,
      );

      notify(
        action === "approve" ? "Approval failed" : "Rejection failed",
        error?.response?.data?.Message ??
          error?.response?.data?.message ??
          error?.message ??
          "Please try again.",
        "destructive",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------
  // Summary cards
  // -------------------------------------------------------

  const stats = useMemo(() => {
    const pending = transferRequests.filter(
      (item) => getRequestStatus(item) === "Pending",
    ).length;

    const approved = transferRequests.filter(
      (item) => getRequestStatus(item) === "Approved",
    ).length;

    const rejected = transferRequests.filter(
      (item) => getRequestStatus(item) === "Rejected",
    ).length;

    return [
      {
        title: "AWAITING SIGN-OFF",
        count: pending,
        value: "Pending",
        icon: Clock3,
        tint: "#F59E0B",
        tintBg: "rgba(245,158,11,0.15)",
      },
      {
        title: "APPROVED",
        count: approved,
        value: "Approved",
        icon: CircleCheck,
        tint: "#10B981",
        tintBg: "rgba(16,185,129,0.15)",
      },
      {
        title: "REJECTED",
        count: rejected,
        value: "Rejected",
        icon: CircleX,
        tint: "#E11D48",
        tintBg: "rgba(225,29,72,0.15)",
      },
      {
        title: "ALL REQUESTS",
        count: transferRequests.length,
        value: "All",
        icon: Layers3,
        tint: "#4F46E5",
        tintBg: "rgba(79,70,229,0.15)",
      },
    ];
  }, [transferRequests]);

  // -------------------------------------------------------
  // Table columns
  // -------------------------------------------------------

  const filteredRequests = useMemo(() => {
    if (status === "All") return transferRequests;

    return transferRequests.filter((item) => getRequestStatus(item) === status);
  }, [transferRequests, status]);

  const allRowsSelected =
    status === "Pending" &&
    filteredRequests.length > 0 &&
    filteredRequests.every((item) => selectedRows.includes(item.UTD));

  const transferColumns = useMemo(
    () => [
      {
        Header:
          status === "Pending" ? (
            <input
              type="checkbox"
              aria-label="Select all pending requests"
              checked={allRowsSelected}
              onChange={(event) => toggleAllRows(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[#4F46E5]"
            />
          ) : (
            <span className="sr-only">Selection</span>
          ),
        accessor: "select",
        disableSortBy: true,

        Cell: ({ row }: any) =>
          status === "Pending" ? (
            <input
              type="checkbox"
              aria-label={`Select request ${row.original.UTD}`}
              checked={selectedRows.includes(row.original.UTD)}
              onChange={(event) =>
                toggleSelection(row.original.UTD, event.target.checked)
              }
              className="h-4 w-4 cursor-pointer accent-[#4F46E5]"
            />
          ) : (
            <span className="block w-4" />
          ),
      },

      {
        Header: "ID",
        accessor: "UTD",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] tabular-nums text-[#64748B] dark:text-[#94A3B8]">
            {value ?? "—"}
          </span>
        ),
      },

      {
        Header: "EMPLOYEE CODE",
        accessor: "EmpCode",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
            {value ?? "—"}
          </span>
        ),
      },

      {
        Header: "EMPLOYEE NAME",
        accessor: "Emp_Name",
        Cell: ({ value }: any) => {
          const initials = String(value || "?")
            .trim()
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div className="flex min-w-0 items-center gap-[9px] py-1.5">
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[10.5px] font-semibold text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                {initials}
              </span>
              <span className="truncate text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                {value || "—"}
              </span>
            </div>
          );
        },
      },

      {
        Header: "CURRENT BRANCH",
        accessor: "CurrtBranch_name",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "TRANSFER TO",
        accessor: "TransferTo_name",
        Cell: ({ value }: any) => (
          <div className="flex items-center gap-1.5 min-w-0">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#4F46E5] dark:text-[#8B84FF]" />
            <span className="truncate text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
              {value || "—"}
            </span>
          </div>
        ),
      },

      {
        Header: "REQUEST DATE",
        accessor: "NewCreatedAt",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] tabular-nums text-[#64748B] dark:text-[#94A3B8]">
            {formatDate(value) || "—"}
          </span>
        ),
      },

      {
        Header: "REQUEST BY",
        accessor: "RequestedBy",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "APPROVAL CHAIN",
        accessor: "approvalChain",
        disableSortBy: true,

        Cell: ({ row }: any) => {
          const item = row.original;

          const levels = [
            {
              label: "L1",
              name: item.apr1_name,
              status: getApprovalLevel(item.APPR_1_STAT),
              remark: item.APPR_1_REM,
            },
            {
              label: "L2",
              name: item.apr2_name,
              status: getApprovalLevel(item.APPR_2_STAT),
              remark: item.APPR_2_REM,
            },
            {
              label: "L3",
              name: item.apr3_name,
              status: getApprovalLevel(item.APPR_3_STAT),
              remark: item.APPR_3_REM,
            },
          ];

          const rowId = item.UTD;

          return (
            <div className="flex min-w-[190px] flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {levels.map((level) => {
                  const approved = level.status === "approved";
                  const rejected = level.status === "rejected";
                  const pending = level.status === "pending";

                  const Icon = approved
                    ? Check
                    : rejected
                      ? CircleX
                      : pending
                        ? Clock3
                        : Minus;

                  const badgeStyle = approved
                    ? {
                        color: "#10B981",
                        backgroundColor: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.33)",
                      }
                    : rejected
                      ? {
                          color: "#E11D48",
                          backgroundColor: "rgba(225,29,72,0.08)",
                          border: "1px solid rgba(225,29,72,0.33)",
                        }
                      : pending
                        ? {
                            color: "#F59E0B",
                            backgroundColor: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.33)",
                          }
                        : {
                            color: "#94A3B8",
                            backgroundColor: "rgba(148,163,184,0.08)",
                            border: "1px solid rgba(148,163,184,0.33)",
                          };

                  return (
                    <span
                      key={level.label}
                      title={`${level.name ?? level.label}${
                        level.remark ? ` — ${level.remark}` : ""
                      }`}
                      style={badgeStyle}
                      className="inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap"
                    >
                      <Icon size={11} className="shrink-0" />
                      {level.label}
                    </span>
                  );
                })}
              </div>

              {expandedRows.includes(rowId) && (
                <div className="space-y-1 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-[11px] text-[#64748B] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#94A3B8]">
                  {levels.map((level) => (
                    <div key={level.label}>
                      <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                        {level.label} {level.name || "Approver"}:
                      </span>{" "}
                      <span className="break-words">
                        {level.remark || "No remark"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },

      {
        id: "status",
        Header: "Status",
        accessor: "status",
        Cell: ({ row }: any) => {
          const request = row.original;

          return (
            <button
              type="button"
              title="View approval status"
              onClick={() => setStatusDialogRequest(request)}
              className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[7px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#4F46E5] hover:text-[#4338CA] hover:bg-[#EEF2FF] dark:text-[#8B84FF] dark:hover:text-[#A5B4FC] dark:hover:bg-[#1E1B4B] transition shadow-sm cursor-pointer"
            >
              <Eye size={14} className="text-[#4F46E5] dark:text-[#8B84FF]" />
            </button>
          );
        },
      },
    ],
    [allRowsSelected, selectedRows, expandedRows, status],
  );

  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-64 font-['Inter',system-ui,sans-serif] [font-feature-settings:'tnum'_1] text-[13px] text-[#1E293B] antialiased transition-colors dark:bg-[#0A0F1C] dark:text-[#E7ECF3] sm:pb-48 lg:pb-28">
      <div className="mx-auto w-full max-w-[1800px] p-3 sm:p-5 lg:p-6">
        {/* Header */}
        <header className="mb-4 sm:mb-[18px]">
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Location transfer approvals
          </h1>

          <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Each request carries its own three-level chain. Expand a row to read
            the remarks left at every level.
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-[14px] min-[480px]:grid-cols-2 xl:grid-cols-4 mb-[14px]">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isActive = status === stat.value;

            return (
              <button
                key={stat.title}
                type="button"
                onClick={() => {
                  setStatus(stat.value);
                  setSelectedRows([]);
                  setExpandedRows([]);
                }}
                className={cn(
                  "text-left rounded-[12px] bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-[14px_16px] cursor-pointer transition-colors border",
                  isActive
                    ? "border-[#4F46E5] dark:border-[#8B84FF]"
                    : "border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#4F46E5] dark:hover:border-[#8B84FF]"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]"
                    style={{ backgroundColor: stat.tintBg, color: stat.tint }}
                  >
                    <Icon size={14} />
                  </span>

                  <span className="text-[11px] font-semibold tracking-[0.03em] uppercase text-[#64748B] dark:text-[#94A3B8]">
                    {stat.title}
                  </span>
                </div>

                <div className="mt-[9px] text-[23px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {stat.count}
                </div>
              </button>
            );
          })}
        </section>

        {/* Filters */}
        <section className={`${cardClass} p-[14px_18px_16px_18px] mb-[14px]`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[175px_175px_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <Einput
                title="Date from"
                type="date"
                name="dateFrom"
                value={dateFrom}
                handleInputChange={(_: string, value: string) =>
                  setDateFrom(value)
                }
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <Einput
                title="Date to"
                type="date"
                name="dateTo"
                value={dateTo}
                handleInputChange={(_: string, value: string) =>
                  setDateTo(value)
                }
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Branch"
                name="branch"
                option={branchOptions}
                initialValue={branch}
                handleInputChange={(_: string, value: string) =>
                  setBranch(value)
                }
                className={selectTriggerClass}
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Status"
                name="status"
                option={STATUS_OPTIONS}
                initialValue={status}
                handleInputChange={(_: string, value: string) =>
                  setStatus(value)
                }
                className={selectTriggerClass}
              />
            </div>

            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
              <AButton
                type="button"
                onClick={showdata}
                disabled={isLoading}
                className="inline-flex !h-[38px] w-full items-center justify-center whitespace-nowrap !rounded-[9px] !bg-[#4F46E5] hover:!bg-[#4338CA] px-5 py-2 !text-[12.5px] !font-semibold text-white !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:!bg-[#94A3B8] dark:disabled:!bg-[#475569] sm:w-auto cursor-pointer"
              >
                Show
              </AButton>
            </div>
          </div>
        </section>

        {/* Requests table */}
        <section className={`${cardClass} overflow-hidden mt-3.5`}>
          {/* Table wrapper */}
          <div className="w-full min-w-0 p-3 sm:p-4">
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-0 w-full">
                <ServiceTablePagination
                  title="Location Transfer Requests"
                  columns={transferColumns}
                  data={filteredRequests}
                  initialPageSize={10}
                  showPageSizeInFooter
                  containerClassName="w-full min-w-0 max-w-full overflow-hidden rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937]"
                />
              </div>
            </div>
          </div>

          {/* Responsive summary footer */}
          <div className="flex w-full min-w-0 flex-col gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 dark:border-[#1F2937] dark:bg-[#0E1524] sm:px-[18px] sm:flex-row sm:items-center sm:justify-between text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            <span className="tabular-nums font-medium">
              {hasLoaded
                ? `${filteredRequests.length} of ${transferRequests.length} requests`
                : isLoading
                  ? "Loading requests..."
                  : "No requests loaded"}
            </span>

            <div className="flex items-center gap-[9px] text-[12px]">
              <span className="inline-flex items-center gap-[5px] whitespace-nowrap">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#10B981]" />
                Approved
              </span>

              <span className="inline-flex items-center gap-[5px] whitespace-nowrap">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#F59E0B]" />
                Pending
              </span>

              <span className="inline-flex items-center gap-[5px] whitespace-nowrap">
                <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#E11D48]" />
                Rejected
              </span>
            </div>
          </div>
        </section>
      </div>
          {/* Footer */}
      <div className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-3 sm:px-4 lg:px-6 py-3 shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 transition-[left] duration-150 ease-in-out">
        <div className="flex w-full max-w-[1500px] flex-col gap-3">
          <div className="flex items-center justify-between sm:hidden">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selectedRows.length} selected
            </span>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              Location transfer
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <span className="hidden shrink-0 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-200 sm:block">
              {selectedRows.length} selected
            </span>

            <input
              type="text"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Remark (required when rejecting)..."
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 sm:h-11 sm:flex-1"
            />

            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:gap-3">
              <AButton
                type="button"
                onClick={() => handleApprovalAction("reject")}
                disabled={isLoading || selectedRows.length === 0}
                className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 sm:h-11 sm:w-auto sm:px-4"
              >
                <CircleX size={18} />
                Reject
              </AButton>

              <AButton
                type="button"
                onClick={() => handleApprovalAction("approve")}
                disabled={isLoading || selectedRows.length === 0}
                className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900 sm:h-11 sm:w-auto sm:px-5"
              >
                <CircleCheck size={18} />
                Approve
              </AButton>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Status Dialog */}
      {statusDialogRequest && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setStatusDialogRequest(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-dialog-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] shadow-2xl dark:border-[#1F2937] dark:bg-[#0A0F1C]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3.5 dark:border-[#1F2937] dark:bg-[#111827] sm:px-6">
              <div className="min-w-0">
                <h2
                  id="approval-dialog-title"
                  className="text-[16px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]"
                >
                  Approval Status
                </h2>

                <p className="mt-0.5 text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Request ID: {statusDialogRequest.UTD}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStatusDialogRequest(null)}
                aria-label="Close approval status"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] dark:border-[#1F2937] dark:text-[#94A3B8] dark:hover:bg-[#182235] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 rounded-[11px] border border-[#E2E8F0] bg-white p-4 dark:border-[#1F2937] dark:bg-[#111827] sm:grid-cols-2">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    Reason
                  </p>

                  <p className="mt-1 break-words text-[12.5px] font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                    {statusDialogRequest.REASON ??
                      statusDialogRequest.Reason ??
                      statusDialogRequest.reason ??
                      "No reason recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    Effective Date
                  </p>

                  <p className="mt-1 text-[12.5px] font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                    {formatDate(
                      statusDialogRequest.EFFECTIVE_DATE ??
                        statusDialogRequest.EffectiveDate ??
                        statusDialogRequest.effective_date,
                    ) || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    Employee
                  </p>

                  <p className="mt-1 text-[12.5px] font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                    {statusDialogRequest.Emp_Name || "—"}
                    {statusDialogRequest.EmpCode
                      ? ` (${statusDialogRequest.EmpCode})`
                      : ""}
                  </p>
                </div>

                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    Branch Transfer
                  </p>

                  <p className="mt-1 break-words text-[12.5px] font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                    {statusDialogRequest.CurrtBranch_name || "—"}
                    {" → "}
                    {statusDialogRequest.TransferTo_name || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {[
                  {
                    label: "Approver 1",
                    name:
                      statusDialogRequest.apr1_name ||
                      statusDialogRequest.APPR_1_NAME ||
                      "Approver 1",
                    status: getApprovalLevel(statusDialogRequest.APPR_1_STAT),
                    remark: statusDialogRequest.APPR_1_REM,
                  },
                  {
                    label: "Approver 2",
                    name:
                      statusDialogRequest.apr2_name ||
                      statusDialogRequest.APPR_2_NAME ||
                      "Approver 2",
                    status: getApprovalLevel(statusDialogRequest.APPR_2_STAT),
                    remark: statusDialogRequest.APPR_2_REM,
                  },
                  {
                    label: "Approver 3",
                    name:
                      statusDialogRequest.apr3_name ||
                      statusDialogRequest.APPR_3_NAME ||
                      "Approver 3",
                    status: getApprovalLevel(statusDialogRequest.APPR_3_STAT),
                    remark: statusDialogRequest.APPR_3_REM,
                  },
                ].map((level) => {
                  const approved = level.status === "approved";
                  const rejected = level.status === "rejected";
                  const pending = level.status === "pending";

                  const stateLabel = approved
                    ? "Approved"
                    : rejected
                      ? "Rejected"
                      : pending
                        ? "Pending"
                        : "Not reached";

                  const Icon = approved
                    ? Check
                    : rejected
                      ? CircleX
                      : pending
                        ? Clock3
                        : Minus;

                  const tint = approved
                    ? "#10B981"
                    : rejected
                      ? "#E11D48"
                      : pending
                        ? "#F59E0B"
                        : "#94A3B8";

                  const tintBg = approved
                    ? "rgba(16,185,129,0.15)"
                    : rejected
                      ? "rgba(225,29,72,0.15)"
                      : pending
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(148,163,184,0.15)";

                  return (
                    <div
                      key={level.label}
                      className="rounded-[10px] border border-[#E2E8F0] bg-white p-[11px_13px] dark:border-[#1F2937] dark:bg-[#111827]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px]"
                          style={{ backgroundColor: tintBg, color: tint }}
                        >
                          <Icon size={13} />
                        </span>

                        <span className="text-[11px] font-semibold tracking-[0.03em] uppercase text-[#64748B] dark:text-[#94A3B8]">
                          {level.label} · {stateLabel}
                        </span>
                      </div>

                      <p className="mt-2 break-words text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                        {level.name}
                      </p>

                      <p className="mt-1 break-words text-[12px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                        {level.remark ||
                          (pending
                            ? "No remark recorded"
                            : approved
                              ? "Approved without a remark"
                              : rejected
                                ? "Rejected without a remark"
                                : "Waiting for the previous level")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#E2E8F0] bg-white px-4 py-3 dark:border-[#1F2937] dark:bg-[#111827] sm:px-6">
              <button
                type="button"
                onClick={() => setStatusDialogRequest(null)}
                className="rounded-[9px] bg-[#4F46E5] hover:bg-[#4338CA] px-4 py-2 text-[12.5px] font-semibold text-white shadow transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
