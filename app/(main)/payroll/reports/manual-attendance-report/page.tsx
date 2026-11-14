"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, Filter, RotateCcw, Download, X } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

const REPORT_API = "/employee/mispunchReport";

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

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const formatDate = (dateString: any) => {
  if (!dateString) return "";

  const raw = String(dateString).trim();

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", {
    month: "short",
  });

  return `${day} ${month} ${date.getFullYear()}`;
};

const formatTime = (value: any) => {
  if (!value) return "";

  const rawValue = String(value).trim();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(rawValue)) {
    return rawValue.slice(0, 5);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return rawValue;

  return date.toISOString().split("T")[1].slice(0, 5);
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

const mapReportRow = (item: any) => ({
  ...item,

  Region: getText(item.Region, item.REGION),

  Location: getText(item.Location, item.Branch, item.LOCATION, item.Loc_Name),

  Division: getText(item.Division, item.Channel, item.CHANNEL, item.DIVISION),

  Department: getText(item.Department, item.DEPARTMENT),

  Designation: getText(item.Designation, item.DESIGNATION),

  EmpCode: getText(item.EmpCode, item.Emp_Code, item.EMPCODE),

  EmployeeName: getText(
    item.EmployeeName,
    item.EMPName,
    item.EMPNAME,
    item.Emp_Name,
  ),

  AttendanceDate:
    item.AttendanceDate ?? item.dateoffice ?? item.ATTENDANCE_DATE ?? "",

  ShiftStartTime: getText(
    item.ShiftStartTime,
    item.shift,
    item.Shift,
    item.shiftTime,
    item.ShiftTime,
  ),

  BM_IN1: item.BM_IN1 ?? item.BM_IN ?? item.BM_IN_TIME,

  BM_OUT1: item.BM_OUT1 ?? item.BM_OUT ?? item.BM_OUT_TIME,

  mp_in1: item.mp_in1 ?? item.MP_IN ?? item.MP_IN1,

  mp_out1: item.mp_out1 ?? item.MP_OUT ?? item.MP_OUT1,

  ShiftEndTime: getText(item.ShiftEndTime, item.SHIFT_END_TIME),

  InTime: item.InTime ?? item.IN_TIME,

  OutTime: item.OutTime ?? item.OUT_TIME,

  Status: getText(item.Status, item.status),

  InManual: getText(item.InManual, item.IN_MANUAL),

  OutManual: getText(item.OutManual, item.OUT_MANUAL),

  IsMobilePunch: getText(item.IsMobilePunch, item.IS_MOBILE_PUNCH),

  MispunchReason: getText(
    item.MispunchReason,
    item.MIS_PUNCH_REASON,
    item.mipunch_reason,
    item.ReasonName,
  ),

  MispunchRemark: getText(
    item.MispunchRemark,
    item.MISPUNCH_REMARK,
    item.Mis_Enterby,
  ),

  SPLRemark: getText(item.SPLRemark, item.SPL_REMARK),

  Approver1: getText(
    item.Approver1,
    item.Approver1Name,
    item.Appr_1_Name,
    item.Appr_1_Code,
  ),

  Appr_1_Rem: getText(item.Appr_1_Rem),

  Approver2: getText(
    item.Approver2,
    item.Approver2Name,
    item.Appr_2_Name,
    item.Appr_2_Code,
  ),

  Appr_2_Rem: getText(item.Appr_2_Rem),

  Approver3: getText(
    item.Approver3,
    item.Approver3Name,
    item.Appr_3_Name,
    item.Appr_3_Code,
  ),

  Appr_3_Rem: getText(item.Appr_3_Rem),
});

const showAlert = (
  message: string,
  icon: "success" | "error" | "warning" | "info" = "info",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  }).fire({
    icon,
    title: message,
  });
};

export default function Page() {
  const user = useCurrentUser();

  const defaultDates = useMemo(() => getDefaultDates(), []);

  const [dates, setDates] = useState({
    DATE_FROM: defaultDates.from,
    DATE_TO: defaultDates.to,
  });

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );

  const handleDateChange = (name: string, value: string) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const columns = useMemo(
    () => [
      {
        Header: "REGION",
        accessor: "Region",
        minWidth: 120,
        width: 120,
      },
      {
        Header: "LOCATION",
        accessor: "Location",
        minWidth: 140,
        width: 140,
      },
      {
        Header: "DIVISION",
        accessor: "Division",
        minWidth: 130,
        width: 130,
      },
      {
        Header: "DEPARTMENT",
        accessor: "Department",
        minWidth: 160,
        width: 160,
      },
      {
        Header: "DESIGNATION",
        accessor: "Designation",
        minWidth: 170,
        width: 170,
      },
      {
        Header: "EMP CODE",
        accessor: "EmpCode",
        minWidth: 120,
        width: 120,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EmployeeName",
        minWidth: 220,
        width: 220,
      },
      {
        Header: "ATTENDANCE DATE",
        accessor: "AttendanceDate",
        minWidth: 160,
        width: 160,
        Cell: ({ value }: any) => formatDate(value),
      },
      {
        Header: "SHIFT START TIME",
        accessor: "ShiftStartTime",
        minWidth: 150,
        width: 150,
      },
      {
        Header: "BM IN",
        accessor: "BM_IN1",
        minWidth: 110,
        width: 110,
        Cell: ({ value }: any) => formatTime(value),
      },
      {
        Header: "BM OUT",
        accessor: "BM_OUT1",
        minWidth: 110,
        width: 110,
        Cell: ({ value }: any) => formatTime(value),
      },
      {
        Header: "MP IN",
        accessor: "mp_in1",
        minWidth: 110,
        width: 110,
        Cell: ({ value }: any) => formatTime(value),
      },
      {
        Header: "MP OUT",
        accessor: "mp_out1",
        minWidth: 110,
        width: 110,
        Cell: ({ value }: any) => formatTime(value),
      },
      {
        Header: "SHIFT END TIME",
        accessor: "ShiftEndTime",
        minWidth: 150,
        width: 150,
      },
      {
        Header: "IN TIME",
        accessor: "InTime",
        minWidth: 110,
        width: 110,
        Cell: ({ value }: any) => formatTime(value),
      },
      {
        Header: "OUT TIME",
        accessor: "OutTime",
        minWidth: 110,
        width: 110,
        Cell: ({ value }: any) => formatTime(value),
      },
      {
        Header: "STATUS",
        accessor: "Status",
        minWidth: 110,
        width: 110,
      },
      {
        Header: "IN MANUAL",
        accessor: "InManual",
        minWidth: 110,
        width: 110,
      },
      {
        Header: "OUT MANUAL",
        accessor: "OutManual",
        minWidth: 110,
        width: 110,
      },
      {
        Header: "IS MOBILE PUNCH",
        accessor: "IsMobilePunch",
        minWidth: 150,
        width: 150,
      },
      {
        Header: "MISPUNCH REASON",
        accessor: "MispunchReason",
        minWidth: 170,
        width: 170,
      },
      {
        Header: "MISPUNCH REMARK",
        accessor: "MispunchRemark",
        minWidth: 180,
        width: 180,
      },
      {
        Header: "SPL REMARK",
        accessor: "SPLRemark",
        minWidth: 160,
        width: 160,
      },
      {
        Header: "APPROVER1 NAME",
        accessor: "Approver1",
        minWidth: 160,
        width: 160,
      },
      {
        Header: "APPROVER1 REMARK",
        accessor: "Appr_1_Rem",
        minWidth: 180,
        width: 180,
      },
      {
        Header: "APPROVER2 NAME",
        accessor: "Approver2",
        minWidth: 160,
        width: 160,
      },
      {
        Header: "APPROVER2 REMARK",
        accessor: "Appr_2_Rem",
        minWidth: 180,
        width: 180,
      },
      {
        Header: "APPROVER3 NAME",
        accessor: "Approver3",
        minWidth: 160,
        width: 160,
      },
      {
        Header: "APPROVER3 REMARK",
        accessor: "Appr_3_Rem",
        minWidth: 180,
        width: 180,
      },
    ],
    [],
  );

  // REPORT API

  const ShowData = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) {
      showAlert("Company or branch information is missing.", "warning");
      return;
    }

    if (!dates.DATE_FROM || !dates.DATE_TO) {
      showAlert("Please select both dates.", "warning");
      return;
    }

    if (
      new Date(`${dates.DATE_FROM}T00:00:00`) >
      new Date(`${dates.DATE_TO}T00:00:00`)
    ) {
      showAlert("Date from cannot be greater than date to.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        EmpLoc: user.branch,
        DateFrom: dates.DATE_FROM,
        DateTo: dates.DATE_TO,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${REPORT_API}`,
        payload,
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      console.log("Mispunch Report Response:", response?.data);

      const responseData = response?.data;

      if (
        responseData?.success === false ||
        responseData?.Status === false ||
        responseData?.status === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch mispunch report.",
        );
      }

      const result = getResponseArray(responseData);

      const cleanedData = result.map((row: any) => {
        const trimmedRow: any = {};

        Object.keys(row || {}).forEach((key) => {
          const value = row[key];

          trimmedRow[key] = typeof value === "string" ? value.trim() : value;
        });

        return mapReportRow(trimmedRow);
      });

      setTabledata(cleanedData);

      if (!cleanedData.length) {
        showAlert("No mispunch records found for selected dates.", "info");
      }
    } catch (error: any) {
      console.error(
        "Mispunch Report API Error:",
        error?.response?.data || error,
      );

      setTabledata([]);

      Swal.fire({
        icon: "error",
        title: "Report failed",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.Message ||
          error?.message ||
          "Unable to fetch mispunch report.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    user?.name,
    dates.DATE_FROM,
    dates.DATE_TO,
  ]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      ShowData();
    }
  }, [user?.Comp_Code, user?.branch, ShowData]);

  // FILTER OPTIONS

  const filterableColumns = useMemo(
    () =>
      columns.filter((column: any) =>
        [
          "Region",
          "Location",
          "Division",
          "Department",
          "Designation",
          "Status",
          "MispunchReason",
        ].includes(column.accessor),
      ),
    [columns],
  );

  const columnFilterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};

    filterableColumns.forEach((column: any) => {
      const values = tabledata
        .map((row) => String(row[column.accessor] ?? "").trim())
        .filter(Boolean);

      options[column.accessor] = Array.from(new Set(values)).sort((a, b) =>
        a.localeCompare(b),
      );
    });

    return options;
  }, [tabledata, filterableColumns]);

  // SEARCH + FILTER

  const filteredData = useMemo(() => {
    return tabledata.filter((row) => {
      const searchMatch =
        !searchText.trim() ||
        columns.some((column: any) => {
          const value = row[column.accessor];

          return String(value ?? "")
            .toLowerCase()
            .includes(searchText.toLowerCase().trim());
        });

      if (!searchMatch) return false;

      return Object.entries(columnFilters).every(
        ([accessor, selectedValue]) => {
          if (!selectedValue) return true;

          return String(row[accessor] ?? "").trim() === selectedValue;
        },
      );
    });
  }, [tabledata, searchText, columnFilters, columns]);

  const resetTableFilters = () => {
    setSearchText("");
    setColumnFilters({});
    setShowColumnFilters(false);
  };

  // EXPORT CSV

  const exportToExcel = () => {
    if (!filteredData.length) {
      showAlert("No records available to export.", "warning");
      return;
    }

    const headers = columns.map((column: any) => column.Header);

    const csvRows = [
      headers,
      ...filteredData.map((row) =>
        columns.map((column: any) => {
          let value = row[column.accessor] ?? "";

          if (column.accessor === "AttendanceDate") {
            value = formatDate(value);
          }

          if (
            [
              "BM_IN1",
              "BM_OUT1",
              "mp_in1",
              "mp_out1",
              "InTime",
              "OutTime",
            ].includes(column.accessor)
          ) {
            value = formatTime(value);
          }

          return value;
        }),
      ),
    ];

    const csvContent =
      "\uFEFF" +
      csvRows
        .map((row) =>
          row
            .map((value: any) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Mispunch_Report_${dates.DATE_FROM}_to_${dates.DATE_TO}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-3 py-3 text-[#172b45] dark:bg-[#101827] dark:text-slate-100 sm:px-5">
      {/* HEADER */}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[23px] font-bold leading-tight text-[#172b45] dark:text-white">
            Mispunch Report
          </h1>
        </div>
      </div>

      {/* DATE FILTER CARD */}

      <div className="mb-4 rounded-2xl border border-[#dce5f0] bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[355px_355px_86px_1fr]">
          <div>
            <Einput
              title="Date from"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              className="h-[40px] w-full"
            />
          </div>

          <div>
            <Einput
              title="Date to"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              className="h-[40px] w-full"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <AButton
              variant="primary"
              className="h-[40px] w-full rounded-xl bg-[#5146e5] text-white hover:bg-[#4338ca]"
              onClick={ShowData}
              disabled={isLoading}
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}

      <div className="overflow-hidden rounded-2xl border border-[#dce5f0] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* TABLE TOOLBAR */}

        <div className="flex flex-col gap-3 border-b border-[#dce5f0] bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-[15px] font-medium text-[#64748b] dark:text-slate-300">
            {filteredData.length} of {tabledata.length} rows
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:w-[285px]">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search in results..."
                className="h-[40px] w-full rounded-xl border border-[#dce5f0] bg-white pl-10 pr-3 text-sm text-[#172b45] outline-none placeholder:text-slate-400 focus:border-[#8b9cf7] focus:ring-2 focus:ring-[#5146e5]/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
              />
            </div>

            {/* <button
              type="button"
              onClick={() =>
                setShowColumnFilters((prev) => !prev)
              }
              className={`flex h-[40px] items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors dark:border-slate-600 ${
                showColumnFilters
                  ? "border-[#5146e5] bg-[#f1f0ff] text-[#5146e5] dark:bg-indigo-950 dark:text-indigo-300"
                  : "border-[#dce5f0] bg-white text-[#172b45] dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              <Filter size={16} className="mr-2" />
              Column filters
            </button> */}

            <button
              type="button"
              onClick={resetTableFilters}
              className="flex h-[42px] items-center justify-center rounded-xl border border-[#dce5f0] bg-white px-4 text-sm font-semibold text-[#172b45] transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={15} className="mr-2" />
              Reset
            </button>

            {/* <button
              type="button"
              onClick={exportToExcel}
              disabled={!filteredData.length}
              className="flex h-[42px] items-center justify-center rounded-xl border border-[#dce5f0] bg-white px-4 text-sm font-semibold text-[#15945b] transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-green-400 dark:hover:bg-green-950"
            >
              <Download size={16} className="mr-2" />
              Export to Excel
            </button>  */}
          </div>
        </div>

        {/* COLUMN FILTER PANEL */}

        {showColumnFilters && (
          <div className="border-b border-[#dce5f0] bg-[#f8fafc] px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172b45] dark:text-white">
                Filter columns
              </h3>

              <button
                type="button"
                onClick={() => setShowColumnFilters(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filterableColumns.map((column: any) => (
                <div key={column.accessor}>
                  <label className="mb-1.5 block text-xs font-semibold text-[#64748b] dark:text-slate-300">
                    {column.Header}
                  </label>

                  <select
                    value={columnFilters[column.accessor] || ""}
                    onChange={(e) =>
                      setColumnFilters((prev) => ({
                        ...prev,
                        [column.accessor]: e.target.value,
                      }))
                    }
                    className="h-[40px] w-full rounded-lg border border-[#dce5f0] bg-white px-3 text-sm text-[#172b45] outline-none focus:border-[#8b9cf7] dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">All</option>

                    {(columnFilterOptions[column.accessor] || []).map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setColumnFilters({})}
                className="h-[36px] rounded-lg border border-[#dce5f0] bg-white px-4 text-xs font-semibold text-[#172b45] transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Clear column filters
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}

        <div className="w-full overflow-x-auto bg-white dark:bg-slate-900">
          <div className="min-w-full">
            <DataTable
              columns={columns}
              data={filteredData}
              showExcelExport={true}
              showColumnFilters={true}
              onRowDoubleClick={(row: any) => console.log(row, "rowData")}
            />
          </div>
        </div>
      </div>

      {/* LOADER */}

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
