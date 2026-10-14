"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Cake,
  Heart,
  Briefcase,
  Download,
  MessageSquareText,
  Send,
  ArrowLeft,
  Clock,
  Smartphone,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import SkeletonLoader from "@/components/atoms/SkeletonLoader";
import useExcelDownload from "@/app/hooks/excel-download";
import AButton from "@/components/atoms/Button";
import ATextArea from "@/components/atoms/textArea";
import ServiceTablePagination from "@/components/Templates/reacttable";

const avatarPalette = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#0EA5E9",
  "#EC4899",
];

function getAvatarStyle(str: string = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = avatarPalette[Math.abs(hash) % avatarPalette.length];
  return {
    backgroundColor: `${color}22`,
    color: color,
  };
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
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
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
      text: "Dear {name}, on behalf of Autovyn, we wish you a very happy birthday and a successful year ahead.",
    },
    {
      label: "Inspiring",
      text: "Happy Birthday {name}! 🌟 Thank you for your dedication as {desig}. Wishing you an amazing year of growth and joy! — Team Autovyn",
    },
  ],
  "2": [
    {
      label: "Work anniversary",
      text: "Congratulations {name} on completing {years} years with Autovyn ({desig}, {dept}). Thank you for your contribution!",
    },
    {
      label: "Appreciation",
      text: "Happy Work Anniversary {name}! 🏆 Thank you for your valuable contribution and dedication to our {dept} team. — Team Autovyn",
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

  const [currentDate, setCurrentDate] = useState<string>(getTodayFormatted());
  const [occasion, setOccasion] = useState<string>("1"); // 1: Birthday, 2: Work Anniversary, 3: Marriage Anniversary
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [selectedRowObjects, setSelectedRowObjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Tab counts
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    "1": 0,
    "2": 0,
    "3": 0,
  });

  // Today's summary stats
  const [todayStats, setTodayStats] = useState({
    birthdays: 0,
    workAnniversaries: 0,
    marriageAnniversaries: 0,
    messagesSent: 0,
  });

  const [sendMode, setSendMode] = useState<"auto" | "manual">("auto");
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
    const compCodeVal =
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.DB ||
      "";
    if (!compCodeVal) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setSelectedCodes(new Set());
    setSelectedRowObjects([]);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/pot_cust/getsendwishemp`,
        {
          date: dateVal,
          occasion: `${occ}`,
          loc_code:
            user?.branch ||
            user?.loc_code ||
            (user as any)?.Loc_Code ||
            (user as any)?.BRANCH ||
            "",
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
    const compCodeVal =
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.DB ||
      "";
    if (!compCodeVal) return;
    try {
      const occs = ["1", "2", "3"];
      const promises = occs.map((o) =>
        axios.post(
          `${process.env.NEXT_PUBLIC_URL}/pot_cust/getsendwishemp`,
          {
            date: dateVal,
            occasion: o,
            loc_code:
              user?.branch ||
              user?.loc_code ||
              (user as any)?.Loc_Code ||
              (user as any)?.BRANCH ||
              "",
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
    const compCodeVal =
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.DB ||
      "";
    if (!compCodeVal) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/aniversery/today`,
        {
          loc_code:
            user?.branch ||
            user?.loc_code ||
            (user as any)?.Loc_Code ||
            (user as any)?.BRANCH ||
            "",
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
        bCount = resData.filter(
          (x: any) => x.type == 1 || x.occasion == 1 || x.occasion == "1" || x.dob
        ).length;
        wCount = resData.filter(
          (x: any) =>
            x.type == 2 || x.occasion == 2 || x.occasion == "2" || x.currentjoindate
        ).length;
        aCount = resData.filter(
          (x: any) => x.type == 3 || x.occasion == 3 || x.occasion == "3" || x.dom
        ).length;
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
          (Array.isArray(resData.marriageAnniversaries)
            ? resData.marriageAnniversaries.length
            : 0);

        sCount =
          resData.messagesSent ??
          resData.TotalSent ??
          resData.sent_today ??
          resData.sent_count ??
          0;
      }

      const sentKey = `wishwell_sent_${compCodeVal}_${currentDate}`;
      const localSent =
        typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
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
      const localSent =
        typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
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

  // Selection Synchronization with ServiceTablePagination
  const handleSelectedRowsChange = (rows: any[]) => {
    setSelectedRowObjects(rows);
    setSelectedCodes(new Set(rows.map((r: any) => String(r.empcode || r.id))));
  };

  const handleClearSelection = () => {
    setSelectedCodes(new Set());
    setSelectedRowObjects([]);
  };

  const handleSendModeChange = (mode: "auto" | "manual") => {
    setSendMode(mode);
    if (mode === "manual") {
      setSelectedRowObjects((prev) => (prev.length > 1 ? [prev[0]] : prev));
      setSelectedCodes((prev) => {
        if (prev.size > 1) {
          const first = Array.from(prev)[0];
          return new Set(first ? [first] : []);
        }
        return prev;
      });
    }
  };

  // Insert variable tag into message
  const insertVariable = (variableKey: string) => {
    const tag = `{${variableKey}}`;
    setMessageText((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  // Dynamic preview text calculation
  const previewText = useMemo(() => {
    const selectedList =
      selectedRowObjects.length > 0
        ? selectedRowObjects
        : tabledata.filter((r) => selectedCodes.has(String(r.empcode || r.id)));
    const sampleEmp = selectedList.length > 0 ? selectedList[0] : tabledata[0];
    const name = toTitleCase(sampleEmp?.empname || "Altaf Ali Khan");
    const desig = toTitleCase(sampleEmp?.employeedesignation || "Relationship Manager");
    const dept = toTitleCase(sampleEmp?.labeldivision || "Sales");
    const years = "3";

    return messageText
      .replace(/{name}/g, name.split(" ")[0] || name)
      .replace(/{desig}/g, desig)
      .replace(/{dept}/g, dept)
      .replace(/{years}/g, years);
  }, [messageText, selectedCodes, selectedRowObjects, tabledata]);

  // Send WhatsApp Wishes
  const handleSendWhatsApp = async () => {
    if (!tabledata || tabledata.length === 0) {
      showToast("No employees available to send wishes", "warning");
      return;
    }

    const recipients =
      selectedRowObjects.length > 0
        ? selectedRowObjects
        : selectedCodes.size > 0
        ? tabledata.filter((r) => selectedCodes.has(String(r.empcode || r.id)))
        : tabledata;

    const empCodesList = recipients
      .map((item) => item?.empcode || item?.id)
      .filter(Boolean);

    if (empCodesList.length === 0) {
      showToast("Please select at least one employee", "warning");
      return;
    }

    const channelLabel = channel === "whatsapp" 

    const confirmResult = await Swal.fire({
      icon: "question",
      title: `Send ${channelLabel} Wishes?`,
      text: `Are you sure you want to send wishes to ${empCodesList.length} employee(s) over ${channelLabel}?`,
      showCancelButton: true,
      confirmButtonText: "Yes, Send",
      confirmButtonColor: channel === "whatsapp" ? "#25D366" : "#4F46E5",
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
        const compCodeVal =
          user?.Comp_Code ||
          (user as any)?.compcode ||
          (user as any)?.comp_code ||
          (user as any)?.DB ||
          "";
        const sentKey = `wishwell_sent_${compCodeVal}_${currentDate}`;
        const prevSent =
          typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
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
          text: response.data?.Message || `${channelLabel} wishes sent successfully.`,
          confirmButtonColor: "#10B981",
        });
        handleClearSelection();
        fetchEmployeeData(occasion, currentDate);
        fetchTodayStats();
      } else {
        showToast(response.data?.Message || "Failed to send wishes.", "error");
      }
    } catch (error: any) {
      console.error("Error sending wishes:", error);
      Swal.fire({
        icon: "error",
        title: "Error Sending",
        text:
          error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Failed to send wishes.",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Manual WhatsApp redirect for a single employee
  const handleManualWhatsApp = (targetRow?: any) => {
    let target = targetRow;
    if (!target) {
      const selectedList =
        selectedRowObjects.length > 0
          ? selectedRowObjects
          : tabledata.filter((r) => selectedCodes.has(String(r.empcode || r.id)));
      target = selectedList.length > 0 ? selectedList[0] : tabledata[0];
    }

    if (!target) {
      showToast("Please select an employee first", "warning");
      return;
    }

    const mobile = String(target?.mobileno || "").trim().replace(/\D/g, "");
    if (!mobile || mobile.length < 10) {
      showToast(
        `Invalid mobile number for ${toTitleCase(target?.empname || "employee")}`,
        "warning"
      );
      return;
    }

    const phone =
      mobile.length === 10
        ? `91${mobile}`
        : mobile.startsWith("91")
        ? mobile
        : `91${mobile}`;

    const name = toTitleCase(target?.empname || "Employee");
    const desig = toTitleCase(target?.employeedesignation || "Colleague");
    const dept = toTitleCase(target?.labeldivision || "Team");
    const years = "3";

    const personalized = messageText
      .replace(/{name}/g, name.split(" ")[0] || name)
      .replace(/{desig}/g, desig)
      .replace(/{dept}/g, dept)
      .replace(/{years}/g, years);

    const encoded = encodeURIComponent(personalized);
    const waUrl = `https://wa.me/${phone}?text=${encoded}`;

    // Track sent count
    const compCodeVal =
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.DB ||
      "";
    const sentKey = `wishwell_sent_${compCodeVal}_${currentDate}`;
    const prevSent =
      typeof window !== "undefined" ? Number(localStorage.getItem(sentKey) || 0) : 0;
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

  // Schedule notification
  const handleSchedule = () => {
    const count = selectedRowObjects.length || selectedCodes.size;
    showToast(`Scheduled for 9:00 AM · ${count} recipient(s)`, "success");
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

  const dateHeader = occasion === "1" ? "DOB" : occasion === "2" ? "DOJ" : "DOM";

  // Table Columns Definition for ServiceTablePagination
  const columns = useMemo(
    () => [
      {
        Header: "Emp. code",
        accessor: "empcode",
        Cell: ({ value }: any) => (
          <span className="font-mono text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Emp. name",
        accessor: "empname",
        Cell: ({ row }: any) => {
          const name = row.original?.empname || "—";
          const formattedName = toTitleCase(name);
          const initials = getInitials(name);
          const avatarStyle = getAvatarStyle(name);
          return (
            <div className="flex items-center gap-[10px] min-w-0">
              <span
                style={avatarStyle}
                className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center text-[10.5px] font-[600] shrink-0"
              >
                {initials}
              </span>
              <span className="font-[550] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] truncate max-w-[190px]">
                {formattedName}
              </span>
            </div>
          );
        },
      },
      {
        Header: "Location",
        accessor: "branch",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] truncate block">
            {toTitleCase(value || "Branch - 1")}
          </span>
        ),
      },
      {
        Header: "Designation",
        accessor: "employeedesignation",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] truncate block">
            {toTitleCase(value || "—")}
          </span>
        ),
      },
      {
        Header: "Department",
        accessor: "labeldivision",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] truncate block">
            {toTitleCase(value || "—")}
          </span>
        ),
      },
      {
        Header: dateHeader,
        accessor:
          occasion === "1" ? "dob" : occasion === "2" ? "currentjoindate" : "dom",
        Cell: ({ value }: any) => (
          <span className="font-mono text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3]">
            {formatDisplayDate(value)}
          </span>
        ),
      },
      {
        Header: "Mobile no.",
        accessor: "mobileno",
        Cell: ({ value }: any) => (
          <span className="font-mono text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },
    ],
    [occasion, dateHeader]
  );

  const selectedCount = selectedRowObjects.length || selectedCodes.size;

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen pb-24 space-y-4 font-['Inter',system-ui,sans-serif] text-[#1E293B] dark:text-[#E7ECF3]">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-5 mb-[18px]">
        <div>
          <h1 className="m-0 text-[19px] sm:text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            WishWell
          </h1>
          <p className="mt-[4px] sm:mt-[5px] text-[12px] sm:text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Send birthday, anniversary and work-anniversary wishes over WhatsApp or SMS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-[9px] w-full sm:w-auto">
          {/* Date Picker matching HTML styling */}
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="flex-1 sm:flex-initial min-w-[125px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] sm:text-[12.5px] px-[10px] sm:px-[11px] py-[7px] sm:py-[8px] outline-none focus:border-[#4F46E5] cursor-pointer"
          />

          {/* Export to Excel using AButton */}
          <AButton
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial !h-auto !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] !text-[12px] sm:!text-[12.5px] font-[550] px-[10px] sm:px-[13px] py-[7px] sm:py-[8px] !rounded-[10px] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] whitespace-nowrap cursor-pointer shadow-none gap-[6px] sm:gap-[7px]"
            icon={<Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#64748B] dark:text-[#94A3B8]" />}
          >
            Export to Excel
          </AButton>

          {/* Back button using AButton */}
          <AButton
            type="button"
            variant="outline"
            onClick={() => history.back()}
            className="!h-auto !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] !text-[12px] sm:!text-[12.5px] font-[550] px-[10px] sm:px-[12px] py-[7px] sm:py-[8px] !rounded-[10px] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] whitespace-nowrap cursor-pointer shadow-none gap-[6px] sm:gap-[7px]"
            icon={<ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          >
            Back
          </AButton>
        </div>
      </div>

      {/* 2. Occasion Tabs & Channel Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-[16px] w-full">
        {/* Occasion Tabs with horizontal scroll and shrink-0 */}
        <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="inline-flex min-w-max gap-[3px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[3px]">
            {/* Birthday Tab */}
            <AButton
              type="button"
              variant={occasion === "1" ? "primary" : "ghost"}
              onClick={() => handleOccasionChange("1")}
              className={`!border-none shrink-0 !text-[12px] sm:!text-[12.5px] font-[600] px-[11px] sm:px-[14px] py-[7px] sm:py-[8px] !h-auto !rounded-[8px] cursor-pointer whitespace-nowrap transition-colors shadow-none gap-[6px] sm:gap-[7px] ${
                occasion === "1"
                  ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                  : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
              icon={<Cake className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
            >
              <span>Birthday</span>
              <span className="text-[10.5px] sm:text-[11px] opacity-75 font-mono ml-0.5">{counts["1"] || 0}</span>
            </AButton>

            {/* Marriage Anniversary Tab */}
            <AButton
              type="button"
              variant={occasion === "3" ? "primary" : "ghost"}
              onClick={() => handleOccasionChange("3")}
              className={`!border-none shrink-0 !text-[12px] sm:!text-[12.5px] font-[600] px-[11px] sm:px-[14px] py-[7px] sm:py-[8px] !h-auto !rounded-[8px] cursor-pointer whitespace-nowrap transition-colors shadow-none gap-[6px] sm:gap-[7px] ${
                occasion === "3"
                  ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                  : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
              icon={<Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
            >
              <span>Anniversary</span>
              <span className="text-[10.5px] sm:text-[11px] opacity-75 font-mono ml-0.5">{counts["3"] || 0}</span>
            </AButton>

            {/* Work Anniversary Tab */}
            <AButton
              type="button"
              variant={occasion === "2" ? "primary" : "ghost"}
              onClick={() => handleOccasionChange("2")}
              className={`!border-none shrink-0 !text-[12px] sm:!text-[12.5px] font-[600] px-[11px] sm:px-[14px] py-[7px] sm:py-[8px] !h-auto !rounded-[8px] cursor-pointer whitespace-nowrap transition-colors shadow-none gap-[6px] sm:gap-[7px] ${
                occasion === "2"
                  ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                  : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
              icon={<Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
            >
              <span>Work anniversary</span>
              <span className="text-[10.5px] sm:text-[11px] opacity-75 font-mono ml-0.5">{counts["2"] || 0}</span>
            </AButton>
          </div>
        </div>

        {/* Channel Indicator */}
        <div className="flex items-center justify-between sm:justify-start gap-[8px] w-full sm:w-auto">
          <span className="text-[11px] sm:text-[11.5px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase shrink-0">
            Channel
          </span>
          <div className="inline-flex gap-[3px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[3px]">
            <AButton
              type="button"
              variant="ghost"
              onClick={() => setChannel("whatsapp")}
              className={`flex items-center gap-[5px] sm:gap-[6px] !border-none !text-[11.5px] sm:!text-[12px] font-[600] px-[10px] sm:px-[12px] py-[5px] sm:py-[6px] !h-auto !rounded-[8px] whitespace-nowrap cursor-pointer shadow-none transition-colors ${
                channel === "whatsapp"
                  ? "!bg-[#4F46E5] !text-white hover:!bg-[#4F46E5]"
                  : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235]"
              }`}
              icon={<FaWhatsapp className="w-3.5 h-3.5" />}
            >
              WhatsApp
            </AButton>
           
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout (Left Table + Right Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start w-full min-w-0">
        {/* Left Column: Table Card */}
        <div className="min-w-0 w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden">
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

          {/* Skeleton Loading or ServiceTablePagination */}
          {isLoading ? (
            <div className="p-6">
              <SkeletonLoader />
            </div>
          ) : tabledata.length === 0 ? (
            <div className="py-[52px] px-[20px] text-center">
              <div className="w-[44px] h-[44px] mx-auto mb-[12px] rounded-[12px] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] grid place-items-center">
                {occasion === "1" ? (
                  <Cake className="w-5 h-5" />
                ) : occasion === "2" ? (
                  <Briefcase className="w-5 h-5" />
                ) : (
                  <Heart className="w-5 h-5" />
                )}
              </div>
              <div className="text-[13.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                No {occasion === "1" ? "birthdays" : occasion === "2" ? "work anniversaries" : "anniversaries"} on this date
              </div>
              <div className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-[5px]">
                Pick another date or switch the tab above.
              </div>
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <ServiceTablePagination
                columns={columns}
                data={tabledata}
                check={true}
                onlyOnecheck={sendMode === "manual"}
                selectValue="empcode"
                selectedRows={selectedRowObjects}
                setSelectedRows={handleSelectedRowsChange}
                showExcelExport={false}
                showTopSearch={false}
                initialPageSize={50}
                height="auto"
                containerClassName="border-0 shadow-none rounded-none bg-transparent"
              />
            </div>
          )}
        </div>

        {/* Right Column: Message Config & This Month Stats */}
        <div className="min-w-0 w-full flex flex-col gap-[16px]">
          {/* MESSAGE CARD */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-[10px] px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
              <span className="text-[#4F46E5] dark:text-[#8B84FF] flex items-center">
                <MessageSquareText className="w-4 h-4" />
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

              {/* Textarea using ATextArea component */}
              <div className="relative">
                <ATextArea
                  name="message"
                  title=""
                  value={messageText}
                  handleInputChange={(_, val) => setMessageText(val)}
                  rows={5}
                  placeholder="Type wish message here..."
                  className="!text-[12.5px] !leading-[1.6] !p-[10px_11px] !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] focus:!border-[#4F46E5] focus:!ring-2 focus:!ring-[#EEF2FF] dark:focus:!ring-[#1E1B4B]"
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
                <p className="text-[12.5px] leading-[1.6] text-[#1E293B] dark:text-[#E7ECF3] whitespace-pre-wrap font-normal m-0 break-words">
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
                      : selectedCount > 0
                      ? `Send via API (${selectedCount} Selected)`
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
                    {selectedCount > 0
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
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] shadow-[0_-12px_30px_-18px_rgba(2,6,16,0.35)] px-3 py-2.5 sm:px-6 sm:py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3.5">
          <span className="flex items-center gap-[6px] sm:gap-[9px] text-[12px] sm:text-[13px] font-[600] whitespace-nowrap text-[#1E293B] dark:text-[#E7ECF3]">
            <span className="min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-[24px] px-[6px] sm:px-[7px] rounded-[7px] bg-[#4F46E5] text-white grid place-items-center text-[11px] sm:text-[12px] font-mono">
              {selectedCount}
            </span>
            <span>selected · {channel === "whatsapp" ? "WhatsApp" : "SMS"}</span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap ml-auto">
            <AButton
              type="button"
              variant="outline"
              onClick={handleClearSelection}
              className="!border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#64748B] dark:text-[#94A3B8] !text-[11.5px] sm:!text-[12.5px] font-[550] px-[9px] sm:px-[13px] py-[6px] sm:py-[9px] !h-auto !rounded-[10px] cursor-pointer whitespace-nowrap hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] transition-colors shadow-none"
            >
              Clear
            </AButton>
            <AButton
              type="button"
              variant="outline"
              onClick={handleSchedule}
              className="flex items-center gap-[5px] sm:gap-[7px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] !text-[11.5px] sm:!text-[12.5px] font-[600] px-[10px] sm:px-[15px] py-[6px] sm:py-[9px] !h-auto !rounded-[10px] cursor-pointer whitespace-nowrap hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] transition-colors shadow-none"
              icon={<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            >
              Schedule
            </AButton>
            <AButton
              type="button"
              onClick={sendMode === "auto" ? handleSendWhatsApp : () => handleManualWhatsApp()}
              className="flex items-center gap-[5px] sm:gap-[7px] !border-transparent !bg-[#10B981] !text-white !text-[11.5px] sm:!text-[12.5px] font-[600] px-[12px] sm:px-[17px] py-[6px] sm:py-[9px] !h-auto !rounded-[10px] cursor-pointer whitespace-nowrap hover:brightness-105 transition-all shadow-none"
              icon={<Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            >
              Send
            </AButton>
          </div>
        </div>
      )}
    </div>
  );
}
