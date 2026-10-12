"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Cake,
  Heart,
  Briefcase,
  Download,
  MessageSquare,
  Check,
  Send,
  ArrowLeft,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import SkeletonLoader from "@/components/atoms/SkeletonLoader";
import useExcelDownload from "@/app/hooks/excel-download";
import AInput from "@/components/atoms/Input";
import AButton from "@/components/atoms/Button";

const avatarColors = [
  "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
  "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
  "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
  "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60",
  "bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60",
  "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60",
  "bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60",
];

function getAvatarColor(str: string = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
}

function getInitials(name: string = "") {
  if (!name) return "EM";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function toTitleCase(str: string = "") {
  if (!str) return "—";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getTodayFormatted() {
  const today = new Date();
  const year = today.getFullYear();
  let month = (today.getMonth() + 1).toString().padStart(2, "0");
  let day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TEMPLATES: Record<string, { label: string; text: string }[]> = {
  "1": [
    {
      label: "Warm & simple",
      text: "Hi {name}, happy birthday! 🎂 Wishing you a wonderful year ahead. — Team Autovyn",
    },
    {
      label: "Formal",
      text: "Dear {name}, wishing you a very Happy Birthday! May this year bring continued success, health, and happiness. — Team Autovyn",
    },
    {
      label: "Inspiring",
      text: "Happy Birthday {name}! 🌟 Thank you for your dedication as {desig}. Wishing you an amazing year of growth and joy! — Team Autovyn",
    },
  ],
  "2": [
    {
      label: "Work anniversary",
      text: "Happy Work Anniversary {name}! 💼 Thank you for your valuable contribution and dedication to our {dept} team. — Team Autovyn",
    },
    {
      label: "Appreciation",
      text: "Congratulations {name} on completing another milestone year with us! 🏆 Wishing you continued growth and success. — Team Autovyn",
    },
  ],
  "3": [
    {
      label: "Warm & simple",
      text: "Happy Marriage Anniversary {name}! 💍 Wishing you and your spouse a wonderful journey filled with love and happiness. — Team Autovyn",
    },
    {
      label: "Blessings",
      text: "Dear {name}, warmest congratulations on your Marriage Anniversary! 💐 May your bond grow stronger with each passing year. — Team Autovyn",
    },
  ],
};

export default function WishWellPage() {
  const user = useCurrentUser();
  const { handleExcelDownload } = useExcelDownload();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [currentDate, setCurrentDate] = useState<string>(getTodayFormatted());
  const [occasion, setOccasion] = useState<string>("1"); // 1: Birthday, 2: Work Anniversary, 3: Marriage Anniversary
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Tab counts
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    "1": 0,
    "2": 0,
    "3": 0,
  });

  // Today's summary stats from mobile/aniversery/today
  const [todayStats, setTodayStats] = useState({
    birthdays: 0,
    workAnniversaries: 0,
    marriageAnniversaries: 0,
    messagesSent: 0,
  });

  const [sendMode, setSendMode] = useState<"auto" | "manual">("auto"); // "auto" for Bulk API send, "manual" for WhatsApp Web redirect
  const [activeTemplateIdx, setActiveTemplateIdx] = useState<number>(0);
  const [messageText, setMessageText] = useState<string>(TEMPLATES["1"][0].text);

  // Show Toast
  const showToast = (message: string, icon: "success" | "warning" | "error" | "info" = "info") => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: icon,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  // Fetch employees for selected occasion and date
  const fetchEmployeeData = async (occ: string, dateVal: string) => {
    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    if (!compCodeVal) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setSelectedCodes(new Set());
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/pot_cust/getsendwishemp`,
        {
          date: dateVal,
          occasion: `${occ}`,
          loc_code: user?.branch || user?.loc_code || (user as any)?.Loc_Code || (user as any)?.BRANCH || "",
          compcode: compCodeVal,
        },
        {
          headers: {
            compcode: compCodeVal,
            Comp_Code: compCodeVal,
            comp_code: compCodeVal,
            name: user?.name,
            token: user?.email,
          },
        }
      );

      const list = response.data?.Result || response.data?.data || [];
      setTabledata(list);
      setCounts((prev) => ({
        ...prev,
        [occ]: list.length,
      }));
      setTodayStats((prev) => {
        if (occ === "1") return { ...prev, birthdays: list.length };
        if (occ === "2") return { ...prev, workAnniversaries: list.length };
        if (occ === "3") return { ...prev, marriageAnniversaries: list.length };
        return prev;
      });
    } catch (error) {
      console.error("Error fetching wish employees:", error);
      setTabledata([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all occasion counts for top badge display
  const fetchOccasionCounts = async (dateVal: string) => {
    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    if (!compCodeVal) return;
    try {
      const occs = ["1", "2", "3"];
      const promises = occs.map((o) =>
        axios.post(
          `${process.env.NEXT_PUBLIC_URL}/pot_cust/getsendwishemp`,
          {
            date: dateVal,
            occasion: o,
            loc_code: user?.branch || user?.loc_code || (user as any)?.Loc_Code || (user as any)?.BRANCH || "",
            compcode: compCodeVal,
          },
          {
            headers: {
              compcode: compCodeVal,
              Comp_Code: compCodeVal,
              comp_code: compCodeVal,
              name: user?.name,
              token: user?.email,
            },
          }
        )
      );

      const results = await Promise.allSettled(promises);
      const newCounts: { [key: string]: number } = {};
      results.forEach((res, idx) => {
        const occKey = occs[idx];
        if (res.status === "fulfilled") {
          const list = res.value.data?.Result || res.value.data?.data || [];
          newCounts[occKey] = list.length;
        } else {
          newCounts[occKey] = 0;
        }
      });
      setCounts((prev) => ({ ...prev, ...newCounts }));
      setTodayStats((prev) => ({
        ...prev,
        birthdays: newCounts["1"] ?? prev.birthdays,
        workAnniversaries: newCounts["2"] ?? prev.workAnniversaries,
        marriageAnniversaries: newCounts["3"] ?? prev.marriageAnniversaries,
      }));
    } catch (err) {
      console.error("Error fetching occasion counts:", err);
    }
  };

  // Fetch Today's Stats from API `mobile/aniversery/today`
  const fetchTodayStats = async () => {
    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    if (!compCodeVal) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/aniversery/today`,
        {
          loc_code: user?.branch || user?.loc_code || (user as any)?.Loc_Code || (user as any)?.BRANCH || "",
          date: currentDate,
          compcode: compCodeVal,
        },
        {
          headers: {
            compcode: compCodeVal,
            Comp_Code: compCodeVal,
            comp_code: compCodeVal,
            name: user?.name,
            token: user?.email,
          },
        }
      );

      const resData = response.data?.Result || response.data?.data || response.data || {};
      let bCount = 0;
      let wCount = 0;
      let aCount = 0;
      let sCount = 0;

      if (Array.isArray(resData)) {
        bCount = resData.filter((x: any) => x.type == 1 || x.occasion == 1 || x.occasion == "1" || x.dob).length;
        wCount = resData.filter((x: any) => x.type == 2 || x.occasion == 2 || x.occasion == "2" || x.currentjoindate).length;
        aCount = resData.filter((x: any) => x.type == 3 || x.occasion == 3 || x.occasion == "3" || x.dom).length;
        sCount = resData.filter((x: any) => x.isSent || x.sent).length;
      } else if (typeof resData === "object" && resData !== null) {
        bCount =
          resData.birthdays ??
          resData.BirthdayToday ??
          resData.Birthday ??
          resData.birthday ??
          resData.birthday_count ??
          (Array.isArray(resData.birthdays) ? resData.birthdays.length : 0);

        wCount =
          resData.workAnniversaries ??
          resData.WorkAnniversaryToday ??
          resData.WorkAnniversary ??
          resData.workAnniversary ??
          resData.work_count ??
          (Array.isArray(resData.workAnniversaries) ? resData.workAnniversaries.length : 0);

        aCount =
          resData.marriageAnniversaries ??
          resData.AnniversaryToday ??
          resData.Anniversary ??
          resData.anniversary ??
          resData.marriage_count ??
          (Array.isArray(resData.marriageAnniversaries) ? resData.marriageAnniversaries.length : 0);

        sCount =
          resData.messagesSent ??
          resData.TotalSent ??
          resData.sent_today ??
          resData.sent_count ??
          0;
      }

      const sentKey = `wishwell_sent_${compCodeVal}_${currentDate}`;
      const localSent = typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
      const finalSent = sCount > 0 ? Math.max(sCount, localSent) : localSent;

      setTodayStats((prev) => ({
        birthdays: bCount || prev.birthdays,
        workAnniversaries: wCount || prev.workAnniversaries,
        marriageAnniversaries: aCount || prev.marriageAnniversaries,
        messagesSent: finalSent,
      }));
    } catch (error) {
      console.warn("Could not fetch today stats from mobile/aniversery/today", error);
      const sentKey = `wishwell_sent_${compCodeVal}_${currentDate}`;
      const localSent = typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
      setTodayStats((prev) => ({
        ...prev,
        messagesSent: localSent,
      }));
    }
  };

  // Initial load on mount and when user / date changes
  useEffect(() => {
    fetchEmployeeData(occasion, currentDate);
    fetchOccasionCounts(currentDate);
    fetchTodayStats();
  }, [user, currentDate]);

  // When occasion changes
  const handleOccasionChange = (newOcc: string) => {
    setOccasion(newOcc);
    fetchEmployeeData(newOcc, currentDate);
    setActiveTemplateIdx(0);
    const available = TEMPLATES[newOcc] || TEMPLATES["1"];
    setMessageText(available[0]?.text || "");
  };

  // When template chip changes
  const handleTemplateSelect = (idx: number) => {
    setActiveTemplateIdx(idx);
    const available = TEMPLATES[occasion] || TEMPLATES["1"];
    if (available[idx]) {
      setMessageText(available[idx].text);
    }
  };

  // Selection handlers
  const handleSelectAll = (isChecked: boolean) => {
    if (sendMode === "manual") return;
    if (isChecked) {
      const allCodes = new Set(tabledata.map((r) => String(r.empcode || r.id)));
      setSelectedCodes(allCodes);
    } else {
      setSelectedCodes(new Set());
    }
  };

  const handleToggleRow = (empcode: string) => {
    if (sendMode === "manual") {
      const next = new Set<string>();
      if (!selectedCodes.has(empcode)) {
        next.add(empcode);
      }
      setSelectedCodes(next);
      return;
    }
    const next = new Set(selectedCodes);
    if (next.has(empcode)) {
      next.delete(empcode);
    } else {
      next.add(empcode);
    }
    setSelectedCodes(next);
  };

  const handleSendModeChange = (mode: "auto" | "manual") => {
    setSendMode(mode);
    if (mode === "manual") {
      setSelectedCodes((prev) => {
        if (prev.size > 1) {
          const first = Array.from(prev)[0];
          return new Set(first ? [first] : []);
        }
        return prev;
      });
    }
  };

  const isAllSelected = tabledata.length > 0 && selectedCodes.size === tabledata.length;
  const isIndeterminate = selectedCodes.size > 0 && selectedCodes.size < tabledata.length;

  // Insert variable tag into message
  const insertVariable = (variableKey: string) => {
    const tag = `{${variableKey}}`;
    if (!textareaRef.current) {
      setMessageText((prev) => prev + " " + tag);
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const nextText =
      messageText.substring(0, start) +
      tag +
      messageText.substring(end, messageText.length);
    setMessageText(nextText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Dynamic preview text calculation
  const previewText = useMemo(() => {
    const selectedList = tabledata.filter((r) => selectedCodes.has(String(r.empcode || r.id)));
    const sampleEmp = selectedList.length > 0 ? selectedList[0] : tabledata[0];
    const name = toTitleCase(sampleEmp?.empname || "Altaf");
    const desig = toTitleCase(sampleEmp?.employeedesignation || "Relationship Manager");
    const dept = toTitleCase(sampleEmp?.labeldivision || "Sales");
    const years = "5";

    return messageText
      .replace(/{name}/g, name)
      .replace(/{desig}/g, desig)
      .replace(/{dept}/g, dept)
      .replace(/{years}/g, years);
  }, [messageText, selectedCodes, tabledata]);

  // Send WhatsApp Wishes
  const handleSendWhatsApp = async () => {
    if (!tabledata || tabledata.length === 0) {
      showToast("No employees available to send wishes", "warning");
      return;
    }

    const recipients =
      selectedCodes.size > 0
        ? tabledata.filter((r) => selectedCodes.has(String(r.empcode || r.id)))
        : tabledata;

    const empCodesList = recipients
      .map((item) => item?.empcode || item?.id)
      .filter(Boolean);

    if (empCodesList.length === 0) {
      showToast("Please select at least one employee", "warning");
      return;
    }

    const confirmResult = await Swal.fire({
      icon: "question",
      title: "Send WhatsApp Wishes?",
      text: `Are you sure you want to send wishes to ${empCodesList.length} employee(s) over WhatsApp?`,
      showCancelButton: true,
      confirmButtonText: "Yes, Send",
      confirmButtonColor: "#25D366",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) return;

    setIsSending(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/pot_cust/sendwishonwhatsapp`,
        {
          empcodes: empCodesList.join(", "),
          date: currentDate,
          occasion: occasion,
          message: messageText,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (response.data?.status || response.status === 200) {
        const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
        const sentKey = `wishwell_sent_${compCodeVal}_${currentDate}`;
        const prevSent = typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
        const updatedSent = prevSent + empCodesList.length;
        if (typeof window !== "undefined") {
          localStorage.setItem(sentKey, String(updatedSent));
        }

        setTodayStats((prev) => ({
          ...prev,
          messagesSent: updatedSent,
        }));

        await Swal.fire({
          icon: "success",
          title: "Wishes Sent!",
          text: response.data?.Message || "WhatsApp wishes sent successfully.",
          confirmButtonColor: "#25D366",
        });
        setSelectedCodes(new Set());
        fetchEmployeeData(occasion, currentDate);
        fetchTodayStats();
      } else {
        showToast(response.data?.Message || "Failed to send wishes.", "error");
      }
    } catch (error: any) {
      console.error("Error sending whatsapp wishes:", error);
      Swal.fire({
        icon: "error",
        title: "Error Sending",
        text:
          error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Failed to send wishes over WhatsApp.",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Manual WhatsApp redirect for a single employee
  const handleManualWhatsApp = (targetRow?: any) => {
    let target = targetRow;
    if (!target) {
      const selectedList = tabledata.filter((r) => selectedCodes.has(String(r.empcode || r.id)));
      target = selectedList.length > 0 ? selectedList[0] : tabledata[0];
    }

    if (!target) {
      showToast("Please select an employee first", "warning");
      return;
    }

    const mobile = String(target?.mobileno || "").trim().replace(/\D/g, "");
    if (!mobile || mobile.length < 10) {
      showToast(`Invalid mobile number for ${toTitleCase(target?.empname || "employee")}`, "warning");
      return;
    }

    const phone = mobile.length === 10 ? `91${mobile}` : mobile.startsWith("91") ? mobile : `91${mobile}`;

    const name = toTitleCase(target?.empname || "Employee");
    const desig = toTitleCase(target?.employeedesignation || "Colleague");
    const dept = toTitleCase(target?.labeldivision || "Team");
    const years = "5";

    const personalized = messageText
      .replace(/{name}/g, name)
      .replace(/{desig}/g, desig)
      .replace(/{dept}/g, dept)
      .replace(/{years}/g, years);

    const encoded = encodeURIComponent(personalized);
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;

    // Track sent count
    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    const sentKey = `wishwell_sent_${compCodeVal}_${currentDate}`;
    const prevSent = typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
    const updatedSent = prevSent + 1;
    if (typeof window !== "undefined") {
      localStorage.setItem(sentKey, String(updatedSent));
    }
    setTodayStats((prev) => ({
      ...prev,
      messagesSent: updatedSent,
    }));

    window.open(waUrl, "_blank");
    showToast(`Opening WhatsApp for ${name}`, "success");
  };

  // Excel Download Action
  const handleExportExcel = () => {
    if (!tabledata || tabledata.length === 0) {
      showToast("No records to export", "warning");
      return;
    }

    const exportCols = [
      { Header: "Emp. Code", accessor: "empcode" },
      { Header: "Emp. Name", accessor: "empname" },
      { Header: "Location", accessor: "branch" },
      { Header: "Designation", accessor: "employeedesignation" },
      { Header: "Department", accessor: "labeldivision" },
      {
        Header: occasion === "1" ? "DOB" : occasion === "2" ? "DOJ" : "DOM",
        accessor: occasion === "1" ? "dob" : occasion === "2" ? "currentjoindate" : "dom",
      },
      { Header: "Mobile No.", accessor: "mobileno" },
    ];

    handleExcelDownload(exportCols, tabledata);
  };

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleString("default", { month: "short" });
  }, []);

  const occasionTitle =
    occasion === "1"
      ? "BIRTHDAYS TODAY"
      : occasion === "2"
      ? "WORK ANNIVERSARIES TODAY"
      : "ANNIVERSARIES TODAY";

  const dateHeader = occasion === "1" ? "DOB" : occasion === "2" ? "DOJ" : "DOM";

  return (
    <div className="w-full min-h-screen pb-16 space-y-4 font-['Inter',system-ui,sans-serif] text-[#1E293B] dark:text-[#E7ECF3]">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-[18px]">
        <div>
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            WishWell
          </h1>
          <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Send birthday, anniversary and work-anniversary wishes over WhatsApp or SMS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[9px]">
          {/* Date Picker using AInput */}
          <AInput
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            containerClassName="w-auto"
            className="!h-[35px] !text-[12.5px] font-normal !border-[#E2E8F0] dark:!border-[#1F2937] !rounded-[10px] !bg-white dark:!bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] px-[11px] py-[8px] outline-none focus:!border-[#4F46E5] cursor-pointer"
          />

          {/* Export to Excel using AButton */}
          <AButton
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            className="!h-[35px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] !text-[12.5px] font-[550] px-[13px] py-[8px] !rounded-[10px] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] whitespace-nowrap cursor-pointer shadow-none gap-[7px]"
            icon={<Download className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />}
          >
            Export to Excel
          </AButton>

          {/* Back button using AButton */}
          <AButton
            type="button"
            variant="outline"
            onClick={() => history.back()}
            className="!h-[35px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] !text-[12.5px] font-[550] px-[12px] py-[8px] !rounded-[10px] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] whitespace-nowrap cursor-pointer shadow-none gap-[7px]"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </AButton>
        </div>
      </div>

      {/* 2. Occasion Tabs & Channel Badge */}
      <div className="flex items-center gap-[10px] flex-wrap mb-[16px]">
        <div className="flex gap-[3px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[3px]">
          {/* Birthday Tab */}
          <AButton
            type="button"
            variant={occasion === "1" ? "primary" : "ghost"}
            onClick={() => handleOccasionChange("1")}
            className={`!border-none !text-[12.5px] font-[600] px-[14px] py-[8px] !h-auto !rounded-[8px] cursor-pointer whitespace-nowrap transition-colors shadow-none gap-[7px] ${
              occasion === "1"
                ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
            icon={<Cake className="w-4 h-4" />}
          >
            <span>Birthday</span>
            <span className="text-[11px] opacity-75 font-mono ml-0.5">{counts["1"] || 0}</span>
          </AButton>

          {/* Marriage Anniversary Tab */}
          <AButton
            type="button"
            variant={occasion === "3" ? "primary" : "ghost"}
            onClick={() => handleOccasionChange("3")}
            className={`!border-none !text-[12.5px] font-[600] px-[14px] py-[8px] !h-auto !rounded-[8px] cursor-pointer whitespace-nowrap transition-colors shadow-none gap-[7px] ${
              occasion === "3"
                ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
            icon={<Heart className="w-4 h-4" />}
          >
            <span>Anniversary</span>
            <span className="text-[11px] opacity-75 font-mono ml-0.5">{counts["3"] || 0}</span>
          </AButton>

          {/* Work Anniversary Tab */}
          <AButton
            type="button"
            variant={occasion === "2" ? "primary" : "ghost"}
            onClick={() => handleOccasionChange("2")}
            className={`!border-none !text-[12.5px] font-[600] px-[14px] py-[8px] !h-auto !rounded-[8px] cursor-pointer whitespace-nowrap transition-colors shadow-none gap-[7px] ${
              occasion === "2"
                ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
            }`}
            icon={<Briefcase className="w-4 h-4" />}
          >
            <span>Work anniversary</span>
            <span className="text-[11px] opacity-75 font-mono ml-0.5">{counts["2"] || 0}</span>
          </AButton>
        </div>

        <div className="flex-1"></div>

        {/* Channel Indicator */}
        <div className="flex items-center gap-[8px]">
          <span className="text-[11.5px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
            Channel
          </span>
          <div className="flex gap-[3px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[3px]">
            <button
              type="button"
              className="flex items-center gap-[6px] border-none bg-[#4F46E5] text-white text-[12px] font-[600] px-[12px] py-[6px] rounded-[8px] whitespace-nowrap"
            >
              <FaWhatsapp className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout (Left Table + Right Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        {/* Left Column: Table Card */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Card Header Banner */}
          <div className="flex items-center gap-[10px] px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
            <span className="text-[#4F46E5] dark:text-[#8B84FF] flex items-center">
              {occasion === "1" ? (
                <Cake className="w-4 h-4" />
              ) : occasion === "2" ? (
                <Briefcase className="w-4 h-4" />
              ) : (
                <Heart className="w-4 h-4" />
              )}
            </span>
            <h2 className="m-0 flex-1 text-[13px] font-[600] tracking-[0.04em] uppercase text-[#1E293B] dark:text-[#E7ECF3]">
              {occasion === "1"
                ? "Birthdays today"
                : occasion === "2"
                ? "Work anniversaries"
                : "Wedding anniversaries"}
            </h2>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-mono whitespace-nowrap">
              {tabledata.length} {tabledata.length === 1 ? "employee" : "employees"}
            </span>
          </div>

          {/* Skeleton Loading or Table */}
          {isLoading ? (
            <div className="p-6">
              <SkeletonLoader />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937] select-none">
                    <tr>
                      {/* Checkbox Column */}
                      <th className="w-[44px] px-[11px] py-[11px] text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (sendMode === "manual") return;
                            handleSelectAll(!isAllSelected);
                          }}
                          disabled={sendMode === "manual"}
                          className="grid place-items-center border-none bg-transparent cursor-pointer p-0 m-auto"
                        >
                          <span
                            className={`w-4 h-4 rounded-[4px] grid place-items-center border-[1.5px] transition-colors ${
                              isAllSelected
                                ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                                : "border-[#E2E8F0] dark:border-[#1F2937] bg-transparent"
                            }`}
                          >
                            {isAllSelected ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : isIndeterminate ? (
                              <div className="w-2 h-[2px] bg-[#4F46E5] rounded-full" />
                            ) : null}
                          </span>
                        </button>
                      </th>

                      <th className="px-[12px] py-[11px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        Emp. code
                      </th>
                      <th className="px-[12px] py-[11px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        Emp. name
                      </th>
                      <th className="px-[12px] py-[11px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        Location
                      </th>
                      <th className="px-[12px] py-[11px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        Designation
                      </th>
                      <th className="px-[12px] py-[11px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        Department
                      </th>
                      <th className="px-[12px] py-[11px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        {dateHeader}
                      </th>
                      <th className="px-[12px] py-[11px] text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        Mobile no.
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937] bg-white dark:bg-[#111827]">
                    {tabledata.map((row: any, idx: number) => {
                      const rowCode = String(row.empcode || row.id || idx);
                      const isChecked = selectedCodes.has(rowCode);
                      const isManual = sendMode === "manual";
                      const isRowDisabled = isManual && selectedCodes.size >= 1 && !isChecked;
                      const name = row.empname || "—";
                      const formattedName = toTitleCase(name);
                      const initials = getInitials(name);
                      const avatarColor = getAvatarColor(name);
                      const location = toTitleCase(row.branch || "Branch - 1");
                      const designation = toTitleCase(row.employeedesignation || "—");
                      const department = toTitleCase(row.labeldivision || "—");
                      const dateVal =
                        occasion === "1" ? row.dob : occasion === "2" ? row.currentjoindate : row.dom;

                      return (
                        <tr
                          key={rowCode}
                          onClick={() => {
                            if (isRowDisabled) return;
                            handleToggleRow(rowCode);
                          }}
                          className={`transition-colors border-b border-[#E2E8F0] dark:border-[#1F2937] ${
                            isRowDisabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer"
                          } ${
                            isChecked
                              ? "bg-[#EEF2FF] dark:bg-[#1E1B4B]"
                              : "bg-transparent hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524]"
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="w-[44px] px-[11px] py-[11px] text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isRowDisabled) return;
                                handleToggleRow(rowCode);
                              }}
                              disabled={isRowDisabled}
                              className="grid place-items-center border-none bg-transparent cursor-pointer p-0 m-auto"
                            >
                              <span
                                className={`w-4 h-4 rounded-[4px] grid place-items-center border-[1.5px] transition-colors ${
                                  isChecked
                                    ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                                    : "border-[#E2E8F0] dark:border-[#1F2937] bg-transparent"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                            </button>
                          </td>

                          {/* EMP. CODE */}
                          <td className="px-[12px] py-[11px] whitespace-nowrap text-[12.5px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                            {row.empcode || "—"}
                          </td>

                          {/* EMP. NAME */}
                          <td className="px-[12px] py-[9px] whitespace-nowrap">
                            <div className="flex items-center gap-[10px]">
                              <span
                                className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center text-[10.5px] font-[600] shrink-0 ${avatarColor}`}
                              >
                                {initials}
                              </span>
                              <span className="font-[550] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] truncate max-w-[170px]">
                                {formattedName}
                              </span>
                            </div>
                          </td>

                          {/* LOCATION */}
                          <td className="px-[12px] py-[11px] whitespace-nowrap text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                            {location}
                          </td>

                          {/* DESIGNATION */}
                          <td className="px-[12px] py-[11px] whitespace-nowrap text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3]">
                            {designation}
                          </td>

                          {/* DEPARTMENT */}
                          <td className="px-[12px] py-[11px] whitespace-nowrap text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                            {department}
                          </td>

                          {/* DATE */}
                          <td className="px-[12px] py-[11px] whitespace-nowrap text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-mono">
                            {formatDisplayDate(dateVal)}
                          </td>

                          {/* MOBILE */}
                          <td className="px-[12px] py-[11px] whitespace-nowrap text-[12.5px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                            {row.mobileno || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {tabledata.length === 0 && (
                  <div className="py-[52px] px-[20px] text-center">
                    <div className="w-[44px] h-[44px] mx-auto mb-[12px] rounded-[12px] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] grid place-items-center">
                      <Cake className="w-5 h-5" />
                    </div>
                    <div className="text-[13.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                      No {occasion === "1" ? "birthdays" : occasion === "2" ? "work anniversaries" : "anniversaries"} on this date
                    </div>
                    <div className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-[5px]">
                      Pick another date or switch the tab above.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Message Config & This Month Stats */}
        <div className="flex flex-col gap-[16px]">
          {/* MESSAGE CARD */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-[10px] px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
              <span className="text-[#4F46E5] dark:text-[#8B84FF] flex items-center">
                <MessageSquare className="w-4 h-4" />
              </span>
              <h2 className="m-0 flex-1 text-[13px] font-[600] tracking-[0.04em] uppercase text-[#1E293B] dark:text-[#E7ECF3]">
                Message
              </h2>
            </div>

            <div className="p-[14px_16px_16px_16px] space-y-[11px]">
              {/* Quick Template Chips using AButton */}
              <div className="flex gap-[6px] flex-wrap">
                {(TEMPLATES[occasion] || TEMPLATES["1"]).map((t, idx) => (
                  <AButton
                    key={idx}
                    type="button"
                    variant="ghost"
                    onClick={() => handleTemplateSelect(idx)}
                    className={`font-inherit !text-[11.5px] font-[600] px-[11px] py-[5px] !h-auto !rounded-full border cursor-pointer whitespace-nowrap transition-all shadow-none ${
                      activeTemplateIdx === idx
                        ? "!border-[#4F46E5] !bg-[#EEF2FF] dark:!bg-[#1E1B4B] !text-[#4F46E5] dark:text-[#8B84FF]"
                        : "!border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235]"
                    }`}
                  >
                    {t.label}
                  </AButton>
                ))}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type wish message here..."
                  className="w-full resize-y border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] p-[10px_11px] outline-none leading-[1.6] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#EEF2FF] dark:focus:ring-[#1E1B4B]"
                />
              </div>

              {/* Variables helper using AButton */}
              <div className="flex items-center gap-[8px] flex-wrap mt-[9px]">
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Variables
                </span>
                {["name", "desig", "dept", "years"].map((v) => (
                  <AButton
                    key={v}
                    type="button"
                    variant="ghost"
                    onClick={() => insertVariable(v)}
                    className="border !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#F8FAFC] dark:!bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] !text-[11px] font-[600] px-[8px] py-[3px] !h-auto !rounded-[6px] cursor-pointer whitespace-nowrap hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] transition-colors shadow-none"
                  >
                    &#123;{v}&#125;
                  </AButton>
                ))}
              </div>

              {/* Send Mode Switcher using AButton */}
              <div className="flex items-center p-[3px] rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] gap-[3px] mt-[9px]">
                <AButton
                  type="button"
                  variant="ghost"
                  onClick={() => handleSendModeChange("auto")}
                  className={`flex-1 py-[6px] !h-auto !rounded-[8px] !text-[12px] font-[600] transition-all flex items-center justify-center gap-[6px] cursor-pointer shadow-none ${
                    sendMode === "auto"
                      ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                      : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
                  }`}
                >
                  <span>⚡ Auto (API)</span>
                </AButton>
                <AButton
                  type="button"
                  variant="ghost"
                  onClick={() => handleSendModeChange("manual")}
                  className={`flex-1 py-[6px] !h-auto !rounded-[8px] !text-[12px] font-[600] transition-all flex items-center justify-center gap-[6px] cursor-pointer shadow-none ${
                    sendMode === "manual"
                      ? "!bg-[#10B981] !text-white hover:!bg-[#10B981]"
                      : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
                  }`}
                >
                  <span>💬 Manual</span>
                </AButton>
              </div>

              {/* Preview Box */}
              <div className="mt-[13px] p-[12px_13px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524]">
                <div className="text-[10.5px] font-[700] tracking-[0.05em] uppercase text-[#64748B] dark:text-[#94A3B8] mb-[7px]">
                  Preview
                </div>
                <p className="text-[12.5px] leading-[1.6] text-[#1E293B] dark:text-[#E7ECF3] whitespace-pre-wrap font-normal m-0">
                  {previewText}
                </p>
              </div>

              {/* Action Button using AButton: Auto (API) vs Manual (WhatsApp Redirect) */}
              {sendMode === "auto" ? (
                <AButton
                  type="button"
                  variant="primary"
                  onClick={handleSendWhatsApp}
                  disabled={isSending || tabledata.length === 0}
                  loading={isSending}
                  loadingText="Sending via API..."
                  className="w-full !h-[38px] px-4 !rounded-[10px] !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white font-[600] !text-[12.5px] flex items-center justify-center gap-[7px] cursor-pointer transition-colors disabled:opacity-50 shadow-none"
                  icon={<FaWhatsapp className="w-4 h-4 text-white" />}
                >
                  <span>
                    {isSending
                      ? "Sending via API..."
                      : selectedCodes.size > 0
                      ? `Send via API (${selectedCodes.size} Selected)`
                      : "Send via API (Auto)"}
                  </span>
                </AButton>
              ) : (
                <AButton
                  type="button"
                  onClick={() => handleManualWhatsApp()}
                  disabled={tabledata.length === 0}
                  className="w-full !h-[38px] px-4 !rounded-[10px] !bg-[#10B981] hover:brightness-105 !text-white font-[600] !text-[12.5px] flex items-center justify-center gap-[7px] cursor-pointer transition-colors disabled:opacity-50 shadow-none"
                  icon={<FaWhatsapp className="w-4 h-4 text-white" />}
                >
                  <span>
                    {selectedCodes.size > 0
                      ? `Open Chat for ${toTitleCase(
                          tabledata.find((r) => selectedCodes.has(String(r.empcode || r.id)))?.empname || "Selected"
                        )}`
                      : "Open in WhatsApp (Manual)"}
                  </span>
                </AButton>
              )}
            </div>
          </div>

          {/* THIS MONTH STATS CARD */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-[16px_18px]">
            <h2 className="m-0 mb-[11px] text-[13px] font-[600] tracking-[0.04em] uppercase text-[#1E293B] dark:text-[#E7ECF3]">
              This month
            </h2>

            <div className="flex flex-col gap-[9px]">
              {/* Birthdays this month */}
              <div className="flex items-center gap-[10px] min-w-0">
                <span className="w-[22px] h-[22px] rounded-[7px] shrink-0 grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
                  <Cake className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0 text-[12.5px] truncate text-[#1E293B] dark:text-[#E7ECF3]">
                  Birthdays this month
                </span>
                <span className="shrink-0 text-[13px] font-[650] font-mono text-[#1E293B] dark:text-[#E7ECF3]">
                  {todayStats.birthdays}
                </span>
              </div>

              {/* Work anniversaries */}
              <div className="flex items-center gap-[10px] min-w-0">
                <span className="w-[22px] h-[22px] rounded-[7px] shrink-0 grid place-items-center bg-[rgba(16,185,129,0.12)] text-[#10B981]">
                  <Briefcase className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0 text-[12.5px] truncate text-[#1E293B] dark:text-[#E7ECF3]">
                  Work anniversaries
                </span>
                <span className="shrink-0 text-[13px] font-[650] font-mono text-[#1E293B] dark:text-[#E7ECF3]">
                  {todayStats.workAnniversaries}
                </span>
              </div>

              {/* Marriage anniversaries */}
              <div className="flex items-center gap-[10px] min-w-0">
                <span className="w-[22px] h-[22px] rounded-[7px] shrink-0 grid place-items-center bg-[rgba(239,68,68,0.12)] text-[#EF4444]">
                  <Heart className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0 text-[12.5px] truncate text-[#1E293B] dark:text-[#E7ECF3]">
                  Marriage anniversaries
                </span>
                <span className="shrink-0 text-[13px] font-[650] font-mono text-[#1E293B] dark:text-[#E7ECF3]">
                  {todayStats.marriageAnniversaries}
                </span>
              </div>

              {/* Messages sent */}
              <div className="flex items-center gap-[10px] min-w-0">
                <span className="w-[22px] h-[22px] rounded-[7px] shrink-0 grid place-items-center bg-[rgba(245,158,11,0.14)] text-[#F59E0B]">
                  <Send className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0 text-[12.5px] truncate text-[#1E293B] dark:text-[#E7ECF3]">
                  Messages sent ({currentMonthName})
                </span>
                <span className="shrink-0 text-[13px] font-[650] font-mono text-[#1E293B] dark:text-[#E7ECF3]">
                  {todayStats.messagesSent}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Selection Floating Bar using AButton */}
      {selectedCodes.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] shadow-[0_-12px_30px_-18px_rgba(2,6,16,0.35)] px-6 py-3.5 flex items-center gap-3.5">
          <span className="flex items-center gap-[9px] text-[13px] font-[600] whitespace-nowrap text-[#1E293B] dark:text-[#E7ECF3]">
            <span className="min-w-[24px] h-[24px] px-[7px] rounded-[7px] bg-[#4F46E5] text-white grid place-items-center text-[12px] font-mono">
              {selectedCodes.size}
            </span>
            selected · sending via WhatsApp
          </span>
          <div className="flex-1"></div>
          <AButton
            type="button"
            variant="outline"
            onClick={() => setSelectedCodes(new Set())}
            className="!border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#64748B] dark:text-[#94A3B8] !text-[12.5px] font-[550] px-[13px] py-[9px] !h-auto !rounded-[10px] cursor-pointer whitespace-nowrap hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] transition-colors shadow-none"
          >
            Clear
          </AButton>
          <AButton
            type="button"
            onClick={sendMode === "auto" ? handleSendWhatsApp : () => handleManualWhatsApp()}
            className="flex items-center gap-[7px] !border-transparent !bg-[#10B981] !text-white !text-[12.5px] font-[600] px-[17px] py-[9px] !h-auto !rounded-[10px] cursor-pointer whitespace-nowrap hover:brightness-105 transition-all shadow-none"
            icon={<Send className="w-4 h-4" />}
          >
            Send message
          </AButton>
        </div>
      )}
    </div>
  );
}
