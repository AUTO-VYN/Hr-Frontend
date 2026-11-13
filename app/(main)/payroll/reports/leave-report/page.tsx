"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Search,
  X,
  Users,
  MapPin,
  Building2,
  Layers3,
  BriefcaseBusiness,
  UserRound,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";

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
  icon: React.ElementType;
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
  {
    id: "regions",
    label: "Regions",
    icon: MapPin,
    options: [],
  },
  {
    id: "channel",
    label: "Channel",
    icon: Layers3,
    options: [],
  },
  {
    id: "cluster",
    label: "Cluster",
    icon: Building2,
    options: [],
  },
  {
    id: "locations",
    label: "Locations",
    icon: MapPin,
    options: [],
  },
  {
    id: "sections",
    label: "Sections",
    icon: Layers3,
    options: [],
  },
  {
    id: "department",
    label: "Department",
    icon: BriefcaseBusiness,
    options: [],
  },
  {
    id: "designation",
    label: "Designation",
    icon: UserRound,
    options: [],
  },
];

const REPORTS = ["Comp-off balance report", "Leave transaction details"];

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

  // Some master responses return Location as an array containing
  // another array. Flatten that structure without changing the API.
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

  // Already in YYYY-MM-DD format.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // DD/MM/YYYY format returned by MiscDate.
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
      return parsed?.message || parsed?.Message || "Unable to process request.";
    } catch {
      return "Unable to process request.";
    }
  }

  return (
    data?.message || data?.Message || error?.message || "Something went wrong."
  );
};

export default function LeaveReportsPage() {
  const user = useCurrentUser();

  const [year, setYear] = useState(INITIAL_DATES.year);
  const [month, setMonth] = useState(INITIAL_DATES.month);
  const [dateFrom, setDateFrom] = useState(INITIAL_DATES.dateFrom);
  const [dateTo, setDateTo] = useState(INITIAL_DATES.dateTo);

  const [activeReport, setActiveReport] = useState("Leave Reports");
  const [activeCategory, setActiveCategory] = useState("regions");

  const [filterSearch, setFilterSearch] = useState("");

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeName, setEmployeeName] = useState("N/A");
  const [employeeCode, setEmployeeCode] = useState("");

  const [loading, setLoading] = useState(false);

  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>(
    createEmptyCategories,
  );

  const [employeeOptions, setEmployeeOptions] = useState<Option[]>([]);

  const activeFilter = useMemo(
    () =>
      filterCategories.find((item) => item.id === activeCategory) ||
      filterCategories[0],
    [activeCategory, filterCategories],
  );

  const activeSelections = selectedFilters[activeCategory] || [];

  const totalSelected = useMemo(
    () =>
      Object.values(selectedFilters).reduce(
        (total, values) => total + values.length,
        0,
      ),
    [selectedFilters],
  );

  const filteredOptions = useMemo(() => {
    if (!activeFilter) return [];

    const search = filterSearch.trim().toLowerCase();

    return activeFilter.options.filter((item) =>
      item.label.toLowerCase().includes(search),
    );
  }, [activeFilter, filterSearch]);

  const handleInputChange = (name: string, value: any) => {
    if (name === "year") setYear(String(value ?? ""));
    if (name === "month") setMonth(String(value ?? ""));
    if (name === "dateFrom") setDateFrom(String(value ?? ""));
    if (name === "dateTo") setDateTo(String(value ?? ""));
  };

  const toggleFilter = (id: string) => {
    setSelectedFilters((prev) => {
      const current = prev[activeCategory] || [];

      return {
        ...prev,
        [activeCategory]: current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      };
    });
  };

  const selectAll = () => {
    if (!activeFilter) return;

    setSelectedFilters((prev) => ({
      ...prev,
      [activeCategory]: activeFilter.options.map((item) => item.id),
    }));
  };

  const clearAll = () => {
    setSelectedFilters({});
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
            icon: MapPin,
            options: regions,
          },
          {
            id: "channel",
            label: "Channel",
            icon: Layers3,
            options: channels,
          },
          {
            id: "cluster",
            label: "Cluster",
            icon: Building2,
            options: clusters,
          },
          {
            id: "locations",
            label: "Locations",
            icon: MapPin,
            options: locations,
          },
          {
            id: "sections",
            label: "Sections",
            icon: Layers3,
            options: sections,
          },
          {
            id: "department",
            label: "Department",
            icon: BriefcaseBusiness,
            options: departments,
          },
          {
            id: "designation",
            label: "Designation",
            icon: UserRound,
            options: designations,
          },
        ]);

        // Apply the payroll date range supplied by the master API.
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

  // Load employees using the same employee master API as the existing reports.
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

    setEmployeeCode(partialMatch.value);
    setEmployeeSearch(partialMatch.value);
    setEmployeeName(partialMatch.label);

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Employee selected",
      text: partialMatch.label,
      showConfirmButton: false,
      timer: 1800,
    });
  };

  const buildReportPayload = () => {
    const selectedLocations = selectedFilters.locations || [];

    return {
      dateFrom,
      dateto: dateTo,

      region: selectedFilters.regions?.length ? selectedFilters.regions : "",

      channel: selectedFilters.channel?.length ? selectedFilters.channel : "",

      Cluster: selectedFilters.cluster?.length ? selectedFilters.cluster : "",

      location: selectedLocations.length
        ? selectedLocations
        : user?.branch || "",

      user_location: selectedLocations.length,

      empcode: employeeCode || "",

      department: selectedFilters.department?.length
        ? selectedFilters.department
        : "",

      section: selectedFilters.sections?.length ? selectedFilters.sections : "",
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

      // Handle API errors that may be returned as JSON despite responseType blob.
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

      const disposition = response.headers?.["content-disposition"] || "";

      const filenameMatch = disposition.match(
        /filename\*?=(?:UTF-8''|")?([^";]+)/i,
      );

      const downloadedFileName = filenameMatch
        ? decodeURIComponent(filenameMatch[1].replace(/"/g, "").trim())
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
        {/* MAIN CONTENT */}
        <main className="w-full min-w-0 space-y-3">
          {/* PAGE HEADER */}
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[12px] text-[#64748b] dark:text-slate-400"></div>

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
            {/* FILTER SCOPE */}
            <section className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white dark:border-slate-700 dark:bg-slate-900">
              {/* FILTER HEADER */}
              <div className="flex min-h-[51px] flex-wrap items-center justify-between gap-2 border-b border-[#e5ebf3] px-4 py-3 dark:border-slate-700">
                <h2 className="text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                  Filter scope
                </h2>

                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#64748b] dark:text-slate-400">
                    {totalSelected} selected
                  </span>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="grid min-w-0 min-h-[365px] grid-cols-1 md:grid-cols-[235px_minmax(0,1fr)]">
                {/* FILTER CATEGORY LIST */}
                <div className="min-w-0 border-b border-[#e5ebf3] p-2 dark:border-slate-700 md:border-b-0 md:border-r">
                  {filterCategories.map((category) => {
                    const count = selectedFilters[category.id]?.length || 0;

                    return (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => {
                          setActiveCategory(category.id);
                          setFilterSearch("");
                        }}
                        className={`flex min-h-[37px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition ${
                          activeCategory === category.id
                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                            : "text-[#152b4b] hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="truncate text-[12px] font-semibold">
                          {category.label}
                        </span>

                        <span className="shrink-0 text-[11px] tabular-nums text-[#64748b] dark:text-slate-400">
                          {count}/{category.options.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* FILTER OPTIONS */}
                <div className="min-w-0 p-3">
                  <div className="mb-3 flex min-w-0 items-center gap-3">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                      />

                      <input
                        type="text"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        placeholder={`Search ${activeFilter.label.toLowerCase()}`}
                        className="h-[38px] w-full rounded-lg border border-[#dce5f1] bg-[#f8fafc] pl-9 pr-3 text-[12px] text-[#152b4b] outline-none transition placeholder:text-[#94a3b8] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/10"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={selectAll}
                      className="shrink-0 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                      Select all
                    </button>
                  </div>

                  {filteredOptions.length > 0 ? (
                    <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                      {filteredOptions.map((item) => {
                        const checked = activeSelections.includes(item.id);

                        return (
                          <label
                            key={item.id}
                            className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFilter(item.id)}
                              className="h-[16px] w-[16px] shrink-0 cursor-pointer rounded border-[#cbd5e1] accent-indigo-600"
                            />

                            <span className="truncate text-[12px] font-medium text-[#152b4b] dark:text-slate-200">
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
                      <Search size={23} className="text-slate-300" />

                      <p className="mt-2 text-[12px] text-slate-400">
                        No {activeFilter.label.toLowerCase()} found.
                      </p>
                    </div>
                  )}

                  {/* SELECTED FILTER CHIPS */}
                  {activeSelections.length > 0 && (
                    <div className="mt-5 border-t border-[#e5ebf3] pt-3 dark:border-slate-700">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#64748b] dark:text-slate-400">
                          Selected {activeFilter.label}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFilters((prev) => ({
                              ...prev,
                              [activeCategory]: [],
                            }))
                          }
                          className="text-[11px] font-semibold text-rose-500"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {activeFilter.options
                          .filter((item) => activeSelections.includes(item.id))
                          .map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex max-w-full items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                            >
                              <span className="truncate">{item.label}</span>

                              <button
                                type="button"
                                onClick={() => toggleFilter(item.id)}
                                className="shrink-0"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

              {/* EMPLOYEE SEARCH */}
              <section className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-3 text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                  Search by employee
                </h2>

                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setEmployeeCode("");
                        setEmployeeName("N/A");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEmployeeSearch();
                        }
                      }}
                      placeholder="Emp code or name"
                      className="h-[40px] w-full rounded-lg border border-[#dce5f1] bg-white px-3 text-[12px] text-[#152b4b] outline-none placeholder:text-[#94a3b8] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/10"
                    />
                  </div>

                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeSearch("");
                        setEmployeeCode("");
                        setEmployeeName("N/A");
                      }}
                      className="flex h-[34px] w-[30px] shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleEmployeeSearch}
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-700"
                    title="Search employee"
                  >
                    <Search size={16} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#64748b] dark:text-slate-400">
                  <Users size={14} />
                  Employee:
                  <span className="font-semibold text-[#152b4b] dark:text-slate-200">
                    {employeeName}
                  </span>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
