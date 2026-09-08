"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  X,
  Briefcase,
  Building2,
  MapPin,
  Globe,
  Layers,
  Network,
  GitFork,
  Clock,
  Calendar,
  Hash,
  CreditCard,
  Landmark,
  ShieldCheck,
  User,
  Phone,
  Smartphone,
  Mail,
  AtSign,
  Heart,
  Users,
  Printer,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Employee = Record<string, any>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
};

const dash = (v: any) =>
  v === null || v === undefined || v === "" || v === "null" || v === "—"
    ? "—"
    : String(v);

const isValueFilled = (v: any) =>
  v !== null && v !== undefined && v !== "" && v !== "null" && v !== "—";

const formatDate = (dateString: any) => {
  if (!dateString || dateString === "null" || dateString === "—") return "—";
  try {
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const mon = d.toLocaleString("en-US", { month: "short" });
      const yr = d.getFullYear();
      return `${day} ${mon} ${yr}`;
    }
  } catch { }
  return dash(dateString);
};

const getInitials = (name: any) => {
  const n = String(name || "").trim();
  if (!n) return "EM";
  const parts = n.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
};

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: any;
}) {
  const filled = isValueFilled(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100/90 dark:border-slate-800/80 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
      <div className="flex items-center gap-2.5 text-[13.5px] sm:text-[14px] text-slate-600 dark:text-slate-300 font-medium shrink-0">
        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-400 shrink-0" />
        <span>{label}</span>
      </div>
      <div
        className={`text-[13.5px] sm:text-[14px] font-semibold text-right break-words max-w-[55%] ${filled
          ? "text-slate-800 dark:text-slate-100"
          : "text-slate-400 font-normal select-none"
          }`}
      >
        {filled ? String(value) : "—"}
      </div>
    </div>
  );
}

export default function EmployeeProfileDialog({
  isOpen,
  onClose,
  employee,
}: Props) {
  if (!employee) return null;

  const isActive =
    !employee?.LASTWOR_NEWDATE || employee?.LASTWOR_NEWDATE === "null";
  const initials = getInitials(employee?.EMPLOYEENAME);

  const empName = employee?.EMPLOYEENAME || "Employee Name";
  const designation = employee?.EMPLOYEEDESIGNATION;
  const department = employee?.Department || "Sales";
  const empCode = employee?.EMPCODE || "—";
  const location = employee?.Location || "Branch - 1";

  // Professional Information fields
  const employmentFields = [
    { icon: Hash, label: "Employee Code", value: employee?.EMPCODE },
    { icon: Briefcase, label: "Designation", value: employee?.EMPLOYEEDESIGNATION },
    { icon: Building2, label: "Department", value: employee?.Department },
    { icon: MapPin, label: "Location", value: employee?.Location },
    { icon: Globe, label: "Region", value: employee?.region1 || employee?.REGION },
    { icon: Layers, label: "Section", value: employee?.SECTION },
    { icon: GitFork, label: "Channel", value: employee?.CHANNEL },
    { icon: Network, label: "Cluster", value: employee?.CLUSTER || employee?.Br_Location },
    { icon: Clock, label: "Shift", value: employee?.EMPPLOYEESHIFT || "10.00 - 18.00" },
    { icon: Calendar, label: "Joining Date", value: formatDate(employee?.JOININGDATE) },
    { icon: Calendar, label: "Last Work Date", value: formatDate(employee?.LASTWOR_NEWDATE) },
    { icon: Hash, label: "Punch Code", value: employee?.PUNCHCODE },
  ];

  const paymentFields = [
    { icon: CreditCard, label: "Payment Mode", value: employee?.PAYMENTMODE },
    { icon: Landmark, label: "Bank Name", value: employee?.BANKNAME },
    { icon: CreditCard, label: "Bank Account No", value: employee?.BANKACCOUNTNO },
    { icon: ShieldCheck, label: "IFSC Code", value: employee?.IFSC_CODE },
  ];

  const allProfFields = [...employmentFields, ...paymentFields];

  // Personal Information fields
  const identityFields = [
    { icon: User, label: "Full Name", value: employee?.EMPLOYEENAME },
    { icon: User, label: "Gender", value: employee?.GENDER },
    { icon: Calendar, label: "Date of Birth", value: formatDate(employee?.DATEOFBIRTH) },
    { icon: Heart, label: "Marital Status", value: employee?.Marital_Status },
  ];

  const contactFields = [
    { icon: Phone, label: "Official Mobile", value: employee?.MOBILENO },
    { icon: Smartphone, label: "Personal Mobile", value: employee?.PERMOBILENO },
    { icon: Phone, label: "Emergency No", value: employee?.EMERGENCYNO },
    { icon: Mail, label: "Official Email", value: employee?.CORPORATEMAILID },
    { icon: AtSign, label: "Personal Email", value: employee?.ALTERNET_MAIL },
  ];

  const govFields = [
    { icon: CreditCard, label: "PAN No", value: employee?.PANNO },
    { icon: CreditCard, label: "Aadhar No", value: employee?.AADHARNO },
  ];

  const familyFields = [
    { icon: User, label: "Father's Name", value: employee?.FATHERNAME },
    { icon: User, label: "Mother's Name", value: employee?.MOTHERNAME },
    { icon: Users, label: "Spouse Name", value: employee?.SPOUSENAME },
  ];

  const allPersonalFields = [
    ...identityFields,
    ...contactFields,
    ...govFields,
    ...familyFields,
  ];

  const totalFields = allProfFields.length + allPersonalFields.length;
  const profFilledCount = allProfFields.filter((f) => isValueFilled(f.value)).length;
  const personalFilledCount = allPersonalFields.filter((f) =>
    isValueFilled(f.value)
  ).length;
  const totalFilled = profFilledCount + personalFilledCount;
  const completionPercentage = Math.round((totalFilled / totalFields) * 100);

  const todayFormatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${empName} - Profile</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              background: #ffffff;
              padding: 0;
            }
            .card-wrapper {
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              overflow: hidden;
              background: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #4C51EA, #4347E2, #3B40DB);
              color: #ffffff;
              padding: 20px 24px;
              position: relative;
            }
            .header-top {
              display: flex;
              align-items: center;
              gap: 18px;
            }
            .avatar {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              background: #FDE68A;
              color: #92400E;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 22px;
              font-weight: bold;
              border: 3px solid rgba(255, 255, 255, 0.4);
              flex-shrink: 0;
            }
            .title-area h2 {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 2px;
              color: #ffffff;
            }
            .title-area p {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.85);
              margin-bottom: 8px;
            }
            .badges {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
            }
            .badge {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: rgba(255, 255, 255, 0.2);
              color: #ffffff;
              padding: 3px 10px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 600;
            }
            .progress-bar-wrap {
              margin-top: 14px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 14px;
            }
            .progress-track {
              flex: 1;
              height: 7px;
              background: rgba(255, 255, 255, 0.25);
              border-radius: 9999px;
              overflow: hidden;
            }
            .progress-fill {
              height: 100%;
              background: #ffffff;
              border-radius: 9999px;
              width: ${Math.min(100, Math.max(5, completionPercentage))}%;
            }
            .progress-text {
              font-size: 11px;
              font-weight: 600;
              color: #ffffff;
              white-space: nowrap;
            }
            .body-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              padding: 14px;
              background: #f8fafc;
            }
            .section-card {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px 14px;
            }
            .card-title-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-bottom: 8px;
              margin-bottom: 8px;
              border-bottom: 1px solid #f1f5f9;
            }
            .card-title {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1e293b;
            }
            .card-count {
              font-size: 11px;
              font-weight: 600;
              color: #94a3b8;
            }
            .group-title {
              font-size: 10.5px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #4338CA;
              margin-bottom: 6px;
              margin-top: 6px;
            }
            .group-title.neutral {
              color: #64748b;
            }
            .row-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 3.5px 2px;
              border-bottom: 1px solid #f8fafc;
            }
            .row-label {
              font-size: 11.5px;
              color: #64748b;
              font-weight: 500;
            }
            .row-value {
              font-size: 11.5px;
              font-weight: 600;
              color: #1e293b;
              text-align: right;
              max-width: 60%;
            }
            .row-value.empty {
              color: #94a3b8;
              font-weight: normal;
            }
            .footer {
              padding: 10px 18px;
              border-top: 1px solid #f1f5f9;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10.5px;
              color: #64748b;
              background: #ffffff;
            }
          </style>
        </head>
        <body>
          <div class="card-wrapper">
            <div class="header">
              <div class="header-top">
                <div class="avatar">${initials}</div>
                <div class="title-area">
                  <h2>${empName}</h2>
                  <p>${designation || "No designation set"} · ${department}</p>
                  <div class="badges">
                    <span class="badge"># ${empCode}</span>
                    <span class="badge">${department}</span>
                    <span class="badge">${location}</span>
                    <span class="badge">${isActive ? "Active" : "Left"}</span>
                  </div>
                </div>
              </div>

              <div class="progress-bar-wrap">
                <div class="progress-track">
                  <div class="progress-fill"></div>
                </div>
                <div class="progress-text">Profile ${completionPercentage}% complete · ${totalFilled} of ${totalFields} fields</div>
              </div>
            </div>

            <div class="body-grid">
              <!-- Left Column: Professional Information -->
              <div class="section-card">
                <div class="card-title-row">
                  <div class="card-title">Professional Information</div>
                  <div class="card-count">${profFilledCount}/${allProfFields.length}</div>
                </div>

                <div class="group-title">Employment</div>
                ${employmentFields
                  .map(
                    (f) => `
                  <div class="row-item">
                    <span class="row-label">${f.label}</span>
                    <span class="row-value ${isValueFilled(f.value) ? "" : "empty"}">${dash(f.value)}</span>
                  </div>
                `
                  )
                  .join("")}

                <div class="group-title neutral" style="margin-top: 10px;">Payment & Bank</div>
                ${paymentFields
                  .map(
                    (f) => `
                  <div class="row-item">
                    <span class="row-label">${f.label}</span>
                    <span class="row-value ${isValueFilled(f.value) ? "" : "empty"}">${dash(f.value)}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>

              <!-- Right Column: Personal Information -->
              <div class="section-card">
                <div class="card-title-row">
                  <div class="card-title">Personal Information</div>
                  <div class="card-count">${personalFilledCount}/${allPersonalFields.length}</div>
                </div>

                <div class="group-title neutral">Identity</div>
                ${identityFields
                  .map(
                    (f) => `
                  <div class="row-item">
                    <span class="row-label">${f.label}</span>
                    <span class="row-value ${isValueFilled(f.value) ? "" : "empty"}">${dash(f.value)}</span>
                  </div>
                `
                  )
                  .join("")}

                <div class="group-title neutral" style="margin-top: 10px;">Contact</div>
                ${contactFields
                  .map(
                    (f) => `
                  <div class="row-item">
                    <span class="row-label">${f.label}</span>
                    <span class="row-value ${isValueFilled(f.value) ? "" : "empty"}">${dash(f.value)}</span>
                  </div>
                `
                  )
                  .join("")}

                <div class="group-title neutral" style="margin-top: 10px;">Government IDs</div>
                ${govFields
                  .map(
                    (f) => `
                  <div class="row-item">
                    <span class="row-label">${f.label}</span>
                    <span class="row-value ${isValueFilled(f.value) ? "" : "empty"}">${dash(f.value)}</span>
                  </div>
                `
                  )
                  .join("")}

                <div class="group-title neutral" style="margin-top: 10px;">Family</div>
                ${familyFields
                  .map(
                    (f) => `
                  <div class="row-item">
                    <span class="row-label">${f.label}</span>
                    <span class="row-value ${isValueFilled(f.value) ? "" : "empty"}">${dash(f.value)}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

            <div class="footer">
              <span>Last updated: <strong>${todayFormatted}</strong></span>
              <span>Employee Record · HR Setu</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="
          !max-w-[940px] w-[95vw] sm:w-[90vw] p-0 overflow-hidden
          bg-[#F8FAFC] dark:bg-[#07101F]
          border border-slate-200/90 dark:border-slate-800
          rounded-2xl shadow-2xl
          max-h-[92vh] flex flex-col
          [&>button]:hidden
        "
      >
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-r from-[#4C51EA] via-[#4347E2] to-[#3B40DB] dark:from-[#1E1B4B] dark:to-[#1E293B] p-5 sm:p-6 text-white overflow-hidden">
          {/* Subtle background curved circles like in screenshot */}
          <div className="absolute -right-10 -top-24 w-80 h-80 rounded-full bg-white/[0.08] pointer-events-none" />
          <div className="absolute right-24 -bottom-20 w-60 h-60 rounded-full bg-white/[0.08] pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer z-10 shadow-2xs"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-4 sm:gap-5 pr-10">
            {/* Avatar with status dot */}
            <div className="relative shrink-0">
              {employee?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={employee.photoUrl}
                  alt={empName}
                  className="h-16 w-16 sm:h-18 sm:w-18 rounded-full object-cover ring-4 ring-white/30 shadow-md"
                />
              ) : (
                <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-[#FDE68A] text-[#92400E] font-bold text-xl sm:text-2xl flex items-center justify-center ring-4 ring-white/30 shadow-md">
                  {initials}
                </div>
              )}

              {/* Status dot */}
              <span
                className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${isActive ? "bg-emerald-400" : "bg-rose-500"
                  }`}
              />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
                {empName}
              </h2>
              <p className="text-xs sm:text-[13px] text-white/85 font-normal mt-0.5 truncate">
                {designation || "No designation set"} · {department}
              </p>

              {/* Badges */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white">
                  <span className="text-white/80">#</span>
                  <span>{empCode}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white uppercase">
                  <Building2 className="h-3 w-3 text-white/90 shrink-0" />
                  <span>{department}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white uppercase">
                  <MapPin className="h-3 w-3 text-white/90 shrink-0" />
                  <span>{location}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white">
                  {isActive ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-white shrink-0" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-white shrink-0" />
                      <span>Left</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex-1 bg-white/25 h-2 rounded-full overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(5, completionPercentage))}%` }}
              />
            </div>
            <div className="text-xs text-white font-semibold whitespace-nowrap shrink-0">
              Profile {completionPercentage}% complete · {totalFilled} of{" "}
              {totalFields} fields
            </div>
          </div>
        </div>

        {/* Body Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Professional Information */}
            <div className="rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[#4338CA] dark:text-indigo-400 flex items-center justify-center">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <h3 className="text-[13px] sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Professional Information
                  </h3>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                  {profFilledCount}/{allProfFields.length}
                </span>
              </div>

              {/* EMPLOYMENT */}
              <div className="mb-4">
                <div className="text-[11.5px] font-bold text-[#4338CA] dark:text-indigo-400 uppercase tracking-wider mb-2 px-1">
                  Employment
                </div>
                <div className="space-y-0.5">
                  {employmentFields.map((f) => (
                    <InfoItem
                      key={f.label}
                      icon={f.icon}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                </div>
              </div>

              {/* PAYMENT & BANK */}
              <div>
                <div className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Payment & Bank
                </div>
                <div className="space-y-0.5">
                  {paymentFields.map((f) => (
                    <InfoItem
                      key={f.label}
                      icon={f.icon}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Personal Information */}
            <div className="rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[#4338CA] dark:text-indigo-400 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="text-[13px] sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Personal Information
                  </h3>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500">
                  {personalFilledCount}/{allPersonalFields.length}
                </span>
              </div>

              {/* IDENTITY */}
              <div className="mb-4">
                <div className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Identity
                </div>
                <div className="space-y-0.5">
                  {identityFields.map((f) => (
                    <InfoItem
                      key={f.label}
                      icon={f.icon}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                </div>
              </div>

              {/* CONTACT */}
              <div className="mb-4">
                <div className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Contact
                </div>
                <div className="space-y-0.5">
                  {contactFields.map((f) => (
                    <InfoItem
                      key={f.label}
                      icon={f.icon}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                </div>
              </div>

              {/* GOVERNMENT IDS */}
              <div className="mb-4">
                <div className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Government IDs
                </div>
                <div className="space-y-0.5">
                  {govFields.map((f) => (
                    <InfoItem
                      key={f.label}
                      icon={f.icon}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                </div>
              </div>

              {/* FAMILY */}
              <div>
                <div className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Family
                </div>
                <div className="space-y-0.5">
                  {familyFields.map((f) => (
                    <InfoItem
                      key={f.label}
                      icon={f.icon}
                      label={f.label}
                      value={f.value}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3.5 bg-white dark:bg-[#0B1220] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Last updated <span className="font-semibold text-slate-700 dark:text-slate-300">{todayFormatted}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 rounded-xl border border-indigo-200/80 bg-white hover:bg-indigo-50/40 text-[#4338CA] font-semibold text-xs shadow-2xs transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-[#4338CA] dark:text-indigo-400" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}