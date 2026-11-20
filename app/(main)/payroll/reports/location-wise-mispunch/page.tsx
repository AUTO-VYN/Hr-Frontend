"use client";

import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  CalendarDays,
  Image as ImageIcon,
  Search,
  Upload,
  X,
  RefreshCw,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const BRANCH_API = "/payout/payout";
const MISPUNCH_API = "/employee/getLocationWiseMispunchData";

type Option = {
  value: string;
  label: string;
};

type MispunchItem = {
  id: string;
  empCode: string;
  empName: string;
  branchCode: string;
  branchName: string;
  date: string;
  time: string;
  type: "IN" | "OUT";
  selfieUrl: string;
};

type FilterType = "ALL" | "IN" | "OUT";

const getText = (...values: any[]) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && item !== "",
  );

  return value === undefined ? "" : String(value);
};

const formatDate = (value: string) => {
  if (!value) return "";

  const datePart = value.includes("T") ? value.split("T")[0] : value;

  const date = new Date(datePart);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

const LocationWiseMispunchPage = () => {
  const user = useCurrentUser();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [date, setDate] = useState(() => {
    const today = new Date();

    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  });

  const [branches, setBranches] = useState<Option[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const [records, setRecords] = useState<MispunchItem[]>([]);

  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  const [search, setSearch] = useState("");

  const [branchLoading, setBranchLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [hasSearched, setHasSearched] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<MispunchItem | null>(
    null,
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // --------------------------------------------------
  // ALERT
  // --------------------------------------------------

  const showAlert = useCallback(
    (message: string, icon: "success" | "error" | "warning" | "info") => {
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon,
        title: message,
      });
    },
    [],
  );

  // --------------------------------------------------
  // HEADERS
  // --------------------------------------------------

  const requestHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code || "",
      name: user?.name || "",
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // IMAGE URL
  // --------------------------------------------------

  const getImageUrl = useCallback((docPath: string) => {
    if (!docPath) return "";

    if (docPath.startsWith("http://") || docPath.startsWith("https://")) {
      return docPath;
    }

    const imagePath = process.env.NEXT_PUBLIC_imagepath || "";

    return `${imagePath}${docPath}`;
  }, []);

  // --------------------------------------------------
  // FETCH BRANCHES
  // Existing API: /payout/payout
  // --------------------------------------------------

  const fetchBranches = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      setBranchLoading(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${BRANCH_API}`,
        {
          multi_loc: user?.branch,
        },
        {
          headers: requestHeaders,
        },
      );

      const rows = response.data?.branch || [];

      const formatted: Option[] = rows
        .map((item: any) => ({
          value: getText(
            item.value,
            item.Value,
            item.Loc_Code,
            item.Loc_code,
            item.Branch_Code,
            item.BranchCode,
            item.Code,
            item.code,
          ),
          label: getText(
            item.label,
            item.lable,
            item.Label,
            item.Loc_Name,
            item.Loc_Name1,
            item.Branch_Name,
            item.BranchName,
            item.Name,
            item.name,
          ),
        }))
        .filter((item: Option) => item.value && item.label);

      setBranches(formatted);

      // Select user's branch if available.
      const userBranch = String(user?.branch || "");

      const matchedBranch = formatted.find((item) => item.value === userBranch);

      if (matchedBranch) {
        setSelectedBranch(matchedBranch.value);
      } else if (formatted.length === 1) {
        setSelectedBranch(formatted[0].value);
      }
    } catch (error: any) {
      console.error("Branch API Error:", error);

      showAlert(
        error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Unable to load branches.",
        "error",
      );
    } finally {
      setBranchLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, requestHeaders, showAlert]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // --------------------------------------------------
  // GET PUNCH TIME
  // --------------------------------------------------

  const getPunchTime = (value: any) => {
    if (!value) return "";

    const text = String(value);

    if (text.includes("T")) {
      return text.split("T")[1]?.split(".")[0] || "";
    }

    if (text.includes(" ")) {
      return text.split(" ")[1]?.split(".")[0] || "";
    }

    return text;
  };

  // --------------------------------------------------
  // FORMAT MISPUNCH RECORDS
  // API returns separate IN and OUT arrays.
  // --------------------------------------------------

  const formatMispunchRecords = useCallback(
    (inImages: any[], outImages: any[]) => {
      const formatted: MispunchItem[] = [];

      const maxLength = Math.max(inImages.length, outImages.length);

      for (let index = 0; index < maxLength; index++) {
        if (index < inImages.length) {
          const item = inImages[index];

          formatted.push({
            id: getText(item.UTD, item.Id, item.id, `IN-${index}`),

            empCode: getText(
              item.EMP_CODE,
              item.EmpCode,
              item.EMPCODE,
              item.Emp_Code,
            ),

            empName: getText(
              item.EMP_NAME,
              item.EmpName,
              item.EmployeeName,
              item.Emp_Name,
            ),

            branchCode: getText(item.Loc_Code, item.Loc_code, selectedBranch),

            branchName: getText(
              item.Loc_Name,
              item.BranchName,
              item.Loc_Code,
              item.Loc_code,
              branches.find(
                (branch) =>
                  branch.value ===
                  getText(item.Loc_Code, item.Loc_code, selectedBranch),
              )?.label,
            ),

            date: getText(item.dateOffice, item.Date, item.PunchDate, date),

            time: getPunchTime(
              item.Created_Date || item.PunchTime || item.Time,
            ),

            type: "IN",

            selfieUrl: getImageUrl(
              getText(
                item.DOC_PATH,
                item.SelfieUrl,
                item.ImageUrl,
                item.Photo,
                item.Image,
              ),
            ),
          });
        }

        if (index < outImages.length) {
          const item = outImages[index];

          formatted.push({
            id: getText(item.UTD, item.Id, item.id, `OUT-${index}`),

            empCode: getText(
              item.EMP_CODE,
              item.EmpCode,
              item.EMPCODE,
              item.Emp_Code,
            ),

            empName: getText(
              item.EMP_NAME,
              item.EmpName,
              item.EmployeeName,
              item.Emp_Name,
            ),

            branchCode: getText(item.Loc_Code, item.Loc_code, selectedBranch),

            branchName: getText(
              item.Loc_Name,
              item.BranchName,
              item.Loc_Code,
              item.Loc_code,
              branches.find(
                (branch) =>
                  branch.value ===
                  getText(item.Loc_Code, item.Loc_code, selectedBranch),
              )?.label,
            ),

            date: getText(item.dateOffice, item.Date, item.PunchDate, date),

            time: getPunchTime(
              item.Created_Date || item.PunchTime || item.Time,
            ),

            type: "OUT",

            selfieUrl: getImageUrl(
              getText(
                item.DOC_PATH,
                item.SelfieUrl,
                item.ImageUrl,
                item.Photo,
                item.Image,
              ),
            ),
          });
        }
      }

      return formatted;
    },
    [branches, selectedBranch, date, getImageUrl],
  );

  // --------------------------------------------------
  // FETCH MISPUNCH RECORDS
  // Existing API: /employee/getLocationWiseMispunchData
  // Payload: Date, Loc_Code
  // --------------------------------------------------

  const fetchMispunchRecords = useCallback(async () => {
    if (!user?.Comp_Code) {
      showAlert("User information missing.", "error");
      return;
    }

    if (!date) {
      showAlert("Please select date.", "warning");
      return;
    }

    if (!selectedBranch) {
      showAlert("Please select branch.", "warning");
      return;
    }

    try {
      setDataLoading(true);
      setHasSearched(true);
      setRecords([]);
      setActiveFilter("ALL");

      const payload = {
        Date: date,
        Loc_Code: selectedBranch,
      };

      console.log("Location Wise Mispunch Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${MISPUNCH_API}`,
        payload,
        {
          headers: {
            ...requestHeaders,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Location Wise Mispunch Response:", response.data);

      if (response.data?.Status === "true" || response.data?.Status === true) {
        const result = response.data?.Result || {};

        const inImages = Array.isArray(result.in) ? result.in : [];

        const outImages = Array.isArray(result.out) ? result.out : [];

        const formatted = formatMispunchRecords(inImages, outImages);

        setRecords(formatted);

        if (Number(result.totalCount || 0) === 0 || formatted.length === 0) {
          showAlert("No mispunch records found.", "info");
        }
      } else {
        setRecords([]);

        showAlert(
          response.data?.Message ||
            response.data?.message ||
            "Unable to fetch mispunch records.",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Mispunch API Error:", error);

      setRecords([]);

      showAlert(
        error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Unable to fetch mispunch records.",
        "error",
      );
    } finally {
      setDataLoading(false);
    }
  }, [
    user?.Comp_Code,
    date,
    selectedBranch,
    requestHeaders,
    formatMispunchRecords,
    showAlert,
  ]);

  // --------------------------------------------------
  // FILTER COUNTS
  // --------------------------------------------------

  const counts = useMemo(
    () => ({
      ALL: records.length,
      IN: records.filter((item) => item.type === "IN").length,
      OUT: records.filter((item) => item.type === "OUT").length,
    }),
    [records],
  );

  // --------------------------------------------------
  // FILTER RECORDS
  // --------------------------------------------------

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((item) => {
      const matchesType = activeFilter === "ALL" || item.type === activeFilter;

      const matchesSearch =
        !query ||
        item.empName.toLowerCase().includes(query) ||
        item.empCode.toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [records, activeFilter, search]);

  // --------------------------------------------------
  // FILE UPLOAD / PREVIEW
  // --------------------------------------------------

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Please select an image file.", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showAlert("Image size should be below 5 MB.", "warning");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // --------------------------------------------------
  // FILTER BUTTON
  // --------------------------------------------------

  const FilterButton = ({
    type,
    label,
    count,
  }: {
    type: FilterType;
    label: string;
    count: number;
  }) => {
    const active = activeFilter === type;

    return (
      <button
        type="button"
        onClick={() => setActiveFilter(type)}
        className={`flex h-[34px] items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition ${
          active
            ? "bg-white text-[#172b4d] shadow-sm dark:bg-slate-700 dark:text-white"
            : "text-[#64748b] hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-700"
        }`}
      >
        {label}
        <span>{count}</span>
      </button>
    );
  };

  // --------------------------------------------------
  // SELFIE CARD
  // --------------------------------------------------

  const MispunchCard = ({ item }: { item: MispunchItem }) => {
    const [imageError, setImageError] = useState(false);

    return (
      <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
        {/* IMAGE */}
        <div className="relative flex h-[228px] items-center justify-center overflow-hidden border-b border-dashed border-[#b8c4d3] bg-[#e9edf1] dark:border-slate-600 dark:bg-slate-800">
          {item.selfieUrl && !imageError ? (
            <img
              src={item.selfieUrl}
              alt={`${item.empName} selfie`}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-center text-[#64748b] dark:text-slate-400">
              <ImageIcon size={28} strokeWidth={1.7} />
              <span className="text-[12px] font-semibold">Punch selfie</span>
              <span className="text-[11px]">No image available</span>
            </div>
          )}

          <span
            className={`absolute right-2.5 top-2.5 rounded-full px-3 py-1 text-[10px] font-bold ${
              item.type === "IN"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
            }`}
          >
            {item.type}
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedRecord(item);
              setSelectedFile(null);
              setPreviewUrl("");
            }}
            className="absolute bottom-2 right-2 rounded-md bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 shadow-sm hover:bg-white"
          >
            <Upload size={12} className="mr-1 inline" />
            Browse files
          </button>
        </div>

        {/* EMPLOYEE DETAILS */}
        <div className="p-3.5">
          <p className="truncate text-[14px] font-bold text-[#172b4d] dark:text-slate-100">
            {item.empName || "Employee"}
          </p>

          <p className="mt-1 truncate text-[12px] text-[#64748b] dark:text-slate-400">
            {item.empCode} &nbsp;·&nbsp; {item.branchName}
          </p>

          <div className="mt-2.5 flex items-center justify-between border-t border-[#e2e8f0] pt-2.5 dark:border-slate-700">
            <span className="text-[12px] text-[#64748b] dark:text-slate-400">
              {formatDate(item.date)}
            </span>

            <span className="text-[14px] font-bold tabular-nums text-[#172b4d] dark:text-slate-100">
              {item.time || "--:--:--"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-4 text-[#172b4d] dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* PAGE HEADER */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-bold text-[#172b4d] dark:text-slate-100">
              Location Wise Mispunch
            </h1>
          </div>
        </div>

        {/* FILTER PANEL */}
        <div className="mb-4 rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[215px_280px_auto_1fr]">
            {/* DATE */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Einput
                name="date"
                type="date"
                title="Date"
                redlabel="*"
                value={date}
                handleInputChange={(_name: string, value: any) =>
                  setDate(
                    typeof value === "string"
                      ? value
                      : value?.target?.value || "",
                  )
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* BRANCH */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100">
              <Eselect
                name="branch"
                redlabel="*"
                title="Branch"
                option={branches}
                initialValue={selectedBranch}
                handleInputChange={(_name: string, value: any) => {
                  setSelectedBranch(
                    typeof value === "string"
                      ? value
                      : value?.target?.value || "",
                  );
                }}
                className="h-[40px] w-full"
              />

              {branchLoading && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Loading branches...
                </p>
              )}
            </div>

            {/* SHOW */}
            <div>
              <AButton
                type="button"
                onClick={fetchMispunchRecords}
                disabled={dataLoading || branchLoading}
                className="inline-flex h-[40px] min-w-[78px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-[12px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {dataLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Show"
                )}
              </AButton>
            </div>

            {/* SEARCH */}
            <div className="relative md:ml-auto md:w-[258px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or code..."
                className="h-[41px] w-full rounded-lg border border-[#dce5f1] bg-white pl-9 pr-3 text-[12px] text-[#172b4d] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* SUMMARY + FILTER */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[#64748b] dark:text-slate-400">
            <span className="font-bold text-[#172b4d] dark:text-slate-100">
              {filteredRecords.length}
            </span>{" "}
            mispunches
            {selectedBranch
              ? ` · ${branches.find((item) => item.value === selectedBranch)?.label || ""}`
              : ""}
            {date ? ` · ${formatDate(date)}` : ""}
          </p>

          <div className="flex items-center gap-1 rounded-xl bg-[#eef2f7] p-1 dark:bg-slate-800">
            <FilterButton type="ALL" label="All" count={counts.ALL} />

            <FilterButton type="IN" label="In" count={counts.IN} />

            <FilterButton type="OUT" label="Out" count={counts.OUT} />
          </div>
        </div>

        {/* RECORDS */}
        {dataLoading ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-[#dce5f1] bg-white dark:border-slate-700 dark:bg-slate-900">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-600 border-t-transparent" />
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Loading mispunch records...
            </p>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRecords.map((item) => (
              <MispunchCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-[#dce5f1] bg-white text-center dark:border-slate-700 dark:bg-slate-900">
            <CalendarDays
              size={32}
              className="mb-3 text-slate-300 dark:text-slate-600"
            />

            <p className="text-[14px] font-semibold text-[#172b4d] dark:text-slate-200">
              {hasSearched
                ? "No mispunch records found"
                : "Select filters to view mispunch records"}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              {hasSearched
                ? "Try changing the date, branch or search."
                : "Choose a date and branch, then click Show."}
            </p>

            {hasSearched && (
              <button
                type="button"
                onClick={fetchMispunchRecords}
                className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            )}
          </div>
        )}
      </div>

      {/* SELFIE PREVIEW / FILE SELECT MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-[#172b4d] dark:text-slate-100">
                  Punch Selfie
                </h3>

                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedRecord.empName} · {selectedRecord.empCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRecord(null);
                  clearSelectedFile();
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected selfie"
                  className="max-h-[280px] w-full object-contain"
                />
              ) : selectedRecord.selfieUrl ? (
                <img
                  src={selectedRecord.selfieUrl}
                  alt="Punch selfie"
                  className="max-h-[280px] w-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon size={32} className="mx-auto mb-2" />
                  <p className="text-[12px]">Select an image to preview</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-[37px] items-center gap-2 rounded-lg border border-[#dce5f1] px-3 text-[12px] font-semibold text-[#172b4d] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Upload size={14} />
                Browse files
              </button>

              {selectedFile && (
                <span className="max-w-[150px] truncate text-[11px] text-slate-500">
                  {selectedFile.name}
                </span>
              )}
            </div>

            <p className="mt-3 text-[10px] text-slate-400">
              Image preview only. Upload/save requires the backend upload API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationWiseMispunchPage;
