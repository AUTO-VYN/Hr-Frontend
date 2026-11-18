"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, Download } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";

const REGION_API = "/ars/getRegion";
const LOCATION_API = "/ars/getLocationByRegion";
const REPORT_API = "/hrmsreport/getEvaluatorRetailReport";

type SelectOption = {
  value: string;
  label: string;
};

const RetailEvaluatorPerformancePage = () => {
  const user = useCurrentUser();

  const [regions, setRegions] = useState<SelectOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");

  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [searchLocation, setSearchLocation] = useState("");

  const [regionLoading, setRegionLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
const [hasSelectedRegion, setHasSelectedRegion] = useState(false);
  // --------------------------------------------------
  // ALERT
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
  // FETCH REGIONS
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

      const formatted: SelectOption[] = rows
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
        .filter((item: SelectOption) => item.value && item.label);

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
      // Empty selection means All regions.
      const codes = regionCode
        ? regionCode.split(",")
        : regions.map((item) => item.value);

      return [
        ...new Set(
          codes
            .map((item) => Number(String(item).trim()))
            .filter((item) => Number.isFinite(item) && item > 0),
        ),
      ];
    },
    [regions],
  );

  // --------------------------------------------------
  // FETCH LOCATIONS
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

        const formatted: SelectOption[] = rows
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
          .filter((item: SelectOption) => item.value && item.label);

        setLocations(formatted);
      } catch (error) {
        console.error("Location API Error:", error);
        setLocations([]);
        // Refresh ke time popup avoid karne ke liye Swal alert hata diya.
      } finally {
        setLocationLoading(false);
      }
    },
    [user?.Comp_Code, regions, getRegionCodes, requestHeaders],
  );

  // LOCATION EFFECT
useEffect(() => {
  // Page open hone par locations API call nahi hogi.
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
  // REGION CHANGE
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
  // FILTER LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const search = searchLocation.trim().toLowerCase();

    if (!search) return locations;

    return locations.filter((location) =>
      location.label.toLowerCase().includes(search),
    );
  }, [locations, searchLocation]);

  // --------------------------------------------------
  // SELECT ALL
  // --------------------------------------------------

  const allFilteredSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((location) =>
      selectedLocations.includes(location.value),
    );

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
  // TOGGLE LOCATION
  // --------------------------------------------------

  const toggleLocation = (value: string) => {
    setSelectedLocations((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  // --------------------------------------------------
  // DOWNLOAD EVALUATOR RETAIL REPORT
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

    if (!selectedLocations.length) {
      showAlert("Please select Region and at least one Location.", "warning");
      return;
    }

    try {
      setDownloadLoading(true);

      const regionCodes = getRegionCodes(selectedRegion);

      if (!regionCodes.length) {
        showAlert("Please select a valid region.", "warning");
        return;
      }

      // Payload as per existing DepartmentWiseReport.
      const payload = {
        location: selectedLocations,
        Region: regionCodes,
        Designation: "EVALUATER",
      };

      console.log("Evaluator Retail Report Payload:", payload);

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

      // Handle JSON/text response returned as Blob.
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/plain")
      ) {
        const errorText = await response.data.text();

        let message = "No data available for the selected filters.";

        try {
          const parsed = JSON.parse(errorText);

          message = parsed.Message || parsed.message || message;
        } catch {
          message = errorText || message;
        }

        showAlert(message, "warning");
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

      link.download = `Evaluator_Retail_Performance_Report_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showAlert(
        "Evaluator Retail Performance Report downloaded successfully.",
        "success",
      );
    } catch (error: any) {
      console.error("Evaluator Retail Report Download Error:", error);

      let message =
        error?.response?.data?.Message ||
        error?.response?.data?.message ||
        "Failed to download Evaluator Retail Performance Report.";

      if (error?.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();

          const parsed = JSON.parse(errorText);

          message = parsed.Message || parsed.message || message;
        } catch {
          // Keep fallback error message.
        }
      }

      showAlert(message, "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  // --------------------------------------------------
  // UI - UNCHANGED
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-3 py-3 text-[#172b4d] transition-colors dark:bg-slate-950 dark:text-slate-100 sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* PAGE HEADER */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-[21px] font-bold text-[#172b4d] dark:text-slate-100 sm:text-[23px]">
            Retail Evaluator Performance Report
          </h1>
        </div>

        {/* REGION CARD */}
        <div className="mb-4 rounded-2xl border border-[#dce5f0] bg-white p-4 transition-colors dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="w-full md:max-w-[360px]">
            <div className="dark:[&_label]:text-slate-300 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Eselect
                name="region"
                title="Region"
                option={[
                  {
                    value: "",
                    label: "All regions",
                  },
                  ...regions,
                ]}
                initialValue={selectedRegion}
                handleInputChange={handleRegionChange}
                className="h-[40px] w-full"
              />
            </div>

            {regionLoading && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Loading regions...
              </p>
            )}
          </div>
        </div>

        {/* LOCATION CARD */}
        <div className="overflow-hidden rounded-2xl border border-[#dce5f0] bg-white transition-colors dark:border-slate-700 dark:bg-slate-900">
          {/* CARD HEADER */}
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

          {/* CARD BODY */}
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

            {/* LOCATIONS */}
            {locationLoading ? (
              <div className="flex min-h-[65px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Loading locations...
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="flex min-h-[65px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
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
                        className="h-[17px] w-[17px] shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
                      />

                      <span className="select-none">{location.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end border-t border-[#e3eaf3] px-4 py-4 dark:border-slate-700 sm:px-5">
            <AButton
              type="button"
              onClick={downloadReport}
              disabled={
                downloadLoading ||
                locationLoading ||
                selectedLocations.length === 0
              }
              className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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

export default RetailEvaluatorPerformancePage;
