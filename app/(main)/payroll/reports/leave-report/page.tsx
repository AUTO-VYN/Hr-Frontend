
"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Download, Search, X, Users } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import FilterScope from "@/components/atoms/FilterScope";

type Option = {
  value: string;
  label: string;
};

type FilterItem = {
  id: string;
  label: string;
};

type FilterCategory = {
  id: string;
  label: string;
  options: FilterItem[];
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

const getDefaultDates = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const from = new Date(year, month - 1, 26);
  const to = new Date(year, month, 25);

  const format = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  return {
    year: String(year),
    month: String(month + 1),
    dateFrom: format(from),
    dateTo: format(to),
  };
};

const INITIAL_DATES = getDefaultDates();

const createEmptyCategories = (): FilterCategory[] => [
  { id: "regions", label: "Regions", options: [] },
  { id: "channel", label: "Channel", options: [] },
  { id: "cluster", label: "Cluster", options: [] },
  { id: "locations", label: "Locations", options: [] },
  { id: "sections", label: "Sections", options: [] },
  { id: "department", label: "Department", options: [] },
  { id: "designation", label: "Designation", options: [] },
];

const REPORTS = [
  "Comp-off balance report",
  "Leave transaction details",
];

const API_BASE = process.env.NEXT_PUBLIC_URL;

const getOptionValue = (item: any): string => {
  return String(
    item?.value ??
      item?.Code ??
      item?.code ??
      item?.Loc_Code ??
      item?.REGION_CODE ??
      item?.CHANNEL_CODE ??
      item?.CLUSTER_CODE ??
      item?.SECTION_CODE ??
      item?.DIVISION_CODE ??
      item?.DESIGNATION_CODE ??
      item?.id ??
      "",
  );
};

const getOptionLabel = (item: any): string => {
  return String(
    item?.label ??
      item?.name ??
      item?.Name ??
      item?.Loc_Name ??
      item?.Location_Name ??
      item?.Region_Name ??
      item?.Channel_Name ??
      item?.Cluster_Name ??
      item?.Section_Name ??
      item?.Division_Name ??
      item?.Designation_Name ??
      item?.description ??
      getOptionValue(item),
  );
};

const normalizeOptions = (items: any): FilterItem[] => {
  if (!Array.isArray(items)) return [];

  const flattened = items.flat(Infinity);

  return flattened
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
      id: getOptionValue(item),
      label: getOptionLabel(item),
    }))
    .filter((item: FilterItem) => item.id !== "");
};

const formatDateForAPI = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";

  const value = String(dateStr).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parts = value.split("/");

  if (parts.length === 3) {
    const [day, month, year] = parts;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return value;
};

const getErrorMessage = async (error: any): Promise<string> => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);

      return (
        parsed?.message ||
        parsed?.Message ||
        "Unable to process request."
      );
    } catch {
      return "Unable to process request.";
    }
  }

  return (
    data?.message ||
    data?.Message ||
    error?.message ||
    "Something went wrong."
  );
};

export default function LeaveReportsPage() {
  const user = useCurrentUser();

  const [year, setYear] = useState(INITIAL_DATES.year);
  const [month, setMonth] = useState(INITIAL_DATES.month);
  const [dateFrom, setDateFrom] = useState(INITIAL_DATES.dateFrom);
  const [dateTo, setDateTo] = useState(INITIAL_DATES.dateTo);

  const [activeReport] = useState("Leave Reports");

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeName, setEmployeeName] = useState("N/A");
  const [employeeCode, setEmployeeCode] = useState("");

  const [showEmployeeSuggestions, setShowEmployeeSuggestions] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>(
    createEmptyCategories,
  );

  const [employeeOptions, setEmployeeOptions] = useState<Option[]>([]);

  // Convert API filter categories into FilterScope component structure.
  const filterScopeCategories = useMemo(
    () =>
      filterCategories.map((category) => ({
        key: category.id,
        label: category.label,
        options: category.options.map((item) => ({
          value: item.id,
          label: item.label,
        })),
      })),
    [filterCategories],
  );

  // Live employee autocomplete filtering.
  const filteredEmployeeOptions = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();

    if (!search) return [];

    return employeeOptions
      .filter(
        (item) =>
          item.value.toLowerCase().includes(search) ||
          item.label.toLowerCase().includes(search),
      )
      .slice(0, 8);
  }, [employeeOptions, employeeSearch]);

  const handleInputChange = (name: string, value: any) => {
    if (name === "year") setYear(String(value ?? ""));
    if (name === "month") setMonth(String(value ?? ""));
    if (name === "dateFrom") setDateFrom(String(value ?? ""));
    if (name === "dateTo") setDateTo(String(value ?? ""));
  };

  // Load filter masters for the selected branch, month and year.
  useEffect(() => {
    if (!user?.branch || !user?.Comp_Code) return;

    let isMounted = true;

    const fetchMasters = async () => {
      try {
        const response = await axios.post(
          `${API_BASE}/hrmsreport/findMasters`,
          {
            multiloc: user.branch,
            Month: Number(month),
            Year: Number(year),
          },
          {
            headers: {
              compcode: user.Comp_Code,
              name: user.name,
            },
          },
        );

        if (!isMounted) return;

        const masterData = response.data?.data || {};

        const regions = normalizeOptions(masterData.Region);
        const channels = normalizeOptions(masterData.CHANNEL);
        const clusters = normalizeOptions(masterData.CLUSTER);
        const locations = normalizeOptions(masterData.Location);
        const sections = normalizeOptions(masterData.SECTION);
        const departments = normalizeOptions(masterData.DIVISION);
        const designations = normalizeOptions(masterData.DESIGNATION);

        setFilterCategories([
          {
            id: "regions",
            label: "Regions",
            options: regions,
          },
          {
            id: "channel",
            label: "Channel",
            options: channels,
          },
          {
            id: "cluster",
            label: "Cluster",
            options: clusters,
          },
          {
            id: "locations",
            label: "Locations",
            options: locations,
          },
          {
            id: "sections",
            label: "Sections",
            options: sections,
          },
          {
            id: "department",
            label: "Department",
            options: departments,
          },
          {
            id: "designation",
            label: "Designation",
            options: designations,
          },
        ]);

        // Apply payroll date range supplied by master API.
        const miscDates = masterData.MiscDate;

        if (Array.isArray(miscDates) && miscDates.length > 0) {
          const misc = miscDates[0];

          const from = formatDateForAPI(misc?.Misc_Dtl1);
          const to = formatDateForAPI(misc?.Misc_Dtl2);

          if (from) setDateFrom(from);
          if (to) setDateTo(to);
        }
      } catch (error) {
        console.error("Leave report master API error:", error);

        if (isMounted) {
          Swal.fire({
            icon: "error",
            title: "Unable to load filters",
            text: await getErrorMessage(error),
          });
        }
      }
    };

    fetchMasters();

    return () => {
      isMounted = false;
    };
  }, [user?.branch, user?.Comp_Code, user?.name, month, year]);

  // Load employees using the existing employee master API.
  useEffect(() => {
    if (!user?.branch || !user?.Comp_Code) return;

    let isMounted = true;

    const fetchEmployees = async () => {
      try {
        const response = await axios.post(
          `${API_BASE}/users/findAllEmployee`,
          {
            branch: user.branch,
          },
          {
            headers: {
              compcode: user.Comp_Code,
              name: user.name,
            },
          },
        );

        if (!isMounted) return;

        const employees = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        const mappedEmployees = employees
          .map((item: any) => {
            const value = String(
              item?.value ??
                item?.EMPCODE ??
                item?.Emp_Code ??
                item?.empcode ??
                item?.Code ??
                item?.code ??
                "",
            );

            const label = String(
              item?.label ??
                item?.EMP_NAME ??
                item?.Emp_Name ??
                item?.empname ??
                item?.Employee_Name ??
                item?.name ??
                item?.Name ??
                value,
            );

            return {
              value,
              label,
            };
          })
          .filter((item: Option) => item.value !== "");

        setEmployeeOptions(mappedEmployees);
      } catch (error) {
        console.error("Employee master API error:", error);
      }
    };

    fetchEmployees();

    return () => {
      isMounted = false;
    };
  }, [user?.branch, user?.Comp_Code, user?.name]);

  // Select employee from autocomplete suggestions.
  const selectEmployee = (employee: Option) => {
    setEmployeeCode(employee.value);
    setEmployeeName(employee.label);
    setEmployeeSearch(employee.value);
    setShowEmployeeSuggestions(false);

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Employee selected",
      text: employee.label,
      showConfirmButton: false,
      timer: 1500,
    });
  };

  const handleEmployeeSearch = () => {
    const search = employeeSearch.trim().toLowerCase();

    if (!search) {
      setEmployeeCode("");
      setEmployeeName("N/A");

      Swal.fire({
        icon: "warning",
        title: "Employee required",
        text: "Please enter an employee code or name.",
        confirmButtonColor: "#4f46e5",
      });

      return;
    }

    const matchedEmployee = employeeOptions.find(
      (item) =>
        item.value.toLowerCase() === search ||
        item.label.toLowerCase() === search,
    );

    const partialMatch =
      matchedEmployee ||
      employeeOptions.find(
        (item) =>
          item.value.toLowerCase().includes(search) ||
          item.label.toLowerCase().includes(search),
      );

    if (!partialMatch) {
      setEmployeeCode("");
      setEmployeeName("N/A");

      Swal.fire({
        icon: "info",
        title: "Employee not found",
        text: "No employee matched the entered code or name.",
        confirmButtonColor: "#4f46e5",
      });

      return;
    }

    selectEmployee(partialMatch);
  };

  const buildReportPayload = () => {
    const selectedLocations = selectedFilters.locations || [];

    return {
      dateFrom,
      dateto: dateTo,

      region: selectedFilters.regions?.length
        ? selectedFilters.regions
        : "",

      channel: selectedFilters.channel?.length
        ? selectedFilters.channel
        : "",

      Cluster: selectedFilters.cluster?.length
        ? selectedFilters.cluster
        : "",

      location: selectedLocations.length
        ? selectedLocations
        : user?.branch || "",

      user_location: selectedLocations.length,

      empcode: employeeCode || "",

      department: selectedFilters.department?.length
        ? selectedFilters.department
        : "",

      section: selectedFilters.sections?.length
        ? selectedFilters.sections
        : "",
    };
  };

  const handleDownload = async (reportName: string) => {
    if (!user?.Comp_Code) {
      Swal.fire({
        icon: "error",
        title: "Company not found",
        text: "Unable to identify the current company.",
      });

      return;
    }

    if (!year || !month || !dateFrom || !dateTo) {
      Swal.fire({
        icon: "warning",
        title: "Missing filters",
        text: "Please select year, month and date range.",
      });

      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid date range",
        text: "Date from cannot be greater than date to.",
      });

      return;
    }

    const isCompOff = reportName === REPORTS[0];

    const endpoint = isCompOff
      ? "comp_off_balance_report"
      : "Leave_trans_report";

    const fileName = isCompOff
      ? "Comp Off Balance Report.xlsx"
      : "Leave Transaction Details.xlsx";

    const url = `${API_BASE}/hrmsreport/${endpoint}?compcode=${encodeURIComponent(
      user.Comp_Code,
    )}`;

    setLoading(true);

    try {
      const payload = buildReportPayload();

      const response = await axios.post(url, payload, {
        headers: {
          compcode: user.Comp_Code,
          name: user.name,
        },
        responseType: "blob",
      });

      const contentType = response.headers?.["content-type"] || "";

      // Handle API errors returned as JSON despite responseType blob.
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/plain")
      ) {
        const message = await getErrorMessage({
          response: { data: response.data },
        });

        throw new Error(message);
      }

      const blob = new Blob([response.data], {
        type:
          contentType ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (!blob.size) {
        throw new Error("The report API returned an empty file.");
      }

      const disposition =
        response.headers?.["content-disposition"] || "";

      const filenameMatch = disposition.match(
        /filename\*?=(?:UTF-8''|")?([^";]+)/i,
      );

      const downloadedFileName = filenameMatch
        ? decodeURIComponent(
            filenameMatch[1].replace(/"/g, "").trim(),
          )
        : fileName;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = downloadedFileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Report downloaded successfully",
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error: any) {
      console.error(`${reportName} download error:`, error);

      Swal.fire({
        icon: "error",
        title: "Download failed",
        text: error?.message || (await getErrorMessage(error)),
        confirmButtonColor: "#4f46e5",
      });
    } finally {
      setLoading(false);
    }
  };

  const yearOptions: Option[] = Array.from({ length: 8 }, (_, i) => {
    const value = String(new Date().getFullYear() - 5 + i);

    return {
      value,
      label: value,
    };
  });

  return (
    <div className="min-h-screen min-w-0 bg-[#f6f9fc] p-3 dark:bg-[#0b1220] sm:p-4">
      <div className="mx-auto w-full max-w-[1900px] min-w-0">
        <main className="w-full min-w-0 space-y-3">
          {/* PAGE HEADER */}
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[21px] font-bold leading-tight text-[#152b4b] dark:text-slate-100">
                {activeReport}
              </h1>
            </div>
          </div>

          {/* DATE FILTERS */}
          <section className="rounded-xl border border-[#dce5f1] bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900 sm:p-4">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <div className="min-w-0">
                <Eselect
                  title="Year"
                  name="year"
                  option={yearOptions}
                  initialValue={year}
                  handleInputChange={handleInputChange}
                  className="h-[41px] w-full"
                />
              </div>

              <div className="min-w-0">
                <Eselect
                  title="Month"
                  name="month"
                  option={MONTHS}
                  initialValue={month}
                  handleInputChange={handleInputChange}
                  className="h-[41px] w-full"
                />
              </div>

              <div className="min-w-0">
                <Einput
                  title="Date from"
                  name="dateFrom"
                  type="date"
                  value={dateFrom}
                  handleInputChange={handleInputChange}
                  className="h-[41px] w-full"
                />
              </div>

              <div className="min-w-0">
                <Einput
                  title="Date to"
                  name="dateTo"
                  type="date"
                  value={dateTo}
                  handleInputChange={handleInputChange}
                  className="h-[41px] w-full"
                />
              </div>
            </div>
          </section>

          {/* FILTERS + DOWNLOAD */}
          <div className="grid min-w-0 grid-cols-1 items-start gap-3 2xl:grid-cols-[minmax(0,1fr)_430px]">
            {/* REUSABLE FILTER SCOPE */}
            <section className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white dark:border-slate-700 dark:bg-slate-900">
              <FilterScope
                title="Filter scope"
                categories={filterScopeCategories}
                selected={selectedFilters}
                onChange={setSelectedFilters}
              />
            </section>

            {/* RIGHT SIDEBAR */}
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-1">
              {/* DOWNLOAD PANEL */}
              <section className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="flex min-h-[51px] items-center border-b border-[#e5ebf3] px-4 py-3 dark:border-slate-700">
                  <h2 className="text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                    Download
                  </h2>
                </div>

                <div>
                  {REPORTS.map((reportName) => (
                    <div
                      key={reportName}
                      className="flex min-h-[54px] items-center justify-between gap-3 border-b border-[#e5ebf3] px-4 py-2.5 last:border-b-0 dark:border-slate-700"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[12px] font-medium text-[#152b4b] dark:text-slate-200">
                          {reportName}
                        </span>
                      </div>

                      <AButton
                        type="button"
                        disabled={loading}
                        onClick={() => handleDownload(reportName)}
                        className="inline-flex h-[31px] shrink-0 items-center justify-center gap-1 rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400"
                      >
                        <Download size={13} />
                        Excel
                      </AButton>
                    </div>
                  ))}
                </div>
              </section>

              {/* EMPLOYEE SEARCH WITH AUTOCOMPLETE */}
              <section className="relative z-20 min-w-0 rounded-xl border border-[#dce5f1] bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-3 text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                  Search by employee
                </h2>

                <div className="relative flex min-w-0 items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input
                      type="text"
                      value={employeeSearch}
                      autoComplete="off"
                      onFocus={() => {
                        if (employeeSearch.trim()) {
                          setShowEmployeeSuggestions(true);
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value;

                        setEmployeeSearch(value);
                        setEmployeeCode("");
                        setEmployeeName("N/A");
                        setShowEmployeeSuggestions(!!value.trim());
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();

                          if (filteredEmployeeOptions.length > 0) {
                            selectEmployee(filteredEmployeeOptions[0]);
                          } else {
                            handleEmployeeSearch();
                          }
                        }

                        if (e.key === "Escape") {
                          setShowEmployeeSuggestions(false);
                        }
                      }}
                      placeholder="Search employee code or name"
                      className="h-[40px] w-full rounded-lg border border-[#dce5f1] bg-white px-3 text-[12px] text-[#152b4b] outline-none placeholder:text-[#94a3b8] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/10"
                    />

                    {/* AUTOCOMPLETE SUGGESTIONS */}
                    {showEmployeeSuggestions && employeeSearch.trim() && (
                      <div className="absolute left-0 top-[44px] z-50 max-h-[260px] w-full overflow-y-auto rounded-lg border border-[#dce5f1] bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        {filteredEmployeeOptions.length > 0 ? (
                          <>
                            <div className="border-b border-[#e5ebf3] px-3 py-2 dark:border-slate-700">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Employee suggestions (
                                {filteredEmployeeOptions.length})
                              </p>
                            </div>

                            {filteredEmployeeOptions.map((employee) => (
                              <button
                                key={employee.value}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectEmployee(employee)}
                                className="flex w-full items-center justify-between gap-3 border-b border-[#f1f5f9] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                    <Users size={14} />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                                      {employee.label}
                                    </p>

                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                      Code: {employee.value}
                                    </p>
                                  </div>
                                </div>

                                <Search
                                  size={13}
                                  className="shrink-0 text-slate-400"
                                />
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="px-3 py-5 text-center">
                            <Search
                              size={20}
                              className="mx-auto mb-2 text-slate-300"
                            />

                            <p className="text-[12px] font-medium text-slate-500">
                              No employee found
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Try another employee code or name
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeSearch("");
                        setEmployeeCode("");
                        setEmployeeName("N/A");
                        setShowEmployeeSuggestions(false);
                      }}
                      className="flex h-[34px] w-[30px] shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Clear employee"
                    >
                      <X size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      handleEmployeeSearch();
                      setShowEmployeeSuggestions(false);
                    }}
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"
                    title="Search employee"
                  >
                    <Search size={16} />
                  </button>
                </div>

                <div className="mt-3 flex min-w-0 items-center gap-1.5 text-[12px] text-[#64748b] dark:text-slate-400">
                  <Users size={14} className="shrink-0" />

                  <span>Employee:</span>

                  <span className="truncate font-semibold text-[#152b4b] dark:text-slate-200">
                    {employeeName}
                  </span>

                  {employeeCode && (
                    <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {employeeCode}
                    </span>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
