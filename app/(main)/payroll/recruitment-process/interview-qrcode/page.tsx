"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { QRCode } from "antd";
import {
  Copy,
  Download,
  Printer,
  QrCode as QrIcon,
  Sparkles,
  Check,
  Calendar as CalendarIcon,
  Clock,
  ArrowLeft,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import ImageA from "@/components/atoms/Image";

// Helper Alert Toast
const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info"
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
      popup:
        "rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 text-sm font-medium",
    },
  });
};

const generateRandomToken = (length = 7) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface ActiveCodeItem {
  id: string;
  designation: string;
  location: string;
  locCode: string;
  validUntil: string;
  scans: number;
  qrCodeLink: string;
  token: string;
  walkInWindow?: string;
}

export default function InterviewQRCodePage() {
  const user = useCurrentUser() as any;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to extract company code safely
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
      if (stored) return String(stored);
    }

    return "";
  };

  // Data states
  const [company, setCompany] = useState<any>({});
  const [democarfatch, setDemocarfatch] = useState<any>({});
  const [desgApplying, setDesgApplying] = useState<{ value: string; label: string }[]>([]);
  const [branchApplying, setBranchApplying] = useState<{ value: string; label: string }[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    LOC_CODE: "",
    DESIGNATION: "",
  });
  const [walkInWindow, setWalkInWindow] = useState("10:00 – 13:00");
  const [validUntil, setValidUntil] = useState("2026-08-31");
  const [qrCodeLink, setQrCodeLink] = useState("");
  const [codeToken, setCodeToken] = useState("");
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active Codes sample list matching screenshot
  const [activeCodes, setActiveCodes] = useState<ActiveCodeItem[]>([
    {
      id: "1",
      designation: "Accessories Fitter",
      location: "Branch - 1",
      locCode: "1",
      validUntil: "31 Jul 2026",
      scans: 48,
      qrCodeLink: "",
      token: "1007",
      walkInWindow: "10:00 – 13:00",
    },
    {
      id: "2",
      designation: "Customer Care Exe",
      location: "Branch - 2",
      locCode: "2",
      validUntil: "15 Aug 2026",
      scans: 21,
      qrCodeLink: "",
      token: "1008",
      walkInWindow: "11:00 – 15:00",
    },
    {
      id: "3",
      designation: "Office Boy",
      location: "Branch - 1",
      locCode: "1",
      validUntil: "05 Aug 2026",
      scans: 9,
      qrCodeLink: "",
      token: "1009",
      walkInWindow: "10:00 – 13:00",
    },
  ]);

  // Fetch initial master data
  useEffect(() => {
    const compCode = getCompCode();
    if (compCode) {
      fetchMaster();
      fetchPrintHeader();
    }
  }, [user, searchParams]);

  const fetchMaster = async () => {
    const compCode = getCompCode();
    if (!compCode) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/candreg`,
        null,
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );

      if (response?.data) {
        const desgs = (response.data.desg || []).map((item: any) => ({
          value: String(item.value ?? item.desg ?? item.DESIGNATION ?? item.name ?? ""),
          label: String(item.label ?? item.desg ?? item.DESIGNATION ?? item.name ?? ""),
        }));
        const locs = (response.data.location || []).map((item: any) => ({
          value: String(item.value ?? item.loc_code ?? item.LOC_CODE ?? item.id ?? ""),
          label: String(item.label ?? item.loc_name ?? item.LOC_NAME ?? item.name ?? ""),
        }));

        setDesgApplying(desgs);
        setBranchApplying(locs);
      }
    } catch (error) {
      console.error("Error fetching master data:", error);
    }
  };

  const fetchPrintHeader = async () => {
    const compCode = getCompCode();
    if (!compCode) return;

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/PrintHeader`,
        {
          multi_loc: user?.branch || user?.multi_loc || "ALL",
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "",
          },
        }
      );
      if (result?.data?.company?.length) {
        setCompany(result.data.company[0]);
        setDemocarfatch(result.data.DemoCarFetch?.[0] || {});
      }
    } catch (error) {
      console.error("Error fetching header data:", error);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "LOC_CODE") {
      const found = branchApplying.find((item) => String(item.value) === String(value));
      if (found) setSelectedLocationName(found.label);
    }
  };

  // Generate QR Code with the exact payload expected by registration page
  const generateCode = () => {
    if (!formData.LOC_CODE || !formData.DESIGNATION) {
      showSideAlert("Please select both location and designation", "warning");
      return;
    }

    const token = generateRandomToken(7);
    const numericToken = Math.floor(1000 + Math.random() * 9000).toString();
    setCodeToken(numericToken);

    const compCode = getCompCode();

    const payload = {
      Comp_code: compCode || user?.Comp_Code || "",
      Loc_code: formData.LOC_CODE,
      designation: formData.DESIGNATION,
      tran_id: "", // empty = fresh registration, no pre-fill
      token,
      timestamp: Date.now(),
      authToken: user?.authToken || "",
    };

    const v1 = btoa(JSON.stringify(payload));
    const dynamicLink = `https://erp.autovyn.com/autovyn/payroll/Recruitment_Process/Candidate_Registratio_Form?v1=${encodeURIComponent(v1)}`;
    setQrCodeLink(dynamicLink);
    setHasGeneratedCode(true);

    // Format valid date for display
    let formattedDate = validUntil;
    try {
      const d = new Date(validUntil);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    } catch {}

    // Add to active codes list
    const newActiveItem: ActiveCodeItem = {
      id: Date.now().toString(),
      designation: formData.DESIGNATION,
      location: selectedLocationName || "Branch - 1",
      locCode: formData.LOC_CODE,
      validUntil: formattedDate,
      scans: 0,
      qrCodeLink: dynamicLink,
      token: numericToken,
      walkInWindow: walkInWindow || "Any walk-in time",
    };

    setActiveCodes((prev) => [newActiveItem, ...prev.slice(0, 4)]);
    showSideAlert("QR code generated successfully!", "success");
  };

  // Copy Link to clipboard
  const handleCopyLink = () => {
    if (!hasGeneratedCode || !qrCodeLink) {
      showSideAlert("Please generate QR code first", "warning");
      return;
    }
    const linkToCopy = qrCodeLink || window.location.href;
    navigator.clipboard.writeText(linkToCopy);
    setCopied(true);
    showSideAlert("Registration link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  // Download QR Code as PNG
  const handleDownloadPNG = () => {
    if (!hasGeneratedCode) {
      showSideAlert("Please generate QR code first", "warning");
      return;
    }
    const canvas = document.querySelector("#qr-poster-canvas canvas") as HTMLCanvasElement;
    if (canvas) {
      const a = document.createElement("a");
      a.download = `QR_${formData.DESIGNATION || "WalkIn"}_${codeToken}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      showSideAlert("QR code downloaded as PNG", "success");
    } else {
      showSideAlert("Please generate QR code first", "warning");
    }
  };

  const SHIFTS = [
    { value: "Any walk-in time", label: "Any walk-in time" },
    { value: "10:00 – 13:00", label: "10:00 – 13:00" },
    { value: "14:00 – 17:00", label: "14:00 – 17:00" },
    { value: "Full day", label: "Full day" },
  ];

  // High Quality Poster Print via hidden iframe
  const handlePrintPoster = () => {
    if (!hasGeneratedCode || !formData.LOC_CODE || !formData.DESIGNATION) {
      showSideAlert("Please generate QR code first", "warning");
      return;
    }
    const printElement = document.getElementById("poster-print-container");
    if (!printElement) {
      showSideAlert("Poster content not ready to print", "warning");
      return;
    }

    // Clone the print element so we can convert canvas to image for printing
    const clone = printElement.cloneNode(true) as HTMLElement;

    // Convert canvas elements to img elements with dataURL so they render in print iframe
    const originalCanvases = printElement.querySelectorAll("canvas");
    const clonedCanvases = clone.querySelectorAll("canvas");
    originalCanvases.forEach((canvas, index) => {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const img = document.createElement("img");
        img.src = dataUrl;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.style.display = "block";
        img.alt = "QR Code";
        clonedCanvases[index]?.parentNode?.replaceChild(img, clonedCanvases[index]);
      } catch (e) {
        console.error("Error copying canvas to image for print:", e);
      }
    });

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
          <title>${formData.DESIGNATION || "Walk-In"} - Hiring QR Poster</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            html, body {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: system-ui, -apple-system, sans-serif;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            .poster-card {
              border: 1.5px solid #E2E8F0 !important;
              border-radius: 16px !important;
              padding: 36px 36px 32px 36px !important;
              max-width: 500px !important;
              margin: 20px auto !important;
              text-align: center !important;
              background: white !important;
              box-shadow: none !important;
            }
          </style>
        </head>
        <body>
          <div class="poster-card">
            ${clone.innerHTML}
          </div>
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

  // Format validUntil date string
  const formatValidDate = (dateStr: string) => {
    try {
      if (!dateStr) return "no expiry";
      return dateStr.split("-").reverse().join("/");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-4 sm:p-6 lg:p-[22px_24px_60px_24px] max-w-[1720px] mx-auto font-sans">
      {/* Page Title & Description */}
      <div className="mb-4.5">
        <div className="flex items-center gap-2.5">
          {/* <ImageA
            src="/Payrollicon/Interview_QRCode.png"
            alt="Interview QR"
            width={24}
            height={24}
            className="object-contain"
          /> */}
          <h1 className="text-[21px] font-semibold text-slate-900 dark:text-white tracking-[-0.02em]">
            Walk-in QR code
          </h1>
        </div>
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Generate a code for a location and role, print it for the reception desk, and walk-in candidates fill their own registration form.
        </p>
      </div>

      {/* Main Grid: 352px sidebar & preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[352px_minmax(0,1fr)] gap-[14px] items-start">
        {/* Left Column: Settings & Active Codes */}
        <div className="flex flex-col gap-3">
          {/* Card 1: Code settings */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-[17px_18px_19px_18px]">
            <div className="flex items-center gap-[9px] mb-3.5">
              <span className="w-[26px] h-[26px] rounded-lg bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] flex items-center justify-center shrink-0">
                <QrIcon className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                Code settings
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-[0.03em] uppercase">
                  Location <span className="text-[#E11D48]">*</span>
                </span>
                <Eselect
                  title=""
                  name="LOC_CODE"
                  option={branchApplying}
                  initialValue={formData.LOC_CODE}
                  handleInputChange={handleInputChange}
                  placeholder="Select location"
                  className="!h-9 !rounded-[9px] !text-[12.5px] !border-slate-200 dark:!border-slate-800"
                />
              </div>

              {/* Designation */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-[0.03em] uppercase">
                  Designation <span className="text-[#E11D48]">*</span>
                </span>
                <Eselect
                  title=""
                  name="DESIGNATION"
                  option={desgApplying}
                  initialValue={formData.DESIGNATION}
                  handleInputChange={handleInputChange}
                  placeholder="Select designation"
                  className="!h-9 !rounded-[9px] !text-[12.5px] !border-slate-200 dark:!border-slate-800"
                />
              </div>

              {/* Walk-in Window */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-[0.03em] uppercase">
                  Walk-in window
                </span>
                <Eselect
                  title=""
                  name="WALK_IN_WINDOW"
                  option={SHIFTS}
                  initialValue={walkInWindow}
                  handleInputChange={(name: string, val: any) => setWalkInWindow(val)}
                  placeholder="Select walk-in window"
                  className="!h-9 !rounded-[9px] !text-[12.5px] !border-slate-200 dark:!border-slate-800"
                />
              </div>

              {/* Valid Until */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-[0.03em] uppercase">
                  Valid until
                </span>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full h-9 px-2.5 text-[12.5px] rounded-[9px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1524] text-slate-900 dark:text-slate-100 outline-none focus:border-[#4F46E5] transition"
                />
              </div>

              {/* Generate Button */}
              <AButton
                type="button"
                onClick={generateCode}
                icon={<Sparkles className="w-3.5 h-3.5" />}
                className="w-full h-10 rounded-[10px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-[13px] shadow-xs flex items-center justify-center gap-2 mt-1 transition"
              >
                Generate code
              </AButton>
            </div>
          </div>

          {/* Card 2: Active Codes */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-[15px_18px_17px_18px]">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-[0.03em] uppercase">
              Active codes
            </span>

            <div className="flex flex-col gap-1.5 mt-3">
              {activeCodes.map((item) => {
                const isActive =
                  formData.DESIGNATION === item.designation &&
                  (formData.LOC_CODE === item.locCode || selectedLocationName === item.location);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        DESIGNATION: item.designation,
                        LOC_CODE: item.locCode,
                      }));
                      setSelectedLocationName(item.location);
                      if (item.token) setCodeToken(item.token);
                      if (item.walkInWindow) setWalkInWindow(item.walkInWindow);
                      if (item.qrCodeLink) {
                        setQrCodeLink(item.qrCodeLink);
                      } else {
                        const compCode = getCompCode();
                        const payload = {
                          Comp_code: compCode || user?.Comp_Code || "",
                          Loc_code: item.locCode,
                          designation: item.designation,
                          tran_id: "",
                          token: generateRandomToken(7),
                          timestamp: Date.now(),
                          authToken: user?.authToken || "",
                        };
                        const v1 = btoa(JSON.stringify(payload));
                        setQrCodeLink(`https://erp.autovyn.com/autovyn/payroll/Recruitment_Process/Candidate_Registratio_Form?v1=${encodeURIComponent(v1)}`);
                      }
                      setHasGeneratedCode(true);
                      showSideAlert(`Loaded existing code for ${item.designation}`, "info");
                    }}
                    className={`flex items-center gap-[11px] border rounded-[10px] p-[10px_12px] cursor-pointer text-left w-full transition ${
                      isActive
                        ? "border-[#4F46E5] bg-[#EEF2FF]/40 dark:bg-[#1E1B4B]/30"
                        : "border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="w-[26px] h-[26px] rounded-[7px] shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <QrIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.designation}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {item.location} · till {item.validUntil}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {item.scans}
                      </span>
                      <span className="block text-[10.5px] text-slate-400">scans</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Poster Preview Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 lg:p-7">
          {/* Top action row */}
          <div className="flex items-center gap-2.5 mb-6 sm:mb-8 flex-wrap">
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              Poster preview
            </h2>
            <span className="text-[11.5px] text-slate-400 font-normal">
              A4 portrait · prints at 100%
            </span>
            <div className="flex-1" />

            <AButton
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCopyLink}
              icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              className="rounded-full border-slate-200 dark:border-slate-800 font-medium"
            >
              {copied ? "Copied" : "Copy link"}
            </AButton>

            <AButton
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDownloadPNG}
              icon={<Download className="w-4 h-4" />}
              className="rounded-full border-slate-200 dark:border-slate-800 font-medium"
            >
              PNG
            </AButton>

            <AButton
              type="button"
              size="lg"
              onClick={handlePrintPoster}
              icon={<Printer className="w-4 h-4" />}
              className="rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs font-semibold"
            >
              Print
            </AButton>
          </div>

          {/* Central Poster Card */}
          {hasGeneratedCode && formData.LOC_CODE && formData.DESIGNATION && codeToken ? (
            <div className="grid place-items-center py-2 sm:py-6">
              <div
                id="poster-print-container"
                className="w-[480px] max-w-full bg-[#FFFFFF] border border-slate-200 rounded-[16px] shadow-[0_18px_44px_-22px_rgba(2,6,16,0.28)] p-8 sm:p-10 text-center text-[#0F172A]"
              >
                {/* Brand Badge */}
                <div className="flex items-center justify-center gap-[9px] mb-4">
                  <span className="w-[26px] h-[26px] rounded-[8px] bg-[#4F46E5] text-white flex items-center justify-center text-[11px] font-bold">
                    HS
                  </span>
                  <span className="text-[13px] font-bold tracking-[-0.01em] text-slate-800">
                    {company?.Comp_Name ? `${company.Comp_Name} · HR Setu` : "Autovyn · HR Setu"}
                  </span>
                </div>

                {/* Main Heading */}
                <div className="text-[26px] font-bold tracking-[-0.02em] leading-[1.15] text-slate-900">
                  We are hiring
                </div>

                {/* Role */}
                <div className="text-[17px] font-semibold text-[#4F46E5] mt-2">
                  {formData.DESIGNATION}
                </div>

                {/* Subtitle */}
                <div className="text-[13px] text-[#475569] mt-1.5">
                  {selectedLocationName || "Branch - 1, Jaipur"} · {walkInWindow || "Any walk-in time"}
                </div>

                {/* Centered QR Canvas Box */}
                <div className="grid place-items-center mt-6 mb-5">
                  <div
                    id="qr-poster-canvas"
                    className="w-[280px] h-[280px] p-3.5 bg-white border border-[#E2E8F0] rounded-[14px] flex items-center justify-center shadow-xs"
                  >
                    <QRCode
                      value={
                        qrCodeLink ||
                        "https://erp.autovyn.com/autovyn/payroll/Recruitment_Process/Candidate_Registratio_Form"
                      }
                      size={250}
                      bordered={false}
                      errorLevel="M"
                    />
                  </div>
                </div>

                {/* Scan CTA */}
                <div className="text-[14px] font-semibold text-slate-900 mt-2">
                  Scan to fill your application
                </div>

                {/* Subtext */}
                <div className="text-[12px] text-[#475569] mt-1.5 leading-[1.5]">
                  Takes about 5 minutes · keep your Aadhar, CV and last salary slip handy.
                </div>

                {/* Footer Code & Validity */}
                <div className="mt-6 pt-4 border-t border-dashed border-[#CBD5E1] text-[11px] text-[#64748B] tabular-nums font-medium">
                  Code QR-{codeToken} · valid till {formatValidDate(validUntil)}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid place-items-center py-[74px] px-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
                <QrIcon className="w-5 h-5" />
              </span>
              <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200 mt-3.5">
                Pick a location and designation
              </div>
              <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1 max-w-[340px]">
                The poster preview appears here once the code is generated — then print it for the reception desk.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 