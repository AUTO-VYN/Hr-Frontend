"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Swal from "sweetalert2";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DocViewerCard from "@/components/atoms/DocViewerCard";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Download,
  ImageOff,
  FilterX,
} from "lucide-react";

export default function MispunchInOutDocumentPage() {
  const user = useCurrentUser();

  const showSideAlert = (message: string, type: "success" | "error" | "warning" | "info") => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    Toast.fire({ icon: type, title: message });
  };

  const [empcode, setEmpcode] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [mispunchData, setMispunchData] = useState<{
    in: any[];
    out: any[];
    totalCount: number;
    inCount: number;
    outCount: number;
  }>({
    in: [],
    out: [],
    totalCount: 0,
    inCount: 0,
    outCount: 0,
  });

  const [dates, setDates] = useState({
    DATE_FROM: "",
    DATE_TO: "",
    Emp_Code: "",
  });

  const handleDateChange = (name: string, value: any) => {
    setDates((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setHasSearched(false);
  };

  // Fetch all employees for dropdown
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
          { branch: user?.branch },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );
        setEmpcode(result.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch employees", error);
      }
    };
    if (user?.Comp_Code) {
      fetchData();
    }
  }, [user?.Comp_Code, user?.branch, user?.name]);

  // Fetch initial date range
  const FetchgetDateRange = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/ars/getDateRange`,
        { headers: { compcode: user?.Comp_Code } }
      );
      const { DATE_FROM, DATE_TO } = res.data?.result || {};
      if (DATE_FROM && DATE_TO) {
        setDates((prev) => ({ ...prev, DATE_FROM, DATE_TO }));
      } else {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDates((prev) => ({
          ...prev,
          DATE_FROM: firstDay.toISOString().split("T")[0],
          DATE_TO: lastDay.toISOString().split("T")[0],
        }));
      }
    } catch (error) {
      console.error("Date range API failed", error);
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDates((prev) => ({
        ...prev,
        DATE_FROM: firstDay.toISOString().split("T")[0],
        DATE_TO: lastDay.toISOString().split("T")[0],
      }));
    }
  };

  useEffect(() => {
    if (user?.Comp_Code) {
      FetchgetDateRange();
    }
  }, [user?.Comp_Code]);

  // Map employee options formatted like: "AU19796340 · Kishan"
  const employeeOptions = useMemo(() => {
    return (empcode || []).map((emp: any) => {
      const code = emp.emp_code || emp.EMP_CODE || emp.Emp_Code || emp.value || "";
      const name = emp.emp_name || emp.EMP_NAME || emp.Emp_Name || emp.label || "";
      return {
        value: String(code),
        label: name ? `${code} · ${name}` : String(code),
        rawName: name,
        code: String(code),
      };
    });
  }, [empcode]);

  // Selected employee name for "3 for Kishan"
  const selectedEmpName = useMemo(() => {
    if (!dates.Emp_Code) return "";
    const matched = employeeOptions.find(
      (opt) => String(opt.value) === String(dates.Emp_Code)
    );
    return matched?.rawName || dates.Emp_Code;
  }, [dates.Emp_Code, employeeOptions]);

  // Fetch mispunch in-out documents
  const fetchMispunchData = async () => {
    if (!dates.Emp_Code || dates.Emp_Code === "") {
      showSideAlert("Please select an Employee Code first!", "warning");
      return;
    }
    if (!dates.DATE_FROM || !dates.DATE_TO) {
      showSideAlert("Please select Date From and Date To!", "warning");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/getMispunchInOutDocument`,
        {
          emp_code: dates.Emp_Code,
          date_from: dates.DATE_FROM,
          date_to: dates.DATE_TO,
        },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );

      if (response.data?.Status === "true") {
        const inDocs = response.data.Result?.in || [];
        const outDocs = response.data.Result?.out || [];
        const total = response.data.Result?.totalCount ?? (inDocs.length + outDocs.length);

        setMispunchData({
          in: inDocs,
          out: outDocs,
          totalCount: total,
          inCount: response.data.Result?.inCount || inDocs.length,
          outCount: response.data.Result?.outCount || outDocs.length,
        });

        if (total === 0) {
          showSideAlert("No records found!", "info");
        }
      } else {
        showSideAlert(response.data?.Message || "Failed to fetch documents", "error");
      }
    } catch (error) {
      console.error(error);
      showSideAlert("Something went wrong!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilters = () => {
    FetchgetDateRange();
    setDates((prev) => ({
      ...prev,
      Emp_Code: "",
    }));
    setMispunchData({
      in: [],
      out: [],
      totalCount: 0,
      inCount: 0,
      outCount: 0,
    });
    setHasSearched(false);
  };

  // Extract clean file name
  const getFileName = (doc: any, fallbackIndex: number) => {
    if (doc?.DOC_NAME && doc.DOC_NAME.trim() !== "") return doc.DOC_NAME;
    if (doc?.DOC_PATH) {
      const clean = doc.DOC_PATH.split("?")[0];
      const name = clean.split("/").pop()?.split("\\").pop();
      if (name && name.trim() !== "") return name;
    }
    const isPdf = String(doc?.DOC_PATH || "").toLowerCase().endsWith(".pdf");
    return `document_${fallbackIndex + 1}.${isPdf ? "pdf" : "jpg"}`;
  };

  // Format document date e.g. "08 Jul 2026"
  const formatDocDate = (dateVal?: string) => {
    if (!dateVal) return "N/A";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateVal;
    }
  };

  // Status computation (Approved / Pending / Rejected)
  const getDocStatus = (doc: any) => {
    const raw = String(doc?.STATUS || doc?.Approval_Status || doc?.ApprovalStatus || "").toLowerCase();
    if (raw.includes("approv") || raw === "1" || raw === "y") return "Approved";
    if (raw.includes("reject")) return "Rejected";
    if (raw.includes("pend")) return "Pending";
    return doc?.Approval_Status || "Approved";
  };

  // Alternating array: [IN, OUT, IN, OUT, ...]
  const alternatingDocs = useMemo(() => {
    const { in: inImages, out: outImages } = mispunchData;
    const maxLength = Math.max(inImages.length, outImages.length);
    const alternating: { type: "IN" | "OUT"; data: any }[] = [];
    for (let i = 0; i < maxLength; i++) {
      if (i < inImages.length) {
        alternating.push({ type: "IN", data: inImages[i] });
      }
      if (i < outImages.length) {
        alternating.push({ type: "OUT", data: outImages[i] });
      }
    }
    return alternating;
  }, [mispunchData]);

  // Handle download all (direct browser download using blob)
  const handleDownloadAll = () => {
    if (!alternatingDocs.length) return;
    alternatingDocs.forEach((item, index) => {
      setTimeout(async () => {
        const doc = item.data;
        const name = getFileName(doc, index);
        const url = doc.DOC_PATH?.startsWith("http")
          ? doc.DOC_PATH
          : `${process.env.NEXT_PUBLIC_imagepath || `${process.env.NEXT_PUBLIC_URL || ""}/fetch?filePath=`}${doc.DOC_PATH}`;
        if (!url) return;

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error("Fetch failed");
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        } catch {
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }, index * 300);
    });
  };

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-[22px_24px_60px_24px]"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        fontFeatureSettings: "'tnum' 1",
      }}
    >
      {/* Title & Subtitle */}
      <div className="mb-[18px]">
        <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
          Mispunch in-out document
        </h1>
        <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
          Proof attached to a mispunch regularisation — gate register photo, approval mail or a manual entry slip.
        </p>
      </div>

      {/* Filter Section Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[14px_18px_16px_18px] mb-[14px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[180px_180px_minmax(0,1fr)_auto] gap-3 items-end">
          {/* DATE FROM */}
          <div className="w-full">
            <Einput
              title="DATE FROM"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              redlabel="*"
              ShortName={true}
              className="h-[38px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] text-[12.5px] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] outline-none"
              labelClassName="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase"
            />
          </div>

          {/* DATE TO */}
          <div className="w-full">
            <Einput
              title="DATE TO"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              redlabel="*"
              ShortName={true}
              className="h-[38px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] text-[12.5px] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] outline-none"
              labelClassName="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase"
            />
          </div>

          {/* EMPLOYEE CODE */}
          <div className="w-full min-w-0">
            <Eselect
              title="EMPLOYEE CODE"
              name="Emp_Code"
              handleInputChange={handleDateChange}
              option={employeeOptions}
              initialValue={dates.Emp_Code}
              placeholder="Select employee code"
              redlabel="*"
              ShortName={true}
              className="h-[38px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] text-[12.5px] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] outline-none"
              labelClassName="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase"
            />
          </div>

          {/* SHOW BUTTON */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={fetchMispunchData}
              disabled={isLoading}
              className="w-full lg:w-auto h-[38px] px-5 rounded-[9px] font-semibold text-[12.5px] text-white bg-[#10B981] hover:brightness-[1.08] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap border border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              Show
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid / Empty State */}
      {alternatingDocs.length > 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[16px_18px_18px_18px]">
          {/* Header */}
          <div className="flex items-center gap-[10px] mb-[14px]">
            <h2 className="m-0 text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
              Documents on file
            </h2>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal tabular-nums">
              {alternatingDocs.length} {selectedEmpName ? `for ${selectedEmpName}` : ""}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleDownloadAll}
              className="flex items-center gap-[6px] border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent hover:bg-[#F1F5F9] dark:hover:bg-[#182235] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] font-[550] px-[11px] py-[6px] rounded-[8px] cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download all</span>
            </button>
          </div>

          {/* Cards Grid using DocViewerCard atom */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alternatingDocs.map((item, index) => {
              const doc = item.data;
              const fileName = getFileName(doc, index);
              const docDate = formatDocDate(doc.dateOffice || doc.Created_Date);
              const subDetail =
                doc.REMARKS ||
                (item.type === "IN" ? "in punch missing" : "out punch missing");
              const status = getDocStatus(doc);

              return (
                <DocViewerCard
                  key={`${index}-${fileName}`}
                  fileName={fileName}
                  docPath={doc.DOC_PATH}
                  meta={`${docDate} · ${subDetail}`}
                  status={status}
                />
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] py-[74px] px-6 grid place-items-center text-center">
          {/* Centered Circular Icon */}
          <span className="grid place-items-center w-[76px] h-[76px] rounded-full bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
            <ImageOff className="w-6 h-6" />
          </span>

          {/* Heading */}
          <div className="text-[17px] font-[650] tracking-[-0.01em] mt-[18px] text-[#1E293B] dark:text-[#E7ECF3]">
            No documents found
          </div>

          {/* Description */}
          <div className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-[7px] max-w-[430px] leading-[1.6]">
            {!dates.Emp_Code
              ? "Choose a date range and an employee code, then press Show. Any gate-register photo or approval mail attached to a mispunch will appear here."
              : !hasSearched
              ? `Press Show to load documents for ${selectedEmpName || dates.Emp_Code} in the selected range.`
              : "No mispunch documents are available for this employee and date range. Try changing the filters or selecting another employee."}
          </div>

          {/* Reset filters Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-[18px] flex items-center gap-[7px] border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent hover:bg-[#F1F5F9] dark:hover:bg-[#182235] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] font-[550] py-[9px] px-[15px] rounded-[10px] cursor-pointer transition-all"
          >
            <FilterX className="w-4 h-4" />
            <span>Reset filters</span>
          </button>
        </div>
      )}

      {/* Global HashLoader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
