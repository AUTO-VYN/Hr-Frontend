"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Download, Search, MapPin } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const REGION_API = "/ars/getRegion";
const LOCATION_API = "/ars/getLocationByRegion";
const REPORT_API = "/hrmsreport/get_Attendance_Without_Salary_Data";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type LocationItem = {
  value: string;
  label: string;
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

const getApiError = (error: any): string =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to process request.";

const getRegionValue = (item: any): string =>
  getText(
    item?.value,
    item?.Region_Code,
    item?.RegionCode,
    item?.regionCode,
    item?.REGION_CODE,
    item?.Code,
    item?.code,
    item?.UTD,
  );

const getRegionLabel = (item: any): string =>
  getText(
    item?.label,
    item?.lable,
    item?.Region_Name,
    item?.RegionName,
    item?.Region,
    item?.region,
    item?.name,
  );

const getLocationValue = (item: any): string =>
  getText(
    item?.value,
    item?.Loc_Code,
    item?.Loc_code,
    item?.Location_Code,
    item?.locationCode,
    item?.code,
    item?.UTD,
  );

const getLocationLabel = (item: any): string =>
  getText(
    item?.label,
    item?.lable,
    item?.Location,
    item?.LocationName,
    item?.Loc_Name,
    item?.loc_name,
    item?.BranchName,
    item?.name,
  );

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function AttendanceWithoutSalaryReportPage() {
  const user = useCurrentUser();

  const currentDate = new Date();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [region, setRegion] = useState("ALL");
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [month, setMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, "0"),
  );

  const [regionOptionsData, setRegionOptionsData] = useState<SelectOption[]>(
    [],
  );

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchLocation, setSearchLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const yearOptions = useMemo<SelectOption[]>(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 8 }, (_, index) => {
      const value = String(currentYear - index);

      return {
        value,
        label: value,
      };
    });
  }, []);

  // --------------------------------------------------
  // MONTH OPTIONS
  // --------------------------------------------------

  const monthOptions: SelectOption[] = [
    { value: "01", label: "Jan" },
    { value: "02", label: "Feb" },
    { value: "03", label: "Mar" },
    { value: "04", label: "Apr" },
    { value: "05", label: "May" },
    { value: "06", label: "Jun" },
    { value: "07", label: "Jul" },
    { value: "08", label: "Aug" },
    { value: "09", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
  ];

  // --------------------------------------------------
  // SIDE ALERT
  // --------------------------------------------------

  const showSideAlert = (message: string, type: any) => {
    const Toast = Swal.mixin({
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
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  };

  // --------------------------------------------------
  // FETCH REGION DATA
  // --------------------------------------------------

  const fetchRegionData = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      setLoading(true);

      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}${REGION_API}`,
        {
          headers: apiHeaders,
        },
      );

      const rawRegions = Array.isArray(result?.data?.Region_Data)
        ? result.data.Region_Data
        : [];

      const mappedRegions: SelectOption[] = rawRegions
        .map((item: any) => ({
          value: getRegionValue(item),
          label: getRegionLabel(item),
        }))
        .filter((item: SelectOption) => item.value !== "" && item.label !== "");

      const uniqueRegions = Array.from(
        new Map(mappedRegions.map((item) => [item.value, item])).values(),
      );

      setRegionOptionsData(uniqueRegions);
    } catch (error: any) {
      console.error("Fetch Region Error:", error);
      setRegionOptionsData([]);

      showSideAlert(getApiError(error) || "Unable to fetch regions.", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.Comp_Code, apiHeaders]);

  useEffect(() => {
    fetchRegionData();
  }, [fetchRegionData]);

  // --------------------------------------------------
  // REGION OPTIONS
  // --------------------------------------------------

  const regionOptions = useMemo<SelectOption[]>(
    () => [{ value: "ALL", label: "All regions" }, ...regionOptionsData],
    [regionOptionsData],
  );

  // --------------------------------------------------
  // SELECTED REGION CODES
  // --------------------------------------------------

  const selectedRegionCodes = useMemo(() => {
    if (region === "ALL") {
      return regionOptionsData
        .map((item) => Number(item.value))
        .filter((value) => Number.isFinite(value));
    }

    return String(region)
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isFinite(value));
  }, [region, regionOptionsData]);

  // --------------------------------------------------
  // FETCH REGION-WISE LOCATIONS
  // --------------------------------------------------

  const RegionWiseLocation = useCallback(async () => {
    if (!user?.Comp_Code || !region || regionOptionsData.length === 0) {
      setLocations([]);
      setSelectedLocations([]);
      return;
    }

    if (selectedRegionCodes.length === 0) {
      setLocations([]);
      setSelectedLocations([]);
      return;
    }

    setLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${LOCATION_API}`,
        {
          regionCode: selectedRegionCodes,
        },
        {
          headers: apiHeaders,
        },
      );

      console.log("Region Wise Location Response:", result.data);

      const rawLocations = Array.isArray(result?.data?.Location_Data)
        ? result.data.Location_Data
        : [];

      const mappedLocations: LocationItem[] = rawLocations
        .map((item: any) => ({
          value: getLocationValue(item),
          label: getLocationLabel(item),
        }))
        .filter((item: LocationItem) => item.value !== "" && item.label !== "");

      const uniqueLocations = Array.from(
        new Map(mappedLocations.map((item) => [item.value, item])).values(),
      );

      setLocations(uniqueLocations);
      setSelectedLocations([]);
      setSearchLocation("");
    } catch (error: any) {
      console.error("Region Wise Location Error:", error);

      setLocations([]);
      setSelectedLocations([]);

      showSideAlert(
        getApiError(error) || "Unable to fetch locations.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [
    user?.Comp_Code,
    region,
    regionOptionsData.length,
    selectedRegionCodes,
    apiHeaders,
  ]);

  useEffect(() => {
    if (regionOptionsData.length > 0 && region) {
      RegionWiseLocation();
    }
  }, [regionOptionsData.length, region, RegionWiseLocation]);

  // --------------------------------------------------
  // FILTER LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const query = searchLocation.trim().toLowerCase();

    if (!query) return locations;

    return locations.filter(
      (location) =>
        location.label.toLowerCase().includes(query) ||
        location.value.toLowerCase().includes(query),
    );
  }, [locations, searchLocation]);

  // --------------------------------------------------
  // SELECT ALL / DESELECT ALL
  // --------------------------------------------------

  const allVisibleSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((location) =>
      selectedLocations.includes(location.value),
    );

  const toggleSelectAll = () => {
    const filteredIds = filteredLocations.map((location) => location.value);

    if (!filteredIds.length) return;

    if (allVisibleSelected) {
      setSelectedLocations((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      setSelectedLocations((prev) =>
        Array.from(new Set([...prev, ...filteredIds])),
      );
    }
  };

  // --------------------------------------------------
  // INDIVIDUAL LOCATION SELECTION
  // --------------------------------------------------

  const toggleLocation = (value: string) => {
    setSelectedLocations((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  // --------------------------------------------------
  // FILTER CHANGE HANDLERS
  // --------------------------------------------------

  const handleRegionChange = (name: string, value: any) => {
    const nextRegion = Array.isArray(value)
      ? value.map(String).join(",")
      : String(value || "");

    setRegion(nextRegion || "ALL");
    setLocations([]);
    setSelectedLocations([]);
    setSearchLocation("");
  };

  const handleYearChange = (name: string, value: any) => {
    setYear(String(value));
  };

  const handleMonthChange = (name: string, value: any) => {
    setMonth(String(value));
  };

  // --------------------------------------------------
  // DOWNLOAD REPORT
  // --------------------------------------------------

  const downloadReport = async () => {
    if (!region || !year || !month) {
      showSideAlert("Please select Region, Month, and Year.", "warning");
      return;
    }

    if (selectedRegionCodes.length === 0) {
      showSideAlert("No valid region selected.", "warning");
      return;
    }

    if (selectedLocations.length === 0) {
      showSideAlert("Please select at least one Location.", "warning");
      return;
    }

    setDownloading(true);

    try {
      const postData = {
        salyear: Number(year),
        SalMnth: Number(month),
        location: selectedLocations,
        Region: selectedRegionCodes,
      };

      console.log("Attendance Without Salary Payload:", postData);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${REPORT_API}`,
        postData,
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
            ...apiHeaders,
          },
        },
      );

      const contentType = response.headers?.["content-type"] || "";

      // Handle error responses returned as Blob.
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/plain")
      ) {
        const responseText = await response.data.text();

        let errorMessage = responseText;

        try {
          const parsed = JSON.parse(responseText);

          errorMessage =
            parsed?.message || parsed?.Message || parsed?.error || responseText;
        } catch {
          // Use original response text.
        }

        throw new Error(
          errorMessage || "Unable to download attendance report.",
        );
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute(
        "download",
        `Attendance_Without_Salary_Data${year}_${month}.xlsx`,
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      showSideAlert(
        "Attendance Without Salary Report downloaded successfully.",
        "success",
      );
    } catch (error: any) {
      console.error("Attendance Without Salary Download Error:", error);

      showSideAlert(
        getApiError(error) ||
          "Failed to download Attendance Without Salary Report.",
        "error",
      );
    } finally {
      setDownloading(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-2.5 transition-colors dark:bg-[#0b1220] sm:p-3 lg:p-4">
      <HashloaderComponent isLoading={loading || downloading} />

      <div className="mx-auto max-w-[1800px] space-y-3">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#64748b] dark:text-slate-400"></div>

            <h1 className="text-[18px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[20px]">
              Attendance Without Salary Report
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-lg border border-[#dce5f1] bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-3.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {/* REGION */}

            <div className="min-w-0">
              <Eselect
                key={`region-${region}-${regionOptions.length}`}
                title="Region"
                name="region"
                option={regionOptions}
                initialValue={region}
                handleInputChange={handleRegionChange}
                className="h-[36px] w-full rounded-lg text-[12px]"
              />
            </div>

            {/* YEAR */}

            <div className="min-w-0">
              <Eselect
                key={`year-${year}`}
                title="Year"
                name="year"
                option={yearOptions}
                initialValue={year}
                handleInputChange={handleYearChange}
                className="h-[36px] w-full rounded-lg text-[12px]"
              />
            </div>

            {/* MONTH */}

            <div className="min-w-0">
              <Eselect
                key={`month-${month}`}
                title="Month"
                name="month"
                option={monthOptions}
                initialValue={month}
                handleInputChange={handleMonthChange}
                className="h-[36px] w-full rounded-lg text-[12px]"
              />
            </div>
          </div>
        </div>

        {/* LOCATIONS CARD */}

        <div className="overflow-hidden rounded-lg border border-[#dce5f1] bg-white dark:border-slate-700 dark:bg-slate-900">
          {/* LOCATION HEADER */}

          <div className="flex flex-col gap-2 border-b border-[#e2e8f0] px-3 py-2.5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                Locations
              </h2>

              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                {locations.length}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-[11px] text-[#64748b] dark:text-slate-400">
                {selectedLocations.length} of {locations.length} selected
              </span>

              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={!filteredLocations.length}
                className="text-[11px] font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400"
              >
                {allVisibleSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>

          {/* LOCATION BODY */}

          <div className="p-3">
            {/* SEARCH LOCATION */}

            <div className="relative mb-3 max-w-full">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Search location..."
                className="h-[36px] w-full rounded-lg border border-[#dce5f1] bg-[#f8fafc] pl-8 pr-3 text-[12px] text-[#152b4b] outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
              />
            </div>

            {/* LOCATION CHECKBOXES */}

            {filteredLocations.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredLocations.map((item) => {
                  const checked = selectedLocations.includes(item.value);

                  return (
                    <label
                      key={item.value}
                      className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[12px] text-[#152b4b] transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLocation(item.value)}
                        className="h-[15px] w-[15px] shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                      />

                      <span className="min-w-0 truncate font-medium">
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[65px] flex-col items-center justify-center text-center">
                <MapPin size={17} className="text-slate-400" />

                <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {loading
                    ? "Loading locations..."
                    : locations.length
                      ? "No locations found for this search."
                      : "No locations available."}
                </p>
              </div>
            )}
          </div>

          {/* FOOTER */}

          <div className="flex flex-col items-stretch justify-between gap-2 border-t border-[#e2e8f0] px-3 py-2.5 dark:border-slate-700 sm:flex-row sm:items-center">
            <p className="text-[11px] text-[#64748b] dark:text-slate-400">
              {selectedLocations.length > 0
                ? `${selectedLocations.length} location(s) selected`
                : "Select locations to download the report"}
            </p>

            <div className="flex justify-end">
              <AButton
                type="button"
                onClick={downloadReport}
                disabled={
                  loading || downloading || selectedLocations.length === 0
                }
                className="inline-flex h-[37px] w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Download size={14} />
                Download report
              </AButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
