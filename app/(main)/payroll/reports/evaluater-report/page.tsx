"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, Download } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";

const REGION_API = "/ars/getRegion";
const LOCATION_API = "/ars/getLocationByRegion";
const REPORT_API = "/hrmsreport/getEvaluaterSummary";

type RegionOption = {
  value: string;
  label: string;
};

type LocationOption = {
  value: string;
  label: string;
};

const EvaluatorReportPage = () => {
  const user = useCurrentUser();

  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  const [regionLoading, setRegionLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
const [hasSelectedRegion, setHasSelectedRegion] = useState(false);
  // --------------------------------------------------
  // SIDE ALERT
  // --------------------------------------------------

  const showAlert = useCallback(
    (message: string, icon: "success" | "error" | "warning" | "info") => {
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 9000,
        timerProgressBar: true,
        customClass: {
          container: "side-alert-container",
          popup: `side-alert-${icon}`,
          title: "side-alert-title",
          icon: "side-alert-icon",
        },
      });

      Toast.fire({
        icon,
        title: message,
      });
    },
    [],
  );

  // --------------------------------------------------
  // API HEADERS
  // --------------------------------------------------

  const requestHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code || "",
      name: user?.name || "",
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // FETCH REGION
  // --------------------------------------------------

  const fetchRegions = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      setRegionLoading(true);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}${REGION_API}`,
        {
          headers: requestHeaders,
        },
      );

      const rows = response.data?.Region_Data || [];

      const formatted: RegionOption[] = rows
        .map((item: any) => ({
          value: String(
            item.value ??
              item.Value ??
              item.Region_Code ??
              item.Region_Code1 ??
              item.RegionCode ??
              item.Code ??
              item.code ??
              "",
          ),
          label: String(
            item.label ??
              item.lable ??
              item.Label ??
              item.Region_Name ??
              item.RegionName ??
              item.Name ??
              item.name ??
              "",
          ),
        }))
        .filter((item: RegionOption) => item.value && item.label);

      setRegions(formatted);
    } catch (error) {
      console.error("Region API Error:", error);
      showAlert("Unable to load regions.", "error");
    } finally {
      setRegionLoading(false);
    }
  }, [user?.Comp_Code, requestHeaders, showAlert]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // --------------------------------------------------
  // GET REGION CODES
  // --------------------------------------------------

  const getRegionCodes = useCallback(
    (regionCode: string) => {
      // Empty region means All regions.
      const sourceCodes = regionCode
        ? regionCode.split(",")
        : regions.map((item) => item.value);

      return [
        ...new Set(
          sourceCodes
            .map((item) => Number(item.trim()))
            .filter((item) => Number.isFinite(item) && item > 0),
        ),
      ];
    },
    [regions],
  );

  // --------------------------------------------------
  // FETCH LOCATION BY REGION
  // --------------------------------------------------

  const fetchLocations = useCallback(
    async (regionCode: string) => {
      if (!user?.Comp_Code || !regions.length) return;

      const regionCodes = getRegionCodes(regionCode);

      if (!regionCodes.length) {
        setLocations([]);
        setSelectedLocations([]);
        return;
      }

      try {
        setLocationLoading(true);
        setLocations([]);
        setSelectedLocations([]);
        setSearchLocation("");

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}${LOCATION_API}`,
          {
            regionCode: regionCodes,
          },
          {
            headers: {
              ...requestHeaders,
              "Content-Type": "application/json",
            },
          },
        );

        const rows = response.data?.Location_Data || [];

        const formatted: LocationOption[] = rows
          .map((item: any) => ({
            value: String(
              item.value ??
                item.Value ??
                item.Loc_Code ??
                item.Loc_code ??
                item.Location_Code ??
                item.LocationCode ??
                item.Code ??
                item.code ??
                "",
            ),
            label: String(
              item.lable ??
                item.label ??
                item.Label ??
                item.Loc_Name ??
                item.Loc_Name1 ??
                item.Location_Name ??
                item.LocationName ??
                item.Name ??
                item.name ??
                "",
            ),
          }))
          .filter((item: LocationOption) => item.value && item.label);

        setLocations(formatted);
      } catch (error) {
        console.error("Location API Error:", error);
        showAlert("Unable to load locations.", "error");
      } finally {
        setLocationLoading(false);
      }
    },
    [user?.Comp_Code, regions, getRegionCodes, requestHeaders, showAlert],
  );

  // --------------------------------------------------
  // LOCATION EFFECT
  // --------------------------------------------------

useEffect(() => {
  // Initial page load par location API call nahi hogi.
  if (!hasSelectedRegion || !user?.Comp_Code || !regions.length) {
    return;
  }

  fetchLocations(selectedRegion);
}, [
  hasSelectedRegion,
  user?.Comp_Code,
  selectedRegion,
  regions.length,
  fetchLocations,
]);

  // --------------------------------------------------
  // FILTER LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const search = searchLocation.trim().toLowerCase();

    if (!search) return locations;

    return locations.filter((location) =>
      location.label.toLowerCase().includes(search),
    );
  }, [locations, searchLocation]);

  const allFilteredSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((location) =>
      selectedLocations.includes(location.value),
    );

  // --------------------------------------------------
  // CHECKBOX
  // --------------------------------------------------

  const toggleLocation = (value: string) => {
    setSelectedLocations((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  // --------------------------------------------------
  // SELECT ALL / DESELECT ALL
  // --------------------------------------------------

  const toggleSelectAll = () => {
    const filteredIds = filteredLocations.map((location) => location.value);

    if (!filteredIds.length) return;

    if (allFilteredSelected) {
      setSelectedLocations((previous) =>
        previous.filter((value) => !filteredIds.includes(value)),
      );
    } else {
      setSelectedLocations((previous) => [
        ...new Set([...previous, ...filteredIds]),
      ]);
    }
  };

  // --------------------------------------------------
  // REGION CHANGE
  // Eselect CALLBACK: (name, value)
  // --------------------------------------------------

const handleRegionChange = (_name: string, value: any) => {
  const regionValue =
    typeof value === "string"
      ? value
      : (value?.target?.value ?? "");

  setSelectedRegion(String(regionValue));
  setHasSelectedRegion(true);
};

  // --------------------------------------------------
  // DOWNLOAD EVALUATOR REPORT
  // --------------------------------------------------

  const downloadReport = async () => {
    if (!user?.Comp_Code) {
      showAlert("User information missing. Please login again.", "error");
      return;
    }

    if (!regions.length) {
      showAlert("Region data is not available.", "warning");
      return;
    }

    if (selectedLocations.length === 0) {
      showAlert("Please select at least one location.", "warning");
      return;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      showAlert("Date From cannot be greater than Date To.", "warning");
      return;
    }

    try {
      setDownloadLoading(true);

      const regionCodes = getRegionCodes(selectedRegion);

      if (!regionCodes.length) {
        showAlert("Please select a valid region.", "warning");
        return;
      }

      const payload = {
        location: selectedLocations,
        Region: regionCodes,
        Designation: "EVALUATER",
        DATE_FROM: dateFrom,
        DATE_TO: dateTo,
      };

      console.log("Evaluator Report Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${REPORT_API}`,
        payload,
        {
          responseType: "blob",
          headers: {
            ...requestHeaders,
            "Content-Type": "application/json",
          },
        },
      );

      const contentType = response.headers["content-type"] || "";

      if (
        contentType.includes("application/json") ||
        contentType.includes("text/plain")
      ) {
        const errorText = await response.data.text();

        let errorMessage = "No data available for selected filters.";

        try {
          const parsed = JSON.parse(errorText);
          errorMessage = parsed.Message || parsed.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        showAlert(errorMessage, "warning");
        return;
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (!blob.size) {
        showAlert("No data available for the selected filters.", "warning");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `Evaluater_Report_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showAlert("Evaluator Report downloaded successfully.", "success");
    } catch (error: any) {
      console.error("Evaluator Report Download Error:", error);

      let errorMessage =
        error?.response?.data?.Message ||
        error?.response?.data?.message ||
        "Failed to download Evaluator Report.";

      if (error?.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();

          const parsed = JSON.parse(errorText);

          errorMessage = parsed.Message || parsed.message || errorMessage;
        } catch {
          // Keep fallback message.
        }
      }

      showAlert(errorMessage, "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

//  const resetFilters = () => {
//   setSelectedRegion("");
//   setHasSelectedRegion(false);

//   setDateFrom("");
//   setDateTo("");

//   setLocations([]);
//   setSelectedLocations([]);
//   setSearchLocation("");
// };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-4 text-[#172b4d] transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* HEADER */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold text-[#172b4d] dark:text-slate-100">
            Evaluator Report
          </h1>
        </div>

        {/* FILTERS */}
        <div className="mb-4 rounded-2xl border border-[#dce5f0] bg-white p-4 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* REGION */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100">
              <Eselect
                name="region"
                title="Region"
                option={[{ value: "", label: "All regions" }, ...regions]}
                initialValue={selectedRegion}
                handleInputChange={handleRegionChange}
                className="h-[40px] w-full"
              />

              {regionLoading && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Loading regions...
                </p>
              )}
            </div>

            {/* DATE FROM */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100 dark:[&_input]:color-scheme-dark">
              <Einput
                name="dateFrom"
                type="date"
                title="Date From"
                value={dateFrom}
                handleInputChange={(_name: string, value: any) =>
                  setDateFrom(
                    typeof value === "string"
                      ? value
                      : (value?.target?.value ?? ""),
                  )
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100 dark:[&_input]:color-scheme-dark">
              <Einput
                name="dateTo"
                type="date"
                title="Date To"
                value={dateTo}
                handleInputChange={(_name: string, value: any) =>
                  setDateTo(
                    typeof value === "string"
                      ? value
                      : (value?.target?.value ?? ""),
                  )
                }
                className="h-[40px] w-full"
              />
            </div>
          </div>
        </div>

        {/* LOCATIONS */}
        <div className="overflow-hidden rounded-2xl border border-[#dce5f0] bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
          {/* LOCATION HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3eaf3] px-4 py-4 dark:border-slate-700 sm:px-5">
            <h2 className="text-base font-bold text-[#172b4d] dark:text-slate-100">
              Locations
            </h2>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#61748f] dark:text-slate-400">
                {selectedLocations.length} of {locations.length} selected
              </span>

              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={!filteredLocations.length || locationLoading}
                className="font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>

          <div className="p-4 sm:px-5">
            {/* SEARCH */}
            <div className="relative mb-4">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />

              <input
                type="text"
                value={searchLocation}
                onChange={(event) => setSearchLocation(event.target.value)}
                placeholder="Search location"
                className="h-[43px] w-full rounded-xl border border-[#dce5f0] bg-[#f8fafc] pl-10 pr-4 text-sm text-[#172b4d] outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-800 dark:focus:ring-indigo-900/40"
              />
            </div>

            {/* LOCATION LIST */}
            {locationLoading ? (
              <div className="flex min-h-[70px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Loading locations...
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="flex min-h-[70px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No locations found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                {filteredLocations.map((location) => {
                  const checked = selectedLocations.includes(location.value);

                  return (
                    <label
                      key={location.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg py-1 text-sm text-[#172b4d] transition hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-400"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLocation(location.value)}
                        className="h-[17px] w-[17px] cursor-pointer rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
                      />

                      <span className="select-none">{location.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-[#e3eaf3] px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:px-5">
            <AButton
              type="button"
              onClick={downloadReport}
              disabled={
                downloadLoading ||
                locationLoading ||
                selectedLocations.length === 0
              }
              className="inline-flex h-[40px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={17} />
                  Download report
                </>
              )}
            </AButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluatorReportPage;
