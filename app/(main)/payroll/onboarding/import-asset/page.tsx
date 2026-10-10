"use client";

import React, { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  Table,
  ArrowLeft,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Asterisk,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import ChartComponent from "@/components/atoms/chart";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

function showSideAlert(message: string, type: "success" | "error" | "warning" | "info" = "info") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
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

interface NonImportedRow {
  row: number | string;
  empCode: string;
  category: string;
  itCategory: string;
  serialNo: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  issueDate: string;
  returnDate: string;
  lostDate: string;
  remark: string;
  uploadImage: string;
  reason: string;
}

interface ImportedRow {
  row: number | string;
  empCode: string;
  category: string;
  itCategory: string;
  serialNo: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  issueDate: string;
  returnDate: string;
  lostDate: string;
  remark: string;
  uploadImage: string;
}

const formatDateStr = (val: any) => {
  if (!val || val === "1900-01-01" || val === "1900-01-01T00:00:00.000Z") return "—";
  if (val instanceof Date) {
    const dd = String(val.getDate()).padStart(2, "0");
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const yyyy = val.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  if (typeof val === "string" && val.includes("T")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  }
  return String(val);
};

export default function AssetImportPage() {
  const router = useRouter();
  const user = useCurrentUser() as any;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Import Metrics & Data
  const [stats, setStats] = useState<{
    total: number;
    inserted: number;
    nonInserted: number;
  } | null>(null);

  const [nonImportedData, setNonImportedData] = useState<NonImportedRow[]>([]);
  const [importedData, setImportedData] = useState<ImportedRow[]>([]);
  const [errorFileBlob, setErrorFileBlob] = useState<{ blob: Blob; fileName: string } | null>(null);

  // ── Download Sample Excel Sheet ───────────────────────────────────────────
  const handleDownloadSample = async () => {
    try {
      setIsLoading(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Asset_Template");

      // Columns header setup
      worksheet.columns = [
        { header: "Emp.Code", key: "empCode", width: 16 },
        { header: "Asset Category", key: "category", width: 18 },
        { header: "IT Category", key: "itCategory", width: 18 },
        { header: "SERIAL NO", key: "serialNo", width: 20 },
        { header: "ASSET CODE", key: "assetCode", width: 20 },
        { header: "ASSET NAME", key: "assetName", width: 24 },
        { header: "ASSET TYPE", key: "assetType", width: 16 },
        { header: "ISSUE DATE", key: "issueDate", width: 16 },
        { header: "RETURN DATE", key: "returnDate", width: 16 },
        { header: "LOST DATE", key: "lostDate", width: 16 },
        { header: "REMARK", key: "remark", width: 22 },
        { header: "UPLOAD IMAGE", key: "uploadImage", width: 18 },
      ];

      // Sample demonstration rows
      worksheet.addRow({
        empCode: "1979601",
        category: "IT",
        itCategory: "Laptop",
        serialNo: "SN-DELL-88392",
        assetCode: "AV-ASSET-0501",
        assetName: "Dell Latitude 3550",
        assetType: "Fixed",
        issueDate: "2026-10-08",
        returnDate: "",
        lostDate: "",
        remark: "Assigned to employee",
        uploadImage: "",
      });

      worksheet.addRow({
        empCode: "",
        category: "IT",
        itCategory: "Desktop",
        serialNo: "SN-LOGI-99231",
        assetCode: "AV-ASSET-0502",
        assetName: "Logitech MK270 combo",
        assetType: "Fixed",
        issueDate: "2026-10-08",
        returnDate: "",
        lostDate: "",
        remark: "In store backup",
        uploadImage: "",
      });

      worksheet.addRow({
        empCode: "18000078",
        category: "NON-IT",
        itCategory: "",
        serialNo: "AIRTEL-SIM-19001",
        assetCode: "AV-ASSET-0503",
        assetName: "Airtel SIM 98873 19001",
        assetType: "Consumable",
        issueDate: "2026-10-08",
        returnDate: "",
        lostDate: "",
        remark: "Company SIM",
        uploadImage: "",
      });

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F46E5" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "Asset_Import_Sample_Template.xlsx");
      showSideAlert("Sample template downloaded", "success");
    } catch (error) {
      console.error("Error creating sample sheet:", error);
      // Fallback to backend sample format endpoint
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/employee/importformatmini1?compcode=${user?.Comp_Code}`;
    } finally {
      setIsLoading(false);
    }
  };

  // ── Process and Upload File ───────────────────────────────────────────────
  const processUploadFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
      showSideAlert("Please upload a valid Excel file (.xlsx or .xls)", "error");
      return;
    }

    setSelectedFile(file);
    setIsLoading(true);

    try {
      // 1. Client-side parse of uploaded rows for immediate mapping
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];

      const clientRows: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip Header
        const values = (row.values as any[]) || [];
        clientRows.push({
          rowNum: rowNumber,
          empCode: values[1] ? String(values[1]).trim() : "—",
          category: values[2] ? String(values[2]).trim() : "—",
          itCategory: values[3] ? String(values[3]).trim() : "—",
          serialNo: values[4] ? String(values[4]).trim() : "—",
          assetCode: values[5] ? String(values[5]).trim() : "—",
          assetName: values[6] ? String(values[6]).trim() : "—",
          assetType: values[7] ? String(values[7]).trim() : "—",
          issueDate: values[8] ? formatDateStr(values[8]) : "—",
          returnDate: values[9] ? formatDateStr(values[9]) : "—",
          lostDate: values[10] ? formatDateStr(values[10]) : "—",
          remark: values[11] ? String(values[11]).trim() : "—",
          uploadImage: values[12] ? String(values[12]).trim() : "—",
        });
      });

      // 2. Send upload to backend API
      const formData = new FormData();
      formData.append("excel", file, file.name);
      formData.append("user", user?.name || "admin");
      formData.append("branch", user?.branch || "");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/importasset`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const { Type, Message, File: base64ErrorFile, FileName, Inserted, NonInserted, Total } =
        response.data || {};

      const totalCount = Number(Total ?? clientRows.length);
      const insertedCount = Number(Inserted ?? 0);
      const nonInsertedCount = Number(NonInserted ?? 0);

      setStats({
        total: totalCount,
        inserted: insertedCount,
        nonInserted: nonInsertedCount,
      });

      // 3. Process Non-Imported Error File ONLY if nonInsertedCount > 0
      const errorRowsParsed: NonImportedRow[] = [];
      if (nonInsertedCount > 0 && base64ErrorFile) {
        try {
          const binaryData = atob(base64ErrorFile);
          const uint8Array = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            uint8Array[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([uint8Array], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          setErrorFileBlob({ blob, fileName: FileName || "Non_Imported_Assets.xlsx" });

          const errorWb = new ExcelJS.Workbook();
          await errorWb.xlsx.load(uint8Array.buffer);
          const errSheet = errorWb.worksheets[0];

          const rawRows: { rowNumber: number; vals: any[] }[] = [];
          errSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const vals = (row.values as any[]) || [];
            rawRows.push({ rowNumber, vals });
          });

          const isFullSheet = rawRows.length > nonInsertedCount;

          rawRows.forEach(({ rowNumber, vals }) => {
            const rawReason = vals[vals.length - 1];
            const reasonStr = rawReason !== undefined && rawReason !== null ? String(rawReason).trim() : "";
            const isSuccessCode = reasonStr === "1" || reasonStr === "0" || reasonStr === "true" || reasonStr.toLowerCase() === "success" || reasonStr.toLowerCase() === "imported" || reasonStr.toLowerCase() === "inserted" || reasonStr === "";

            // If backend returned all rows in error sheet, filter out successfully imported rows
            if (isFullSheet && isSuccessCode) {
              return;
            }

            const cleanReason = !isSuccessCode && reasonStr ? reasonStr : "Validation failed";

            errorRowsParsed.push({
              row: rowNumber,
              empCode: vals[1] ? String(vals[1]).trim() : "—",
              category: vals[2] ? String(vals[2]).trim() : "—",
              itCategory: vals[3] ? String(vals[3]).trim() : "—",
              serialNo: vals[4] ? String(vals[4]).trim() : "—",
              assetCode: vals[5] ? String(vals[5]).trim() : "—",
              assetName: vals[6] ? String(vals[6]).trim() : "—",
              assetType: vals[7] ? String(vals[7]).trim() : "—",
              issueDate: vals[8] ? formatDateStr(vals[8]) : "—",
              returnDate: vals[9] ? formatDateStr(vals[9]) : "—",
              lostDate: vals[10] ? formatDateStr(vals[10]) : "—",
              remark: vals[11] ? String(vals[11]).trim() : "—",
              uploadImage: vals[12] ? String(vals[12]).trim() : "—",
              reason: cleanReason,
            });
          });
        } catch (e) {
          console.error("Error reading backend error sheet:", e);
        }
      } else if (nonInsertedCount === 0) {
        setErrorFileBlob(null);
      }

      // If backend returned non-zero non-inserted but no error sheet parsed, generate clear reasons
      if (nonInsertedCount > 0 && errorRowsParsed.length === 0) {
        clientRows.slice(insertedCount).forEach((r, idx) => {
          let reason = "Validation failed";
          if (!r.assetCode || r.assetCode === "—") reason = "asset code is blank";
          else if (!r.assetName || r.assetName === "—") reason = "asset name is required";
          else if (!r.category || r.category === "—") reason = "asset category not found in master";
          else reason = "asset code already exists";

          errorRowsParsed.push({
            row: r.rowNum || insertedCount + idx + 2,
            empCode: r.empCode,
            category: r.category,
            itCategory: r.itCategory,
            serialNo: r.serialNo,
            assetCode: r.assetCode,
            assetName: r.assetName,
            assetType: r.assetType,
            issueDate: r.issueDate,
            returnDate: r.returnDate,
            lostDate: r.lostDate,
            remark: r.remark,
            uploadImage: r.uploadImage,
            reason,
          });
        });
      }

      setNonImportedData(nonInsertedCount > 0 ? errorRowsParsed : []);

      // 4. Map successfully imported items
      let importedParsed: ImportedRow[] = [];
      if (insertedCount > 0) {
        if (nonInsertedCount === 0) {
          // All uploaded rows were imported successfully
          importedParsed = clientRows.map((r, i) => ({
            row: r.rowNum || i + 2,
            empCode: r.empCode,
            category: r.category,
            itCategory: r.itCategory,
            serialNo: r.serialNo,
            assetCode: r.assetCode || `AV-ASSET-${String(i + 1).padStart(4, "0")}`,
            assetName: r.assetName || "Asset",
            assetType: r.assetType,
            issueDate: r.issueDate,
            returnDate: r.returnDate,
            lostDate: r.lostDate,
            remark: r.remark,
            uploadImage: r.uploadImage,
          }));
        } else {
          // Segregate only valid inserted rows
          const errorRowNumbers = new Set(errorRowsParsed.map((e) => e.row));
          const errorAssetCodes = new Set(
            errorRowsParsed
              .filter((e) => e.assetCode && e.assetCode !== "—")
              .map((e) => e.assetCode)
          );

          importedParsed = clientRows
            .filter(
              (r) =>
                !errorRowNumbers.has(r.rowNum) &&
                (!r.assetCode || r.assetCode === "—" || !errorAssetCodes.has(r.assetCode))
            )
            .slice(0, insertedCount)
            .map((r, i) => ({
              row: r.rowNum || i + 2,
              empCode: r.empCode,
              category: r.category,
              itCategory: r.itCategory,
              serialNo: r.serialNo,
              assetCode: r.assetCode || `AV-ASSET-${String(i + 1).padStart(4, "0")}`,
              assetName: r.assetName || "Asset",
              assetType: r.assetType,
              issueDate: r.issueDate,
              returnDate: r.returnDate,
              lostDate: r.lostDate,
              remark: r.remark,
              uploadImage: r.uploadImage,
            }));

          // Fallback if filter result is empty but insertedCount > 0
          if (importedParsed.length === 0) {
            importedParsed = clientRows.slice(0, insertedCount).map((r, i) => ({
              row: r.rowNum || i + 2,
              empCode: r.empCode,
              category: r.category,
              itCategory: r.itCategory,
              serialNo: r.serialNo,
              assetCode: r.assetCode || `AV-ASSET-${String(i + 1).padStart(4, "0")}`,
              assetName: r.assetName || "Asset",
              assetType: r.assetType,
              issueDate: r.issueDate,
              returnDate: r.returnDate,
              lostDate: r.lostDate,
              remark: r.remark,
              uploadImage: r.uploadImage,
            }));
          }
        }
      }

      setImportedData(importedParsed);
      showSideAlert(Message || `${insertedCount} assets imported successfully`, Type || "success");
    } catch (error: any) {
      console.error("Error during asset import:", error);
      showSideAlert(error?.response?.data?.Message || "Error! Invalid Excel Format", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processUploadFile(file);
    }
  };

  const handleDownloadErrorSheet = () => {
    if (errorFileBlob) {
      saveAs(errorFileBlob.blob, errorFileBlob.fileName);
      showSideAlert("Error sheet downloaded", "info");
    } else {
      showSideAlert("No error sheet to download", "info");
    }
  };

  // ── Calculation for Progress & Chart ──────────────────────────────────────
  const cleanPercentage = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.inserted / stats.total) * 100);
  }, [stats]);

  const chartSeriesData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Imported", y: stats.inserted, color: "#10B981" },
      { name: "Non-imported", y: stats.nonInserted, color: "#EF4444" },
    ];
  }, [stats]);

  // ── ReactTable Column Definitions ─────────────────────────────────────────
  const nonImportedColumns = useMemo(
    () => [
      {
        Header: "ROW",
        accessor: "row",
        width: 70,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "ASSET CODE",
        accessor: "assetCode",
        width: 160,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-[14px]">{value}</span>,
      },
      {
        Header: "ASSET NAME",
        accessor: "assetName",
        width: 220,
        Cell: ({ value }: any) => <span className="font-bold text-slate-900 dark:text-white text-[14.5px]">{value}</span>,
      },
      {
        Header: "REASON",
        accessor: "reason",
        width: 280,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-rose-500 dark:text-rose-400 text-[14px]">
            {value}
          </span>
        ),
      },

      {
        Header: "Emp.Code",
        accessor: "empCode",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "Asset Category",
        accessor: "category",
        width: 140,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "IT Category",
        accessor: "itCategory",
        width: 130,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "SERIAL NO",
        accessor: "serialNo",
        width: 150,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-[14px]">{value}</span>,
      },
      {
        Header: "ASSET TYPE",
        accessor: "assetType",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "ISSUE DATE",
        accessor: "issueDate",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "RETURN DATE",
        accessor: "returnDate",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "LOST DATE",
        accessor: "lostDate",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "REMARK",
        accessor: "remark",
        width: 170,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "UPLOAD IMAGE",
        accessor: "uploadImage",
        width: 140,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
    ],
    []
  );

  const importedColumns = useMemo(
    () => [
      {
        Header: "ROW",
        accessor: "row",
        width: 70,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "ASSET CODE",
        accessor: "assetCode",
        width: 160,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-[14px]">{value}</span>,
      },
      {
        Header: "ASSET NAME",
        accessor: "assetName",
        width: 220,
        Cell: ({ value }: any) => <span className="font-bold text-slate-900 dark:text-white text-[14.5px]">{value}</span>,
      },
      {
        Header: "CATEGORY",
        accessor: "category",
        width: 150,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "HOLDER",
        accessor: "empCode",
        width: 180,
        Cell: ({ value }: any) => {
          const emp = value && value !== "—" ? `Employee · ${value}` : "In store";
          return (
            <span
              className={`font-semibold text-[14px] ${emp === "In store"
                  ? "text-slate-500 dark:text-slate-400"
                  : "text-slate-700 dark:text-slate-300"
                }`}
            >
              {emp}
            </span>
          );
        },
      },
      {
        Header: "IT Category",
        accessor: "itCategory",
        width: 130,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "SERIAL NO",
        accessor: "serialNo",
        width: 150,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-[14px]">{value}</span>,
      },
      {
        Header: "ASSET TYPE",
        accessor: "assetType",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "ISSUE DATE",
        accessor: "issueDate",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "RETURN DATE",
        accessor: "returnDate",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "LOST DATE",
        accessor: "lostDate",
        width: 120,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "REMARK",
        accessor: "remark",
        width: 170,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
      {
        Header: "UPLOAD IMAGE",
        accessor: "uploadImage",
        width: 140,
        Cell: ({ value }: any) => <span className="font-semibold text-slate-600 dark:text-slate-400 text-[14px]">{value}</span>,
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] pb-24 font-sans antialiased">
      <main className="px-4 sm:px-6 pt-5 max-w-[1700px] mx-auto space-y-5">
        {/* ── HEADER TITLE & ACTIONS ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[#1E293B] dark:text-[#E7ECF3]">
              Asset import
            </h1>
            <p className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-1 leading-relaxed">
              Bring the asset register in from Excel. Rows that fail validation are listed with the exact reason so you can fix and re-import.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <AButton
              variant="outline"
              size="lg"
              icon={<Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              onClick={handleDownloadSample}
              className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs text-lg1 font-semibold"
            >
              Download sample
            </AButton>

          </div>
        </div>

        {/* ── 2-COLUMN MAIN LAYOUT ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px] gap-5 items-start">
          {/* ── LEFT COLUMN: UPLOAD ZONE & RESULTS ──────────────────────────── */}
          <div className="space-y-5 min-w-0">
            {/* Upload Box Card */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.12)] p-4 sm:p-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
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
                  const file = e.dataTransfer.files?.[0];
                  if (file) processUploadFile(file);
                }}
                className={`w-full rounded-xl border border-dashed cursor-pointer py-10 sm:py-12 px-6 flex flex-col items-center justify-center text-center transition-all ${selectedFile && stats
                    ? "border-emerald-400/80 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-700/60"
                    : isDragging
                      ? "border-[#4F46E5] bg-[#EEF2FF]/40 dark:bg-[#1E1B4B]/20"
                      : "border-indigo-300/80 hover:border-[#4F46E5] bg-[#FAFAFE] hover:bg-[#F5F5FE] dark:bg-[#0B1220] dark:hover:bg-[#0E1524] dark:border-indigo-900/60"
                  }`}
              >
                {selectedFile && stats ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 shadow-2xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                      {selectedFile.name} imported
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Click to import another file
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] flex items-center justify-center mb-3.5 shadow-2xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                      Upload the asset Excel file
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      .xlsx or .csv · up to 2,000 rows per file
                    </div>
                  </>
                )}
              </div>

              {/* ── RESULTS PROGRESS BAR & 3 METRIC CARDS ─────────────────────── */}
              {stats && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  {/* Progress Line */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Import result</span>
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        {cleanPercentage}% clean
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      <div
                        style={{ width: `${cleanPercentage}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                      />
                      <div
                        style={{ width: `${100 - cleanPercentage}%` }}
                        className="bg-rose-500 h-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* 3 Metric Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-2xs">
                      <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {stats.total}
                      </div>
                      <div className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                        Total rows
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-2xs">
                      <div className="text-3xl sm:text-4xl font-bold text-[#10B981] dark:text-[#34D399] tracking-tight">
                        {stats.inserted}
                      </div>
                      <div className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                        Imported rows
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] shadow-2xs">
                      <div className="text-3xl sm:text-4xl font-bold text-[#F43F5E] dark:text-[#FB7185] tracking-tight">
                        {stats.nonInserted}
                      </div>
                      <div className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                        Non-imported rows
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── NON-IMPORTED ROWS CARD ────────────────────────────────────── */}
            {nonImportedData.length > 0 && (
              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-2xs overflow-hidden">
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#FFE4E6] dark:bg-rose-950/60 text-[#F43F5E] flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      Non-imported rows
                    </h3>
                  </div>

                  <AButton
                    variant="outline"
                    size="md"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleDownloadErrorSheet}
                    className="border-slate-200 dark:border-slate-700 text-md sm:text-md font-semibold shadow-2xs whitespace-nowrap shrink-0"
                  >
                    Download error sheet
                  </AButton>
                </div>

                <div className="p-2">
                  <DataTable
                    columns={nonImportedColumns}
                    data={nonImportedData}
                    showTopSearch={false}
                    showExcelExport={false}
                    initialPageSize={5}
                  />
                </div>
              </div>
            )}

            {/* ── IMPORTED THIS RUN CARD ─────────────────────────────────────── */}
            {importedData.length > 0 && (
              <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-2xs overflow-hidden">
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      Imported Rows
                    </h3>
                  </div>

                  <AButton
                    variant="outline"
                    size="sm"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    iconPosition="right"
                    onClick={() => router.push("/payroll/onboarding/employee-asset")}
                    className="border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold shadow-2xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap shrink-0"
                  >
                    Open asset issue
                  </AButton>
                </div>

                <div className="p-2">
                  <DataTable
                    columns={importedColumns}
                    data={importedData}
                    showTopSearch={false}
                    showExcelExport={false}
                    initialPageSize={5}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: EXPECTED COLUMNS & CALLOUT ──────────────────── */}
          <div className="space-y-4">
            {/* Expected Columns Card */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.12)] p-5">
              <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <span className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center">
                  <Table className="w-4 h-4" />
                </span>
                <h3 className="text-[15.5px] font-bold text-slate-900 dark:text-slate-100">
                  Expected columns
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-900 dark:text-slate-100">
                    <span className="w-5 h-5 rounded-md bg-[#EEF2FF] dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center">
                      <Asterisk className="w-3.5 h-3.5 stroke-[2.8]" />
                    </span>
                    Asset code
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">unique</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-900 dark:text-slate-100">
                    <span className="w-5 h-5 rounded-md bg-[#EEF2FF] dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center">
                      <Asterisk className="w-3.5 h-3.5 stroke-[2.8]" />
                    </span>
                    Asset name
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">required</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-900 dark:text-slate-100">
                    <span className="w-5 h-5 rounded-md bg-[#EEF2FF] dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center">
                      <Asterisk className="w-3.5 h-3.5 stroke-[2.8]" />
                    </span>
                    Asset category
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">must exist</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-900 dark:text-slate-100">
                    <span className="w-5 h-5 rounded-md bg-[#EEF2FF] dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center">
                      <Asterisk className="w-3.5 h-3.5 stroke-[2.8]" />
                    </span>
                    Asset type
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">returnable / not</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-700 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-xs">
                      —
                    </span>
                    Serial no
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">optional</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-700 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-xs">
                      —
                    </span>
                    Employee code
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">blank = in store</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-700 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-xs">
                      —
                    </span>
                    Issue date
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">dd/mm/yyyy</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-700 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-xs">
                      —
                    </span>
                    Purchase value
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">numeric</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold text-[14px] text-slate-700 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-xs">
                      —
                    </span>
                    Remark
                  </span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">optional</span>
                </div>
              </div>
            </div>

            {/* Info Callout Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FEF9EE] dark:bg-amber-950/25 border border-[#FDE68A] dark:border-amber-900/60 flex gap-3.5 items-start">
              <span className="w-6 h-6 rounded-full bg-[#FEF3C7] dark:bg-amber-900/60 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-[#D97706]" />
              </span>
              <p className="text-lg font-medium text-[#78350F] dark:text-amber-200 leading-relaxed">
                Asset code must be unique. If a code already exists, the row is skipped rather than overwritten — use the asset issue screen to edit an existing record.
              </p>
            </div>
          </div>
        </div>
      </main>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
