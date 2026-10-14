
"use client";

import React, { useState, useMemo } from "react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import Swal from "sweetalert2";
import {
  UserRoundSearch,
  ArrowRight,
  Building2,
  ShieldCheck,
  Check,
  AlertTriangle,
  Send,
  FileSpreadsheet,
  X,
} from "lucide-react";

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

const approvalRoute = [
  { level: "L1", name: "Gopal Sodani", designation: "HOD · Sales" },
  { level: "L2", name: "Anand Kulkarni", designation: "HR Admin" },
  { level: "L3", name: "Rakesh Mehta", designation: "Business Head" },
];

const cardClass =
  "min-w-0 rounded-2xl border border-[#dce4f0] bg-white shadow-[0_3px_12px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-[#111827] dark:shadow-none";

const inputClass =
  "h-[42px] w-full min-w-0 rounded-xl border border-[#dce4f0] bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40 dark:disabled:bg-slate-800";

const mutedText = "text-slate-500 dark:text-slate-400";
const headingText = "text-slate-900 dark:text-slate-100";

export default function EmployeeLocationTransferPage() {
  const user = useCurrentUser();

  const [isLoading, setIsLoading] = useState(false);
  const [transferOptions, setTransferOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [transferRequests, setTransferRequests] = useState<
    TransferRequest[]
  >([]);
  const [employee, setEmployee] = useState<any>(null);

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

  const checks = [
    {
      valid: employeeSelected,
      message: employeeSelected
        ? `${formData.EmpName || formData.EmpCode} selected`
        : "Select an employee",
    },
    {
      valid: Boolean(formData.TransferTo) && !sameBranch,
      message: !formData.TransferTo
        ? "Select a destination branch"
        : sameBranch
          ? "Destination is the same as current branch"
          : "Destination branch is different",
    },
    {
      valid: Boolean(formData.EffectiveDate),
      message: formData.EffectiveDate
        ? `Effective from ${formatDate(formData.EffectiveDate)}`
        : "Effective date is required",
    },
    {
      valid: Boolean(formData.Reason.trim()),
      message: formData.Reason.trim()
        ? "Transfer reason provided"
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

  const statusClass = (status?: string) => {
    const value = (status ?? "").toLowerCase();

    if (value.includes("approv")) {
      return "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
    }

    if (value.includes("reject")) {
      return "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400";
    }

    return "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400";
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

          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusClass(value)}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {value}
            </span>
          );
        },
      },
    ],
    [transferRequests],
  );

  return (
    <main className="min-h-screen bg-[#f6f8fc] pb-40 text-lg text-slate-900 transition-colors dark:bg-[#0B1220] dark:text-slate-100 sm:pb-28">
      <div className="mx-auto max-w-[1800px] p-3 sm:p-5">
        {/* Page heading */}
        <header className="mb-5">
          <h1 className="text-xl font-bold capitalize tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
            Employee location transfer
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            Raise a transfer, see the before-and-after side by side, and send it
            up the three-level approval chain.
          </p>
        </header>

        {/* Main content */}
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2.15fr)_minmax(320px,0.85fr)]">
          {/* Employee transfer form */}
          <section className={`${cardClass} p-4 sm:p-6`}>
            {/* Employee heading */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <UserRoundSearch className="h-[18px] w-[18px]" />
                </span>

                <h2 className={`text-base font-semibold ${headingText}`}>
                  Employee
                </h2>
              </div>

              <span className={`text-right text-sm ${mutedText}`}>
                {employee?.EMPLOYEEDESIGNATION ?? "Employee"}
                {employee?.DIVISION ? ` · ${employee.DIVISION}` : ""}
              </span>
            </div>

            {/* Employee code + Get details */}
            <div className="w-full min-w-0">
              <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="w-full min-w-0 flex-1 sm:max-w-[525px]">
                  <Einput
                    title="Employee Code"
                    name="EmpCode"
                    redlabel="*"
                    type="text"
                    value={formData.EmpCode}
                    placeholder="Enter employee code"
                    handleInputChange={handleInputChange}
                    className={inputClass}
                  />
                </div>

                <div className="w-full shrink-0 sm:w-auto">
                  <AButton
                    type="button"
                    variant="primary"
                    onClick={() => ShowData()}
                    disabled={isLoading || !formData.EmpCode.trim()}
                    className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-xl border border-[#dce4f0] px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 sm:w-auto"
                  >
                    Get employee details
                  </AButton>
                </div>
              </div>
            </div>

            {/* Before / after */}
            <div className="mt-5 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)]">
              {/* Current posting */}
              <div className="flex min-h-[270px] min-w-0 flex-col justify-center rounded-xl border border-[#dce4f0] p-4 transition-colors dark:border-slate-700 dark:bg-slate-900/40">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current posting
                </h3>

                {employee ? (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {(formData.EmpName || "E").charAt(0).toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-base font-semibold ${headingText}`}>
                          {formData.EmpName || "—"}
                        </p>

                        <p className={`break-words text-sm ${mutedText}`}>
                          {formData.EmpCode}
                        </p>
                      </div>
                    </div>

                    <div className="my-3 border-t border-[#dce4f0] dark:border-slate-700" />

                    <dl className="grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
                      <dt className={mutedText}>Branch</dt>
                      <dd className="break-words font-medium text-slate-800 dark:text-slate-200">
                        {currentBranchName || "—"}
                      </dd>

                      <dt className={mutedText}>Designation</dt>
                      <dd className="break-words font-medium text-slate-800 dark:text-slate-200">
                        {employee.EMPLOYEEDESIGNATION || "—"}
                      </dd>
                    </dl>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <Building2 className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />

                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Select an employee
                    </p>

                    <p className={`mt-1 text-xs ${mutedText}`}>
                      Enter an employee code to load current posting.
                    </p>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="hidden items-center justify-center text-indigo-600 dark:text-indigo-400 lg:flex">
                <ArrowRight className="h-5 w-5" />
              </div>

              {/* Destination */}
              <div className="min-w-0 rounded-xl border border-[#dce4f0] p-4 transition-colors dark:border-slate-700 dark:bg-slate-900/40">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  Transfer to
                </h3>

                <div className="space-y-3">
                  <div className="w-full min-w-0">
                    <Eselect
                      title="Branch"
                      name="TransferTo"
                      redlabel="*"
                      option={transferOptions}
                      initialValue={formData.TransferTo}
                      placeholder="Select destination branch"
                      handleInputChange={handleChange}
                      required
                      className="h-[42px] w-full min-w-0"
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <Einput
                      title="Effective Date"
                      name="EffectiveDate"
                      redlabel="*"
                      type="date"
                      value={formData.EffectiveDate}
                      handleInputChange={handleInputChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer type and reason */}
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="w-full min-w-0">
                <Eselect
                  title="Transfer Type"
                  name="TransferType"
                  option={[
                    {
                      value: "Permanent transfer",
                      label: "Permanent transfer",
                    },
                    {
                      value: "Temporary transfer",
                      label: "Temporary transfer",
                    },
                  ]}
                  initialValue={formData.TransferType}
                  handleInputChange={handleChange}
                  className="h-[42px] w-full min-w-0"
                />
              </div>

              <div className="w-full min-w-0">
                <Einput
                  title="Reason"
                  name="Reason"
                  type="text"
                  value={formData.Reason}
                  placeholder="Why is this transfer needed?"
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Right sidebar */}
          <aside className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
            {/* Approval route */}
            <section className={`${cardClass} p-4 sm:p-5`}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </span>

                <h2 className={`text-base font-semibold ${headingText}`}>
                  Approval route
                </h2>
              </div>

              <div className="space-y-2.5">
                {approvalRoute.map((approver) => (
                  <div
                    key={approver.level}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dce4f0] px-3 py-3 transition-colors dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {approver.level}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${headingText}`}>
                        {approver.name}
                      </p>

                      <p className={`truncate text-xs ${mutedText}`}>
                        {approver.designation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Validation checks */}
            <section className={`${cardClass} p-4 sm:p-5`}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Checks
              </h2>

              <div className="space-y-3">
                {checks.map((check, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-[-1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                        check.valid
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                      }`}
                    >
                      {check.valid ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </span>

                    <span className="min-w-0 break-words leading-5 text-slate-700 dark:text-slate-300">
                      {check.message}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {/* Transfer request history */}
        <section className={`${cardClass} mt-5 overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-[#dce4f0] px-4 py-4 transition-colors dark:border-slate-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={`text-base font-semibold ${headingText}`}>
                My transfer requests
              </h2>

              <span className={`text-sm ${mutedText}`}>
                {transferRequests.length} raised
              </span>
            </div>

            <div className="w-full sm:w-auto">
              <AButton
                type="button"
                onClick={exportRequests}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#dce4f0] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export
              </AButton>
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
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-3 border-t border-slate-200/90 bg-white/95 px-3 py-3 shadow-lg backdrop-blur-md transition-[left] duration-150 ease-in-out dark:border-slate-800 dark:bg-[#0B1220]/95 dark:shadow-black/20 sm:left-[var(--sidebar-width,68px)] sm:px-4 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1800px] min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words text-sm text-slate-500 dark:text-slate-400 sm:flex-1">
            {formData.EmpName || "No employee selected"}
            {formData.EmpCode ? ` · ${formData.EmpCode}` : ""}
            {currentBranchName ? ` · ${currentBranchName}` : ""}
            {destinationBranchName ? ` → ${destinationBranchName}` : ""}
          </p>

          <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <AButton
              type="button"
              onClick={clearForm}
              className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto sm:min-w-[130px] sm:px-4"
            >
              <X className="h-4 w-4 shrink-0" />
              <span>Clear form</span>
            </AButton>

            <AButton
              type="button"
              onClick={DataSave}
              disabled={isLoading || !employee}
              className="inline-flex h-auto min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-slate-500 px-3 py-2.5 text-center text-sm font-semibold leading-tight text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:min-w-[190px] sm:whitespace-nowrap sm:px-5"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal sm:whitespace-nowrap">
                Submit for approval
              </span>
            </AButton>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
