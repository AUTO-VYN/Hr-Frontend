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
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import { useCurrentUser } from "@/app/hooks/use-current-user";

type ApprovalLevel = "approved" | "pending" | "waiting" | "rejected";

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
        title: "PENDING",
        count: pending,
        value: "Pending",
        icon: Clock3,
        color: "text-yellow-500",
        bg: "bg-yellow-50 dark:bg-yellow-500/10",
      },
      {
        title: "APPROVED",
        count: approved,
        value: "Approved",
        icon: CircleCheck,
        color: "text-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
      },
      {
        title: "REJECTED",
        count: rejected,
        value: "Rejected",
        icon: CircleX,
        color: "text-rose-500",
        bg: "bg-rose-50 dark:bg-rose-500/10",
      },
      {
        title: "ALL REQUESTS",
        count: transferRequests.length,
        value: "All",
        icon: Layers3,
        color: "text-indigo-500",
        bg: "bg-indigo-50 dark:bg-indigo-500/10",
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
              className="h-4 w-4 cursor-pointer accent-indigo-600"
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
              className="h-4 w-4 cursor-pointer accent-indigo-600"
            />
          ) : (
            <span className="block w-4" />
          ),
      },

      { Header: "ID", accessor: "UTD" },

      {
        Header: "EMPLOYEE CODE",
        accessor: "EmpCode",
      },

      {
        Header: "EMPLOYEE NAME",
        accessor: "Emp_Name",
        Cell: ({ value }: any) => (
          <div className="flex min-h-[56px] items-center py-3">
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {value || "—"}
            </span>
          </div>
        ),
      },

      {
        Header: "CURRENT BRANCH",
        accessor: "CurrtBranch_name",
      },

      {
        Header: "TRANSFER TO",
        accessor: "TransferTo_name",
      },

      {
        Header: "REQUEST DATE",
        accessor: "NewCreatedAt",
        Cell: ({ value }: any) => formatDate(value),
      },

      {
        Header: "REQUEST BY",
        accessor: "RequestedBy",
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
                  const Icon =
                    level.status === "approved"
                      ? Check
                      : level.status === "pending"
                        ? Clock3
                        : level.status === "rejected"
                          ? CircleX
                          : Minus;

                  const color =
                    level.status === "approved"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : level.status === "rejected"
                        ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-400"
                        : level.status === "pending"
                          ? "border-orange-200 bg-orange-50 text-orange-500 dark:border-orange-800 dark:bg-orange-500/10 dark:text-orange-400"
                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";

                  return (
                    <span
                      key={level.label}
                      title={`${level.name ?? level.label}${
                        level.remark ? ` — ${level.remark}` : ""
                      }`}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${color}`}
                    >
                      <Icon size={13} />
                      {level.label}
                    </span>
                  );
                })}
              </div>

              {expandedRows.includes(rowId) && (
                <div className="space-y-1 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">
                  {levels.map((level) => (
                    <div key={level.label}>
                      <span className="font-semibold">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <Eye size={18} />
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
    <main className="min-h-screen bg-slate-50 pb-64 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 sm:pb-48 lg:pb-28">
      <div className="mx-auto w-full max-w-[1800px] space-y-4 p-3 sm:space-y-5 sm:p-5 lg:p-6">
        {/* Header */}
        <header className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Location transfer approvals
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
            Each request carries its own three-level chain. Expand a row to read
            the remarks left at every level.
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
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
                className={`min-h-[110px] rounded-2xl border-2 ${
                  isActive
                    ? stat.border
                    : "border-slate-200 dark:border-slate-700"
                } bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-900 sm:min-h-[125px] sm:p-5`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`shrink-0 rounded-lg p-2 ${stat.bg} ${stat.color}`}
                  >
                    <Icon size={19} />
                  </span>

                  <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 sm:text-sm">
                    {stat.title}
                  </span>
                </div>

                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.count}
                </p>
              </button>
            );
          })}
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(200px,2.1fr)_minmax(200px,2.1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <Einput
                title="DATE FROM"
                type="date"
                name="dateFrom"
                value={dateFrom}
                handleInputChange={(_: string, value: string) =>
                  setDateFrom(value)
                }
                className="!h-11"
              />
            </div>

            <div className="min-w-0">
              <Einput
                title="DATE TO"
                type="date"
                name="dateTo"
                value={dateTo}
                handleInputChange={(_: string, value: string) =>
                  setDateTo(value)
                }
                className="!h-11"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="BRANCH"
                name="branch"
                option={branchOptions}
                initialValue={branch}
                handleInputChange={(_: string, value: string) =>
                  setBranch(value)
                }
                className="!h-11"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="STATUS"
                name="status"
                option={STATUS_OPTIONS}
                initialValue={status}
                handleInputChange={(_: string, value: string) =>
                  setStatus(value)
                }
                className="!h-11"
              />
            </div>

            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
              <AButton
                type="button"
                onClick={showdata}
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-indigo-600 px-7 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
              >
                Show
              </AButton>
            </div>
          </div>
        </section>

        {/* Requests table */}
        <section className="mt-5 w-full min-w-0 overflow-hidden rounded-2xl border border-[#dce4f0] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {/* Table wrapper */}
          <div className="w-full min-w-0 px-3 py-3 sm:px-5 sm:py-5">
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-0 w-full">
                <ServiceTablePagination
                  title="Location Transfer Requests"
                  columns={transferColumns}
                  data={filteredRequests}
                  initialPageSize={10}
                  showPageSizeInFooter
                  containerClassName="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Responsive summary footer */}
          <div className="flex w-full min-w-0 flex-col gap-3 border-t border-slate-200 bg-slate-50 px-3 py-4 dark:border-slate-700 dark:bg-slate-800/70 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <span className="min-w-0 break-words text-sm font-medium text-slate-600 dark:text-slate-300">
              {hasLoaded
                ? `${filteredRequests.length} of ${transferRequests.length} requests`
                : isLoading
                  ? "Loading requests..."
                  : "No requests loaded"}
            </span>

            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 sm:gap-x-5 sm:text-sm">
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                Approved
              </span>

              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-500" />
                Pending
              </span>

              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setStatusDialogRequest(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-dialog-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
              <div className="min-w-0">
                <h2
                  id="approval-dialog-title"
                  className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl"
                >
                  Approval Status
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Request ID: {statusDialogRequest.UTD}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStatusDialogRequest(null)}
                aria-label="Close approval status"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason
                  </p>

                  <p className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                    {statusDialogRequest.REASON ??
                      statusDialogRequest.Reason ??
                      statusDialogRequest.reason ??
                      "No reason recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Effective Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {formatDate(
                      statusDialogRequest.EFFECTIVE_DATE ??
                        statusDialogRequest.EffectiveDate ??
                        statusDialogRequest.effective_date,
                    ) || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {statusDialogRequest.Emp_Name || "—"}
                    {statusDialogRequest.EmpCode
                      ? ` (${statusDialogRequest.EmpCode})`
                      : ""}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Branch Transfer
                  </p>

                  <p className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                    {statusDialogRequest.CurrtBranch_name || "—"}
                    {" → "}
                    {statusDialogRequest.TransferTo_name || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {[
                  {
                    label: "APPROVER 1",
                    name:
                      statusDialogRequest.apr1_name ||
                      statusDialogRequest.APPR_1_NAME ||
                      "Approver 1",
                    status: getApprovalLevel(statusDialogRequest.APPR_1_STAT),
                    remark: statusDialogRequest.APPR_1_REM,
                  },
                  {
                    label: "APPROVER 2",
                    name:
                      statusDialogRequest.apr2_name ||
                      statusDialogRequest.APPR_2_NAME ||
                      "Approver 2",
                    status: getApprovalLevel(statusDialogRequest.APPR_2_STAT),
                    remark: statusDialogRequest.APPR_2_REM,
                  },
                  {
                    label: "APPROVER 3",
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
                    ? "APPROVED"
                    : rejected
                      ? "REJECTED"
                      : pending
                        ? "PENDING"
                        : "NOT REACHED";

                  const Icon = approved
                    ? CircleCheck
                    : rejected
                      ? CircleX
                      : pending
                        ? Clock3
                        : Minus;

                  const iconStyle = approved
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : rejected
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                      : pending
                        ? "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400";

                  return (
                    <div
                      key={level.label}
                      className="min-h-[120px] rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
                        >
                          <Icon size={18} />
                        </span>

                        <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                          {level.label} · {stateLabel}
                        </span>
                      </div>

                      <p className="mt-3 break-words text-base font-semibold text-slate-900 dark:text-white">
                        {level.name}
                      </p>

                      <p className="mt-1 break-words text-sm leading-5 text-slate-500 dark:text-slate-400">
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

            <div className="flex justify-end border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
              <button
                type="button"
                onClick={() => setStatusDialogRequest(null)}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
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
