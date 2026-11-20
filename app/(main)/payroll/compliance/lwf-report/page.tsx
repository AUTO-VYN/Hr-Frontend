
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Eselect from "@/components/atoms/Eselect";
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
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
].map((label, i) => ({
  value: String(i + 1),
  label,
}));

const CURRENT_DATE = new Date();
const CURRENT_MONTH = String(CURRENT_DATE.getMonth() + 1);
const CURRENT_YEAR = String(CURRENT_DATE.getFullYear());

const YEARS: Option[] = Array.from({ length: 15 }, (_, i) => {
  const year = String(CURRENT_DATE.getFullYear() - i);
  return {
    value: year,
    label: year,
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

const toOptions = (list: any): Option[] =>
  getArray(list)
    .map((item: any) => ({
      value: String(item?.value ?? ""),
      label: String(item?.label ?? ""),
    }))
    .filter((item: Option) => item.value !== "");

const cellText = (value: any) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getMonthLabel = (month: string) =>
  MONTHS.find((m) => m.value === month)?.label || month;

const toast = (
  icon: "error" | "warning" | "info" | "success",
  title: string,
  timer = 2000,
) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer,
  });

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function LWFReportPage() {
  const user = useCurrentUser();

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

  /* ---------------------------- API ---------------------------- */

  const postApi = useCallback(
    async (endpoint: string, payload: any) => {
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
        },
      });
    },
    [user?.Comp_Code, user?.name],
  );

  /* ------------------------- MASTER DATA ------------------------- */

  const fetchMasters = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      setMasterLoading(true);

      const response = await postApi(MASTER_ENDPOINT, {
        branch: user.branch,
      });

      const data =
        response?.data?.data ||
        response?.data?.Data ||
        response?.data;

      if (!data) {
        throw new Error("Master data was not returned by the server.");
      }

      setClusterOptions(toOptions(data?.Br_Location));
      setSectionOptions(toOptions(data?.Section));
      setChannelOptions(toOptions(data?.Channel));
      setBranchOptions(toOptions(data?.Locations));
    } catch (error: any) {
      console.error("LWF master error:", error);
      toast("error", getApiError(error), 2500);
    } finally {
      setMasterLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, postApi]);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  /* ----------------------- FILTER HANDLING ----------------------- */

  const handleInputChange = (name: string, value: any) => {
    const next = String(value ?? "");

    if (name === "month") {
      setMonth(next);
      return;
    }

    if (name === "year") {
      setYear(next);
      return;
    }

    if (["cluster", "section", "channel", "branch"].includes(name)) {
      setFilters((prev) => ({
        ...prev,
        [name]: next,
      }));
    }
  };

  const handleResetFilters = () => {
    setMonth(CURRENT_MONTH);
    setYear(CURRENT_YEAR);
    setFilters(EMPTY_FILTERS);
    setRows([]);
    setHasSearched(false);
  };

  /* ------------------------- SHOW REPORT ------------------------- */

  const handleShowReport = async () => {
    if (!month || !year) {
      toast("warning", "Please select Month and Year");
      return;
    }

    if (!user?.branch) {
      toast("error", "User branch is not available");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        Loc_code: user?.branch,
        Month: Number(month),
        Year: Number(year),
        Cluster: filters.cluster || "",
        section: filters.section || "",
        channel: filters.channel || "",
        location: filters.branch || "",
        Type: 4,
      };

      console.log("LWF Report Payload:", payload);

      const response = await postApi(REPORT_ENDPOINT, payload);

      console.log("LWF Report Response:", response?.data);

      const reportRows = Array.isArray(response?.data?.result)
        ? response.data.result
        : [];

      setRows(reportRows);
      setHasSearched(true);

      if (!reportRows.length) {
        toast("info", "No records found", 1500);
      }
    } catch (error: any) {
      console.error("LWF report error:", error);
      toast("error", getApiError(error), 2500);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------- TABLE COLUMNS ------------------------- */

const columns = useMemo(
  () => [
    {
      Header: "Month",
      accessor: "SalMnth",
      Cell: ({ value }: any) => (
        <span>{getMonthLabel(String(value ?? ""))}</span>
      ),
    },
    { Header: "Year", accessor: "salyear" },
    { Header: "Employee Code", accessor: "EMPCODE" },
    {
      Header: "Employee Name",
      accessor: "EmployeeName",
      Cell: ({ value }: any) => (
        <span className="uppercase">{cellText(value)}</span>
      ),
    },
    { Header: "Employee Designation", accessor: "Designation" },
    { Header: "Month Days", accessor: "Monthdays" },
    { Header: "Paid Days", accessor: "Paid_Days" },
    { Header: "LOP Days", accessor: "Absent_Value" },
    { Header: "LWF Employee", accessor: "LWF_Employee" },
    { Header: "LWF Employer", accessor: "lwf_employer" },
    {
      Header: "Region",
      accessor: "Region",
      Cell: ({ value }: any) => (
        <span className="uppercase">{cellText(value)}</span>
      ),
    },
    {
      Header: "Channel",
      accessor: "Channel",
      Cell: ({ value }: any) => (
        <span className="uppercase">{cellText(value)}</span>
      ),
    },
    {
      Header: "Cluster",
      accessor: "Cluster",
      Cell: ({ value }: any) => (
        <span className="uppercase">{cellText(value)}</span>
      ),
    },
    {
      Header: "Location",
      accessor: "Location",
      Cell: ({ value }: any) => (
        <span className="uppercase">{cellText(value)}</span>
      ),
    },
    {
      Header: "Section",
      accessor: "Section",
      Cell: ({ value }: any) => (
        <span className="uppercase">{cellText(value)}</span>
      ),
    },
    { Header: "Department", accessor: "Department" },
    { Header: "Date Of Birthday", accessor: "DOB" },
    { Header: "State", accessor: "PT_StateName" },
    { Header: "Joining Date", accessor: "Joining Date" },
    { Header: "Status Description", accessor: "Status Description" },
  ],
  [],
);
  /* -------------------------- FILTER FIELDS -------------------------- */

  const filterFields = [
    {
      title: "Month",
      name: "month",
      option: MONTHS,
      value: month,
    },
    {
      title: "Year",
      name: "year",
      option: YEARS,
      value: year,
    },
    {
      title: "Cluster",
      name: "cluster",
      option: clusterOptions,
      value: filters.cluster,
    },
    {
      title: "Section",
      name: "section",
      option: sectionOptions,
      value: filters.section,
    },
    {
      title: "Channel",
      name: "channel",
      option: channelOptions,
      value: filters.channel,
    },
    {
      title: "Branch",
      name: "branch",
      option: branchOptions,
      value: filters.branch,
    },
  ];

  const branchLabel = filters.branch
    ? branchOptions.find((b) => b.value === filters.branch)?.label ||
      "Selected branch"
    : "all locations";

  /* ------------------------------ UI ------------------------------ */

  return (
    <div className="min-h-screen min-w-0 bg-[#f8fafc] p-3 dark:bg-[#0b1220] sm:p-4">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[21px] font-bold text-slate-900 dark:text-slate-100">
            LWF Report
          </h1>
        </div>

        {/* FILTER CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {filterFields.map((field) => (
              <div key={field.name} className="min-w-0">
                <Eselect
                  title={field.title}
                  name={field.name}
                  option={field.option}
                  initialValue={field.value}
                  handleInputChange={handleInputChange}
                  className="h-[40px] w-full text-[12px]"
                />
              </div>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            <AButton
              onClick={handleResetFilters}
              className="inline-flex h-[40px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Reset
            </AButton>

            <AButton
              onClick={handleShowReport}
              className="inline-flex h-[40px] items-center justify-center rounded-lg bg-indigo-600 px-6 text-[12px] font-semibold text-white transition hover:bg-indigo-700"
            >
              Show
            </AButton>
          </div>
        </div>

        {/* REPORT TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {rows.length}
              </span>{" "}
              employees
              <span className="mx-1">·</span>
              {getMonthLabel(month)} {year}
              <span className="mx-1">·</span>
              {branchLabel}
            </p>
          </div>

          {rows.length > 0 ? (
            <DataTable
              key={`${month}-${year}-${rows.length}`}
              columns={columns}
              data={rows}
              height={520}
              initialPageSize={25}
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
                <span className="text-[22px] text-slate-400">▤</span>
              </div>

              <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">
                {hasSearched ? "No records found" : "No report loaded"}
              </p>

              <p className="mt-1 max-w-[520px] text-[12px] text-slate-400">
                {hasSearched
                  ? "No LWF records found for the selected filters."
                  : "Select the filters above and click Show to view the LWF report."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
