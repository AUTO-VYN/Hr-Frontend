"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Home,
  Loader2,
  Lock,
  Minus,
  Paperclip,
  Phone,
  Printer,
  RotateCcw,
  Save,
  Star,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useFormData } from "../Shortlisted_Candidate/Context/FormDataContext";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import Printout from "@/components/atoms/Printout";
import HindiPrintout from "@/components/atoms/HindiPrintout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import HomeVisitVerification from "./Home_Visit_Page/page";

// Helper Alert Toast
const showSideAlert = (message: string, type: "success" | "error" | "warning" | "info") => {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    customClass: {
      popup: "rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 text-sm font-medium",
    },
  });
};

const religionMapping: Record<string, string> = {
  "1": "Hindu",
  "2": "Muslim",
  "3": "Sikh",
  "4": "Christian",
  "5": "Jain",
  "6": "Buddhist",
  "7": "Persians",
  "OTHER": "Other",
};

const interviewStatusOptions = [
  { value: "1", label: "Accepted" },
  { value: "2", label: "Next Interview Needed" },
  { value: "3", label: "Rejected" },
  { value: "4", label: "Hold" },
];

const ratingStyleMap: Record<string, string> = {
  "1": "bg-[#FDECEC] text-[#D32F2F] border-[#F5B7B1]", // Poor
  "2": "bg-[#FFF3E0] text-[#EF6C00] border-[#FFCC80]", // Fair
  "3": "bg-[#FFFDE7] text-[#F9A825] border-[#FFF59D]", // Average
  "4": "bg-[#E3F2FD] text-[#1976D2] border-[#90CAF9]", // Good
  "5": "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]", // Excellent
};

const ratingOptions = [
  { value: "1", label: "1 - Poor" },
  { value: "2", label: "2 - Fair" },
  { value: "3", label: "3 - Average" },
  { value: "4", label: "4 - Good" },
  { value: "5", label: "5 - Excellent" },
];

const initialDefaultCandidate = {
  TRAN_ID: "99",
  NAME: "rakesh",
  APPLICATION_DATE1: "2026-07-17",
  GENDER: "Male",
  DOB1: "1998-03-12",
  EMAIL: "rakesh@autovyn.com",
  MOB_NO: "9887318567",
  WHATSAPP_NO: "9887318567",
  ADDRESS: "Jaipur, Rajasthan",
  STATE1: "Rajasthan",
  CITY1: "Jaipur",
  DESIGNATION: "Accessories Executive",
  LOC_CODE1: "Branch - 1",
  LOC_CODE: "1",
  HIGH_QUAL: "12th",
  PASSING_PER: "66",
  EXP_IN_YEAR: "3",
  AADHAR_NO: "4521 8890 1123",
  CURRENT_CTC: "2.40",
  EXPECTED_CTC: "3.00",
  FATHERS_NAME: "Ramesh Kumar",
  MOTHERS_NAME: "Sita Devi",
  RELIGION: "1",
  SKILLS: "Accessory sales, Tally",
  SOURCE_OF_REG: "Referral",
  INT_STATUS: "100", // 100: In processing, 101: Selected, 102: Rejected, 103: Employee Created
  HR_REASON: "",
  EMPCODE: "",
  DIVISION: "",
  Sal_Region: "",
  CURRENTJOINDATE: "",
  INTR1BY: null as any,
  INTR1DATE: null as any,
  INTR1TIME: null as any,
  INTR1STATUS: null as any,
  INTR1SALARY: null as any,
  INTR1REMARK: "",
  INTR1RATING: null as any,
  INTR2BY: null as any,
  INTR2DATE: null as any,
  INTR2TIME: null as any,
  INTR2STATUS: null as any,
  INTR2SALARY: null as any,
  INTR2REMARK: "",
  INTR2RATING: null as any,
  INTR3BY: null as any,
  INTR3DATE: null as any,
  INTR3TIME: null as any,
  INTR3STATUS: null as any,
  INTR3SALARY: null as any,
  INTR3REMARK: "",
  INTR3RATING: null as any,
  INTR4BY: null as any,
  INTR4DATE: null as any,
  INTR4TIME: null as any,
  INTR4STATUS: null as any,
  INTR4SALARY: null as any,
  INTR4REMARK: "",
  INTR4RATING: null as any,
  EvaluationCriteria: [] as any[],
};

export default function InterviewSchedulingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser() as any;

  // Form & Candidate Data State from Context
  const { formData1, setFormData1 } = useFormData();
  const [scheduledRounds, setScheduledRounds] = useState<{ [key: number]: boolean }>({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState<number>(0);
  const [isRecordExpanded, setIsRecordExpanded] = useState<boolean>(false);

  // Round button state flags matching old code functionality
  const [showSave1, setShowSave1] = useState(false);
  const [showSave2, setShowSave2] = useState(false);
  const [showSave3, setShowSave3] = useState(false);
  const [showSave4, setShowSave4] = useState(false);

  const [showSchedule1, setShowSchedule1] = useState(true);
  const [showSchedule2, setShowSchedule2] = useState(true);
  const [showSchedule3, setShowSchedule3] = useState(true);
  const [showSchedule4, setShowSchedule4] = useState(true);

  const [resetSchedule1, setResetSchedule1] = useState(true);
  const [resetSchedule2, setResetSchedule2] = useState(true);
  const [resetSchedule3, setResetSchedule3] = useState(true);
  const [resetSchedule4, setResetSchedule4] = useState(true);

  // Dropdown Lists from API
  const [empName, setEmpName] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<any[]>([]);
  const [divisionOptions, setDivisionOptions] = useState<any[]>([]);
  const [designationOptions, setDesignationOptions] = useState<any[]>([]);
  const [salRegionOptions, setSalRegionOptions] = useState<any[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState<boolean>(false);

  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState<boolean>(false);
  const [isHomeVisitOpen, setIsHomeVisitOpen] = useState<boolean>(false);
  const [isRatingOpen, setIsRatingOpen] = useState<boolean>(false);
  const [intrvViewRating, setIntrvViewRating] = useState<number | null>(null);
  const [isEnglishPrintOpen, setIsEnglishPrintOpen] = useState<boolean>(false);
  const [isHindiPrintOpen, setIsHindiPrintOpen] = useState<boolean>(false);

  // Document Print Handler via iframe
  const handlePrintDocument = (elementId: string) => {
    const printElement = document.getElementById(elementId);
    if (!printElement) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
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
          <title>${formData1?.NAME ? `${formData1.NAME} - Printout` : "Candidate Printout"}</title>
          ${styleTags}
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            html, body {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }
            div, section, main, table {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            .custom-scrollbar {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }
            .break-after-page, .print\\:break-after-page {
              page-break-after: always !important;
              break-after: page !important;
            }
            ::-webkit-scrollbar {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 500);
  };

  // Date Formatting Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === "null" || dateStr === "—") return "—";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    } catch {}
    return dateStr;
  };

  const formatTimeToHHMM = (timeString: any) => {
    if (!timeString) return "";
    try {
      if (typeof timeString === "string" && timeString.includes("T")) {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          const hours = date.getUTCHours().toString().padStart(2, "0");
          const minutes = date.getUTCMinutes().toString().padStart(2, "0");
          return `${hours}:${minutes}`;
        }
      }
      return String(timeString).substring(0, 5);
    } catch {
      return "";
    }
  };

  // Safe Company Code Extraction
  const getCompCode = (): string => {
    const urlComp =
      searchParams.get("compcode") ||
      searchParams.get("comp_code") ||
      searchParams.get("Comp_code") ||
      searchParams.get("compCode") ||
      searchParams.get("company_code") ||
      searchParams.get("DB");
    if (urlComp) return String(urlComp);

    const v1 = searchParams.get("v1");
    if (v1) {
      try {
        const decoded = JSON.parse(atob(v1));
        if (decoded?.Comp_code || decoded?.comp_code || decoded?.compcode) {
          return String(decoded.Comp_code || decoded.comp_code || decoded.compcode);
        }
      } catch (e) {}
    }

    if (
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.company_code ||
      (user as any)?.DB
    ) {
      return String(
        user?.Comp_Code ||
          (user as any)?.compcode ||
          (user as any)?.comp_code ||
          (user as any)?.company_code ||
          (user as any)?.DB
      );
    }

    if (typeof window !== "undefined") {
      const stored =
        localStorage.getItem("compcode") ||
        localStorage.getItem("Comp_Code") ||
        localStorage.getItem("comp_code") ||
        sessionStorage.getItem("compcode") ||
        sessionStorage.getItem("Comp_Code");
      if (stored) return stored;
    }

    return "";
  };

  function getCurrentDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    let month: any = today.getMonth() + 1;
    let day: any = today.getDate();
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    return `${year}-${month}-${day}`;
  }

  // Set default current joining date on mount
  useEffect(() => {
    setFormData1((prevState: any) => ({
      ...(prevState || {}),
      CURRENTJOINDATE: prevState?.CURRENTJOINDATE || getCurrentDate(),
    }));
  }, []);

  const handleInputChange = (name: string, value: any) => {
    setFormData1((prev: any) => ({
      ...(prev || {}),
      [name]: value,
    }));
  };

  // Sync scheduled rounds state with formData1
  useEffect(() => {
    const initialScheduled: { [key: number]: boolean } = {
      1: false,
      2: false,
      3: false,
      4: false,
    };
    [1, 2, 3, 4].forEach((num) => {
      initialScheduled[num] = Boolean(
        formData1?.[`INTR${num}BY`] ||
        formData1?.[`INTR${num}DATE`] ||
        formData1?.[`INTR${num}STATUS`]
      );
    });
    setScheduledRounds(initialScheduled);
  }, [
    formData1?.INTR1BY, formData1?.INTR1DATE, formData1?.INTR1STATUS,
    formData1?.INTR2BY, formData1?.INTR2DATE, formData1?.INTR2STATUS,
    formData1?.INTR3BY, formData1?.INTR3DATE, formData1?.INTR3STATUS,
    formData1?.INTR4BY, formData1?.INTR4DATE, formData1?.INTR4STATUS,
  ]);

  // Round 1 Schedule/Save/Reset control
  useEffect(() => {
    if (
      formData1?.INT_STATUS == "101" ||
      formData1?.INT_STATUS == "102" ||
      formData1?.INT_STATUS == "103" ||
      formData1?.INT_STATUS == "104"
    ) {
      setShowSave1(true);
      setShowSchedule1(true);
      setResetSchedule1(true);
      return;
    }
    if (formData1?.INTR1STATUS) {
      setShowSchedule1(true);
      setShowSave1(true);
      setResetSchedule1(true);
      return;
    }
    if (formData1?.INTR1BY && formData1?.INTR1DATE && formData1?.INTR1TIME) {
      setShowSave1(true);
      setShowSchedule1(true);
      setResetSchedule1(false);
    } else {
      setShowSave1(false);
      setShowSchedule1(true);
      setResetSchedule1(true);
    }
  }, [
    formData1?.TRAN_ID,
    formData1?.INT_STATUS,
    formData1?.INTR1STATUS,
  ]);

  // Round 2 Schedule/Save/Reset control
  useEffect(() => {
    if (
      formData1?.INT_STATUS == "101" ||
      formData1?.INT_STATUS == "102" ||
      formData1?.INT_STATUS == "103" ||
      formData1?.INT_STATUS == "104"
    ) {
      setShowSave2(true);
      setShowSchedule2(true);
      setResetSchedule2(true);
      return;
    }
    if (formData1?.INTR1STATUS) {
      if (formData1?.INTR2STATUS) {
        setShowSchedule2(true);
        setShowSave2(true);
        setResetSchedule2(true);
      } else if (formData1?.INTR2BY && formData1?.INTR2DATE && formData1?.INTR2TIME) {
        setShowSave2(true);
        setShowSchedule2(true);
        setResetSchedule2(false);
      } else {
        setShowSave2(false);
        setShowSchedule2(true);
        setResetSchedule2(true);
      }
    } else {
      setShowSave2(true);
      setShowSchedule2(true);
      setResetSchedule2(true);
    }
  }, [
    formData1?.TRAN_ID,
    formData1?.INT_STATUS,
    formData1?.INTR1STATUS,
    formData1?.INTR2STATUS,
  ]);

  // Round 3 Schedule/Save/Reset control
  useEffect(() => {
    if (
      formData1?.INT_STATUS == "101" ||
      formData1?.INT_STATUS == "102" ||
      formData1?.INT_STATUS == "103" ||
      formData1?.INT_STATUS == "104"
    ) {
      setShowSave3(true);
      setShowSchedule3(true);
      setResetSchedule3(true);
      return;
    }
    if (formData1?.INTR2STATUS) {
      if (formData1?.INTR3STATUS) {
        setShowSchedule3(true);
        setShowSave3(true);
        setResetSchedule3(true);
      } else if (formData1?.INTR3BY && formData1?.INTR3DATE && formData1?.INTR3TIME) {
        setShowSave3(true);
        setShowSchedule3(true);
        setResetSchedule3(false);
      } else {
        setShowSave3(false);
        setShowSchedule3(true);
        setResetSchedule3(true);
      }
    } else {
      setShowSave3(true);
      setShowSchedule3(true);
      setResetSchedule3(true);
    }
  }, [
    formData1?.TRAN_ID,
    formData1?.INT_STATUS,
    formData1?.INTR2STATUS,
    formData1?.INTR3STATUS,
  ]);

  // Round 4 Schedule/Save/Reset control
  useEffect(() => {
    if (
      formData1?.INT_STATUS == "101" ||
      formData1?.INT_STATUS == "102" ||
      formData1?.INT_STATUS == "103" ||
      formData1?.INT_STATUS == "104"
    ) {
      setShowSave4(true);
      setShowSchedule4(true);
      setResetSchedule4(true);
      return;
    }
    if (formData1?.INTR3STATUS) {
      if (formData1?.INTR4STATUS) {
        setShowSchedule4(true);
        setShowSave4(true);
        setResetSchedule4(true);
      } else if (formData1?.INTR4BY && formData1?.INTR4DATE && formData1?.INTR4TIME) {
        setShowSave4(true);
        setShowSchedule4(true);
        setResetSchedule4(false);
      } else {
        setShowSave4(false);
        setShowSchedule4(true);
        setResetSchedule4(true);
      }
    } else {
      setShowSave4(true);
      setShowSchedule4(true);
      setResetSchedule4(true);
    }
  }, [
    formData1?.TRAN_ID,
    formData1?.INT_STATUS,
    formData1?.INTR3STATUS,
    formData1?.INTR4STATUS,
  ]);

  const showScheduleMap: Record<number, boolean> = {
    1: showSchedule1,
    2: showSchedule2,
    3: showSchedule3,
    4: showSchedule4,
  };
  const showSaveMap: Record<number, boolean> = {
    1: showSave1,
    2: showSave2,
    3: showSave3,
    4: showSave4,
  };
  const resetScheduleMap: Record<number, boolean> = {
    1: resetSchedule1,
    2: resetSchedule2,
    3: resetSchedule3,
    4: resetSchedule4,
  };

  // ============================================================================
  // Initial Data Fetching (Masters & Employees)
  // ============================================================================
  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode) return;

    const fetchMasters = async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/interview/findMasters`,
          {},
          {
            headers: {
              compcode: compCode,
              name: user?.name || "HR Admin",
            },
          }
        );
        const masters = res.data?.data;
        if (masters) {
          if (masters.DIVISION) setDivisionOptions(masters.DIVISION);
          if (masters.EMPLOYEEDESIGNATION) setDesignationOptions(masters.EMPLOYEEDESIGNATION);
          if (masters.LOCATION) setLocationOptions(masters.LOCATION);
          if (masters.Sal_Region) setSalRegionOptions(masters.Sal_Region);
        }
      } catch (err) {
        console.error("Error fetching masters:", err);
      }
    };

    const fetchEmployees = async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/interview/allemployee`,
          {},
          {
            headers: {
              compcode: compCode,
              name: user?.name || "HR Admin",
            },
          }
        );
        if (res.data?.data) {
          const list = res.data.data.map((emp: any) => ({
            value: String(emp.value ?? emp.EMPCODE ?? emp.Emp_Code ?? emp.id),
            label: String(emp.label ?? emp.EMPNAME ?? emp.Emp_Name ?? emp.name),
          }));
          setEmpName(list);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchMasters();
    fetchEmployees();
  }, [user, searchParams]);

  // Fetch candidate details if tran_id is provided in URL
  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode) return;

    const tranIdParam =
      searchParams.get("tran_id") ||
      searchParams.get("tranId") ||
      searchParams.get("TRAN_ID") ||
      "";

    if (tranIdParam) {
      const fetchCandidate = async () => {
        setIsLoading(true);
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/interview/getonedata`,
            { TRAN_ID: tranIdParam },
            {
              headers: {
                compcode: compCode,
                name: user?.name || "HR Admin",
              },
            }
          );
          if (res.data) {
            setFormData1((prev: any) => ({
              ...(prev || {}),
              ...res.data,
              TRAN_ID: tranIdParam,
            }));
            const initialScheduled: { [key: number]: boolean } = {
              1: false,
              2: false,
              3: false,
              4: false,
            };
            [1, 2, 3, 4].forEach((num) => {
              initialScheduled[num] = Boolean(
                res.data[`INTR${num}BY`] ||
                res.data[`INTR${num}DATE`] ||
                res.data[`INTR${num}STATUS`]
              );
            });
            setScheduledRounds(initialScheduled);
          }
        } catch (err) {
          console.error("Error fetching candidate:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCandidate();
    } else if (!formData1?.TRAN_ID && !formData1?.NAME) {
      // Fallback initial dummy candidate if neither context nor URL param provides data
      setFormData1((prev: any) => ({
        ...initialDefaultCandidate,
        ...(prev || {}),
      }));
    }
  }, [user, searchParams]);

  // ============================================================================
  // Round Action Handlers (Schedule, Update/Save, Reset)
  // ============================================================================
  const handleScheduleRound = async (roundNumber: 1 | 2 | 3 | 4) => {
    const compCode = getCompCode();
    const byField = `INTR${roundNumber}BY`;
    const dateField = `INTR${roundNumber}DATE`;
    const timeField = `INTR${roundNumber}TIME`;

    if (!formData1?.[byField]) {
      showSideAlert(`Interviewer ${roundNumber} is missing`, "warning");
      return;
    }
    if (!formData1?.[dateField]) {
      showSideAlert(`Interview date is missing`, "warning");
      return;
    }
    if (!formData1?.[timeField]) {
      showSideAlert(`Interview time is missing`, "warning");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        TRAN_ID: formData1.TRAN_ID,
        [byField]: formData1[byField],
        [dateField]: formData1[dateField],
        [timeField]: formData1[timeField],
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/Schedule${roundNumber}interview`,
        payload,
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );

      setScheduledRounds((prev) => ({ ...prev, [roundNumber]: true }));
      if (roundNumber === 1) {
        setShowSchedule1(true);
        setResetSchedule1(false);
      } else if (roundNumber === 2) {
        setShowSchedule2(true);
        setResetSchedule2(false);
      } else if (roundNumber === 3) {
        setShowSchedule3(true);
        setResetSchedule3(false);
      } else if (roundNumber === 4) {
        setShowSchedule4(true);
        setResetSchedule4(false);
      }

      Swal.fire({
        icon: "success",
        title: "Success",
        text: `Interview ${roundNumber} Updated successfully:`,
      });
    } catch (err) {
      console.error(`Error scheduling round ${roundNumber}:`, err);
      showSideAlert(`Failed to schedule round ${roundNumber}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRound = async (roundNumber: 1 | 2 | 3 | 4) => {
    const compCode = getCompCode();
    const byField = `INTR${roundNumber}BY`;
    const dateField = `INTR${roundNumber}DATE`;
    const timeField = `INTR${roundNumber}TIME`;

    if (!formData1?.[byField]) {
      showSideAlert(`Interviewer ${roundNumber} is missing`, "warning");
      return;
    }
    if (!formData1?.[dateField]) {
      showSideAlert(`Interview date is missing`, "warning");
      return;
    }
    if (!formData1?.[timeField]) {
      showSideAlert(`Interview time is missing`, "warning");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        TRAN_ID: formData1.TRAN_ID,
        [byField]: formData1[byField],
        [dateField]: formData1[dateField],
        [timeField]: formData1[timeField],
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/update${roundNumber}interview`,
        payload,
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );

      if (roundNumber === 1) {
        setShowSchedule1(false);
        setShowSave1(true);
      } else if (roundNumber === 2) {
        setShowSchedule2(false);
        setShowSave2(true);
      } else if (roundNumber === 3) {
        setShowSchedule3(false);
        setShowSave3(true);
      } else if (roundNumber === 4) {
        setShowSchedule4(false);
        setShowSave4(true);
      }

      Swal.fire({
        icon: "success",
        title: "Success",
        text: `Interview ${roundNumber} details Updated successfully:`,
      });
    } catch (err) {
      console.error(`Error saving round ${roundNumber}:`, err);
      showSideAlert(`Failed to update round ${roundNumber}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRound = (roundNumber: 1 | 2 | 3 | 4) => {
    const byField = `INTR${roundNumber}BY`;
    const dateField = `INTR${roundNumber}DATE`;
    const timeField = `INTR${roundNumber}TIME`;

    setFormData1((prev: any) => ({
      ...(prev || {}),
      [byField]: null,
      [dateField]: null,
      [timeField]: null,
    }));

    setScheduledRounds((prev) => ({ ...prev, [roundNumber]: false }));

    if (roundNumber === 1) {
      setResetSchedule1(true);
      setShowSave1(false);
      setShowSchedule1(true);
    } else if (roundNumber === 2) {
      setResetSchedule2(true);
      setShowSave2(false);
      setShowSchedule2(true);
    } else if (roundNumber === 3) {
      setResetSchedule3(true);
      setShowSave3(false);
      setShowSchedule3(true);
    } else if (roundNumber === 4) {
      setResetSchedule4(true);
      setShowSave4(false);
      setShowSchedule4(true);
    }
  };

  // ============================================================================
  // Final Decision Handlers (Select, Reject, Employee Master)
  // ============================================================================
  const handleSelectCandidate = async () => {
    const compCode = getCompCode();
    if (!formData1?.HR_REASON?.trim()) {
      showSideAlert("Please fill out the Reason", "warning");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/finallyselectedbyhr`,
        {
          TRAN_ID: formData1?.TRAN_ID,
          HR_REASON: formData1?.HR_REASON,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Candidate Selected successfully",
      });

      setFormData1((prev: any) => ({
        ...(prev || {}),
        INT_STATUS: "101",
      }));
    } catch (err) {
      console.error("Error selecting candidate:", err);
      showSideAlert("Failed to select candidate", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectCandidate = async () => {
    const compCode = getCompCode();
    if (!formData1?.HR_REASON?.trim()) {
      showSideAlert("Please fill out the Reason", "warning");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/finallyrejectedbyhr`,
        {
          TRAN_ID: formData1?.TRAN_ID,
          HR_REASON: formData1?.HR_REASON,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Candidate Rejected successfully",
      });

      router.push("/payroll/recruitment-process/shortlisted-applications");
    } catch (err) {
      console.error("Error rejecting candidate:", err);
      showSideAlert("Failed to reject candidate", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateEmpModal = async () => {
    const compCode = getCompCode();
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/getmaxemployeeno`,
        {},
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );
      const maxCode = res?.data?.maxEmpCode;
      if (maxCode) {
        setFormData1((prev: any) => ({
          ...(prev || {}),
          EMPCODE: maxCode,
        }));
      }
    } catch (err) {
      console.error("Error getting max employee code:", err);
    }
    setIsEmpModalOpen(true);
  };

  const handleCreateEmployeeMaster = async () => {
    const compCode = getCompCode();
    if (!formData1?.CURRENTJOINDATE) {
      showSideAlert("Please fill out the joining Date", "warning");
      return;
    }
    if (!formData1?.LOC_CODE) {
      showSideAlert("Please fill out the Location", "warning");
      return;
    }
    if (!formData1?.DESIGNATION) {
      showSideAlert("Please fill out the Designation", "warning");
      return;
    }
    if (!formData1?.DIVISION) {
      showSideAlert("Please fill out the Department", "warning");
      return;
    }
    if (!formData1?.Sal_Region) {
      showSideAlert("Please fill out the Region", "warning");
      return;
    }

    setIsCreatingEmployee(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/createempmaster`,
        {
          TRAN_ID: formData1?.TRAN_ID,
          Sal_Region: formData1?.Sal_Region,
          DIVISION: formData1?.DIVISION,
          EMPLOYEEDESIGNATION: formData1?.DESIGNATION,
          LOCATION: formData1?.LOC_CODE,
          CURRENTJOINDATE: formData1?.CURRENTJOINDATE,
          EMPCODE: formData1?.EMPCODE,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );

      setIsEmpModalOpen(false);
      setFormData1((prev: any) => ({
        ...(prev || {}),
        INT_STATUS: "103",
      }));

      const newEmpCode = res?.data?.EMPCODE || formData1?.EMPCODE;
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Employee Created successfully",
      });

      router.push(`/autovyn/payroll/Master/Employee_Master?UTD=${newEmpCode}`);
    } catch (err: any) {
      console.error("Error creating employee master:", err);
      setIsEmpModalOpen(false);
      if (err?.response?.data?.status === false) {
        Swal.fire({
          icon: "warning",
          title: "warning",
          text: "Employee code already exists",
        });
      } else {
        showSideAlert("Failed to create employee master", "error");
      }
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const handleRemoveFromEmployeeMaster = async () => {
    const compCode = getCompCode();
    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/removefromempmaster`,
        {
          TRAN_ID: formData1?.TRAN_ID,
          empcode: formData1?.EMPCODE,
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Candidate Remove From Employee Master successfully",
      });
      router.push("/payroll/recruitment-process/shortlisted-applications");
    } catch (err) {
      console.error("Error removing from employee master:", err);
      showSideAlert("Failed to remove employee", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Rating Display Helper
  const getRatingLabel = (val: any) => {
    const found = ratingOptions.find((r) => r.value === String(val));
    return found ? found.label : val;
  };

  const renderStars = (val: any) => {
    const count = Number(val) || 0;
    return (
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`text-sm ${i <= count ? "text-amber-500" : "text-slate-300 dark:text-slate-700"}`}
          >
            ★
          </span>
        ))}
      </span>
    );
  };

  // Rounds Stats Calculation
  const scheduledCount = useMemo(() => {
    let count = 0;
    if (scheduledRounds[1]) count++;
    if (scheduledRounds[2]) count++;
    if (scheduledRounds[3]) count++;
    if (scheduledRounds[4]) count++;
    return count;
  }, [scheduledRounds]);

  const clearedCount = useMemo(() => {
    let count = 0;
    if (String(formData1?.INTR1STATUS) === "1") count++;
    if (String(formData1?.INTR2STATUS) === "1") count++;
    if (String(formData1?.INTR3STATUS) === "1") count++;
    if (String(formData1?.INTR4STATUS) === "1") count++;
    return count;
  }, [formData1]);

  const candidateInitials = useMemo(() => {
    if (!formData1?.NAME) return "NA";
    const parts = String(formData1.NAME).trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [formData1?.NAME]);

  // Determine status label & badge style for each round
  const getRoundStatusInfo = (roundNum: 1 | 2 | 3 | 4) => {
    const status = formData1?.[`INTR${roundNum}STATUS`];

    if (String(status) === "1") {
      return {
        label: "Accepted",
        tint: "#10B981",
        tintBg: "rgba(16,185,129,0.12)",
        borderColor: "rgba(16,185,129,0.35)",
        isCleared: true,
        isScheduled: true,
      };
    }
    if (String(status) === "2") {
      return {
        label: "Next Interview Needed",
        tint: "#3B82F6",
        tintBg: "rgba(59,130,246,0.12)",
        borderColor: "rgba(59,130,246,0.35)",
        isCleared: true,
        isScheduled: true,
      };
    }
    if (String(status) === "4") {
      return {
        label: "Hold",
        tint: "#F59E0B",
        tintBg: "rgba(245,158,11,0.12)",
        borderColor: "rgba(245,158,11,0.35)",
        isCleared: false,
        isScheduled: true,
      };
    }
    if (String(status) === "3") {
      return {
        label: "Rejected",
        tint: "#E11D48",
        tintBg: "rgba(225,29,72,0.12)",
        borderColor: "rgba(225,29,72,0.35)",
        isCleared: false,
        isScheduled: true,
      };
    }
    if (scheduledRounds[roundNum]) {
      return {
        label: "Scheduled",
        tint: "#F59E0B",
        tintBg: "rgba(245,158,11,0.12)",
        borderColor: "rgba(245,158,11,0.35)",
        isCleared: false,
        isScheduled: true,
      };
    }

    const isLocked = roundNum > 1 && !["1", "2"].includes(String(formData1?.[`INTR${roundNum - 1}STATUS`]));
    return {
      label: isLocked ? "Locked" : "Not started",
      tint: "#94A3B8",
      tintBg: "rgba(148,163,184,0.12)",
      borderColor: "#E2E8F0",
      isCleared: false,
      isScheduled: false,
    };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-3 sm:p-5 lg:p-7 space-y-4 max-w-[1780px] mx-auto pb-48 sm:pb-36 font-sans">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP CANDIDATE SUMMARY CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden">
        {/* Candidate Title & Pagination Row */}
        <div className="p-3.5 sm:p-[18px_20px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#1F2937]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 sm:w-[50px] sm:h-[50px] rounded-full flex items-center justify-center text-[14px] sm:text-[15px] font-[650] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF] shrink-0">
              {candidateInitials}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[16px] sm:text-[19px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-white capitalize">
                  {formData1?.NAME || "Unnamed candidate"}
                </h1>
                <span className="text-[10px] sm:text-[10.5px] font-bold text-[#F59E0B] bg-[rgba(245,158,11,.14)] px-[8px] sm:px-[9px] py-[2px] sm:py-[3px] rounded-full whitespace-nowrap">
                  {formData1?.INT_STATUS === "101"
                    ? "Selected"
                    : formData1?.INT_STATUS === "102"
                    ? "Rejected"
                    : formData1?.INT_STATUS === "103"
                    ? `Employee Code: ${formData1?.EMPCODE || "Created"}`
                    : "Interview in processing"}
                </span>
              </div>
              <p className="text-[11.5px] sm:text-[12.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-0.5 truncate">
                SR {formData1?.TRAN_ID || "—"} · {formData1?.DESIGNATION || "Role"} ·{" "}
                {formData1?.LOC_CODE1 || formData1?.LOC_CODE || "Branch"} · applied{" "}
                {formatDate(formData1?.APPLICATION_DATE1)}
              </p>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0] dark:border-[#1F2937]">
            <AButton
              type="button"
              size="sm"
              onClick={() => setIsEnglishPrintOpen(true)}
              icon={<Printer className="h-3.5 w-3.5" />}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm text-[12px] sm:text-[12.5px] font-[550] h-8 px-3 whitespace-nowrap"
            >
              English Print
            </AButton>

            <AButton
              type="button"
              size="sm"
              onClick={() => setIsHindiPrintOpen(true)}
              icon={<Printer className="h-3.5 w-3.5" />}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-sm text-[12px] sm:text-[12.5px] font-[550] h-8 px-3 whitespace-nowrap"
            >
              Hindi Print
            </AButton>
           
            <AButton
              variant="danger"
              size="sm"
              className="h-8 px-3 sm:px-4 rounded-xl flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-medium text-[12px] sm:text-[12.5px] border border-red-600 shadow-sm whitespace-nowrap"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => history.back()}
            >
              Back
            </AButton>
          
          </div>
        </div>

        {/* 6 Summary Metric Tiles with border-bottom and border-right */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-[#E2E8F0] dark:border-[#1F2937]">
          {[
            { label: "MOBILE", value: formData1?.MOB_NO || "—" },
            {
              label: "QUALIFICATION",
              value: `${formData1?.HIGH_QUAL || "—"}${formData1?.PASSING_PER ? ` · ${formData1.PASSING_PER}%` : ""}`,
            },
            {
              label: "EXPERIENCE",
              value: formData1?.EXP_IN_YEAR ? `${formData1.EXP_IN_YEAR} yrs` : "Fresher",
            },
            {
              label: "CURRENT CTC",
              value: formData1?.CURRENT_CTC ? `${formData1.CURRENT_CTC} L` : "—",
            },
            { label: "SOURCE", value: formData1?.SOURCE_OF_REG || "Referral" },
            { label: "ROUNDS CLEARED", value: `${clearedCount} of 4` },
          ].map((s, idx) => (
            <div
              key={idx}
              className="p-[10px_12px] sm:p-[12px_16px] border-b sm:border-b-0 border-r border-[#E2E8F0] dark:border-[#1F2937] [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n)]:border-r lg:last:border-r-0 min-w-0"
            >
              <div className="text-[10px] sm:text-[10.5px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase">
                {s.label}
              </div>
              <div className="text-[12px] sm:text-[13.5px] font-[600] mt-0.5 sm:mt-1 tabular-nums truncate text-[#1E293B] dark:text-[#E7ECF3]">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Collapsible Accordion Toggle */}
        <div className="p-[12px_20px_14px_20px]">
          <AButton
            type="button"
            variant="ghost"
            onClick={() => setIsRecordExpanded(!isRecordExpanded)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-[600] text-[#4F46E5] hover:underline dark:text-[#8B84FF] p-0 h-auto bg-transparent hover:bg-transparent rounded-none"
          >
            {isRecordExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>{isRecordExpanded ? "Hide full candidate record" : "Show full candidate record"}</span>
          </AButton>

          {/* Full Details Grid */}
          {isRecordExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[9px_24px] mt-[14px] pt-[14px] border-t border-[#E2E8F0] dark:border-[#1F2937] text-[12.5px]">
              {[
                { label: "SR no.", value: formData1?.TRAN_ID },
                { label: "Name", value: formData1?.NAME },
                { label: "App. date", value: formatDate(formData1?.APPLICATION_DATE1) },
                { label: "Gender", value: formData1?.GENDER },
                { label: "DOB", value: formatDate(formData1?.DOB1) },
                { label: "Email", value: formData1?.EMAIL },
                { label: "Mobile", value: formData1?.MOB_NO },
                { label: "WhatsApp no", value: formData1?.WHATSAPP_NO },
                { label: "Address", value: formData1?.ADDRESS },
                { label: "State", value: formData1?.STATE1 },
                { label: "City", value: formData1?.CITY1 },
                { label: "Designation", value: formData1?.DESIGNATION },
                { label: "Location", value: formData1?.LOC_CODE1 || formData1?.LOC_CODE },
                { label: "Aadhar no.", value: formData1?.AADHAR_NO },
                { label: "Father's name", value: formData1?.FATHERS_NAME },
                { label: "Mother's name", value: formData1?.MOTHERS_NAME },
                { label: "Religion", value: religionMapping[String(formData1?.RELIGION)?.trim()] || formData1?.RELIGION },
                { label: "Key skills", value: formData1?.SKILLS },
              ].map((d, i) => (
                <div key={i} className="flex gap-2.5 items-baseline min-w-0">
                  <span className="flex-none w-[106px] text-[#64748B] dark:text-[#94A3B8]">
                    {d.label}
                  </span>
                  <span className="flex-1 min-w-0 font-medium text-[#1E293B] dark:text-[#E7ECF3] truncate">
                    {d.value || "Not provided"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. INTERVIEW ROUNDS 4-CARD SECTION */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Section Title & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              Interview rounds
            </h2>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
              {scheduledCount} of 4 scheduled · {clearedCount} cleared
            </span>
          </div>
          <div className="flex items-center gap-[9px] text-[11px] sm:text-[11.5px] text-[#64748B] dark:text-[#94A3B8] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-[7px] h-[7px] rounded-full bg-[#10B981]" />
              Cleared
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[7px] h-[7px] rounded-full bg-[#F59E0B]" />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[7px] h-[7px] rounded-full bg-[#E2E8F0] dark:bg-[#1F2937]" />
              Not started
            </span>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[14px] items-start">
          {([1, 2, 3, 4] as (1 | 2 | 3 | 4)[]).map((roundNum) => {
            const statusInfo = getRoundStatusInfo(roundNum);
            const byField = `INTR${roundNum}BY`;
            const dateField = `INTR${roundNum}DATE`;
            const timeField = `INTR${roundNum}TIME`;
            const statusField = `INTR${roundNum}STATUS`;
            const salaryField = `INTR${roundNum}SALARY`;
            const remarkField = `INTR${roundNum}REMARK`;
            const ratingField = `INTR${roundNum}RATING`;

            const currentStatusVal = String(formData1?.[statusField] || "");
            const currentSalaryVal = formData1?.[salaryField];
            const currentRemarkVal = formData1?.[remarkField] || "";
            const currentRatingVal = formData1?.[ratingField];

            return (
              <div
                key={roundNum}
                className="rounded-[12px] bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[15px_16px_16px_16px] flex flex-col gap-[11px] transition-all"
                style={{
                  border: `1px solid ${statusInfo.borderColor}`,
                  borderTop: `3px solid ${statusInfo.tint}`,
                }}
              >
                {/* Header: [1] Round 1  |  Cleared / Scheduled / Locked */}
                <div className="flex items-center gap-[9px]">
                  <span
                    className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[11px] font-[650] tabular-nums shrink-0"
                    style={{
                      background: statusInfo.tintBg,
                      color: statusInfo.tint,
                    }}
                  >
                    {roundNum}
                  </span>
                  <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] flex-1 min-w-0">
                    Round {roundNum}
                  </span>
                  <span
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      background: statusInfo.tintBg,
                      color: statusInfo.tint,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Interviewer Select */}
                <div className="flex flex-col gap-[5px]">
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase">
                    Interviewer
                  </span>
                  <Eselect
                    title=""
                    name={byField}
                    option={empName}
                    placeholder="Select interviewer"
                    initialValue={formData1[byField]?.toString() || ""}
                    handleInputChange={handleInputChange}
                    className="!h-[36px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                  />
                </div>

                {/* Date & Time Row */}
                <div className="grid grid-cols-2 gap-[9px]">
                  <div className="flex flex-col gap-[5px] min-w-0">
                    <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase">
                      Date
                    </span>
                    <input
                      type="date"
                      value={formData1[dateField] || ""}
                      onChange={(e) => handleInputChange(dateField, e.target.value)}
                      className="w-full h-[36px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-[9px] outline-none focus:border-[#4F46E5]"
                    />
                  </div>

                  <div className="flex flex-col gap-[5px] min-w-0">
                    <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase">
                      Time
                    </span>
                    <input
                      type="time"
                      value={formatTimeToHHMM(formData1?.[timeField])}
                      onChange={(e) => {
                        const val = e.target.value;
                        const base = formData1?.[timeField]
                          ? new Date(formData1[timeField])
                          : new Date();
                        if (val && val.includes(":")) {
                          base.setUTCHours(parseInt(val.slice(0, 2)));
                          base.setUTCMinutes(parseInt(val.slice(3)));
                          handleInputChange(timeField, base.toISOString());
                        } else {
                          handleInputChange(timeField, val);
                        }
                      }}
                      className="w-full h-[36px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-[9px] outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                {/* Action Buttons: Schedule + Save + Reset */}
                <div className="flex gap-[7px]">
                  <AButton
                    type="button"
                    disabled={showScheduleMap[roundNum]}
                    onClick={() => handleScheduleRound(roundNum)}
                    icon={<Calendar className="h-4 w-4" />}
                    className="flex-1 h-[36px] rounded-[9px] text-[12px] font-[600] whitespace-nowrap bg-[#4F46E5] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Schedule</span>
                  </AButton>

                  <AButton
                    type="button"
                    variant="outline"
                    disabled={showSaveMap[roundNum]}
                    onClick={() => handleSaveRound(roundNum)}
                    icon={<Save className="h-4 w-4" />}
                    className="flex-1 h-[36px] rounded-[9px] text-[12px] font-[600] whitespace-nowrap border-[#4F46E5] text-[#4F46E5] bg-transparent hover:bg-[#EEF2FF] dark:hover:bg-[#1E1B4B] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Save</span>
                  </AButton>

                  <AButton
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={resetScheduleMap[roundNum]}
                    onClick={() => handleResetRound(roundNum)}
                    title="Reset round"
                    className="w-[32px] h-[36px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#64748B] hover:text-[#E11D48] hover:bg-[rgba(225,29,72,.1)] shrink-0 disabled:opacity-40 disabled:cursor-not-allowed p-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </AButton>
                </div>

                {/* OUTCOME Section */}
                <div className="pt-[11px] border-t border-[#E2E8F0] dark:border-[#1F2937] flex flex-col gap-[8px]">
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase">
                      Outcome
                    </span>
                    <div className="flex-1" />
                    {currentRatingVal ? (
                      <span className="flex items-center gap-[4px] text-[12px] font-[650] text-[#F59E0B] tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        {currentRatingVal}
                      </span>
                    ) : null}
                  </div>

                  {/* 4 Outcome Options (Disabled / View-only in card) */}
                  <div className="grid grid-cols-2 gap-[6px]">
                    {[
                      { val: "1", label: "Accepted", color: "#10B981" },
                      { val: "2", label: "Next Interview Needed", color: "#3B82F6" },
                      { val: "3", label: "Rejected", color: "#E11D48" },
                      { val: "4", label: "Hold", color: "#F59E0B" },
                    ].map((btn) => {
                      const isSelected = String(currentStatusVal) === btn.val;
                      return (
                        <AButton
                          key={btn.val}
                          type="button"
                          disabled
                          className={`py-[6px] px-[6px] text-[11px] font-[600] rounded-[8px] transition whitespace-nowrap text-center select-none cursor-default h-auto min-h-0 ${
                            isSelected ? "" : "opacity-45"
                          }`}
                          style={{
                            border: isSelected ? `1px solid ${btn.color}80` : "1px solid #E2E8F0",
                            background: isSelected ? `${btn.color}1A` : "transparent",
                            color: isSelected ? btn.color : "#64748B",
                          }}
                        >
                          {btn.label}
                        </AButton>
                      );
                    })}
                  </div>

                  {/* Salary Thinks Of */}
                  <div className="flex flex-col gap-[5px]">
                    <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase">
                      Salary thinks of
                    </span>
                    <input
                      type="text"
                      placeholder="Expected monthly ₹"
                      value={currentSalaryVal != null ? currentSalaryVal : ""}
                      onChange={(e) => handleInputChange(salaryField, e.target.value)}
                      className="w-full h-[36px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-[9px] outline-none focus:border-[#4F46E5]"
                    />
                  </div>

                  {/* Remark */}
                  <input
                    type="text"
                    placeholder="Remark…"
                    value={currentRemarkVal}
                    onChange={(e) => handleInputChange(remarkField, e.target.value)}
                    className="w-full h-[36px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] px-[9px] outline-none focus:border-[#4F46E5]"
                  />

                  {/* View Rating Sheet Button */}
                  <AButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIntrvViewRating(roundNum);
                      setIsRatingOpen(true);
                    }}
                    icon={<FileText className="h-3.5 w-3.5" />}
                    className="w-full h-[34px] border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#4F46E5] hover:bg-[#EEF2FF] dark:hover:bg-[#1E1B4B] text-[12px] font-[600] rounded-[9px]"
                  >
                    <span>View rating sheet</span>
                  </AButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. STICKY BOTTOM ACTION FOOTER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
        }}
        className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-[#E2E8F0] dark:border-[#1F2937] p-2.5 pb-5 sm:p-[12px_24px] shadow-lg transition-[left] duration-150 ease-in-out"
      >
        <div className="max-w-[1780px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Progress Badge & Reason Input */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <span
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
              style={{
                background: `conic-gradient(#10B981 ${(clearedCount / 4) * 360}deg, #E2E8F0 0)`,
              }}
            >
              <span className="w-[22px] h-[22px] rounded-full bg-white dark:bg-[#111827] flex items-center justify-center text-[9.5px] font-[650] tabular-nums">
                {clearedCount}/4
              </span>
            </span>

            <input
              type="text"
              placeholder="Final reason / remark for the decision…"
              value={formData1?.HR_REASON || ""}
              onChange={(e) => handleInputChange("HR_REASON", e.target.value)}
              disabled={
                formData1?.INT_STATUS == "101" ||
                formData1?.INT_STATUS == "102" ||
                formData1?.INT_STATUS == "103" ||
                formData1?.INT_STATUS == "104"
              }
              className="w-full md:w-[340px] lg:w-[460px] h-[36px] sm:h-[38px] px-[11px] text-[12px] sm:text-[12.5px] font-medium rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] placeholder:text-[#64748B] outline-none focus:border-[#4F46E5] shadow-2xs disabled:opacity-50"
            />
          </div>

          {/* Right: Decision Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 justify-end w-full md:w-auto">
            {/* Reject Button */}
            <AButton
              type="button"
              variant="outline"
              onClick={handleRejectCandidate}
              disabled={
                formData1?.INT_STATUS == "101" ||
                formData1?.INT_STATUS == "103" ||
                formData1?.INT_STATUS == "104" ||
                formData1?.INT_STATUS == "102"
              }
              icon={<X className="h-4 w-4" />}
              className="h-[36px] sm:h-[38px] px-[12px] sm:px-[14px] rounded-[10px] text-[12px] sm:text-[12.5px] font-[600] border-[rgba(225,29,72,.4)] text-[#E11D48] bg-transparent hover:bg-[rgba(225,29,72,.09)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Reject</span>
            </AButton>

            {/* Select Button */}
            <AButton
              type="button"
              onClick={handleSelectCandidate}
              disabled={
                formData1?.INTR1STATUS == null
                  ? true
                  : formData1?.INT_STATUS == "102" ||
                    formData1?.INT_STATUS == "3" ||
                    formData1?.INT_STATUS == "100"
                  ? false
                  : true
              }
              icon={<Check className="h-4 w-4" />}
              className="h-[36px] sm:h-[38px] px-[12px] sm:px-[14px] rounded-[10px] text-[12px] sm:text-[12.5px] font-[600] bg-[#10B981] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <span>Select</span>
            </AButton>

            <span className="w-[1px] h-[26px] bg-[#E2E8F0] dark:bg-[#1F2937] hidden lg:block" />

            {/* Home Visit Verification Button */}
            {formData1?.INT_STATUS != "103" && (
              <AButton
                type="button"
                variant="outline"
                onClick={() => setIsHomeVisitOpen(true)}
                disabled={formData1?.INT_STATUS == "101" ? false : true}
                icon={<Home className="h-4 w-4 text-[#64748B]" />}
                className="col-span-2 sm:col-auto h-[36px] sm:h-[38px] px-[12px] sm:px-[14px] rounded-[10px] text-[12px] sm:text-[12.5px] font-[550] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Home visit verification</span>
              </AButton>
            )}

            {/* Create Employee Master Button */}
            {formData1?.INT_STATUS != "103" && (
              <AButton
                type="button"
                onClick={handleOpenCreateEmpModal}
                disabled={formData1?.INT_STATUS == "101" ? false : true}
                icon={<UserPlus className="h-4 w-4" />}
                className="col-span-2 sm:col-auto h-[36px] sm:h-[38px] px-[14px] sm:px-[16px] rounded-[10px] text-[12px] sm:text-[12.5px] font-[600] bg-[#4F46E5] hover:brightness-110 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <span>Create employee master</span>
              </AButton>
            )}

            {/* Remove from Employee Master Button (if created) */}
            {formData1?.INT_STATUS == "103" && (
              <AButton
                type="button"
                variant="outline"
                onClick={handleRemoveFromEmployeeMaster}
                className="col-span-2 sm:col-auto !h-9 sm:!h-10 !px-4 !rounded-xl !text-xs sm:!text-sm !font-semibold !border-rose-200 !text-rose-600 hover:!bg-rose-50 cursor-pointer"
              >
                <XCircle className="h-4 w-4 mr-1" />
                <span>Remove from Employee Master</span>
              </AButton>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. MODALS & DIALOGS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}

      {/* Create Employee Master Modal */}
      <Dialog open={isEmpModalOpen} onOpenChange={setIsEmpModalOpen}>
        <DialogContent className="w-full max-w-2xl bg-white dark:bg-[#0B1220] p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Create Employee Master
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 pt-1">
              Assign employee code and organizational details to onboard candidate.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Employee Code
              </label>
              <Einput
                disabled
                type="text"
                title="Employee Code"
                name="EMPCODE"
                value={formData1?.EMPCODE || ""}
                handleInputChange={handleInputChange}
                className="!h-10 !font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Date of Joining <span className="text-rose-500">*</span>
              </label>
              <Einput
                type="date"
                title="Date of Joining"
                name="CURRENTJOINDATE"
                value={formData1?.CURRENTJOINDATE || ""}
                handleInputChange={handleInputChange}
                className="!h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Location <span className="text-rose-500">*</span>
              </label>
              <Eselect
                title="Select location"
                name="LOC_CODE"
                option={locationOptions}
                initialValue={formData1?.LOC_CODE?.toString() || ""}
                handleInputChange={handleInputChange}
                className="!h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Designation <span className="text-rose-500">*</span>
              </label>
              <Eselect
                title="Select designation"
                name="DESIGNATION"
                option={designationOptions}
                initialValue={formData1?.DESIGNATION?.toString() || ""}
                handleInputChange={handleInputChange}
                className="!h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <Eselect
                title="Select department"
                name="DIVISION"
                option={divisionOptions}
                initialValue={formData1?.DIVISION?.toString() || ""}
                handleInputChange={handleInputChange}
                className="!h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Region <span className="text-rose-500">*</span>
              </label>
              <Eselect
                title="Select region"
                name="Sal_Region"
                option={salRegionOptions}
                initialValue={formData1?.Sal_Region?.toString() || ""}
                handleInputChange={handleInputChange}
                className="!h-10"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <AButton
              type="button"
              variant="outline"
              onClick={() => setIsEmpModalOpen(false)}
              className="h-10 px-5 rounded-xl border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </AButton>

            <AButton
              type="button"
              onClick={handleCreateEmployeeMaster}
              disabled={isCreatingEmployee}
              loading={isCreatingEmployee}
              className="h-10 px-6 rounded-xl bg-[#193A69] hover:bg-[#153157] text-white text-sm font-semibold shadow-sm disabled:opacity-70"
            >
              Confirm & Create
            </AButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Home Visit Verification Modal */}
      <Dialog open={isHomeVisitOpen} onOpenChange={setIsHomeVisitOpen}>
        <DialogContent className="w-full max-w-5xl max-h-[92vh] overflow-y-auto p-0 bg-transparent border-0 shadow-2xl rounded-2xl">
          <div className="bg-[#F8FAFC] dark:bg-[#0A0F1C] rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-4">
            <HomeVisitVerification
              initialData={formData1}
              onSaveSuccess={() => {
                setIsHomeVisitOpen(false);
                showSideAlert("Home visit verification saved successfully", "success");
              }}
              onCancel={() => setIsHomeVisitOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Sheet Modal */}
      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent className="w-full max-w-2xl bg-white dark:bg-[#0B1220] p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Rating Details View — Round {intrvViewRating || 1}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 pt-1">
              Evaluation criteria ratings scored by the interviewer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {formData1?.EvaluationCriteria?.filter(
              (item: any) => String(item.Member_Name) === String(intrvViewRating)
            ).length > 0 ? (
              formData1.EvaluationCriteria.filter(
                (item: any) => String(item.Member_Name) === String(intrvViewRating)
              ).map((item: any, index: number) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-sm"
                >
                  <div className="col-span-12 sm:col-span-5 font-semibold text-slate-900 dark:text-slate-100">
                    {item.Nominee_Name || `Criteria #${index + 1}`}
                  </div>

                  <div className="col-span-6 sm:col-span-4 flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Rating:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        ratingStyleMap[item.Is_Minor] ||
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {getRatingLabel(item.Is_Minor)}
                    </span>
                  </div>

                  <div className="col-span-6 sm:col-span-3 flex justify-end">
                    {renderStars(item.Is_Minor)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                No evaluation rating details found for Round {intrvViewRating || 1}.
              </div>
            )}

            {/* Average Rating Banner */}
            <div className="flex items-center justify-center gap-2.5 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500">Average Rating:</span>
              <span className="px-3.5 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                {formData1?.[`INTR${intrvViewRating}RATING`] ?? "—"}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* English Printout Modal */}
      <Dialog open={isEnglishPrintOpen} onOpenChange={setIsEnglishPrintOpen}>
        <DialogContent className="w-full max-w-5xl h-[92vh] max-h-[92vh] p-4 bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 pr-8 shrink-0">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                English Printout — {formData1?.NAME || "Candidate"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                SR: {formData1?.TRAN_ID || "—"} · Role: {formData1?.DESIGNATION || "—"}
              </DialogDescription>
            </div>
            <AButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handlePrintDocument("english-print-content-area")}
              icon={<Printer className="h-4 w-4" />}
            >
              Print
            </AButton>
          </DialogHeader>

          <div
            id="english-print-content-area"
            className="flex-1 min-h-0 w-full overflow-hidden bg-slate-100 dark:bg-slate-950 p-1 sm:p-2 rounded-xl flex flex-col"
          >
            <Printout formData1={formData1} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Hindi Printout Modal */}
      <Dialog open={isHindiPrintOpen} onOpenChange={setIsHindiPrintOpen}>
        <DialogContent className="w-full max-w-5xl h-[92vh] max-h-[92vh] p-4 bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 pr-8 shrink-0">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                हिंदी प्रिंटआउट — {formData1?.NAME || "उम्मीदवार"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                फॉर्म संख्या: {formData1?.TRAN_ID || "—"} · पद: {formData1?.DESIGNATION || "—"}
              </DialogDescription>
            </div>
            <AButton
              type="button"
              size="sm"
              onClick={() => handlePrintDocument("hindi-print-content-area")}
              icon={<Printer className="h-4 w-4" />}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              Print
            </AButton>
          </DialogHeader>

          <div
            id="hindi-print-content-area"
            className="flex-1 min-h-0 w-full overflow-hidden bg-slate-100 dark:bg-slate-950 p-1 sm:p-2 rounded-xl flex flex-col"
          >
            <HindiPrintout formData1={formData1} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Loader Component */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
