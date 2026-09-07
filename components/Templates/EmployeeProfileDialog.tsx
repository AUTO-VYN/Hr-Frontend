"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  X,
  BriefcaseBusiness,
  User,
  MapPin,
  Building2,
  Hash,
  Phone,
  Mail,
  CalendarDays,
  CreditCard,
  Landmark,
  BadgeCheck,
  BadgeX,
  ShieldCheck,
  ShieldX,
  Layers,
  Clock,
  Home,
  CheckCircle2,
} from "lucide-react";

type Employee = Record<string, any>;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
};

const dash = (v: any) => (v === null || v === undefined || v === "" || v === "null" ? "—" : String(v));

const formatDate = (dateString: any) => {
  if (!dateString || dateString === "null") return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dash(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" });
  const yr = d.getFullYear();
  return `${day} ${mon} ${yr}`;
};

const getInitials = (name: any) => {
  const n = String(name || "").trim();
  if (!n) return "??";
  const parts = n.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
};

const getAvatarColors = (name: any) => {
  const palettes = [
    { bg: "#E8F0FE", text: "#1A56DB" },
    { bg: "#ECFDF5", text: "#059669" },
    { bg: "#FEF3C7", text: "#D97706" },
    { bg: "#FEE2E2", text: "#DC2626" },
    { bg: "#E0E7FF", text: "#4F46E5" },
    { bg: "#F3E8FF", text: "#7C3AED" },
    { bg: "#FCE7F3", text: "#DB2777" },
    { bg: "#CCFBF1", text: "#0D9488" },
    { bg: "#FFEDD5", text: "#EA580C" },
    { bg: "#E4E4E7", text: "#52525B" },
    { bg: "#DBEAFE", text: "#2563EB" },
    { bg: "#D1FAE5", text: "#15803D" },
  ];

  const s = String(name || "");
  if (!s) return palettes[0];
  const hash = s.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
};

function SectionTitle({
  title,
  Icon,
}: {
  title: string;
  Icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-[#4338CA] dark:bg-indigo-500/10 dark:text-indigo-300">
        <Icon className="h-4 w-4" />
      </span>
      <h4 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">
        {title}
      </h4>
    </div>
  );
}

function InfoRow({
  label,
  value,
  Icon,
}: {
  label: string;
  value: any;
  Icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 min-w-[140px] sm:max-w-[200px]">
        {Icon ? (
          <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="leading-tight">{label}</span>
      </div>

      <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 sm:text-right break-words pl-5 sm:pl-0">
        {dash(value)}
      </div>
    </div>
  );
}

function Pill({
  Icon,
  text,
  tone = "blue",
}: {
  Icon: React.ElementType;
  text: string;
  tone?: "blue" | "green" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-500/20 text-emerald-100 ring-emerald-300/30"
      : tone === "red"
      ? "bg-rose-500/20 text-rose-100 ring-rose-300/30"
      : "bg-white/15 text-white ring-white/25";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 backdrop-blur-xs",
        toneClass,
      ].join(" ")}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{text}</span>
    </span>
  );
}

export default function EmployeeProfileDialog({ isOpen, onClose, employee }: Props) {
  if (!employee) return null;

  const isActive = !employee?.LASTWOR_NEWDATE;
  const colors = getAvatarColors(employee?.EMPLOYEENAME);
  const initials = getInitials(employee?.EMPLOYEENAME);

  const prof = [
    { label: "Employee Code", value: employee?.EMPCODE, Icon: Hash },
    { label: "Designation", value: employee?.EMPLOYEEDESIGNATION, Icon: BriefcaseBusiness },
    { label: "Department", value: employee?.Department, Icon: Building2 },
    { label: "Location", value: employee?.Location, Icon: MapPin },
    { label: "Region", value: employee?.region1, Icon: MapPin },
    { label: "Section", value: employee?.SECTION, Icon: Layers },
    { label: "Channel", value: employee?.CHANNEL, Icon: Building2 },
    { label: "Cluster", value: employee?.CLUSTER, Icon: MapPin },
    { label: "Shift", value: employee?.EMPPLOYEESHIFT, Icon: Clock },
    { label: "Joining Date", value: formatDate(employee?.JOININGDATE), Icon: CalendarDays },
    { label: "Last Work Date", value: formatDate(employee?.LASTWOR_NEWDATE), Icon: CalendarDays },
    { label: "Punch Code", value: employee?.PUNCHCODE, Icon: Hash },
    { label: "Payment Mode", value: employee?.PAYMENTMODE, Icon: CreditCard },
    { label: "Bank Name", value: employee?.BANKNAME, Icon: Landmark },
    { label: "Bank Account No", value: employee?.BANKACCOUNTNO, Icon: Landmark },
    { label: "IFSC Code", value: employee?.IFSC_CODE, Icon: ShieldCheck },
    {
      label: "Verified IFSC",
      value: employee?.VERIFIED_IFSC_CODE,
      Icon: employee?.VERIFIED_IFSC_CODE === "YES" ? BadgeCheck : ShieldX,
    },
    { label: "PF No", value: employee?.PFNO, Icon: ShieldCheck },
    { label: "PF Number", value: employee?.PFNUMBER, Icon: ShieldCheck },
    { label: "UAN No", value: employee?.UAN_No, Icon: ShieldCheck },
    { label: "ESI No", value: employee?.ESINO, Icon: ShieldCheck },
    { label: "ESI Number", value: employee?.ESINUMBER, Icon: ShieldCheck },
  ];

  const personal = [
    { label: "Full Name", value: employee?.EMPLOYEENAME, Icon: User },
    { label: "Gender", value: employee?.GENDER, Icon: User },
    { label: "Date of Birth", value: formatDate(employee?.DATEOFBIRTH), Icon: CalendarDays },
    { label: "Marital Status", value: employee?.Marital_Status, Icon: User },
    { label: "Official Mobile", value: employee?.MOBILENO, Icon: Phone },
    { label: "Personal Mobile", value: employee?.PERMOBILENO, Icon: Phone },
    { label: "Emergency No", value: employee?.EMERGENCYNO, Icon: Phone },
    { label: "Official Email", value: employee?.CORPORATEMAILID, Icon: Mail },
    { label: "Personal Email", value: employee?.ALTERNET_MAIL, Icon: Mail },
    { label: "PAN No", value: employee?.PANNO, Icon: CreditCard },
    { label: "Aadhar No", value: employee?.AADHARNO, Icon: CreditCard },
    { label: "Father's Name", value: employee?.FATHERNAME, Icon: User },
    { label: "Mother's Name", value: employee?.MOTHERNAME, Icon: User },
    { label: "Spouse Name", value: employee?.SPOUSENAME, Icon: User },
  ];

  const address = [
    { label: "Current Address", value: employee?.CURRENTADDRESS1, Icon: Home },
    { label: "Permanent Address", value: employee?.PERMANENTADDRESS1, Icon: Home },
    { label: "Pin Code", value: employee?.PINCODE, Icon: MapPin },
    { label: "State", value: employee?.STATE, Icon: MapPin },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="
          !max-w-[1000px] w-[95vw] sm:w-[90vw] p-0 overflow-hidden
          bg-white dark:bg-[#0B1220]
          border border-slate-200/90 dark:border-slate-800
          rounded-2xl shadow-2xl
          max-h-[90vh] flex flex-col
          [&>button]:text-white [&>button]:bg-white/20 hover:[&>button]:bg-white/35 [&>button]:z-20 [&>button]:rounded-full [&>button]:h-8 [&>button]:w-8 [&>button]:grid [&>button]:place-items-center [&>button]:transition
        "
      >
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-r from-[#1f3b73] via-[#244686] to-[#2a5298] dark:from-[#0a1628] dark:to-[#1a2a4a] px-5 sm:px-6 py-4 sm:py-5 text-white">
          <div className="flex items-center gap-4 sm:gap-5 pr-8">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-3 border-white/90 shadow-md">
                {employee?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={employee.photoUrl}
                    alt={employee?.EMPLOYEENAME || "Employee"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full grid place-items-center text-xl sm:text-2xl font-extrabold"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Status dot */}
              <span
                className={[
                  "absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-white",
                  isActive ? "bg-emerald-500" : "bg-rose-500",
                ].join(" ")}
              />
            </div>

            {/* Name + Details + Badges */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col">
                <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate leading-tight">
                  {employee?.EMPLOYEENAME || "N/A"}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-white/80 truncate mt-0.5">
                  {employee?.EMPLOYEEDESIGNATION || "N/A"}
                </p>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
                <Pill Icon={Hash} text={dash(employee?.EMPCODE)} tone="blue" />
                <Pill Icon={Building2} text={dash(employee?.Department || "ADMIN")} tone="blue" />
                <Pill Icon={MapPin} text={dash(employee?.Location)} tone="blue" />
                {isActive ? (
                  <Pill Icon={BadgeCheck} text="Active" tone="green" />
                ) : (
                  <Pill Icon={BadgeX} text="Left" tone="red" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 bg-slate-50/50 dark:bg-[#07101F]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Professional Column */}
            <div className="rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
              <SectionTitle title="Professional Information" Icon={BriefcaseBusiness} />
              <div className="space-y-0.5">
                {prof.map((f) => (
                  <InfoRow key={f.label} label={f.label} value={f.value} Icon={f.Icon} />
                ))}
              </div>
            </div>

            {/* Personal & Address Column */}
            <div className="space-y-4 sm:space-y-5">
              {/* Personal Information */}
              <div className="rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
                <SectionTitle title="Personal Information" Icon={User} />
                <div className="space-y-0.5">
                  {personal.map((f) => (
                    <InfoRow key={f.label} label={f.label} value={f.value} Icon={f.Icon} />
                  ))}
                </div>
              </div>

              {/* Address Information */}
              <div className="rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
                <SectionTitle title="Address Information" Icon={MapPin} />
                <div className="space-y-0.5">
                  {address.map((f) => (
                    <InfoRow key={f.label} label={f.label} value={f.value} Icon={f.Icon} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}