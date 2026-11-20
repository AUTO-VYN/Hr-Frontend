"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import {
  RotateCcw,
  Search,
  Download,
  Plus,
  FileSpreadsheet,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import AButton from "@/components/atoms/Button";

/* ------------------------------------------------------------------ */
/* CONFIGURATION                                                       */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_URL;

const MASTER_ENDPOINT = "/employee/MstData";
const REPORT_ENDPOINT = "/hrmsreport/getPFdata";

type Option = {
  value: string;
  label: string;
};

type Filters = {
  cluster: string;
  section: string;
  channel: string;
  branch: string;
};

const MONTHS: Option[] = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const CURRENT_DATE = new Date();
const CURRENT_MONTH = String(CURRENT_DATE.getMonth() + 1);
const CURRENT_YEAR = String(CURRENT_DATE.getFullYear());

const YEARS: Option[] = Array.from({ length: 15 }, (_, index) => {
  const year = CURRENT_DATE.getFullYear() - index;

  return {
    value: String(year),
    label: String(year),
  };
});

const EMPTY_FILTERS: Filters = {
  cluster: "",
  section: "",
  channel: "",
  branch: "",
};

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.recordset)) return value.recordset;
  if (Array.isArray(value?.Result)) return value.Result;
  return [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

const getValue = (item: any, keys: string[]): string => {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const makeOptions = (
  data: any[],
  codeKeys: string[],
  nameKeys: string[],
): Option[] => {
  const options = data
    .map((item) => {
      const value = getValue(item, codeKeys);
      const label = getValue(item, nameKeys);

      if (!value && !label) return null;

      return {
        value: value || label,
        label:
          value && label && value !== label
            ? `${label} (${value})`
            : label || value,
      };
    })
    .filter(Boolean) as Option[];

  return Array.from(
    new Map(options.map((item) => [item.value, item])).values(),
  );
};

const prettyHeader = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toUpperCase();

const cellText = (value: any) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getMonthLabel = (month: string) =>
  MONTHS.find((item) => item.value === month)?.label || month;

const formatESICDate = (value: any): string => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function ESICReportPage() {
  const user = useCurrentUser();
  const { handleExcelDownload } = useExcelDownload();

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);

  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const [clusterOptions, setClusterOptions] = useState<Option[]>([]);
  const [sectionOptions, setSectionOptions] = useState<Option[]>([]);
  const [channelOptions, setChannelOptions] = useState<Option[]>([]);
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);

  const [rows, setRows] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchText, setSearchText] = useState("");

  /* ---------------------------------------------------------------- */
  /* API                                                               */
  /* ---------------------------------------------------------------- */

  const postApi = useCallback(
    async (endpoint: string, payload: any, config: any = {}) => {
      if (!user?.Comp_Code) {
        throw new Error("Company code is not available.");
      }

      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_URL is not configured.");
      }

      return axios.post(`${API_URL}${endpoint}`, payload, {
        headers: {
          compcode: user.Comp_Code,
          name: user?.name || "",
          ...config.headers,
        },
        ...config,
      });
    },
    [user?.Comp_Code, user?.name],
  );

  /* ---------------------------------------------------------------- */
  /* MASTER DATA                                                       */
  /* ---------------------------------------------------------------- */

  const fetchMasters = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      setMasterLoading(true);

      const response = await postApi(MASTER_ENDPOINT, {
        branch: user.branch,
      });

      const data =
        response?.data?.data || response?.data?.Data || response?.data;

      if (!data) {
        throw new Error("Master data was not returned by the server.");
      }

      // Cluster
      setClusterOptions(
        getArray(data?.Br_Location)
          .map((item: any) => ({
            value: String(item?.value ?? ""),
            label: String(item?.label ?? ""),
          }))
          .filter((item: Option) => item.value !== ""),
      );

      // Section
      setSectionOptions(
        getArray(data?.Section)
          .map((item: any) => ({
            value: String(item?.value ?? ""),
            label: String(item?.label ?? ""),
          }))
          .filter((item: Option) => item.value !== ""),
      );

      // Channel
      setChannelOptions(
        getArray(data?.Channel)
          .map((item: any) => ({
            value: String(item?.value ?? ""),
            label: String(item?.label ?? ""),
          }))
          .filter((item: Option) => item.value !== ""),
      );

      // Branch / Location
      setBranchOptions(
        getArray(data?.Locations)
          .map((item: any) => ({
            value: String(item?.value ?? ""),
            label: String(item?.label ?? ""),
          }))
          .filter((item: Option) => item.value !== ""),
      );
    } catch (error) {
      console.error("ESIC master error:", error);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: getApiError(error),
        showConfirmButton: false,
        timer: 2500,
      });
    } finally {
      setMasterLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, postApi]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchMasters();
    }
  }, [fetchMasters, user?.Comp_Code, user?.branch]);

  /* ---------------------------------------------------------------- */
  /* FILTER HANDLING                                                   */
  /* ---------------------------------------------------------------- */

  const handleInputChange = (name: string, value: any) => {
    const nextValue = String(value ?? "");

    if (name === "month") {
      setMonth(nextValue);
    }

    if (name === "year") {
      setYear(nextValue);
    }

    if (name === "cluster") {
      setFilters((previous) => ({
        ...previous,
        cluster: nextValue,
      }));
    }

    if (name === "section") {
      setFilters((previous) => ({
        ...previous,
        section: nextValue,
      }));
    }

    if (name === "channel") {
      setFilters((previous) => ({
        ...previous,
        channel: nextValue,
      }));
    }

    if (name === "branch") {
      setFilters((previous) => ({
        ...previous,
        branch: nextValue,
      }));
    }
  };

  /* ---------------------------------------------------------------- */
  /* REPORT PAYLOAD                                                    */
  /* ---------------------------------------------------------------- */

  const getReportPayload = useCallback(
    () => ({
      Loc_code: user?.branch,
      Month: Number(month),
      Year: Number(year),
      Cluster: filters.cluster || "",
      section: filters.section || "",
      channel: filters.channel || "",
      location: filters.branch || "",
      Type: 1,
    }),
    [user?.branch, month, year, filters],
  );

  const handleResetFilters = () => {
    setMonth(CURRENT_MONTH);
    setYear(CURRENT_YEAR);
    setFilters(EMPTY_FILTERS);
    setSearchText("");
    setRows([]);
    setHasSearched(false);
  };

  /* ---------------------------------------------------------------- */
  /* SHOW REPORT                                                       */
  /* ---------------------------------------------------------------- */

  const handleShowReport = async () => {
    if (!month || !year) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Please select Month and Year",
        showConfirmButton: false,
        timer: 2000,
      });

      return;
    }

    try {
      setLoading(true);

      const payload = getReportPayload();

      console.log("ESIC Report payload:", payload);

      const response = await postApi(REPORT_ENDPOINT, payload);

      const reportRows = Array.isArray(response?.data?.result)
        ? response.data.result
        : [];

      setRows(reportRows);
      setHasSearched(true);

      if (!reportRows.length) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "No records found",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error("ESIC report error:", error);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: getApiError(error),
        showConfirmButton: false,
        timer: 2500,
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* DOWNLOAD ESIC XLSX                                                */
  /* ---------------------------------------------------------------- */

  const handleDownloadESIC = async () => {
    if (!rows.length) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Please load the ESIC report first",
        showConfirmButton: false,
        timer: 1800,
      });

      return;
    }

    try {
      setLoading(true);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("ESIC");

      worksheet.columns = [
        {
          header: "IP Number\n(10 Digits)",
          key: "ipNumber",
          width: 20,
        },
        {
          header: " IP Name\n( Only alphabets and space ) ",
          key: "ipName",
          width: 35,
        },
        {
          header: "  No of Days for which wages paid/payable during the month ",
          key: "paidDays",
          width: 25,
        },
        {
          header: " Total Monthly Wages ",
          key: "monthlyWages",
          width: 22,
        },
        {
          header:
            "  Reason Code for Zero workings days\n( numeric only; provide 0 for all other reasons- Click on the link for reference)  ",
          key: "reasonCode",
          width: 30,
        },
        {
          header: "  Last Working Day\n(Format DD/MM/YYYY or DD-MM-YYYY )  ",
          key: "lastWorkingDay",
          width: 25,
        },
      ];

      // Header styling
      const headerRow = worksheet.getRow(1);

      headerRow.height = 50;

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          size: 10,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF00FF00" }, // Green background for headers
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      const exportRows = rows.filter(
        (row) =>
          row?.["ESIC Number"] !== null &&
          row?.["ESIC Number"] !== undefined &&
          String(row?.["ESIC Number"]).trim() !== "",
      );

      if (!exportRows.length) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "No ESIC numbers available for download",
          showConfirmButton: false,
          timer: 1800,
        });

        return;
      }

      exportRows.forEach((row) => {
        worksheet.addRow({
          ipNumber: row["ESIC Number"],
          ipName: String(row.EmployeeName || "").toUpperCase(),
          paidDays: row.Paid_Days ?? 0,
          monthlyWages: row.ESIC_WAGES,
          reasonCode: 0,
          lastWorkingDay: formatESICDate(row["Last Working Date"]),
        });
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };

          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `ESIC_Report_${month}_${year}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "ESIC Excel downloaded",
        showConfirmButton: false,
        timer: 1600,
      });
    } catch (error: any) {
      console.error("ESIC Excel download error:", error);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: getApiError(error),
        showConfirmButton: false,
        timer: 2500,
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* TABLE COLUMNS                                                     */
  /* ---------------------------------------------------------------- */
const columns = useMemo(
    () => [
      {
        Header: "Month",
        accessor: "SalMnth",
        Cell: ({ value }: any) => (
          <span className="text-[12px] text-slate-700 dark:text-slate-200">
            {getMonthLabel(String(value ?? ""))}
          </span>
        ),
      },
      {
        Header: "Year",
        accessor: "salyear",
      },
      {
        Header: "Employee Code",
        accessor: "EMPCODE",
      },
      {
        Header: "Employee Name",
        accessor: "EmployeeName",
        Cell: ({ value }: any) => (
          <span className="uppercase">{cellText(value)}</span>
        ),
      },
      {
        Header: "Esic Number",
        accessor: "ESIC Number",
      },
      {
        Header: "ED_DOB",
        accessor: "DOB",
      },
      {
        Header: "State",
        accessor: "PT_StateName",
      },
      {
        Header: "EsicEmployeeDed",
        accessor: "ESIC_Employee",
      },
      {
        Header: "EsicEmployerDed",
        accessor: "esic_employer",
      },
      {
        Header: "Esic_Base",
        accessor: "ESIC WAGES",
      },
      {
        Header: "Esic Applicable",
        accessor: "ESIC Applicable",
      },
      {
        Header: "Total_days",
        accessor: "Paid_Days",
      },
      {
        Header: "Location",
        accessor: "Location",
      },
      {
        Header: "Status_Desc",
        accessor: "Status Description",
      },
      {
        Header: "Appesicemployerded",
        accessor: "ArrEsicEmployerDed",
        Cell: () => <span>0</span>,
      },
      {
        Header: "Appesicemployeeded",
        accessor: "ArrEsicEmployeeDed",
        Cell: () => <span>0</span>,
      },
      {
        Header: "Esic_location",
        accessor: "ESIC_Location",
        Cell: () => <span></span>,
      },
      {
        Header: "Esic_state",
        accessor: "ESIC_State",
        Cell: () => <span></span>,
      },
      {
        Header: "Esic_city",
        accessor: "ESIC_City",
        Cell: () => <span></span>,
      },
    ],
    [],
  );

  /* ---------------------------------------------------------------- */
  /* LOCAL SEARCH                                                      */
  /* ---------------------------------------------------------------- */

  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        cellText(value).toLowerCase().includes(search),
      ),
    );
  }, [rows, searchText]);

  /* ---------------------------------------------------------------- */
  /* EXCEL EXPORT                                                      */
  /* ---------------------------------------------------------------- */

  const handleExportExcel = () => {
    if (!filteredRows.length) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "No data to export",
        showConfirmButton: false,
        timer: 1500,
      });

      return;
    }

    handleExcelDownload(
      columns.map((column: any) => ({
        Header: column.Header,
        accessor: column.accessor,
      })),
      filteredRows,
    );
  };

  /* ---------------------------------------------------------------- */
  /* UI                                                                */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen min-w-0 bg-[#f8fafc] p-3 dark:bg-[#0b1220] sm:p-4">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-bold text-slate-900 dark:text-slate-100">
              ESIC Report
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="min-w-0">
              <Eselect
                title="Month"
                name="month"
                option={MONTHS}
                initialValue={month}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[12px]"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Year"
                name="year"
                option={YEARS}
                initialValue={year}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[12px]"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Cluster"
                name="cluster"
                option={clusterOptions}
                initialValue={filters.cluster}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[12px]"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Section"
                name="section"
                option={sectionOptions}
                initialValue={filters.section}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[12px]"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Channel"
                name="channel"
                option={channelOptions}
                initialValue={filters.channel}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[12px]"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Branch"
                name="branch"
                option={branchOptions}
                initialValue={filters.branch}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[12px]"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <AButton
                onClick={handleShowReport}
                className="inline-flex h-[40px] items-center justify-center rounded-lg bg-indigo-600 px-6 text-[12px] font-semibold text-white transition hover:bg-indigo-700"
              >
                Show
              </AButton>

              <AButton
                onClick={handleDownloadESIC}
                className="inline-flex h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Plus size={14} />
                Add new (Download ESIC XLSX)
              </AButton>
            </div>
          </div>
        </div>

        {/* REPORT TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {filteredRows.length}
              </span>{" "}
              employees
              <span className="mx-1">·</span>
              {getMonthLabel(month)} {year}
              <span className="mx-1">·</span>
              {filters.branch
                ? branchOptions.find((item) => item.value === filters.branch)
                    ?.label || "Selected branch"
                : "All locations"}
            </p>

            {hasSearched && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                Report loaded
              </span>
            )}
          </div>

          {rows.length > 0 ? (
            <DataTable
              key={`${month}-${year}-${rows.length}`}
              columns={columns}
              data={filteredRows}
              height={520}
              initialPageSize={10}
              showPageSizeInFooter={true}
              showTopSearch={true}
              showExcelExport={true}
              resetFilters={true}
              showColumnFilters={true}
              containerClassName="border-t border-slate-200 text-[12px] dark:border-slate-800"
            />
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <FileSpreadsheet size={22} className="text-slate-400" />
              </div>

              <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">
                {hasSearched ? "No records found" : "No report loaded"}
              </p>

              <p className="mt-1 text-[12px] text-slate-400">
                {hasSearched
                  ? "No ESIC records found for the selected filters."
                  : "Select the filters above and click Show to view the ESIC report."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
