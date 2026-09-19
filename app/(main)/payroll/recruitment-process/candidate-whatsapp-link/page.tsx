"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FilterX, FileSpreadsheet, FileText, FileX, Copy } from "lucide-react";
import Swal from "sweetalert2";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import useDateRange from "@/app/hooks/use-date-range";
import useExcelDownload from "@/app/hooks/excel-download";
import Ainput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

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

export default function CandidateWhatsAppLinkPage() {
  const user = useCurrentUser() as any;
  const { handleExcelDownload } = useExcelDownload();

  // Date helpers
  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayOneMonthBackDate = useMemo(() => getCurrentDate(1), []);
  const todayDate = useMemo(() => getCurrentDate(0), []);

  const {
    DATE_FROM,
    DATE_TO,
    setDateRange,
    handleDateChange,
  } = useDateRange({
    defaultFrom: todayOneMonthBackDate,
    defaultTo: todayDate,
  });

  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Filter dropdown states
  const [channelOptions, setChannelOption] = useState<any[]>([{ label: "ALL", value: "ALL" }]);
  const [clusterOptions, setClusterOption] = useState<any[]>([{ label: "ALL", value: "ALL" }]);
  const [channel, setChannel] = useState<string>("ALL");
  const [cluster, setCluster] = useState<string>("ALL");

  // Fetch master options
  useEffect(() => {
    const fetchMasterData = async () => {
      if (!user) return;

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );

        const convertValuesToString = (array: any[]) => {
          if (!array) return [];
          return array.map((obj: any) => ({
            label: obj.label || obj.NAME || String(obj.value),
            value: String(obj.value ?? obj.CODE ?? ""),
          }));
        };

        const masters = response.data.data || {};
        const channelOpts = convertValuesToString(masters.CHANNEL1 || []);
        const clusterOpts = convertValuesToString(masters.CLUSTER1 || []);

        setChannelOption([{ label: "ALL", value: "ALL" }, ...channelOpts]);
        setClusterOption([{ label: "ALL", value: "ALL" }, ...clusterOpts]);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };

    fetchMasterData();
  }, [user]);

  // Fetch Table Data
  const fetchData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let channelArray = Array.isArray(channel) ? channel : [channel];
      let clusterArray = Array.isArray(cluster) ? cluster : [cluster];

      channelArray = channelArray.map((item: any) =>
        typeof item === "object" && item ? item.value : item
      );
      clusterArray = clusterArray.map((item: any) =>
        typeof item === "object" && item ? item.value : item
      );

      const channelValue =
        channelArray.includes("ALL") || channelArray.length === 0 || !channelArray[0]
          ? "ALL"
          : channelArray.join(",");

      const clusterValue =
        clusterArray.includes("ALL") || clusterArray.length === 0 || !clusterArray[0]
          ? "ALL"
          : clusterArray.join(",");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/WhatsappLinkData`,
        {
          loc_code: user.branch,
          DATE_FROM: DATE_FROM,
          DATE_TO: DATE_TO,
          Channel: channelValue,
          Cluster: clusterValue,
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        }
      );

      setTableData(response.data.data || []);
    } catch (error) {
      console.error("Error fetching whatsapp link data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reset all filters
  const handleResetFilters = () => {
    setDateRange(todayOneMonthBackDate, todayDate);
    setChannel("ALL");
    setCluster("ALL");
    setResetTrigger((prev) => prev + 1);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!tableData || tableData.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Data",
        text: "No records found to export.",
      });
      return;
    }

    const exportCols = columns.map((col: any) => ({
      Header: typeof col.Header === "string" ? col.Header : col.accessor,
      accessor: col.accessor,
    }));

    handleExcelDownload(tableData, "Candidate_WhatsApp_Links", exportCols);
  };

  // Copy link helper
  const handleCopyLink = (link: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!link) return;
    navigator.clipboard.writeText(link);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Link copied!",
      showConfirmButton: false,
      timer: 1500,
    });
  };

  // Columns definition (No Checkbox)
  const columns = useMemo(
    () => [
      {
        Header: "SR",
        accessor: "TRAN_ID",
        align: "center",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "NAME",
        accessor: "NAME",
        filterPlaceholder: "All name",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "EMAIL",
        accessor: "EMAIL",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      {
        Header: "RESUME",
        accessor: "WHATSAPP_LINK",
        Cell: ({ value }: any) => {
          const link = value && String(value).trim() !== "" ? String(value).trim() : null;

          if (!link) {
            return (
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-normal select-none">
                <FileX className="w-4 h-4 text-slate-400" />
                No resume
              </div>
            );
          }

          return (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.open(link, "_blank")}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#4F46E5] dark:text-indigo-400 shrink-0" />
                View PDF
              </button>

              <button
                type="button"
                onClick={(e) => handleCopyLink(link, e)}
                title="Copy WhatsApp Link"
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
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
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        filterPlaceholder: "All designation",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
      ...(user?.Comp_Code === "MLAPL-25"
        ? [
            {
              Header: "SUITABLE DESIGNATION",
              accessor: "SUITABLE_DESIGNATION",
              Cell: ({ value }: any) => (
                <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
                  {renderCell(value)}
                </span>
              ),
            },
          ]
        : []),
      {
        Header: "LOCATION",
        accessor: "LOC_CODE1",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap">
            {renderCell(value)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Candidate WhatsApp links
          </h1>
          <p className="text-md text-slate-500 dark:text-slate-400 font-normal mt-1">
            Registration links sent over WhatsApp, and whether the candidate finished the form.
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
      {/* 2. FILTER BAR CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
          <Ainput
            title="DATE FROM"
            type="date"
            name="DATE_FROM"
            value={DATE_FROM}
            handleInputChange={handleDateChange}
            ShortName={true}
          />

          <Ainput
            title="DATE TO"
            type="date"
            name="DATE_TO"
            value={DATE_TO}
            handleInputChange={handleDateChange}
            ShortName={true}
          />

          <Eselect
            title="CHANNEL"
            name="Channel"
            option={channelOptions}
            initialValue={channel}
            handleInputChange={(name, val) => setChannel(val || "ALL")}
            ShortName={true}
          />

          <Eselect
            title="CLUSTER"
            name="Cluster"
            option={clusterOptions}
            initialValue={cluster}
            handleInputChange={(name, val) => setCluster(val || "ALL")}
            ShortName={true}
          />

          <div className="w-full">
            <AButton
              variant="primary"
              size="md"
              onClick={fetchData}
              className="w-full h-9 bg-[#4338CA] hover:bg-[#3730a3] text-white font-semibold rounded-xl text-sm shadow-xs cursor-pointer"
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. TABLE CARD CONTAINER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Table Top Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3.5 bg-white dark:bg-[#0B1220] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
              Links sent
            </span>
            <span className="text-xs sm:text-sm text-slate-400 font-normal">
              {tableData.length} of {tableData.length} rows
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

        {/* ReactTable without Checkboxes */}
        <ServiceTablePagination
          key={pageSize}
          columns={columns}
          data={tableData}
          check={false}
          selectValue="TRAN_ID"
          initialPageSize={pageSize}
          showExcelExport={false}
          showTopSearch={false}
          columnFiltersResetTrigger={resetTrigger}
          footerTextMode="pageItems"
          containerClassName="border-0 shadow-none rounded-none bg-transparent"
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. LOADER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
