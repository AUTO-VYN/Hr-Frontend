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
import Einput from "@/components/atoms/Einput";
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

function isValidDateValue(dateStr?: string | null) {
  if (!dateStr || dateStr === "null" || dateStr === "NULL" || dateStr === "—" || dateStr === " " || dateStr === "undefined") {
    return false;
  }
  const clean = String(dateStr).trim();
  if (
    clean.startsWith("1900-01-01") ||
    clean.startsWith("1970-01-01") ||
    clean.startsWith("0000-00-00") ||
    clean === "1900-01-01" ||
    clean === "1970-01-01"
  ) {
    return false;
  }
  return true;
}

function formatDDMMYYYY(dateStr?: string | null) {
  if (!dateStr || dateStr === "null" || dateStr === "NULL" || dateStr === "—" || dateStr === " " || dateStr === "undefined") {
    return "—";
  }
  try {
    const cleanStr = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
      const [y, m, d] = cleanStr.slice(0, 10).split("-");
      return `${d}-${m}-${y}`;
    }
    const dateObj = new Date(cleanStr);
    if (isNaN(dateObj.getTime())) return cleanStr;
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateStr);
  }
}

function formatDateDisplay(dateStr?: string | null) {
  if (!isValidDateValue(dateStr)) return "—";
  try {
    const cleanStr = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
      const [y, m, d] = cleanStr.slice(0, 10).split("-").map(Number);
      if (y <= 1900 || y === 1970) return "—";
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const dateObj = new Date(cleanStr);
    if (isNaN(dateObj.getTime()) || dateObj.getFullYear() <= 1900 || dateObj.getFullYear() === 1970) return "—";
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

const CATEGORIES = [
  { value: "IT", label: "IT" },
  { value: "NON-IT", label: "NON-IT" },
];

const TYPES = [
  { value: "Fixed", label: "Fixed" },
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
      Asset_category: "IT",
      It_category: "",
      Asset_Serial_no: "",
      Aset_Code: "",
      Aset_Name: "",
      Asset_Type: "Fixed",
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
  const [masterData, setMasterData] = useState<any>(null);

  // ── Fetch Employee Masters (Locations, Designations, Divisions, States) ──
  useEffect(() => {
    if (!user?.Comp_Code) return;

    const fetchMasters = async () => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (response.data?.data) {
          setMasterData(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching employee masters:", err);
      }
    };

    fetchMasters();
  }, [user?.Comp_Code, user?.name]);

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
            JOININGDATE: emp.PREJOININGDATE,
            GENDER: emp.GENDER || "—",
            BRANCH: emp.BRANCH || emp.PCITY || user?.branch || "—",
            DEPARTMENT: emp.DEVISION || emp.SKILLS || "—",
            DESIGNATION: emp.DESIGNATION || emp.PREDESIGNATION || "—",
            REPORTING_1: emp.Reporting_1 || emp.REPORTING || emp.EMPREFERENCENAME || "—",
            HOD: emp.HOD || "—",
            HR: emp.HR || emp.HR_MANAGER || "—",
            REGION: emp.REGION || "—",
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

        const toDateInputString = (val: any) => {
          if (!val || val === "null" || val === "NULL" || val === "undefined" || val === "—") return "";
          const str = String(val).trim();
          if (
            str.startsWith("1900-01-01") ||
            str.startsWith("1970-01-01") ||
            str.startsWith("0000-00-00") ||
            str === "null" ||
            str === "NULL"
          ) {
            return "";
          }
          if (str.includes("T")) {
            const datePart = str.split("T")[0];
            if (
              datePart.startsWith("1900-01-01") ||
              datePart.startsWith("1970-01-01") ||
              datePart.startsWith("0000-00-00")
            ) {
              return "";
            }
            return datePart;
          }
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            if (
              str.startsWith("1900-01-01") ||
              str.startsWith("1970-01-01") ||
              str.startsWith("0000-00-00")
            ) {
              return "";
            }
            return str;
          }
          const d = new Date(str);
          if (isNaN(d.getTime()) || d.getFullYear() <= 1900 || d.getFullYear() === 1970) return "";
          return d.toISOString().split("T")[0];
        };

        const fetchedAssets =
          assetRes?.data?.data?.AssetIssue?.map((item: any) => {
            const createdAt = item.created_at ? new Date(item.created_at) : new Date();
            const date = createdAt.toISOString().split("T")[0];
            const time = createdAt.toTimeString().split(" ")[0].slice(0, 5);

            return {
              ...item,
              Issue_Date: toDateInputString(item.Issue_Date),
              Revoke_Date: toDateInputString(item.Revoke_Date),
              Lost_Date: toDateInputString(item.Lost_Date),
              created_at_date: item.created_at_date || date,
              created_at_time: item.created_at_time || time,
              isIssued: true,
              isEditing: false,
              It_category: item.It_category?.trim() || "",
              Asset_category: item.Asset_category?.trim() || (item.It_category ? "IT" : "NON-IT"),
            };
          }) || [];

        const emptyRow = {
          Asset_category: "IT",
          It_category: "",
          Asset_Serial_no: "",
          Aset_Code: "",
          Aset_Name: "",
          Asset_Type: "Fixed",
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
          Asset_category: "IT",
          It_category: "",
          Asset_Serial_no: "",
          Aset_Code: "",
          Aset_Name: "",
          Asset_Type: "Fixed",
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
        Asset_category: "IT",
        It_category: "",
        Asset_Serial_no: "",
        Aset_Code: "",
        Aset_Name: "",
        Asset_Type: "Fixed",
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
    setServices((prev) =>
      prev
        .map((service, i) => {
          if (i === index) {
            if (service.isEditing || service.UTD) {
              return { ...service, isIssued: true, isEditing: false };
            }
            return null;
          }
          return service;
        })
        .filter(Boolean) as any[]
    );
  };

  const handleCardDoubleClick = (asset: any) => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    setServices((prev) => {
      // Filter out completely blank new rows
      const filtered = prev.filter((s) => {
        if (s.isIssued) return true;
        return Boolean(
          s.Asset_Serial_no ||
          s.Aset_Code ||
          s.Aset_Name ||
          s.Revoke_Rem ||
          s.uploaded_document ||
          s.isEditing
        );
      });

      return filtered.map((s) => {
        const isMatch =
          (asset.UTD != null && s.UTD === asset.UTD) ||
          (asset.Aset_Code && s.Aset_Code === asset.Aset_Code && s.Asset_Serial_no === asset.Asset_Serial_no);

        if (isMatch) {
          return {
            ...s,
            isIssued: false,
            isEditing: true,
          };
        }
        return s;
      });
    });

    showSideAlert(`Loaded "${asset.Aset_Name || asset.Aset_Code || "Asset"}" for editing`, "info");
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setServices((prev) =>
      prev.map((service, i) => (i === index ? { ...service, [name]: value } : service))
    );
  };

  const handleFieldChange = (index: number, name: string, value: any) => {
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

    const sanitizedRows = validRows.map((r) => ({
      ...r,
      Revoke_Date: isValidDateValue(r.Revoke_Date) ? r.Revoke_Date : null,
      Lost_Date: isValidDateValue(r.Lost_Date) ? r.Lost_Date : null,
      Revoke_Rem: r.Revoke_Rem || null,
    }));

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/AssetDetailsSave`,
        {
          AssetIssue: sanitizedRows,
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

  // ── Update Assets (e.g. Return/Revoke or Edit) ─────────────────────────
  const UpdateAssets = async (overrideServices?: any[]) => {
    if (!selectedEmpCode) {
      showSideAlert("Please select Employee Code first", "info");
      return;
    }

    const unissuedRows = services.filter((s) => !s.isIssued);
    const validRows = unissuedRows.filter((r) => isRowValid(r));

    if (!overrideServices && validRows.length === 0) {
      showSideAlert("Fill category, serial, code, name, type and issue date", "warning");
      return;
    }

    setIsLoading(true);
    const rawData = overrideServices || services;

    const dataToSend = rawData.filter(
      (s) => s.isIssued || isRowValid(s) || s.isEditing
    );

    const updatedServices = dataToSend.map((service) => {
      const { UTD, isIssued, isEditing, ...serviceWithoutUTD } = service;
      return {
        ...serviceWithoutUTD,
        Revoke_Date: isValidDateValue(serviceWithoutUTD.Revoke_Date) ? serviceWithoutUTD.Revoke_Date : null,
        Lost_Date: isValidDateValue(serviceWithoutUTD.Lost_Date) ? serviceWithoutUTD.Lost_Date : null,
        Revoke_Rem: serviceWithoutUTD.Revoke_Rem || null,
      };
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

      await handleEmpChange(selectedEmpCode);
      showSideAlert(response.data?.Message || "Asset updated successfully", "success");
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
          Revoke_Date: returnData.Revoke_Date || null,
          Lost_Date: returnData.Lost_Date || null,
          Revoke_Rem: returnData.Revoke_Rem || "",
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
  const isEditMode = useMemo(() => services.some((s) => s.isEditing), [services]);

  const inUseCount = useMemo(
    () =>
      issuedAssets.filter(
        (a) => !isValidDateValue(a.Revoke_Date) && !isValidDateValue(a.Lost_Date)
      ).length,
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
    const cat = (asset.Asset_category || asset.It_category || "").toLowerCase();
    const name = (asset.Aset_Name || "").toLowerCase();

    if (cat.includes("it") || name.includes("laptop") || name.includes("computer") || name.includes("dell") || name.includes("lenovo") || name.includes("hp")) {
      return { icon: <Laptop className="w-5 h-5" />, bg: "bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-400" };
    }
    if (cat.includes("mobile") || cat.includes("sim") || name.includes("sim") || name.includes("phone") || name.includes("airtel") || name.includes("jio")) {
      return { icon: <Smartphone className="w-5 h-5" />, bg: "bg-sky-50 dark:bg-sky-950/50 text-sky-500 dark:text-sky-400" };
    }
    if (cat.includes("uniform") || name.includes("shirt") || name.includes("uniform") || name.includes("set") || name.includes("pcs")) {
      return { icon: <Shirt className="w-5 h-5" />, bg: "bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400" };
    }
    if (cat.includes("furniture") || name.includes("desk") || name.includes("chair")) {
      return { icon: <Armchair className="w-5 h-5" />, bg: "bg-purple-50 dark:bg-purple-950/50 text-purple-500 dark:text-purple-400" };
    }
    if (cat.includes("tool") || name.includes("tool")) {
      return { icon: <Wrench className="w-5 h-5" />, bg: "bg-teal-50 dark:bg-teal-950/50 text-teal-500 dark:text-teal-400" };
    }
    if (cat.includes("vehicle") || name.includes("car") || name.includes("bike")) {
      return { icon: <Car className="w-5 h-5" />, bg: "bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400" };
    }
    return { icon: <Box className="w-5 h-5" />, bg: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" };
  };

  const empRows = useMemo(() => {
    if (!empDetails) return [];

    const resolveLabel = (list: any[], val: any) => {
      if (val === undefined || val === null || val === "" || val === "—" || val === "0" || val === 0) return "";
      if (!list || !Array.isArray(list)) return "";
      const match = list.find((item: any) => {
        const itemVal = item?.value ?? item?.code ?? item?.id ?? item?.misc_code ?? item?.Loc_Code ?? item?.Godw_Code;
        const itemLabel = item?.label ?? item?.name ?? item?.misc_name ?? item?.Godw_Name ?? item?.Loc_Name;
        return (
          String(itemVal) === String(val) ||
          String(itemLabel || "").toLowerCase() === String(val).toLowerCase()
        );
      });
      if (match) {
        return match.label || match.name || match.misc_name || match.Godw_Name || match.Loc_Name || "";
      }
      return "";
    };

    const resolveEmpName = (empCodeVal: any) => {
      if (!empCodeVal || empCodeVal === "—") return "";
      const match = empcodeOptions.find((opt) => String(opt.value) === String(empCodeVal));
      if (match?.label) {
        return match.label;
      }
      return String(empCodeVal);
    };

    const locationName =
      resolveLabel(masterData?.LOCATION, empDetails.BRANCH) ||
      resolveLabel(masterData?.LOCATION, empDetails.LOCATION) ||
      resolveLabel(masterData?.LOCATION, empDetails.Loc_Code) ||
      resolveLabel(masterData?.CITY, empDetails.PCITY) ||
      resolveLabel(masterData?.CITY, empDetails.BRANCH) ||
      resolveLabel(masterData?.STATE, empDetails.BRANCH) ||
      (empDetails.BRANCH && empDetails.BRANCH !== "0" && !/^\d+$/.test(String(empDetails.BRANCH)) ? empDetails.BRANCH : "") ||
      (empDetails.LOCATION && empDetails.LOCATION !== "0" && !/^\d+$/.test(String(empDetails.LOCATION)) ? empDetails.LOCATION : "") ||
      user?.branch ||
      "—";

    const desigName =
      resolveLabel(
        masterData?.EMPLOYEEDESIGNATION,
        empDetails.EMPLOYEEDESIGNATION
      ) ||
      resolveLabel(
        masterData?.EMPLOYEEDESIGNATION,
        empDetails.DESIGNATION
      ) ||
      resolveLabel(
        masterData?.EMPLOYEEDESIGNATION,
        empDetails.PREDESIGNATION
      ) ||
      (empDetails.EMPLOYEEDESIGNATION && empDetails.EMPLOYEEDESIGNATION !== "0" && !/^\d+$/.test(String(empDetails.EMPLOYEEDESIGNATION)) ? empDetails.EMPLOYEEDESIGNATION : "") ||
      (empDetails.ROLE && empDetails.ROLE !== "0" && !/^\d+$/.test(String(empDetails.ROLE)) ? empDetails.ROLE : "") ||
      (empDetails.PREDESIGNATION && empDetails.PREDESIGNATION !== "0" && !/^\d+$/.test(String(empDetails.PREDESIGNATION)) ? empDetails.PREDESIGNATION : "") ||
      (empDetails.DESIGNATION && empDetails.DESIGNATION !== "0" && !/^\d+$/.test(String(empDetails.DESIGNATION)) ? empDetails.DESIGNATION : "") ||
      "—";

    const deptName =
      resolveLabel(
        masterData?.DIVISION,
        empDetails.DEVISION || empDetails.DIVISION || empDetails.DEPARTMENT
      ) ||
      (empDetails.DEVISION && empDetails.DEVISION !== "0" && !/^\d+$/.test(String(empDetails.DEVISION)) ? empDetails.DEVISION : "") ||
      (empDetails.DEPARTMENT && empDetails.DEPARTMENT !== "0" && !/^\d+$/.test(String(empDetails.DEPARTMENT)) ? empDetails.DEPARTMENT : "") ||
      (empDetails.SKILLS && empDetails.SKILLS !== "0" ? empDetails.SKILLS : "") ||
      "—";

    const regionName =
      resolveLabel(masterData?.Sal_Region, empDetails.REGION) ||
      resolveLabel(masterData?.REGION, empDetails.REGION) ||
      (empDetails.REGION &&
      empDetails.REGION !== "0" &&
      empDetails.REGION !== "—" &&
      !/^\d+$/.test(String(empDetails.REGION))
        ? empDetails.REGION
        : "") ||
      "—";

    const repName =
      resolveEmpName(
        empDetails.Reporting_1 || empDetails.REPORTING || empDetails.EMPREFERENCENAME
      ) ||
      empDetails.REPORTING_1 ||
      "—";

    const hrName =
      resolveEmpName(empDetails.HR || empDetails.HR_MANAGER) ||
      empDetails.HR ||
      "—";

    const hodName =
      resolveEmpName(empDetails.HOD) ||
      resolveLabel(masterData?.HOD, empDetails.HOD) ||
      empDetails.HOD ||
      "—";

    return [
      { label: "Employee name", value: empDetails.name || "—" },
      { label: "Location", value: locationName },
      { label: "Designation", value: desigName },
      { label: "Date of joining", value: formatDDMMYYYY(empDetails.JOININGDATE) },
      { label: "Reporting 1", value: repName },
      { label: "HR manager", value: hrName },
      { label: "Region", value: regionName },
      { label: "Department", value: deptName },
      { label: "Gender", value: empDetails.GENDER || "—" },
      { label: "Date of birth", value: formatDateDisplay(empDetails.DOB) },
      { label: "HOD", value: hodName },
    ];
  }, [empDetails, masterData, empcodeOptions, user?.branch]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-sans antialiased">
      {/* ── TOP STICKY APP HEADER ─────────────────────────────────────── */}
      <header className=" top-0 z-30  dark:border-[#1F2937] px-4 sm:px-6 py-3 flex items-center gap-4">

        <div className="flex-1" />

        <AButton
          variant="outline"
          onClick={() => router.push("/payroll/onboarding/employee-asset-reports")}
          icon={<BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          className="shrink-0 border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-lg font-semibold px-3 py-2 rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#182235] shadow-2xs"
        >
          Asset reports
        </AButton>

        <AButton
          variant="outline"
          onClick={() => router.push("/payroll/onboarding/import-asset")}
          icon={<Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          className="shrink-0 border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-lg font-semibold px-3 py-2 rounded-xl hover:bg-[#F1F5F9] dark:hover:bg-[#182235] shadow-2xs"
        >
          Import assets
        </AButton>


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
              className="!h-10 !text-lg !bg-white dark:!bg-[#0E1524]"
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
                <div className="flex items-center gap-3.5 mb-3.5">
                  <span className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] shrink-0 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-[#1E293B] dark:text-[#E7ECF3] tracking-tight truncate">
                      {empDetails.name || selectedEmpCode}
                    </div>
                    <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 truncate">
                      {selectedEmpCode} · {empRows.find((r) => r.label === "Designation")?.value || "—"} ·{" "}
                      {empRows.find((r) => r.label === "Location")?.value || "—"}
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

        {/* ── CARD: ASSETS TO ISSUE (MIN-WIDTH 1760px TABLE) ───────────── */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden mb-5">
          {/* Card Title Bar */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-200 truncate">
                Assets to issue
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium shrink-0 whitespace-nowrap">
                {newAssetsToIssue.length} row(s)
              </span>
            </div>

            <AButton
              variant="primary"
              size="md"
              onClick={addRow}
              icon={<Plus className="w-4 h-4" />}
              className="shrink-0 whitespace-nowrap !bg-[#4F46E5] hover:!bg-[#4338CA] !h-8.5 sm:!h-9 !px-3 sm:!px-3.5 !rounded-xl !text-xs sm:!text-sm !font-semibold shadow-xs"
            >
              Add asset
            </AButton>
          </div>

          {/* Table Container with Custom Scrollbar */}
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[1760px]">
              {/* Header Grid */}
              <div className="grid grid-cols-[56px_180px_170px_170px_160px_200px_160px_160px_160px_160px_200px_140px_48px] bg-[#FAFBFD] dark:bg-[#0B1220] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                <span className="py-3 px-3 text-center">#</span>
                <span className="py-3 px-3">ASSET CATEGORY</span>
                <span className="py-3 px-3">IT CATEGORY</span>
                <span className="py-3 px-3">SERIAL NO</span>
                <span className="py-3 px-3">ASSET CODE</span>
                <span className="py-3 px-3">ASSET NAME</span>
                <span className="py-3 px-3">ASSET TYPE</span>
                <span className="py-3 px-3">ISSUE DATE</span>
                <span className="py-3 px-3">RETURN DATE</span>
                <span className="py-3 px-3">LOST DATE</span>
                <span className="py-3 px-3">REMARK</span>
                <span className="py-3 px-3">IMAGE</span>
                <span className="py-3 px-3 text-center"></span>
              </div>

              {/* Rows */}
              {newAssetsToIssue.length === 0 ? (
                <div className="py-12 px-5 text-center">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No assets queued
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Click &ldquo;+ Add asset&rdquo; to issue a new asset.
                  </div>
                </div>
              ) : (
                newAssetsToIssue.map((service, idx) => {
                  const actualIndex = services.indexOf(service);
                  const ok = isRowValid(service);

                  return (
                    <div
                      key={actualIndex}
                      className={`grid grid-cols-[56px_180px_170px_170px_160px_200px_160px_160px_160px_160px_200px_140px_48px] items-center border-b border-slate-100 dark:border-slate-800/80 py-2.5 px-1.5 transition-colors ${ok ? "bg-white dark:bg-[#111827]" : "bg-[#FFFDF7] dark:bg-[#1C1813]/40"
                        }`}
                    >
                      {/* Index & Dot */}
                      <span className="py-1 px-2 flex items-center justify-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${ok ? "bg-[#10B981]" : "bg-[#F59E0B]"
                            }`}
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                          className="!h-10 !text-xs sm:!text-[13px] !bg-[#FFFDF7] dark:!bg-[#181E2B] !border-[#F59E0B]/70 dark:!border-[#F59E0B]/50 !rounded-xl shadow-2xs"
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
                            className="!h-10 !text-xs sm:!text-[13px] !bg-[#FFFDF7] dark:!bg-[#181E2B] !border-[#F59E0B]/70 dark:!border-[#F59E0B]/50 !rounded-xl shadow-2xs"
                          />
                        ) : (
                          <div className="w-full h-10 rounded-xl bg-[#F8FAFC] dark:bg-[#182030] flex items-center px-3.5 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 font-medium">
                            Select
                          </div>
                        )}
                      </span>

                      {/* Serial No */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Einput
                          title=""
                          type="text"
                          name="Asset_Serial_no"
                          value={service.Asset_Serial_no || ""}
                          handleInputChange={(name, value) => handleFieldChange(actualIndex, name, value)}
                          placeholder="Manufacturer serial"
                          className="!h-10 !text-xs sm:!text-[13px] !bg-[#FFFDF7] dark:!bg-[#181E2B] !border-[#F59E0B]/70 dark:!border-[#F59E0B]/50 !rounded-xl shadow-2xs font-medium"
                        />
                      </span>

                      {/* Asset Code */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Einput
                          title=""
                          type="text"
                          name="Aset_Code"
                          value={service.Aset_Code || ""}
                          handleInputChange={(name, value) => handleFieldChange(actualIndex, name, value)}
                          placeholder="AV-ASSET-000"
                          className="!h-10 !text-xs sm:!text-[13px] !bg-[#FFFDF7] dark:!bg-[#181E2B] !border-[#F59E0B]/70 dark:!border-[#F59E0B]/50 !rounded-xl shadow-2xs font-mono font-medium"
                        />
                      </span>

                      {/* Asset Name */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Einput
                          title=""
                          type="text"
                          name="Aset_Name"
                          value={service.Aset_Name || ""}
                          handleInputChange={(name, value) => handleFieldChange(actualIndex, name, value)}
                          placeholder="e.g. Dell Latitude 3540"
                          className="!h-10 !text-xs sm:!text-[13px] !bg-[#FFFDF7] dark:!bg-[#181E2B] !border-[#F59E0B]/70 dark:!border-[#F59E0B]/50 !rounded-xl shadow-2xs font-medium"
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
                          initialValue={service.Asset_Type || "Fixed"}
                          placeholder="Select"
                          className="!h-10 !text-xs sm:!text-[13px] !bg-[#FFFDF7] dark:!bg-[#181E2B] !border-[#F59E0B]/70 dark:!border-[#F59E0B]/50 !rounded-xl shadow-2xs"
                        />
                      </span>

                      {/* Issue Date */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Einput
                          title=""
                          type="date"
                          name="Issue_Date"
                          value={service.Issue_Date || ""}
                          handleInputChange={(name, value) => handleFieldChange(actualIndex, name, value)}
                          className="!h-10 !text-xs sm:!text-[13px] !bg-[#FFFDF7] dark:!bg-[#181E2B] !border-[#F59E0B]/70 dark:!border-[#F59E0B]/50 !rounded-xl shadow-2xs cursor-pointer font-medium"
                        />
                      </span>

                      {/* Return Date */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Einput
                          title=""
                          type="date"
                          name="Revoke_Date"
                          value={service.Revoke_Date || ""}
                          handleInputChange={(name, value) => handleFieldChange(actualIndex, name, value)}
                          className="!h-10 !text-xs sm:!text-[13px] !border-transparent hover:!border-slate-200 !bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer font-medium"
                        />
                      </span>

                      {/* Lost Date */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Einput
                          title=""
                          type="date"
                          name="Lost_Date"
                          value={service.Lost_Date || ""}
                          handleInputChange={(name, value) => handleFieldChange(actualIndex, name, value)}
                          className="!h-10 !text-xs sm:!text-[13px] !border-transparent hover:!border-slate-200 !bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer font-medium"
                        />
                      </span>

                      {/* Remark */}
                      <span className="py-1 px-1.5 min-w-0">
                        <Einput
                          title=""
                          type="text"
                          name="Revoke_Rem"
                          value={service.Revoke_Rem || ""}
                          handleInputChange={(name, value) => handleFieldChange(actualIndex, name, value)}
                          placeholder="Optional note"
                          className="!h-10 !text-xs sm:!text-[13px] !border-transparent hover:!border-slate-200 !bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-[#94A3B8] font-medium"
                        />
                      </span>

                      {/* Upload Image */}
                      <span className="py-1 px-2">
                        <div className="flex items-center gap-1.5">
                          <label className="cursor-pointer w-full h-10 flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 rounded-xl shadow-2xs transition-colors whitespace-nowrap overflow-hidden">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
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
                        <AButton
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(actualIndex)}
                          className="!w-8 !h-8 !rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-0"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </AButton>
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
          <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden mb-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Archive className="w-4 h-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  Already issued to {empDetails?.name || selectedEmpCode}
                </h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium shrink-0 whitespace-nowrap">
                {issuedAssets.length} assets
              </span>
            </div>

            {/* 3-Column Asset Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-5">
              {issuedAssets.map((asset, index) => {
                const isReturned = isValidDateValue(asset.Revoke_Date);
                const isLost = isValidDateValue(asset.Lost_Date);
                const isConsumable = asset.Asset_Type === "Consumable";

                let statusBadge = {
                  text: "In use",
                  badgeClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
                };
                if (isReturned) {
                  statusBadge = {
                    text: "Returned",
                    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                  };
                } else if (isLost) {
                  statusBadge = {
                    text: "Lost",
                    badgeClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
                  };
                } else if (isConsumable) {
                  statusBadge = {
                    text: "Consumed",
                    badgeClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
                  };
                }

                const iconInfo = getAssetIconInfo(asset);

                return (
                  <div
                    key={index}
                    onDoubleClick={() => handleCardDoubleClick(asset)}
                    className="border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-[#111827] hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-2xs transition-all flex flex-col justify-between cursor-pointer select-none"
                    title="Double click to edit asset"
                  >
                    {/* Top Row: Icon + Name/Code + Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconInfo.bg}`}
                          >
                            {iconInfo.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 truncate">
                              {asset.Aset_Name || asset.It_category || "Asset"}
                            </h3>
                            <p className="text-md text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
                              {asset.Aset_Code || asset.Asset_Serial_no || "AV-ASSET-000"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 text-md font-semibold px-3 py-1 rounded-full ${statusBadge.badgeClass}`}
                        >
                          {statusBadge.text}
                        </span>
                      </div>

                      {/* Metadata list */}
                      <div className="space-y-2 mt-4.5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-lg">
                        <div className="flex items-center">
                          <span className="text-slate-500 dark:text-slate-400 w-32 shrink-0 font-normal">
                            Category
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {asset.It_category || asset.Asset_category || "General"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-slate-500 dark:text-slate-400 w-32 shrink-0 font-normal">
                            Issued on
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {formatDateDisplay(asset.Issue_Date || asset.created_at_date)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-slate-500 dark:text-slate-400 w-32 shrink-0 font-normal">
                            Type
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {asset.Asset_Type || "Fixed"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 flex items-center gap-2">
                      {!isReturned && !isLost && !isConsumable ? (
                        <AButton
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedReturnAsset(asset);
                            setReturnData({
                              Revoke_Date: new Date().toISOString().split("T")[0],
                              Lost_Date: "",
                              Revoke_Rem: asset.Revoke_Rem || "",
                            });
                            setReturnDialogOpen(true);
                          }}
                          icon={<RotateCcw className="w-4 h-4" />}
                          className="w-full !h-10 !rounded-xl border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-800/50 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 text-sm font-semibold shadow-2xs"
                        >
                          Mark returned
                        </AButton>
                      ) : (
                        <AButton
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedHistoryAsset(asset);
                            setHistoryDialogOpen(true);
                          }}
                          icon={<History className="w-4 h-4" />}
                          className="w-full !h-10 !rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-lg font-semibold shadow-2xs"
                        >
                          View history
                        </AButton>
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

      {/* ── FIXED BOTTOM ACTION BAR / FOOTER ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-lg transition-[left] duration-150 ease-in-out">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
          {selectedEmpCode && empDetails?.name
            ? `${empDetails.name} · ${validCount} of ${newAssetsToIssue.length} rows ready`
            : "Select an employee to begin"}
        </span>

        <div className="flex items-center gap-3 shrink-0">
          <AButton
            variant="outline"
            onClick={() => {
              if (!selectedEmpCode) {
                showSideAlert("Select an employee first", "warning");
                return;
              }
              const url = `${process.env.NEXT_PUBLIC_URL}/asset/AssetViewEmployeeMaster?compcode=${user?.Comp_Code}&EmpCode=${selectedEmpCode}`;
              window.open(url, "_blank");
            }}
            icon={<List className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
            className="!h-10 !px-4 !rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-sm font-semibold shadow-xs"
          >
            View all assets
          </AButton>

          {isEditMode ? (
            <AButton
              variant="primary"
              onClick={() => UpdateAssets()}
              disabled={!selectedEmpCode || validCount === 0 || isLoading}
              icon={<Save className="w-4 h-4" />}
              className={`!h-10 !px-5 !rounded-xl text-sm font-semibold text-white shadow-xs ${selectedEmpCode && validCount > 0
                  ? "!bg-[#4F46E5] hover:!bg-[#4338CA]"
                  : "!bg-[#475569] hover:!bg-[#334155]"
                }`}
            >
              Update asset{validCount > 1 ? "s" : ""}
            </AButton>
          ) : (
            <AButton
              variant="primary"
              onClick={SaveAssets}
              disabled={!selectedEmpCode || validCount === 0 || isLoading}
              icon={<Save className="w-4 h-4" />}
              className={`!h-10 !px-5 !rounded-xl text-sm font-semibold text-white shadow-xs ${selectedEmpCode && validCount > 0
                  ? "!bg-[#4F46E5] hover:!bg-[#4338CA]"
                  : "!bg-[#475569] hover:!bg-[#334155]"
                }`}
            >
              Issue {validCount} asset(s)
            </AButton>
          )}
        </div>
      </div>

      {/* ── DIALOG: MARK ASSET RETURNED / LOST ────────────────────────── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent
          style={{ maxWidth: "680px" }}
          className="bg-white dark:bg-[#111827] !border !border-[#E2E8F0] dark:!border-[#1F2937] p-6 sm:p-7 rounded-2xl !shadow-2xl w-[94vw]"
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4.5 h-4.5" />
              </div>
              <span>Mark Asset Returned / Revoked</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-[13px] text-[#64748B] dark:text-[#94A3B8] mt-1">
              Update the return or lost details for {selectedReturnAsset?.Aset_Name || "this asset"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Asset Info Card */}
            <div className="bg-[#F8FAFC] dark:bg-[#0E1524] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] text-xs sm:text-[13px] grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[#64748B] block text-xs">Asset Name</span>
                <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] truncate block">
                  {selectedReturnAsset?.Aset_Name || "—"}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-xs">Asset Code</span>
                <span className="font-mono font-bold text-[#4F46E5] truncate block">
                  {selectedReturnAsset?.Aset_Code || "—"}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[#64748B] block text-xs">Serial No</span>
                <span className="font-mono text-[#1E293B] dark:text-[#E7ECF3] truncate block">
                  {selectedReturnAsset?.Asset_Serial_no || "—"}
                </span>
              </div>
            </div>

            {/* 2-Column Date Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Einput
                  title="Return Date"
                  type="date"
                  name="Revoke_Date"
                  value={returnData.Revoke_Date}
                  handleInputChange={(name, value) =>
                    setReturnData((prev) => ({ ...prev, [name]: value }))
                  }
                  className="!h-10 !rounded-xl !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-xs sm:!text-[13px] !text-[#1E293B] dark:!text-[#E7ECF3]"
                />
              </div>

              <div>
                <Einput
                  title="Lost Date (If lost)"
                  type="date"
                  name="Lost_Date"
                  value={returnData.Lost_Date}
                  handleInputChange={(name, value) =>
                    setReturnData((prev) => ({ ...prev, [name]: value }))
                  }
                  className="!h-10 !rounded-xl !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-xs sm:!text-[13px] !text-[#1E293B] dark:!text-[#E7ECF3]"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <Einput
                title="Return Remarks"
                type="text"
                name="Revoke_Rem"
                placeholder="Reason or condition of returned asset..."
                value={returnData.Revoke_Rem}
                handleInputChange={(name, value) =>
                  setReturnData((prev) => ({ ...prev, [name]: value }))
                }
                className="!h-10 !rounded-xl !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-xs sm:!text-[13px] !text-[#1E293B] dark:!text-[#E7ECF3] !placeholder:text-[#94A3B8]"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0] dark:border-[#1F2937]">
              <AButton variant="outline" size="md" onClick={() => setReturnDialogOpen(false)}>
                Cancel
              </AButton>
              <AButton
                variant="primary"
                size="md"
                onClick={handleConfirmReturn}
                className="!bg-[#4F46E5] hover:!bg-[#4338CA] !px-5 font-semibold"
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
          style={{ maxWidth: "760px" }}
          className="bg-white dark:bg-[#111827] !border !border-[#E2E8F0] dark:!border-[#1F2937] p-6 sm:p-7 rounded-2xl !shadow-2xl w-[94vw] max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <span>Asset Details & History</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
              Complete metadata and tracking details for {selectedHistoryAsset?.Aset_Name || "this asset"}.
            </DialogDescription>
          </DialogHeader>

          {selectedHistoryAsset && (
            <div className="space-y-4 text-xs sm:text-sm">
              {/* Top Banner with Key Highlights */}
              <div className="bg-[#EEF2FF] dark:bg-[#1E1B4B]/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-[#4F46E5] dark:text-[#8B84FF] uppercase tracking-wider block">
                    Asset
                  </span>
                  <div className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedHistoryAsset.Aset_Name || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-white dark:bg-[#0E1524] text-[#4F46E5] dark:text-[#8B84FF] border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                    {selectedHistoryAsset.Aset_Code || "AV-ASSET-000"}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg ${isValidDateValue(selectedHistoryAsset.Revoke_Date)
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : isValidDateValue(selectedHistoryAsset.Lost_Date)
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          : selectedHistoryAsset.Asset_Type === "Consumable"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                      }`}
                  >
                    {isValidDateValue(selectedHistoryAsset.Revoke_Date)
                      ? "Returned"
                      : isValidDateValue(selectedHistoryAsset.Lost_Date)
                        ? "Lost"
                        : selectedHistoryAsset.Asset_Type === "Consumable"
                          ? "Consumed"
                          : "In Use"}
                  </span>
                </div>
              </div>

              {/* 3-Column Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-[#F8FAFC] dark:bg-[#0E1524] p-4.5 sm:p-5 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937]">
                <div>
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">Serial No</span>
                  <span className="font-mono font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {selectedHistoryAsset.Asset_Serial_no || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">Category</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {selectedHistoryAsset.Asset_category || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">IT Sub-Category</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {selectedHistoryAsset.It_category || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">Asset Type</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {selectedHistoryAsset.Asset_Type || "Fixed"}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">Issue Date</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {formatDateDisplay(selectedHistoryAsset.Issue_Date)}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">Return Date</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {formatDateDisplay(selectedHistoryAsset.Revoke_Date)}
                  </span>
                </div>

                <div>
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">Lost Date</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {formatDateDisplay(selectedHistoryAsset.Lost_Date)}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[#64748B] dark:text-[#94A3B8] block text-xs font-medium">Created By</span>
                  <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 block">
                    {selectedHistoryAsset.Created_by || "—"}{" "}
                    <span className="font-normal text-[#64748B] dark:text-[#94A3B8] text-xs">
                      {selectedHistoryAsset.created_at_date ? `on ${formatDateDisplay(selectedHistoryAsset.created_at_date)}` : ""}{" "}
                      {selectedHistoryAsset.created_at_time ? `(${selectedHistoryAsset.created_at_time})` : ""}
                    </span>
                  </span>
                </div>
              </div>

              {/* Remarks Box (If present) */}
              {selectedHistoryAsset.Revoke_Rem && (
                <div className="bg-[rgba(245,158,11,.08)] p-3.5 rounded-xl border border-[rgba(245,158,11,.25)]">
                  <span className="font-bold text-[#F59E0B] block text-xs mb-1">Return / Revoke Remarks:</span>
                  <p className="text-[#1E293B] dark:text-[#E7ECF3] text-xs sm:text-[13px] leading-relaxed">
                    {selectedHistoryAsset.Revoke_Rem}
                  </p>
                </div>
              )}

              {/* Uploaded Document (If present) */}
              {selectedHistoryAsset.uploaded_document && (
                <div className="bg-[#F8FAFC] dark:bg-[#0E1524] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1F2937] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#1E293B] dark:text-[#E7ECF3] block">Attached Document</span>
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Document attached with this asset record</span>
                  </div>
                  <FileViewer
                    fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${selectedHistoryAsset.uploaded_document}`}
                    Title="Attached Document"
                    celldata=""
                  />
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-end pt-3 border-t border-[#E2E8F0] dark:border-[#1F2937]">
                <AButton
                  variant="outline"
                  size="md"
                  onClick={() => setHistoryDialogOpen(false)}
                  className="!px-6 font-semibold"
                >
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
