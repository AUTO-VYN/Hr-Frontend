
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import {
  Download,
  Upload,
  Search,
  ArrowLeft,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Ainput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIG
// --------------------------------------------------

const REGION_API = "/ars/getRegion";
const LOCATION_API = "/ars/getLocationByRegion";
const REPORT_API = "/hrmsreport/getPerformanceSummary";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type Option = {
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

const getApiError = (error: any) =>
  error?.response?.data?.Message ||
  error?.response?.data?.message ||
  error?.response?.data?.MESSAGE ||
  error?.message ||
  "Unable to process request.";

const mapOptions = (list: any[]): Option[] => {
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
        item.Region_Code,
        item.Region_Code1,
        item.Loc_Code,
        item.Loc_code,
      );

      const label = getText(
        item.label,
        item.lable,
        item.Label,
        item.Name,
        item.name,
        item.Region_Name,
        item.RegionName,
        item.Loc_Name,
        item.Loc_Name1,
      );

      if (!value) return null;

      return {
        value,
        label: label || `Branch - ${value}`,
      };
    })
    .filter(Boolean) as Option[];
};

const uniqueOptions = (options: Option[]) =>
  Array.from(
    new Map(options.map((item) => [item.value, item])).values(),
  );

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
// DESIGNATION OPTIONS
// --------------------------------------------------

const DESIGNATION_OPTIONS: Option[] = [
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
// PAGE
// --------------------------------------------------

export default function PerformanceReportPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [regionOptions, setRegionOptions] = useState<Option[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);

  const [region, setRegion] = useState("");
  const [designation, setDesignation] = useState(
    "SR. RELATIONSHIP MANAGER",
  );

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [masterLoading, setMasterLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const [importSummary, setImportSummary] = useState({
    total: 0,
    imported: 0,
    notImported: 0,
  });

  // --------------------------------------------------
  // HEADERS
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
  // FETCH REGION
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) return;

    let cancelled = false;

    const fetchRegions = async () => {
      setMasterLoading(true);

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}${REGION_API}`,
          {
            headers: apiHeaders,
          },
        );

        if (cancelled) return;

        const regions = uniqueOptions(
          mapOptions(response?.data?.Region_Data || []),
        );

        setRegionOptions([
          {
            value: "",
            label: "All regions",
          },
          ...regions,
        ]);

        setRegion("");
      } catch (error) {
        console.error("Region API Error:", error);

        if (!cancelled) {
          setRegionOptions([]);
          showSideAlert(getApiError(error), "error");
        }
      } finally {
        if (!cancelled) {
          setMasterLoading(false);
        }
      }
    };

    fetchRegions();

    return () => {
      cancelled = true;
    };
  }, [user?.Comp_Code, user?.name, apiHeaders]);

  // --------------------------------------------------
  // FETCH LOCATIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code || !regionOptions.length) return;

    let cancelled = false;

    const fetchLocations = async () => {
      setLocationOptions([]);
      setSelectedLocations([]);

      // All regions selected -> send all region codes.
      // Specific region selected -> send only that region code.
      const regionCodes = region
        ? [Number(region)].filter(Number.isFinite)
        : regionOptions
            .filter((item) => item.value !== "")
            .map((item) => Number(item.value))
            .filter(Number.isFinite);

      // Never send empty regionCode to backend.
      if (!regionCodes.length) {
        return;
      }

      setMasterLoading(true);

      try {
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

        const locations = uniqueOptions(
          mapOptions(response?.data?.Location_Data || []),
        );

        setLocationOptions(locations);

        if (!locations.length) {
          showSideAlert(
            "No locations found for the selected region.",
            "info",
          );
        }
      } catch (error) {
        console.error("Location API Error:", error);

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
  }, [
    user?.Comp_Code,
    user?.name,
    region,
    regionOptions,
    apiHeaders,
  ]);

  // --------------------------------------------------
  // FILTER LOCATIONS
  // --------------------------------------------------

  const filteredLocations = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();

    if (!query) return locationOptions;

    return locationOptions.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [locationOptions, locationSearch]);

  const allVisibleSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((item) =>
      selectedLocations.includes(item.value),
    );

  // --------------------------------------------------
  // LOCATION SELECTION
  // --------------------------------------------------

  const handleLocationChange = (value: string) => {
    setSelectedLocations((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(
        filteredLocations.map((item) => item.value),
      );

      setSelectedLocations((previous) =>
        previous.filter((item) => !visibleIds.has(item)),
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
  // DATE VALIDATION
  // --------------------------------------------------

  const validateDates = () => {
    if (!dateFrom || !dateTo) {
      showSideAlert(
        "Please select Date From and Date To.",
        "warning",
      );
      return false;
    }

    if (dateFrom > dateTo) {
      showSideAlert(
        "Date from cannot be greater than Date to.",
        "warning",
      );
      return false;
    }

    return true;
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

  if (!dateFrom || !dateTo) {
    showSideAlert("Please select Date From and Date To.", "warning");
    return;
  }

  if (dateFrom > dateTo) {
    showSideAlert(
      "Date from cannot be greater than Date to.",
      "warning",
    );
    return;
  }

  if (!selectedLocations.length) {
    showSideAlert("Please select at least one location.", "warning");
    return;
  }

  setDownloadLoading(true);

  try {
    const selectedRegionCodes = region
      ? [Number(region)].filter(Number.isFinite)
      : regionOptions
          .filter((item) => item.value !== "")
          .map((item) => Number(item.value))
          .filter(Number.isFinite);

    if (!selectedRegionCodes.length) {
      showSideAlert("Please select a valid region.", "warning");
      return;
    }

    const locationCodes = selectedLocations
      .map((item) => String(item).trim())
      .filter(Boolean);

    // Existing working page ke format ke according
    const payload = {
      location: locationCodes,
      Region: selectedRegionCodes,
      Designation: designation ? designation : "",
      DATE_FROM: dateFrom,
      DATE_TO: dateTo,
    };

    console.log("Performance Report Payload:", payload);

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

    // Backend JSON error ko Excel samajhkar download nahi karna
    const contentType = String(
      response.headers?.["content-type"] || "",
    ).toLowerCase();

    if (
      contentType.includes("application/json") ||
      contentType.includes("text/plain")
    ) {
      const responseText = await response.data.text();

      let errorMessage = "Failed to download Performance Report.";

      try {
        const errorData = JSON.parse(responseText);
        errorMessage =
          errorData?.Message ||
          errorData?.message ||
          errorData?.MESSAGE ||
          errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    if (!blob.size) {
      showSideAlert(
        "No data available for selected filters.",
        "warning",
      );
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Performance_Report_${dateFrom}_to_${dateTo}.xlsx`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    showSideAlert(
      "Performance Report downloaded successfully.",
      "success",
    );
  } catch (error: any) {
    console.error("Performance Report Download Error:", error);

    let message =
      error?.message || "Failed to download Performance Report.";

    if (error?.response?.data instanceof Blob) {
      try {
        const responseText = await error.response.data.text();

        const errorData = JSON.parse(responseText);

        message =
          errorData?.Message ||
          errorData?.message ||
          errorData?.MESSAGE ||
          message;
      } catch {
        // Keep the original error message.
      }
    }

    showSideAlert(message, "error");
  } finally {
    setDownloadLoading(false);
  }
}, [
  user?.Comp_Code,
  user?.name,
  dateFrom,
  dateTo,
  selectedLocations,
  region,
  regionOptions,
  designation,
]);

  // --------------------------------------------------
  // DOWNLOAD SAMPLE CSV
  // --------------------------------------------------

const downloadSample = async () => {
  try {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );
      return;
    }

    const apiUrl = `${process.env.NEXT_PUBLIC_URL}/hrmsreport/importPerFormanceSample?compcode=${encodeURIComponent(
      user.Comp_Code,
    )}`;

    window.location.href = apiUrl;
  } catch (error) {
    console.error("Sample Download Error:", error);

    showSideAlert(
      "Unable to download sample file.",
      "error",
    );
  }
};
  // --------------------------------------------------
  // FILE SELECTION
  // --------------------------------------------------

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedExtensions = [".xlsx", ".xls", ".csv"];

    const valid = allowedExtensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension),
    );

    if (!valid) {
      showSideAlert(
        "Please select an XLSX, XLS or CSV file.",
        "warning",
      );

      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    setImportSummary({
      total: 0,
      imported: 0,
      notImported: 0,
    });
  };

  // --------------------------------------------------
  // IMPORT FILE
  // --------------------------------------------------

const handleImport = async () => {
  if (!selectedFile) {
    showSideAlert("Please select an Excel file first.", "warning");
    return;
  }

  if (!user?.Comp_Code || !user?.name) {
    showSideAlert("User information missing. Please login again.", "error");
    return;
  }

  try {
    setImportLoading(true);

    const formData = new FormData();
    formData.append("excel", selectedFile, selectedFile.name);
    formData.append("user", user.name);
    formData.append("branch", user.branch || "");

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/hrmsreport/importTargetData`,
      formData,
      {
        headers: {
          compcode: user.Comp_Code,
          name: user.name,
        },
      },
    );

    const {
      Type,
      Message,
      File,
      FileName,
      Inserted,
      NonInserted,
      Total,
    } = response.data;

    // Import summary
    setImportSummary({
      Inserted: Inserted || 0,
      NonInserted: NonInserted || 0,
      Total: Total || 0,
    });

    showSideAlert(
      Message || "Performance data imported successfully.",
      Type || "success",
    );

    // Download backend response Excel file, if provided
    if (File) {
      const binaryData = atob(File);
      const uint8Array = new Uint8Array(binaryData.length);

      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }

      const blob = new Blob([uint8Array], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = FileName || "Performance_Import_Result.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(link.href);
    }

    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  } catch (error: any) {
    console.error("Performance Import Error:", error);

    showSideAlert(
      error?.response?.data?.Message ||
        error?.response?.data?.message ||
        "Unable to import performance data.",
      "error",
    );
  } finally {
    setImportLoading(false);
  }
};

  // --------------------------------------------------
  // RENDER
  // UI AND COMPONENTS KEPT UNCHANGED
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f7f9fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent
        isLoading={masterLoading || downloadLoading || importLoading}
      />

      <div className="mx-auto w-full max-w-[1800px] space-y-4">

        {/* HEADER */}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[21px] font-bold text-[#152b4b] dark:text-slate-100 sm:text-[24px]">
            Performance Report
          </h1>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <div className="min-w-0">
              <Eselect
                title="Region"
                name="Region"
                option={regionOptions}
                initialValue={region}
                handleInputChange={(name: string, value: any) => {
                  setRegion(String(value || ""));
                }}
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Designation"
                name="Designation"
                option={DESIGNATION_OPTIONS}
                initialValue={designation}
                handleInputChange={(name: string, value: any) => {
                  setDesignation(String(value || ""));
                }}
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Ainput
                title="Date from"
                name="DATE_FROM"
                type="date"
                value={dateFrom}
                handleInputChange={(name: string, value: string) =>
                  setDateFrom(value)
                }
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Ainput
                title="Date to"
                name="DATE_TO"
                type="date"
                value={dateTo}
                handleInputChange={(name: string, value: string) =>
                  setDateTo(value)
                }
                className="h-[40px] w-full"
              />
            </div>
          </div>
        </div>

        {/* IMPORT CARD */}

        <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-[#152b4b] dark:text-slate-100">
              Import performance data
            </h2>

            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex h-[40px] items-center gap-2 rounded-xl border border-[#dce5f1] px-4 text-[14px] font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <Download size={16} />
              Download sample
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex h-[46px] min-w-0 flex-1 cursor-pointer items-center overflow-hidden rounded-xl border border-dashed border-[#cbd8e8] bg-white dark:border-slate-600 dark:bg-slate-950">
              <span className="min-w-0 flex-1 truncate px-4 text-[14px] text-slate-500 dark:text-slate-400">
                {selectedFile
                  ? selectedFile.name
                  : "No file chosen (.xlsx, .xls, .csv)"}
              </span>

              <span className="mr-2 shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Choose file
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <AButton
              type="button"
              onClick={handleImport}
              disabled={!selectedFile || importLoading}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#5145e5] px-7 text-[14px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} />
              Import
            </AButton>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Total rows <b>{importSummary.total || "—"}</b>
            </span>

            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              Imported <b>{importSummary.imported || "—"}</b>
            </span>

            <span className="rounded-lg bg-red-50 px-3 py-1.5 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              Not imported <b>{importSummary.notImported || "—"}</b>
            </span>
          </div>
        </div>

        {/* LOCATIONS CARD */}

        <div className="overflow-hidden rounded-2xl border border-[#dce5f1] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eaf2] px-4 py-4 dark:border-slate-700 sm:px-5">
            <h2 className="text-[16px] font-bold text-[#152b4b] dark:text-slate-100">
              Locations
            </h2>

            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-slate-500 dark:text-slate-400">
                <b className="text-[#152b4b] dark:text-slate-100">
                  {selectedLocations.length}
                </b>{" "}
                of {locationOptions.length} selected
              </span>

              <button
                type="button"
                onClick={handleSelectAll}
                disabled={!filteredLocations.length}
                className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 dark:text-indigo-400"
              >
                {allVisibleSelected ? "Deselect all" : "Select all"}
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

              <input
                type="search"
                placeholder="Search location"
                value={locationSearch}
                onChange={(event) =>
                  setLocationSearch(event.target.value)
                }
                className="h-[44px] w-full rounded-xl border border-[#dce5f1] bg-[#f8fafc] pl-10 pr-3 text-[14px] text-[#152b4b] outline-none transition placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {/* LOCATION LIST */}

          <div className="px-4 py-4 sm:px-5">
            {locationOptions.length ? (
              filteredLocations.length ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredLocations.map((item) => {
                    const checked = selectedLocations.includes(item.value);

                    return (
                      <label
                        key={item.value}
                        className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition ${
                          checked
                            ? "bg-indigo-50 dark:bg-indigo-900/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            handleLocationChange(item.value)
                          }
                          className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-indigo-600"
                        />

                        <span className="truncate text-[14px] font-medium text-[#152b4b] dark:text-slate-200">
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="py-5 text-center text-sm text-slate-500">
                  No locations match your search.
                </div>
              )
            ) : (
              <div className="py-5 text-center text-sm text-slate-500">
                No locations available.
              </div>
            )}
          </div>

          {/* DOWNLOAD FOOTER */}

          <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-[#e5eaf2] px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:px-5">
            <AButton
              type="button"
              onClick={downloadReport}
              disabled={
                downloadLoading ||
                masterLoading ||
                !selectedLocations.length
              }
              className="inline-flex h-[40px] items-center justify-center gap-2 rounded-xl bg-[#5145e5] px-7 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[205px]"
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
