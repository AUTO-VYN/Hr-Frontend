"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { QRCode } from "antd";
import Swal from "sweetalert2";
import axios from "axios";
import {
  QrCode,
  Download,
  RotateCcw,
  ScanLine,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";

type Option = {
  value: string;
  label: string;
};

function QRScannerContent() {
  const router = useRouter();
  const user = useCurrentUser() as any;

  // QR Generation State
  const [formData, setFormData] = useState({ DESIGNATION: "" });
  const [desgApplying, setDesgApplying] = useState<Option[]>([]);
  const [qrCodeLink, setQrCodeLink] = useState("");
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Side alert helper
  const showSideAlert = (
    message: string,
    type: "success" | "warning" | "error" | "info" = "info"
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
        popup: "rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 text-sm font-medium",
      },
    });
  };

  // Helper to deduplicate options
  const dedupeOptions = (list: Option[]): Option[] => {
    const seen = new Set<string>();
    const out: Option[] = [];
    for (const item of list) {
      const key = `${String(item.value).trim().toLowerCase()}:::${String(item.label).trim().toLowerCase()}`;
      if (!seen.has(key) && (item.value || item.label)) {
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  };

  // Fetch Master Data (Designations)
  const fetchMaster = async () => {
    const compCode = user?.Comp_Code || user?.compcode || "";
    if (!compCode) return;

    try {
      // 1. Fetch from /employee/masters
      try {
        const mastersRes = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          {
            headers: {
              compcode: compCode,
              name: user?.name || "",
            },
          }
        );
        const mData = mastersRes.data?.data || mastersRes.data;
        if (mData && Array.isArray(mData.EMPLOYEEDESIGNATION)) {
          const desgs: Option[] = mData.EMPLOYEEDESIGNATION.map((item: any) => {
            const lbl = String(item.label ?? item.NAME ?? item.desg_name ?? item.value ?? "").trim();
            return { value: lbl, label: lbl };
          }).filter((x: Option) => Boolean(x.label));
          setDesgApplying((prev) => dedupeOptions([...prev, ...desgs]));
        }
      } catch (err) {
        console.error("Error fetching employee masters:", err);
      }

      // 2. Fetch from /interview/candreg
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
          const desgs: Option[] = (response.data.desg || [])
            .map((item: any) => {
              const lbl = String(item.label ?? item.NAME ?? item.designation ?? item.desg ?? item.name ?? item.value ?? item ?? "").trim();
              return { value: lbl, label: lbl };
            })
            .filter((d: Option) => Boolean(d.label));

          if (desgs.length > 0) {
            setDesgApplying((prev) => dedupeOptions([...prev, ...desgs]));
          }
        }
      } catch (err) {
        console.error("Error fetching candreg masters:", err);
      }
    } catch (error) {
      console.error("Error fetching master data:", error);
    }
  };

  useEffect(() => {
    fetchMaster();
  }, [user?.Comp_Code]);

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setQrCodeLink("");
  };

  // Generate QR Code Link
  const generateCode = () => {
    if (!formData.DESIGNATION) {
      showSideAlert("Please select designation", "warning");
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const compCode = String(user?.Comp_Code || user?.compcode || "");
    const params = new URLSearchParams({
      compcode: compCode,
      designation: formData.DESIGNATION,
    });
    const dynamicLink = `${baseUrl}/payroll/hcm/employee-transfer-form?${params.toString()}`;
    setQrCodeLink(dynamicLink);
    showSideAlert("QR Code Generated Successfully!", "success");
  };

  // Download QR Code PNG
  const downloadQRCode = () => {
    if (!qrCodeRef.current) return;
    const canvas = qrCodeRef.current.querySelector<HTMLCanvasElement>("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `Employee_QR_${user?.Comp_Code || "Transfer"}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSideAlert("QR Code Downloaded Successfully!", "success");
      return;
    }
    const imgElement = qrCodeRef.current.querySelector<HTMLImageElement>("img");
    if (imgElement?.src) {
      const link = document.createElement("a");
      link.href = imgElement.src;
      link.download = `Employee_QR_${user?.Comp_Code || "Transfer"}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSideAlert("QR Code Downloaded Successfully!", "success");
      return;
    }
    showSideAlert("QR Code not found. Please generate first.", "warning");
  };

  // Reset QR Tab
  const handleReset = () => {
    setQrCodeLink("");
    setFormData({ DESIGNATION: "" });
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* HEADER BANNER                                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#0f172a] to-[#18233d] p-4 sm:p-5 text-white flex items-center justify-between shadow-sm border border-slate-800">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10 shrink-0">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase truncate">
              INTERNAL JOB POSTING
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 truncate">
              Generate a QR code for employee transfer
            </p>
          </div>
        </div>

        <AButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.history.back();
            }
          }}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="shrink-0 border-white/20 text-white bg-white/5 hover:bg-white/15 dark:border-slate-700"
        >
          Back
        </AButton>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* GENERATE QR CODE SECTION                                                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Card: Create a transfer QR */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Create a transfer QR
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Employees scan it to open the transfer form with the designation pre-filled.
            </p>

            {/* Steps timeline */}
            <div className="space-y-4 my-6">
              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  1
                </span>
                <div>
                  <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">
                    Choose designation
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    The role this QR opens a transfer for
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  2
                </span>
                <div>
                  <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">
                    Generate &amp; download
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Print or share the PNG
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  3
                </span>
                <div>
                  <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">
                    Employee scans
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Form opens with designation pre-filled
                  </p>
                </div>
              </div>
            </div>

            {/* Form Input: DESIGNATION * using Eselect */}
            <div className="space-y-1.5 mt-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                DESIGNATION <span className="text-rose-500">*</span>
              </label>
              <Eselect
                name="DESIGNATION"
                placeholder="Select a designation"
                option={desgApplying}
                initialValue={formData.DESIGNATION}
                handleInputChange={handleInputChange}
              />
            </div>

            {/* Generate QR Button using AButton */}
            <AButton
              type="button"
              variant="primary"
              size="md"
              onClick={generateCode}
              disabled={!formData.DESIGNATION}
              icon={<QrCode className="w-4 h-4" />}
              className="w-full mt-4 h-11 font-semibold rounded-xl"
            >
              Generate QR code
            </AButton>
          </div>

          {/* Developer Mode section */}
          <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              DEVELOPER MODE
            </span>
            <AButton
              type="button"
              variant="outline"
              size="lg"
              disabled={!qrCodeLink}
              icon={<ScanLine className="w-3.5 h-3.5 text-indigo-500" />}
              onClick={() => {
                if (!formData.DESIGNATION) {
                  showSideAlert("Please select designation first", "warning");
                  return;
                }
                const compCode = String(user?.Comp_Code || user?.compcode || "");
                const params = new URLSearchParams();
                if (compCode) params.set("compcode", compCode);
                if (formData.DESIGNATION) params.set("designation", formData.DESIGNATION);
                router.push(`/payroll/hcm/employee-transfer-form?${params.toString()}`);
              }}
              className="text-md text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-2.5 py-1.5 h-auto rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            >
              Simulate scan
            </AButton>
          </div>
        </div>

        {/* Right Card: QR Preview */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-6 shadow-xs flex flex-col items-center justify-center min-h-[420px]">
          {!qrCodeLink ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mb-5 bg-slate-50/50 dark:bg-slate-900/30">
                <LayoutGrid className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No QR yet
              </h3>
              <p className="text-xs text-slate-400 max-w-[240px] mt-1">
                Pick a designation and generate to preview it here.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center text-center py-4" ref={qrCodeRef}>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md">
                <QRCode
                  value={qrCodeLink}
                  size={220}
                  bordered={false}
                  errorLevel="M"
                />
              </div>
              <p className="mt-5 text-sm font-semibold text-slate-800 dark:text-white">
                Scan to open Internal Job Posting
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Generated on{" "}
                {new Date().toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                {formData.DESIGNATION}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-6">
                <AButton
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<Download className="w-4 h-4" />}
                  onClick={downloadQRCode}
                >
                  Download QR
                </AButton>
                <AButton
                  type="button"
                  variant="outline"
                  size="md"
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={handleReset}
                >
                  Reset
                </AButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QRScannerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <QRScannerContent />
    </Suspense>
  );
}
