"use client";

import React, { useState, useRef, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileCheck2,
  Check,
  AlertTriangle,
  Eraser,
  Plus,
  Trash2,
  Paperclip,
  FileCheck,
  ArrowRight,
  Save,
  Info,
  Table as TableIcon,
  LayoutGrid,
  X,
  RotateCcw,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import CardView from "@/components/Templates/card";
import DynamicTable from "@/components/atoms/DynamicTable";
import CertificatesUpload from "@/components/atoms/CertificateUpload";
import HashloaderComponent from "@/components/Templates/hashloader";

export interface CandidateRow {
  name: string;
  mob_no: string;
  high_qualification: string;
  percentage: string;
  gender: string;
  experence: string;
  current_ctc: string;
  designation: string;
  email: string;
  dob: string;
  skills: string;
  resume: File | null;
  resumeName?: string;
}

const GENDERS = ["Select", "Male", "Female", "Other"];

const initialRow: CandidateRow = {
  name: "",
  mob_no: "",
  high_qualification: "",
  percentage: "",
  gender: "Select",
  experence: "",
  current_ctc: "",
  designation: "",
  email: "",
  dob: "",
  skills: "",
  resume: null,
};

export default function BulkResumeUploadPage() {
  const router = useRouter();
  const user = useCurrentUser();

  // Helper for safe company code
  const getCompCode = (): string => {
    return (
      (user?.Comp_Code as string) ||
      (typeof window !== "undefined"
        ? localStorage.getItem("Comp_Code") ||
        localStorage.getItem("compcode") ||
        ""
        : "") ||
      ""
    );
  };

  // State Management from legacy functionality
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rowWise, setRowWise] = useState(true);

  const [getcount, setGetcount] = useState(0);
  const [totalRowCount, setTotalRowCount] = useState(3);
  const [insertedRow, setInsertedRow] = useState(0);
  const [skippedRow, setSkippedRow] = useState(0);

  const [fileType, setFileType] = useState<"pdf" | "excel" | null>(null);
  const [excelfile, setFile] = useState<File | File[] | null>(null);

  const [erroredData, setErroredData] = useState<any[]>([]);
  const [successDataExcel, setSuccessDataExcel] = useState<any[]>([]);
  const [excelRowinserted, setExcelRowInserted] = useState(0);
  const [excelRowSkipped, setExcelRowSkipped] = useState(0);

  const [correctData, setCorrectData] = useState(0);
  const [wrongData, setWrongData] = useState(0);
  const [failedData, setFailedData] = useState<any[]>([]);
  const [successData, setSuccessData] = useState<any[]>([]);

  const [activeTable, setActiveTable] = useState<"errored" | "failed" | "success">("errored");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Keep references to requested components
  const [qualificationData, setQualificationData] = useState<any[]>([
    { Degree: "", Institute: "", Year: "", Percentage: "" },
  ]);
  const [docUploads, setDocUploads] = useState<Record<string, File | null>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rowFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Manual grid rows
  const [rows, setRows] = useState<CandidateRow[]>([
    {
      name: "ashok kumar",
      mob_no: "9887564354",
      high_qualification: "10th",
      percentage: "80",
      gender: "Male",
      experence: "3",
      current_ctc: "240000",
      designation: "Customer Care Exe",
      email: "ashok@autovyn.com",
      dob: "1996-08-20",
      skills: "next.js",
      resume: null,
      resumeName: "9887564354.pdf",
    },
    {
      name: "shree",
      mob_no: "98867576",
      high_qualification: "12th",
      percentage: "68",
      gender: "Male",
      experence: "1",
      current_ctc: "180000",
      designation: "Asstt. Bodyshop Advisor",
      email: "shree@gmail.com",
      dob: "",
      skills: "",
      resume: null,
    },
    {
      name: "",
      mob_no: "9887313367",
      high_qualification: "10th",
      percentage: "",
      gender: "Select",
      experence: "2",
      current_ctc: "",
      designation: "Accessories Fitter",
      email: "",
      dob: "",
      skills: "NEXT.JS",
      resume: null,
      resumeName: "9887313367.pdf",
    },
  ]);

  // Toast alert
  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info"
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
        popup: "shadow-2xl rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-medium",
      },
    });
  };

  // Row validation reasons
  const getRowReasons = (r: CandidateRow) => {
    const out: string[] = [];
    if (!String(r.name || "").trim()) {
      out.push("candidate name is blank");
    }
    const m = String(r.mob_no || "").replace(/\D/g, "");
    if (m.length !== 10) {
      out.push("mobile must be 10 digits");
    }
    if (r.email && String(r.email).indexOf("@") < 0) {
      out.push("email looks invalid");
    }
    return out;
  };

  const rowValidationData = useMemo(() => {
    return rows.map((r, i) => {
      const reasons = getRowReasons(r);
      return {
        num: i + 1,
        reasons,
        ok: reasons.length === 0,
        isNameInvalid: !String(r.name || "").trim(),
        isMobileInvalid: String(r.mob_no || "").replace(/\D/g, "").length !== 10,
        isEmailInvalid: Boolean(r.email && String(r.email).indexOf("@") < 0),
      };
    });
  }, [rows]);

  const validCount = useMemo(() => {
    return rowValidationData.filter((r) => r.ok).length;
  }, [rowValidationData]);

  const skipCount = useMemo(() => {
    return rows.length - validCount;
  }, [rows.length, validCount]);

  const cvCount = useMemo(() => {
    return rows.filter((r) => Boolean(r.resume || r.resumeName)).length;
  }, [rows]);

  const skippedList = useMemo(() => {
    return rowValidationData
      .filter((r) => !r.ok)
      .map((r) => ({
        num: r.num,
        why: r.reasons.join(", "),
      }));
  }, [rowValidationData]);

  // Handle manual grid row changes
  const handleChange = (index: number, field: keyof CandidateRow, value: string) => {
    const updated = [...rows];
    if (field === "mob_no") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      updated[index][field] = numericValue;
    } else if (field === "percentage") {
      const numericValue = value.replace(/\D/g, "").slice(0, 3);
      updated[index][field] = numericValue;
    } else {
      (updated[index] as any)[field] = value;
    }
    setRows(updated);
  };

  const handleRowFileChange = (index: number, file: File | null) => {
    const updated = [...rows];
    updated[index].resume = file;
    updated[index].resumeName = file ? file.name : undefined;
    setRows(updated);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ...initialRow }]);
  };

  const deleteRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{ ...initialRow }]);
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const clearGrid = () => {
    Swal.fire({
      title: "Clear grid?",
      text: "This will remove all rows currently in the table.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, clear",
      customClass: {
        popup: "rounded-2xl shadow-xl",
      },
    }).then((res) => {
      if (res.isConfirmed) {
        setRows([]);
        showSideAlert("Grid cleared", "info");
      }
    });
  };

  // Sample format download
  const handleDownloadSample = async () => {
    try {
      const compCode = getCompCode();
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/interview/importformatnewjoining?compcode=${compCode}`;
    } catch (error) {
      console.error("Error downloading sample format:", error);
    }
  };

  // Handle selecting Excel or PDF file(s) - Does NOT auto-import, waits for Import button click
  const handleChangeExileFile = (event: any) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles: File[] = [];
    let excelFile: File | null = null;
    const invalidFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (["xlsx", "xls", "csv"].includes(extension || "")) {
        if (!excelFile) {
          excelFile = file;
        } else {
          invalidFiles.push(file);
        }
      } else if (extension === "pdf") {
        pdfFiles.push(file);
      } else {
        invalidFiles.push(file);
      }
    }

    if (invalidFiles.length > 0) {
      showSideAlert("Some files were ignored because they are not Excel or PDF files.", "warning");
    }

    if (excelFile) {
      setFile(excelFile);
      setFileType("excel");
      setGetcount(1);
    } else if (pdfFiles.length > 0) {
      setFile(pdfFiles);
      setFileType("pdf");
      setGetcount(pdfFiles.length);
    } else {
      setFile(null);
      setFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showSideAlert("Please select at least one valid Excel or PDF file.", "warning");
    }
  };

  // Import button action - Triggered ONLY when clicking the Import button
  const handleButtonClick = async () => {
    try {
      if (!excelfile || (Array.isArray(excelfile) && excelfile.length === 0)) {
        showSideAlert("Please upload a file", "warning");
        return;
      }
      setisLoadingonpage(true);
      const formData = new FormData();
      let value = 0;

      // Multi-PDF upload
      if (Array.isArray(excelfile)) {
        const allArePDFs = excelfile.every((file) => {
          const ext = file.name.toLowerCase().split(".").pop();
          return ext === "pdf";
        });
        if (!allArePDFs) {
          showSideAlert("Only PDF files are allowed in multi-upload mode", "error");
          setisLoadingonpage(false);
          return;
        }
        excelfile.forEach((file) => {
          formData.append("file", file, file.name);
        });
        value = 2; // PDF
      } else {
        // Single file (Excel or PDF)
        const fileName = excelfile.name.toLowerCase();
        const extension = fileName.split(".").pop();
        if (extension === "xlsx" || extension === "xls" || extension === "csv") {
          value = 1; // Excel
        } else if (extension === "pdf") {
          value = 2; // Single PDF
        } else {
          showSideAlert("Unsupported file type", "error");
          setisLoadingonpage(false);
          return;
        }
        formData.append("file", excelfile, excelfile.name);
      }

      formData.append("user", user?.name || "");
      formData.append("branch", (user?.branch as string) || "");
      formData.append("value", String(value));

      const compCode = getCompCode();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/excelimportSep`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: compCode,
            name: user?.name,
          },
        }
      );

      if (response.status === 200) {
        setRowWise(false);

        // For Excel files
        if (fileType === "excel") {
          setErroredData(response.data.ErroredData || []);
          setSuccessDataExcel(response?.data.SuccessData || []);
          setExcelRowInserted(response.data.Inserted || 0);
          setExcelRowSkipped(response.data.Skipped || 0);
          setActiveTable(response.data.ErroredData?.length ? "errored" : "success");
        }
        // For PDF files: Table only has 2 columns
        else if (fileType === "pdf") {
          setFailedData(response.data.Failed || []);
          setSuccessData(response.data.Success || []);
          setCorrectData(response.data.Success?.length || 0);
          setWrongData(response.data.Failed?.length || 0);
          setActiveTable(response.data.Failed?.length ? "failed" : "success");
        }

        showSideAlert(response?.data?.Message || "Import completed successfully!", "success");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        showSideAlert(response.data?.Message || "Something went wrong", "error");
      }
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error"
      );
      console.error("Error uploading file:", error);
    } finally {
      setisLoadingonpage(false);
    }
  };

  // Submit manual grid to resume bank
  const handleSubmit = async () => {
    let errorMessages: string[] = [];
    rows.forEach((row, index) => {
      const missingFields: string[] = [];
      if (!row.name?.trim()) missingFields.push("name");
      if (!row.mob_no?.trim()) {
        missingFields.push("mob_no");
      } else if (String(row.mob_no).replace(/\D/g, "").length !== 10) {
        errorMessages.push(`Row ${index + 1}: Enter a valid 10-digit mobile number.`);
      }
      if (row.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errorMessages.push(`Row ${index + 1}: Invalid email format`);
      }
      if (missingFields.length > 0) {
        errorMessages.push(`Row ${index + 1}: Missing mandatory fields - ${missingFields.join(", ")}`);
      }
    });

    if (errorMessages.length > 0) {
      Swal.fire({
        title: "Please fix validation errors",
        text: errorMessages.slice(0, 5).join("\n"),
        icon: "warning",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    setIsLoading(true);
    try {
      setTotalRowCount(rows.length);
      const formData = new FormData();
      rows.forEach((row, index) => {
        formData.append(`rows[${index}][name]`, row.name || "");
        formData.append(`rows[${index}][mob_no]`, row.mob_no || "");
        formData.append(`rows[${index}][high_qualification]`, row.high_qualification || "");
        formData.append(`rows[${index}][percentage]`, row.percentage || "");
        formData.append(`rows[${index}][gender]`, row.gender || "");
        formData.append(`rows[${index}][experence]`, row.experence || "");
        formData.append(`rows[${index}][current_ctc]`, row.current_ctc || "");
        formData.append(`rows[${index}][designation]`, row.designation || "");
        formData.append(`rows[${index}][email]`, row.email || "");
        formData.append(`rows[${index}][dob]`, row.dob || "");
        formData.append(`rows[${index}][skills]`, row.skills || "");
        if (row.resume) {
          formData.append(`resume[${index}]`, row.resume);
        }
      });
      formData.append("Loc_Code", (user?.branch as string) || "");
      formData.append("user", user?.name || "");

      const compCode = getCompCode();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/excelimportSep`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: compCode,
            name: user?.name,
          },
        }
      );

      setIsLoading(false);
      setInsertedRow(response.data.Inserted || 0);
      setSkippedRow(response.data.Skipped || 0);
      showSideAlert(`${response.data.Inserted || 0} ${response.data.Message || "Candidates saved!"}`, "success");

      setRows([{ ...initialRow }]);
    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      showSideAlert(err?.response?.data?.Message || "Something went wrong. Please try again.", "error");
    }
  };

  // Card view data for CardView component
  const cardViewData = useMemo(() => {
    return rows.map((r, i) => ({
      EMP_NAME: r.name || `Candidate #${i + 1}`,
      MOBILE: r.mob_no || "—",
      DESIGNATION: r.designation || "—",
      EMAIL: r.email || "—",
      STATUS: getRowReasons(r).length === 0 ? "Ready" : "Incomplete",
      GENDER: r.gender || "—",
      EXP_IN_YEAR: r.experence || "—",
      QUALIFICATION: r.high_qualification || "—",
    }));
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] pb-16 font-sans">
      <main className="px-3 sm:px-6 pt-4 sm:pt-5 pb-32 sm:pb-24 max-w-[1700px] mx-auto">
        {/* Page Title & Subtitle */}
        <div className="mb-[18px]">
          <h1 className="m-0 text-[19px] sm:text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Bulk resume upload
          </h1>
          <p className="mt-[5px] mb-0 text-[12px] sm:text-[12.5px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Import an Excel sheet or type rows directly. Rows with a valid name and 10-digit mobile are inserted; the rest are skipped and shown below.
          </p>
        </div>

        {/* Top 2 Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-[14px] mb-[14px] items-start">
          {/* Left Card: Import from file */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-3.5 sm:p-[17px_18px_19px_18px]">
            {/* Header */}
            <div className="flex items-center gap-[9px] mb-[14px]">
              <span className="w-[26px] h-[26px] rounded-[8px] grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
                <FileSpreadsheet className="w-4 h-4 stroke-[1.75]" />
              </span>
              <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                Import from file
              </h2>
              <div className="flex-1" />
              <AButton
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5 stroke-[1.75]" />}
                onClick={handleDownloadSample}
                className="text-[#4F46E5] dark:text-[#8B84FF] border-[#E2E8F0] dark:border-[#1F2937] hover:bg-[#EEF2FF] dark:hover:bg-[#1E1B4B] text-[12px] font-[600] h-auto py-[6px] px-[11px] rounded-[8px]"
              >
                Sample sheet
              </AButton>
            </div>

            {/* Drop Zone with Explicit Import Button */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleChangeExileFile({ target: { files: e.dataTransfer.files } });
                }
              }}
              className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-[14px] border rounded-[11px] p-[16px_18px] transition-all ${excelfile
                  ? "border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.06)]"
                  : isDragging
                    ? "border-[#4F46E5] bg-[#F8FAFC] dark:bg-[#0E1524]"
                    : "border-dashed border-[#E2E8F0] dark:border-[#1F2937] bg-transparent hover:border-[#4F46E5] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524]"
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".xlsx,.xls,.csv,.pdf"
                className="hidden"
                onChange={handleChangeExileFile}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-[14px] flex-1 cursor-pointer min-w-0"
              >
                <span
                  className={`w-[40px] h-[40px] rounded-[11px] shrink-0 grid place-items-center ${excelfile
                      ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                      : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] dark:text-[#94A3B8]"
                    }`}
                >
                  {excelfile ? (
                    <FileCheck2 className="w-5 h-5 stroke-[1.75]" />
                  ) : (
                    <UploadCloud className="w-5 h-5 stroke-[1.75]" />
                  )}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] truncate">
                    {excelfile
                      ? Array.isArray(excelfile)
                        ? `${excelfile.length} PDF files selected`
                        : excelfile.name
                      : "Drop an Excel sheet or a folder of CV PDFs"}
                  </span>
                  <span className="block text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                    {excelfile
                      ? "Click the Import button to process this upload"
                      : ".xlsx, .xls or .csv · up to 500 rows per batch"}
                  </span>
                </span>
              </div>

              {/* Explicit Import Button */}
              {excelfile && (
                <div className="flex items-center gap-2 shrink-0">
                  <AButton
                    variant="primary"
                    size="sm"
                    onClick={handleButtonClick}
                    loading={isLoadingonpage}
                    loadingText="Importing..."
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    iconPosition="right"
                    className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[12px] font-[600] py-[7px] px-[14px] rounded-[8px]"
                  >
                    {fileType === "pdf" ? "Upload PDF" : "Import Excel"}
                  </AButton>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFileType(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1.5 text-[#64748B] hover:text-[#E11D48] rounded-[6px]"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Amber Notice Box */}
            <div className="flex items-start gap-[10px] mt-[14px] p-[12px_13px] border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] rounded-[10px]">
              <span className="w-[22px] h-[22px] rounded-[7px] shrink-0 grid place-items-center bg-[rgba(245,158,11,0.2)] text-[#B45309]">
                <Info className="w-3.5 h-3.5 stroke-[1.75]" />
              </span>
              <span className="flex-1 min-w-0 text-[12px] leading-[1.5] text-[#1E293B] dark:text-[#E7ECF3]">
                Name each candidate&apos;s CV PDF with their mobile number — a candidate on mobile{" "}
                <span className="font-[600] [font-variant-numeric:tabular-nums]">9887318545</span> needs{" "}
                <span className="font-[600]">9887318545.pdf</span>. Matching PDFs attach themselves to the right row on import.
              </span>
            </div>
          </div>

          {/* Right Card: This batch */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-[17px_18px_19px_18px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                {!rowWise ? (fileType === "pdf" ? "PDF Batch" : "Excel Batch") : "This batch"}
              </span>

              {!rowWise && (
                <button
                  type="button"
                  onClick={() => setRowWise(true)}
                  className="text-[11.5px] font-[600] text-[#4F46E5] dark:text-[#8B84FF] hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Back to Grid
                </button>
              )}
            </div>

            {/* 3 Counters Grid */}
            <div className="grid grid-cols-3 gap-[10px] mt-[13px]">
              <div className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[11px_12px]">
                <div className="text-[22px] font-[650] [font-variant-numeric:tabular-nums] text-[#1E293B] dark:text-[#E7ECF3]">
                  {!rowWise ? getcount : rows.length}
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                  {!rowWise ? (fileType === "pdf" ? "Total Files" : "Total Rows") : "Total rows"}
                </div>
              </div>

              <div className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[11px_12px]">
                <div className="text-[22px] font-[650] [font-variant-numeric:tabular-nums] text-[#10B981]">
                  {!rowWise ? (fileType === "pdf" ? correctData : excelRowinserted) : validCount}
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                  {!rowWise ? (fileType === "pdf" ? "Uploaded Files" : "Imported Rows") : "Inserted rows"}
                </div>
              </div>

              <div className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[11px_12px]">
                <div
                  className={`text-[22px] font-[650] [font-variant-numeric:tabular-nums] ${(!rowWise ? (fileType === "pdf" ? wrongData : excelRowSkipped) : skipCount)
                      ? "text-[#E11D48]"
                      : "text-[#64748B] dark:text-[#94A3B8]"
                    }`}
                >
                  {!rowWise ? (fileType === "pdf" ? wrongData : excelRowSkipped) : skipCount}
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                  {!rowWise ? (fileType === "pdf" ? "Rejected Files" : "Skipped Rows") : "Skipped rows"}
                </div>
              </div>
            </div>

            {/* Checks list (when in row-wise grid) or Filter Buttons (when in file mode) */}
            {rowWise ? (
              <div className="mt-[14px] pt-[13px] border-t border-[#E2E8F0] dark:border-[#1F2937] flex flex-col gap-[8px]">
                <div className="flex items-center gap-[9px] text-[12px]">
                  <span
                    className={`w-[17px] h-[17px] rounded-[5px] shrink-0 grid place-items-center ${validCount > 0
                        ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                        : "bg-[rgba(245,158,11,0.16)] text-[#B45309]"
                      }`}
                  >
                    {validCount > 0 ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0 text-[#1E293B] dark:text-[#E7ECF3]">
                    {validCount} rows pass validation
                  </span>
                </div>

                <div className="flex items-center gap-[9px] text-[12px]">
                  <span
                    className={`w-[17px] h-[17px] rounded-[5px] shrink-0 grid place-items-center ${cvCount === rows.length && rows.length > 0
                        ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                        : "bg-[rgba(245,158,11,0.16)] text-[#B45309]"
                      }`}
                  >
                    {cvCount === rows.length && rows.length > 0 ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0 text-[#1E293B] dark:text-[#E7ECF3]">
                    {cvCount} of {rows.length} rows have a matched CV PDF
                  </span>
                </div>

                <div className="flex items-center gap-[9px] text-[12px]">
                  <span
                    className={`w-[17px] h-[17px] rounded-[5px] shrink-0 grid place-items-center ${skipCount === 0
                        ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                        : "bg-[rgba(245,158,11,0.16)] text-[#B45309]"
                      }`}
                  >
                    {skipCount === 0 ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0 text-[#1E293B] dark:text-[#E7ECF3]">
                    {skipCount ? `${skipCount} rows need a fix before saving` : "No blocking errors"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-[14px] pt-[13px] border-t border-[#E2E8F0] dark:border-[#1F2937] flex items-center gap-2">
                {fileType === "pdf" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTable("success")}
                      className={`flex-1 py-1.5 px-2 rounded-[8px] text-[11.5px] font-[600] transition-colors ${activeTable === "success"
                          ? "bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.4)]"
                          : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] hover:text-[#1E293B]"
                        }`}
                    >
                      Uploaded ({correctData})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTable("failed")}
                      className={`flex-1 py-1.5 px-2 rounded-[8px] text-[11.5px] font-[600] transition-colors ${activeTable === "failed"
                          ? "bg-[rgba(225,29,72,0.1)] text-[#E11D48] border border-[rgba(225,29,72,0.4)]"
                          : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] hover:text-[#1E293B]"
                        }`}
                    >
                      Rejected ({wrongData})
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTable("success")}
                      className={`flex-1 py-1.5 px-2 rounded-[8px] text-[11.5px] font-[600] transition-colors ${activeTable === "success"
                          ? "bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[rgba(16,185,129,0.4)]"
                          : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] hover:text-[#1E293B]"
                        }`}
                    >
                      Imported ({excelRowinserted})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTable("errored")}
                      className={`flex-1 py-1.5 px-2 rounded-[8px] text-[11.5px] font-[600] transition-colors ${activeTable === "errored"
                          ? "bg-[rgba(225,29,72,0.1)] text-[#E11D48] border border-[rgba(225,29,72,0.4)]"
                          : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] hover:text-[#1E293B]"
                        }`}
                    >
                      Non-Imported ({excelRowSkipped})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MAIN DATA SECTION: If fileType === "pdf" and not rowWise -> ONLY 2 COLUMNS! */}
        {!rowWise && fileType === "pdf" ? (
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] overflow-hidden">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-[13px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="m-0 text-[15px] font-[700] text-[#1E293B] dark:text-[#E7ECF3]">
                  PDF Upload Results
                </h2>
                <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] font-medium">
                  {activeTable === "failed" ? `${wrongData} rejected` : `${correctData} uploaded`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTable("success")}
                  className={`py-1.5 px-3 rounded-[8px] text-[12px] font-[600] whitespace-nowrap transition-colors ${activeTable === "success"
                      ? "bg-[#10B981] text-white"
                      : "bg-[#F1F5F9] dark:bg-[#182235] text-[#64748B] hover:text-[#1E293B]"
                    }`}
                >
                  Uploaded ({correctData})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTable("failed")}
                  className={`py-1.5 px-3 rounded-[8px] text-[12px] font-[600] whitespace-nowrap transition-colors ${activeTable === "failed"
                      ? "bg-[#E11D48] text-white"
                      : "bg-[#F1F5F9] dark:bg-[#182235] text-[#64748B] hover:text-[#1E293B]"
                    }`}
                >
                  Rejected ({wrongData})
                </button>
                <AButton
                  variant="outline"
                  size="sm"
                  onClick={() => setRowWise(true)}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-[12px] whitespace-nowrap"
                >
                  Back to Grid
                </AButton>
              </div>
            </div>

            {/* Exactly 2 Columns Table for PDF Upload */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937]">
                    <th className="py-3.5 px-4 text-[13px] font-[700] uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8] w-1/2">
                      File Name
                    </th>
                    <th className="py-3.5 px-4 text-[13px] font-[700] uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8] w-1/2">
                      {activeTable === "failed" ? "Rejection Reason" : "Status"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937]">
                  {activeTable === "failed" ? (
                    failedData.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-[30px] text-center text-[13.5px] text-[#64748B]">
                          No rejected files.
                        </td>
                      </tr>
                    ) : (
                      failedData.map((item: any, idx: number) => {
                        const reason =
                          item.rejectionReasons?.[0] || item.error || "Candidate not found";
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-colors"
                          >
                            <td className="py-3.5 px-4 text-[13.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                              {item.file || item.name || "N/A"}
                            </td>
                            <td className="py-3.5 px-4 text-[13.5px] font-[600] text-[#E11D48]">
                              {reason}
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : successData.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-[30px] text-center text-[13.5px] text-[#64748B]">
                        No uploaded files yet.
                      </td>
                    </tr>
                  ) : (
                    successData.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-colors"
                      >
                        <td className="py-3.5 px-4 text-[13.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                          {item.file || item.name || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 text-[13.5px] font-[600] text-[#10B981]">
                          {item.status || "Uploaded"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : !rowWise && fileType === "excel" ? (
          /* Excel Batch Results */
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-[13px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="m-0 text-[15.5px] font-[700] text-[#1E293B] dark:text-[#E7ECF3]">
                  Excel Import Results
                </h2>
                <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] font-medium">
                  {activeTable === "errored"
                    ? `${excelRowSkipped} skipped`
                    : `${excelRowinserted} imported`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTable("success")}
                  className={`py-1.5 px-3 rounded-[8px] text-[12px] font-[600] whitespace-nowrap transition-colors ${activeTable === "success"
                      ? "bg-[#10B981] text-white"
                      : "bg-[#F1F5F9] dark:bg-[#182235] text-[#64748B] hover:text-[#1E293B]"
                    }`}
                >
                  Imported ({excelRowinserted})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTable("errored")}
                  className={`py-1.5 px-3 rounded-[8px] text-[12px] font-[600] whitespace-nowrap transition-colors ${activeTable === "errored"
                      ? "bg-[#E11D48] text-white"
                      : "bg-[#F1F5F9] dark:bg-[#182235] text-[#64748B] hover:text-[#1E293B]"
                    }`}
                >
                  Non-Imported ({excelRowSkipped})
                </button>
                <AButton
                  variant="outline"
                  size="sm"
                  onClick={() => setRowWise(true)}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-[12px] whitespace-nowrap"
                >
                  Back to Grid
                </AButton>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8FAFC] dark:bg-[#0E1524] sticky top-0 border-b border-[#E2E8F0] dark:border-[#1F2937]">
                  <tr>
                    {activeTable === "errored" && (
                      <th className="py-3.5 px-4 text-[12.5px] text-[#E11D48] uppercase tracking-wider font-bold whitespace-nowrap">
                        Rejection Reason
                      </th>
                    )}
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Name</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Mob No</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Email</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Gender</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Experience</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Current CTC</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Designation</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">DOB</th>
                    <th className="py-3.5 px-4 text-[12.5px] uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937]">
                  {(activeTable === "errored" ? erroredData : successDataExcel).map((row: any, i: number) => {
                    const rawDob = row.DOB || row.dob;
                    const formattedDob = rawDob ? String(rawDob).split("T")[0] : "—";

                    return (
                      <tr key={i} className="hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-colors">
                        {activeTable === "errored" && (
                          <td className="py-3.5 px-4 text-[13.5px] text-[#E11D48] font-[600] leading-snug whitespace-nowrap">
                            {Array.isArray(row.rejectionReasons)
                              ? row.rejectionReasons.join(", ")
                              : row.rejectionReasons || "Invalid"}
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-[13.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
                          {row.NAME || row.name || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[13.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                          {row.MOB_NO || row["mob no"] || row.mob_no || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                          {row.EMAIL || row.email || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] capitalize text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                          {row.GENDER || row.gender || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[13.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
                          {row.EXP_IN_YEAR || row["experience in year"] || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[13.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                          {row.CURRENT_CTC || row["current ctc"] || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] font-medium text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
                          {row.DESIGNATION || row.designation || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[13.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                          {formattedDob}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                          {row.SKILLS || row.skill || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Rows Grid Card (Default Manual Mode) */
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] overflow-hidden">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 sm:p-[13px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                  Rows
                </h2>
                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] [font-variant-numeric:tabular-nums]">
                  {rows.length} in grid
                </span>

                {/* Mode switch for CardView */}
                <div className="flex items-center bg-[#F1F5F9] dark:bg-[#182235] p-0.5 rounded-[7px] ml-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1 rounded-[5px] text-[11px] transition-colors ${viewMode === "table"
                        ? "bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] shadow-xs"
                        : "text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8]"
                      }`}
                    title="Table view"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`p-1 rounded-[5px] text-[11px] transition-colors ${viewMode === "cards"
                        ? "bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] shadow-xs"
                        : "text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8]"
                      }`}
                    title="Card view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AButton
                  variant="outline"
                  size="sm"
                  icon={<Eraser className="w-3.5 h-3.5 stroke-[1.75]" />}
                  onClick={clearGrid}
                  className="text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] border-[#E2E8F0] dark:border-[#1F2937] text-[12px] font-[550] h-auto py-[6px] px-[11px] rounded-[8px]"
                >
                  Clear grid
                </AButton>

                <AButton
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5 stroke-[1.75]" />}
                  onClick={addRow}
                  className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[12px] font-[600] h-auto py-[6px] px-[12px] rounded-[8px]"
                >
                  Add row
                </AButton>
              </div>
            </div>

            {viewMode === "cards" ? (
              <div className="p-4 border-t border-[#E2E8F0] dark:border-[#1F2937]">
                <CardView
                  data={cardViewData}
                  onCardDoubleClick={(emp) => {
                    showSideAlert(`Candidate selected: ${emp.EMP_NAME}`, "info");
                  }}
                />
              </div>
            ) : (
              /* Table Grid with 14 columns matching prototype */
              <div className="overflow-x-auto">
                <div className="w-max min-w-full">
                  {/* Headers Grid */}
                  <div className="grid grid-cols-[52px_168px_132px_128px_92px_108px_100px_116px_168px_190px_128px_168px_116px_48px] bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937]">
                    {[
                      "#",
                      "NAME",
                      "MOB NO",
                      "HIGH QUALIFICATION",
                      "PERCENTAGE",
                      "GENDER",
                      "EXPERIENCE",
                      "CURRENT CTC",
                      "DESIGNATION",
                      "EMAIL",
                      "DOB",
                      "SKILLS",
                      "RESUME",
                      "",
                    ].map((h, i) => (
                      <span
                        key={i}
                        className="p-[10px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Rows Grid */}
                  {rows.map((row, index) => {
                    const report = rowValidationData[index] || {
                      ok: true,
                      isNameInvalid: false,
                      isMobileInvalid: false,
                      isEmailInvalid: false,
                    };

                    return (
                      <div
                        key={index}
                        className={`grid grid-cols-[52px_168px_132px_128px_92px_108px_100px_116px_168px_190px_128px_168px_116px_48px] items-center border-b border-[#E2E8F0] dark:border-[#1F2937] transition-colors ${report.ok ? "bg-transparent" : "bg-[rgba(225,29,72,0.04)]"
                          }`}
                      >
                        {/* # Col with colored dot */}
                        <span className="p-[9px_10px] flex items-center gap-[6px]">
                          <span
                            className={`w-[7px] h-[7px] rounded-full shrink-0 ${report.ok ? "bg-[#10B981]" : "bg-[#E11D48]"
                              }`}
                          />
                          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] [font-variant-numeric:tabular-nums]">
                            {index + 1}
                          </span>
                        </span>

                        {/* NAME */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleChange(index, "name", e.target.value)}
                            placeholder="Full name"
                            className={`w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none transition-colors border ${report.isNameInvalid
                                ? "border-[rgba(225,29,72,0.5)] bg-[rgba(225,29,72,0.06)] text-[#E11D48] placeholder:text-[#E11D48]/70"
                                : "border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                              }`}
                          />
                        </span>

                        {/* MOB NO */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.mob_no}
                            maxLength={10}
                            onChange={(e) => handleChange(index, "mob_no", e.target.value)}
                            placeholder="10 digits"
                            className={`w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none transition-colors border ${report.isMobileInvalid
                                ? "border-[rgba(225,29,72,0.5)] bg-[rgba(225,29,72,0.06)] text-[#E11D48] placeholder:text-[#E11D48]/70"
                                : "border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                              }`}
                          />
                        </span>

                        {/* HIGH QUALIFICATION */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.high_qualification}
                            onChange={(e) =>
                              handleChange(index, "high_qualification", e.target.value)
                            }
                            placeholder="12th / BSc"
                            className="w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          />
                        </span>

                        {/* PERCENTAGE */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.percentage}
                            maxLength={3}
                            onChange={(e) =>
                              handleChange(index, "percentage", e.target.value)
                            }
                            placeholder="%"
                            className="w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          />
                        </span>

                        {/* GENDER */}
                        <span className="p-[5px_6px] min-w-0">
                          <select
                            value={row.gender}
                            onChange={(e) => handleChange(index, "gender", e.target.value)}
                            className="w-full appearance-none text-[12.5px] p-[7px_8px] rounded-[7px] outline-none cursor-pointer border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          >
                            {GENDERS.map((g) => (
                              <option key={g} value={g} className="dark:bg-[#111827]">
                                {g}
                              </option>
                            ))}
                          </select>
                        </span>

                        {/* EXPERIENCE */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.experence}
                            onChange={(e) =>
                              handleChange(index, "experence", e.target.value)
                            }
                            placeholder="Years"
                            className="w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          />
                        </span>

                        {/* CURRENT CTC */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.current_ctc}
                            onChange={(e) =>
                              handleChange(index, "current_ctc", e.target.value)
                            }
                            placeholder="₹"
                            className="w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          />
                        </span>

                        {/* DESIGNATION */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.designation}
                            onChange={(e) =>
                              handleChange(index, "designation", e.target.value)
                            }
                            placeholder="Applying for"
                            className="w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          />
                        </span>

                        {/* EMAIL */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.email}
                            onChange={(e) => handleChange(index, "email", e.target.value)}
                            placeholder="name@example.com"
                            className={`w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none transition-colors border ${report.isEmailInvalid
                                ? "border-[rgba(225,29,72,0.5)] bg-[rgba(225,29,72,0.06)] text-[#E11D48]"
                                : "border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                              }`}
                          />
                        </span>

                        {/* DOB */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="date"
                            value={row.dob}
                            onChange={(e) => handleChange(index, "dob", e.target.value)}
                            className="w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          />
                        </span>

                        {/* SKILLS */}
                        <span className="p-[5px_6px] min-w-0">
                          <input
                            type="text"
                            value={row.skills}
                            onChange={(e) => handleChange(index, "skills", e.target.value)}
                            placeholder="Comma separated"
                            className="w-full text-[12.5px] p-[7px_8px] rounded-[7px] outline-none border border-transparent bg-transparent text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] focus:border-[#4F46E5] focus:bg-white dark:focus:bg-[#0E1524]"
                          />
                        </span>

                        {/* RESUME BUTTON */}
                        <span className="p-[5px_8px]">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            ref={(el) => (rowFileInputRefs.current[index] = el)}
                            className="hidden"
                            onChange={(e) =>
                              handleRowFileChange(index, e.target.files?.[0] || null)
                            }
                          />

                          <button
                            type="button"
                            onClick={() => rowFileInputRefs.current[index]?.click()}
                            className={`w-full flex items-center gap-[6px] border rounded-[8px] p-[6px_8px] text-[11.5px] font-[600] cursor-pointer whitespace-nowrap overflow-hidden transition-colors border-[#E2E8F0] dark:border-[#1F2937] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] ${row.resume || row.resumeName
                                ? "text-[#10B981]"
                                : "text-[#64748B] dark:text-[#94A3B8]"
                              }`}
                          >
                            {row.resume || row.resumeName ? (
                              <FileCheck className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                            )}
                            <span className="truncate">
                              {row.resume?.name ||
                                row.resumeName ||
                                (row.mob_no ? `${row.mob_no}.pdf` : "Attach CV")}
                            </span>
                          </button>
                        </span>

                        {/* REMOVE BUTTON */}
                        <span className="grid place-items-center">
                          <button
                            type="button"
                            onClick={() => deleteRow(index)}
                            className="w-[26px] h-[26px] grid place-items-center border-none bg-transparent text-[#64748B] dark:text-[#94A3B8] rounded-[7px] cursor-pointer hover:bg-[rgba(225,29,72,0.12)] hover:text-[#E11D48] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                          </button>
                        </span>
                      </div>
                    );
                  })}

                  {/* Empty State */}
                  {rows.length === 0 && (
                    <div className="p-[40px_20px] text-center">
                      <div className="text-[13px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                        Grid is empty
                      </div>
                      <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-[4px]">
                        Import a sheet or add a row to start typing.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skipped Alert Banner at bottom of Card */}
            {skippedList.length > 0 && (
              <div className="p-[13px_18px] border-t border-[#E2E8F0] dark:border-[#1F2937] bg-[rgba(225,29,72,0.06)]">
                <div className="flex items-center gap-[9px] text-[12.5px] font-[600] text-[#E11D48]">
                  <AlertTriangle className="w-4 h-4 stroke-[1.75]" />
                  {skippedList.length} {skippedList.length === 1 ? "row" : "rows"} will be skipped on save
                </div>
                <div className="flex flex-col gap-[5px] mt-[9px]">
                  {skippedList.map((s) => (
                    <div key={s.num} className="text-[12px] text-[#1E293B] dark:text-[#E7ECF3]">
                      <span className="font-[600] [font-variant-numeric:tabular-nums]">
                        Row {s.num}
                      </span>{" "}
                      · {s.why}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <div
        style={{
          paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        }}
        className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] px-3 sm:px-6 pt-2.5 pb-6 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-[14px] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-[left] duration-150 ease-in-out"
      >
        <div className="text-[11.5px] sm:text-[12.5px] text-[#64748B] dark:text-[#94A3B8] text-center sm:text-left w-full sm:w-auto shrink-0">
          Total rows{" "}
          <span className="text-[#1E293B] dark:text-[#E7ECF3] font-[600] [font-variant-numeric:tabular-nums]">
            {!rowWise ? getcount : rows.length}
          </span>{" "}
          · ready to insert{" "}
          <span className="text-[#10B981] font-[600] [font-variant-numeric:tabular-nums]">
            {!rowWise ? (fileType === "pdf" ? correctData : excelRowinserted) : validCount}
          </span>{" "}
          · will skip{" "}
          <span className="text-[#E11D48] font-[600] [font-variant-numeric:tabular-nums]">
            {!rowWise ? (fileType === "pdf" ? wrongData : excelRowSkipped) : skipCount}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          <AButton
            variant="outline"
            size="sm"
            onClick={() => router.push("/payroll/recruitment-process/resume-bank")}
            className="flex-1 sm:flex-none justify-center items-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] sm:text-[12.5px] font-[550] h-10 py-2 px-3 sm:px-[14px] rounded-[10px] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] whitespace-nowrap"
          >
            <span>Open resume bank</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </AButton>

          <AButton
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={isLoading}
            loadingText="Saving..."
            disabled={validCount === 0}
            className={`flex-1 sm:flex-none justify-center items-center gap-1.5 text-white text-[12px] sm:text-[12.5px] font-[600] h-10 py-2 px-3 sm:px-[17px] rounded-[10px] whitespace-nowrap shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] ${validCount > 0 ? "bg-[#4F46E5] hover:bg-[#4338CA]" : "bg-[#64748B] cursor-not-allowed"
              }`}
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span>Save to resume bank</span>
          </AButton>
        </div>
      </div>

      {/* Hidden container maintaining requested component imports */}
      <div className="hidden">
        <DynamicTable
          columns={["Degree", "Institute", "Year", "Percentage"]}
          columnsShow={["Degree", "Institute", "Year", "Percentage"]}
          tableData={qualificationData}
          setTableData={setQualificationData}
          constraints={{
            Degree: { type: "TEXT", max: 50 },
            Institute: { type: "TEXT", max: 100 },
            Year: { type: "NUMBER", max: 4 },
            Percentage: { type: "NUMBER", max: 3 },
          }}
        />
        <CertificatesUpload
          items={[{ name: "doc", title: "Certificate", subtitle: "Upload file" }]}
          value={docUploads}
          onChange={setDocUploads}
        />
      </div>

      {/* Loading Overlay */}
      <HashloaderComponent isLoading={isLoadingonpage} />
    </div>
  );
}
