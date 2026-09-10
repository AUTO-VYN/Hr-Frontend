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
    if (isChecked) {
      const allCodes = new Set(tabledata.map((r) => String(r.empcode || r.id)));
      setSelectedCodes(allCodes);
    } else {
      setSelectedCodes(new Set());
    }
  };

  const handleToggleRow = (empcode: string) => {
    const next = new Set(selectedCodes);
    if (next.has(empcode)) {
      next.delete(empcode);
    } else {
      next.add(empcode);
    }
    setSelectedCodes(next);
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
    <div className="w-full min-h-screen pb-16 space-y-5">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            WishWell
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-0.5">
            Send birthday, anniversary and work-anniversary wishes over WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <AInput
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            containerClassName="w-auto"
            className="!h-9 text-[13.5px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0B1220] border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 shadow-2xs cursor-pointer"
          />

          {/* Export to Excel */}
          <AButton
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1220] text-slate-700 dark:text-slate-200 text-[13.5px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
            icon={<Download className="w-4 h-4 text-slate-500" />}
          >
            Export to Excel
          </AButton>

          {/* WhatsApp Channel Badge (Only WhatsApp) */}
          <div className="flex items-center gap-2 pl-1">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              CHANNEL
            </span>
            <div className="h-9 px-3.5 rounded-xl bg-[#4338CA] text-white text-[13.5px] font-semibold inline-flex items-center gap-2 shadow-2xs">
              <FaWhatsapp className="w-4 h-4 text-white" />
              WhatsApp
            </div>
          </div>
        </div>
      </div>

      {/* 2. Occasion Tabs */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Birthday Tab */}
        <AButton
          type="button"
          variant={occasion === "1" ? "primary" : "outline"}
          onClick={() => handleOccasionChange("1")}
          className={`h-10 px-4 rounded-xl font-semibold text-[13.5px] inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
            occasion === "1"
              ? "bg-[#4338CA] text-white shadow-indigo-500/20 hover:bg-[#4338CA]"
              : "bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
          icon={<Cake className="w-4 h-4" />}
        >
          <span>Birthday</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11.5px] font-bold ${
              occasion === "1"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            {counts["1"] || 0}
          </span>
        </AButton>

        {/* Marriage Anniversary Tab */}
        <AButton
          type="button"
          variant={occasion === "3" ? "primary" : "outline"}
          onClick={() => handleOccasionChange("3")}
          className={`h-10 px-4 rounded-xl font-semibold text-[13.5px] inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
            occasion === "3"
              ? "bg-[#4338CA] text-white shadow-indigo-500/20 hover:bg-[#4338CA]"
              : "bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
          icon={<Heart className="w-4 h-4 text-slate-400" />}
        >
          <span>Anniversary</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11.5px] font-bold ${
              occasion === "3"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            {counts["3"] || 0}
          </span>
        </AButton>

        {/* Work Anniversary Tab */}
        <AButton
          type="button"
          variant={occasion === "2" ? "primary" : "outline"}
          onClick={() => handleOccasionChange("2")}
          className={`h-10 px-4 rounded-xl font-semibold text-[13.5px] inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
            occasion === "2"
              ? "bg-[#4338CA] text-white shadow-indigo-500/20 hover:bg-[#4338CA]"
              : "bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          }`}
          icon={<Briefcase className="w-4 h-4 text-slate-400" />}
        >
          <span>Work anniversary</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11.5px] font-bold ${
              occasion === "2"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            {counts["2"] || 0}
          </span>
        </AButton>
      </div>

      {/* 3. Main Grid Layout (Left Table + Right Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Table Card (Single Unified Container) */}
        <div className="lg:col-span-8 xl:col-span-8 bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          {/* Table Header Banner */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#0B1220]">
            <div className="flex items-center gap-2.5">
              <Cake className="w-4.5 h-4.5 text-[#4F46E5] dark:text-indigo-400" />
              <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                {occasionTitle}
              </h2>
            </div>
            <div className="text-[13px] font-normal text-slate-500 dark:text-slate-400">
              {tabledata.length} {tabledata.length === 1 ? "employee" : "employees"}
            </div>
          </div>

          {/* Skeleton Loading or Table */}
          {isLoading ? (
            <div className="p-6">
              <SkeletonLoader />
            </div>
          ) : (
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white dark:bg-[#0B1220] border-b border-slate-200 dark:border-slate-800 select-none">
                  <tr>
                    {/* Checkbox Column */}
                    <th className="w-12 px-3 py-3 text-center">
                      <div
                        className="flex items-center justify-center cursor-pointer"
                        onClick={() => handleSelectAll(!isAllSelected)}
                      >
                        <div
                          role="checkbox"
                          aria-checked={isAllSelected ? "true" : isIndeterminate ? "mixed" : "false"}
                          className={`w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-[4px] flex items-center justify-center transition-all select-none ${
                            isAllSelected
                              ? "bg-[#4338CA] border border-[#4338CA] text-white shadow-2xs"
                              : isIndeterminate
                              ? "bg-white dark:bg-slate-900 border-[1.5px] border-slate-300 dark:border-slate-500"
                              : "bg-white dark:bg-slate-900 border-[1.5px] border-slate-300 dark:border-slate-500 hover:border-[#4338CA]"
                          }`}
                        >
                          {isAllSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                          ) : isIndeterminate ? (
                            <div className="w-2.5 h-[2px] bg-[#4338CA] rounded-full" />
                          ) : null}
                        </div>
                      </div>
                    </th>

                    <th className="px-3.5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      EMP. CODE
                    </th>
                    <th className="px-3.5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      EMP. NAME
                    </th>
                    <th className="px-3.5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      LOCATION
                    </th>
                    <th className="px-3.5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      DESIGNATION
                    </th>
                    <th className="px-3.5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      DEPARTMENT
                    </th>
                    <th className="px-3.5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {dateHeader}
                    </th>
                    <th className="px-3.5 py-3 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      MOBILE
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#0B1220]">
                  {tabledata.map((row: any, idx: number) => {
                    const rowCode = String(row.empcode || row.id || idx);
                    const isChecked = selectedCodes.has(rowCode);
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
                        onClick={() => handleToggleRow(rowCode)}
                        className={`transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/80 ${
                          isChecked
                            ? "bg-[#EEF2FF] dark:bg-indigo-950/40 hover:bg-[#E0E7FF] dark:hover:bg-indigo-950/60"
                            : "hover:bg-slate-50/70 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        {/* Row Checkbox */}
                        <td className="w-12 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div
                            className="flex items-center justify-center cursor-pointer"
                            onClick={() => handleToggleRow(rowCode)}
                          >
                            <div
                              role="checkbox"
                              aria-checked={isChecked}
                              className={`w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-[4px] flex items-center justify-center transition-all select-none ${
                                isChecked
                                  ? "bg-[#4338CA] border border-[#4338CA] text-white shadow-2xs"
                                  : "bg-white dark:bg-slate-900 border-[1.5px] border-slate-300 dark:border-slate-500 hover:border-[#4338CA]"
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                            </div>
                          </div>
                        </td>

                        {/* EMP. CODE */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-[13.5px] font-normal text-slate-600 dark:text-slate-300">
                          {row.empcode || "—"}
                        </td>

                        {/* EMP. NAME */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-[12.5px] font-bold shrink-0 ${avatarColor}`}
                            >
                              {initials}
                            </div>
                            <span className="font-semibold text-[13.5px] text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                              {formattedName}
                            </span>
                          </div>
                        </td>

                        {/* LOCATION */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-[13.5px] font-normal text-slate-500 dark:text-slate-400">
                          {location}
                        </td>

                        {/* DESIGNATION */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-[13.5px] font-medium text-slate-800 dark:text-slate-200">
                          {designation}
                        </td>

                        {/* DEPARTMENT */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-[13.5px] font-normal text-slate-500 dark:text-slate-400">
                          {department}
                        </td>

                        {/* DATE */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-[13.5px] font-normal text-slate-600 dark:text-slate-300">
                          {formatDisplayDate(dateVal)}
                        </td>

                        {/* MOBILE */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-[13.5px] font-normal text-slate-600 dark:text-slate-300 font-mono">
                          {row.mobileno || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {tabledata.length === 0 && (
                <div className="w-full py-14 text-center text-base font-medium text-slate-400 dark:text-slate-500">
                  No records found for today
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Message Config & This Month Stats */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-5">
          {/* MESSAGE CARD */}
          <div className="bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3.5">
            {/* Header */}
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                MESSAGE
              </h3>
            </div>

            {/* Quick Template Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(TEMPLATES[occasion] || TEMPLATES["1"]).map((t, idx) => (
                <AButton
                  key={idx}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTemplateSelect(idx)}
                  className={`px-3 py-1 !h-auto rounded-full text-[12.5px] font-medium transition-all cursor-pointer ${
                    activeTemplateIdx === idx
                      ? "bg-indigo-50 dark:bg-indigo-950/80 text-[#4338CA] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent"
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
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type wish message here..."
                className="w-full p-3 text-[13.5px] leading-relaxed border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] shadow-2xs resize-y"
              />
            </div>

            {/* Variables helper */}
            <div className="space-y-1">
              <div className="text-[11.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                Variables
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["name", "desig", "dept", "years"].map((v) => (
                  <AButton
                    key={v}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 !h-auto rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11.5px] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    &#123;{v}&#125;
                  </AButton>
                ))}
              </div>
            </div>

            {/* Send Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 gap-1">
              <AButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSendMode("auto")}
                className={`flex-1 py-1.5 !h-auto rounded-lg text-[12.5px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  sendMode === "auto"
                    ? "bg-[#4338CA] text-white shadow-2xs hover:bg-[#4338CA]"
                    : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span>⚡ Auto (API Bulk)</span>
              </AButton>
              <AButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSendMode("manual")}
                className={`flex-1 py-1.5 !h-auto rounded-lg text-[12.5px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  sendMode === "manual"
                    ? "bg-[#25D366] text-white shadow-2xs hover:bg-[#25D366]"
                    : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span>💬 Manual (WhatsApp)</span>
              </AButton>
            </div>

            {/* Preview Box */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-1.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                PREVIEW
              </div>
              <p className="text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-normal">
                {previewText}
              </p>
            </div>

            {/* Action Button: Auto (API) vs Manual (WhatsApp Redirect) */}
            {sendMode === "auto" ? (
              <AButton
                type="button"
                variant="primary"
                onClick={handleSendWhatsApp}
                disabled={isSending || tabledata.length === 0}
                loading={isSending}
                loadingText="Sending via API..."
                className="w-full h-10 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] text-white font-bold text-[13.5px] shadow-sm"
                icon={<FaWhatsapp className="w-4.5 h-4.5 text-white" />}
              >
                <span>
                  {selectedCodes.size > 0
                    ? `Send via API (${selectedCodes.size} Selected)`
                    : "Send via API (Auto)"}
                </span>
              </AButton>
            ) : (
              <AButton
                type="button"
                onClick={() => handleManualWhatsApp()}
                disabled={tabledata.length === 0}
                className="w-full h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-[13.5px] shadow-sm"
                icon={<FaWhatsapp className="w-4.5 h-4.5 text-white" />}
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

          {/* TODAY STATS CARD */}
          <div className="bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3.5">
            <h3 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              TODAY
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 space-y-2.5 pt-0.5">
              {/* Birthdays today */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <Cake className="w-4 h-4" />
                  </span>
                  <span className="text-[13.5px] font-normal text-slate-600 dark:text-slate-300">
                    Birthdays today
                  </span>
                </div>
                <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                  {todayStats.birthdays}
                </span>
              </div>

              {/* Work anniversaries */}
              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    <Briefcase className="w-4 h-4" />
                  </span>
                  <span className="text-[13.5px] font-normal text-slate-600 dark:text-slate-300">
                    Work anniversaries
                  </span>
                </div>
                <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                  {todayStats.workAnniversaries}
                </span>
              </div>

              {/* Marriage anniversaries */}
              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                    <Heart className="w-4 h-4" />
                  </span>
                  <span className="text-[13.5px] font-normal text-slate-600 dark:text-slate-300">
                    Marriage anniversaries
                  </span>
                </div>
                <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                  {todayStats.marriageAnniversaries}
                </span>
              </div>

              {/* Messages sent */}
              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                    <Send className="w-4 h-4" />
                  </span>
                  <span className="text-[13.5px] font-normal text-slate-600 dark:text-slate-300">
                    Messages sent today
                  </span>
                </div>
                <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                  {todayStats.messagesSent}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
