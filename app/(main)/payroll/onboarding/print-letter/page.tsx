"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import Image from "next/image";
import {
  FileText,
  Award,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Users,
  FileEdit,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Printer,
  Send,
  Mail,
  ShieldCheck,
  Check,
  Building2,
  X,
  FileDown,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

// ── 4 REQUIRED COMPONENTS ──────────────────────────────────────
import Card, { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";
import EnglishPrintout from "@/components/atoms/EnglishPrintout";
import AButton from "@/components/atoms/Button";
// ───────────────────────────────────────────────────────────────

import HashloaderComponent from "@/components/Templates/hashloader";

const CHUNK_SIZE = 500;

export default function PrintLetterPage() {
  const router = useRouter();
  const user = useCurrentUser() as any;
  const printContainerRef = useRef<HTMLDivElement>(null);
  const englishPrintoutRef = useRef<HTMLDivElement>(null);

  // ✅ Chunk printing & PDF generation states/refs
  const componentRef = useRef<HTMLDivElement>(null);
  const fullLetterRef = useRef<string>("");
  const isChunkPrintRef = useRef<boolean>(false);
  const hasFetchedRef = useRef<boolean>(false);
  const [chunkIndex, setChunkIndex] = useState<number>(0);
  const [generatedLetter, setGeneratedLetter] = useState<string>("");

  // Robust compCode resolution
  const getCompCode = useCallback(() => {
    return (
      user?.Comp_Code ||
      user?.compcode ||
      user?.comp_code ||
      user?.COMP_CODE ||
      user?.company_code ||
      user?.DB ||
      ""
    );
  }, [user]);

  // Loading & State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Template States
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState({
    TEMPLATE_NAME: "",
    CONTENT: "",
    KEYWORDS: "",
  });

  // Employee data states
  const [employeedata, setEmployeedata] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [selectEmployeedata, setSelectEmployeedata] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Delivery options state
  const [deliveryWhatsApp, setDeliveryWhatsApp] = useState<boolean>(true);
  const [deliveryEmail, setDeliveryEmail] = useState<boolean>(false);
  const [deliveryHardCopy, setDeliveryHardCopy] = useState<boolean>(false);
  const [routeForApproval, setRouteForApproval] = useState<boolean>(true);

  // Header / Branding state
  const [company, setCompany] = useState<any>({
    Comp_Name: "",
    Right_Head1: "",
    Godw_Add1: "",
  });
  const [compLogo, setCompLogo] = useState<string | null>(null);
  const [marutiLogo, setMarutiLogo] = useState<string | null>(null);
  const [signatory, setSignatory] = useState<any>({});
  const [showCompanyInfo, setShowCompanyInfo] = useState<boolean>(true);

  // English Biodata Printout Modal State
  const [showBiodataModal, setShowBiodataModal] = useState<boolean>(false);

  // ── 1. Fetch Comp Logos ──
  const fetchCompLogoAndMarutiLogo = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/quotation/getMarutiLogoAndCompLogo`,
        { multi_loc: user?.branch || "" },
        { headers: { compcode: compCode, name: user?.name || "" } }
      );
      if (result.data) {
        setCompLogo(result.data.complogo || null);
        setMarutiLogo(result.data.MarutilogoImg || null);
      }
    } catch (error) {
      console.error("Error fetching logos:", error);
    }
  }, [getCompCode, user?.branch, user?.name]);

  // ── 2. Fetch Header & Company Info ──
  const fetchHeaderInfo = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/PrintHeader`,
        { multi_loc: user?.branch || "" },
        { headers: { compcode: compCode, name: user?.name || "" } }
      );
      if (result.data?.company && result.data.company[0]) {
        setCompany(result.data.company[0]);
      }
    } catch (error) {
      console.error("Error fetching header info:", error);
    }
  }, [getCompCode, user?.branch, user?.name]);

  // ── 3. Fetch Signatory ──
  const fetchSignatory = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/getSignatory`,
        {},
        { headers: { compcode: compCode, name: user?.name || "" } }
      );
      if (response.data?.data && response.data.data.length > 0) {
        setSignatory(response.data.data[0]);
      }
    } catch (error) {
      console.error("Error fetching signatory:", error);
    }
  }, [getCompCode, user?.name]);

  // ── 4. Fetch Existing Templates ──
  const fetchTemplates = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/FindTemplate`,
        {},
        { headers: { compcode: compCode, name: user?.name || "" } }
      );
      if (response.status === 200 && response.data?.data?.Template?.length > 0) {
        const fetched = response.data.data.Template.map((item: any, idx: number) => {
          const templateName =
            item.Label ||
            item.label ||
            item.TEMPLATE_NAME ||
            item.TEMPLATENAME ||
            item.Template_Name ||
            item.TemplateName ||
            item.Template ||
            item.title ||
            item.Title ||
            item.name ||
            item.Name ||
            `Template ${idx + 1}`;

          const contentStr = item.CONTENT || "";
          const tokenMatches = contentStr.match(/\{[A-Z0-9_]+\}/g);
          const tokenCount = tokenMatches ? new Set(tokenMatches).size : 0;

          return {
            id: String(item.value || idx),
            Label: templateName,
            value: item.value || item.Label || item.label || templateName,
            tokens: tokenCount,
            pages: 1,
            icon: FileText,
            iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
            content: item.CONTENT || "",
            keywords: item.KEYWORDS || "",
            showHeader: item.SHOW_HEADER,
          };
        });
        setTemplates(fetched);
        if (fetched.length > 0) {
          setSelectedTemplate(fetched[0].value);
          setFormData({
            TEMPLATE_NAME: fetched[0].Label,
            CONTENT: fetched[0].content,
            KEYWORDS: fetched[0].keywords,
          });
          setShowCompanyInfo(Number(fetched[0]?.showHeader ?? 1) === 1);
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  }, [getCompCode, user?.name]);

  // Helper to format employee record cleanly
  const formatEmployeeRecord = useCallback(
    (emp: any, index: number = 0) => {
      const empCode =
        emp.EMPCODE ||
        emp.EmpCode ||
        emp.EMP_CODE ||
        emp.Emp_Code ||
        emp.value ||
        emp.id ||
        (emp.label && emp.label.includes(" - ") ? emp.label.split(" - ")[0].trim() : "");

      let empName =
        emp.EMPLOYEENAME ||
        emp.Employee_Name ||
        emp.EMPNAME ||
        emp.EmpName ||
        emp.EMP_NAME ||
        emp.Emp_Name ||
        emp.NAME ||
        emp.Name ||
        "";

      if (!empName && emp.label) {
        if (emp.label.includes(" - ")) {
          const parts = emp.label.split(" - ");
          empName = parts.slice(1).join(" - ").trim();
          if (empName.includes("(") && empName.endsWith(")")) {
            empName = empName.replace(/\s*\([^)]*\)$/, "").trim();
          }
        } else {
          empName = String(emp.label).trim();
        }
      }

      let empDesig =
        emp.EMPDESIGNATION ||
        emp.EMPLOYEEDESIGNATION ||
        emp.Employee_Designation ||
        emp.Designation ||
        emp.designation ||
        emp.DESIG ||
        emp.DESG ||
        emp.Desg ||
        emp.Desig ||
        emp.Emp_Desg ||
        emp.EMP_DESG ||
        emp.Role ||
        emp.role ||
        "";

      if (!empDesig && emp.label && emp.label.includes("(") && emp.label.includes(")")) {
        const match = emp.label.match(/\(([^)]+)\)/);
        if (match) empDesig = match[1].trim();
      }

      let empLoc =
        emp.EMPLOCATION ||
        emp.Location_Name ||
        emp.LOCATION_NAME ||
        emp.Loc_Name ||
        emp.LOC_NAME ||
        emp.Godw_Name ||
        emp.GODW_NAME ||
        emp.BRANCH ||
        emp.Branch ||
        emp.branch ||
        emp.Location ||
        emp.location ||
        user?.branch ||
        "";

      if (empLoc && !isNaN(Number(empLoc))) {
        empLoc = `Branch - ${empLoc}`;
      }

      let rawStatus = emp.LETTER_STATUS || emp.STATUS || emp.Letter_Status || emp.status || "";
      let statusVal = "null";
      if (rawStatus) {
        const s = String(rawStatus).trim().toLowerCase();
        if (s === "approve" || s === "approved" || s === "issued") {
          statusVal = "Issued";
        } else if (s === "reject" || s === "rejected" || s === "not issued" || s === "not_issued") {
          statusVal = "Not issued";
        } else if (s === "in approval" || s === "in_approval") {
          statusVal = "In approval";
        }
      }

      return {
        ...emp,
        id: String(empCode || index),
        EMPCODE: String(empCode || ""),
        EMPLOYEENAME: empName,
        NAME: empName,
        EMPNAME: empName,
        EMPLOYEEDESIGNATION: empDesig,
        DESIGNATION: empDesig,
        EMPLOCATION: empLoc,
        LETTER_STATUS: statusVal,
        GENDER: emp.GENDER || emp.Gender || "",
        JOININGDATE: emp.JOININGDATE || emp.Joining_Date || "",
        COMPANY_NAME_EMP: emp.COMPANY_NAME_EMP || company?.Comp_Name || "",
      };
    },
    [company?.Comp_Name, user?.branch]
  );

  // ── 5. Fetch All Employees using /template/AllSelectempdata ──
  const fetchEmployees = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const response = await axios.post(
        // `${process.env.NEXT_PUBLIC_URL}/template/AllSelectempdata`,
        `${process.env.NEXT_PUBLIC_URL}/employee/All`,
        {},
        { headers: { compcode: compCode, name: user?.name || "" } }
      );
      if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const mapped = response.data.data.map((emp: any, index: number) => formatEmployeeRecord(emp, index));
        setEmployeedata(mapped);
        if (mapped.length > 0) {
          setSelectedRows([mapped[0]]);
          setSelectEmployeedata([mapped[0]]);
        }
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }, [getCompCode, user?.name, formatEmployeeRecord]);

  // Initial load - runs only once when compCode is available
  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchCompLogoAndMarutiLogo();
    fetchHeaderInfo();
    fetchSignatory();
    fetchTemplates();
    fetchEmployees();
    setIsDataLoaded(true);
  }, [
    getCompCode,
    fetchCompLogoAndMarutiLogo,
    fetchHeaderInfo,
    fetchSignatory,
    fetchTemplates,
    fetchEmployees,
  ]);

  // ── 6. Fetch Single Template Content on selection ──
  const selectTemplateHandler = useCallback(
    async (tmpl: any) => {
      setSelectedTemplate(tmpl.value);
      setFormData({
        TEMPLATE_NAME: tmpl.Label,
        CONTENT: tmpl.content || "",
        KEYWORDS: tmpl.keywords || "",
      });

      const compCode = getCompCode();
      if (!compCode) return;

      try {
        const srno = selectedRows.map((r) => r.EMPCODE).join(",");
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/template/AllSelectFindTemplateContent`,
          {
            SRNO: srno,
            value: tmpl.value,
          },
          { headers: { compcode: compCode, name: user?.name || "" } }
        );
        if (response.status === 200 && response.data?.data?.Template?.[0]) {
          const tData = response.data.data.Template[0];
          setShowCompanyInfo(Number(tData?.SHOW_HEADER ?? 1) === 1);
          setFormData({
            TEMPLATE_NAME:
              tData?.Label ||
              tData?.label ||
              tData?.TEMPLATE_NAME ||
              tData?.TEMPLATENAME ||
              tmpl.Label,
            CONTENT: tData?.CONTENT || tmpl.content,
            KEYWORDS: tData?.KEYWORDS || tmpl.keywords,
          });
        }
      } catch (err) {
        // graceful fallback to local template definition
        console.warn("Using local template content fallback:", err);
      }
    },
    [getCompCode, selectedRows, user?.name]
  );

  // Sync selected rows with selectEmployeedata & fetch enriched employee data
  const handleSelectionChange = useCallback(
    async (nextSelectedRows: any[]) => {
      setSelectedRows(nextSelectedRows);
      setPreviewIndex(0);
      setChunkIndex(0); // ✅ naya employee selection aane par chunk index reset karo

      if (nextSelectedRows.length === 0) {
        setSelectEmployeedata([]);
        return;
      }

      const compCode = getCompCode();
      const empcodesArray = nextSelectedRows.map((item) => item.EMPCODE).filter(Boolean);

      if (compCode && empcodesArray.length > 0) {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/template/AllSelectempdata`,
            { empcode: empcodesArray },
            { headers: { compcode: compCode, name: user?.name || "" } }
          );
          if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
            const enriched = response.data.data.map((emp: any, idx: number) =>
              formatEmployeeRecord(emp, idx)
            );
            setSelectEmployeedata(enriched);
            return;
          }
        } catch (err) {
          console.warn("Using selected rows directly:", err);
        }
      }

      // fallback
      setSelectEmployeedata(nextSelectedRows);
    },
    [getCompCode, formatEmployeeRecord, user?.name]
  );

  // ✅ NEW: reusable HTML builder — takes any array of employees (full ya chunk dono)
  const buildLettersHtml = useCallback(
    (employeesArr: any[]) => {
      const signatureHTML = signatory?.File_Path
        ? `<img src="https://erp.autovyn.com/backend/fetch?filePath=${signatory.File_Path}" alt="signature" style="height:60px;width:auto;display:block;margin-top:4px;" />`
        : "";

      const allLetters = employeesArr.map((emp, index) => {
        let content = formData.CONTENT || "";
        const placeholderArray = (formData.KEYWORDS || "").split(",");
        const placeholdersMap: Record<string, string> = {};
        placeholderArray.forEach((placeholder) => {
          const [key, value] = placeholder.split(":");
          if (key && value) placeholdersMap[key.trim()] = value.trim();
        });

        const title =
          formData?.TEMPLATE_NAME?.toUpperCase()?.includes("MARATHI")
            ? (String(emp?.GENDER || "").toLowerCase() === "female" ? "सौ." : "श्री.")
            : (String(emp?.GENDER || "").toLowerCase() === "female" ? "Ms." : "Mr.");

        const compCodeVal = (getCompCode() || user?.Comp_Code || "AV").toUpperCase().split("-")[0];

        const specificPlaceholders: Record<string, any> = {
          ...emp,
          TITLE: title,
          NAME: emp?.EMPLOYEENAME || emp?.NAME || emp?.EMPNAME || emp?.name || "",
          EMPLOYEENAME: emp?.EMPLOYEENAME || emp?.NAME || emp?.EMPNAME || emp?.name || "",
          EMPCODE: emp?.EMPCODE || emp?.id || "",
          DESIGNATION: emp?.EMPLOYEEDESIGNATION || emp?.DESIGNATION || emp?.designation || "",
          EMPLOYEEDESIGNATION: emp?.EMPLOYEEDESIGNATION || emp?.DESIGNATION || emp?.designation || "",
          LOCATION: emp?.EMPLOCATION || "",
          EMPLOCATION: emp?.EMPLOCATION || "",
          COMPNAME: company?.Comp_Name || "Autovyn Motors Pvt. Ltd.",
          TODAYDATE: new Date().toLocaleDateString(),
          COMPCODE: compCodeVal,
          SIGN_IMAGE: signatureHTML,
        };

        Object.assign(placeholdersMap, specificPlaceholders);
        Object.keys(placeholdersMap).forEach((key) => {
          if (!key) return;
          const regex = new RegExp(`\\{${key}\\}|${key}`, "g");
          content = content.replace(regex, placeholdersMap[key] !== undefined && placeholdersMap[key] !== null ? String(placeholdersMap[key]) : "");
        });

        const headerHTML = showCompanyInfo
          ? `
          <div style="display:flex; align-items:center; margin-top:-40px;">
            <div style="flex:0 0 33.33%; display:flex; align-items:center;">
              <img src="${compLogo || "/logo.png"}" alt="company logo" style="width:80px; height:60px; object-fit:contain; display:block;" onerror="this.style.display='none'" />
            </div>
            <div style="flex:0 0 33.33%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
              <h2 style="font-weight:bold; font-size:18px; margin:0; padding:0;">${emp?.COMPANY_NAME_EMP || company?.Comp_Name || ""}</h2>
              <p style="margin:0; padding:0;">${emp?.EMPLOCATION || ""}</p>
            </div>
            <div style="flex:0 0 33.33%; display:flex; justify-content:flex-end;">
              <img src="${marutiLogo || "/maruti.png"}" alt="maruti logo" style="width:180px; height:120px; object-fit:contain; display:block;" onerror="this.style.display='none'" />
            </div>
          </div>
          <hr style="margin:0; border-color:#ddd;" />
        `
          : "";

        const isLast = index === employeesArr.length - 1;
        const pageBreakStyle = isLast ? "" : "page-break-after: always;";

        return `<div style="${pageBreakStyle} margin:0; padding:0;">${headerHTML}<div>${content}</div></div>`;
      });

      return allLetters.join("");
    },
    [formData.CONTENT, formData.KEYWORDS, formData.TEMPLATE_NAME, signatory, company, compLogo, marutiLogo, showCompanyInfo, getCompCode, user?.Comp_Code]
  );

  // ✅ generateLetter ab sirf full preview banata hai (screen pe dikhne wala)
  const generateLetter = useCallback(() => {
    const employeesArr = selectEmployeedata.length > 0 ? selectEmployeedata : selectedRows;
    const html = employeesArr.length > 0 ? buildLettersHtml(employeesArr) : "";
    setGeneratedLetter(html);
    fullLetterRef.current = html; // backup, chunk print ke baad restore karne ke liye
  }, [selectEmployeedata, selectedRows, buildLettersHtml]);

  useEffect(() => {
    generateLetter();
  }, [formData.CONTENT, formData.KEYWORDS, selectEmployeedata, selectedRows, formData.TEMPLATE_NAME, generateLetter]);

  // Active employee being previewed in the right panel
  const activeEmployee = useMemo(() => {
    const list = selectEmployeedata.length > 0 ? selectEmployeedata : selectedRows;
    if (list.length === 0) return null;
    const safeIdx = Math.min(previewIndex, list.length - 1);
    return list[safeIdx] || null;
  }, [selectEmployeedata, selectedRows, previewIndex]);

  // Rendered preview HTML for the active employee
  const activeLetterHtml = useMemo(() => {
    if (!activeEmployee) return "";
    return buildLettersHtml([activeEmployee]);
  }, [buildLettersHtml, activeEmployee]);

  // Avatar generator helper
  const getAvatar = (name: string = "A") => {
    const palettes = [
      { bg: "#EEF2FF", text: "#4338CA" },
      { bg: "#ECFDF5", text: "#059669" },
      { bg: "#FEF3C7", text: "#D97706" },
      { bg: "#FEE2E2", text: "#DC2626" },
      { bg: "#F3E8FF", text: "#7C3AED" },
      { bg: "#E0F2FE", text: "#0284C7" },
    ];
    const initial = (name || "A").trim().charAt(0).toUpperCase();
    const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const color = palettes[hash % palettes.length];
    return { initial, color };
  };

  // Table Columns Definition for ServiceTablePagination
  const employeeTableColumns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "EMPCODE",
        Cell: ({ row }: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
            {row.original.EMPCODE}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE",
        accessor: "EMPLOYEENAME",
        Cell: ({ row }: any) => {
          const { initial, color } = getAvatar(row.original.EMPLOYEENAME);
          return (
            <div className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 select-none shadow-2xs"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {initial}
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[130px]">
                {row.original.EMPLOYEENAME}
              </span>
            </div>
          );
        },
      },
      {
        Header: "DESIGNATION",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ row }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-sm truncate block max-w-[140px]">
            {row.original.EMPLOYEEDESIGNATION || "—"}
          </span>
        ),
      },
      {
        Header: "LOCATION",
        accessor: "EMPLOCATION",
        Cell: ({ row }: any) => (
          <span className="text-slate-500 dark:text-slate-400 text-sm truncate">
            {row.original.EMPLOCATION  }
          </span>
        ),
      },
      {
        Header: "LETTER STATUS",
        accessor: "LETTER_STATUS",
        Cell: ({ row }: any) => {
          const status = row.original.LETTER_STATUS || "null";
          let badgeClass =
            "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800";
          if (status === "In approval") {
            badgeClass =
              "bg-yellow-100 text-yellow-900 border border-yellow-400 dark:bg-yellow-950/70 dark:text-yellow-300 dark:border-yellow-600 font-semibold";
          } else if (status === "Issued") {
            badgeClass =
              "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 font-semibold";
          } else if (status === "Not issued") {
            badgeClass =
              "bg-red-50 text-red-700 border border-red-300 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800 font-semibold";
          }
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${badgeClass}`}
            >
              {status}
            </span>
          );
        },
      },
    ],
    []
  );

  // ── Native Iframe Print Execution ──
  const executeIframePrint = (htmlToPrint: string, printTitle: string = "Letter Printout") => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const styleTags = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((tag) => tag.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${printTitle}</title>
          ${styleTags}
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            html, body {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${htmlToPrint}
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1200);
      }, 400);
    };
  };

  // ✅ NEW: chunk helpers
  const effectiveEmployees = useMemo(() => {
    return selectEmployeedata.length > 0 ? selectEmployeedata : selectedRows;
  }, [selectEmployeedata, selectedRows]);

  const totalCount = effectiveEmployees?.length || 0;
  const totalChunks = Math.max(1, Math.ceil(totalCount / CHUNK_SIZE));

  const getChunkRange = (idx: number) => {
    const start = idx * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalCount);
    return { start, end };
  };

  const getChunkButtonLabel = () => {
    const { start, end } = getChunkRange(chunkIndex);
    if (totalCount === 0) return "Print";
    if (start === 0) return `Print ${end}`;
    return `Print ${start} to ${end}`;
  };

  const handleChunkPrint = () => {
    if (totalCount === 0) {
      Swal.fire({
        icon: "warning",
        title: "Please Select",
        text: "Please select employees first.",
      });
      return;
    }
    if (!formData.TEMPLATE_NAME && !selectedTemplate) {
      Swal.fire({
        icon: "warning",
        title: "Please Select",
        text: "Please Select Template Name.",
      });
      return;
    }

    const { start, end } = getChunkRange(chunkIndex);
    const slice = effectiveEmployees.slice(start, end);
    const html = buildLettersHtml(slice);

    isChunkPrintRef.current = true;
    setGeneratedLetter(html);

    // DOM update hone ka wait karo, phir print trigger karo
    setTimeout(() => {
      executeIframePrint(html, `${formData.TEMPLATE_NAME || "Letter"} - Print ${start + 1} to ${end}`);
      setGeneratedLetter(fullLetterRef.current);
      setChunkIndex((prev) => (prev + 1 >= totalChunks ? 0 : prev + 1));
      isChunkPrintRef.current = false;
    }, 300);
  };

  // ✅ NEW: main "Print" button ke liye Swal confirmation
  const handleMainPrintClick = () => {
    if (totalCount === 0) {
      Swal.fire({
        icon: "warning",
        title: "Please Select",
        text: "Please select employees first.",
      });
      return;
    }
    if (!formData.TEMPLATE_NAME && !selectedTemplate) {
      Swal.fire({
        icon: "warning",
        title: "Please Select",
        text: "Please Select Template Name.",
      });
      return;
    }
    const { end } = getChunkRange(chunkIndex);

    Swal.fire({
      icon: "info",
      title: "Print Confirmation",
      html: `You have a total of <b>${totalCount}</b> employee templates.<br/>
         Printing may take some time, so please wait for <b>4-5 minutes</b>.<br/>
         The first <b>${end}</b> employee templates will be printed initially.`,
      showCancelButton: true,
      confirmButtonText: "OK, Print",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        handleChunkPrint();
      }
      // Do nothing on Cancel
    });
  };

  const handleSendWhatsapp = async () => {
    try {
      if (!formData.TEMPLATE_NAME && !selectedTemplate) {
        Swal.fire({
          icon: "warning",
          title: "Please Select",
          text: "Please Select Template Name.",
        });
        return;
      }

      if (totalCount === 0) {
        Swal.fire({
          icon: "warning",
          title: "Please Select",
          text: "Please Select Employee.",
        });
        return;
      }

      setIsLoading(true);

      const compCode = getCompCode();
      const results: { empCode: string; status: boolean; message: string }[] = [];

      // ✅ Har employee ke liye alag PDF generate karo
      for (const currentEmployee of effectiveEmployees) {
        const empCode = currentEmployee?.EMPCODE || currentEmployee?.id;
        if (!empCode) {
          results.push({
            empCode: "Unknown",
            status: false,
            message: "Employee data not found",
          });
          continue;
        }

        try {
          // ✅ 2. Generate PDF for THIS employee only
          const element = componentRef.current;
          if (!element) {
            throw new Error("PDF content not found");
          }

          // ✅ Show element temporarily
          element.classList.remove("hidden");
          element.style.visibility = "visible";

          // ✅ Generate HTML for single employee
          const singleEmployeeHtml = buildLettersHtml([currentEmployee]);

          // ✅ Update DOM with single employee's letter
          const generatedLetterDiv = document.getElementById("generatedLetter");
          if (generatedLetterDiv) {
            generatedLetterDiv.innerHTML = singleEmployeeHtml;
          }

          const html2pdf = (await import("html2pdf.js" as any)).default;

          const opt = {
            margin: 10,
            filename: `Letter_${empCode}.pdf`,
            image: { type: "jpeg", quality: 1 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          };

          const pdfBlob = await html2pdf()
            .set(opt)
            .from(element)
            .outputPdf("blob");

          // ✅ Hide again
          element.classList.add("hidden");
          element.style.visibility = "hidden";

          if (!pdfBlob || pdfBlob.size === 0) {
            throw new Error("PDF generation failed");
          }

          // ✅ 3. Upload PDF
          const formDataUpload = new FormData();
          formDataUpload.append("pdfFile", pdfBlob, `letter_${empCode}.pdf`);

          const uploadRes = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/quotation/uploadeddocument`,
            formDataUpload,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                compcode: compCode,
                name: user?.name,
              },
            }
          );

          const uploadedPdfPath = uploadRes?.data?.pdfPath;

          if (!uploadedPdfPath) {
            throw new Error("Upload failed");
          }

            // ✅ Send template ID (TEMPLATE_NO) as expected by backend
            const templateIdToSend = selectedTemplate || formData?.TEMPLATE_NAME;

            const response = await axios.post(
              `${process.env.NEXT_PUBLIC_URL}/template/confirmationMSZ`,
              {
                SRNO: empCode, // ✅ SINGLE employee, NOT comma-separated
                TEMPLATE_NAME: templateIdToSend,
                CONTENT: singleEmployeeHtml,
                pdf: uploadedPdfPath,
                PDF_PATH: uploadedPdfPath,
                LOC_CODE: user?.branch,
                Created_By: user?.EMPCODE || user?.name,
              },
            {
              headers: {
                compcode: compCode,
                name: user?.name,
              },
            }
          );

          results.push({
            empCode: empCode,
            status: true,
            message: response?.data?.message || "Success",
          });
        } catch (error: any) {
          console.error(`Error for employee ${empCode}:`, error);
          results.push({
            empCode: empCode,
            status: false,
            message: error?.response?.data?.message || error.message || "Failed",
          });
        }
      }

      // ✅ 5. Restore full letter preview
      const fullHtml = buildLettersHtml(effectiveEmployees);
      const generatedLetterDiv = document.getElementById("generatedLetter");
      if (generatedLetterDiv) {
        generatedLetterDiv.innerHTML = fullHtml;
      }

      // ✅ Update status to "In approval" for successfully processed employees
      const successfulEmpCodes = new Set(
        results.filter((r) => r.status === true).map((r) => String(r.empCode))
      );

      if (successfulEmpCodes.size > 0) {
        setEmployeedata((prev) =>
          prev.map((emp) =>
            successfulEmpCodes.has(String(emp.EMPCODE || emp.id))
              ? { ...emp, LETTER_STATUS: "In approval", STATUS: "In approval" }
              : emp
          )
        );
        setSelectedRows((prev) =>
          prev.map((emp) =>
            successfulEmpCodes.has(String(emp.EMPCODE || emp.id))
              ? { ...emp, LETTER_STATUS: "In approval", STATUS: "In approval" }
              : emp
          )
        );
        setSelectEmployeedata((prev) =>
          prev.map((emp) =>
            successfulEmpCodes.has(String(emp.EMPCODE || emp.id))
              ? { ...emp, LETTER_STATUS: "In approval", STATUS: "In approval" }
              : emp
          )
        );
      }

      // ✅ 6. Show final result
      const allSuccess = results.length > 0 && results.every((r) => r.status === true);
      const anySuccess = results.some((r) => r.status === true);

      if (allSuccess) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: `All ${results.length} letters sent successfully!`,
        });
      } else if (anySuccess) {
        const failed = results.filter((r) => !r.status);
        Swal.fire({
          icon: "warning",
          title: "Partial Success",
          html: `
            ${results.filter((r) => r.status).length} employees processed successfully.<br/>
            ${failed.length} employees failed:<br/>
            ${failed.map((f) => `• ${f.empCode}: ${f.message}`).join("<br/>")}
          `,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "All employees failed. Check console for details.",
        });
      }
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear selection handler
  const handleClearSelection = () => {
    setSelectedRows([]);
    setSelectEmployeedata([]);
    setPreviewIndex(0);
  };

  // Pager handlers for preview
  const effectiveList = selectEmployeedata.length > 0 ? selectEmployeedata : selectedRows;
  const canPrev = previewIndex > 0;
  const canNext = previewIndex < effectiveList.length - 1;

  // Selected delivery summary text
  const deliverySummary = [
    deliveryWhatsApp && "whatsapp",
    deliveryEmail && "email",
    deliveryHardCopy && "hard copy",
  ]
    .filter(Boolean)
    .join(", ");

  const activeTemplateObj = templates.find((t) => t.value === selectedTemplate) || templates[0] || null;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#070D18] flex flex-col justify-between text-slate-800 dark:text-slate-100 pb-24">
      {/* ── TOP HEADER ──────────────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Issue a letter
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-0.5">
              Pick a template, tick the employees, check the merged copy, then print or push it over
              WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <AButton
              variant="outline"
              size="sm"
              icon={<Users className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
              onClick={() => router.push("/payroll/masters/salary-approver-grid")}
            >
              Approver grid
            </AButton>

            <AButton
              variant="outline"
              size="sm"
              icon={<FileEdit className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
              onClick={() => router.push("/payroll/onboarding/letter-template-creator")}
            >
              Edit templates
            </AButton>

            {/* Quick button for candidate biodata printout modal */}
            <AButton
              variant="ghost"
              size="sm"
              icon={<FileDown className="w-4 h-4 text-[#4338CA]" />}
              onClick={() => setShowBiodataModal(true)}
              className="text-[#4338CA] hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              Biodata Printout
            </AButton>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ───────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 grid grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN (Templates, Employees, Delivery) ───────────── */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-7 flex flex-col gap-4">
          {/* 1. Template Card Section */}
          <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Template</h2>
              </div>
              <span className="text-base text-slate-400 font-medium">
                {activeTemplateObj?.tokens || 6} merge tokens
              </span>
            </div>

            {/* Template Selection Cards Grid (6 items visible, scroll for rest) */}
            <div className="max-h-[148px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.value;
                  const IconComponent = tmpl.icon || FileText;

                  return (
                    <div
                      key={tmpl.id || tmpl.value}
                      onClick={() => selectTemplateHandler(tmpl)}
                      className={`relative rounded-xl border p-3 flex items-center gap-3 cursor-pointer select-none transition-all duration-150 ${isSelected
                          ? "border-[#4F46E5] bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-[#4F46E5]/40 shadow-xs"
                          : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-2xs"
                        }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tmpl.iconBg || "bg-indigo-50 text-indigo-600"
                          } ${isSelected ? "ring-2 ring-[#4F46E5]/30" : ""}`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className={`text-base font-bold truncate ${isSelected
                              ? "text-[#4F46E5] dark:text-indigo-400"
                              : "text-slate-800 dark:text-slate-200"
                            }`}
                        >
                          {tmpl.Label}
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          {tmpl.tokens} tokens · {tmpl.pages} page
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#4F46E5] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Employees Table Section using ServiceTablePagination */}
          <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <ServiceTablePagination
              title={`Employees ${selectedRows.length} of ${employeedata.length} selected`}
              columns={employeeTableColumns}
              data={employeedata}
              check={true}
              selectValue="EMPCODE"
              selectedRows={selectedRows}
              setSelectedRows={handleSelectionChange}
              height={260}
              showTopSearch={true}
              searchPlaceholder="Code, name, designation..."
              showExcelExport={false}
              containerClassName="rounded-none border-0 shadow-none"
            />
          </div>

          {/* 3. Delivery & "Before You Send" Section (Screenshot 2) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            {/* Delivery Toggles Box */}
            <div className="md:col-span-7 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Delivery</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* WhatsApp Toggle */}
                  <div
                    onClick={() => setDeliveryWhatsApp((prev) => !prev)}
                    className={`h-9 px-3.5 rounded-xl border flex items-center gap-2 text-base font-semibold cursor-pointer select-none transition-all ${deliveryWhatsApp
                        ? "border-[#4F46E5] bg-indigo-50/60 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 shadow-2xs ring-1 ring-[#4F46E5]/30"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1220] text-slate-600 dark:text-slate-300 hover:border-slate-300"
                      }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center ${deliveryWhatsApp ? "bg-[#4F46E5] text-white" : "border border-slate-300"
                        }`}
                    >
                      {deliveryWhatsApp && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span>WhatsApp</span>
                  </div>

                  {/* Email Toggle */}
                  <div
                    onClick={() => setDeliveryEmail((prev) => !prev)}
                    className={`h-9 px-3.5 rounded-xl border flex items-center gap-2 text-base font-semibold cursor-pointer select-none transition-all ${deliveryEmail
                        ? "border-[#4F46E5] bg-indigo-50/60 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 shadow-2xs ring-1 ring-[#4F46E5]/30"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1220] text-slate-600 dark:text-slate-300 hover:border-slate-300"
                      }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email</span>
                  </div>

                  {/* Hard copy Toggle */}
                  <div
                    onClick={() => setDeliveryHardCopy((prev) => !prev)}
                    className={`h-9 px-3.5 rounded-xl border flex items-center gap-2 text-base font-semibold cursor-pointer select-none transition-all ${deliveryHardCopy
                        ? "border-[#4F46E5] bg-indigo-50/60 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 shadow-2xs ring-1 ring-[#4F46E5]/30"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1220] text-slate-600 dark:text-slate-300 hover:border-slate-300"
                      }`}
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hard copy</span>
                  </div>
                </div>
              </div>

              {/* Route for approval first Toggle */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div
                  onClick={() => setRouteForApproval((prev) => !prev)}
                  className={`h-9 px-3.5 rounded-xl border flex items-center gap-2 text-base font-semibold cursor-pointer select-none transition-all w-fit ${routeForApproval
                      ? "border-[#4F46E5] bg-indigo-50/60 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 shadow-2xs ring-1 ring-[#4F46E5]/30"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1220] text-slate-600 dark:text-slate-300 hover:border-slate-300"
                    }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#4F46E5] dark:text-indigo-400" />
                  <span>Route for approval first</span>
                </div>
              </div>
            </div>

            {/* Before you send Box (Screenshot 2) */}
            <div className="md:col-span-5 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                  BEFORE YOU SEND
                </span>

                <div className="space-y-2 text-base text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>
                      {selectedRows.length} employee{selectedRows.length === 1 ? "" : "s"} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>
                      Sending via {deliveryWhatsApp ? "whatsapp" : deliveryEmail ? "email" : "hard copy"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>
                      {routeForApproval
                        ? "Will go to the approver grid before delivery"
                        : "Direct dispatch without approver"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Template StatCard from card.tsx for token summary */}
              <div className="mt-3 pt-2">
                <StatCard
                  title="Merge Tokens"
                  count={activeTemplateObj?.tokens || 0}
                  variant="indigo"
                  className="!h-[64px] !min-h-[64px] !p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40"
                  titleClassName="text-[10px]"
                  countClassName="text-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Merged Preview Panel) ────────────────────── */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-5 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex flex-col min-h-[680px]">
          {/* Preview Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] flex items-center justify-center">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                Merged preview
              </h2>
            </div>

            <AButton
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3 h-3 text-slate-500" />}
              onClick={() => {
                if (activeTemplateObj) selectTemplateHandler(activeTemplateObj);
              }}
              className="h-8 text-base px-2.5"
            >
              Refresh
            </AButton>
          </div>

          {/* Subheader: Active employee indicator & pager */}
          <div className="flex items-center justify-between py-2 px-1 text-base text-slate-500 dark:text-slate-400">
            {activeEmployee ? (
              <span className="font-medium truncate max-w-[280px]">
                {activeEmployee?.EMPLOYEENAME || "Employee"} · {activeEmployee?.EMPCODE || "—"} ·{" "}
                {activeEmployee?.EMPLOYEEDESIGNATION || "Staff"}
              </span>
            ) : (
              <span className="font-medium text-slate-400">No employee selected</span>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <AButton
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0 rounded-lg"
                disabled={!canPrev}
                onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft className="w-3 h-3 text-slate-600" />
              </AButton>
              <span className="text-[11px] font-bold text-slate-400 px-1">
                {effectiveList.length > 0 ? previewIndex + 1 : 1}/{effectiveList.length || 1}
              </span>
              <AButton
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0 rounded-lg"
                disabled={!canNext}
                onClick={() => setPreviewIndex((prev) => Math.min(effectiveList.length - 1, prev + 1))}
              >
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </AButton>
            </div>
          </div>

          {/* The Paper Preview Document */}
          <div className="mt-2 flex-1 bg-white border border-slate-200/90 rounded-xl p-6 sm:p-7 shadow-xs text-slate-900 overflow-y-auto max-h-[620px]">
            {/* Document Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {compLogo ? (
                  <img
                    src={compLogo}
                    alt="Company Logo"
                    className="h-10 w-auto object-contain"
                    onError={(e: any) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[#4338CA] text-white font-bold flex items-center justify-center text-base shadow-2xs">
                    {(company?.Comp_Name || "C").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-[15px] leading-tight text-slate-900">
                    {company?.Comp_Name || ""}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {activeEmployee?.EMPLOCATION || company?.Right_Head1 || ""}
                  </p>
                </div>
              </div>

              <div>
                <img
                  src={marutiLogo || "/maruti.png"}
                  alt="Maruti Suzuki"
                  className="h-9 w-auto object-contain"
                  onError={(e: any) => (e.target.style.display = "none")}
                />
              </div>
            </div>

            {/* Document Meta Row */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-4">
              <span>Ref: {getCompCode() || "AV"}/HR/{activeEmployee?.EMPCODE || "—"}/{new Date().getFullYear()}</span>
              <span>
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Document Title */}
            <h2 className="text-center font-bold text-lg tracking-wide text-slate-900 uppercase my-5">
              {formData.TEMPLATE_NAME || "LETTER"}
            </h2>

            {/* Document Body */}
            {activeEmployee && formData.CONTENT ? (
              <div
                className="text-[12.5px] leading-relaxed text-slate-800 font-sans whitespace-pre-wrap select-text"
                dangerouslySetInnerHTML={{ __html: activeLetterHtml }}
              />
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm">
                <FileText className="w-8 h-8 mb-2 opacity-40" />
                <span>No letter content or employee selected</span>
              </div>
            )}

            {/* Signatory Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col items-start">
              {signatory?.File_Path ? (
                <img
                  src={`https://erp.autovyn.com/backend/fetch?filePath=${signatory.File_Path}`}
                  alt="signature"
                  className="h-10 w-auto object-contain mb-1"
                />
              ) : (
                <div className="w-28 border-t border-dashed border-slate-300 mb-2 mt-4" />
              )}
              <span className="text-[11px] font-semibold text-slate-700">Authorized Signatory</span>
              <span className="text-[10px] text-slate-400">
                {company?.Comp_Name || ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ─────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 py-3 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-[left] duration-150 ease-in-out">
        <div className="text-xl font-medium text-slate-600 dark:text-slate-300 truncate max-w-xl">
          <span className="font-semibold text-slate-900 dark:text-white">
            {formData.TEMPLATE_NAME || "Untitled Template"}
          </span>{" "}
          · {selectedRows.length} selected · {deliverySummary || "whatsapp"}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <AButton
            variant="outline"
            size="md"
            onClick={handleClearSelection}
            disabled={selectedRows.length === 0}
            className="!rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <span>Clear selection</span>
          </AButton>

          {/* ✅ Dynamic chunk button as in reference */}
          <AButton
            variant="outline"
            size="md"
            onClick={handleChunkPrint}
            className="!rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold"
          >
            <span>{getChunkButtonLabel()}</span>
          </AButton>

          <AButton
            variant="outline"
            size="md"
            icon={<Printer className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
            onClick={handleMainPrintClick}
            className="!rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <span>Print</span>
          </AButton>

          <AButton
            variant="primary"
            size="md"
            className="!rounded-xl !bg-[#4338CA] hover:!bg-[#3730a3] text-white px-5 shadow-xs"
            icon={<Send className="w-4 h-4 text-white" />}
            loading={isLoading}
            onClick={handleSendWhatsapp}
          >
            <span>Send Document</span>
          </AButton>
        </div>
      </div>

      {/* ✅ Hidden container for single PDF generation & chunk printing */}
      <div
        ref={componentRef}
        id="generatedLetter"
        className="hidden"
        style={{
          visibility: "hidden",
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "800px",
          backgroundColor: "#ffffff",
          color: "#000000",
          padding: "20px",
          fontSize: "14px",
          lineHeight: "1.5",
          fontFamily: "sans-serif",
          whiteSpace: "pre-wrap",
        }}
        dangerouslySetInnerHTML={{ __html: generatedLetter }}
      />

      {/* ── MODAL: English Candidate Biodata Printout (Incorporating EnglishPrintout) ── */}
      {showBiodataModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4338CA]" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Candidate Biodata Printout — {activeEmployee?.EMPLOYEENAME || "Employee"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <AButton
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => {
                    if (englishPrintoutRef.current) {
                      executeIframePrint(
                        englishPrintoutRef.current.innerHTML,
                        `${activeEmployee?.EMPLOYEENAME} - Candidate Printout`
                      );
                    }
                  }}
                >
                  Print Profile
                </AButton>
                <AButton
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => setShowBiodataModal(false)}
                >
                  <X className="w-4 h-4" />
                </AButton>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-900/40">
              <div className="bg-white rounded-xl shadow-xs p-4">
                <EnglishPrintout
                  ref={englishPrintoutRef}
                  formData1={{
                    TRAN_ID: activeEmployee?.EMPCODE || "AU19795989",
                    NAME: activeEmployee?.EMPLOYEENAME || "Aditya",
                    DESIGNATION: activeEmployee?.EMPLOYEEDESIGNATION || "IT Executive",
                    APPLICATION_DATE1: new Date().toLocaleDateString(),
                    GENDER: activeEmployee?.GENDER || "Male",
                    CITY1: "Jaipur",
                    ADDRESS: activeEmployee?.EMPLOCATION || "Branch - 1",
                    EmpExperience: [],
                    EmpNominee: [],
                    EmpLang: [],
                    EmpEdu: [],
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for EnglishPrintout reference */}
      <div className="hidden">
        <EnglishPrintout
          formData1={{
            NAME: activeEmployee?.EMPLOYEENAME || "Aditya",
            DESIGNATION: activeEmployee?.EMPLOYEEDESIGNATION || "IT Executive",
          }}
        />
      </div>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
