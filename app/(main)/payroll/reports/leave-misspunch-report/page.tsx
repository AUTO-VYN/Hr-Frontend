"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { X } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const MASTER_API = "/employee/MstData";
const MISPUNCH_REPORT_API = "/hrmsreport/getMisspunchAndLeaveReport";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
  sort_order?: number;
};

type MispunchReportRow = {
  id: number;
  [key: string]: any;
};

type FilterPayloadItem = {
  label: string;
  value: string;
  sort_order: number;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  const containers = [response, response?.data, response?.Data];

  const keys = [
    "result",
    "data",
    "Data",
    "Result",
    "records",
    "Records",
    "rows",
    "Table",
    "recordset",
  ];

  for (const container of containers) {
    if (Array.isArray(container)) return container;

    for (const key of keys) {
      if (Array.isArray(container?.[key])) {
        return container[key];
      }
    }
  }

  return [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch leave mispunch report.";

const showSideAlert = (message: string, type: any = "info") => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

const mapMasterOptions = (list: any[]): SelectOption[] => {
  if (!Array.isArray(list)) return [];

  return list
    .map((item: any) => {
      const value = getText(
        item.value,
        item.Value,
        item.id,
        item.ID,
        item.Code,
        item.code,
        item.Loc_Code,
        item.Loc_code,
        item.Sec_Code,
        item.Channel_Code,
        item.Cluster_Code,
        item.Br_Location,
      );

      const label = getText(
        item.label,
        item.Label,
        item.Name,
        item.name,
        item.Description,
        item.Loc_Name,
        item.Loc_Name1,
        item.Section,
        item.Channel,
        item.Cluster,
      );

      if (!value) return null;

      return {
        value,
        label: label || value,
        sort_order: Number(item.sort_order ?? item.Sort_Order ?? 0),
      };
    })
    .filter(Boolean) as SelectOption[];
};

/**
 * Converts the selected dropdown value into the old API format.
 *
 * Example:
 * [
 *   {
 *     label: "ALL CLUSTER",
 *     value: "1,2,3,4",
 *     sort_order: 0
 *   }
 * ]
 */
const makeFilterPayload = (
  selectedValue: string,
  options: SelectOption[],
  allLabel: string,
): FilterPayloadItem[] => {
  const availableOptions = options.filter((option) => option.value !== "");

  // If nothing is selected, send all available values.
  if (!selectedValue || selectedValue.trim() === "") {
    const allValues = availableOptions
      .map((option) => option.value)
      .filter(Boolean)
      .join(",");

    return [
      {
        label: allLabel,
        value: allValues,
        sort_order: 0,
      },
    ];
  }

  // Supports comma-separated values as well.
  const selectedValues = selectedValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const selectedOptions = selectedValues.map((value) => {
    const matchedOption = availableOptions.find(
      (option) => option.value === value,
    );

    return {
      value,
      label: matchedOption?.label || value,
      sort_order: matchedOption?.sort_order || 0,
    };
  });

  return [
    {
      label:
        selectedOptions.length === availableOptions.length
          ? allLabel
          : selectedOptions.map((item) => item.label).join(", "),
      value: selectedOptions.map((item) => item.value).join(","),
      sort_order: 0,
    },
  ];
};

const getDefaultDates = () => {
  const today = new Date();
  const oneMonthAgo = new Date();

  oneMonthAgo.setMonth(today.getMonth() - 1);

  const format = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    from: format(oneMonthAgo),
    to: format(today),
  };
};

const formatDateToDDMMYYYY = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const formatUTCDateTime = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function LeaveMispunchReportPage() {
  const user = useCurrentUser();

  const defaultDates = useMemo(() => getDefaultDates(), []);

  // --------------------------------------------------
  // FILTER STATES
  // --------------------------------------------------

  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);

  const reasonTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "1", label: "Leave" },
      { value: "2", label: "Misspunch" },
      { value: "3", label: "Cancel Misspunch" },
      { value: "4", label: "Cancel Leave" },
    ],
    [],
  );

  const [reasonType, setReasonType] = useState("1");

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { value: "1", label: "Approve" },
      { value: "2", label: "Reject" },
      { value: "3", label: "Pending" },
    ],
    [],
  );

  const [status, setStatus] = useState("1");

  const [clusterOptions, setClusterOptions] = useState<SelectOption[]>([]);
  const [cluster, setCluster] = useState("");

  const [sectionOptions, setSectionOptions] = useState<SelectOption[]>([]);
  const [section, setSection] = useState("");

  const [channelOptions, setChannelOptions] = useState<SelectOption[]>([]);
  const [channel, setChannel] = useState("");

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [branch, setBranch] = useState("");

  // --------------------------------------------------
  // TABLE & UI STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<MispunchReportRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // API HEADERS
  // --------------------------------------------------

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // FETCH MASTER DATA
  // --------------------------------------------------

  const fetchMasters = useCallback(async () => {
    if (!user?.Comp_Code) return;

    setMasterLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${MASTER_API}`,
        {
          branch: user?.branch,
        },
        {
          headers: apiHeaders,
        },
      );

      const responseData = response?.data || {};

      const clusterList = responseData?.Br_Location || [];
      const branchList = responseData?.Locations || [];
      const sectionList = responseData?.Section || [];
      const channelList = responseData?.Channel || [];

      setClusterOptions([
        { value: "", label: "" },
        ...mapMasterOptions(clusterList),
      ]);

      setBranchOptions([
        { value: "", label: "" },
        ...mapMasterOptions(branchList),
      ]);

      setSectionOptions([
        { value: "", label: "" },
        ...mapMasterOptions(sectionList),
      ]);

      setChannelOptions([
        { value: "", label: "" },
        ...mapMasterOptions(channelList),
      ]);
    } catch (error: any) {
      console.error("Master Data Error:", error);
      showSideAlert("Unable to load filter dropdowns", "error");
    } finally {
      setMasterLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, apiHeaders]);

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchMasters();
    }
  }, [user?.Comp_Code, fetchMasters]);

  // --------------------------------------------------
  // FETCH MISPUNCH / LEAVE REPORT
  // --------------------------------------------------

  const fetchReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );
      return;
    }

    if (!reasonType) {
      showSideAlert("Please select Type Of Reason", "warning");
      return;
    }

    if (!status) {
      showSideAlert("Please select Type Of Status", "warning");
      return;
    }

    if (!dateFrom || !dateTo) {
      showSideAlert("Please select Date From and Date To", "warning");
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      showSideAlert("Date From cannot be greater than Date To", "warning");
      return;
    }

    setLoading(true);
    setRows([]);
    setHasSearched(false);
    setFilters({});

    try {
      // --------------------------------------------------
      // IMPORTANT:
      // Old API expects arrays of objects, not strings.
      // --------------------------------------------------

      const payload = {
        Loc_code: user?.branch,
        DateFrom: dateFrom,
        DateTo: dateTo,
        Type: reasonType,
        Status: status,

        Cluster: makeFilterPayload(cluster, clusterOptions, "ALL CLUSTER"),

        section: makeFilterPayload(section, sectionOptions, "ALL SECTION"),

        channel: makeFilterPayload(channel, channelOptions, "ALL CHANNEL"),

        location: makeFilterPayload(branch, branchOptions, "ALL BRANCH"),
      };

      console.log("Leave Mispunch Report Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${MISPUNCH_REPORT_API}`,
        payload,
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );

      console.log("Leave Mispunch Report Response:", response?.data);

      const responseData = response?.data;

      if (
        responseData?.success === false ||
        responseData?.Status === false ||
        responseData?.status === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch leave mispunch report.",
        );
      }

      const result = getResponseArray(responseData);

      const mappedRows = result.map((item: any, index: number) => ({
        ...item,
        id: index,
      }));

      setRows(mappedRows);
      setHasSearched(true);
      setSearch("");

      const activeColumns =
        reasonType === "3" || reasonType === "4"
          ? cancelColumns
          : normalColumns;

      setFilters(
        Object.fromEntries(
          activeColumns.map((column: any) => [column.accessor, ""]),
        ),
      );

      if (!mappedRows.length) {
        Swal.fire({
          icon: "info",
          title: "No records found",
          text: "No mispunch or leave records found for the selected filters.",
        });
      }
    } catch (error: any) {
      console.error("Mispunch Report Error:", error);

      setRows([]);
      setHasSearched(true);

      Swal.fire({
        icon: "error",
        title: "Report failed",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    dateFrom,
    dateTo,
    reasonType,
    status,
    cluster,
    section,
    channel,
    branch,
    clusterOptions,
    sectionOptions,
    channelOptions,
    branchOptions,
  ]);

  // --------------------------------------------------
  // TABLE COLUMN DEFINITIONS
  // --------------------------------------------------

  const normalColumns = useMemo(
    () => [
      { Header: "EMPLOYEE CODE", accessor: "Emp_Code", width: 130 },
      { Header: "EMPLOYEE NAME", accessor: "EMPName", width: 210 },
      { Header: "EMPLOYEE DESIGNATION", accessor: "Designation", width: 180 },
      { Header: "REGION", accessor: "Region", width: 130 },
      { Header: "CHANNEL", accessor: "Channel", width: 130 },
      { Header: "CLUSTER", accessor: "Cluster", width: 130 },
      { Header: "LOCATION", accessor: "Branch", width: 150 },
      { Header: "SECTION", accessor: "Section", width: 130 },
      { Header: "DEPARTMENT", accessor: "Department", width: 150 },
      {
        Header: "ATTENDANCE DATE",
        accessor: "dateoffice",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
      {
        Header: "IN 1",
        accessor: "in1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "OUT 1",
        accessor: "out1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "BM IN",
        accessor: "BM_IN1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "BM OUT",
        accessor: "BM_OUT1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "MP IN",
        accessor: "mp_in1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "MP OUT",
        accessor: "mp_out1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      { Header: "REASON", accessor: "ReasonName", width: 150 },
      { Header: "REMARK", accessor: "RemarkName", width: 180 },
      { Header: "SPECIAL REMARK", accessor: "SPL_REMARK", width: 180 },
      { Header: "FINAL STATUS", accessor: "FinalStatus", width: 130 },
      { Header: "APPLIED BY", accessor: "Mis_Enterby", width: 140 },
      {
        Header: "PENDING APPROVER CODE",
        accessor: "PendingApproverCode",
        width: 160,
      },
      {
        Header: "PENDING APPROVER NAME",
        accessor: "PendingApproverName",
        width: 180,
      },
      {
        Header: "PENDING APPROVER LEVEL",
        accessor: "PendingApproverLevel",
        width: 160,
      },
      { Header: "APPR 1 CODE", accessor: "Appr_1_Code", width: 130 },
      { Header: "APPR 1 STATUS", accessor: "Appr_1_Stat", width: 130 },
      { Header: "APPR 1 REMARK", accessor: "Appr_1_Rem", width: 160 },
      {
        Header: "APPR 1 DATE",
        accessor: "Appr_1_date",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
      { Header: "APPR 2 CODE", accessor: "Appr_2_Code", width: 130 },
      { Header: "APPR 2 STATUS", accessor: "Appr_2_Stat", width: 130 },
      { Header: "APPR 2 REMARK", accessor: "Appr_2_Rem", width: 160 },
      {
        Header: "APPR 2 DATE",
        accessor: "Appr_2_date",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
      { Header: "APPR 3 CODE", accessor: "Appr_3_Code", width: 130 },
      { Header: "APPR 3 STATUS", accessor: "Appr_3_Stat", width: 130 },
      { Header: "APPR 3 REMARK", accessor: "Appr_3_Rem", width: 160 },
      {
        Header: "APPR 3 DATE",
        accessor: "Appr_3_date",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
    ],
    [],
  );

  const cancelColumns = useMemo(
    () => [
      { Header: "EMPLOYEE CODE", accessor: "Emp_Code", width: 130 },
      { Header: "EMPLOYEE NAME", accessor: "EMPName", width: 210 },
      { Header: "EMPLOYEE DESIGNATION", accessor: "Designation", width: 180 },
      { Header: "REGION", accessor: "Region", width: 130 },
      { Header: "CHANNEL", accessor: "Channel", width: 130 },
      { Header: "CLUSTER", accessor: "Cluster", width: 130 },
      { Header: "LOCATION", accessor: "Branch", width: 150 },
      { Header: "SECTION", accessor: "Section", width: 130 },
      { Header: "DEPARTMENT", accessor: "Department", width: 150 },
      {
        Header: "ATTENDANCE DATE",
        accessor: "dateoffice",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
      {
        Header: "IN 1",
        accessor: "in1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "OUT 1",
        accessor: "out1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "BM IN",
        accessor: "BM_IN1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "BM OUT",
        accessor: "BM_OUT1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "MP IN",
        accessor: "mp_in1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      {
        Header: "MP OUT",
        accessor: "mp_out1",
        width: 150,
        Cell: ({ value }: any) => formatUTCDateTime(value),
      },
      { Header: "REASON", accessor: "ReasonName", width: 150 },
      { Header: "REMARK", accessor: "RemarkName", width: 180 },
      { Header: "SPECIAL REMARK", accessor: "SPL_REMARK", width: 180 },
      { Header: "FINAL STATUS", accessor: "FinalStatus", width: 130 },
      {
        Header: "PENDING APPROVER CODE",
        accessor: "PendingApproverCode",
        width: 160,
      },
      {
        Header: "PENDING APPROVER NAME",
        accessor: "PendingApproverName",
        width: 180,
      },
      {
        Header: "PENDING APPROVER LEVEL",
        accessor: "PendingApproverLevel",
        width: 160,
      },
      { Header: "CANCEL BY", accessor: "Canc_By", width: 140 },
      { Header: "CANCEL REMARK", accessor: "Canc_Rem", width: 180 },
      {
        Header: "CANCEL DATE",
        accessor: "Canc_Date",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
      { Header: "APPR 1 CODE", accessor: "Canc_1_Code", width: 130 },
      { Header: "APPR 1 STATUS", accessor: "Canc_1_Stat", width: 130 },
      { Header: "APPR 1 REMARK", accessor: "Canc_1_Rem", width: 160 },
      {
        Header: "APPR 1 DATE",
        accessor: "Canc_1_Date",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
      { Header: "APPR 2 CODE", accessor: "Canc_2_Code", width: 130 },
      { Header: "APPR 2 STATUS", accessor: "Canc_2_Stat", width: 130 },
      { Header: "APPR 2 REMARK", accessor: "Canc_2_Rem", width: 160 },
      {
        Header: "APPR 2 DATE",
        accessor: "Canc_2_Date",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
      { Header: "APPR 3 CODE", accessor: "Canc_3_Code", width: 130 },
      { Header: "APPR 3 STATUS", accessor: "Canc_3_Stat", width: 130 },
      { Header: "APPR 3 REMARK", accessor: "Canc_3_Rem", width: 160 },
      {
        Header: "APPR 3 DATE",
        accessor: "Canc_3_Date",
        width: 140,
        Cell: ({ value }: any) => formatDateToDDMMYYYY(value),
      },
    ],
    [],
  );

  const columns = useMemo(() => {
    const selectedColumns =
      reasonType === "3" || reasonType === "4" ? cancelColumns : normalColumns;

    return selectedColumns.map((column: any) => ({
      ...column,
      minWidth: 120,
      Cell:
        column.Cell ||
        (({ value }: any) => {
          if (value === null || value === undefined || value === "") {
            return <span className="text-slate-400">—</span>;
          }

          if (column.accessor === "Emp_Code") {
            return (
              <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                {String(value).trim().toUpperCase()}
              </span>
            );
          }

          return (
            <span className="text-[12.5px] text-[#334155] dark:text-slate-300">
              {String(value)}
            </span>
          );
        }),
    }));
  }, [reasonType, normalColumns, cancelColumns]);

  // --------------------------------------------------
  // FILTER HANDLING
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setSearch("");

    setFilters(
      Object.fromEntries(columns.map((column: any) => [column.accessor, ""])),
    );
  };

  // --------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        Object.values(row).some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        );

      const matchesColumns = Object.entries(filters).every(([key, value]) => {
        if (!value.trim()) return true;

        return String(row[key] ?? "")
          .toLowerCase()
          .includes(value.trim().toLowerCase());
      });

      return matchesSearch && matchesColumns;
    });
  }, [rows, search, filters]);

  // --------------------------------------------------
  // EXCEL EXPORT
  // --------------------------------------------------

  const exportToExcel = () => {
    if (!filteredRows.length) {
      Swal.fire({
        icon: "info",
        title: "No records",
        text: "There are no records available to export.",
      });
      return;
    }

    const headers = columns.map((column: any) => column.Header);
    const accessors = columns.map((column: any) => column.accessor);

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...filteredRows.map((row) =>
        accessors.map((accessor: string) => escapeCSV(row[accessor])).join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Leave_Mispunch_Report_${dateFrom}_to_${dateTo}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const columnFilters = columns.map((column: any) => [
    column.accessor,
    column.Header,
  ]);

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[12px] text-[#64748b] dark:text-slate-400"></div>

            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Leave Mispunch Report
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="min-w-0">
              <Einput
                title="Date from"
                name="dateFrom"
                type="date"
                value={dateFrom}
                handleInputChange={(name: string, value: string) =>
                  setDateFrom(value)
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Einput
                title="Date to"
                name="dateTo"
                type="date"
                value={dateTo}
                handleInputChange={(name: string, value: string) =>
                  setDateTo(value)
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Reason type"
                name="reasonType"
                option={reasonTypeOptions}
                initialValue={reasonType}
                handleInputChange={(name: string, value: any) =>
                  setReasonType(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Status"
                name="status"
                option={statusOptions}
                initialValue={status}
                handleInputChange={(name: string, value: any) =>
                  setStatus(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Cluster"
                name="cluster"
                option={clusterOptions}
                initialValue={cluster}
                handleInputChange={(name: string, value: any) =>
                  setCluster(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Section"
                name="section"
                option={sectionOptions}
                initialValue={section}
                handleInputChange={(name: string, value: any) =>
                  setSection(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>
          </div>

          {/* ROW 2 */}

          <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.5fr_auto_2fr]">
            <div className="min-w-0">
              <Eselect
                title="Channel"
                name="channel"
                option={channelOptions}
                initialValue={channel}
                handleInputChange={(name: string, value: any) =>
                  setChannel(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Branch"
                name="branch"
                option={branchOptions}
                initialValue={branch}
                handleInputChange={(name: string, value: any) =>
                  setBranch(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchReport}
                disabled={loading || masterLoading}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-6 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* REPORT TABLE CARD */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
          {/* TOOLBAR */}

          <div className="flex min-w-0 flex-col gap-3 border-b border-[#e8edf5] p-3.5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex shrink-0 items-center gap-3">
              <p className="text-[13px] font-medium text-[#64748b] dark:text-slate-400">
                {hasSearched ? (
                  <>
                    <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                      {filteredRows.length}
                    </span>{" "}
                    of {rows.length} rows
                  </>
                ) : (
                  <span>Not loaded yet</span>
                )}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1 sm:w-[260px] sm:flex-none">
                <Einput
                  name="search"
                  type="text"
                  value={search}
                  placeholder="Search in results..."
                  handleInputChange={(name: string, value: string) =>
                    setSearch(value)
                  }
                  className="h-[38px] w-full"
                />
              </div>

              <AButton
                type="button"
                onClick={() => setShowColumnFilters((previous) => !previous)}
                className={`inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border px-3.5 text-[12px] font-semibold transition ${
                  showColumnFilters
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-[#dce5f1] bg-white text-[#152b4b] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                Column filters
              </AButton>

              <AButton
                type="button"
                onClick={resetFilters}
                className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-[#152b4b] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Reset
              </AButton>

              <AButton
                type="button"
                onClick={exportToExcel}
                disabled={!filteredRows.length}
                className="inline-flex h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                Export to Excel
              </AButton>
            </div>
          </div>

          {/* COLUMN FILTER PANEL */}

          {showColumnFilters && (
            <div className="border-b border-[#e8edf5] bg-[#f8fafc] p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                  Filter individual columns
                </p>

                <button
                  type="button"
                  onClick={() => setShowColumnFilters(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {columnFilters.map(([key, label]) => (
                  <div key={key} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {label}
                    </label>

                    <input
                      type="text"
                      value={filters[key] || ""}
                      onChange={(event) =>
                        handleFilterChange(key, event.target.value)
                      }
                      placeholder={`Search ${String(label).toLowerCase()}`}
                      className="h-[37px] w-full rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TABLE / EMPTY STATE */}

          {hasSearched ? (
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-max">
                {filteredRows.length > 0 ? (
                  <DataTable columns={columns} data={filteredRows} />
                ) : (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No records found for the selected criteria.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center">
              <h3 className="text-[15px] font-semibold text-[#152b4b] dark:text-slate-200">
                Set filters and click Show
              </h3>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                Results will appear here with search, column filters, sorting
                and Excel export.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
