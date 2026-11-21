"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, SlidersHorizontal, RotateCcw, Download } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import FileViewer from "@/components/atoms/Fileviewer";

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

const getCurrentDate = (monthsBack = 0) => {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsBack);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString: any) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateString);
  }
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function FacePunchMachineReportPage() {
  const router = useRouter();
  const user: any = useCurrentUser();
  const globalDateRange: any = useDateRange();

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);

  const [dates, setDates] = useState({
    DATE_FROM: getCurrentDate(1),
    DATE_TO: getCurrentDate(0),
  });

  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ----------------------------------------------------------------------
  // API CALL
  // ----------------------------------------------------------------------

  const ShowData = async () => {
    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/FacePunchHistory`,
        {
          Loc_code: user?.branch,
          DateFrom: dates?.DATE_FROM,
          DateTo: dates?.DATE_TO,
          EMPCODE: user?.EMPCODE,
          USER_CODE: user?.id,
        },
        {
          headers: { compcode: user?.Comp_Code },
        },
      );

      const resData = result?.data?.result || [];
      setTabledata(resData);
      setHasSearched(true);
    } catch (error) {
      console.error("Error fetching FacePunchHistory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.Comp_Code) {
      ShowData();
    }
  }, [user?.Comp_Code]);

  // ----------------------------------------------------------------------
  // TABLE COLUMNS
  // ----------------------------------------------------------------------

  const columns = useMemo(
    () => [
      {
        Header: "EMPLOYEE CODE",
        accessor: "Emp_Code",
        minWidth: 140,
        Cell: ({ value }: any) => (
          <span className="font-mono text-[12px] font-semibold text-slate-900 dark:text-slate-100">
            {value ? String(value).toUpperCase() : "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMPLOYEENAME",
        minWidth: 200,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-white">
            {value ? String(value).toUpperCase() : "—"}
          </span>
        ),
      },
      {
        Header: "PUNCH DATE",
        accessor: "PunchDate",
        minWidth: 130,
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value ? formatDate(value) : "—"}
          </span>
        ),
      },
      {
        Header: "PUNCH TIME",
        accessor: "PunchTime",
        minWidth: 120,
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "SOURCE",
        accessor: "ISIMPORT",
        minWidth: 120,
        Cell: ({ value }: any) => {
          const isImported = Boolean(value);
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isImported
                  ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
              }`}
            >
              {isImported ? "Imported" : "Live"}
            </span>
          );
        },
      },
      {
        Header: "PUNCH IMAGE",
        accessor: "hidshif",
        minWidth: 130,
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const resumeUrl = row.original?.img_path;
          if (!resumeUrl) {
            return <span className="text-slate-400 text-xs">—</span>;
          }
          return (
            <div className="py-1">
              <FileViewer
                fileLink={`${process.env.NEXT_PUBLIC_imagepath || ""}${resumeUrl}`}
                celldata=""
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  // ----------------------------------------------------------------------
  // RENDER UI (MATCHING SCREENSHOT)
  // ----------------------------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#F8FAFC] dark:bg-[#070D18] p-4 md:p-6 text-slate-800 dark:text-slate-100 space-y-4">
      <HashloaderComponent isLoading={isLoading} />

      {/* 1. BREADCRUMBS & TOP HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
       
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            Face Punch Machine Report
          </h1>
        </div>

      
      </div>

      {/* 2. DATE FILTERS CARD */}
      <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,350px)_minmax(200px,350px)_auto]">
          {/* Date from */}
          <div className="min-w-0">
            <Einput
              title="Date from"
              ShortName={true}
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              className="h-[40px] w-full"
            />
          </div>

          {/* Date to */}
          <div className="min-w-0">
            <Einput
              title="Date to"
              ShortName={true}
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              className="h-[40px] w-full"
            />
          </div>

          {/* Show button */}
          <div className="flex items-end">
            <AButton
              type="button"
              onClick={ShowData}
              loading={isLoading}
              className="inline-flex h-[40px] w-full items-center justify-center rounded-xl bg-indigo-600 px-6 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* 3. REPORT TABLE CARD */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] overflow-hidden shadow-xs">
        {/* Table Content or Empty State */}
        {hasSearched ? (
          <div className="w-full min-w-0 p-4 md:p-5">
            {tabledata.length > 0 ? (
              <DataTable
                columns={columns}
                data={tabledata}
                showTopSearch={true}
                searchPlaceholder="Search in results..."
                showExcelExport={true}
                showColumnFilters={true}
                showPageSizeInFooter={true}
                resetFilters={true}
              />
            ) : (
              <div className="p-16 text-center text-slate-500 dark:text-slate-400">
                No punch records found for the selected date range.
              </div>
            )}
          </div>
        ) : (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              Set filters and click Show
            </h3>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 max-w-sm">
              Results will appear here with search, column filters, sorting and Excel export.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
