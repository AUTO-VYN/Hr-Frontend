"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Info,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper Alert
const showSideAlert = (message: string, type: "success" | "error" | "warning" | "info") => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/70 dark:text-fuchsia-300",
];

const getAvatarColor = (name?: string, id?: any) => {
  const str = `${name || ""}_${id || ""}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export default function CreateJobOpeningPage() {
  const router = useRouter();
  const user = useCurrentUser();

  // State: Data & Lists
  const [tableData, setTableData] = useState<any[]>([]);
  const [desgApplying, setDesgApplying] = useState<any[]>([]);
  const [branchApplying, setBranchApplying] = useState<any[]>([]);
  const [selectedRowData, setSelectedRowData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "awaiting" | "filled">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tableSearch, setTableSearch] = useState("");
  const [sentTranIds, setSentTranIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sent_candidates_tran_ids");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [filledRecords, setFilledRecords] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("filled_candidate_records");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [cardData, setCardData] = useState<any[]>([]);
  const [selectedCardDesignation, setSelectedCardDesignation] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState("");

  const filteredCardData = useMemo(() => {
    if (!cardSearch.trim()) return cardData;
    const q = cardSearch.toLowerCase().trim();
    return cardData.filter((item: any) =>
      String(item.DESIGNATION || "").toLowerCase().includes(q) ||
      String(item.locationname || "").toLowerCase().includes(q)
    );
  }, [cardData, cardSearch]);

  const desgOptions = useMemo(() => {
    return (desgApplying || []).map((d: any) => {
      const val = d.value ?? d.desg_code ?? d.DESG_CODE ?? d.label ?? d.desg_name ?? d;
      const label = d.label ?? d.desg_name ?? d.DESG_NAME ?? d.value ?? String(d);
      return { value: String(val), label: String(label) };
    });
  }, [desgApplying]);

  const branchOptions = useMemo(() => {
    return (branchApplying || []).map((b: any) => {
      const val = b.value ?? b.loc_code ?? b.LOC_CODE ?? b.label ?? b.loc_name ?? b;
      const label = b.label ?? b.loc_name ?? b.LOC_NAME ?? b.value ?? String(b);
      return { value: String(val), label: String(label) };
    });
  }, [branchApplying]);

  // State: Form Inputs
  const [formData, setFormData] = useState({
    TRAN_ID: "",
    NAME: "",
    MOB_NO: "",
    EMAIL: "",
    DESIGNATION: "",
    SUITABLE_DESIGNATION: "",
    LOC_CODE: "",
    HR_EMPCODE: user?.EMPCODE || user?.empcode || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  // Duplicate Mobile State & Dialog
  const [mobileData, setMobileData] = useState<any[]>([]);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);

  // ============================================================================
  // Fetch Data
  // ============================================================================

  const getCompCode = () => {
    return (
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.company_code ||
      (user as any)?.DB ||
      ""
    );
  };

  const fetchTableData = async () => {
    const compCode = getCompCode();
    if (!compCode) return;

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/gethrentry`,
        {
          flag: 1,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (res.data) {
        if (Array.isArray(res.data)) {
          setTableData(res.data);
        } else if (res.data.data && Array.isArray(res.data.data)) {
          setTableData(res.data.data);
        } else {
          setTableData([]);
        }

        if (res.data.cardData && Array.isArray(res.data.cardData)) {
          setCardData(res.data.cardData);
        }
      } else {
        setTableData([]);
        setCardData([]);
      }
    } catch (err) {
      console.error("Error fetching candidate table data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    const compCode = getCompCode();
    if (!compCode) return;

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/candreg`,
        null,
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (res.data?.desg) setDesgApplying(res.data.desg);
      if (res.data?.location) setBranchApplying(res.data.location);
    } catch (err) {
      console.error("Error fetching dropdown options:", err);
    }
  };

  useEffect(() => {
    const compCode = getCompCode();
    if (compCode) {
      fetchTableData();
      fetchDropdowns();
    }
  }, [user]);

  // ============================================================================
  // Validations & Mobile Duplicate Check
  // ============================================================================

  const validateMobile = (value: string) => /^[0-9]{10}$/.test(value);
  const validateEmail = (value: string) => /^[^\s@'"`;,]+@[^\s@'"`;,]+\.[^\s@'"`;,]+$/.test(value);

  const fetchExistingMobData = async (mobile: string) => {
    const compCode = getCompCode();
    if (!compCode) return;

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/getExistingMobData`,
        { mobile },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setMobileData(data);
        setIsMobileDialogOpen(true);
      }
    } catch (err) {
      console.error("Error checking mobile duplicate:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "MOB_NO") {
      const cleanVal = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, MOB_NO: cleanVal }));
      const isValid = validateMobile(cleanVal);
      setErrors((prev) => ({ ...prev, MOB_NO: cleanVal.length > 0 && !isValid }));
      if (isValid && cleanVal.length === 10) {
        fetchExistingMobData(cleanVal);
      }
    } else if (name === "EMAIL") {
      const isValid = !value || validateEmail(value.trim());
      setErrors((prev) => ({ ...prev, EMAIL: value.length > 0 && !isValid }));
    }
  };

  // ============================================================================
  // Save / Update Lead
  // ============================================================================

  const handleSaveLead = async () => {
    if (!formData.NAME.trim()) {
      showSideAlert("Candidate Name is mandatory. Please fill it out.", "warning");
      return;
    }
    if (!formData.MOB_NO) {
      showSideAlert("Mobile Number is mandatory. Please fill it out.", "warning");
      return;
    }
    if (!validateMobile(formData.MOB_NO)) {
      showSideAlert("Mobile Number is invalid (10 digits required).", "warning");
      return;
    }
    if (!formData.EMAIL || !formData.EMAIL.trim()) {
      showSideAlert("Email is mandatory. Please fill it out.", "warning");
      return;
    }
    if (!validateEmail(formData.EMAIL.trim())) {
      showSideAlert("Email is invalid or contains restricted characters.", "warning");
      return;
    }
    if (!formData.DESIGNATION || !formData.DESIGNATION.trim()) {
      showSideAlert("Designation is mandatory. Please select it.", "warning");
      return;
    }
    if (!formData.LOC_CODE || !formData.LOC_CODE.trim()) {
      showSideAlert("Branch is mandatory. Please select it.", "warning");
      return;
    }
    if (user?.Comp_Code === "MLAPL-25" && !formData.SUITABLE_DESIGNATION) {
      showSideAlert("Suitable Designation is mandatory.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const compCode = getCompCode();
      if (!compCode) {
        showSideAlert("Company code missing. Please refresh.", "warning");
        setIsLoading(false);
        return;
      }

      const payload = {
        ...formData,
        HR_EMPCODE: user?.EMPCODE || user?.empcode || "",
      };

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/insertnewcandidatehr`,
        payload,
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Lead Added Successfully",
        text: res.data?.message || "Candidate lead has been created.",
        timer: 2000,
        showConfirmButton: false,
      });

      resetForm();
      fetchTableData();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to save candidate lead.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLead = async () => {
    if (!formData.NAME.trim()) {
      showSideAlert("Candidate Name is mandatory.", "warning");
      return;
    }
    if (!formData.MOB_NO || !validateMobile(formData.MOB_NO)) {
      showSideAlert("Valid 10-digit mobile number is mandatory.", "warning");
      return;
    }
    if (!formData.EMAIL || !formData.EMAIL.trim()) {
      showSideAlert("Email is mandatory.", "warning");
      return;
    }
    if (!validateEmail(formData.EMAIL.trim())) {
      showSideAlert("Email is invalid.", "warning");
      return;
    }
    if (!formData.DESIGNATION || !formData.DESIGNATION.trim()) {
      showSideAlert("Designation is mandatory.", "warning");
      return;
    }
    if (!formData.LOC_CODE || !formData.LOC_CODE.trim()) {
      showSideAlert("Branch is mandatory.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const compCode = getCompCode();
      if (!compCode) {
        showSideAlert("Company code missing. Please refresh.", "warning");
        setIsLoading(false);
        return;
      }

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/hrformupdate`,
        formData,
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Updated Successfully",
        text: res.data?.message || "Candidate lead updated.",
        timer: 2000,
        showConfirmButton: false,
      });

      resetForm();
      fetchTableData();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.error || error?.response?.data?.message || "Failed to update lead.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      TRAN_ID: "",
      NAME: "",
      MOB_NO: "",
      EMAIL: "",
      DESIGNATION: "",
      SUITABLE_DESIGNATION: "",
      LOC_CODE: "",
      HR_EMPCODE: user?.EMPCODE || user?.empcode || "",
    });
    setIsEditing(false);
  };

  const handleRowDoubleClick = (row: any) => {
    setFormData({
      TRAN_ID: row.TRAN_ID || row.id || "",
      NAME: row.NAME || "",
      MOB_NO: row.MOB_NO || "",
      EMAIL: (row.EMAIL || "").trim(),
      DESIGNATION: row.DESIGNATION || "",
      SUITABLE_DESIGNATION: row.SUITABLE_DESIGNATION || "",
      LOC_CODE: String(row.LOC_CODE || ""),
      HR_EMPCODE: user?.EMPCODE || user?.empcode || "",
    });
    setIsEditing(true);
    showSideAlert(`Editing candidate lead #${row.TRAN_ID || ""}`, "info");
  };

  // ============================================================================
  // Send WhatsApp Link Action
  // ============================================================================

  const handleSendWhatsApp = async (targetRows?: any[]) => {
    const rowsToSend = targetRows || selectedRowData;
    if (!rowsToSend || rowsToSend.length === 0) {
      showSideAlert("Please select at least one candidate to send WhatsApp message", "warning");
      return;
    }

    const rowsWithoutMobile = rowsToSend.filter((item: any) => {
      const mob = String(item.MOB_NO || item.mob_no || item.mobile || "").trim();
      return !mob;
    });

    if (rowsWithoutMobile.length > 0) {
      showSideAlert("Mobile no is not defined", "warning");
      return;
    }

    const tranIds = rowsToSend
      .map((item: any) => item.TRAN_ID || item.id || item.tran_id)
      .filter(Boolean);

    if (tranIds.length === 0) {
      showSideAlert("No valid candidate ID found", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const compCode = getCompCode();
      if (!compCode) {
        showSideAlert("Company code missing. Please refresh.", "warning");
        setIsLoading(false);
        return;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/sendwhatsapp`,
        {
          tran_id: tranIds.join(", "),
          empcode: user?.EMPCODE || user?.empcode || "",
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );

      const stringTranIds = tranIds.map((id: any) => String(id));
      setSentTranIds((prev) => {
        const updated = Array.from(new Set([...prev, ...stringTranIds]));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("sent_candidates_tran_ids", JSON.stringify(updated));
          } catch { }
        }
        return updated;
      });

      setTableData((prev) =>
        prev.map((r) => {
          const id = String(r.TRAN_ID || r.id || r.tran_id || "");
          if (stringTranIds.includes(id)) {
            return { ...r, FORM_STATUS: "Sent", IS_SENT: 1, LINK_SENT: 1 };
          }
          return r;
        })
      );

      Swal.fire({
        icon: "success",
        title: "WhatsApp Sent",
        text: `Registration link sent successfully to ${tranIds.length} candidate(s).`,
        timer: 2200,
        showConfirmButton: false,
      });

      fetchTableData();
      setSelectedRowData([]);
    } catch (error: any) {
      console.error("WhatsApp error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Send WhatsApp",
        text: error?.response?.data?.message || "Error sending WhatsApp message.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Excel Export
  // ============================================================================

  // const handleExportExcel = async () => {
  //   if (!tableData || tableData.length === 0) {
  //     showSideAlert("No candidate lead records to export", "warning");
  //     return;
  //   }

  //   try {
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet("Candidate Leads");

  //     const headerRow = worksheet.addRow([
  //       "SR",
  //       "Candidate Name",
  //       "Email",
  //       "Mobile No",
  //       "Designation",
  //       "Location",
  //       "Form Status",
  //     ]);

  //     headerRow.eachCell((cell) => {
  //       cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  //       cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  //       cell.alignment = { horizontal: "center", vertical: "middle" };
  //     });

  //     tableData.forEach((row) => {
  //       const status = getFormStatus(row).label;
  //       worksheet.addRow([
  //         row.TRAN_ID || "-",
  //         row.NAME || "Unnamed lead",
  //         row.EMAIL || "-",
  //         row.MOB_NO || "-",
  //         row.DESIGNATION || "Not set",
  //         row.locationname || row.LOC_NAME || "-",
  //         status,
  //       ]);
  //     });

  //     worksheet.columns.forEach((col) => {
  //       let maxLen = 12;
  //       col.eachCell?.({ includeEmpty: true }, (cell: any) => {
  //         const len = cell.value ? cell.value.toString().length : 12;
  //         if (len > maxLen) maxLen = len;
  //       });
  //       col.width = maxLen + 4;
  //     });

  //     const buffer = await workbook.xlsx.writeBuffer();
  //     const blob = new Blob([buffer], {
  //       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //     });
  //     saveAs(blob, `Candidate_Leads_${new Date().toISOString().split("T")[0]}.xlsx`);
  //     showSideAlert("Exported candidate leads to Excel", "success");
  //   } catch {
  //     showSideAlert("Failed to export Excel", "error");
  //   }
  // };

  // ============================================================================
  // Status & Formatting Helpers
  // ============================================================================

  const getFormStatus = (row: any) => {
    const raw = String(
      row.FORM_STATUS || row.status || row.STATUS || row.cand_status || ""
    ).toUpperCase();
    if (
      (row.ADDRESS && String(row.ADDRESS).trim() !== "" && String(row.ADDRESS).trim() !== "null") ||
      raw.includes("FILL") ||
      raw.includes("COMPLETE") ||
      raw.includes("REGIST") ||
      row.IS_FILLED
    ) {
      return {
        label: "Form filled",
        color:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
      };
    }
    const tranId = String(row.TRAN_ID || row.id || row.tran_id || "");
    if (
      raw.includes("SENT") ||
      raw.includes("LINK") ||
      row.IS_SENT ||
      row.LINK_SENT ||
      (tranId && sentTranIds.includes(tranId))
    ) {
      return {
        label: "Sent",
        color:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
      };
    }
    return {
      label: "Not sent",
      color:
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    };
  };

  const getAvatarInitials = (name: string) => {
    if (!name || name.trim() === "") return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 1).toUpperCase();
  };

  // Filtered Table Data by Tab & Search
  const filteredTableData = useMemo(() => {
    let list = tableData;
    if (activeTab === "awaiting") {
      list = list.filter((r) => getFormStatus(r).label !== "Form filled");
    } else if (activeTab === "filled") {
      const fromTable = tableData.filter((r) => getFormStatus(r).label === "Form filled");
      const fromTableIds = new Set(fromTable.map((r) => String(r.TRAN_ID || r.id || r.tran_id)));
      const extraFilled = filledRecords.filter(
        (r) => !fromTableIds.has(String(r.TRAN_ID || r.id || r.tran_id))
      );
      list = [...fromTable, ...extraFilled];
    }

    if (tableSearch && tableSearch.trim() !== "") {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter((r) => {
        return (
          String(r.TRAN_ID || "").toLowerCase().includes(q) ||
          String(r.NAME || "").toLowerCase().includes(q) ||
          String(r.EMAIL || "").toLowerCase().includes(q) ||
          String(r.MOB_NO || "").toLowerCase().includes(q) ||
          String(r.DESIGNATION || "").toLowerCase().includes(q) ||
          String(r.locationname || r.LOC_NAME || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [tableData, activeTab, tableSearch, sentTranIds, filledRecords]);

  const totalRecords = filteredTableData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Current page sliced data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTableData.slice(startIndex, startIndex + pageSize);
  }, [filteredTableData, currentPage, pageSize]);

  const tabCounts = useMemo(() => {
    const total = tableData.length;
    const fromTableFilled = tableData.filter((r) => getFormStatus(r).label === "Form filled");
    const fromTableIds = new Set(fromTableFilled.map((r) => String(r.TRAN_ID || r.id || r.tran_id)));
    const extraFilled = filledRecords.filter(
      (r) => !fromTableIds.has(String(r.TRAN_ID || r.id || r.tran_id))
    );
    const filled = fromTableFilled.length + extraFilled.length;
    const awaiting = tableData.filter((r) => getFormStatus(r).label !== "Form filled").length;
    return { total, awaiting, filled };
  }, [tableData, sentTranIds, filledRecords]);

  // ============================================================================
  // ReactTable Columns
  // ============================================================================

  const columns = useMemo(() => {
    const baseCols: any[] = [
      {
        Header: "SR",
        accessor: "TRAN_ID",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-[15px] text-slate-700 dark:text-slate-300">
            {value || "-"}
          </span>
        ),
      },
      {
        Header: "CANDIDATE",
        accessor: "NAME",
        Cell: ({ row }: any) => {
          const name = row.original.NAME;
          const initials = getAvatarInitials(name);
          const colorClass = getAvatarColor(name, row.original.TRAN_ID);

          return (
            <div className="flex items-center gap-3 py-1">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-xs ${colorClass}`}
              >
                {initials}
              </div>
              <span className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                {name || "Unnamed lead"}
              </span>
            </div>
          );
        },
      },
      {
        Header: "EMAIL",
        accessor: "EMAIL",
        Cell: ({ value }: any) => (
          <span className="text-[15px] font-medium text-slate-600 dark:text-slate-400">
            {value && value.trim() !== "" ? value : "—"}
          </span>
        ),
      },
      {
        Header: "MOBILE NO",
        accessor: "MOB_NO",
        Cell: ({ value }: any) => (
          <span className="text-[15px] font-medium font-mono text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        Cell: ({ value }: any) => (
          <span className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
            {value && value.trim() !== "" ? value : "Not set"}
          </span>
        ),
      },
      {
        Header: "LOCATION",
        accessor: "locationname",
        Cell: ({ row }: any) => {
          const loc = row.original.locationname || row.original.LOC_NAME || "";
          return (
            <span className="text-[15px] font-medium text-slate-600 dark:text-slate-400">
              {loc && loc.trim() !== "" ? loc : "—"}
            </span>
          );
        },
      },
      {
        Header: "FORM STATUS",
        accessor: "FORM_STATUS",
        Cell: ({ row }: any) => {
          const status = getFormStatus(row.original);
          return (
            <span
              className={`inline-block px-3 py-1 rounded-full text-[13px] font-semibold border shadow-2xs ${status.color}`}
            >
              {status.label}
            </span>
          );
        },
      },
    ];

    if (activeTab !== "filled") {
      baseCols.push({
        Header: "ACTIONS",
        accessor: "actions",
        minWidth: 100,
        width: 100,
        Cell: ({ row }: any) => {
          const status = getFormStatus(row.original).label;
          const isSent = status === "Sent" || status === "Link sent";
          const isFilled = status === "Form filled";

          return (
            <div className="flex items-center gap-2 justify-center min-w-[84px] shrink-0">
              {/* Send link / Resend Button */}
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendWhatsApp([row.original]);
                }}
                className={`h-8.5 w-8.5 min-h-[34px] min-w-[34px] p-0 rounded-xl border flex items-center justify-center transition shadow-2xs cursor-pointer shrink-0 ${isSent
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                title="Send WhatsApp Form"
              >
                <FaWhatsapp className="h-7 w-7 text-green-600 dark:text-green-500 shrink-0" />
              </Button>

              {/* Registration / View form Button */}
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(
                    `/payroll/recruitment-process/candidate-registration-form?tran_id=${row.original.TRAN_ID || ""}&name=${encodeURIComponent(row.original.NAME || "")}&mobile=${row.original.MOB_NO || ""}&email=${encodeURIComponent(row.original.EMAIL || "")}&designation=${encodeURIComponent(row.original.DESIGNATION || "")}&loc_code=${row.original.LOC_CODE || ""}`
                  );
                }}
                className="h-8.5 w-8.5 min-h-[34px] min-w-[34px] p-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition shadow-2xs cursor-pointer shrink-0"
                title={isFilled ? "View Form" : "Registration Form"}
              >
                <ExternalLink className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
              </Button>
            </div>
          );
        },
      });
    }

    return baseCols;
  }, [tableData, sentTranIds, filledRecords, activeTab]);

  const columnsForDownload = useMemo(
    () => [
      { Header: "SR", accessor: "TRAN_ID" },
      { Header: "Candidate Name", accessor: "NAME" },
      { Header: "Email", accessor: "EMAIL" },
      { Header: "Mobile No", accessor: "MOB_NO" },
      { Header: "Designation", accessor: "DESIGNATION" },
      { Header: "Location", accessor: "locationname" },
      { Header: "Form Status", accessor: "form_status_label" },
    ],
    []
  );

  const handleExportAllData = () => {
    return filteredTableData.map((r) => ({
      ...r,
      form_status_label: getFormStatus(r).label,
      locationname: r.locationname || r.LOC_NAME || "",
    }));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1780px] mx-auto transition-colors">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          Job openings & candidate leads
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
          Capture a lead in one row, then send the registration link over WhatsApp. Completed forms land in the resume bank.
        </p>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1.5. JOB OPENING STATUS CARDS (5 Per View + Horizontal Side Scroll) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {cardData && cardData.length > 0 && (
        <div className="space-y-3">
          {/* Card Search Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full max-w-sm [&>div]:space-y-0 [&_label]:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
              <Einput
                title=""
                type="text"
                name="cardSearch"
                placeholder="Search job opening / designation..."
                value={cardSearch}
                handleInputChange={(_, val) => setCardSearch(val)}
                className="!pl-9 !pr-8 !py-2 !text-sm sm:!text-base !rounded-xl"
              />
              {cardSearch && (
                <button
                  type="button"
                  onClick={() => setCardSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 z-10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {cardSearch && (
              <span className="text-lg text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                Showing {filteredCardData.length} of {cardData.length} cards
              </span>
            )}
          </div>

          {filteredCardData.length > 0 ? (
            <div className="relative">
              <div className="custom-scrollbar flex items-stretch gap-3.5 overflow-x-auto pb-2 pt-0.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 snap-x">
                {filteredCardData.map((item: any, idx: number) => {
                  const total = Number(item.total) || 0;
                  const filled = Number(item.filled) || 0;
                  const percent = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
                  const isFilled =
                    (item.status || "").toLowerCase() === "filled" || (total > 0 && filled >= total);
                  const isSelected = selectedCardDesignation === item.DESIGNATION;

                  const barColors = [
                    "bg-indigo-600 dark:bg-indigo-500",
                    "bg-teal-600 dark:bg-teal-500",
                    "bg-emerald-600 dark:bg-emerald-500",
                    "bg-indigo-500 dark:bg-indigo-400",
                    "bg-rose-500 dark:bg-rose-400",
                    "bg-blue-600 dark:bg-blue-500",
                  ];
                  const barColor = isFilled
                    ? "bg-emerald-600 dark:bg-emerald-500"
                    : barColors[idx % barColors.length];

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (selectedCardDesignation === item.DESIGNATION) {
                          setSelectedCardDesignation(null);
                          setTableSearch("");
                        } else {
                          setSelectedCardDesignation(item.DESIGNATION);
                          setTableSearch(item.DESIGNATION || "");
                        }
                      }}
                      className={`w-[calc(20%-12px)] min-w-[220px] shrink-0 snap-start rounded-2xl border bg-white dark:bg-slate-900 p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-md ${
                        isSelected
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div>
                        {/* Top row: Designation & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="font-bold text-[14px] sm:text-[15px] text-slate-900 dark:text-slate-100 truncate tracking-tight flex-1"
                            title={item.DESIGNATION}
                          >
                            {item.DESIGNATION || "Job Opening"}
                          </h3>
                          <span
                            className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${
                              isFilled
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                                : item.status === "Urgent"
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800"
                            }`}
                          >
                            {isFilled ? "Filled" : item.status || "Open"}
                          </span>
                        </div>

                        {/* Middle Subtitle: Branch/Location */}
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {item.locationname || "Branch - 1"}
                        </p>
                      </div>

                      {/* Bottom row: Filled Count & Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {filled}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            / {total} filled
                          </span>
                        </div>

                        {/* Progress Line */}
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-slate-400 text-sm">
              No job opening cards match <span className="font-semibold text-slate-600 dark:text-slate-300">"{cardSearch}"</span>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. ADD CANDIDATE LEAD FORM CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              {isEditing ? `Edit Candidate Lead #${formData.TRAN_ID}` : "Add candidate lead"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Name and mobile are enough to start — the rest can come from the candidate&apos;s own form.
            </p>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          {/* Candidate Name */}
          <div>
            <Einput
              title="Candidate Name"
              type="text"
              name="NAME"
              placeholder="Full name"
              value={formData.NAME}
              handleInputChange={handleInputChange}
              redlabel="*"
              className="!h-11 sm:!h-12 !px-4 !text-sm sm:!text-base !rounded-xl font-semibold uppercase"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <Einput
              title="Mobile Number"
              type="tel"
              name="MOB_NO"
              placeholder="10-digit mobile"
              value={formData.MOB_NO}
              handleInputChange={handleInputChange}
              maxLength={10}
              redlabel="*"
              errorMessage={errors.MOB_NO ? "Invalid 10-digit mobile" : ""}
              className="!h-11 sm:!h-12 !px-4 !text-sm sm:!text-base !rounded-xl font-mono font-bold"
            />
          </div>

          {/* Email */}
          <div>
            <Einput
              title="Email"
              type="email"
              name="EMAIL"
              placeholder="name@company.com"
              value={formData.EMAIL}
              handleInputChange={handleInputChange}
              redlabel="*"
              errorMessage={errors.EMAIL ? "Invalid email" : ""}
              className="!h-11 sm:!h-12 !px-4 !text-sm sm:!text-base !rounded-xl font-medium"
            />
          </div>

          {/* Designation */}
          <div>
            <Eselect
              title="Designation"
              name="DESIGNATION"
              option={desgOptions}
              initialValue={formData.DESIGNATION}
              handleInputChange={handleInputChange}
              placeholder="Designation applying for"
              redlabel="*"
              className="!h-11 sm:!h-12 !text-sm sm:!text-base !rounded-xl"
            />
          </div>

          {/* Branch */}
          <div>
            <Eselect
              title="Branch"
              name="LOC_CODE"
              option={branchOptions}
              initialValue={formData.LOC_CODE}
              handleInputChange={handleInputChange}
              placeholder="Branch applying for"
              redlabel="*"
              className="!h-11 sm:!h-12 !text-sm sm:!text-base !rounded-xl"
            />
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="update"
                  onClick={handleUpdateLead}
                  className="h-11 sm:h-12 px-5 rounded-xl text-sm sm:text-base font-extrabold flex-1 shadow-xs"
                >
                  Update lead
                </Button>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="h-11 sm:h-12 px-4 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="save"
                onClick={handleSaveLead}
                className="w-full h-11 sm:h-12 px-5 rounded-xl text-sm sm:text-base font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-xs"
              >
                <Plus className="h-4.5 w-4.5 mr-1.5" />
                Add lead
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. CANDIDATE LEADS TABLE SECTION */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Table Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Candidate leads
            </h2>
            <span className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">
              {filteredTableData.length} records
            </span>
          </div>

          {/* Status Filter Tabs (Capsule / Pill Segmented Control) */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#f1f5f9]/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 overflow-x-auto shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              className={`px-5 py-2 rounded-xl text-sm sm:text-base font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#4F46E5] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              }`}
            >
              All <span className="ml-1 opacity-90">{tabCounts.total}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("awaiting");
                setCurrentPage(1);
              }}
              className={`px-5 py-2 rounded-xl text-sm sm:text-base font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "awaiting"
                  ? "bg-[#4F46E5] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              }`}
            >
              Awaiting form <span className="ml-1 opacity-90">{tabCounts.awaiting}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("filled");
                setCurrentPage(1);
              }}
              className={`px-5 py-2 rounded-xl text-sm sm:text-base font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "filled"
                  ? "bg-[#4F46E5] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              }`}
            >
              Form filled <span className="ml-1 opacity-90">{tabCounts.filled}</span>
            </button>
          </div>
        </div>

        {/* ReactTable */}
        <div className="overflow-x-auto">
          <ServiceTablePagination
            columns={columns}
            data={paginatedData}
            check={true}
            selectValue="TRAN_ID"
            setsellectedrowdata={(rows) => setSelectedRowData(rows)}
            selectedRows={selectedRowData}
            onRowDoubleClick={handleRowDoubleClick}
            height="500px"
            headerClassName="!text-sm sm:!text-[15px] !font-bold !tracking-wide !py-3.5 text-slate-700 dark:text-slate-200"
            showTopSearch={true}
            searchValue={tableSearch}
            onSearchChange={(val) => {
              setTableSearch(val);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search candidate name, mobile, email, designation..."
            showExcelExport={true}
            columnsDownload={columnsForDownload}
            onExportAll={handleExportAllData}
            serverMode={true}
            serverPagination={{
              currentPage,
              pageSize,
              totalPages,
              totalRecords,
            }}
            onServerPageChange={(p) => setCurrentPage(p)}
          />
        </div>

        {/* Notice & Link to Resume Bank */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-medium">
            <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
            <span>Completed forms are transferred to the resume bank automatically.</span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/payroll/recruitment-process/resume-bank")}
            className="inline-flex items-center gap-1.5 font-extrabold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition self-start sm:self-center"
          >
            Open resume bank <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. FLOATING ACTION BAR FOR SELECTED ROWS (WHATSAPP ONLY) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedRowData && selectedRowData.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 px-5 shadow-2xl backdrop-blur-md">
            <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {selectedRowData.length} selected
            </span>

            {/* Send WhatsApp Button */}
            <Button
              type="button"
              onClick={() => handleSendWhatsApp()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <FaWhatsapp className="h-5 w-5" />
              Send WhatsApp link
            </Button>

            {/* Clear Selection */}
            <Button
              type="button"
              onClick={() => setSelectedRowData([])}
              className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 transition cursor-pointer"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. DUPLICATE MOBILE CANDIDATE MODAL */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-amber-500">⚠️</span> Candidate previous details
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              This mobile number already exists in the database. Please review previous records before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 overflow-y-auto max-h-[350px] custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Email ID</th>
                  <th className="py-3 px-4">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {mobileData.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {item.NAME || "-"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">{item.MOB_NO || "-"}</td>
                    <td className="py-3.5 px-4">{item.EMAIL || "-"}</td>
                    <td className="py-3.5 px-4">{item.LOC_CODE1 || item.LOC_CODE || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
            This candidate data already exists in the database. Kindly verify before adding a new lead.
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
