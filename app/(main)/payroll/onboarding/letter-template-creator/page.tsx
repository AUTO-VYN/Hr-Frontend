"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  AlertTriangle,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import CustomRichEditor, {
  CustomRichEditorRef,
} from "@/components/Templates/CustomRichEditor";

const DEFAULT_LETTER_CONTENT = `<p style="text-align: center; margin-bottom: 10px;"><strong>Experience Letter</strong></p>
<p style="margin-bottom: 10px;">Date: {TODAYDATE}</p>
<p style="margin-bottom: 10px;"><strong>To Whom It May Concern</strong></p>
<p style="margin-bottom: 10px; text-align: justify; line-height: 1.6;">This is to certify that <strong>{EMPNAME}</strong> was employed with <strong>{COMPNAME}</strong> as a <strong>{EMPDESIGNATION}</strong> from <strong>{EMPJOINDATE}</strong> to <strong>{EMPENDDATE}</strong> in <strong>{EMPDEPARTMENT}</strong> department. During their tenure with us, He/She exhibited a strong work ethic, professionalism, and dedication to their role. They have been an asset to our team and have made valuable contributions to our organization. He/She consistently demonstrated reliability and a positive attitude. They worked well both independently and as part of a team, maintaining excellent relationships with colleagues and supervisors. We wish Him/Her all the best in their future endeavors and are confident that they will excel in any position they pursue.</p>
<p style="margin-bottom: 2px;">Sincerely,</p>
<p style="margin-bottom: 0;"><strong>{COMPNAME}</strong><br />GHRM</p>`;

export type PreviewSpacing = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export const getMergedContentWithSpacing = (
  content: string,
  spacing: PreviewSpacing
) => {
  const clean = (content || "").replace(
    /<!--\s*SPACING:\s*\{[^}]+\}\s*-->\s*/gi,
    ""
  );
  return `<!-- SPACING: ${JSON.stringify(spacing)} -->\n${clean}`;
};

export const extractSpacingFromContent = (
  content: string
): { cleanContent: string; spacing: PreviewSpacing | null } => {
  const match = (content || "").match(/<!--\s*SPACING:\s*(\{[^}]+\})\s*-->/i);
  let spacing: PreviewSpacing | null = null;
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      spacing = {
        top: Number(parsed.top) || 10,
        bottom: Number(parsed.bottom) || 10,
        left: Number(parsed.left) || 10,
        right: Number(parsed.right) || 10,
      };
    } catch (err) {
      console.warn("Failed to parse spacing comment:", err);
    }
  }
  const cleanContent = (content || "").replace(
    /<!--\s*SPACING:\s*\{[^}]+\}\s*-->\s*/gi,
    ""
  );
  return { cleanContent, spacing };
};

const formatToLetterStructure = (text: string) => {
  if (!text || !text.trim()) return "";
  const cleaned = text.replace(/<!--\s*SPACING:\s*\{[^}]+\}\s*-->\s*/gi, "");
  if (!cleaned.trim()) return "";

  const pCount = (text.match(/<p[\s>]/gi) || []).length;
  const brCount = (text.match(/<br\s*\/?>/gi) || []).length;
  if (pCount > 1 || brCount > 1) {
    return text;
  }

  if (text.includes("Experience Letter") || text.includes("To Whom It May Concern")) {
    let formatted = text
      .replace(
        /(^|>|\s*)Experience Letter(\s*<|\s+Date:)/i,
        '<p style="text-align: center; margin-bottom: 10px;"><strong>Experience Letter</strong></p><p style="margin-bottom: 10px;">Date:'
      )
      .replace(
        /\s*To Whom It May Concern:?\s*/i,
        '</p><p style="margin-bottom: 10px;"><strong>To Whom It May Concern</strong></p><p style="margin-bottom: 10px; text-align: justify; line-height: 1.6;">'
      )
      .replace(
        /\s*Sincerely,?\s*/i,
        '</p><p style="margin-bottom: 2px;">Sincerely,</p><p style="margin-bottom: 0;">'
      )
      .replace(
        /\s*GHRM/i,
        '<br />GHRM'
      );

    if (!formatted.startsWith("<p")) {
      formatted = `<p style="margin-bottom: 10px;">${formatted}</p>`;
    }
    return formatted;
  }

  if (text.includes("\n")) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p style="margin-bottom: 10px;">${line}</p>`)
      .join("");
  }

  return text;
};

const getTokenIcon = (key: string) => {
  const upper = key.toUpperCase();
  if (
    upper.includes("NAME") ||
    upper.includes("TITLE") ||
    upper.includes("USER") ||
    upper.includes("FATHER") ||
    upper.includes("GENDER")
  ) {
    return User;
  }
  if (upper.includes("DATE") || upper.includes("DOB")) {
    return Calendar;
  }
  if (
    upper.includes("PERIOD") ||
    upper.includes("PROBATION") ||
    upper.includes("SESSION")
  ) {
    return Hourglass;
  }
  if (
    upper.includes("DESIG") ||
    upper.includes("DEPT") ||
    upper.includes("ROLE") ||
    upper.includes("BRANCH") ||
    upper.includes("LOCATION")
  ) {
    return Briefcase;
  }
  if (upper.includes("COMP") || upper.includes("COMPANY")) {
    return Building2;
  }
  if (
    upper.includes("CTC") ||
    upper.includes("SALARY") ||
    upper.includes("BASIC") ||
    upper.includes("HRA") ||
    upper.includes("DA") ||
    upper.includes("MEDICAL") ||
    upper.includes("UNIFORM") ||
    upper.includes("WASHING") ||
    upper.includes("GROSS") ||
    upper.includes("CONVEYANCE") ||
    upper.includes("RUPEE")
  ) {
    return IndianRupee;
  }
  if (
    upper.includes("SIGN") ||
    upper.includes("IMAGE") ||
    upper.includes("LOGO")
  ) {
    return PenTool;
  }
  return Hash;
};

export default function LetterCreatorPage() {
  const user = useCurrentUser();
  const componentRef = useRef<HTMLDivElement>(null);
  const customRichEditorRef = useRef<CustomRichEditorRef>(null);

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
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState<number>(0);
  const [isTokensExpanded, setIsTokensExpanded] = useState<boolean>(false);
  const employeeCacheRef = useRef<Record<string, any>>({});

  // Refs to prevent duplicate API hits on tab switch / window focus
  const hasInitialFetched = useRef<boolean>(false);
  const lastFetchedSrNoRef = useRef<string>("");
  const lastFetchedTemplateKeyRef = useRef<string>("");

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
        },
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
        },
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
        },
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
    async (codeToFetch?: string | any) => {
      const compCode = getCompCode();
      if (!compCode) return;
      try {
        const rawCode =
          codeToFetch !== undefined ? codeToFetch : fetchdata.SRNO;
        const targetCode = Array.isArray(rawCode)
          ? rawCode[0]
          : rawCode;
        if (!targetCode) return;

        if (employeeCacheRef.current[String(targetCode)]) {
          setSelectEmployeedata(employeeCacheRef.current[String(targetCode)]);
          return;
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/template/empdata`,
          { empcode: targetCode, compcode: compCode },
          {
            headers: {
              compcode: compCode,
              name: user?.name || "",
            },
          },
        );
        if (response.data?.data && response.data.data.length > 0) {
          const emp = response.data.data[0];
          employeeCacheRef.current[String(targetCode)] = emp;
          setSelectEmployeedata(emp);
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }
    },
    [getCompCode, fetchdata.SRNO, user?.name],
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
        },
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
        },
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
    const targetSrNo = Array.isArray(fetchdata.SRNO)
      ? fetchdata.SRNO[0] || ""
      : fetchdata.SRNO;
    if (fetchdata.TEMPLATENAME === "" && (!targetSrNo || targetSrNo === "")) {
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
          SRNO: targetSrNo,
          value: fetchdata.TEMPLATENAME,
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        },
      );
      if (response.status === 200 && response.data?.data?.Template?.[0]) {
        const templateData = response.data.data.Template[0];
        const savedHeader = templateData?.SHOW_HEADER ?? 1;
        setShowHeader(Number(savedHeader) === 1);

        const { cleanContent, spacing: extractedSpacing } =
          extractSpacingFromContent(templateData?.CONTENT || "");

        const loadedSpacing: PreviewSpacing = {
          top: Number(
            templateData?.SPACING_TOP ??
              templateData?.MARGIN_TOP ??
              extractedSpacing?.top ??
              10
          ),
          bottom: Number(
            templateData?.SPACING_BOTTOM ??
              templateData?.MARGIN_BOTTOM ??
              extractedSpacing?.bottom ??
              10
          ),
          left: Number(
            templateData?.SPACING_LEFT ??
              templateData?.MARGIN_LEFT ??
              extractedSpacing?.left ??
              10
          ),
          right: Number(
            templateData?.SPACING_RIGHT ??
              templateData?.MARGIN_RIGHT ??
              extractedSpacing?.right ??
              10
          ),
        };

        setPreviewSpacing(loadedSpacing);

        const formattedContent = formatToLetterStructure(cleanContent);

        setFormData((prev) => ({
          ...prev,
          TEMPLATE_NAME:
            templateData?.Label ||
            templateData?.TEMPLATE_NAME ||
            prev.TEMPLATE_NAME,
          CONTENT: formattedContent,
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

  // Initial load runs only once when user and compcode are available (prevents tab switch refresh)
  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode || hasInitialFetched.current) return;
    hasInitialFetched.current = true;

    getSignatory();
    fetchCompLogoAndMarutiLogo();
    printapi();
    fetchemployeedata();
    fetchExistingTemplateName();
  }, [
    getCompCode,
    getSignatory,
    fetchCompLogoAndMarutiLogo,
    printapi,
    fetchemployeedata,
    fetchExistingTemplateName,
  ]);

  useEffect(() => {
    const currentSrNo = Array.isArray(fetchdata.SRNO)
      ? fetchdata.SRNO.join(",")
      : String(fetchdata.SRNO || "");

    if (currentSrNo) {
      if (lastFetchedSrNoRef.current !== currentSrNo) {
        lastFetchedSrNoRef.current = currentSrNo;
        empdataapi();
      }
    } else {
      lastFetchedSrNoRef.current = "";
      setSelectEmployeedata({});
    }
  }, [fetchdata.SRNO, empdataapi]);

  useEffect(() => {
    if (fetchdata?.TEMPLATENAME) {
      const srNoKey = Array.isArray(fetchdata.SRNO)
        ? fetchdata.SRNO.join(",")
        : String(fetchdata.SRNO || "");
      const key = `${fetchdata.TEMPLATENAME}_${srNoKey}`;

      if (lastFetchedTemplateKeyRef.current !== key) {
        lastFetchedTemplateKeyRef.current = key;
        fetchTemplateContent();
      }
    } else {
      lastFetchedTemplateKeyRef.current = "";
    }
  }, [fetchdata.TEMPLATENAME, fetchdata.SRNO, fetchTemplateContent]);

  // ── 8. Generate Letter Logic (exact matching reference) ──
  const placeholdersMap = useMemo(() => {
    const map: Record<string, string> = {};
    const placeholderArray = (formData.KEYWORDS || "").split(",");

    placeholderArray.forEach((placeholder) => {
      const [key, value] = placeholder.split(":");
      if (key && value) {
        map[key.trim()] = value.trim();
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

    const title = formData?.TEMPLATE_NAME?.toUpperCase()?.includes("MARATHI")
      ? SelectEmployeedata?.GENDER?.toLowerCase() === "female"
        ? "सौ."
        : "श्री."
      : SelectEmployeedata?.GENDER?.toLowerCase() === "female"
        ? "Ms."
        : "Mr.";

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
      DESIGNATION:
        SelectEmployeedata?.DESIGNATION ||
        SelectEmployeedata?.designation ||
        "",
      CTC: SelectEmployeedata?.CURRENT_CTC
        ? `₹ ${Number(SelectEmployeedata.CURRENT_CTC).toLocaleString("en-IN")}`
        : SelectEmployeedata?.CTC || "",
      CURRENT_CTC: SelectEmployeedata?.CURRENT_CTC
        ? `₹ ${Number(SelectEmployeedata.CURRENT_CTC).toLocaleString("en-IN")}`
        : SelectEmployeedata?.CTC || "",
      PROBATION_PERIOD: SelectEmployeedata?.PROBATION_PERIOD || "6 Months",
      PROBATION_:
        SelectEmployeedata?.PROBATION_ ||
        SelectEmployeedata?.PROBATION_PERIOD ||
        "",
      EMPJOINDATE: formatDateDDMMYYYY(SelectEmployeedata?.EMPJOINDATE),
      EMPLASTDATE: formatDateDDMMYYYY(
        SelectEmployeedata?.EMPLASTDATE || SelectEmployeedata?.EMPENDDATE,
      ),
      EMPENDDATE: formatDateDDMMYYYY(
        SelectEmployeedata?.EMPENDDATE || SelectEmployeedata?.EMPLASTDATE,
      ),
      COMPNAME: company?.Comp_Name,
      TODAYDATE: formatDateDDMMYYYY(new Date()),
      COMPCODE:
        SelectEmployeedata?.EMPCODE ||
        (compCode || user?.Comp_Code
          ? String(compCode || user?.Comp_Code)
              .toUpperCase()
              .split("-")[0]
          : ""),
      SIGN_IMAGE: signatureHTML,
    };

    Object.assign(map, specificPlaceholders);
    return map;
  }, [
    formData.KEYWORDS,
    formData.TEMPLATE_NAME,
    SelectEmployeedata,
    signatory?.File_Path,
    getCompCode,
    company?.Comp_Name,
    user?.Comp_Code,
  ]);

  const generateLetter = useCallback(() => {
    if (!formData.CONTENT || !formData.CONTENT.trim()) {
      setGeneratedLetter("");
      return;
    }
    let content = formatToLetterStructure(formData.CONTENT || "");

    const keysString = Object.keys(placeholdersMap).join(", ");
    setFormData((prevData) => {
      if (prevData.KEYWORDS === keysString) return prevData;
      return {
        ...prevData,
        KEYWORDS: keysString,
      };
    });

    Object.keys(placeholdersMap).forEach((key) => {
      if (!key) return;
      const regexWithBraces = new RegExp(`\\{${key}\\}`, "gi");
      content = content?.replace(
        regexWithBraces,
        placeholdersMap[key] !== undefined && placeholdersMap[key] !== null
          ? placeholdersMap[key]
          : "",
      );
      const regex = new RegExp(`\\b${key}\\b`, "gi");
      content = content?.replace(
        regex,
        placeholdersMap[key] !== undefined && placeholdersMap[key] !== null
          ? placeholdersMap[key]
          : "",
      );
    });

    // Clean up excessive leading spacing and empty tags so all templates have proper tight spacing
    const cleanedContent = (content || "")
      .replace(/^(\s*<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>|\s*<div>(&nbsp;|\s|<br\s*\/?>)*<\/div>|\s*<br\s*\/?>|\s*&nbsp;|\s*[\r\n])+/gi, "")
      .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
      .replace(/(<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>\s*){2,}/gi, "<p><br></p>");

    setGeneratedLetter(cleanedContent);
  }, [formData.CONTENT, placeholdersMap]);

  useEffect(() => {
    generateLetter();
  }, [
    formData.CONTENT,
    formData.KEYWORDS,
    SelectEmployeedata,
    formData.TEMPLATE_NAME,
    generateLetter,
  ]);

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
    if (name === "SRNO") {
      setCurrentEmployeeIndex(0);
      if (value) {
        const firstCode = Array.isArray(value) ? value[0] : value;
        if (firstCode) {
          empdataapi(firstCode);
        }
      }
    }
  };

  const handleInsertToken = (tokenKey: string) => {
    if (customRichEditorRef.current?.insertToken) {
      customRichEditorRef.current.insertToken(tokenKey);
    } else {
      const tokenTag = `{${tokenKey}}`;
      setFormData((prev) => {
        const current = (prev.CONTENT || "").trim();
        return {
          ...prev,
          CONTENT: current ? `${current} ${tokenTag} ` : `${tokenTag} `,
        };
      });
    }
  };

  const refresh = () => {
    lastFetchedSrNoRef.current = "";
    lastFetchedTemplateKeyRef.current = "";
    setFormData({
      TEMPLATE_NAME: "",
      CONTENT: "",
      KEYWORDS: "",
      SHOW_HEADER: 1,
    });
    setFetchdata({
      TEMPLATENAME: "",
      SRNO: "",
    });
    setSelectEmployeedata({});
    setGeneratedLetter("");
    setShowHeader(true);
    setPreviewSpacing({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
    });
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

    const templateName = (formData.TEMPLATE_NAME || "").trim();
    if (!templateName) {
      Swal.fire({
        icon: "warning",
        title: "Template Name Required",
        text: "Please enter a template name.",
      });
      return;
    }

    const isAlreadyExists =
      existingTemplateName.some((t: any) => {
        const existingName = String(
          t?.label ??
            t?.Label ??
            t?.TEMPLATE_NAME ??
            t?.template_name ??
            t?.Template_Name ??
            t?.value ??
            ""
        )
          .trim()
          .toLowerCase();
        return existingName === templateName.toLowerCase();
      }) ||
      templateOptions.some(
        (opt) => opt.label.trim().toLowerCase() === templateName.toLowerCase()
      );

    if (isAlreadyExists) {
      Swal.fire({
        icon: "warning",
        title: "Template Already Exists",
        text: `Template "${templateName}" already exists. Please enter a different template name.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const contentWithSpacing = getMergedContentWithSpacing(
        formData.CONTENT,
        previewSpacing
      );

      const templatePayload = {
        ...formData,
        TEMPLATE_NAME: templateName,
        CONTENT: contentWithSpacing,
        SPACING_TOP: previewSpacing.top,
        SPACING_BOTTOM: previewSpacing.bottom,
        SPACING_LEFT: previewSpacing.left,
        SPACING_RIGHT: previewSpacing.right,
        MARGIN_TOP: previewSpacing.top,
        MARGIN_BOTTOM: previewSpacing.bottom,
        MARGIN_LEFT: previewSpacing.left,
        MARGIN_RIGHT: previewSpacing.right,
        PREVIEW_SPACING: JSON.stringify(previewSpacing),
        compcode: compCode,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/insertData`,
        {
          Created_by: user?.name,
          Template: templatePayload,
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        },
      );
      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Template saved successfully.",
          timer: 2000,
          timerProgressBar: true,
        }).then(() => {
          window.location.reload();
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
      const contentWithSpacing = getMergedContentWithSpacing(
        formData.CONTENT,
        previewSpacing
      );

      const templatePayload = {
        ...formData,
        CONTENT: contentWithSpacing,
        SPACING_TOP: previewSpacing.top,
        SPACING_BOTTOM: previewSpacing.bottom,
        SPACING_LEFT: previewSpacing.left,
        SPACING_RIGHT: previewSpacing.right,
        MARGIN_TOP: previewSpacing.top,
        MARGIN_BOTTOM: previewSpacing.bottom,
        MARGIN_LEFT: previewSpacing.left,
        MARGIN_RIGHT: previewSpacing.right,
        PREVIEW_SPACING: JSON.stringify(previewSpacing),
        compcode: compCode,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/updateData`,
        {
          TemplateId: fetchdata.TEMPLATENAME,
          Created_by: user?.name,
          Template: templatePayload,
          compcode: compCode,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        },
      );
      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Template updated successfully.",
          timer: 2000,
          timerProgressBar: true,
        }).then(() => {
          window.location.reload();
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
              margin: 10mm 15mm;
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0F172A;
              margin: 0;
              padding: 0;
            }
            .print-container {
              padding-top: ${previewSpacing.top}px;
              padding-bottom: ${previewSpacing.bottom}px;
              padding-left: ${previewSpacing.left}px;
              padding-right: ${previewSpacing.right}px;
              font-size: 14px;
              line-height: 1.6;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${componentRef.current.innerHTML}
          </div>
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

  const [previewSpacing, setPreviewSpacing] = useState<PreviewSpacing>({
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  });

  const handlePreviewSpacing = (side: keyof PreviewSpacing, value: number) => {
    setPreviewSpacing((prev) => ({
      ...prev,
      [side]: value,
    }));
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

  const SuggestionToken = [
    "SESSION",
    "EMPNAME",
    "EMPADDRESSP",
    "EMPPAN",
    "EMPDOB",
    "EMPGENDER",
    "EMPFATHERNAME",
    "PROBATION_",
    "EMPEMAIL",
    "EMPMONTHLYCTC",
    "EMPANNUALCTC",
    "EMPBRANCH",
    "EMPADDRESSC",
    "EMPDESIGNATION",
    "GENDER",
    "EMPDEPARTMENT",
    "EMPLOCATION",
    "COMPANY_NAME_EMP",
    "EMPCODE",
    "EMPMOB",
    "EMPJOINDATE",
    "EMPLASTDATE",
    "Basic_",
    "HRA_",
    "DA_",
    "Medical_",
    "Uniform_",
    "Washing_",
    "Gross_Salary_",
    "Conveyance_",
    "TITLE",
    "NAME",
    "DESIGNATION",
    "CTC",
    "CURRENT_CTC",
    "PROBATION_PERIOD",
    "COMPNAME",
    "TODAYDATE",
    "COMPCODE",
    "SIGN_IMAGE",
  ];

  // ── Available Merge Tokens ──
  const availableTokens = useMemo(() => {
    const raw = (formData.KEYWORDS || "").trim();
    const source =
      raw || (fetchdata.TEMPLATENAME ? SuggestionToken.join(", ") : "");

    if (source) {
      const seen = new Set<string>();
      const list: Array<{ key: string; label: string; icon: any }> = [];

      source.split(",").forEach((item) => {
        const trimmed = item.trim();
        if (!trimmed) return;
        const key = trimmed.includes(":") ? trimmed.split(":")[0].trim() : trimmed;
        if (key && !seen.has(key)) {
          seen.add(key);
          list.push({
            key,
            label: key,
            icon: getTokenIcon(key),
          });
        }
      });

      if (list.length > 0) return list;
    }

    return [
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
  }, [formData.KEYWORDS, fetchdata.TEMPLATENAME]);

  const usedTokensCount = useMemo(() => {
    const content = formData.CONTENT || "";
    return availableTokens.filter(
      (t) =>
        content.includes(`{${t.key}}`) ||
        new RegExp(`\\b${t.key}\\b`, "i").test(content),
    ).length;
  }, [formData.CONTENT, availableTokens]);

  const wordCount = useMemo(() => {
    if (!formData.CONTENT) return 0;
    return formData.CONTENT.replace(/<[^>]*>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, [formData.CONTENT]);

  // ── Missing employee data tokens in content ──
  const missingTokens = useMemo(() => {
    const hasEmployee =
      SelectEmployeedata && Object.keys(SelectEmployeedata).length > 0;
    if (!hasEmployee) return [];

    const content = formData.CONTENT || "";
    if (!content.trim()) return [];

    const missing: string[] = [];
    availableTokens.forEach((token) => {
      const key = token.key;
      const regexWithBraces = new RegExp(`\\{${key}\\}`, "i");
      const regexWord = new RegExp(`\\b${key}\\b`, "i");
      const isUsed = regexWithBraces.test(content) || regexWord.test(content);

      if (isUsed) {
        const val = placeholdersMap[key];
        if (
          val === undefined ||
          val === null ||
          String(val).trim() === "" ||
          String(val).trim() === "-"
        ) {
          missing.push(key);
        }
      }
    });

    return missing;
  }, [formData.CONTENT, SelectEmployeedata, availableTokens, placeholdersMap]);

  // ── Search in Merge Tokens ──
  const [tokenSearch, setTokenSearch] = useState("");

  const filteredTokens = useMemo(() => {
    if (!tokenSearch.trim()) return availableTokens;
    const q = tokenSearch.trim().toLowerCase();
    return availableTokens.filter(
      (t) =>
        t.key.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q),
    );
  }, [availableTokens, tokenSearch]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 350));
  }, [wordCount]);

  const selectedEmployeeCodes = useMemo(() => {
    if (!fetchdata.SRNO) return [];
    if (Array.isArray(fetchdata.SRNO)) return fetchdata.SRNO.filter(Boolean);
    return [String(fetchdata.SRNO)].filter(Boolean);
  }, [fetchdata.SRNO]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, any>();
    if (Array.isArray(employeedata)) {
      employeedata.forEach((emp: any) => {
        const val =
          emp?.value ??
          emp?.EMPCODE ??
          emp?.empcode ??
          emp?.SRNO ??
          emp?.srno ??
          emp?.id ??
          "";
        if (val) {
          map.set(String(val), emp);
        }
      });
    }
    return map;
  }, [employeedata]);

  useEffect(() => {
    if (
      currentEmployeeIndex >= selectedEmployeeCodes.length &&
      selectedEmployeeCodes.length > 0
    ) {
      setCurrentEmployeeIndex(0);
    }
  }, [selectedEmployeeCodes.length, currentEmployeeIndex]);

  const currentEmployeeCode = useMemo(() => {
    if (selectedEmployeeCodes.length === 0) return "";
    return (
      selectedEmployeeCodes[currentEmployeeIndex] ||
      selectedEmployeeCodes[0] ||
      ""
    );
  }, [selectedEmployeeCodes, currentEmployeeIndex]);

  useEffect(() => {
    if (currentEmployeeCode) {
      empdataapi(currentEmployeeCode);
    }
  }, [currentEmployeeCode, empdataapi]);

  const handlePrevEmployee = () => {
    if (selectedEmployeeCodes.length <= 1) return;
    setCurrentEmployeeIndex((prev) =>
      prev > 0 ? prev - 1 : selectedEmployeeCodes.length - 1
    );
  };

  const handleNextEmployee = () => {
    if (selectedEmployeeCodes.length <= 1) return;
    setCurrentEmployeeIndex((prev) =>
      prev < selectedEmployeeCodes.length - 1 ? prev + 1 : 0
    );
  };

  const currentEmpData = useMemo(() => {
    if (!currentEmployeeCode) return null;
    return employeeMap.get(String(currentEmployeeCode));
  }, [employeeMap, currentEmployeeCode]);

  const currentEmpDisplayName = useMemo(() => {
    if (!currentEmployeeCode) return "";
    return (
      currentEmpData?.EMPNAME ||
      currentEmpData?.empname ||
      currentEmpData?.NAME ||
      currentEmpData?.name ||
      SelectEmployeedata?.EMPNAME ||
      SelectEmployeedata?.NAME ||
      ""
    );
  }, [currentEmpData, SelectEmployeedata, currentEmployeeCode]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-3 sm:p-6 space-y-4 max-w-[1780px] mx-auto font-sans transition-colors pb-6 sm:pb-8">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & MAIN ACTION BUTTONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Letter template creator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Write once with merge tokens; every employee gets their own copy.
            The preview on the right uses a sample record.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
          <AButton
            type="button"
            variant="outline"
            size="lg"
            onClick={handlePrint}
            icon={<Printer className="h-4 w-4 shrink-0" />}
            className="
              !rounded-xl
              border-slate-300 dark:border-slate-700
              bg-white dark:bg-slate-900 shadow-xs
              !h-11
              !px-3 sm:!px-4
              !justify-center
              text-xs sm:text-sm
              whitespace-nowrap
            "
          >
            <span>Print letter</span>
          </AButton>

          <AButton
            type="button"
            variant="outline"
            size="lg"
            onClick={refresh}
            className="
              !rounded-xl
              border-slate-300 dark:border-slate-700
              bg-white dark:bg-slate-900 shadow-xs
              !h-11
              !px-3 sm:!px-4
              !justify-center
              text-xs sm:text-sm
              whitespace-nowrap
            "
          >
            <span>Reset</span>
          </AButton>

          <AButton
            type="button"
            variant="secondary"
            size="lg"
            disabled={!fetchdata.TEMPLATENAME}
            onClick={update}
            loading={isUpdating}
            className="
              !rounded-xl shadow-xs
              disabled:opacity-50
              !h-11
              !px-3 sm:!px-4
              !justify-center
              text-xs sm:text-sm
              whitespace-nowrap
            "
          >
            <span>Update template</span>
          </AButton>

          <AButton
            type="button"
            variant="primary"
            size="lg"
            disabled={Boolean(fetchdata.TEMPLATENAME)}
            onClick={save}
            loading={isSaving}
            icon={<Save className="h-4 w-4 shrink-0" />}
            className="
              !rounded-xl
              !bg-[#4338CA] hover:!bg-[#3730a3]
              text-white shadow-xs
              disabled:opacity-50
              !h-11
              !px-3 sm:!px-4
              !justify-center
              text-xs sm:text-sm
              whitespace-nowrap
            "
          >
            <span>Save</span>
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN 2-COLUMN SPLIT: FORM (LEFT) vs GENERATED LETTER PREVIEW (RIGHT) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: SETUP, TOKENS, RICH EDITOR */}
        <div className="lg:col-span-6 space-y-4 min-w-0">
          {/* Card 1: Template setup */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
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
                  className="h-[32px]"
                  checkbox
                />
              </div>

              <div>
                <Einput
                  title="TEMPLATE NAME "
                  redlabel="*"
                  type="text"
                  name="TEMPLATE_NAME"
                  className="h-[30.5px]"
                  value={formData.TEMPLATE_NAME}
                  handleInputChange={handleSelectChange}
                  placeholder="Add a new template..."
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
                  className="h-[32px]"
                />
              </div>

              {/* Field 3: HEADER & FOOTER */}
              <div className="sm:col-span-2">
                <Eselect
                  title="HEADER & FOOTER"
                  name="HEADER_FOOTER"
                  option={headerFooterOptions}
                  className="h-[32px]"
                  initialValue={showHeader ? "1" : "0"}
                  handleInputChange={(name, value) => {
                    const val = Number(value) === 1;
                    setShowHeader(val);
                    setFormData((prev) => ({
                      ...prev,
                      SHOW_HEADER: Number(value),
                    }));
                  }}
                  ShortName
                />
              </div>
            </div>
          </div>

          {/* Card 2: Merge tokens */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 sm:p-5 shadow-xs transition-all">
            <div
              onClick={() => setIsTokensExpanded((prev) => !prev)}
              className="flex items-center justify-between cursor-pointer select-none group"
              title={
                isTokensExpanded
                  ? "Click to collapse merge tokens"
                  : "Click to expand merge tokens"
              }
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                  <span className="font-mono font-bold text-sm">{"{}"}</span>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Merge tokens</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isTokensExpanded
                          ? "rotate-180 text-indigo-600 dark:text-indigo-400"
                          : ""
                      }`}
                    />
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Click to append at the end of the letter
                  </p>
                </div>
              </div>

              <span className="text-lg font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {usedTokensCount} / {availableTokens.length} used
              </span>
            </div>

            {/* Token Pills (Shown only when clicked/expanded) */}
            {isTokensExpanded && (
              <div className="border-t border-slate-100 dark:border-slate-800 mt-3 pt-3">
                {/* Search Bar for Tokens */}
                <div className="relative mb-2.5">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tokenSearch}
                    onChange={(e) => setTokenSearch(e.target.value)}
                    placeholder="Search merge tokens (e.g. EMPNAME, PROBATION_)..."
                    className="w-full h-8 pl-8 pr-7 text-md rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  {tokenSearch && (
                    <button
                      type="button"
                      onClick={() => setTokenSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 max-h-[110px] overflow-y-auto pr-1 select-none">
                  {filteredTokens.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">
                      No tokens found matching "{tokenSearch}"
                    </div>
                  ) : (
                    filteredTokens.map((token) => {
                      const IconComp = token.icon;
                      const isUsed =
                        (formData.CONTENT || "").includes(`{${token.key}}`) ||
                        new RegExp(`\\b${token.key}\\b`, "i").test(
                          formData.CONTENT || "",
                        );
                      const isMissingData =
                        isUsed && missingTokens.includes(token.key);

                      return (
                        <AButton
                          key={token.key}
                          type="button"
                          variant="ghost"
                          size="sm"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", `{${token.key}}`);
                            e.dataTransfer.setData("application/x-token", token.key);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => handleInsertToken(token.key)}
                          title={
                            isMissingData
                              ? `Missing employee data: {${token.key}} is used in letter but has no data in preview!`
                              : `Click or drag to insert {${token.key}}`
                          }
                          className={`!h-auto !py-1 !px-2.5 sm:!px-3 !rounded-full text-md sm:text-md font-semibold border transition-all cursor-grab active:cursor-grabbing select-none active:scale-95 ${
                            isMissingData
                              ? "!bg-amber-50/90 dark:!bg-amber-950/60 !border-amber-400 dark:!border-amber-600 !text-amber-700 dark:!text-amber-300 hover:!bg-amber-100 hover:!border-amber-500 shadow-xs"
                              : isUsed
                              ? "!bg-indigo-50/90 dark:!bg-indigo-950/60 !border-indigo-300 dark:!border-indigo-700 !text-indigo-700 dark:!text-indigo-300 hover:!bg-indigo-100 hover:!border-indigo-400 hover:!text-indigo-800 dark:hover:!bg-indigo-900/60 dark:hover:!text-indigo-200"
                              : "!bg-slate-50 dark:!bg-slate-800/60 !border-slate-200 dark:!border-slate-700 !text-slate-600 dark:!text-slate-400 hover:!bg-indigo-50 hover:!border-indigo-300 hover:!text-indigo-600 dark:hover:!bg-indigo-950/60 dark:hover:!border-indigo-700 dark:hover:!text-indigo-300"
                          }`}
                        >
                          <IconComp className="h-3 w-3 shrink-0" />
                          <span>{token.label}</span>
                          {isMissingData && (
                            <span className="ml-1 px-1 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                              No Data
                            </span>
                          )}
                        </AButton>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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

            {/* Warning indicator if tokens have no employee data */}
       

            {/* CustomRichEditor */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80">
              <CustomRichEditor
                ref={customRichEditorRef}
                value={formData.CONTENT}
                onChange={handleContentChange}
                placeholder="Enter letter content here..."
                defaultHeight={420}
                className="w-full"
                keywordsList={
                  (formData.KEYWORDS && formData.KEYWORDS.trim())
                    ? formData.KEYWORDS
                    : SuggestionToken
                }
                missingTokens={missingTokens}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE GENERATED LETTER PREVIEW */}
        <div className="lg:col-span-6 space-y-4 min-w-0">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            {/* Preview Spacing Controls */}
            <div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Preview Spacing
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Adjust content spacing from each side (in pixels).
                  </p>
                </div>

                <AButton
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() =>
                    setPreviewSpacing({
                      top: 10,
                      bottom: 10,
                      left: 10,
                      right: 10,
                    })
                  }
                  className="!rounded-lg"
                >
                  Reset spacing
                </AButton>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                {(
                  [
                    { key: "top", label: "Top spacing" },
                    { key: "bottom", label: "Bottom spacing" },
                    { key: "left", label: "Left spacing" },
                    { key: "right", label: "Right spacing" },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor={`preview-${key}`}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {label}
                      </label>

                      <span className="text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {previewSpacing[key]} px
                      </span>
                    </div>

                    <input
                      id={`preview-${key}`}
                      type="range"
                      min={0}
                      max={60}
                      step={1}
                      value={previewSpacing[key]}
                      onChange={(e) =>
                        handlePreviewSpacing(key, Number(e.target.value))
                      }
                      className="w-full cursor-pointer accent-indigo-600"
                    />

                    <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 px-0.5 select-none tabular-nums">
                      <span>0</span>
                      <span>20</span>
                      <span>40</span>
                      <span>60 px</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Letter Container matching componentRef */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-[#0E1524] p-2 sm:p-5 overflow-hidden space-y-3">
              {/* Template Navigation Toolbar (matching Screenshot 2 with current app styling) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 w-full">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={handlePrevEmployee}
                    disabled={selectedEmployeeCodes.length <= 1}
                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
                    title="Previous employee template"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Center Template Selector */}
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-center justify-between h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-indigo-500 transition-colors cursor-pointer text-xs sm:text-sm font-semibold shadow-xs">
                      <span className="truncate pr-2">
                        {selectedEmployeeCodes.length > 0
                          ? `PRINT ${currentEmployeeIndex + 1} / ${selectedEmployeeCodes.length} — ${currentEmployeeCode} ${currentEmpDisplayName}`
                          : "No employee selected"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                    {selectedEmployeeCodes.length > 0 && (
                      <select
                        value={currentEmployeeIndex}
                        onChange={(e) => setCurrentEmployeeIndex(Number(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Select employee to preview"
                      >
                        {selectedEmployeeCodes.slice(0, 500).map((code: any, idx: number) => {
                          const emp = employeeMap.get(String(code));
                          const name = emp?.EMPNAME || emp?.name || emp?.label || code;
                          return (
                            <option key={`${code}-${idx}`} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1">
                              {idx + 1} / {selectedEmployeeCodes.length} — {code} {name}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={handleNextEmployee}
                    disabled={selectedEmployeeCodes.length <= 1}
                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
                    title="Next employee template"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Sub-header info bar matching Screenshot 2 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-medium">
                    {pageCount} page · same layout as print and PDF
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {showHeader ? "Header and Footer on Every Page" : "No Header & Footer"}
                  </span>
                </div>
              </div>

              <div
                ref={componentRef}
                id="generatedLetter"
                className="break-words font-sans bg-white dark:bg-[#101827] text-[#0F172A] dark:text-[#E2E8F0] rounded-xl border border-slate-200 dark:border-slate-800 shadow-md p-3 sm:p-6 lg:p-9 min-h-[700px] flex flex-col w-full min-w-0"
                style={{
                  paddingTop: `${previewSpacing.top}px`,
                  paddingBottom: `${previewSpacing.bottom}px`,
                  paddingLeft: `${previewSpacing.left}px`,
                  paddingRight: `${previewSpacing.right}px`,
                  fontSize: "14px",
                  lineHeight: "1.6",
                  overflowY: "auto",
                  minHeight: "700px",
                }}
              >
                {showHeader && Boolean(formData.CONTENT || generatedLetter) && (
                  <div
                    className="mb-2.5 w-full min-w-0"
                    style={{ width: "100%" }}
                  >
                    <div
                      className="grid grid-cols-12 items-center gap-2 w-full min-w-0"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px minmax(0, 1fr) 100px",
                        alignItems: "center",
                        columnGap: "10px",
                        width: "100%",
                      }}
                    >
                      {/* Company Logo */}
                      <div className="flex items-center justify-start min-w-0">
                        <Image
                          src={compLogo || "/logo.png"}
                          alt="Company logo"
                          className="object-contain"
                          width={65}
                          height={45}
                          style={{
                            width: "65px",
                            height: "45px",
                            objectFit: "contain",
                          }}
                        />
                      </div>

                      {/* Company Name & Location */}
                      <div
                        className="flex flex-col items-center justify-center text-center min-w-0"
                        style={{
                          textAlign: "center",
                          overflowWrap: "anywhere",
                          minWidth: 0,
                        }}
                      >
                        <h2
                          className="font-bold text-xs sm:text-base"
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            lineHeight: 1.35,
                            fontWeight: 700,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {company?.Comp_Name ||
                            SelectEmployeedata?.COMPANY_NAME_EMP ||
                            ""}
                        </h2>

                        <p
                          className="text-xs"
                          style={{
                            margin: "3px 0 0",
                            fontSize: "11px",
                            lineHeight: 1.4,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {SelectEmployeedata?.EMPLOCATION || ""}
                        </p>
                      </div>

                      {/* Maruti / Partner Logo */}
                      <div className="flex items-center justify-end min-w-0">
                        <Image
                          src={MarutiLogo || "/maruti.png"}
                          alt="Maruti logo"
                          className="object-contain"
                          width={95}
                          height={50}
                          style={{
                            width: "95px",
                            height: "50px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    </div>

                    <hr
                      className="mt-2 border-slate-200 dark:border-slate-700"
                      style={{
                        border: 0,
                        borderTop: "1px solid #cbd5e1",
                        marginTop: "8px",
                      }}
                    />
                  </div>
                )}
                <div
                  dangerouslySetInnerHTML={{ __html: generatedLetter }}
                  className="mt-2.5 min-w-0 break-words overflow-wrap-anywhere [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_div]:mb-2.5 [&_div:last-child]:mb-0"
                  style={{ lineHeight: "1.6" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
