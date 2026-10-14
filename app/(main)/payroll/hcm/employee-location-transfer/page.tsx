
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import Swal from "sweetalert2";
import {
  UserRoundSearch,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertTriangle,
  Send,
  FileSpreadsheet,
  X,
  UserCheck,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";

type Option = {
  value: string;
  label: string;
  [key: string]: any;
};

type TransferRequest = {
  UTD?: number | string;
  ID?: number | string;
  EmpCode?: string;
  Emp_Name?: string;
  CurrtBranch_name?: string;
  TransferTo_name?: string;
  NewCreatedAt?: string;
  Status?: string;
  status?: string;
  [key: string]: any;
};

type ApproverRouteItem = {
  level: string;
  name: string;
  designation?: string;
  empcode?: string;
};

const cardClass =
  "min-w-0 rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] transition-colors dark:border-[#1F2937] dark:bg-[#111827] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]";

const inputClass =
  "!h-[38px] w-full min-w-0 !rounded-[9px] !border border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] px-2.5 py-2 !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] outline-none transition placeholder:text-[#64748B]/70 dark:placeholder:text-[#94A3B8]/70 focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!ring-0 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50 !shadow-none";

const selectTriggerClass =
  "!h-[38px] w-full min-w-0 !rounded-[9px] !border border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] px-2.5 !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] focus-within:!border-[#4F46E5] dark:focus-within:!border-[#8B84FF] focus-within:!ring-0 !shadow-none";

export default function EmployeeLocationTransferPage() {
  const user = useCurrentUser();

  const [isLoading, setIsLoading] = useState(false);
  const [transferOptions, setTransferOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [transferRequests, setTransferRequests] = useState<
    TransferRequest[]
  >([]);
  const [employee, setEmployee] = useState<any>(null);
  const [approvalRoute, setApprovalRoute] = useState<ApproverRouteItem[]>([]);
  const [isApproverLoading, setIsApproverLoading] = useState(false);

  const [formData, setFormData] = useState({
    EmpCode: "",
    EmpName: "",
    CurrtBranch: "",
    TransferTo: "",
    TransferType: "Permanent transfer",
    EffectiveDate: new Date().toISOString().slice(0, 10),
    Reason: "",
    CreatedBy: user?.name ?? "",
    loginEMPCODE: user?.EMPCODE ?? "",
  });

  const fetchApprovers = useCallback(
    async (targetEmpCode?: string) => {
      const empCodeToUse = targetEmpCode || formData.EmpCode || user?.EMPCODE;
      if (!empCodeToUse) return;

      setIsApproverLoading(true);
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/getApproverList`,
          {
            empcode: empCodeToUse,
            CreatedBy: empCodeToUse,
            module_code: "EMP_LOC_TRANSFER",
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );

        const rawList = Array.isArray(response.data?.Result)
          ? response.data.Result
          : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];

        if (!rawList.length) {
          setApprovalRoute([]);
          return;
        }

        // Check if response contains level / appr_level
        const hasLevels = rawList.some(
          (item: any) => item.level || item.appr_level || item.Level
        );

        if (hasLevels) {
          const levels = ["L1", "L2", "L3"];
          const formatted: ApproverRouteItem[] = [];

          levels.forEach((lvl) => {
            const candidates = rawList.filter((item: any) => {
              const itemLvl = String(
                item.level || item.appr_level || item.Level || ""
              ).toUpperCase();
              return itemLvl === lvl || itemLvl === lvl.replace("L", "");
            });

            if (!candidates.length) return;

            // Priority to Approval A
            const approverA = candidates.find((c: any) => {
              const type = String(
                c.approver_type || c.appr_type || c.type || ""
              ).toUpperCase();
              return type === "A";
            });

            const selected = approverA || candidates[0];

            formatted.push({
              level: lvl,
              name:
                selected.EMPNAME ||
                selected.Emp_Name ||
                selected.name ||
                selected.EMPCODE,
              designation:
                selected.DESIGNATION ||
                selected.EMPLOYEEDESIGNATION ||
                selected.Desg_Name ||
                selected.designation ||
                "Approver",
              empcode: selected.EMPCODE,
            });
          });

          setApprovalRoute(formatted);
        } else {
          // Fallback if backend returned flat list: map items to L1, L2, L3
          const formatted: ApproverRouteItem[] = rawList
            .slice(0, 3)
            .map((item: any, idx: number) => ({
              level: `L${idx + 1}`,
              name:
                item.EMPNAME ||
                item.Emp_Name ||
                item.name ||
                item.EMPCODE,
              designation:
                item.DESIGNATION ||
                item.EMPLOYEEDESIGNATION ||
                item.Desg_Name ||
                item.designation ||
                "Approver",
              empcode: item.EMPCODE,
            }));

          setApprovalRoute(formatted);
        }
      } catch (err) {
        console.error("Error fetching approver list:", err);
      } finally {
        setIsApproverLoading(false);
      }
    },
    [formData.EmpCode, user?.EMPCODE, user?.Comp_Code, user?.name]
  );

  useEffect(() => {
    if (user?.EMPCODE) {
      fetchApprovers(user.EMPCODE);
    }
  }, [user?.EMPCODE, fetchApprovers]);

  const showAlert = (
    message: string,
    type: "success" | "warning" | "error" | "info",
  ) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  const handleInputChange = (name: string, value: string) => {
    if (name === "EmpCode") {
      setFormData((prev) => ({
        ...prev,
        EmpCode: value,
        ...(employee && value.trim() !== prev.EmpCode.trim()
          ? {
              EmpName: "",
              CurrtBranch: "",
              TransferTo: "",
            }
          : {}),
      }));

      if (employee && value.trim() !== formData.EmpCode.trim()) {
        setEmployee(null);
      }

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const currentBranchName =
    branchOptions.find(
      (option) => String(option.value) === String(formData.CurrtBranch),
    )?.label || formData.CurrtBranch;

  const destinationBranchName =
    transferOptions.find(
      (option) => String(option.value) === String(formData.TransferTo),
    )?.label || "";

  const sameBranch =
    Boolean(formData.CurrtBranch) &&
    Boolean(formData.TransferTo) &&
    String(formData.CurrtBranch) === String(formData.TransferTo);

  const employeeSelected = Boolean(employee && formData.EmpCode);

  const isFormReady = Boolean(
    employeeSelected &&
      formData.TransferTo &&
      !sameBranch &&
      formData.EffectiveDate &&
      formData.Reason.trim()
  );

  const initials = useMemo(() => {
    const name = formData.EmpName || "";
    if (!name.trim()) return "?";
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [formData.EmpName]);

  const currentRows = useMemo(() => {
    if (!employee) return [];
    return [
      { label: "Branch", value: currentBranchName || "—" },
      ...(employee.REGION || employee.Region
        ? [{ label: "Region", value: employee.REGION || employee.Region }]
        : []),
      {
        label: "Department",
        value: employee.DIVISION || employee.Dept_Name || "—",
      },
      {
        label: "Designation",
        value: employee.EMPLOYEEDESIGNATION || employee.Desg_Name || "—",
      },
      ...(employee.REPORTING_TO || employee.HOD || employee.Reporting
        ? [
            {
              label: "Reporting 1",
              value:
                employee.REPORTING_TO || employee.HOD || employee.Reporting,
            },
          ]
        : []),
    ];
  }, [employee, currentBranchName]);

  const checks = [
    {
      valid: employeeSelected,
      message: employeeSelected
        ? `${formData.EmpName || formData.EmpCode} selected`
        : "No employee selected",
    },
    {
      valid: Boolean(formData.TransferTo) && !sameBranch,
      message: !formData.TransferTo
        ? "Destination branch not chosen"
        : sameBranch
          ? "Destination is the same as current branch"
          : `Moving to ${destinationBranchName || "destination"}`,
    },
    {
      valid: Boolean(formData.EffectiveDate),
      message: formData.EffectiveDate
        ? `Effective from ${formatDate(formData.EffectiveDate)}`
        : "Effective date missing",
    },
    {
      valid: Boolean(formData.Reason.trim()),
      message: formData.Reason.trim()
        ? "Reason recorded"
        : "Reason is mandatory for audit",
    },
  ];

  // Fetch employee details, destination branches, and transfer history.
  const ShowData = async (code?: string) => {
    const empCode = (code ?? formData.EmpCode).trim();

    if (!empCode) {
      showAlert("Please enter Employee Code", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/GetEmployeeLocation`,
        { empCode },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const data = response.data;
      const employeeData = data?.result1;

      setTransferOptions(Array.isArray(data?.result) ? data.result : []);
      setBranchOptions(Array.isArray(data?.result2) ? data.result2 : []);
      setTransferRequests(Array.isArray(data?.result3) ? data.result3 : []);

      if (!employeeData) {
        setEmployee(null);

        setFormData((prev) => ({
          ...prev,
          EmpCode: "",
          EmpName: "",
          CurrtBranch: "",
          TransferTo: "",
        }));

        showAlert("Employee Code does not match.", "info");
        return;
      }

      setEmployee(employeeData);

      setFormData((prev) => ({
        ...prev,
        EmpCode: empCode,
        EmpName: employeeData.FullName ?? "",
        CurrtBranch: employeeData.LOCATION ?? "",
        TransferTo: "",
        CreatedBy: user?.name ?? "",
        loginEMPCODE: user?.EMPCODE ?? "",
      }));

      fetchApprovers(empCode);
      showAlert("Employee details fetched successfully.", "success");
    } catch (error: any) {
      console.error("GetEmployeeLocation error:", error);

      showAlert(
        error?.response?.data?.message ??
          "Unable to fetch employee details.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Save transfer using the existing backend endpoint.
  const DataSave = async () => {
    if (!formData.EmpCode || !employee) {
      showAlert("Please select an employee and get details.", "warning");
      return;
    }

    if (!formData.TransferTo) {
      showAlert("Please select destination branch.", "warning");
      return;
    }

    if (sameBranch) {
      showAlert("Destination must differ from current branch.", "warning");
      return;
    }

    if (!formData.EffectiveDate) {
      showAlert("Please select effective date.", "warning");
      return;
    }

    if (!formData.Reason.trim()) {
      showAlert("Please enter transfer reason.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        CreatedBy: user?.name ?? "",
        loginEMPCODE: user?.EMPCODE ?? "",
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/GetEmployeeSave`,
        { Formdata: payload },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      await Swal.fire({
        icon: "success",
        title: response.data?.AutoApproved ? "Auto Approved" : "Success",
        text:
          response.data?.message ??
          "Employee Transfer Saved successfully.",
      });

      // Refresh transfer history using the existing API.
      try {
        const historyResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/GetEmployeeLocation`,
          { empCode: formData.EmpCode },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          },
        );

        const historyData = historyResponse.data;

        setTransferRequests(
          Array.isArray(historyData?.result3)
            ? historyData.result3
            : [],
        );
      } catch (historyError) {
        console.error("Transfer history refresh error:", historyError);
      }

      setEmployee(null);

      setFormData((prev) => ({
        ...prev,
        EmpCode: "",
        EmpName: "",
        CurrtBranch: "",
        TransferTo: "",
        TransferType: "Permanent transfer",
        EffectiveDate: new Date().toISOString().slice(0, 10),
        Reason: "",
      }));
    } catch (error: any) {
      console.error("GetEmployeeSave error:", error);

      showAlert(
        error?.response?.data?.message ??
          "Unable to save employee transfer.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setEmployee(null);
    setTransferOptions([]);
    setBranchOptions([]);
    if (user?.EMPCODE) {
      fetchApprovers(user.EMPCODE);
    }

    setFormData((prev) => ({
      ...prev,
      EmpCode: "",
      EmpName: "",
      CurrtBranch: "",
      TransferTo: "",
      TransferType: "Permanent transfer",
      EffectiveDate: new Date().toISOString().slice(0, 10),
      Reason: "",
    }));
  };

  const exportRequests = () => {
    if (!transferRequests.length) {
      showAlert("No transfer requests available to export.", "info");
      return;
    }

    const headers = [
      "ID",
      "EMPLOYEE CODE",
      "EMPLOYEE NAME",
      "CURRENT BRANCH",
      "TRANSFER TO",
      "REQUEST DATE",
      "STATUS",
    ];

    const escapeCsv = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = transferRequests.map((row, index) => [
      row.ID ?? row.UTD ?? index + 1,
      row.EmpCode,
      row.Emp_Name,
      row.CurrtBranch_name,
      row.TransferTo_name,
      formatDate(row.NewCreatedAt),
      row.Status ?? row.status ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "Employee_Location_Transfer.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const getStatusStyle = (status?: string) => {
    const value = (status ?? "").toLowerCase();

    if (value.includes("approv")) {
      return {
        fg: "#10B981",
        bg: "rgba(16,185,129,0.08)",
        border: "rgba(16,185,129,0.33)",
      };
    }

    if (value.includes("reject")) {
      return {
        fg: "#E11D48",
        bg: "rgba(225,29,72,0.08)",
        border: "rgba(225,29,72,0.33)",
      };
    }

    return {
      fg: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.33)",
    };
  };

  const transferColumns = useMemo(
    () => [
      {
        Header: "ID",
        accessor: (row: TransferRequest) => row.ID ?? row.UTD ?? "—",
        id: "ID",
      },
      {
        Header: "EMPLOYEE CODE",
        accessor: (row: TransferRequest) => row.EmpCode ?? "—",
        id: "EmpCode",
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: (row: TransferRequest) => row.Emp_Name ?? "—",
        id: "Emp_Name",
      },
      {
        Header: "CURRENT BRANCH",
        accessor: (row: TransferRequest) => row.CurrtBranch_name ?? "—",
        id: "CurrtBranch_name",
      },
      {
        Header: "TRANSFER TO",
        accessor: (row: TransferRequest) => row.TransferTo_name ?? "—",
        id: "TransferTo_name",
      },
      {
        Header: "REQUEST DATE",
        accessor: (row: TransferRequest) => formatDate(row.NewCreatedAt),
        id: "NewCreatedAt",
      },
      {
        Header: "STATUS",
        accessor: (row: TransferRequest) => row.Status ?? row.status ?? "—",
        id: "Status",
        Cell: ({ value }: { value: string }) => {
          if (!value || value === "—") {
            return (
              <span className="text-slate-400 dark:text-slate-500">
                —
              </span>
            );
          }

          const st = getStatusStyle(value);

          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
              style={{
                color: st.fg,
                backgroundColor: st.bg,
                border: `1px solid ${st.border}`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: st.fg }}
              />
              {value}
            </span>
          );
        },
      },
    ],
    [transferRequests],
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-32 font-['Inter',system-ui,sans-serif] [font-feature-settings:'tnum'_1] text-[13px] text-[#1E293B] antialiased transition-colors dark:bg-[#0A0F1C] dark:text-[#E7ECF3] sm:pb-24">
      <div className="mx-auto max-w-[1800px] p-3 sm:p-5">
        {/* Page heading */}
        <header className="mb-4 sm:mb-[18px] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
              Employee location transfer
            </h1>

            <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              Raise a transfer, see the before-and-after side by side, and send it
              up the three-level approval chain.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/payroll/hcm/emp-loc-transfer-approval-view"
              className="inline-flex items-center gap-[7px] rounded-[10px] border border-[#E2E8F0] bg-white px-[13px] py-2 text-[12.5px] font-[550] text-[#1E293B] shadow-sm hover:bg-[#F1F5F9] transition dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#E7ECF3] dark:hover:bg-[#182235]"
            >
              <UserCheck className="h-4 w-4" />
              <span>Approval grid</span>
            </Link>
          </div>
        </header>

        {/* Main content */}
        <div className="grid grid-cols-1 items-start gap-[14px] xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* Employee transfer form */}
          <section className={`${cardClass} p-4 sm:p-[16px_18px_18px_18px]`}>
            {/* Employee heading */}
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-[9px]">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <UserRoundSearch className="h-4 w-4" />
                </span>

                <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  Employee
                </h2>
              </div>

              <span className="text-right text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                {employeeSelected
                  ? `${employee?.EMPLOYEEDESIGNATION ?? "Employee"}${
                      employee?.DIVISION ? ` · ${employee.DIVISION}` : ""
                    }`
                  : "Search by code or name"}
              </span>
            </div>

            {/* Employee code + Get details */}
            <div className="w-full min-w-0">
              <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:gap-2.5 sm:max-w-[480px]">
                <div className="w-full min-w-0 flex-1">
                  <Einput
                    title="Employee code"
                    name="EmpCode"
                    redlabel=" *"
                    type="text"
                    value={formData.EmpCode}
                    placeholder="Enter employee code"
                    handleInputChange={handleInputChange}
                    className={cn(
                      inputClass,
                      (!formData.EmpCode.trim() || !employee) &&
                        "!border-[rgba(225,29,72,0.45)]"
                    )}
                  />
                </div>

                <div className="w-full shrink-0 sm:w-auto">
                  <AButton
                    type="button"
                    onClick={() => ShowData()}
                    disabled={isLoading || !formData.EmpCode.trim()}
                    className="inline-flex !h-[38px] w-full items-center justify-center whitespace-nowrap !rounded-[10px] !bg-[#4F46E5] hover:!bg-[#4338CA] px-4 py-2 !text-[12.5px] !font-semibold text-white !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:!bg-[#94A3B8] dark:disabled:!bg-[#475569] sm:w-auto cursor-pointer"
                  >
                    Get employee details
                  </AButton>
                </div>
              </div>
            </div>

            {/* Before / after side-by-side */}
            <div className="mt-[18px] grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)]">
              {/* Current posting */}
              <div className="flex min-h-[260px] min-w-0 flex-col justify-between rounded-[11px] border border-[#E2E8F0] p-[14px_15px] bg-white dark:border-[#1F2937] dark:bg-[#0E1524]/60 transition-colors">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    Current posting
                  </div>

                  {employee ? (
                    <>
                      <div className="mt-[11px] flex items-center gap-[11px] min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] dark:bg-[#0E1524] text-[11.5px] font-[650] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1F2937]">
                          {initials}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                            {formData.EmpName || "—"}
                          </div>

                          <div className="truncate text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                            {formData.EmpCode}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#E2E8F0] dark:border-[#1F2937] pt-[11px] space-y-1.5">
                        {currentRows.map((r) => (
                          <div key={r.label} className="flex gap-2.5 text-[12px] min-w-0">
                            <span className="flex-[0_0_96px] text-[#64748B] dark:text-[#94A3B8]">
                              {r.label}
                            </span>
                            <span className="flex-1 min-w-0 font-medium text-[#1E293B] dark:text-[#E7ECF3] truncate">
                              {r.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                      <span className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1F2937]">
                        <GitBranch className="h-5 w-5" />
                      </span>

                      <div className="text-[13.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] mt-3">
                        Pick an employee to start a transfer
                      </div>

                      <div className="mt-1 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                        Their current branch, department and reporting line load on the left.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden items-center justify-center text-[#4F46E5] dark:text-[#8B84FF] lg:flex">
                <ArrowRight className="h-5 w-5" />
              </div>

              {/* Destination */}
              <div
                className={cn(
                  "min-w-0 rounded-[11px] border p-[14px_15px] transition-colors",
                  formData.TransferTo && !sameBranch
                    ? "border-[#4F46E5] bg-[#EEF2FF] dark:border-[#8B84FF] dark:bg-[#1E1B4B]/30"
                    : "border-[#E2E8F0] bg-transparent dark:border-[#1F2937]"
                )}
              >
                <div className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#4F46E5] dark:text-[#8B84FF]">
                  Transfer to
                </div>

                <div className="space-y-3">
                  <div className="w-full min-w-0">
                    <Eselect
                      title="Branch"
                      name="TransferTo"
                      redlabel=" *"
                      option={transferOptions}
                      initialValue={formData.TransferTo}
                      placeholder="Select destination branch"
                      handleInputChange={handleChange}
                      required
                      className={cn(
                        selectTriggerClass,
                        (!formData.TransferTo || sameBranch) &&
                          "!border-[rgba(225,29,72,0.45)]"
                      )}
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <Einput
                      title="Effective date"
                      name="EffectiveDate"
                      redlabel=" *"
                      type="date"
                      value={formData.EffectiveDate}
                      handleInputChange={handleInputChange}
                      className={cn(
                        inputClass,
                        !formData.EffectiveDate &&
                          "!border-[rgba(225,29,72,0.45)]"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer type and reason */}
            <div className="mt-4 grid grid-cols-1 gap-[13px] md:grid-cols-2">
              <div className="w-full min-w-0">
                <Eselect
                  title="Transfer type"
                  name="TransferType"
                  option={[
                    {
                      value: "Permanent transfer",
                      label: "Permanent transfer",
                    },
                    {
                      value: "Temporary deputation",
                      label: "Temporary deputation",
                    },
                    {
                      value: "Inter-department move",
                      label: "Inter-department move",
                    },
                  ]}
                  initialValue={formData.TransferType}
                  handleInputChange={handleChange}
                  className={selectTriggerClass}
                />
              </div>

              <div className="w-full min-w-0">
                <Einput
                  title="Reason"
                  name="Reason"
                  redlabel=" *"
                  type="text"
                  value={formData.Reason}
                  placeholder="Why is this transfer needed?"
                  handleInputChange={handleInputChange}
                  className={cn(
                    inputClass,
                    !formData.Reason.trim() &&
                      "!border-[rgba(225,29,72,0.45)]"
                  )}
                />
              </div>
            </div>
          </section>

          {/* Right sidebar */}
          <aside className="grid min-w-0 grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-1">
            {/* Approval route */}
            <section className={`${cardClass} p-4 sm:p-[16px_18px_18px_18px]`}>
              <div className="mb-[13px] flex items-center gap-[9px]">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <ShieldCheck className="h-4 w-4" />
                </span>

                <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  Approval route
                </h2>
              </div>

              <div className="space-y-2">
                {isApproverLoading ? (
                  <div className="flex flex-col gap-2 py-1">
                    <div className="h-12 w-full animate-pulse rounded-[10px] bg-slate-100 dark:bg-slate-800" />
                    <div className="h-12 w-full animate-pulse rounded-[10px] bg-slate-100 dark:bg-slate-800" />
                    <div className="h-12 w-full animate-pulse rounded-[10px] bg-slate-100 dark:bg-slate-800" />
                  </div>
                ) : approvalRoute.length > 0 ? (
                  approvalRoute.map((approver) => (
                    <div
                      key={approver.level}
                      className="flex min-w-0 items-center gap-[11px] rounded-[10px] border border-[#E2E8F0] p-[10px_12px] transition-colors dark:border-[#1F2937] bg-white dark:bg-[#0E1524]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[#F8FAFC] text-[11px] font-[650] text-[#64748B] dark:bg-[#0E1524] dark:text-[#94A3B8] tabular-nums border border-[#E2E8F0] dark:border-[#1F2937]">
                        {approver.level}
                      </span>

                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                          {approver.name}
                        </span>

                        <span className="block truncate text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          {approver.designation}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[10px] border border-dashed border-[#E2E8F0] p-4 text-center text-[12px] text-[#64748B] dark:border-[#1F2937] dark:text-[#94A3B8]">
                    No approvers configured in Approval Matrix.
                  </div>
                )}
              </div>
            </section>

            {/* Validation checks */}
            <section className={`${cardClass} p-[14px_16px_15px_16px] flex flex-col gap-2`}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                Checks
              </h2>

              <div className="space-y-2">
                {checks.map((check, index) => (
                  <div key={index} className="flex items-center gap-[9px] text-[12px]">
                    <span
                      className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] ${
                        check.valid
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "bg-[#F59E0B]/15 text-[#B45309] dark:text-[#F59E0B]"
                      }`}
                    >
                      {check.valid ? (
                        <Check className="h-5 w-5 stroke-[2.5]" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-[#1E293B] dark:text-[#E7ECF3]">
                      {check.message}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {/* Transfer request history */}
        <section className={`${cardClass} mt-3.5 overflow-hidden`}>
          <div className="flex flex-col gap-2.5 border-b border-[#E2E8F0] p-[13px_18px] transition-colors dark:border-[#1F2937] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                My transfer requests
              </h2>

              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                {transferRequests.length} raised
              </span>
            </div>

            <div className="w-full sm:w-auto">
              <button
                type="button"
                onClick={exportRequests}
                className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#E2E8F0] bg-transparent px-[11px] text-[12px] font-[550] text-[#1E293B] hover:bg-[#F1F5F9] dark:border-[#1F2937] dark:text-[#E7ECF3] dark:hover:bg-[#182235] transition sm:w-auto cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="w-full min-w-0 overflow-x-auto dark:bg-[#111827]">
            <ServiceTablePagination
              columns={transferColumns}
              data={transferRequests}
              height={420}
              serverMode={false}
              showPageSizeInFooter
              showTopSearch
              searchPlaceholder="Search transfer requests..."
            />
          </div>
        </section>
      </div>

      {/* Responsive fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-2.5 border-t border-[#E2E8F0] bg-white/95 px-4 sm:px-6 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] backdrop-blur-md transition-[left] duration-150 ease-in-out dark:border-[#1F2937] dark:bg-[#111827]/95 sm:left-[var(--sidebar-width,68px)]">
        <div className="mx-auto flex w-full max-w-[1800px] min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate text-[12.5px] text-[#64748B] dark:text-[#94A3B8] sm:flex-1">
            {formData.EmpName
              ? `${formData.EmpName} · ${currentBranchName || ""} → ${
                  destinationBranchName || "not set"
                }`
              : "No employee selected"}
          </p>

          <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
            <button
              type="button"
              onClick={clearForm}
              className="inline-flex h-[38px] w-full min-w-0 items-center justify-center gap-1.5 rounded-[10px] border border-[#E2E8F0] bg-white px-3.5 text-[12.5px] font-[550] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#94A3B8] dark:hover:text-[#E7ECF3] dark:hover:bg-[#182235] transition shadow-sm sm:w-auto cursor-pointer"
            >
              <X className="h-3.5 w-3.5 shrink-0" />
              <span>Clear form</span>
            </button>

            <button
              type="button"
              onClick={DataSave}
              disabled={isLoading || !isFormReady}
              className={cn(
                "inline-flex h-[38px] w-full min-w-0 items-center justify-center gap-[7px] rounded-[10px] px-[17px] text-[12.5px] font-semibold text-white transition active:scale-[0.98] sm:w-auto",
                isFormReady
                  ? "bg-[#4F46E5] hover:brightness-[1.08] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] cursor-pointer"
                  : "bg-[#64748B] dark:bg-[#94A3B8] opacity-70 cursor-not-allowed shadow-none"
              )}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span>Submit for approval</span>
            </button>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
