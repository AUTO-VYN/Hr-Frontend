"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, Download, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const REGION_API = "/ars/getRegion";
const LOCATION_API = "/ars/getLocationByRegion";
const REPORT_API = "/hrmsreport/getRetailPerFormance";

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
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const getArray = (value: any): any[] => {
  return Array.isArray(value) ? value : [];
};

const getApiError = (error: any) =>
  error?.response?.data?.Message ||
  error?.response?.data?.message ||
  error?.message ||
  "Unable to process request.";

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

// --------------------------------------------------
// MAP API OPTIONS
// --------------------------------------------------

const mapOptions = (list: any[]): SelectOption[] => {
  if (!Array.isArray(list)) return [];

  return list
    .map((item: any) => {
      const value = getText(
        item.value,
        item.Value,
        item.Code,
        item.code,
        item.ID,
        item.Id,
        item.Loc_Code,
        item.Loc_code,
        item.Region_Code,
        item.Region_Code1,
      );

      const label = getText(
        item.label,
        item.lable,
        item.Label,
        item.Name,
        item.name,
        item.Description,
        item.Loc_Name,
        item.Loc_Name1,
        item.Region_Name,
        item.RegionName,
      );

      if (!value) return null;

      return {
        value,
        label: label || `Branch - ${value}`,
      };
    })
    .filter(Boolean) as SelectOption[];
};

const getUniqueOptions = (options: SelectOption[]) =>
  Array.from(new Map(options.map((item) => [item.value, item])).values());

// --------------------------------------------------
// NORMALIZE USER BRANCH
// --------------------------------------------------

const normalizeBranch = (branch: any): string[] => {
  if (!branch) return [];

  return Array.from(
    new Set(
      String(branch)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

// --------------------------------------------------
// DESIGNATION OPTIONS
// --------------------------------------------------

const DESIGNATION_OPTIONS: SelectOption[] = [
  { value: "", label: "All designations" },
  {
    value: "SR. RELATIONSHIP MANAGER",
    label: "Sr. Relationship Manager",
  },
  {
    value: "RELATIONSHIP MANAGER",
    label: "Relationship Manager",
  },
  { value: "POC DSE", label: "POC DSE" },
  {
    value: "POC TEAM LEADER",
    label: "POC Team Leader",
  },
  { value: "EVALUATER", label: "Evaluater" },
  {
    value: "CORPORATE MANAGER",
    label: "Corporate Manager",
  },
  {
    value: "CORPORATE RELATIONSHIP MANAGER",
    label: "Corporate Relationship Manager",
  },
  {
    value: "EV RELATIONSHIP MANAGER",
    label: "EV Relationship Manager",
  },
  { value: "EV MANAGER", label: "EV Manager" },
  {
    value: "RURAL SR. RELATIONSHIP MANAGER",
    label: "Rural Sr. Relationship Manager",
  },
  {
    value: "RURAL RELATIONSHIP MANAGER",
    label: "Rural Relationship Manager",
  },
];

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function RetailPerformanceReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [regionOptions, setRegionOptions] = useState<SelectOption[]>([]);
  const [designationOptions] = useState<SelectOption[]>(DESIGNATION_OPTIONS);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);

  const [region, setRegion] = useState("");
  const [designation, setDesignation] = useState("");

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState("");

  const [masterLoading, setMasterLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // --------------------------------------------------
  // API HEADERS
  // --------------------------------------------------

  const apiHeaders = useMemo(
    () => ({
      accept: "application/json",
      compcode: user?.Comp_Code,
      name: user?.name,
      "Content-Type": "application/json",
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // USER BRANCH
  // --------------------------------------------------

  const userBranches = useMemo(
    () => normalizeBranch(user?.branch),
    [user?.branch],
  );

  // --------------------------------------------------
  // FETCH REGION DATA
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) return;

    let cancelled = false;

    const fetchRegionData = async () => {
      setMasterLoading(true);

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}${REGION_API}`,
          {
            headers: apiHeaders,
          },
        );

        if (cancelled) return;

        console.log("Retail Report Region Response:", response?.data);

        const responseData = response?.data;

        const regions = mapOptions(getArray(responseData?.Region_Data));

        const uniqueRegions = getUniqueOptions(regions);

        setRegionOptions([
          { value: "", label: "All regions" },
          ...uniqueRegions,
        ]);

        setRegion("");
        setSelectedLocations([]);
      } catch (error) {
        console.error("Retail Report Region Error:", error);

        if (!cancelled) {
          setRegionOptions([{ value: "", label: "All regions" }]);

          setLocationOptions([]);
          showSideAlert(getApiError(error), "error");
        }
      } finally {
        if (!cancelled) {
          setMasterLoading(false);
        }
      }
    };

    fetchRegionData();

    return () => {
      cancelled = true;
    };
  }, [user?.Comp_Code, apiHeaders]);

  // --------------------------------------------------
  // FETCH LOCATIONS REGION WISE
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code || !regionOptions.length) return;

    let cancelled = false;

    const fetchLocations = async () => {
      setMasterLoading(true);
      setLocationOptions([]);
      setSelectedLocations([]);

      try {
        // All regions selected:
        // Send all region codes.
        //
        // Particular region selected:
        // Send only selected region code.

        const regionCodes =
          region === ""
            ? regionOptions
                .filter((item) => item.value !== "")
                .map((item) => Number(item.value))
                .filter((item) => Number.isFinite(item))
            : [Number(region)].filter((item) => Number.isFinite(item));

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}${LOCATION_API}`,
          {
            regionCode: regionCodes,
          },
          {
            headers: apiHeaders,
          },
        );

        if (cancelled) return;

        console.log("Retail Report Location Response:", response?.data);

        const responseData = response?.data;

        const locations = mapOptions(getArray(responseData?.Location_Data));

        const formattedLocations: LocationOption[] = getUniqueOptions(
          locations,
        ).map((item) => ({
          value: item.value,
          label: item.label,
        }));

        setLocationOptions(formattedLocations);
        setSelectedLocations([]);

        if (!formattedLocations.length) {
          showSideAlert("No locations found for the selected region.", "info");
        }
      } catch (error) {
        console.error("Retail Report Location Error:", error);

        if (!cancelled) {
          setLocationOptions([]);
          setSelectedLocations([]);
          showSideAlert(getApiError(error), "error");
        }
      } finally {
        if (!cancelled) {
          setMasterLoading(false);
        }
      }
    };

    fetchLocations();

    return () => {
      cancelled = true;
    };
  }, [user?.Comp_Code, region, regionOptions, apiHeaders]);

  // --------------------------------------------------
  // FILTERED LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();

    if (!query) return locationOptions;

    return locationOptions.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [locationOptions, locationSearch]);

  // --------------------------------------------------
  // SELECT ALL / DESELECT ALL
  // --------------------------------------------------

  const allVisibleSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((item) => selectedLocations.includes(item.value));

  const handleSelectAll = () => {
    if (allVisibleSelected) {
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
  // DOWNLOAD REPORT
  // --------------------------------------------------

  const downloadReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );
      return;
    }

    if (!locationOptions.length) {
      showSideAlert("No locations available.", "warning");
      return;
    }

    if (!selectedLocations.length) {
      showSideAlert("Please select at least one location.", "warning");
      return;
    }

    setDownloadLoading(true);

    try {
      // All regions = send all region codes.
      // Selected region = send selected region code.

      const selectedRegionCodes =
        region === ""
          ? regionOptions
              .filter((item) => item.value !== "")
              .map((item) => Number(item.value))
              .filter((item) => Number.isFinite(item))
          : [Number(region)].filter((item) => Number.isFinite(item));

      const payload = {
        location: selectedLocations,

        Region: selectedRegionCodes,

        Designation: designation || "",
      };

      console.log("Retail Performance Report Payload:", payload);
      console.log("User Branches:", userBranches);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${REPORT_API}`,
        payload,
        {
          headers: apiHeaders,
          responseType: "blob",
        },
      );

      const contentType = String(
        response.headers?.["content-type"] || "",
      ).toLowerCase();

      // Handle API error returned as blob.
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/plain")
      ) {
        const responseText = await response.data.text();

        let errorMessage = "Report download failed.";

        try {
          const errorData = JSON.parse(responseText);

          errorMessage =
            errorData?.Message || errorData?.message || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (!blob.size) {
        showSideAlert("No data available for the selected filters.", "warning");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;

      const fileName = `Retail_Performance_Report_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      link.setAttribute("download", fileName);

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showSideAlert(
        "Retail Performance Report downloaded successfully.",
        "success",
      );
    } catch (error: any) {
      console.error("Retail Performance Report Error:", error);

      showSideAlert(getApiError(error), "error");
    } finally {
      setDownloadLoading(false);
    }
  }, [
    user?.Comp_Code,
    region,
    designation,
    selectedLocations,
    locationOptions,
    regionOptions,
    apiHeaders,
    userBranches,
  ]);

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

  const resetFilters = () => {
    setRegion("");
    setDesignation("");
    setSelectedLocations([]);
    setLocationSearch("");
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f7f9fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={masterLoading || downloadLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-[20px] font-bold text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Retail Performance Report
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-[780px]">
            {/* REGION */}

            <div className="min-w-0">
              <Eselect
                title="Region"
                name="region"
                option={regionOptions}
                initialValue={region}
                handleInputChange={(name: string, value: any) =>
                  setRegion(String(value || ""))
                }
                className="h-[46px] w-full"
              />
            </div>

            {/* DESIGNATION */}

            <div className="min-w-0">
              <Eselect
                title="Designation"
                name="designation"
                option={designationOptions}
                initialValue={designation}
                handleInputChange={(name: string, value: any) =>
                  setDesignation(String(value || ""))
                }
                className="h-[46px] w-full"
              />
            </div>
          </div>
        </div>

        {/* LOCATION CARD */}

        <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {/* LOCATION HEADER */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eaf2] px-4 py-4 dark:border-slate-700 sm:px-5">
            <h2 className="text-[16px] font-bold text-[#152b4b] dark:text-slate-100">
              Locations
            </h2>

            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                  {selectedLocations.length}
                </span>{" "}
                of {locationOptions.length} selected
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                disabled={!filteredLocations.length}
                className="font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400"
              >
                {allVisibleSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>

          {/* LOCATION SEARCH */}

          <div className="px-4 pt-4 sm:px-5">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <Einput
                title=""
                name="locationSearch"
                type="text"
                value={locationSearch}
                handleInputChange={(name: string, value: string) =>
                  setLocationSearch(value)
                }
                placeholder="Search location"
                className="h-[44px] w-full pl-9"
              />
            </div>
          </div>

          {/* LOCATION CHECKBOXES */}

          <div className="px-4 py-4 sm:px-5">
            {locationOptions.length > 0 ? (
              filteredLocations.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredLocations.map((item) => {
                    const checked = selectedLocations.includes(item.value);

                    return (
                      <label
                        key={item.value}
                        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleLocationChange(item.value)}
                          className="h-[17px] w-[17px] shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                        />

                        <span className="truncate text-[14px] font-medium text-[#152b4b] dark:text-slate-200">
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
                  No locations match your search.
                </div>
              )
            ) : (
              <div className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
                No locations available.
              </div>
            )}
          </div>

          {/* FOOTER */}

          <div className="flex items-center justify-end border-t border-[#e5eaf2] px-4 py-4 dark:border-slate-700 sm:px-5">
            <AButton
              type="button"
              onClick={downloadReport}
              disabled={
                downloadLoading || masterLoading || !selectedLocations.length
              }
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#5145e5] px-6 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[205px]"
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
