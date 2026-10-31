"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { QRCode } from "antd";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import Swal from "sweetalert2";
import Button from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import html2canvas from "html2canvas";
import {
  Building2,
  MapPin,
  Droplet,
  CalendarDays,
  ShieldCheck,
  Download,
  Hash,
  Mail,
  Layers,
  Square,
  AlertTriangle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

function EmployeeIdCardContent() {
  const user = useCurrentUser();
  const searchParams = useSearchParams();

  // Query params (used when QR code is scanned / searched)
  const urlEmpCode = searchParams?.get("empcode");
  const urlCompCode = searchParams?.get("compcode");
  const urlView = searchParams?.get("view");

  // Employee details state
  const [employee, setEmployee] = useState<any>(null);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>("");
  const [empOptions, setEmpOptions] = useState<Array<{ value: any; label: string }>>([]);

  // UI state
  const [viewSide, setViewSide] = useState<"both" | "front">("both");
  const [showVerificationQR, setShowVerificationQR] = useState(true);
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [showPhotoPlaceholder, setShowPhotoPlaceholder] = useState(true);

  // Loading & download states
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Toast alert
  function showSideAlert(message: string, type: "success" | "error" | "info" | "warning") {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
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

  // Load employee list for Eselect
  useEffect(() => {
    if (!user?.Comp_Code) return;

    const fetchEmpList = async () => {
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
          { branch: user?.branch },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        if (result.data?.data && Array.isArray(result.data.data)) {
          setEmpOptions(result.data.data);
        }
      } catch (err) {
        console.error("Error fetching employee list:", err);
      }
    };

    fetchEmpList();
  }, [user?.Comp_Code, user?.name, user?.branch]);

  // Set initial selected employee or load from QR scan search params
  useEffect(() => {
    if (urlEmpCode) {
      setSelectedEmpCode(urlEmpCode);
      getEmployee(urlEmpCode, urlCompCode || undefined);
      if (urlView === "front") {
        setViewSide("front");
      }
    } else if (user?.EMPCODE && !selectedEmpCode) {
      setSelectedEmpCode(user.EMPCODE);
      getEmployee(user.EMPCODE);
    }
  }, [user, urlEmpCode, urlCompCode, urlView]);

  // Fetch single employee card details
  const getEmployee = async (empcodeToFetch?: string, compcodeToUse?: string) => {
    const targetCode = empcodeToFetch || selectedEmpCode || user?.EMPCODE;
    if (!targetCode) return;

    setIsLoading(true);
    try {
      const targetComp = compcodeToUse || employee?.Comp_Code || user?.Comp_Code || "1";
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/employee/getEmployeeIdCard`,
        {
          params: { empcode: targetCode },
          headers: { compcode: targetComp },
        }
      );
      if (data?.data) {
        setEmployee(data.data);
      }
    } catch (err) {
      console.error("Error fetching employee ID card:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe fallback values (strictly retaining user keys)
  const empCode = employee?.EMPCODE || selectedEmpCode || user?.EMPCODE;
  const empName = employee?.EMPLOYEENAME || employee?.EMP_NAME || user?.name;
  const empDesig = employee?.EMPLOYEEDESIGNATION || employee?.DESIGNATION;
  const empDept = employee?.DEPARTMENT;
  const empLoc = employee?.LOCATION || employee?.BRANCH_NAME || user?.branch;
  const empComp = employee?.Comp_Name || user?.Comp_Name;
  const empEmail = employee?.CORPORATEMAILID || employee?.EMAIL;
  const empBlood = employee?.BLOODGROUP || employee?.BLOOD_GROUP;
  const empDob = employee?.DOB || employee?.DATEOFBIRTH || employee?.BIRTHDATE;
  const empDoj = employee?.DOJ || employee?.DATEOFJOINING;
  const empMobile = employee?.MOBILENO || employee?.MOBILE || employee?.PHONE;
  const empEmergency =
    employee?.EMERGENCYNO ||
    (employee?.EMERGENCYNAME
      ? `${employee.EMERGENCYNAME} · ${employee.EMERGENCYNO || ""}`
      : "");
  const empAddress = employee?.CURRENTADDRESS1;
  const empPhoto = employee?.photo || "";
  const compLogo = employee?.companyLogo || "";

  // Helper: Format Date
  const formatDate = (value: string) => {
    if (!value) return "—";
    let dateObj: Date;
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(value)) {
      const [day, month, year] = value.split(/[/-]/);
      dateObj = new Date(+year, +month - 1, +day);
    } else {
      dateObj = new Date(value);
    }
    if (isNaN(dateObj as any)) return value;
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper: Get Name Initials (e.g. Gopal Sodani -> GS, Tarun Gupta -> TG)
  const getInitials = (name?: string) => {
    if (!name) return "EMP";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Live URL for scannable QR Code
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && empCode) {
      const origin = window.location.origin;
      const comp = employee?.Comp_Code || user?.Comp_Code || "";
      setQrUrl(
        `${origin}/payroll/attendance-punch/employee-id-card?empcode=${encodeURIComponent(
          empCode
        )}&compcode=${encodeURIComponent(comp)}&view=front`
      );
    }
  }, [empCode, employee?.Comp_Code, user?.Comp_Code]);

  // Options for Eselect
  const selectOptions = useMemo(() => {
    if (empOptions.length > 0) return empOptions;
    if (user?.EMPCODE) {
      return [{ value: user.EMPCODE, label: `${user.EMPCODE} · ${user.name || "Current User"}` }];
    }
    return [{ value: "1972153", label: "1972153 · Gopal Sodani" }];
  }, [empOptions, user]);

  // Handle employee change
  const handleEmpChange = (val: string) => {
    setSelectedEmpCode(val);
    getEmployee(val);
  };

  // Download Handler via html2canvas
  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${empCode || "employee"}-id-card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showSideAlert("ID card PDF downloaded", "success");
    } catch (err) {
      console.error("Download failed:", err);
      showSideAlert("Download failed, please try again", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  // Checklist items strictly matching prototype
  const checks = [
    {
      label: !empDob || empDob === "—" ? "Date of birth missing on master" : "Date of birth on record",
      ok: Boolean(empDob && empDob !== "—"),
    },
    {
      label: showBloodGroup ? "Blood group printed" : "Blood group hidden — safety risk",
      ok: Boolean(showBloodGroup && empBlood),
    },
    {
      label: empEmergency ? "Emergency contact present" : "Emergency contact missing",
      ok: Boolean(empEmergency),
    },
    {
      label: showPhotoPlaceholder || !empPhoto ? "Photo placeholder — upload a real photo before printing" : "Photo uploaded",
      ok: Boolean(!showPhotoPlaceholder && empPhoto),
    },
  ];

  return (
    <div className="min-h-screen dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-sans antialiased">
      {/* Top Header bar */}
      <header className="z-30 dark:border-[#1F2937] px-6 py-3 flex items-center gap-4">
        <div className="flex-1" />

        <Button
          variant="primary"
          size="sm"
          loading={isDownloading}
          loadingText="Downloading..."
          icon={<Download size={14} />}
          onClick={handleDownload}
          className="h-8 text-[12.5px] font-[600] px-[14px] rounded-[10px] border border-transparent bg-[#4F46E5] dark:bg-[#8B84FF] text-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] hover:brightness-105"
        >
          Download PDF
        </Button>
      </header>

      {/* Main Container */}
      <main className="p-6 pb-[60px]">
        {/* Title Area */}
        <div className="mb-[18px]">
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] m-0">
            Employee ID card
          </h1>
          <p className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-[5px] m-0">
            Front and back of the printed card. Flip to check the emergency details before sending it to print.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
          {/* LEFT COLUMN: Controls & Checklist */}
          <div className="flex flex-col gap-3">
            {/* Box 1: Card Configuration */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[16px_17px_18px_17px]">
              <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase block">
                Card for
              </span>

              {/* Eselect Component */}
              <div className="mt-2">
                <Eselect
                  name="empcode"
                  option={selectOptions}
                  initialValue={selectedEmpCode}
                  handleInputChange={(_, val) => handleEmpChange(val)}
                  placeholder="Select Employee"
                  className="w-full rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] text-[12.5px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                />
              </div>

              {/* Side Selector Buttons */}
              <div className="flex gap-[6px] mt-[13px]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Layers size={14} />}
                  onClick={() => setViewSide("both")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-[7px] text-[12.5px] font-[600] py-2 h-[34px] rounded-[9px] border transition-all cursor-pointer",
                    viewSide === "both"
                      ? "border-[#4F46E5] dark:border-[#8B84FF] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]"
                      : "border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:border-[#4F46E5]"
                  )}
                >
                  Both sides
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Square size={14} />}
                  onClick={() => setViewSide("front")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-[7px] text-[12.5px] font-[600] py-2 h-[34px] rounded-[9px] border transition-all cursor-pointer",
                    viewSide === "front"
                      ? "border-[#4F46E5] dark:border-[#8B84FF] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]"
                      : "border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:border-[#4F46E5]"
                  )}
                >
                  Front only
                </Button>
              </div>

              {/* Card Options Toggles */}
              <div className="mt-[14px] pt-[13px] border-t border-[#E2E8F0] dark:border-[#1F2937] flex flex-col gap-[9px]">
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase block">
                  Card options
                </span>

                {/* Option 1: QR */}
                <button
                  type="button"
                  onClick={() => setShowVerificationQR(!showVerificationQR)}
                  className="flex items-center gap-[10px] border-none bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] p-0 cursor-pointer text-left"
                >
                  <span
                    className={cn(
                      "w-[30px] h-[17px] rounded-full shrink-0 relative transition-colors duration-150",
                      showVerificationQR ? "bg-[#4F46E5] dark:bg-[#8B84FF]" : "bg-[#E2E8F0] dark:bg-[#1F2937]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white transition-all duration-150",
                        showVerificationQR ? "left-[15px]" : "left-[2px]"
                      )}
                    />
                  </span>
                  Show verification QR
                </button>

                {/* Option 2: Blood Group */}
                <button
                  type="button"
                  onClick={() => setShowBloodGroup(!showBloodGroup)}
                  className="flex items-center gap-[10px] border-none bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] p-0 cursor-pointer text-left"
                >
                  <span
                    className={cn(
                      "w-[30px] h-[17px] rounded-full shrink-0 relative transition-colors duration-150",
                      showBloodGroup ? "bg-[#4F46E5] dark:bg-[#8B84FF]" : "bg-[#E2E8F0] dark:bg-[#1F2937]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white transition-all duration-150",
                        showBloodGroup ? "left-[15px]" : "left-[2px]"
                      )}
                    />
                  </span>
                  Show blood group
                </button>

                {/* Option 3: Photo Placeholder */}
                <button
                  type="button"
                  onClick={() => setShowPhotoPlaceholder(!showPhotoPlaceholder)}
                  className="flex items-center gap-[10px] border-none bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] p-0 cursor-pointer text-left"
                >
                  <span
                    className={cn(
                      "w-[30px] h-[17px] rounded-full shrink-0 relative transition-colors duration-150",
                      showPhotoPlaceholder ? "bg-[#4F46E5] dark:bg-[#8B84FF]" : "bg-[#E2E8F0] dark:bg-[#1F2937]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[2px] w-[13px] h-[13px] rounded-full bg-white transition-all duration-150",
                        showPhotoPlaceholder ? "left-[15px]" : "left-[2px]"
                      )}
                    />
                  </span>
                  Show photo placeholder
                </button>
              </div>
            </div>

            {/* Box 2: Print Checklist */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[15px_17px_16px_17px]">
              <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase block">
                Print checklist
              </span>

              <div className="flex flex-col gap-2 mt-[11px]">
                {checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-[9px] text-[12px]">
                    <span
                      className={cn(
                        "w-[17px] h-[17px] rounded-[5px] shrink-0 grid place-items-center",
                        c.ok
                          ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                          : "bg-[rgba(245,158,11,0.16)] text-[#B45309]"
                      )}
                    >
                      {c.ok ? <Check size={11} strokeWidth={2.5} /> : <AlertTriangle size={11} />}
                    </span>
                    <span className="flex-1 min-w-0 text-[#1E293B] dark:text-[#E7ECF3]">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Preview Card Canvas */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[30px] grid place-items-center min-h-[560px]">
            <div
              ref={cardRef}
              className="flex gap-[26px] items-start flex-wrap justify-center bg-transparent"
            >
              {/* ================= FRONT CARD (326px) ================= */}
              <div
                className="w-[326px] rounded-[16px] overflow-hidden shadow-[0_22px_52px_-22px_rgba(2,6,16,0.45)] bg-[#0B1220] text-white relative select-none"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                {/* Left ribbon */}
                <div className="absolute inset-y-0 left-0 w-[34px] bg-[linear-gradient(180deg,#1E1B4B,#0B1220)] grid place-items-center z-10">
                  <span
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    className="text-[8.5px] tracking-[0.32em] text-white/50 uppercase font-mono"
                  >
                    Autovyn · verified · autovyn
                  </span>
                </div>

                {/* Main Card Content */}
                <div className="ml-[34px] bg-white text-[#0F172A]">
                  {/* Top Header */}
                  <div className="bg-[#0B1220] text-white p-[13px_15px] flex items-center gap-[9px]">
                    {compLogo ? (
                      <img
                        src={compLogo}
                        crossOrigin="anonymous"
                        alt="logo"
                        className="w-[22px] h-[22px] rounded-[6px] bg-white object-contain p-0.5"
                      />
                    ) : (
                      <span className="w-[22px] h-[22px] rounded-[6px] bg-[#4F46E5] grid place-items-center text-[9px] font-[700] text-white">
                        HS
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-[700] tracking-[0.02em] uppercase truncate text-white">
                        {empComp || "DEMO COMPANY"}
                      </span>
                      <span className="block text-[9px] text-white/60 mt-[1px] uppercase truncate">
                        {empLoc || "BRANCH - 1"}
                      </span>
                    </span>
                    <span className="text-[8.5px] tracking-[0.16em] text-white/55 font-mono">
                      EMP ID
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-[18px_18px_20px_18px] text-center">
                    {/* Circle Avatar */}
                    {showPhotoPlaceholder || !empPhoto ? (
                      <div className="w-[76px] h-[76px] mx-auto rounded-full border-[3px] border-[#F59E0B] bg-[#FEF3C7] grid place-items-center text-[22px] font-[700] text-[#92400E]">
                        {getInitials(empName)}
                      </div>
                    ) : (
                      <div className="w-[76px] h-[76px] mx-auto rounded-full border-[3px] border-[#F59E0B] overflow-hidden bg-slate-100">
                        <img
                          src={empPhoto}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                          alt={empName || "Employee"}
                        />
                      </div>
                    )}

                    {/* Employee Name */}
                    <div className="text-[17px] font-[700] tracking-[-0.01em] mt-[12px] uppercase text-[#0F172A] truncate">
                      {empName || "—"}
                    </div>

                    {/* Designation Pill */}
                    <div className="inline-block mt-[7px] text-[9.5px] font-[700] tracking-[0.1em] uppercase border border-[#CBD5E1] rounded-full px-3 py-[3px] text-[#0F172A]">
                      {empDesig || "—"}
                    </div>

                    {/* Details rows */}
                    <div className="flex flex-col gap-2 mt-4 text-left">
                      <div className="flex items-center gap-[9px] text-[10.5px]">
                        <span className="w-[13px] grid place-items-center text-[#94A3B8]">
                          <Building2 size={13} />
                        </span>
                        <span className="w-[84px] shrink-0 text-[#64748B]">Department</span>
                        <span className="flex-1 min-w-0 font-[600] truncate text-right text-[#0F172A]">
                          {empDept || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-[9px] text-[10.5px]">
                        <span className="w-[13px] grid place-items-center text-[#94A3B8]">
                          <Hash size={13} />
                        </span>
                        <span className="w-[84px] shrink-0 text-[#64748B]">Emp code</span>
                        <span className="flex-1 min-w-0 font-[600] truncate text-right text-[#0F172A]">
                          {empCode || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-[9px] text-[10.5px]">
                        <span className="w-[13px] grid place-items-center text-[#94A3B8]">
                          <Mail size={13} />
                        </span>
                        <span className="w-[84px] shrink-0 text-[#64748B]">Email</span>
                        <span
                          className="flex-1 min-w-0 font-[600] truncate text-right text-[#0F172A]"
                          title={empEmail}
                        >
                          {empEmail || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-[9px] text-[10.5px]">
                        <span className="w-[13px] grid place-items-center text-[#94A3B8]">
                          <MapPin size={13} />
                        </span>
                        <span className="w-[84px] shrink-0 text-[#64748B]">Location</span>
                        <span className="flex-1 min-w-0 font-[600] truncate text-right text-[#0F172A]">
                          {empLoc || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-[9px] text-[10.5px]">
                        <span className="w-[13px] grid place-items-center text-[#94A3B8]">
                          <Droplet size={13} />
                        </span>
                        <span className="w-[84px] shrink-0 text-[#64748B]">Blood group</span>
                        <span className="flex-1 min-w-0 font-[600] truncate text-right text-[#0F172A]">
                          {showBloodGroup ? empBlood || "—" : "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-[9px] text-[10.5px]">
                        <span className="w-[13px] grid place-items-center text-[#94A3B8]">
                          <CalendarDays size={13} />
                        </span>
                        <span className="w-[84px] shrink-0 text-[#64748B]">DOB</span>
                        <span className="flex-1 min-w-0 font-[600] truncate text-right text-[#0F172A]">
                          {formatDate(empDob)}
                        </span>
                      </div>

                      <div className="flex items-center gap-[9px] text-[10.5px]">
                        <span className="w-[13px] grid place-items-center text-[#94A3B8]">
                          <CalendarDays size={13} />
                        </span>
                        <span className="w-[84px] shrink-0 text-[#64748B]">Joined</span>
                        <span className="flex-1 min-w-0 font-[600] truncate text-right text-[#0F172A]">
                          {formatDate(empDoj)}
                        </span>
                      </div>
                    </div>

                    {/* Perforation Seam & EMPCODE */}
                    <div className="mt-4 pt-[11px] border-t border-dashed border-[#CBD5E1] text-[12px] font-[700] text-[#E11D48] tracking-[0.06em] text-right font-mono tabular-nums">
                      {empCode || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= BACK CARD (326px) ================= */}
              {viewSide === "both" && (
                <div
                  className="w-[326px] rounded-[16px] overflow-hidden shadow-[0_22px_52px_-22px_rgba(2,6,16,0.45)] bg-white text-[#0F172A] border border-[#E2E8F0] dark:border-[#1F2937] select-none"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  {/* Top Header */}
                  <div className="bg-[#0B1220] text-white p-[13px_15px] flex items-center gap-[9px]">
                    <ShieldCheck size={15} />
                    <span className="text-[11px] font-[700] tracking-[0.02em]">
                      IF FOUND, PLEASE RETURN
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-[18px]">
                    {showVerificationQR && (
                      <div className="grid place-items-center mb-4">
                        <div
                          className="w-[118px] h-[118px] p-2 border border-[#E2E8F0] rounded-[10px] bg-white flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-xs"
                          title="Click or Scan to view Front Card"
                          onClick={() => setViewSide("front")}
                        >
                          <QRCode
                            value={
                              qrUrl ||
                              `${
                                typeof window !== "undefined"
                                  ? window.location.origin
                                  : ""
                              }/payroll/attendance-punch/employee-id-card?empcode=${empCode}&view=front`
                            }
                            size={102}
                            bordered={false}
                            type="svg"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewSide("front")}
                          className="text-[9.5px] text-[#64748B] hover:text-[#4F46E5] mt-[7px] cursor-pointer transition-colors"
                        >
                          Scan to verify this card
                        </button>
                      </div>
                    )}

                    {/* Details Rows */}
                    <div className="flex flex-col gap-[9px]">
                      <div className="flex gap-[10px] items-baseline text-[10.5px]">
                        <span className="w-[96px] shrink-0 text-[#64748B]">Mobile</span>
                        <span className="flex-1 min-w-0 font-[600] leading-[1.45] text-[#0F172A]">
                          {empMobile || "—"}
                        </span>
                      </div>

                      <div className="flex gap-[10px] items-baseline text-[10.5px]">
                        <span className="w-[96px] shrink-0 text-[#64748B]">Emergency</span>
                        <span className="flex-1 min-w-0 font-[600] leading-[1.45] text-[#0F172A]">
                          {empEmergency || "—"}
                        </span>
                      </div>

                      <div className="flex gap-[10px] items-baseline text-[10.5px]">
                        <span className="w-[96px] shrink-0 text-[#64748B]">Blood group</span>
                        <span className="flex-1 min-w-0 font-[600] leading-[1.45] text-[#0F172A]">
                          {showBloodGroup ? empBlood || "—" : "Not printed"}
                        </span>
                      </div>

                      <div className="flex gap-[10px] items-baseline text-[10.5px]">
                        <span className="w-[96px] shrink-0 text-[#64748B]">DOB</span>
                        <span className="flex-1 min-w-0 font-[600] leading-[1.45] text-[#0F172A]">
                          {formatDate(empDob)}
                        </span>
                      </div>

                      <div className="flex gap-[10px] items-baseline text-[10.5px]">
                        <span className="w-[96px] shrink-0 text-[#64748B]">Date of joining</span>
                        <span className="flex-1 min-w-0 font-[600] leading-[1.45] text-[#0F172A]">
                          {formatDate(empDoj)}
                        </span>
                      </div>

                      <div className="flex gap-[10px] items-baseline text-[10.5px]">
                        <span className="w-[96px] shrink-0 text-[#64748B]">Address</span>
                        <span className="flex-1 min-w-0 font-[600] leading-[1.45] text-[#0F172A]">
                          {empAddress || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Disclaimer Footer */}
                    <div className="mt-4 pt-3 border-t border-dashed border-[#CBD5E1] text-[9.5px] text-[#64748B] leading-[1.5]">
                      This card is the property of Autovyn Motors Pvt. Ltd. and must be surrendered on separation. Misuse will attract disciplinary action.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Loading overlay */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}

export default function EmployeeIdCardPage() {
  return (
    <Suspense fallback={<HashloaderComponent isLoading={true} />}>
      <EmployeeIdCardContent />
    </Suspense>
  );
}
