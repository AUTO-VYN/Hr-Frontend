"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import Image from "next/image";
import {
  Printer,
  Save,
  RefreshCw,
  ArrowLeft,
  User,
  Hash,
  Calendar,
  CalendarDays,
  Hourglass,
  Briefcase,
  Building2,
  IndianRupee,
  PenTool,
  FileText,
  Eye,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import ATextArea from "@/components/atoms/textArea";
import CustomRichEditor from "@/components/Templates/CustomRichEditor";

export default function LetterCreatorPage() {
  const user = useCurrentUser();
  const componentRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    TEMPLATE_NAME: "",
    CONTENT: "",
    KEYWORDS: "",
    SHOW_HEADER: 1,
  });

  const [fetchdata, setFetchdata] = useState({
    TEMPLATENAME: "",
    SRNO: "",
  });

  const [existingTemplateName, setExistingTemplateName] = useState<any[]>([]);
  const [employeedata, setEmployeedata] = useState<any[]>([]);
  const [SelectEmployeedata, setSelectEmployeedata] = useState<any>({});
  const [company, setCompany] = useState<any>({});
  const [signatory, setSignatory] = useState<any>({});
  const [compLogo, setCompLogo] = useState<string | null>(null);
  const [MarutiLogo, setMarutiLogo] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [generatedLetter, setGeneratedLetter] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const headerFooterOptions = [
    { label: "Header & Footer : Yes", value: "1" },
    { label: "Header & Footer : No", value: "0" },
  ];

  // Robust company code getter directly from user session (strictly no localStorage)
  const getCompCode = useCallback(() => {
    return (
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.COMP_CODE ||
      (user as any)?.company_code ||
      (user as any)?.DB ||
      ""
    );
  }, [user]);

  // ── 1. Fetch Signatory ──
  const getSignatory = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/getSignatory`,
        { compcode: compCode },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (response.data?.data && response.data.data.length > 0) {
        setSignatory(response.data.data[0]);
      }
    } catch (error) {
      console.error("Error fetching signatory:", error);
    }
  }, [getCompCode, user?.name]);

  // ── 2. Fetch Comp Logo & Maruti Logo ──
  const fetchCompLogoAndMarutiLogo = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/quotation/getMarutiLogoAndCompLogo`,
        {
          multi_loc: user?.branch || "",
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      setCompLogo(result.data?.complogo || null);
      setMarutiLogo(result.data?.MarutilogoImg || null);
    } catch (error) {
      console.error("Error fetching logos:", error);
    }
  }, [getCompCode, user?.branch, user?.name]);

  // ── 3. Fetch Company Header Info ──
  const printapi = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/PrintHeader`,
        {
          multi_loc: user?.branch || "",
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (result.data?.company && result.data.company.length > 0) {
        setCompany(result.data.company[0]);
      }
    } catch (error) {
      console.error("Error fetching print header:", error);
    }
  }, [getCompCode, user?.branch, user?.name]);

  // ── 4. Fetch Single Employee Details ──
  const empdataapi = useCallback(
    async (codeToFetch?: string) => {
      const compCode = getCompCode();
      if (!compCode) return;
      try {
        const targetCode = codeToFetch !== undefined ? codeToFetch : (fetchdata.SRNO || "0003");
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/template/empdata`,
          { empcode: targetCode, compcode: compCode },
          {
            headers: {
              compcode: compCode,
              name: user?.name || "",
            },
          }
        );
        if (response.data?.data && response.data.data.length > 0) {
          const emp = response.data.data[0];
          setSelectEmployeedata(emp);
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }
    },
    [getCompCode, fetchdata.SRNO, user?.name]
  );

  // ── 5. Fetch All Employees ──
  const fetchemployeedata = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/admin/All`,
        { compcode: compCode },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (response.data?.data) {
        setEmployeedata(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  }, [getCompCode, user?.name]);

  // ── 6. Fetch Existing Template Names ──
  const fetchExistingTemplateName = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/FindTemplate`,
        { compcode: compCode },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (response.status === 200 && response.data?.data?.Template) {
        setExistingTemplateName(response.data.data.Template);
      }
    } catch (error) {
      console.error("Error fetching existing templates:", error);
    }
  }, [getCompCode, user?.name]);

  // ── 7. Fetch Template Content on Selection ──
  const fetchTemplateContent = useCallback(async () => {
    const compCode = getCompCode();
    if (!compCode) return;
    if (fetchdata.TEMPLATENAME === "" && fetchdata.SRNO === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Select",
        text: "Please Select Empdata Name and Template.",
      });
      return;
    }
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/FindTemplateContent`,
        {
          SRNO: fetchdata.SRNO,
          value: fetchdata.TEMPLATENAME,
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (response.status === 200 && response.data?.data?.Template?.[0]) {
        const templateData = response.data.data.Template[0];
        const savedHeader = templateData?.SHOW_HEADER ?? 1;
        setShowHeader(Number(savedHeader) === 1);

        setFormData((prev) => ({
          ...prev,
          TEMPLATE_NAME: templateData?.Label || templateData?.TEMPLATE_NAME || prev.TEMPLATE_NAME,
          CONTENT: templateData.CONTENT || "",
          KEYWORDS: templateData.KEYWORDS || prev.KEYWORDS,
          SHOW_HEADER: Number(savedHeader),
        }));
      }
    } catch (error) {
      console.error("Error fetching template content:", error);
    }
  }, [getCompCode, fetchdata.TEMPLATENAME, fetchdata.SRNO, user?.name]);

  // Inject print page styles
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        @page {
          margin-top: 60px;
          margin-bottom: 60px;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Initial load runs only when user and compcode are available
  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode) return;

    getSignatory();
    fetchCompLogoAndMarutiLogo();
    printapi();
    fetchemployeedata();
    fetchExistingTemplateName();
    empdataapi();
  }, [user, getCompCode, getSignatory, fetchCompLogoAndMarutiLogo, printapi, fetchemployeedata, fetchExistingTemplateName, empdataapi]);

  useEffect(() => {
    empdataapi();
  }, [fetchdata.SRNO, empdataapi]);

  useEffect(() => {
    if (fetchdata?.TEMPLATENAME) {
      fetchTemplateContent();
    }
  }, [fetchdata.TEMPLATENAME, fetchdata.SRNO, fetchTemplateContent]);

  // ── 8. Generate Letter Logic (exact matching reference) ──
  const generateLetter = useCallback(() => {
    let content = formData.CONTENT || "";
    const placeholderArray = (formData.KEYWORDS || "").split(",");
    const placeholdersMap: Record<string, string> = {};

    placeholderArray.forEach((placeholder) => {
      const [key, value] = placeholder.split(":");
      if (key && value) {
        placeholdersMap[key.trim()] = value.trim();
      }
    });

    const formatDateDDMMYYYY = (dateValue: any) => {
      if (!dateValue) return "";
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const title =
      formData?.TEMPLATE_NAME?.toUpperCase()?.includes("MARATHI")
        ? (SelectEmployeedata?.GENDER?.toLowerCase() === "female" ? "सौ." : "श्री.")
        : (SelectEmployeedata?.GENDER?.toLowerCase() === "female" ? "Ms." : "Mr.");

    const signatureHTML = signatory?.File_Path
      ? `
        <img
          src="https://erp.autovyn.com/backend/fetch?filePath=${signatory.File_Path}"
          alt="signature"
          style="
            height:60px;
            width:auto;
            display:block;
            margin-top:4px;
          "
        />
      `
      : "";

    const compCode = getCompCode();
    const specificPlaceholders: Record<string, any> = {
      ...SelectEmployeedata,
      TITLE: title,
      NAME: SelectEmployeedata?.NAME || SelectEmployeedata?.EMPNAME || "",
      EMPNAME: SelectEmployeedata?.EMPNAME || SelectEmployeedata?.NAME || "",
      DESIGNATION: SelectEmployeedata?.DESIGNATION || SelectEmployeedata?.designation || "",
      CTC: SelectEmployeedata?.CURRENT_CTC
        ? `₹ ${Number(SelectEmployeedata.CURRENT_CTC).toLocaleString("en-IN")}`
        : SelectEmployeedata?.CTC || "",
      CURRENT_CTC: SelectEmployeedata?.CURRENT_CTC
        ? `₹ ${Number(SelectEmployeedata.CURRENT_CTC).toLocaleString("en-IN")}`
        : SelectEmployeedata?.CTC || "",
      PROBATION_PERIOD: SelectEmployeedata?.PROBATION_PERIOD || "6 Months",
      EMPJOINDATE: formatDateDDMMYYYY(SelectEmployeedata?.EMPJOINDATE),
      COMPNAME: company?.Comp_Name,
      TODAYDATE: formatDateDDMMYYYY(new Date()),
      COMPCODE: SelectEmployeedata?.EMPCODE || (compCode || user?.Comp_Code ? String(compCode || user?.Comp_Code).toUpperCase().split("-")[0] : ""),
      SIGN_IMAGE: signatureHTML,
    };

    const keysString = Object.keys(specificPlaceholders).join(", ");
    setFormData((prevData) => {
      if (prevData.KEYWORDS === keysString) return prevData;
      return {
        ...prevData,
        KEYWORDS: keysString,
      };
    });

    Object.assign(placeholdersMap, specificPlaceholders);

    Object.keys(placeholdersMap).forEach((key) => {
      if (!key) return;
      const regexWithBraces = new RegExp(`\\{${key}\\}`, "gi");
      content = content?.replace(
        regexWithBraces,
        placeholdersMap[key] !== undefined && placeholdersMap[key] !== null ? placeholdersMap[key] : ""
      );
      const regex = new RegExp(`\\b${key}\\b`, "gi");
      content = content?.replace(
        regex,
        placeholdersMap[key] !== undefined && placeholdersMap[key] !== null ? placeholdersMap[key] : ""
      );
    });

    setGeneratedLetter(content || "");
  }, [formData.CONTENT, formData.KEYWORDS, SelectEmployeedata, formData.TEMPLATE_NAME, company, signatory, getCompCode, user?.Comp_Code]);

  useEffect(() => {
    generateLetter();
  }, [formData.CONTENT, formData.KEYWORDS, SelectEmployeedata, formData.TEMPLATE_NAME, generateLetter]);

  // ── Handlers ──
  const handleContentChange = (value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      CONTENT: value,
    }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setFetchdata((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (name === "SRNO" && value) {
      empdataapi(value);
    }
  };

  const handleInsertToken = (tokenKey: string) => {
    const tokenTag = `{${tokenKey}}`;
    setFormData((prev) => {
      const current = prev.CONTENT || "";
      return {
        ...prev,
        CONTENT: current ? `${current} ${tokenTag}` : tokenTag,
      };
    });
  };

  const refresh = () => {
    setFormData({
      TEMPLATE_NAME: " ",
      CONTENT: "",
      KEYWORDS: " ",
      SHOW_HEADER: 1,
    });
    setFetchdata({
      TEMPLATENAME: "",
      SRNO: "",
    });
    setShowHeader(true);
  };

  // ── Save Template ──
  const save = async () => {
    const compCode = getCompCode();
    if (!compCode) {
      Swal.fire({
        icon: "warning",
        title: "Missing Company Code",
        text: "Company code is loading, please try again in a moment.",
      });
      return;
    }
    setIsSaving(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/insertData`,
        {
          Created_by: user?.name,
          Template: {
            ...formData,
            compcode: compCode,
          },
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Template saved successfully.",
        });
        fetchExistingTemplateName();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Failed to save template.",
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Please fill the inputs.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update Template ──
  const update = async () => {
    const compCode = getCompCode();
    if (!compCode) {
      Swal.fire({
        icon: "warning",
        title: "Missing Company Code",
        text: "Company code is loading, please try again in a moment.",
      });
      return;
    }
    setIsUpdating(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/updateData`,
        {
          TemplateId: fetchdata.TEMPLATENAME,
          Created_by: user?.name,
          Template: {
            ...formData,
            compcode: compCode,
          },
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Template updated successfully.",
        });
        fetchExistingTemplateName();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Failed to update template.",
        });
      }
    } catch (error) {
      console.error("Error updating template:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "An error occurred while updating the template.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Print Functionality ──
  const handlePrint = () => {
    if (!componentRef.current) return;
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formData.TEMPLATE_NAME || "Appointment Letter"}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #0f172a;
              line-height: 1.8;
              font-size: 14px;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            img { max-width: 100%; }
            .grid { display: flex; justify-content: space-between; align-items: center; }
            hr { border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0; }
          </style>
        </head>
        <body>
          ${componentRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // ── Format Options ──
  const employeeOptions = useMemo(() => {
    if (!Array.isArray(employeedata)) return [];
    return employeedata.map((emp: any) => {
      const val =
        emp?.value ??
        emp?.EMPCODE ??
        emp?.empcode ??
        emp?.SRNO ??
        emp?.srno ??
        emp?.id ??
        "";
      const composedLabel = [
        emp?.EMPCODE ?? emp?.empcode,
        emp?.EMPNAME ?? emp?.empname ?? emp?.name,
        emp?.DESIGNATION ?? emp?.designation,
      ]
        .filter(Boolean)
        .join(" · ");
      const lbl = emp?.label || composedLabel || String(val);
      return {
        ...emp,
        value: String(val),
        label: String(lbl),
      };
    });
  }, [employeedata]);

  const templateOptions = useMemo(() => {
    if (!Array.isArray(existingTemplateName)) return [];
    return existingTemplateName.map((t: any) => ({
      value: String(t.value ?? t.id ?? t.TEMPLATE_ID ?? t.Label),
      label: String(t.label ?? t.Label ?? t.TEMPLATE_NAME ?? t.value),
    }));
  }, [existingTemplateName]);

  // ── Available Merge Tokens ──
  const availableTokens = [
    { key: "TITLE", label: "TITLE", icon: User },
    { key: "NAME", label: "NAME", icon: User },
    { key: "COMPCODE", label: "COMPCODE", icon: Hash },
    { key: "EMPJOINDATE", label: "EMPJOINDATE", icon: Calendar },
    { key: "PROBATION_PERIOD", label: "PROBATION_PERIOD", icon: Hourglass },
    { key: "DESIGNATION", label: "DESIGNATION", icon: Briefcase },
    { key: "COMPNAME", label: "COMPNAME", icon: Building2 },
    { key: "TODAYDATE", label: "TODAYDATE", icon: CalendarDays },
    { key: "CTC", label: "CTC", icon: IndianRupee },
    { key: "SIGN_IMAGE", label: "SIGN_IMAGE", icon: PenTool },
  ];

  const usedTokensCount = useMemo(() => {
    const content = formData.CONTENT || "";
    return availableTokens.filter((t) =>
      content.includes(`{${t.key}}`) || new RegExp(`\\b${t.key}\\b`, "i").test(content)
    ).length;
  }, [formData.CONTENT]);

  const wordCount = useMemo(() => {
    if (!formData.CONTENT) return 0;
    return formData.CONTENT.replace(/<[^>]*>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, [formData.CONTENT]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 350));
  }, [wordCount]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-4 sm:p-6 space-y-4 max-w-[1780px] mx-auto font-sans transition-colors pb-24">

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & MAIN ACTION BUTTONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Letter template creator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Write once with merge tokens; every employee gets their own copy. The preview on the right uses a sample record.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <AButton
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="h-4 w-4" />}
            className="!rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs"
          >
            <span>Print letter</span>
          </AButton>

          <AButton
            variant="primary"
            size="sm"
            disabled={Boolean(fetchdata.TEMPLATENAME)}
            onClick={save}
            loading={isSaving}
            icon={<Save className="h-4 w-4" />}
            className="!rounded-xl !bg-[#4338CA] hover:!bg-[#3730a3] text-white shadow-xs disabled:opacity-50"
          >
            <span>Save template</span>
          </AButton>

          <AButton
            variant="secondary"
            size="sm"
            disabled={!fetchdata.TEMPLATENAME}
            onClick={update}
            loading={isUpdating}
            className="!rounded-xl shadow-xs disabled:opacity-50"
          >
            <span>Update</span>
          </AButton>

          <AButton
            variant="ghost"
            size="sm"
            onClick={() => history.back()}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="!rounded-xl"
          >
            <span>Back</span>
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN 2-COLUMN SPLIT: FORM (LEFT) vs GENERATED LETTER PREVIEW (RIGHT) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: SETUP, TOKENS, RICH EDITOR */}
        <div className="lg:col-span-6 space-y-4">
          {/* Card 1: Template setup */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Template setup
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Field 1: template name */}
              <div className="sm:col-span-2">
                <Eselect
                  title="EMPLOYEE DATA"
                  name="SRNO"
                  option={employeeOptions}
                  initialValue={fetchdata.SRNO}
                  handleInputChange={handleSelectChange}
                  placeholder="Select employee data..."
                  ShortName
                />
              </div>

              <div>
                <Einput
                  title="TEMPLATE NAME *"
                  type="text"
                  name="TEMPLATE_NAME"
                  value={formData.TEMPLATE_NAME}
                  handleInputChange={handleSelectChange}
                  placeholder="e.g. Appointment letter — Sales"
                  required
                  ShortName
                />
              </div>

              {/* Field 2: LOAD TEMPLATE */}
              <div>
                <Eselect
                  title="LOAD TEMPLATE"
                  name="TEMPLATENAME"
                  option={templateOptions}
                  initialValue={fetchdata.TEMPLATENAME}
                  handleInputChange={handleSelectChange}
                  placeholder="Select template..."
                  ShortName
                />
              </div>

              {/* Field 3: HEADER & FOOTER */}
              <div className="sm:col-span-2">
                <Eselect
                  title="HEADER & FOOTER"
                  name="HEADER_FOOTER"
                  option={headerFooterOptions}
                  initialValue={showHeader ? "1" : "0"}
                  handleInputChange={(name, value) => {
                    const val = Number(value) === 1;
                    setShowHeader(val);
                    setFormData((prev) => ({ ...prev, SHOW_HEADER: Number(value) }));
                  }}
                  ShortName
                />
              </div>
            </div>
          </div>

          {/* Card 2: Merge tokens */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                  <span className="font-mono font-bold text-sm">{"{}"}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Merge tokens
                  </h2>
                  <p className="text-lg text-slate-500 dark:text-slate-400">
                    Click to append at the end of the letter
                  </p>
                </div>
              </div>

              <span className="text-lg font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {usedTokensCount} / {availableTokens.length} used
              </span>
            </div>

            {/* Token Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {availableTokens.map((token) => {
                const IconComp = token.icon;
                const isUsed =
                  (formData.CONTENT || "").includes(`{${token.key}}`) ||
                  new RegExp(`\\b${token.key}\\b`, "i").test(formData.CONTENT || "");

                return (
                  <AButton
                    key={token.key}
                    type="button"
                    onClick={() => handleInsertToken(token.key)}
                    title={`Click to insert {${token.key}}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-lg font-semibold border transition-all cursor-pointer select-none active:scale-95 ${isUsed
                        ? "bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300"
                      }`}
                  >
                    <IconComp className="h-3 w-3 shrink-0" />
                    <span>{token.label}</span>
                  </AButton>
                );
              })}
            </div>
          </div>

          {/* Card 3: Letter content */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="CONTENT"
                className="block uppercase text-[12px] font-bold text-[#193A69] dark:text-[#E2E8F0]"
              >
                Letter Content:
              </label>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {wordCount} words · {pageCount} page{pageCount > 1 ? "s" : ""}
              </span>
            </div>

            {/* CustomRichEditor */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80">
              <CustomRichEditor
                value={formData.CONTENT}
                onChange={handleContentChange}
                placeholder="Enter letter content here... (Ctrl+Space for keywords)"
                keywordsList={formData.KEYWORDS}
                defaultHeight={420}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE GENERATED LETTER PREVIEW */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            {/* Header of Preview Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                  <Eye className="h-4 w-4" />
                </div>
                <h2 className="text-xl  font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Generated Letter
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <AButton
                  variant="outline"
                  size="md"
                  onClick={refresh}
                  icon={<RefreshCw className="h-4 w-4" />}
                  className="!rounded-xl border-slate-300 dark:border-slate-700 !h-10 px-4 text-sm font-semibold shadow-xs"
                >
                  <span>Refresh</span>
                </AButton>

                <AButton
                  variant="primary"
                  size="md"
                  onClick={handlePrint}
                  icon={<Printer className="h-4 w-4" />}
                  className="!rounded-xl !bg-[#4338CA] hover:!bg-[#3730a3] text-white !h-10 px-4 text-sm font-semibold shadow-xs"
                >
                  <span>Print</span>
                </AButton>
              </div>
            </div>

            {/* KEYWORDS ATextArea Field (from reference code) */}
            <div className="pt-3 pb-2">
              <label
                htmlFor="KEYWORDS"
                className="block uppercase text-lg font-semibold  mb-1.5 text-[#193A69] dark:text-[#E2E8F0]"
              >
                Example (Title:Mr/Mrs, Name:Himanshu, ...):
              </label>
              <ATextArea
                rows={4}
                name="KEYWORDS"
                handleInputChange={handleSelectChange}
                value={formData.KEYWORDS}
                className="px-3.5 py-3 dark:bg-slate-900 rounded-xl text-lg font-normal leading-relaxed border border-slate-200 dark:border-slate-700 shadow-xs focus:outline-none focus:ring w-full transition-all min-h-[110px]"
              />
            </div>

            {/* Generated Letter Container matching componentRef */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-[#0E1524] p-3 sm:p-5 overflow-hidden">
              <div
                ref={componentRef}
                id="generatedLetter"
                className="break-words font-sans bg-white dark:bg-[#101827] text-[#0F172A] dark:text-[#E2E8F0] rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-6 sm:p-9 min-h-[700px] flex flex-col"
                style={{
                  paddingTop: showHeader ? "10px" : "120px",
                  paddingLeft: "10px",
                  paddingRight: "10px",
                  fontSize: "14px",
                  lineHeight: "1.8",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  minHeight: "100vh",
                }}
              >
                {showHeader && (
                  <>
                    <div className="grid grid-cols-12 mb-4">
                      <div className="col-span-12">
                        <div className="grid grid-cols-12 items-center">
                          {/* Company Logo */}
                          <div className="col-span-4 flex items-center">
                            <Image
                              src={compLogo || "/logo.png"}
                              alt="company logo"
                              className="object-contain"
                              width={80}
                              height={60}
                            />
                          </div>

                          {/* Company Name & Location */}
                          <div className="col-span-4 flex flex-col items-center justify-center text-center">
                            <h2 className="font-bold text-lg">{SelectEmployeedata?.COMPANY_NAME_EMP || company?.Comp_Name || ""}</h2>
                            <p>{SelectEmployeedata?.EMPLOCATION || ""}</p>
                          </div>

                          {/* Maruti / Partner Logo */}
                          <div className="col-span-4 flex justify-end">
                            <div className="h-full flex items-center justify-end">
                              <Image
                                src={MarutiLogo || "/maruti.png"}
                                alt="company logo"
                                className="object-contain"
                                width={180}
                                height={120}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <hr className="mt-2 col-span-12 border-slate-200 dark:border-slate-700" />
                    </div>
                  </>
                )}
                <div dangerouslySetInnerHTML={{ __html: generatedLetter }} className="mt-8" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. BOTTOM FLOATING ACTION BAR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 px-6 shadow-lg">
        <div className="max-w-[1780px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formData.TEMPLATE_NAME || "Untitled Template"}
            </span>
            {" · "}
            <span>
              {showHeader ? "Header & Footer : Yes" : "Header & Footer : No"}
            </span>
            {" · "}
            <span className="tabular-nums">{wordCount} words</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <AButton
              variant="outline"
              size="sm"
              onClick={refresh}
              className="!rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <span>Discard changes</span>
            </AButton>

            <AButton
              variant="secondary"
              size="sm"
              disabled={!fetchdata.TEMPLATENAME}
              onClick={update}
              loading={isUpdating}
              className="!rounded-xl shadow-xs disabled:opacity-50"
            >
              <span>Update template</span>
            </AButton>

            <AButton
              variant="primary"
              size="sm"
              disabled={Boolean(fetchdata.TEMPLATENAME)}
              onClick={save}
              loading={isSaving}
              icon={<Save className="h-4 w-4" />}
              className="!rounded-xl !bg-[#4338CA] hover:!bg-[#3730a3] text-white shadow-xs disabled:opacity-50"
            >
              <span>Save template</span>
            </AButton>
          </div>
        </div>
      </div>
    </div>
  );
}
