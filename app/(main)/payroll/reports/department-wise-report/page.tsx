"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, Download, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const REGION_API = "/ars/getRegion";
const DEPARTMENT_API = "/hrmsreport/getdepartMent";
const LOCATION_API = "/ars/getLocationByRegion";
const DEPARTMENT_REPORT_API = "/hrmsreport/GetDepWiseReport";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type LocationOption = {
  value: string;
  label: string;
  raw?: any;
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

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.Data)) return value.Data;
  if (Array.isArray(value?.Result)) return value.Result;

  return [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Something went wrong.";

const showSideAlert = (message: string, type: any = "info") => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    customClass: {
      container: "side-alert-container",
      popup: `side-alert-${type}`,
      title: "side-alert-title",
      icon: "side-alert-icon",
    },
  }).fire({
    icon: type,
    title: message,
  });
};

const mapOptions = (
  data: any[],
  valueKeys: string[],
  labelKeys: string[],
): SelectOption[] => {
  const mapped = data
    .map((item: any) => {
      const value = getText(...valueKeys.map((key) => item?.[key]));

      const label = getText(...labelKeys.map((key) => item?.[key]));

      if (!value) return null;

      return {
        value,
        label: label || value,
      };
    })
    .filter(Boolean) as SelectOption[];

  return Array.from(new Map(mapped.map((item) => [item.value, item])).values());
};

const getNumberArray = (value: string | string[]): number[] => {
  const values = Array.isArray(value)
    ? value
    : value?.trim()
      ? value.split(",")
      : [];

  return values
    .map((item) => Number(String(item).trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
};

// --------------------------------------------------
// MONTH OPTIONS
// --------------------------------------------------

const MONTH_OPTIONS: SelectOption[] = [
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

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function DepartmentWiseReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<SelectOption[]>(
    [],
  );
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const currentDate = new Date();

  const [region, setRegion] = useState("");
  const [department, setDepartment] = useState<string[]>([]);

  const [year, setYear] = useState(String(currentDate.getFullYear()));

  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);

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
  // YEAR OPTIONS
  // --------------------------------------------------

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 6 }, (_, index) => {
      const value = String(currentYear - index);

      return {
        value,
        label: value,
      };
    });
  }, []);

  // --------------------------------------------------
  // FETCH REGION MASTER
  // --------------------------------------------------

  const fetchRegions = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}${REGION_API}`,
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      console.log("Region Master Response:", responseData);

      if (responseData?.Status === false || responseData?.status === false) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to load regions.",
        );
      }

      const regionData = getArray(
        responseData?.Region_Data ||
          responseData?.data?.Region_Data ||
          responseData?.Region ||
          responseData?.data?.Region,
      );

      const options = mapOptions(
        regionData,
        [
          "value",
          "Value",
          "REGION",
          "Region",
          "Region_Code",
          "Sal_Region",
          "REG_CODE",
          "id",
          "ID",
        ],
        [
          "label",
          "Label",
          "REGION_NAME",
          "Region_Name",
          "RegionName",
          "REG_NAME",
          "name",
          "Name",
        ],
      );

      setRegionOptions(options);
    } catch (error: any) {
      console.error("Region Master Error:", error);

      setRegionOptions([]);

      showSideAlert(getApiError(error) || "Unable to load regions.", "error");
    }
  }, [user?.Comp_Code, apiHeaders]);

  // --------------------------------------------------
  // FETCH DEPARTMENT MASTER
  // --------------------------------------------------

  const fetchDepartments = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${DEPARTMENT_API}`,
        {},
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      console.log("Department Master Response:", responseData);

      if (responseData?.Status === false || responseData?.status === false) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to load departments.",
        );
      }

      const departmentData = getArray(
        responseData?.Result ||
          responseData?.data?.Result ||
          responseData?.Department ||
          responseData?.data?.Department,
      );

      const options = mapOptions(
        departmentData,
        [
          "value",
          "Value",
          "DIVISION",
          "Division",
          "DIV_CODE",
          "DEPARTMENT",
          "Department",
          "Dept_Code",
          "DEPT_CODE",
          "id",
          "ID",
        ],
        [
          "label",
          "Label",
          "DIV_NAME",
          "Division_Name",
          "DivisionName",
          "DEPARTMENT_NAME",
          "DepartmentName",
          "Dept_Name",
          "DEPT_NAME",
          "name",
          "Name",
        ],
      );

      setDepartmentOptions(options);
    } catch (error: any) {
      console.error("Department Master Error:", error);

      setDepartmentOptions([]);

      showSideAlert(
        getApiError(error) || "Unable to load departments.",
        "error",
      );
    }
  }, [user?.Comp_Code, apiHeaders]);

  // --------------------------------------------------
  // FETCH REGION-WISE LOCATIONS
  // --------------------------------------------------

  const fetchLocations = useCallback(async () => {
    if (!user?.Comp_Code) return;

    const regionCode = getNumberArray(region);

    // IMPORTANT:
    // Do not call API with regionCode: [].
    // Backend generates SQL IN (), which causes HTTP 500.
    if (!regionCode.length) {
      setLocations([]);
      setSelectedLocations([]);
      setMasterLoading(false);
      return;
    }

    setMasterLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${LOCATION_API}`,
        {
          regionCode,
        },
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      console.log("Region Wise Location Response:", responseData);

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to load locations.",
        );
      }

      const locationData = getArray(
        responseData?.Location_Data ||
          responseData?.data?.Location_Data ||
          responseData?.Location ||
          responseData?.data?.Location,
      );

      const mappedLocations: LocationOption[] = locationData
        .map((item: any) => {
          const value = getText(
            item?.value,
            item?.Value,
            item?.LOC_CODE,
            item?.LOCATION_CODE,
            item?.Loc_Code,
            item?.Location_Code,
            item?.LocCode,
            item?.id,
            item?.ID,
          );

          const label = getText(
            item?.lable,
            item?.label,
            item?.Label,
            item?.LOC_NAME,
            item?.LOCATION_NAME,
            item?.Loc_Name,
            item?.Location_Name,
            item?.LocationName,
            item?.name,
            item?.Name,
          );

          if (!value) return null;

          return {
            value,
            label: label || value,
            raw: item,
          };
        })
        .filter(Boolean) as LocationOption[];

      const uniqueLocations = Array.from(
        new Map(mappedLocations.map((item) => [item.value, item])).values(),
      );

      setLocations(uniqueLocations);

      // Remove previously selected locations that are no longer available.
      setSelectedLocations((previous) =>
        previous.filter((value) =>
          uniqueLocations.some((item) => item.value === value),
        ),
      );

      if (!uniqueLocations.length) {
        showSideAlert("No locations found for this region.", "info");
      }
    } catch (error: any) {
      console.error("Location API Error:", error);

      setLocations([]);
      setSelectedLocations([]);

      showSideAlert(getApiError(error) || "Unable to load locations.", "error");
    } finally {
      setMasterLoading(false);
    }
  }, [user?.Comp_Code, region, apiHeaders]);

  // --------------------------------------------------
  // INITIAL MASTER API CALLS
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) return;

    fetchRegions();
    fetchDepartments();
  }, [user?.Comp_Code, fetchRegions, fetchDepartments]);

  // --------------------------------------------------
  // REGION CHANGE - FETCH LOCATIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) return;

    // Clear old region's selections immediately.
    setSelectedLocations([]);
    setLocationSearch("");

    fetchLocations();
  }, [user?.Comp_Code, region, fetchLocations]);

  // --------------------------------------------------
  // FILTERED LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();

    return locations.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.value.toLowerCase().includes(query),
    );
  }, [locations, locationSearch]);

  // --------------------------------------------------
  // SELECT ALL
  // --------------------------------------------------

  const allFilteredSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((item) => selectedLocations.includes(item.value));

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      const visibleValues = new Set(
        filteredLocations.map((item) => item.value),
      );

      setSelectedLocations((previous) =>
        previous.filter((value) => !visibleValues.has(value)),
      );
    } else {
      setSelectedLocations((previous) =>
        Array.from(
          new Set([
            ...previous,
            ...filteredLocations.map((item) => item.value),
          ]),
        ),
      );
    }
  };

  // --------------------------------------------------
  // INDIVIDUAL LOCATION SELECTION
  // --------------------------------------------------

  const handleLocationChange = (value: string) => {
    setSelectedLocations((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  // --------------------------------------------------
  // DOWNLOAD DEPARTMENT WISE REPORT
  // --------------------------------------------------

  const downloadReport = async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "error",
      );
      return;
    }

    if (!year || !month) {
      showSideAlert("Please select year and month.", "warning");
      return;
    }

    if (!selectedLocations.length) {
      showSideAlert("Please select at least one location.", "warning");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        salyear: Number(year),
        SalMnth: Number(month),

        // Selected location codes
        location: selectedLocations,

        // Empty array means all regions
        Region: getNumberArray(region),

        // Empty array means all departments
        DepartMent: getNumberArray(department),
      };

      console.log("Department Wise Report Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${DEPARTMENT_REPORT_API}`,
        payload,
        {
          responseType: "blob",
          headers: {
            ...apiHeaders,
            "Content-Type": "application/json",
          },
        },
      );

      const responseBlob = response.data;

      if (!responseBlob || responseBlob.size === 0) {
        showSideAlert("No data available for the selected filters.", "warning");
        return;
      }

      // --------------------------------------------------
      // HANDLE API ERROR RETURNED AS BLOB
      // --------------------------------------------------

      const contentType = response.headers?.["content-type"] || "";

      if (
        contentType.includes("application/json") ||
        contentType.includes("text/")
      ) {
        const text = await responseBlob.text();

        let message = "Unable to download report.";

        try {
          const parsed = JSON.parse(text);

          message =
            parsed?.message || parsed?.Message || parsed?.error || message;
        } catch {
          if (text) message = text;
        }

        throw new Error(message);
      }

      // --------------------------------------------------
      // DOWNLOAD EXCEL
      // --------------------------------------------------

      const blob = new Blob([responseBlob], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `Department_Wise_Report_${year}_${String(month).padStart(2, "0")}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showSideAlert(
        "Department Wise Report downloaded successfully.",
        "success",
      );
    } catch (error: any) {
      console.error("Department Wise Download Error:", error);

      Swal.fire({
        icon: "error",
        title: "Download failed",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto w-full max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Department Wise Report
          </h1>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* REGION */}
            <div className="flex min-w-0 flex-col">
              <div className="min-h-[20px]">
                <Eselect
                  title="Region"
                  name="region"
                  option={[
                    { value: "", label: "All regions" },
                    ...regionOptions,
                  ]}
                  initialValue={region}
                  handleInputChange={(name: string, value: any) => {
                    setRegion(String(value || ""));
                  }}
                  className="h-[42px] w-full"
                />
              </div>
            </div>

            {/* DEPARTMENT */}
            <div className="flex min-w-0 flex-col">
              <div className="min-h-[20px]">
                <Eselect
                  title="Department"
                  name="department"
                  option={departmentOptions}
                  initialValue={department}
                  isMulti={true}
                  handleInputChange={(name: string, value: any) => {
                    setDepartment(
                      Array.isArray(value)
                        ? value.map((item: any) => String(item))
                        : value
                          ? [String(value)]
                          : [],
                    );
                  }}
                  className="w-full h-[42px]"
                  checkbox
                />
              </div>
            </div>

            {/* YEAR */}
            <div className="flex min-w-0 flex-col">
              <div className="min-h-[20px]">
                <Eselect
                  title="Year"
                  name="year"
                  option={yearOptions}
                  initialValue={year}
                  handleInputChange={(name: string, value: any) => {
                    setYear(String(value || ""));
                  }}
                  className="h-[42px] w-full"
                />
              </div>
            </div>

            {/* MONTH */}
            <div className="flex min-w-0 flex-col">
              <div className="min-h-[20px]">
                <Eselect
                  title="Month"
                  name="month"
                  option={MONTH_OPTIONS}
                  initialValue={month}
                  handleInputChange={(name: string, value: any) => {
                    setMonth(String(value || ""));
                  }}
                  className="h-[42px] w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* LOCATIONS CARD */}

        <div className="overflow-hidden rounded-2xl border border-[#dce5f1] bg-white dark:border-slate-700 dark:bg-slate-900">
          {/* LOCATION HEADER */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf5] px-4 py-4 dark:border-slate-700 sm:px-5">
            <h2 className="text-[16px] font-bold text-[#152b4b] dark:text-slate-100">
              Locations
            </h2>

            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-[#64748b] dark:text-slate-400">
                {selectedLocations.length} of {locations.length} selected
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                disabled={!filteredLocations.length}
                className="font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-400"
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>

          {/* LOCATION SEARCH */}

          <div className="p-4 sm:px-5">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                placeholder="Search location"
                className="h-[43px] w-full rounded-xl border border-[#dce5f1] bg-[#f8fafc] pl-10 pr-10 text-[13px] text-[#152b4b] outline-none transition placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />

              {locationSearch && (
                <button
                  type="button"
                  onClick={() => setLocationSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* LOCATION CHECKBOXES */}

          <div className="border-b border-[#e8edf5] px-4 pb-4 dark:border-slate-700 sm:px-5">
            {filteredLocations.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                {filteredLocations.map((item) => {
                  const checked = selectedLocations.includes(item.value);

                  return (
                    <label
                      key={item.value}
                      className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg py-1 text-[14px] text-[#152b4b] dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleLocationChange(item.value)}
                        className="h-[17px] w-[17px] shrink-0 cursor-pointer accent-indigo-600"
                      />

                      <span className="truncate">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
                {locations.length
                  ? "No matching locations found."
                  : region
                    ? "No locations available for this region."
                    : "Select a region to load locations."}
              </div>
            )}
          </div>

          {/* DOWNLOAD FOOTER */}

          <div className="flex justify-end p-4 sm:px-5">
            <AButton
              type="button"
              onClick={downloadReport}
              disabled={loading || masterLoading || !selectedLocations.length}
              className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Download size={17} />
              Download report
            </AButton>
          </div>
        </div>
      </div>
    </div>
  );
}
