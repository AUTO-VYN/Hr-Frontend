"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Download, Search } from "lucide-react";

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

const REPORT_API = "/hrmsreport/getmonthwiseRetailPerFormance";

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
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
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
  error?.response?.data?.MESSAGE ||
  error?.response?.data?.error?.message ||
  error?.response?.data?.error ||
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
    timer: 5000,
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
  if (!Array.isArray(list)) {
    return [];
  }

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

      if (!value) {
        return null;
      }

      return {
        value,
        label: label || `Branch - ${value}`,
      };
    })
    .filter(Boolean) as SelectOption[];
};

const getUniqueOptions = (options: SelectOption[]) => {
  return Array.from(
    new Map(options.map((item) => [item.value, item])).values(),
  );
};

// --------------------------------------------------
// DESIGNATION OPTIONS
// --------------------------------------------------

const DESIGNATION_OPTIONS: SelectOption[] = [
  {
    value: "SR. RELATIONSHIP MANAGER",
    label: "Sr. Relationship Manager",
  },
  {
    value: "RELATIONSHIP MANAGER",
    label: "Relationship Manager",
  },
  {
    value: "POC DSE",
    label: "POC DSE",
  },
  {
    value: "POC TEAM LEADER",
    label: "POC Team Leader",
  },
  {
    value: "SOURCING MANAGER",
    label: "Sourcing Manager",
  },
  {
    value: "EVALUATOR",
    label: "Evaluator",
  },
  {
    value: "EVALUATER",
    label: "Evaluater",
  },
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
  {
    value: "EV MANAGER",
    label: "EV Manager",
  },
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
// YEAR OPTIONS
// --------------------------------------------------

const currentYear = new Date().getFullYear();

const YEAR_OPTIONS: SelectOption[] = Array.from(
  { length: 7 },
  (_, index) => {
    const year = currentYear - 3 + index;

    return {
      value: String(year),
      label: String(year),
    };
  },
);

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function MonthwiseRetailPerformancePage() {
  const user = useCurrentUser();

  // --------------------------------------------------
  // FILTER STATES
  // IMPORTANT:
  // Same default behavior as existing working page.
  // Month + Year selected by default.
  // Date range remains empty.
  // --------------------------------------------------

  const [year, setYear] = useState(String(currentYear));

  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1),
  );

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [regionOptions, setRegionOptions] = useState<SelectOption[]>([
    {
      value: "",
      label: "All regions",
    },
  ]);

  const [locationOptions, setLocationOptions] = useState<
    LocationOption[]
  >([]);

  const [region, setRegion] = useState("");

  const [designation, setDesignation] = useState<string[]>([]);

  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    [],
  );

  const [locationSearch, setLocationSearch] = useState("");

  const [masterLoading, setMasterLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // --------------------------------------------------
  // FETCH REGION DATA
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) {
      return;
    }

    let cancelled = false;

    const fetchRegionData = async () => {
      setMasterLoading(true);

      try {
        const result = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}${REGION_API}`,
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          },
        );

        if (cancelled) {
          return;
        }

        console.log(
          "Monthwise Retail Region Response:",
          result?.data,
        );

        const regions = mapOptions(
          getArray(result?.data?.Region_Data),
        );

        const uniqueRegions = getUniqueOptions(regions);

        setRegionOptions([
          {
            value: "",
            label: "All regions",
          },
          ...uniqueRegions,
        ]);
      } catch (error) {
        console.error(
          "Monthwise Retail Region Error:",
          error,
        );

        if (!cancelled) {
          setRegionOptions([
            {
              value: "",
              label: "All regions",
            },
          ]);

          showSideAlert(
            getApiError(error),
            "error",
          );
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
  }, [user?.Comp_Code, user?.name]);

  // --------------------------------------------------
  // FETCH LOCATIONS REGION WISE
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) {
      return;
    }

    if (!region) {
      setLocationOptions([]);
      setSelectedLocations([]);
      return;
    }

    let cancelled = false;

    const fetchLocations = async () => {
      const regionCode = [Number(region)].filter((item) =>
        Number.isFinite(item),
      );

      if (!regionCode.length) {
        setLocationOptions([]);
        setSelectedLocations([]);
        return;
      }

      setMasterLoading(true);

      setLocationOptions([]);
      setSelectedLocations([]);

      try {
        console.log(
          "Monthwise Retail Location Region Code:",
          regionCode,
        );

        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}${LOCATION_API}`,
          {
            regionCode,
          },
          {
            headers: {
              accept: "application/json",
              compcode: user?.Comp_Code,
              name: user?.name,
              "Content-Type": "application/json",
            },
          },
        );

        if (cancelled) {
          return;
        }

        console.log(
          "Monthwise Retail Location Response:",
          result?.data,
        );

        const locations = mapOptions(
          getArray(result?.data?.Location_Data),
        );

        const formattedLocations: LocationOption[] =
          getUniqueOptions(locations).map((item) => ({
            value: String(item.value),
            label: item.label,
          }));

        setLocationOptions(formattedLocations);

        setSelectedLocations([]);

        if (!formattedLocations.length) {
          showSideAlert(
            "No locations found for the selected region.",
            "info",
          );
        }
      } catch (error) {
        console.error(
          "Monthwise Retail Location Error:",
          error,
        );

        if (!cancelled) {
          setLocationOptions([]);
          setSelectedLocations([]);

          showSideAlert(
            getApiError(error),
            "error",
          );
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
  }, [user?.Comp_Code, user?.name, region]);

  // --------------------------------------------------
  // FILTERED LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();

    if (!query) {
      return locationOptions;
    }

    return locationOptions.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [locationOptions, locationSearch]);

  // --------------------------------------------------
  // SELECT ALL
  // --------------------------------------------------

  const allVisibleSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((item) =>
      selectedLocations.includes(item.value),
    );

  const handleSelectAll = () => {
    if (!filteredLocations.length) {
      return;
    }

    const visibleValues = filteredLocations.map(
      (item) => item.value,
    );

    if (allVisibleSelected) {
      setSelectedLocations((previous) =>
        previous.filter(
          (value) => !visibleValues.includes(value),
        ),
      );
    } else {
      setSelectedLocations((previous) =>
        Array.from(
          new Set([
            ...previous,
            ...visibleValues,
          ]),
        ),
      );
    }
  };

  // --------------------------------------------------
  // INDIVIDUAL LOCATION
  // --------------------------------------------------

  const handleLocationChange = (value: string) => {
    setSelectedLocations((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  // --------------------------------------------------
  // YEAR CHANGE
  // --------------------------------------------------

  const handleYearChange = (value: any) => {
    const newValue = String(value || "");

    setYear(newValue);

    // Month/year mode => clear date range
    setDateFrom("");
    setDateTo("");
  };

  // --------------------------------------------------
  // MONTH CHANGE
  // --------------------------------------------------

  const handleMonthChange = (value: any) => {
    const newValue = String(value || "");

    setMonth(newValue);

    // Month/year mode => clear date range
    setDateFrom("");
    setDateTo("");
  };

  // --------------------------------------------------
  // DATE FROM CHANGE
  // --------------------------------------------------

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);

    // Date range mode => clear month/year
    if (value) {
      setMonth("");
      setYear("");
    }
  };

  // --------------------------------------------------
  // DATE TO CHANGE
  // --------------------------------------------------

  const handleDateToChange = (value: string) => {
    setDateTo(value);

    // Date range mode => clear month/year
    if (value) {
      setMonth("");
      setYear("");
    }
  };

  // --------------------------------------------------
  // DOWNLOAD REPORT
  // --------------------------------------------------

  const downloadReport = useCallback(async () => {
    // --------------------------------------------------
    // COMPANY VALIDATION
    // --------------------------------------------------

    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );

      return;
    }

    // --------------------------------------------------
    // MONTH/YEAR OR DATE RANGE
    // --------------------------------------------------

    const hasMonthYear = Boolean(year && month);
    const hasDateRange = Boolean(dateFrom && dateTo);

    if (!hasMonthYear && !hasDateRange) {
      showSideAlert(
        "Please select Month and Year or Date From and Date To.",
        "warning",
      );

      return;
    }

    // --------------------------------------------------
    // DATE VALIDATION
    // --------------------------------------------------

    if (
      (dateFrom && !dateTo) ||
      (!dateFrom && dateTo)
    ) {
      showSideAlert(
        "Please select both Date From and Date To.",
        "warning",
      );

      return;
    }

    if (
      dateFrom &&
      dateTo &&
      dateFrom > dateTo
    ) {
      showSideAlert(
        "Date from cannot be greater than Date to.",
        "warning",
      );

      return;
    }

    // --------------------------------------------------
    // LOCATION VALIDATION
    // --------------------------------------------------

    if (!locationOptions.length) {
      showSideAlert(
        "No locations available.",
        "warning",
      );

      return;
    }

    if (!selectedLocations.length) {
      showSideAlert(
        "Please select at least one location.",
        "warning",
      );

      return;
    }

    setDownloadLoading(true);

    try {
      // --------------------------------------------------
      // REGION
      // Existing working API expects:
      // Region: [1]
      // --------------------------------------------------

      const regionPayload = region
        ? [Number(region)].filter((item) =>
            Number.isFinite(item),
          )
        : [];

      // --------------------------------------------------
      // LOCATION
      // Existing working API expects:
      // location: ["1"]
      // --------------------------------------------------

      const locationPayload = selectedLocations
        .flat(Infinity)
        .filter(
          (item) =>
            item !== undefined &&
            item !== null &&
            String(item).trim() !== "",
        )
        .map((item) => String(item));

      // --------------------------------------------------
      // DESIGNATION
      // Existing working API expects:
      // Designation: []
      //
      // If selected:
      // Designation: ["RELATIONSHIP MANAGER", ...]
      // --------------------------------------------------

      const designationPayload = Array.isArray(
        designation,
      )
        ? designation
            .flat(Infinity)
            .filter(
              (item) =>
                item !== undefined &&
                item !== null &&
                String(item).trim() !== "",
            )
            .map((item) => String(item))
        : designation
          ? [String(designation)]
          : [];

      // --------------------------------------------------
      // IMPORTANT PAYLOAD
      //
      // DO NOT use:
      // Year
      // Month
      //
      // Existing working page uses:
      // salyear
      // SalMnth
      // --------------------------------------------------

      const payload = {
        location: locationPayload,

        Region: regionPayload,

        Designation: designationPayload,

        SalMnth: month
          ? Number(month)
          : "",

        salyear: year
          ? Number(year)
          : "",

        DATE_TO: dateTo || "",

        DATE_FROM: dateFrom || "",
      };

      console.log(
        "========================================",
      );

      console.log(
        "Monthwise Retail Performance Payload:",
      );

      console.log(
        JSON.stringify(
          payload,
          null,
          2,
        ),
      );

      console.log(
        "========================================",
      );

      // --------------------------------------------------
      // API CALL
      // SAME API AS EXISTING WORKING PAGE
      // --------------------------------------------------

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${REPORT_API}`,
        payload,
        {
          responseType: "blob",

          headers: {
            "Content-Type": "application/json",
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      // --------------------------------------------------
      // CONTENT TYPE
      // --------------------------------------------------

      const contentType = String(
        response?.headers?.["content-type"] || "",
      ).toLowerCase();

      console.log(
        "Report Response Content-Type:",
        contentType,
      );

      // --------------------------------------------------
      // JSON/TEXT ERROR RETURNED AS BLOB
      // --------------------------------------------------

      if (
        contentType.includes(
          "application/json",
        ) ||
        contentType.includes(
          "text/plain",
        )
      ) {
        const responseText =
          await response.data.text();

        let errorMessage =
          "Failed to download Monthwise Retail Performance Report.";

        try {
          const errorData =
            JSON.parse(responseText);

          errorMessage =
            errorData?.Message ||
            errorData?.message ||
            errorData?.MESSAGE ||
            errorData?.error?.message ||
            errorData?.error ||
            errorMessage;
        } catch {
          errorMessage =
            responseText ||
            errorMessage;
        }

        throw new Error(
          errorMessage,
        );
      }

      // --------------------------------------------------
      // CREATE EXCEL BLOB
      // --------------------------------------------------

      const blob = new Blob(
        [response.data],
        {
          type:
            contentType ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      );

      // --------------------------------------------------
      // EMPTY RESPONSE
      // --------------------------------------------------

      if (!blob.size) {
        showSideAlert(
          "No data available for the selected filters.",
          "warning",
        );

        return;
      }

      // --------------------------------------------------
      // DOWNLOAD
      // --------------------------------------------------

      const url =
        window.URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          "a",
        );

      link.href = url;

      const fileName =
        `Monthwise_Retail_Performance_Report_${
          year || "DateRange"
        }_${
          month || ""
        }.xlsx`;

      link.setAttribute(
        "download",
        fileName,
      );

      document.body.appendChild(
        link,
      );

      link.click();

      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(
          url,
        );
      }, 100);

      // --------------------------------------------------
      // SUCCESS
      // --------------------------------------------------

      showSideAlert(
        "Monthwise Retail Performance Report downloaded successfully.",
        "success",
      );
    } catch (error: any) {
      console.error(
        "Monthwise Retail Performance Report Error:",
        error,
      );

      let errorMessage =
        "Failed to download Monthwise Retail Performance Report.";

      // --------------------------------------------------
      // BLOB ERROR
      // --------------------------------------------------

      if (
        error?.response?.data instanceof
        Blob
      ) {
        try {
          const responseText =
            await error.response.data.text();

          let errorData: any = null;

          try {
            errorData =
              JSON.parse(
                responseText,
              );
          } catch {
            errorData = null;
          }

          errorMessage =
            errorData?.Message ||
            errorData?.message ||
            errorData?.MESSAGE ||
            errorData?.error?.message ||
            errorData?.error ||
            responseText ||
            (error?.response?.status ===
            404
              ? "No data found for the selected filters."
              : errorMessage);
        } catch {
          errorMessage =
            error?.response?.status ===
            404
              ? "No data found for the selected filters."
              : errorMessage;
        }
      }

      // --------------------------------------------------
      // NORMAL API ERROR
      // --------------------------------------------------

      else if (
        error?.response?.data?.message
      ) {
        errorMessage =
          error.response.data.message;
      } else if (
        error?.response?.data?.Message
      ) {
        errorMessage =
          error.response.data.Message;
      } else if (
        error?.response?.data?.MESSAGE
      ) {
        errorMessage =
          error.response.data.MESSAGE;
      } else if (
        error?.message
      ) {
        errorMessage =
          error.message;
      }

      // --------------------------------------------------
      // NETWORK ERROR
      // --------------------------------------------------

      else if (!error?.response) {
        errorMessage =
          "Server se connection nahi ho paya. Please try again.";
      }

      showSideAlert(
        errorMessage,
        error?.response?.status ===
          404
          ? "warning"
          : "error",
      );
    } finally {
      setDownloadLoading(
        false,
      );
    }
  }, [
    user?.Comp_Code,
    user?.name,
    year,
    month,
    dateFrom,
    dateTo,
    region,
    designation,
    selectedLocations,
    locationOptions,
  ]);

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f7f9fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent
        isLoading={
          masterLoading ||
          downloadLoading
        }
      />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* --------------------------------------------------
            PAGE HEADER
        -------------------------------------------------- */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-[20px] font-bold text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Monthwise Retail Performance Report
            </h1>
          </div>
        </div>

        {/* --------------------------------------------------
            FILTER CARD
        -------------------------------------------------- */}

        <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {/* YEAR */}

            <div className="min-w-0">
              <Eselect
                title="Year"
                name="year"
                option={YEAR_OPTIONS}
                initialValue={year}
                handleInputChange={(
                  name: string,
                  value: any,
                ) =>
                  handleYearChange(
                    value,
                  )
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* MONTH */}

            <div className="min-w-0">
              <Eselect
                title="Month"
                name="month"
                option={MONTH_OPTIONS}
                initialValue={month}
                handleInputChange={(
                  name: string,
                  value: any,
                ) =>
                  handleMonthChange(
                    value,
                  )
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE FROM */}

            <div className="min-w-0">
              <Einput
                title="Date from"
                name="dateFrom"
                type="date"
                value={dateFrom}
                handleInputChange={(
                  name: string,
                  value: string,
                ) =>
                  handleDateFromChange(
                    value,
                  )
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}

            <div className="min-w-0">
              <Einput
                title="Date to"
                name="dateTo"
                type="date"
                value={dateTo}
                handleInputChange={(
                  name: string,
                  value: string,
                ) =>
                  handleDateToChange(
                    value,
                  )
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* REGION */}

            <div className="min-w-0">
              <Eselect
                title="Region"
                name="Region"
                option={regionOptions}
                initialValue={region}
                handleInputChange={(
                  name: string,
                  value: any,
                ) => {
                  setRegion(
                    String(
                      value || "",
                    ),
                  );
                }}
                className="h-[40px] w-full"
              />
            </div>

            {/* DESIGNATION */}

            <div className="min-w-0">
              <Eselect
                title="Designation"
                name="designation"
                option={
                  DESIGNATION_OPTIONS
                }
                initialValue={
                  designation
                }
                handleInputChange={(
                  name: string,
                  value: any,
                ) => {
                  const selectedValues =
                    Array.isArray(
                      value,
                    )
                      ? value
                          .flat(
                            Infinity,
                          )
                          .filter(
                            Boolean,
                          )
                          .map(
                            String,
                          )
                      : value
                        ? [
                            String(
                              value,
                            ),
                          ]
                        : [];

                  setDesignation(
                    selectedValues,
                  );
                }}
                className="h-[40px] w-full"
                checkbox
              />
            </div>
          </div>
        </div>

        {/* --------------------------------------------------
            LOCATION CARD
        -------------------------------------------------- */}

        <div className="overflow-hidden rounded-2xl border border-[#dce5f1] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {/* LOCATION HEADER */}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eaf2] px-4 py-4 dark:border-slate-700 sm:px-5">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-[#152b4b] dark:text-slate-100">
                Locations
              </h2>
            </div>

            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                  {
                    selectedLocations.length
                  }
                </span>{" "}
                of{" "}
                {
                  locationOptions.length
                }{" "}
                selected
              </span>

              <button
                type="button"
                onClick={
                  handleSelectAll
                }
                disabled={
                  !filteredLocations.length
                }
                className="font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400"
              >
                {
                  allVisibleSelected
                    ? "Deselect all"
                    : "Select all"
                }
              </button>
            </div>
          </div>

          {/* SEARCH */}

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
                value={
                  locationSearch
                }
                handleInputChange={(
                  name: string,
                  value: string,
                ) =>
                  setLocationSearch(
                    value,
                  )
                }
                placeholder="Search location"
                className="h-[44px] w-full pl-9"
              />
            </div>
          </div>

          {/* LOCATION CHECKBOXES */}

          <div className="px-4 py-4 sm:px-5">
            {locationOptions.length >
            0 ? (
              filteredLocations.length >
              0 ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredLocations.map(
                    (item) => {
                      const checked =
                        selectedLocations.includes(
                          item.value,
                        );

                      return (
                        <label
                          key={
                            item.value
                          }
                          className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition ${
                            checked
                              ? "bg-indigo-50 dark:bg-indigo-900/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            onChange={() =>
                              handleLocationChange(
                                item.value,
                              )
                            }
                            className="h-[17px] w-[17px] shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                          />

                          <span className="truncate text-[14px] font-medium text-[#152b4b] dark:text-slate-200">
                            {
                              item.label
                            }
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
                  No locations match your search.
                </div>
              )
            ) : (
              <div className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
                {region
                  ? "No locations available."
                  : "Please select a region to load locations."}
              </div>
            )}
          </div>

          {/* FOOTER */}

          <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-[#e5eaf2] px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:px-5">
            <AButton
              type="button"
              onClick={
                downloadReport
              }
              disabled={
                downloadLoading ||
                masterLoading ||
                !selectedLocations.length
              }
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#5145e5] px-6 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[205px]"
            >
              <Download
                size={17}
              />
              Download report
            </AButton>
          </div>
        </div>
      </div>
    </div>
  );
}