"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  ArrowLeft,
  BarChart3,
  Upload,
  UserSearch,
  ImageOff,
  Package,
  Plus,
  Trash2,
  Image as ImageIcon,
  Archive,
  RotateCcw,
  History,
  List,
  Save,
  Laptop,
  Smartphone,
  Shirt,
  Armchair,
  Wrench,
  Car,
  Box,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import FileViewer from "@/components/atoms/FileviewerBank";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function showSideAlert(message: string, type: "success" | "warning" | "error" | "info") {
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

function formatDateDisplay(dateStr?: string | null) {
  if (!dateStr || dateStr === "null" || dateStr === "—") return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const CATEGORIES = [
  { value: "IT equipment", label: "IT equipment" },
  { value: "Vehicle", label: "Vehicle" },
  { value: "Uniform", label: "Uniform" },
  { value: "Tools", label: "Tools" },
  { value: "Furniture", label: "Furniture" },
  { value: "Mobile / SIM", label: "Mobile / SIM" },
  { value: "Fixed", label: "Fixed" },
  { value: "Consumable", label: "Consumable" },
];

const TYPES = [
  { value: "Returnable", label: "Returnable" },
  { value: "Non-returnable", label: "Non-returnable" },
  { value: "Consumable", label: "Consumable" },
];

export default function EmployeeAssetPage() {
  const router = useRouter();
  const user = useCurrentUser() as any;

  // ── States ─────────────────────────────────────────────────────────────
  const [empcodeOptions, setEmpcodeOptions] = useState<any[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>("");
  const [empDetails, setEmpDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ittype, setIttype] = useState<any[]>([]);

  // Asset list (combines issued and new rows to issue)
  const [services, setServices] = useState<any[]>([
    {
      Asset_category: "IT equipment",
      It_category: "",
      Asset_Serial_no: "",
      Aset_Code: "",
      Aset_Name: "",
      Asset_Type: "Returnable",
      Issue_Date: new Date().toISOString().split("T")[0],
      Revoke_Date: "",
      Lost_Date: "",
      Revoke_Rem: "",
      created_at_time: new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
      created_at_date: new Date().toISOString().split("T")[0],
      Created_by: user?.name || "admin",
      isIssued: false,
      uploaded_document: "",
    },
  ]);

  // Dialog states
  const [returnDialogOpen, setReturnDialogOpen] = useState<boolean>(false);
  const [selectedReturnAsset, setSelectedReturnAsset] = useState<any>(null);
  const [returnData, setReturnData] = useState<{
    Revoke_Date: string;
    Lost_Date: string;
    Revoke_Rem: string;
  }>({
    Revoke_Date: new Date().toISOString().split("T")[0],
    Lost_Date: "",
    Revoke_Rem: "",
  });

  const [historyDialogOpen, setHistoryDialogOpen] = useState<boolean>(false);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<any>(null);

  // ── Fetch IT Categories ────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.Comp_Code) return;

    const fetchITCategories = async () => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/getItCategoryOptions`,
          {},
          {
            headers: {
              compcode: user?.Comp_Code,
            },
          }
        );
        if (response.data?.data) {
          setIttype(response.data.data);
        } else {
          setIttype([
            { value: "Laptop", label: "Laptop" },
            { value: "Desktop", label: "Desktop" },
            { value: "Monitor", label: "Monitor" },
            { value: "Printer", label: "Printer" },
            { value: "Router", label: "Router" },
            { value: "Not applicable", label: "Not applicable" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching IT categories:", error);
        setIttype([
          { value: "Laptop", label: "Laptop" },
          { value: "Desktop", label: "Desktop" },
          { value: "Monitor", label: "Monitor" },
          { value: "Printer", label: "Printer" },
          { value: "Router", label: "Router" },
          { value: "Not applicable", label: "Not applicable" },
        ]);
      }
    };

    fetchITCategories();
  }, [user?.Comp_Code]);

  // ── Fetch Employee List for Dropdown ──────────────────────────────────
  useEffect(() => {
    if (!user?.Comp_Code) return;

    const fetchEmpList = async () => {
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
          { branch: user?.branch },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (result.data?.data) {
          setEmpcodeOptions(result.data.data);
        }
      } catch (err) {
        console.error("Error fetching employee list:", err);
      }
    };

    fetchEmpList();
  }, [user?.Comp_Code, user?.name, user?.branch]);

  // ── Fetch Employee Asset Details and Profile ──────────────────────────
  const handleEmpChange = useCallback(
    async (empcode: string) => {
      if (!empcode) {
        setEmpDetails(null);
        setServices([]);
        return;
      }

      setIsLoading(true);
      try {
        const [profileRes, assetRes] = await Promise.all([
          axios
            .post(
              `${process.env.NEXT_PUBLIC_URL}/employee/${empcode}`,
              {},
              {
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              }
            )
            .catch(() => null),

          axios
            .post(
              `${process.env.NEXT_PUBLIC_URL}/employee/AssetDetailsEmp/${empcode}`,
              {},
              {
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              }
            )
            .catch(() => null),
        ]);

        if (profileRes?.data?.data) {
          const emp = profileRes.data.data.EmpMst || profileRes.data.data;
          const fullName = emp.EMPFIRSTNAME
            ? `${emp.EMPFIRSTNAME} ${emp.EMPLASTNAME || ""}`.trim()
            : emp.name || empcode;

          setEmpDetails({
            ...emp,
            name: fullName,
            DOB: emp.DOB,
            JOININGDATE: emp.CURRENTJOINDATE || emp.PREJOININGDATE || emp.JOININGDATE,
            GENDER: emp.GENDER || "—",
            BRANCH: emp.BRANCH || emp.PCITY || user?.branch || "—",
            DEPARTMENT: emp.DEPARTMENT || emp.SKILLS || "—",
            DESIGNATION: emp.DESIGNATION || emp.PREDESIGNATION || "—",
            REPORTING_1: emp.Reporting_1 || emp.REPORTING || emp.EMPREFERENCENAME || "—",
            HOD: emp.HOD || "—",
            HR: emp.HR || emp.HR_MANAGER || "—",
            REGION: emp.PSTATE || emp.CSTATE || emp.REGION || "—",
            photo: emp.photo,
          });
        } else {
          const match = empcodeOptions.find((opt) => opt.value === empcode);
          const nameFromOpt = match?.label ? match.label.split("·")[1]?.trim() : empcode;
          setEmpDetails({
            name: nameFromOpt || empcode,
            DESIGNATION: "—",
            BRANCH: user?.branch || "—",
            DEPARTMENT: "—",
            REPORTING_1: "—",
            HOD: "—",
            HR: "—",
            REGION: "—",
            GENDER: "—",
          });
        }

        const fetchedAssets =
          assetRes?.data?.data?.AssetIssue?.map((item: any) => {
            const createdAt = item.created_at ? new Date(item.created_at) : new Date();
            const date = createdAt.toISOString().split("T")[0];
            const time = createdAt.toTimeString().split(" ")[0].slice(0, 5);

            return {
              ...item,
              created_at_date: item.created_at_date || date,
              created_at_time: item.created_at_time || time,
              isIssued: true,
              It_category: item.It_category?.trim() || "",
              Asset_category: item.Asset_category?.trim() || (item.It_category ? "IT equipment" : "Vehicle"),
            };
          }) || [];

        const emptyRow = {
          Asset_category: "IT equipment",
          It_category: "",
          Asset_Serial_no: "",
          Aset_Code: "",
          Aset_Name: "",
          Asset_Type: "Returnable",
          Issue_Date: new Date().toISOString().split("T")[0],
          Revoke_Date: "",
          Lost_Date: "",
          Revoke_Rem: "",
          created_at_time: new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
          created_at_date: new Date().toISOString().split("T")[0],
          Created_by: user?.name || "admin",
          isIssued: false,
          uploaded_document: "",
        };

        setServices([...fetchedAssets, emptyRow]);
      } catch (e: any) {
        console.error("Error loading employee asset details:", e);
        const fallbackRow = {
          Asset_category: "IT equipment",
          It_category: "",
          Asset_Serial_no: "",
          Aset_Code: "",
          Aset_Name: "",
          Asset_Type: "Returnable",
          Issue_Date: new Date().toISOString().split("T")[0],
          Revoke_Date: "",
          Lost_Date: "",
          Revoke_Rem: "",
          created_at_time: new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
          created_at_date: new Date().toISOString().split("T")[0],
          Created_by: user?.name || "admin",
          isIssued: false,
          uploaded_document: "",
        };
        setServices([fallbackRow]);
        showSideAlert(e.response?.data?.message || "Failed to load employee details", "warning");
      } finally {
        setIsLoading(false);
      }
    },
    [user?.Comp_Code, user?.name, user?.branch, empcodeOptions]
  );

  useEffect(() => {
    if (selectedEmpCode) {
      handleEmpChange(selectedEmpCode);
    }
  }, [selectedEmpCode, handleEmpChange]);

  // ── Row management for new assets ─────────────────────────────────────
  const addRow = () => {
    setServices((prev) => [
      ...prev,
      {
        Asset_category: "IT equipment",
        It_category: "",
        Asset_Serial_no: "",
        Aset_Code: "",
        Aset_Name: "",
        Asset_Type: "Returnable",
        Issue_Date: new Date().toISOString().split("T")[0],
        Revoke_Date: "",
        Lost_Date: "",
        Revoke_Rem: "",
        created_at_time: new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
        created_at_date: new Date().toISOString().split("T")[0],
        Created_by: user?.name || "admin",
        isIssued: false,
        uploaded_document: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setServices((prev) =>
      prev.map((service, i) => (i === index ? { ...service, [name]: value } : service))
    );
  };

  const handleChangesubcategory = (name: string, value: any, index: number) => {
    setServices((prev) =>
      prev.map((service, i) => {
        if (i !== index) return service;
        const updated = { ...service, [name]: value };
        if (name === "Asset_category" && value !== "IT equipment" && value !== "IT") {
          updated.It_category = "";
        }
        return updated;
      })
    );
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formdata1 = new FormData();
      formdata1.append("index", String(index));
      formdata1.append("name", user?.name || "admin");
      formdata1.append("Image", file);

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/uploadeddocument`,
        formdata1,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      setServices((prev) =>
        prev.map((item, i) => (i === index ? { ...item, uploaded_document: result.data } : item))
      );

      showSideAlert("Document uploaded successfully", "success");
    } catch (error: any) {
      showSideAlert(error.response?.data?.Message || "Upload failed", "error");
      console.error("Upload error:", error);
    }
  };

  // ── Validation for row completeness ────────────────────────────────────
  const isRowValid = (r: any) => {
    return Boolean(
      r.Asset_category &&
      r.Asset_category !== "Select" &&
      r.Asset_Serial_no &&
      r.Aset_Code &&
      r.Aset_Name &&
      r.Asset_Type &&
      r.Asset_Type !== "Select" &&
      r.Issue_Date
    );
  };

  // ── Save New Assets ────────────────────────────────────────────────────
  const SaveAssets = async () => {
    if (!selectedEmpCode) {
      showSideAlert("Please select Employee Code first", "info");
      return;
    }

    const unissuedRows = services.filter((s) => !s.isIssued);
    const validRows = unissuedRows.filter((r) => isRowValid(r));

    if (validRows.length === 0) {
      showSideAlert("Fill category, serial, code, name, type and issue date", "warning");
      return;
    }

    const today = new Date();
    const created_at_date = today.toISOString().split("T")[0];
    const created_at_time = today.toTimeString().split(" ")[0];

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/AssetDetailsSave`,
        {
          AssetIssue: validRows,
          Created_by: user?.name,
          EMPCODE: selectedEmpCode,
          created_at_date,
          created_at_time,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      showSideAlert(response.data?.Message || `${validRows.length} asset(s) issued successfully`, "success");
      handleEmpChange(selectedEmpCode);
    } catch (e: any) {
      showSideAlert(e.response?.data?.message || "Failed to save assets", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Update Assets (e.g. Return/Revoke) ──────────────────────────────────
  const UpdateAssets = async (overrideServices?: any[]) => {
    setIsLoading(true);
    const dataToSend = overrideServices || services;

    const updatedServices = dataToSend.map((service) => {
      const { UTD, ...serviceWithoutUTD } = service;
      return serviceWithoutUTD;
    });

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/UpdateAssets`,
        {
          AssetIssue: updatedServices,
          Created_by: user?.name,
          EMPCODE: selectedEmpCode,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      handleEmpChange(selectedEmpCode);
      showSideAlert("Asset updated successfully", "success");
    } catch (e: any) {
      showSideAlert(e.response?.data?.message || "Failed to update assets", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle Return Dialog Submit ────────────────────────────────────────
  const handleConfirmReturn = async () => {
    if (!selectedReturnAsset) return;

    const updatedServices = services.map((s) => {
      if (
        (s.UTD != null && s.UTD === selectedReturnAsset.UTD) ||
        (s.Aset_Code && s.Aset_Code === selectedReturnAsset.Aset_Code)
      ) {
        return {
          ...s,
          Revoke_Date: returnData.Revoke_Date,
          Lost_Date: returnData.Lost_Date,
          Revoke_Rem: returnData.Revoke_Rem,
        };
      }
      return s;
    });

    setReturnDialogOpen(false);
    await UpdateAssets(updatedServices);
  };

  // ── Derived States ─────────────────────────────────────────────────────
  const issuedAssets = useMemo(() => services.filter((s) => s.isIssued), [services]);
  const newAssetsToIssue = useMemo(() => services.filter((s) => !s.isIssued), [services]);

  const inUseCount = useMemo(
    () => issuedAssets.filter((a) => !a.Revoke_Date && !a.Lost_Date).length,
    [issuedAssets]
  );

  const validCount = useMemo(
    () => newAssetsToIssue.filter((r) => isRowValid(r)).length,
    [newAssetsToIssue]
  );

  const initials = useMemo(() => {
    const name = empDetails?.name || selectedEmpCode || "?";
    return name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [empDetails, selectedEmpCode]);

  // Asset Card Icon helper
  const getAssetIconInfo = (asset: any) => {
    const cat = asset.Asset_category || asset.It_category || "";
    const name = (asset.Aset_Name || "").toLowerCase();

    if (cat.includes("IT") || name.includes("laptop") || name.includes("computer") || name.includes("dell")) {
      return { icon: <Laptop className="w-4 h-4" />, tint: "#4F46E5", bg: "rgba(79,70,229,0.12)" };
    }
    if (cat.includes("Mobile") || cat.includes("SIM") || name.includes("sim") || name.includes("phone")) {
      return { icon: <Smartphone className="w-4 h-4" />, tint: "#0EA5E9", bg: "rgba(14,165,233,0.12)" };
    }
    if (cat.includes("Uniform") || name.includes("shirt") || name.includes("uniform")) {
      return { icon: <Shirt className="w-4 h-4" />, tint: "#F59E0B", bg: "rgba(245,158,11,0.12)" };
    }
    if (cat.includes("Furniture") || name.includes("desk") || name.includes("chair")) {
      return { icon: <Armchair className="w-4 h-4" />, tint: "#7C3AED", bg: "rgba(124,58,237,0.12)" };
    }
    if (cat.includes("Tools") || name.includes("tool")) {
      return { icon: <Wrench className="w-4 h-4" />, tint: "#0D9488", bg: "rgba(13,148,136,0.12)" };
    }
    if (cat.includes("Vehicle") || name.includes("car") || name.includes("bike")) {
      return { icon: <Car className="w-4 h-4" />, tint: "#E11D48", bg: "rgba(225,29,72,0.12)" };
    }
    return { icon: <Box className="w-4 h-4" />, tint: "#64748B", bg: "rgba(100,116,139,0.12)" };
  };

  const empRows = useMemo(() => {
    if (!empDetails) return [];
    return [
      { label: "Employee name", value: empDetails.name || "—" },
      { label: "Location", value: empDetails.BRANCH || "—" },
      { label: "Designation", value: empDetails.DESIGNATION || "—" },
      { label: "Date of joining", value: formatDateDisplay(empDetails.JOININGDATE) },
      { label: "Reporting 1", value: empDetails.REPORTING_1 || "—" },
      { label: "HR manager", value: empDetails.HR || "—" },
      { label: "Region", value: empDetails.REGION || "—" },
      { label: "Department", value: empDetails.DEPARTMENT || "—" },
      { label: "Gender", value: empDetails.GENDER || "—" },
      { label: "Date of birth", value: formatDateDisplay(empDetails.DOB) },
      { label: "HOD", value: empDetails.HOD || "—" },
    ];
  }, [empDetails]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-sans antialiased">
      {/* ── TOP STICKY APP HEADER ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#1F2937] px-4 sm:px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="shrink-0 flex items-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-xs font-semibold px-3 py-2 hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] shrink-0">
          <span>Payroll</span>
          <span className="opacity-50">/</span>
          <span>Onboarding</span>
          <span className="opacity-50">/</span>
          <span className="text-[#1E293B] dark:text-[#E7ECF3] font-semibold">Employee Asset</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => router.push("/payroll/onboarding/employee-asset-reports")}
          className="shrink-0 flex items-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-xs font-semibold px-3 py-2 rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
        >
          <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Asset reports</span>
        </button>

        <button
          onClick={() => router.push("/payroll/onboarding/import-asset")}
          className="shrink-0 flex items-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-xs font-semibold px-3 py-2 rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
        >
          <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Import assets</span>
        </button>

        <span className="shrink-0 w-7.5 h-7.5 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[11px] font-bold shadow-2xs">
          {user?.name?.slice(0, 2).toUpperCase() || "AU"}
        </span>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 pt-5 pb-24">
        {/* Title & Employee Code Selector */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-4">
          <div>
            <h1 className="text-[21px] font-bold tracking-tight text-[#1E293B] dark:text-[#E7ECF3]">
              Employee asset issue
            </h1>
            <p className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-1">
              Issue laptops, SIMs, uniforms or tools against an employee, and track what comes back.
            </p>
          </div>

          <div className="w-full md:w-80 shrink-0">
            <Eselect
              title="EMPLOYEE CODE"
              name="selectedEmpCode"
              option={empcodeOptions}
              handleInputChange={(_, value) => setSelectedEmpCode(value)}
              initialValue={selectedEmpCode}
              placeholder="Select employee code"
              className="!h-10 !text-xs !bg-white dark:!bg-[#0E1524]"
              redlabel="*"
            />
          </div>
        </div>

        {/* ── CARD: EMPLOYEE PROFILE DETAILS (232px right photo column) ─ */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-4 sm:p-5 mb-3.5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_232px] gap-5">
          <div>
            {selectedEmpCode && empDetails ? (
              <div>
                {/* Header inside profile */}
                <div className="flex items-center gap-3 mb-3.5">
                  <span className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-bold bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-[#1E293B] dark:text-[#E7ECF3] tracking-tight truncate">
                      {empDetails.name || selectedEmpCode}
                    </div>
                    <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
                      {selectedEmpCode} · {empDetails.DESIGNATION || "General Manager"} ·{" "}
                      {empDetails.BRANCH || "Branch - 1"}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <span className="text-[10.5px] font-bold text-[#10B981] bg-[rgba(16,185,129,.14)] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                    {inUseCount} assets in use
                  </span>
                </div>

                {/* 3-column metadata grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-2.5 pt-3 border-t border-[#E2E8F0] dark:border-[#1F2937] text-[12.5px]">
                  {empRows.map((r, i) => (
                    <div key={i} className="flex gap-2.5 items-baseline min-w-0">
                      <span className="w-26 shrink-0 text-[#64748B] dark:text-[#94A3B8]">
                        {r.label}
                      </span>
                      <span className="flex-1 min-w-0 font-medium text-[#1E293B] dark:text-[#E7ECF3] truncate">
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 px-3 text-center">
                <span className="inline-grid place-items-center w-10.5 h-10.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] dark:text-[#94A3B8] mx-auto">
                  <UserSearch className="w-5 h-5" />
                </span>
                <div className="text-[13.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-3">
                  Pick an employee code
                </div>
                <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                  Their master details and existing assets load here.
                </div>
              </div>
            )}
          </div>

          {/* Right photo container (232px column with border-left) */}
          <div className="border-t lg:border-t-0 lg:border-l border-[#E2E8F0] dark:border-[#1F2937] pt-4 lg:pt-0 lg:pl-5 flex flex-col items-center justify-center gap-2.5">
            <div className="w-28 h-28 rounded-xl border border-dashed border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] grid place-items-center text-[#64748B] dark:text-[#94A3B8] overflow-hidden relative shadow-2xs">
              {selectedEmpCode && empDetails?.photo ? (
                <Image
                  src={`data:image/jpeg;base64,${empDetails.photo}`}
                  alt="Employee"
                  fill
                  className="object-cover"
                />
              ) : selectedEmpCode && empDetails ? (
                <span className="text-[26px] font-bold text-[#4F46E5] dark:text-[#8B84FF]">
                  {initials}
                </span>
              ) : (
                <ImageOff className="w-6 h-6 opacity-60" />
              )}
            </div>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] text-center font-medium">
              {selectedEmpCode && empDetails?.photo
                ? "Employee photo"
                : selectedEmpCode
                ? "Profile photo not uploaded"
                : "No image available"}
            </span>
          </div>
        </div>

        {/* ── CARD: ASSETS TO ISSUE (MIN-WIDTH 1580px TABLE) ───────────── */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden mb-3.5">
          {/* Card Title Bar */}
          <div className="flex items-center gap-2.5 px-4.5 py-3 border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <span className="w-6.5 h-6.5 rounded-lg grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
              <Package className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
              Assets to issue
            </h2>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-mono">
              {newAssetsToIssue.length} row(s)
            </span>
            <div className="flex-1" />
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add asset</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[1580px]">
              {/* Header Grid: 52px 160px 150px 150px 140px 180px 140px 140px 140px 140px 180px 130px 48px */}
              <div className="grid grid-cols-[52px_160px_150px_150px_140px_180px_140px_140px_140px_140px_180px_130px_48px] bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937] text-[10.5px] font-bold tracking-wider uppercase text-[#64748B] dark:text-[#94A3B8]">
                <span className="py-2.5 px-2.5 text-center">#</span>
                <span className="py-2.5 px-2.5">Asset Category</span>
                <span className="py-2.5 px-2.5">IT Category</span>
                <span className="py-2.5 px-2.5">Serial No</span>
                <span className="py-2.5 px-2.5">Asset Code</span>
                <span className="py-2.5 px-2.5">Asset Name</span>
                <span className="py-2.5 px-2.5">Asset Type</span>
                <span className="py-2.5 px-2.5">Issue Date</span>
                <span className="py-2.5 px-2.5">Return Date</span>
                <span className="py-2.5 px-2.5">Lost Date</span>
                <span className="py-2.5 px-2.5">Remark</span>
                <span className="py-2.5 px-2.5">Image</span>
                <span className="py-2.5 px-2.5 text-center"></span>
              </div>

              {/* Rows */}
              {newAssetsToIssue.length === 0 ? (
                <div className="py-9 px-5 text-center">
                  <div className="text-[13px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    No assets queued
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                    Add a row to issue the first asset.
                  </div>
                </div>
              ) : (
                newAssetsToIssue.map((service, idx) => {
                  const actualIndex = services.indexOf(service);
                  const ok = isRowValid(service);

                  return (
                    <div
                      key={actualIndex}
                      className={`grid grid-cols-[52px_160px_150px_150px_140px_180px_140px_140px_140px_140px_180px_130px_48px] items-center border-b border-[#E2E8F0] dark:border-[#1F2937] transition-colors ${
                        ok ? "bg-transparent" : "bg-[rgba(245,158,11,.04)]"
                      }`}
                    >
                      {/* Index & Dot */}
                      <span className="py-2 px-2.5 flex items-center justify-center gap-1.5">
                        <span
                          className={`w-1.75 h-1.75 rounded-full shrink-0 ${
                            ok ? "bg-[#10B981]" : "bg-[#F59E0B]"
                          }`}
                        />
                        <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">
                          {idx + 1}
                        </span>
                      </span>

                      {/* Asset Category */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Eselect
                          title=""
                          name="Asset_category"
                          option={CATEGORIES}
                          handleInputChange={(name, value) =>
                            handleChangesubcategory(name, value, actualIndex)
                          }
                          initialValue={service.Asset_category}
                          placeholder="Select"
                          className="!h-8 !text-xs !bg-transparent dark:!bg-[#0E1524] !border-[#E2E8F0] dark:!border-[#1F2937]"
                        />
                      </span>

                      {/* IT Category */}
                      <span className="py-1 px-1.5 min-w-0">
                        {service.Asset_category === "IT equipment" || service.Asset_category === "IT" ? (
                          <Eselect
                            title=""
                            name="It_category"
                            option={ittype}
                            handleInputChange={(name, value) =>
                              handleChangesubcategory(name, value, actualIndex)
                            }
                            initialValue={service.It_category || ""}
                            placeholder="Select"
                            className="!h-8 !text-xs !bg-transparent dark:!bg-[#0E1524] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          />
                        ) : (
                          <span className="text-[#64748B] text-xs pl-2">—</span>
                        )}
                      </span>

                      {/* Serial No */}
                      <span className="py-1 px-1.5 min-w-0">
                        <input
                          type="text"
                          name="Asset_Serial_no"
                          value={service.Asset_Serial_no || ""}
                          onChange={(e) => handleChange(actualIndex, e)}
                          placeholder="Manufacturer serial"
                          className="w-full h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-2 outline-none focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-all placeholder:text-[#64748B] placeholder:opacity-65"
                        />
                      </span>

                      {/* Asset Code */}
                      <span className="py-1 px-1.5 min-w-0">
                        <input
                          type="text"
                          name="Aset_Code"
                          value={service.Aset_Code || ""}
                          onChange={(e) => handleChange(actualIndex, e)}
                          placeholder="AV-ASSET-000"
                          className="w-full h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-2 outline-none focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-all placeholder:text-[#64748B] placeholder:opacity-65 font-mono"
                        />
                      </span>

                      {/* Asset Name */}
                      <span className="py-1 px-1.5 min-w-0">
                        <input
                          type="text"
                          name="Aset_Name"
                          value={service.Aset_Name || ""}
                          onChange={(e) => handleChange(actualIndex, e)}
                          placeholder="e.g. Dell Latitude 3540"
                          className="w-full h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-2 outline-none focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-all placeholder:text-[#64748B] placeholder:opacity-65"
                        />
                      </span>

                      {/* Asset Type */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Eselect
                          title=""
                          name="Asset_Type"
                          option={TYPES}
                          handleInputChange={(name, value) =>
                            handleChangesubcategory(name, value, actualIndex)
                          }
                          initialValue={service.Asset_Type || "Returnable"}
                          placeholder="Select"
                          className="!h-8 !text-xs !bg-transparent dark:!bg-[#0E1524] !border-[#E2E8F0] dark:!border-[#1F2937]"
                        />
                      </span>

                      {/* Issue Date */}
                      <span className="py-1 px-1.5 min-w-0">
                        <input
                          type="date"
                          name="Issue_Date"
                          value={service.Issue_Date || ""}
                          onChange={(e) => handleChange(actualIndex, e)}
                          className="w-full h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-2 outline-none focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-all"
                        />
                      </span>

                      {/* Return Date */}
                      <span className="py-1 px-1.5 min-w-0">
                        <input
                          type="date"
                          name="Revoke_Date"
                          value={service.Revoke_Date || ""}
                          onChange={(e) => handleChange(actualIndex, e)}
                          className="w-full h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-2 outline-none focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-all"
                        />
                      </span>

                      {/* Lost Date */}
                      <span className="py-1 px-1.5 min-w-0">
                        <input
                          type="date"
                          name="Lost_Date"
                          value={service.Lost_Date || ""}
                          onChange={(e) => handleChange(actualIndex, e)}
                          className="w-full h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-2 outline-none focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-all"
                        />
                      </span>

                      {/* Remark */}
                      <span className="py-1 px-1.5 min-w-0">
                        <input
                          type="text"
                          name="Revoke_Rem"
                          value={service.Revoke_Rem || ""}
                          onChange={(e) => handleChange(actualIndex, e)}
                          placeholder="Optional note"
                          className="w-full h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-2 outline-none focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-all placeholder:text-[#64748B] placeholder:opacity-65"
                        />
                      </span>

                      {/* Upload Image */}
                      <span className="py-1 px-2">
                        <div className="flex items-center gap-1.5">
                          <label className="cursor-pointer w-full flex items-center justify-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[11.5px] font-semibold px-2 py-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors whitespace-nowrap overflow-hidden text-[#64748B] dark:text-[#94A3B8]">
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{service?.uploaded_document ? "Attached" : "Upload"}</span>
                            <input
                              type="file"
                              onChange={(e) => handleFileChange(e, actualIndex)}
                              className="hidden"
                            />
                          </label>

                          {service?.uploaded_document && (
                            <FileViewer
                              fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${service.uploaded_document}`}
                              Title="Asset Doc"
                              celldata=""
                            />
                          )}
                        </div>
                      </span>

                      {/* Remove */}
                      <span className="grid place-items-center">
                        <button
                          type="button"
                          onClick={() => removeRow(actualIndex)}
                          className="w-6.5 h-6.5 grid place-items-center border-none bg-transparent text-[#64748B] hover:text-[#E11D48] hover:bg-[rgba(225,29,72,.12)] rounded-lg transition-colors cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── CARD: ALREADY ISSUED ASSETS ─────────────────────────────── */}
        {selectedEmpCode && issuedAssets.length > 0 && (
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4.5 py-3 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="w-6.5 h-6.5 rounded-lg grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
                <Archive className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                Already issued to {empDetails?.name || selectedEmpCode}
              </h2>
              <div className="flex-1" />
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                {issuedAssets.length} assets
              </span>
            </div>

            {/* 3-Column Asset Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 sm:p-4.5">
              {issuedAssets.map((asset, index) => {
                const isReturned = Boolean(asset.Revoke_Date && asset.Revoke_Date !== "null");
                const isLost = Boolean(asset.Lost_Date && asset.Lost_Date !== "null");
                const isConsumable = asset.Asset_Type === "Consumable";

                let statusBadge = {
                  text: "In use",
                  fg: "#10B981",
                  bg: "rgba(16,185,129,.14)",
                };
                if (isReturned) {
                  statusBadge = {
                    text: "Returned",
                    fg: "#64748B",
                    bg: "rgba(100,116,139,.14)",
                  };
                } else if (isLost) {
                  statusBadge = {
                    text: "Lost",
                    fg: "#E11D48",
                    bg: "rgba(225,29,72,.14)",
                  };
                } else if (isConsumable) {
                  statusBadge = {
                    text: "Consumed",
                    fg: "#F59E0B",
                    bg: "rgba(245,158,11,.14)",
                  };
                }

                const iconInfo = getAssetIconInfo(asset);

                return (
                  <div
                    key={index}
                    className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[11px] p-3.5 hover:border-[#4F46E5] dark:hover:border-[#8B84FF] transition-colors bg-white dark:bg-[#111827]"
                  >
                    {/* Top Row: Icon + Name/Code + Badge */}
                    <div className="flex items-center gap-2.5">
                      <span
                        style={{ background: iconInfo.bg, color: iconInfo.tint }}
                        className="w-7 h-7 rounded-lg shrink-0 grid place-items-center"
                      >
                        {iconInfo.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] truncate">
                          {asset.Aset_Name || asset.It_category || "Asset"}
                        </span>
                        <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono mt-0.5 truncate">
                          {asset.Aset_Code || asset.Asset_Serial_no || "AV-ASSET"}
                        </span>
                      </span>
                      <span
                        style={{ color: statusBadge.fg, background: statusBadge.bg }}
                        className="shrink-0 text-[10.5px] font-bold px-2 py-0.75 rounded-full whitespace-nowrap"
                      >
                        {statusBadge.text}
                      </span>
                    </div>

                    {/* Metadata list */}
                    <div className="flex flex-col gap-1.25 mt-2.75 pt-2.75 border-t border-[#E2E8F0] dark:border-[#1F2937] text-xs">
                      <div className="flex gap-2.5 min-w-0">
                        <span className="w-21 shrink-0 text-[#64748B] dark:text-[#94A3B8]">
                          Category
                        </span>
                        <span className="flex-1 min-w-0 font-medium text-[#1E293B] dark:text-[#E7ECF3] truncate">
                          {asset.It_category || asset.Asset_category || "General"}
                        </span>
                      </div>
                      <div className="flex gap-2.5 min-w-0">
                        <span className="w-21 shrink-0 text-[#64748B] dark:text-[#94A3B8]">
                          Issued on
                        </span>
                        <span className="flex-1 min-w-0 font-medium text-[#1E293B] dark:text-[#E7ECF3] truncate">
                          {formatDateDisplay(asset.Issue_Date || asset.created_at_date)}
                        </span>
                      </div>
                      <div className="flex gap-2.5 min-w-0">
                        <span className="w-21 shrink-0 text-[#64748B] dark:text-[#94A3B8]">
                          Type
                        </span>
                        <span className="flex-1 min-w-0 font-medium text-[#1E293B] dark:text-[#E7ECF3] truncate">
                          {asset.Asset_Type || "Returnable"}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 flex items-center gap-2">
                      {!isReturned && !isLost && !isConsumable ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReturnAsset(asset);
                            setReturnData({
                              Revoke_Date: new Date().toISOString().split("T")[0],
                              Lost_Date: "",
                              Revoke_Rem: asset.Revoke_Rem || "",
                            });
                            setReturnDialogOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#4F46E5] dark:text-[#8B84FF] text-xs font-semibold py-1.75 px-2.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Mark returned</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHistoryAsset(asset);
                            setHistoryDialogOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold py-1.75 px-2.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>View history</span>
                        </button>
                      )}

                      {asset?.uploaded_document && (
                        <div className="shrink-0">
                          <FileViewer
                            fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${asset.uploaded_document}`}
                            Title="Doc"
                            celldata=""
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM ACTION BAR ─────────────────────────────────── */}
      <div className="sticky bottom-0 z-40 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] px-4 sm:px-6 py-3 flex items-center gap-3.5">
        <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] truncate">
          {selectedEmpCode && empDetails?.name
            ? `${empDetails.name} · ${validCount} of ${newAssetsToIssue.length} rows ready`
            : "Select an employee to begin"}
        </span>

        <div className="flex-1" />

        <button
          onClick={() => {
            if (!selectedEmpCode) {
              showSideAlert("Select an employee first", "warning");
              return;
            }
            const url = `${process.env.NEXT_PUBLIC_URL}/asset/AssetViewEmployeeMaster?compcode=${user?.Comp_Code}&EmpCode=${selectedEmpCode}`;
            window.open(url, "_blank");
          }}
          className="flex items-center gap-1.75 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] font-semibold px-3.5 py-2.25 rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors cursor-pointer shadow-2xs"
        >
          <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>View all assets</span>
        </button>

        <button
          onClick={SaveAssets}
          disabled={!selectedEmpCode || validCount === 0 || isLoading}
          className={`flex items-center gap-1.75 border border-transparent text-white text-[12.5px] font-semibold px-4 py-2.25 rounded-xl transition-all shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] ${
            selectedEmpCode && validCount > 0
              ? "bg-[#4F46E5] hover:bg-[#4338CA] cursor-pointer"
              : "bg-[#64748B] opacity-50 cursor-not-allowed"
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Issue {validCount} asset(s)</span>
        </button>
      </div>

      {/* ── DIALOG: MARK ASSET RETURNED / LOST ────────────────────────── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent
          style={{ maxWidth: "540px" }}
          className="bg-white dark:bg-[#111827] !border !border-[#E2E8F0] dark:!border-[#1F2937] p-5 sm:p-6 rounded-xl !shadow-2xl w-[94vw]"
        >
          <DialogHeader className="mb-3">
            <DialogTitle className="text-base font-bold text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2">
              <RotateCcw className="w-4.5 h-4.5 text-[#4F46E5]" />
              <span>Mark Asset Returned / Revoked</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Update the return details for {selectedReturnAsset?.Aset_Name || "this asset"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-1">
            <div className="bg-[#F8FAFC] dark:bg-[#0E1524] p-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] text-xs flex justify-between">
              <div>
                <span className="text-[#64748B]">Asset: </span>
                <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  {selectedReturnAsset?.Aset_Name || "—"}
                </span>
              </div>
              <div>
                <span className="text-[#64748B]">Code: </span>
                <span className="font-mono font-bold text-[#4F46E5]">
                  {selectedReturnAsset?.Aset_Code || "—"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={returnData.Revoke_Date}
                onChange={(e) => setReturnData((prev) => ({ ...prev, Revoke_Date: e.target.value }))}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent px-3 text-xs text-[#1E293B] dark:text-[#E7ECF3] focus:border-[#4F46E5] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                Lost Date (If lost)
              </label>
              <input
                type="date"
                value={returnData.Lost_Date}
                onChange={(e) => setReturnData((prev) => ({ ...prev, Lost_Date: e.target.value }))}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent px-3 text-xs text-[#1E293B] dark:text-[#E7ECF3] focus:border-[#4F46E5] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1">
                Return Remarks
              </label>
              <input
                type="text"
                placeholder="Reason or condition of returned asset..."
                value={returnData.Revoke_Rem}
                onChange={(e) => setReturnData((prev) => ({ ...prev, Revoke_Rem: e.target.value }))}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent px-3 text-xs text-[#1E293B] dark:text-[#E7ECF3] focus:border-[#4F46E5] outline-none placeholder:text-[#64748B]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1F2937]">
              <AButton variant="outline" size="sm" onClick={() => setReturnDialogOpen(false)}>
                Cancel
              </AButton>
              <AButton
                variant="primary"
                size="sm"
                onClick={handleConfirmReturn}
                className="!bg-[#4F46E5] hover:!bg-[#4338CA]"
              >
                Confirm Return
              </AButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: VIEW ASSET HISTORY & DETAILS ─────────────────────── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent
          style={{ maxWidth: "620px" }}
          className="bg-white dark:bg-[#111827] !border !border-[#E2E8F0] dark:!border-[#1F2937] p-5 sm:p-6 rounded-xl !shadow-2xl w-[94vw] max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader className="mb-3">
            <DialogTitle className="text-base font-bold text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-[#4F46E5]" />
              <span>Asset Details & History</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Complete metadata for {selectedHistoryAsset?.Aset_Name || "this asset"}.
            </DialogDescription>
          </DialogHeader>

          {selectedHistoryAsset && (
            <div className="space-y-3.5 mt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAFC] dark:bg-[#0E1524] p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#1F2937]">
                <div>
                  <span className="text-[#64748B] block">Asset Name</span>
                  <span className="font-bold text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedHistoryAsset.Aset_Name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Asset Code</span>
                  <span className="font-mono font-bold text-[#4F46E5]">
                    {selectedHistoryAsset.Aset_Code || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Serial No</span>
                  <span className="font-mono text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedHistoryAsset.Asset_Serial_no || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Category</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedHistoryAsset.Asset_category || "—"}{" "}
                    {selectedHistoryAsset.It_category ? `(${selectedHistoryAsset.It_category})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Issue Date</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    {formatDateDisplay(selectedHistoryAsset.Issue_Date)}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Return Date</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    {formatDateDisplay(selectedHistoryAsset.Revoke_Date)}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Created By</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedHistoryAsset.Created_by || "—"} ({selectedHistoryAsset.created_at_time || "—"})
                  </span>
                </div>
              </div>

              {selectedHistoryAsset.Revoke_Rem && (
                <div className="bg-[rgba(245,158,11,.08)] p-3 rounded-lg border border-[rgba(245,158,11,.2)] text-xs">
                  <span className="font-bold text-[#F59E0B] block mb-0.5">Remarks:</span>
                  <p className="text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedHistoryAsset.Revoke_Rem}
                  </p>
                </div>
              )}

              {selectedHistoryAsset.uploaded_document && (
                <div className="pt-1">
                  <span className="text-xs font-bold text-[#64748B] block mb-1">
                    Attached Document
                  </span>
                  <FileViewer
                    fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${selectedHistoryAsset.uploaded_document}`}
                    Title="Attached Document"
                    celldata=""
                  />
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-[#E2E8F0] dark:border-[#1F2937]">
                <AButton variant="outline" size="sm" onClick={() => setHistoryDialogOpen(false)}>
                  Close
                </AButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
