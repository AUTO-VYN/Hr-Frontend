"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Swal from "sweetalert2";
import {
  LayoutGrid,
  Check,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";

type Option = {
  value: string;
  label: string;
};

function EmployeeTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser() as any;

  const compcode = searchParams.get("compcode") || user?.Comp_Code;
  const qrDesignation = searchParams.get("designation") || "";

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [empCode, setEmpCode] = useState("");
  const [basicInfo, setBasicInfo] = useState<any>(null);

  const [dropdowns, setDropdowns] = useState<{
    designation: Option[];
    location: Option[];
    department: Option[];
    section: Option[];
  }>({
    designation: [],
    location: [],
    department: [],
    section: [],
  });

  const [transferData, setTransferData] = useState({
    Designation: "",
    Location: "",
    Department: "",
    Section: "",
  });

  // Calculate Avatar Initials
  const initials = useMemo(() => {
    const name = basicInfo?.Emp_Name || basicInfo?.FullName || "";
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [basicInfo]);

  const showSideAlert = (
    message: string,
    type: "success" | "warning" | "error" | "info" = "info"
  ) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: "rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 text-sm font-medium",
      },
    });
  };

  // Convert raw array to Option[]
  const formatOptions = (list: any[]): Option[] => {
    if (!Array.isArray(list)) return [];
    return list
      .map((item: any) => {
        if (typeof item === "string" || typeof item === "number") {
          return { value: String(item), label: String(item) };
        }
        const val = String(
          item?.value ?? item?.code ?? item?.CODE ?? item?.label ?? item?.name ?? item?.NAME ?? ""
        ).trim();
        const lbl = String(
          item?.label ?? item?.name ?? item?.NAME ?? item?.value ?? item?.code ?? val
        ).trim();
        return { value: val || lbl, label: lbl || val };
      })
      .filter((o) => Boolean(o.value || o.label));
  };

  const fetchEmpDetails = async () => {
    const code = empCode.trim();
    if (!code) {
      showSideAlert("Please enter Employee Code", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/getEmpDetailsForTransfer`,
        { EmpCode: code },
        {
          headers: {
            compcode: compcode || user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (response.data?.success) {
        const info = response.data.basicInfo || {};
        const rawDropdowns = response.data.dropdowns || {};

        setBasicInfo(info);
        setDropdowns({
          designation: formatOptions(rawDropdowns.designation),
          location: formatOptions(rawDropdowns.location),
          department: formatOptions(rawDropdowns.department),
          section: formatOptions(rawDropdowns.section),
        });

        setTransferData({
          Designation: qrDesignation || "",
          Location: info.Location || "",
          Department: "",
          Section: info.Section || "",
        });

        const empDesignation = (info.Designation || "").trim().toLowerCase();
        const scannedDesignation = qrDesignation.trim().toLowerCase();

        // If scanned via QR, ensure current designation is different from QR designation
        const auth = scannedDesignation
          ? empDesignation !== scannedDesignation : false;

        setIsAuthorized(auth);
        showSideAlert("Employee details loaded!", "success");
      } else {
        showSideAlert(response.data?.message || "Employee not found", "error");
        setBasicInfo(null);
      }
    } catch (error: any) {
      console.error("Fetch Error:", error);
      showSideAlert(
        error?.response?.data?.message ||
          "Something went wrong while fetching employee details",
        "error"
      );
      setBasicInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferChange = (name: string, value: any) => {
    setTransferData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveTransfer = async () => {
    if (
      !transferData.Designation ||
      !transferData.Location ||
      !transferData.Department ||
      !transferData.Section
    ) {
      showSideAlert("Please select all transfer fields", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        EmpCode: basicInfo.Emp_Code,
        Prev_Designation: basicInfo.Designation,
        Prev_Location: basicInfo.Location,
        Prev_Department: basicInfo.Department,
        Prev_Section: basicInfo.Section,
        New_Designation: transferData.Designation,
        New_Location: transferData.Location,
        New_Department: transferData.Department,
        New_Section: transferData.Section,
        Changed_By: user?.name,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/saveEmpTransfer`,
        payload,
        {
          headers: {
            compcode: compcode || user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (response.data?.success) {
        showSideAlert("Transfer saved successfully!", "success");
        setEmpCode("");
        setBasicInfo(null);
        setTransferData({
          Designation: "",
          Location: "",
          Department: "",
          Section: "",
        });
      } else {
        showSideAlert(response.data?.message || "Failed to save transfer", "error");
      }
    } catch (error: any) {
      console.error("Save Error:", error);
      showSideAlert(
        error?.response?.data?.message || "Something went wrong while saving transfer",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setBasicInfo(null);
    setEmpCode("");
    setTransferData({
      Designation: "",
      Location: "",
      Department: "",
      Section: "",
    });
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* BANNER HEADER                                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1528] via-[#0E1E38] to-[#14294F] text-white p-5 sm:p-6 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shrink-0">
            <LayoutGrid className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase truncate">
              Internal Job Posting
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 truncate">
              Employee transfer form — verify, then update
            </p>
          </div>
        </div>
        <AButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
        >
          Back
        </AButton>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SEARCH CARD                                                                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Einput
              title=""
              type="text"
              name="empCode"
              value={empCode}
              placeholder="Enter employee code, e.g. 1001"
              handleInputChange={(name, val) => setEmpCode(String(val || ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  fetchEmpDetails();
                }
              }}
              className="!h-11 !rounded-xl"
            />
          </div>
          <AButton
            type="button"
            variant="primary"
            size="md"
            loading={isLoading}
            onClick={fetchEmpDetails}
            className="w-full sm:w-auto px-6 h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl"
          >
            Fetch details
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* RESULTS SECTION                                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {!basicInfo ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-20 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-[#0B1220]/40">
          <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">
            Look up an employee to begin
          </h4>
          <p className="text-sm text-slate-400 mt-1">Try 1001, 1022 or 1045.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── LEFT CARD: CURRENT EMPLOYEE DETAILS ── */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-13 w-13 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-semibold flex items-center justify-center text-base border border-blue-100 dark:border-blue-900 shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white uppercase truncate">
                    {basicInfo.Emp_Name || basicInfo.FullName || "—"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Emp code {basicInfo.Emp_Code || empCode}
                    {basicInfo.Emp_Type || basicInfo.EmpType_Name
                      ? ` · ${basicInfo.Emp_Type || basicInfo.EmpType_Name}`
                      : ""}
                    {basicInfo.DOJ
                      ? ` · Joined ${new Date(basicInfo.DOJ).toLocaleDateString("en-GB")}`
                      : ""}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase shrink-0">
                CURRENT
              </span>
            </div>

            <div className="space-y-3.5 text-sm sm:text-base">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Designation</span>
                <span className="font-normal text-slate-900 dark:text-slate-100 uppercase text-right">
                  {basicInfo.Designation || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Department</span>
                <span className="font-normal text-slate-900 dark:text-slate-100 uppercase text-right">
                  {basicInfo.Department || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Section</span>
                <span className="font-normal text-slate-900 dark:text-slate-100 text-right">
                  {basicInfo.Section || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Location</span>
                <span className="font-normal text-slate-900 dark:text-slate-100 text-right">
                  {basicInfo.Location || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Mobile</span>
                <span className="font-normal text-slate-900 dark:text-slate-100 font-mono text-right">
                  {basicInfo.Mobile_No || basicInfo.Mobile || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT CARD: TRANSFER TO FORM ── */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Transfer to
                </h3>
                <p className="text-xs text-slate-400">
                  Changed fields are highlighted
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isAuthorized
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                }`}
              >
                {isAuthorized ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> AUTHORIZED
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" /> UNAUTHORIZED
                  </>
                )}
              </span>
            </div>

            {isAuthorized ? (
              <div className="space-y-3.5">
                {/* Field 1: New designation */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      New designation <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs text-slate-400">
                      was {basicInfo.Designation || "—"}
                    </span>
                  </div>
                  <Eselect
                    name="Designation"
                    placeholder="Select"
                    option={dropdowns.designation}
                    initialValue={transferData.Designation}
                    handleInputChange={handleTransferChange}
                  />
                </div>

                {/* Field 2: New department */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      New department <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs text-slate-400">
                      was {basicInfo.Department || "—"}
                    </span>
                  </div>
                  <Eselect
                    name="Department"
                    placeholder="Select"
                    option={dropdowns.department}
                    initialValue={transferData.Department}
                    handleInputChange={handleTransferChange}
                  />
                </div>

                {/* Field 3: New location */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      New location
                    </label>
                    <span className="text-xs text-slate-400">
                      was {basicInfo.Location || "—"}
                    </span>
                  </div>
                  <Einput
                    title=""
                    type="text"
                    name="Location"
                    value={transferData.Location}
                    placeholder="Enter location"
                    handleInputChange={handleTransferChange}
                    readOnly={true}
                    className="!h-10 !rounded-xl bg-slate-50 dark:bg-slate-900/40 cursor-default"
                  />
                </div>

                {/* Field 4: New section */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      New section
                    </label>
                    <span className="text-xs text-slate-400">
                      was {basicInfo.Section || "—"}
                    </span>
                  </div>
                  <Einput
                    title=""
                    type="text"
                    name="Section"
                    value={transferData.Section}
                    placeholder="Enter section"
                    handleInputChange={handleTransferChange}
                    readOnly={true}
                    className="!h-10 !rounded-xl bg-slate-50 dark:bg-slate-900/40 cursor-default"
                  />
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Select designation and department
                  </span>
                  <div className="flex items-center gap-2.5">
                    <AButton
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={handleNewSearch}
                      className="rounded-xl font-medium"
                    >
                      New search
                    </AButton>
                    <AButton
                      type="button"
                      variant="primary"
                      size="md"
                      loading={isLoading}
                      onClick={handleSaveTransfer}
                      disabled={!transferData.Designation || !transferData.Department}
                      icon={<Check className="w-4 h-4" />}
                      className="rounded-xl font-semibold bg-[#2563EB] hover:bg-[#1D4ED8]"
                    >
                      Save transfer
                    </AButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center mb-3">
                  <AlertCircle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                </div>
                <h4 className="text-md font-bold text-rose-600 dark:text-rose-400 mb-1">
                  Unauthorized Access
                </h4>
                <p className="text-sm text-slate-400 max-w-sm">
                  This QR code does not match your current designation eligibility.
                  Please contact HR or scan the correct QR code.
                </p>
                <div className="mt-4">
                  <AButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNewSearch}
                  >
                    New search
                  </AButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeTransferFormPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading form...</div>}
    >
      <EmployeeTransferContent />
    </Suspense>
  );
}
