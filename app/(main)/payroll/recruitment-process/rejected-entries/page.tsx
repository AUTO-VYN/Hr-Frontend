"use client";
  
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FilterX, FileSpreadsheet, RotateCcw } from "lucide-react";
import Swal from "sweetalert2";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import AButton from "@/components/atoms/Button";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

const formatDate = (dateString: any) => {
  if (!dateString || dateString === "null" || dateString === "—") return "—";
  try {
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {}
  return String(dateString);
};

const renderDash = () => (
  <span className="text-slate-400 select-none font-normal">—</span>
);

const renderCell = (val: any) => {
  if (
    val === null ||
    val === undefined ||
    val === "" ||
    val === "null" ||
    val === "—"
  ) {
    return renderDash();
  }
  return String(val);
};

export default function RejectedEntriesPage() {
  const user = useCurrentUser() as any;
  const { handleExcelDownload } = useExcelDownload();

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [selectedrowdata, setSelectedrowdata] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/getRejectedResumeBank`,
        {
          loc_code: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      setTabledata(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching rejected candidates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchData();
    }
  }, [user?.Comp_Code, user?.branch]);

  const restoreCandidate = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire("Warning", "Please select candidate.", "warning");
      return;
    }

    const selectedItem = selectedrowdata[0];
    const tranId = selectedItem?.id ?? selectedItem?.TRAN_ID;

    // Confirmation Alert
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to move this candidate back to Shortlisted Applications?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4338CA",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Move it!",
      cancelButtonText: "No",
    });

    if (!result.isConfirmed) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/restoreRejectedCandidate`,
        { TRAN_ID: tranId },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      Swal.fire("Success", "Candidate moved back to Resume Bank.", "success");
      fetchData();
      setSelectedrowdata([]);
    } catch (error) {
      console.error("Error restoring candidate:", error);
      Swal.fire("Error", "Something went wrong.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilters = () => {
    setResetTrigger((prev) => prev + 1);
  };

  const handleExportExcel = () => {
    if (!tabledata || tabledata.length === 0) return;
    const exportColumns = [
      { Header: "SR", accessor: "TRAN_ID" },
      {
        Header: "Application Date",
        accessor: "APPLICATION_DATE1",
        Cell: ({ value }: any) => formatDate(value),
      },
      { Header: "Name", accessor: "NAME" },
      { Header: "Email", accessor: "EMAIL" },
      { Header: "Mobile No", accessor: "MOB_NO" },
      { Header: "Address", accessor: "ADDRESS" },
      { Header: "City", accessor: "CITY" },
      { Header: "State", accessor: "STATE1" },
      { Header: "Location", accessor: "LOC_CODE1" },
      { Header: "Designation", accessor: "DESIGNATION" },
      { Header: "Qualification", accessor: "HIGH_QUAL" },
      { Header: "Passing %", accessor: "PASSING_PER" },
      { Header: "Experience (Years)", accessor: "EXP_IN_YEAR" },
      { Header: "Current CTC", accessor: "CURRENT_CTC" },
      { Header: "Expected CTC", accessor: "EXPECTED_CTC" },
      { Header: "Source", accessor: "SOURCE_OF_REG" },
      { Header: "Sub Source", accessor: "SUB_SOURCE" },
      { Header: "Rejection Remark", accessor: "REJECTION_REMARK" },
    ];
    handleExcelDownload(exportColumns, tabledata);
  };

  const columns = useMemo(
    () => [
      {
        Header: "SR",
        accessor: "TRAN_ID",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "APPLICATION D...",
        accessor: "APPLICATION_DATE1",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "NAME",
        accessor: "NAME",
        filterPlaceholder: "All name",
        Cell: ({ value }: any) => (
          <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "EMAIL",
        accessor: "EMAIL",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 font-normal">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "MOBILE NO",
        accessor: "MOB_NO",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "CITY",
        accessor: "CITY",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "STATE",
        accessor: "STATE1",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "LOCATION",
        accessor: "LOC_CODE1",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        filterPlaceholder: "All designation",
        Cell: ({ value }: any) => (
          <span className="text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "QUALIFICATION",
        accessor: "HIGH_QUAL",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "EXPERIEN...",
        accessor: "EXP_IN_YEAR",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "CURRENT C...",
        accessor: "CURRENT_CTC",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "SOURCE",
        accessor: "SOURCE_OF_REG",
        filterPlaceholder: "All source",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "REJECTION REMARK",
        accessor: "REJECTION_REMARK",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal">
            {renderCell(value)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Rejected resume bank
          </h1>
          <p className="text-md text-slate-500 dark:text-slate-400 font-normal mt-1">
            Rejections stay searchable. Select rows to push them back into shortlisted applications.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <AButton
            variant="outline"
            size="sm"
            icon={<FilterX className="w-4 h-4 shrink-0" />}
            onClick={handleResetFilters}
            className="h-9 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap rounded-xl"
          >
            Reset filters
          </AButton>

          <AButton
            variant="primary"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4 shrink-0" />}
            onClick={handleExportExcel}
            className="h-9 px-4 text-xs sm:text-sm font-semibold bg-[#4338CA] hover:bg-[#3730a3] text-white shadow-xs whitespace-nowrap rounded-xl"
          >
            Export to Excel
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. TABLE CARD CONTAINER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Table Top Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3.5 bg-white dark:bg-[#0B1220] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
              Rejected candidates
            </span>
            <span className="text-xs sm:text-sm text-slate-400 font-normal">
              {tabledata.length} of {tabledata.length} rows
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs sm:text-sm text-slate-500 font-medium">Rows</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer shadow-2xs text-center min-w-[48px]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* ReactTable with Column Filter Inputs & Single Selection */}
        <ServiceTablePagination
          key={pageSize}
          columns={columns}
          data={tabledata}
          check={true}
          onlyOnecheck={true}
          selectValue="TRAN_ID"
          selectedRows={selectedrowdata}
          setSelectedRows={setSelectedrowdata}
          initialPageSize={pageSize}
          showExcelExport={false}
          showTopSearch={false}
          columnFiltersResetTrigger={resetTrigger}
          footerTextMode="pageItems"
          containerClassName="border-0 shadow-none rounded-none bg-transparent"
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. FLOATING ACTION BAR FOR SINGLE SELECTED CANDIDATE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedrowdata && selectedrowdata.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-[calc(100%-24px)] max-w-fit animate-in fade-in slide-in-from-bottom-2">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            {selectedrowdata.length} selected
          </span>
          <div className="w-px h-4 sm:h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />
          <AButton
            variant="primary"
            size="sm"
            onClick={restoreCandidate}
            icon={<RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold bg-[#4338CA] hover:bg-[#3730a3] text-white shadow-xs rounded-xl whitespace-nowrap shrink min-w-0"
          >
            <span className="hidden sm:inline">Move back to shortlisted applications</span>
            <span className="inline sm:hidden">Move to shortlisted</span>
          </AButton>
          <button
            type="button"
            onClick={() => setSelectedrowdata([])}
            className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium px-1.5 sm:px-2 py-1 cursor-pointer transition-colors shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. LOADER COMPONENT */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
