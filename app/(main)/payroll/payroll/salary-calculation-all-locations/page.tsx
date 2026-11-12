
"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import { Search, Calculator, Lock, Check } from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type LocationItem = {
  id: string;
  name: string;
  cluster: string;
  empCount: number;
  totalEmployees: number;
  activeEmployees: number;
  isReady: boolean;
  isBlocked: boolean;
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

const YEAR_OPTIONS: Option[] = Array.from(
  { length: 10 },
  (_, i) => {
    const value = String(new Date().getFullYear() - i);
    return { value, label: value };
  }
);

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Something went wrong. Please try again.";

const escapeHtml = (value: any) =>
  String(value ?? "—").replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[char];
  });

export default function SalaryCalculationByLocationPage() {
  const user = useCurrentUser();

  const [loading, setLoading] = useState(false);

  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1)
  );

  const [year, setYear] = useState(
    String(new Date().getFullYear())
  );

  const [search, setSearch] = useState("");

  const [channels, setChannels] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [region, setRegion] = useState("");

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  const [channelOptions, setChannelOptions] = useState<Option[]>([]);
  const [clusterOptions, setClusterOptions] = useState<Option[]>([]);
  const [regionOptions, setRegionOptions] = useState<Option[]>([]);

  const [lockedLocationIds, setLockedLocationIds] = useState<string[]>([]);

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name]
  );

  // -----------------------------------------
  // INPUT HANDLING
  // -----------------------------------------

  const handleInputChange = (name: string, value: any) => {
    if (name === "month") {
      setMonth(String(value ?? ""));
    }

    if (name === "year") {
      setYear(String(value ?? ""));
    }

    if (name === "search") {
      setSearch(String(value ?? ""));
    }
  };

  // -----------------------------------------
  // LOCATION MAPPING
  // Aggregate records using Location only.
  // Region is intentionally ignored here.
  // -----------------------------------------

 
const mapLocationData = useCallback(
  (rows: any[]): LocationItem[] => {
    const locationMap = new Map<string, LocationItem>();

    (Array.isArray(rows) ? rows : []).forEach((location: any) => {

      // API response uppercase LOCATION support
      const id = getText(
        location.LOCATION,
        location.Location,
        location.location,
        location.location_code,
        location.location_id,
        location.Loc_Code,
        location.LocCode,
        location.id
      );

      if (!id) return;

      const totalEmployees = Number(
        location.TOTAL_EMPLOYEES ??
        location.totalEmployees ??
        location.total_employees ??
        0
      );

      const activeEmployees = Number(
        location.ACTIVE_EMPLOYEES ??
        location.activeEmployees ??
        location.active_employees ??
        location.LASTWORKING_NULL_COUNT ??
        location.lastWorkingNullCount ??
        totalEmployees
      );

      const existing = locationMap.get(id);

      if (existing) {
        existing.totalEmployees += totalEmployees;
        existing.activeEmployees += activeEmployees;
        existing.empCount = existing.totalEmployees;
        return;
      }

      const isBlocked =
        Boolean(location.isBlocked) ||
        Boolean(location.IsBlocked) ||
        lockedLocationIds.includes(String(id));

      const readyValue =
        location.isReady ??
        location.IsReady ??
        location.Ready ??
        location.Status;

      locationMap.set(id, {
        id: String(id),

        name:
          getText(
            location.LOCATION_NAME,
            location.location_name,
            location.label,
            location.loc_name,
            location.Loc_Name,
            location.LocationName,
            location.name
          ) || `LOCATION - ${id}`,

        cluster: getText(
          location.cluster,
          location.Cluster,
          location.ClusterName
        ),

        empCount: totalEmployees,
        totalEmployees,
        activeEmployees,

        isReady:
          readyValue === undefined
            ? true
            : readyValue === true ||
              readyValue === 1 ||
              readyValue === "1" ||
              readyValue === "Y",

        isBlocked,
      });
    });

    return Array.from(locationMap.values());
  },
  [lockedLocationIds]
);


  // -----------------------------------------
  // FETCH CHANNEL / CLUSTER / REGION MASTERS
  // -----------------------------------------

  const fetchMasterData = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: apiHeaders,
        }
      );

      const masters = response?.data?.data || {};

      const convertValuesToString = (array: any[]): Option[] => {
        if (!Array.isArray(array)) return [];

        return array
          .map((obj: any) => ({
            label: String(obj.label ?? obj.Label ?? ""),
            value: String(obj.value ?? obj.Value ?? ""),
          }))
          .filter((item: Option) => item.value && item.label);
      };

      setChannelOptions(
        convertValuesToString(masters.CHANNEL1)
      );

      setClusterOptions(
        convertValuesToString(masters.CLUSTER1)
      );

      setRegionOptions(
        convertValuesToString(masters.Sal_Region)
      );
    } catch (error) {
      console.error("Master API error:", error);

      Swal.fire({
        icon: "error",
        title: "Master data error",
        text: getApiError(error),
      });
    }
  }, [apiHeaders, user?.Comp_Code]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // -----------------------------------------
  // FETCH LOCATIONS + EMPLOYEE COUNTS
  // -----------------------------------------

const fetchLocationData = useCallback(async () => {
  if (!user?.EMPCODE || !user?.Comp_Code) return;

  try {
    setLoading(true);

    const locationsArray = user?.branch
      ? String(user.branch)
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean)
      : [];

    if (locationsArray.length === 0) {
      setLocations([]);
      setSelectedLocations([]);
      return;
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/ars/getEmployeeCountByBranchRegion`,

      // POST BODY
      {},

      // HEADERS + QUERY PARAMS
      {
        headers: apiHeaders,
        params: {
          groupBy: "LOCATION",
          branch: locationsArray.join(","),
          region: region || "",
        },
      }
    );

    const result = response?.data?.data || [];

    if (
      response?.data?.success !== true ||
      !Array.isArray(result)
    ) {
      setLocations([]);
      setSelectedLocations([]);
      return;
    }

    const allowedLocations = new Set(
      locationsArray.map((item) => String(item))
    );

    const filteredResult = result.filter((item: any) => {
      const locationCode = getText(
        item.LOCATION,
        item.Location,
        item.location,
        item.location_code,
        item.Loc_Code,
        item.LocCode
      );

      return (
        locationCode &&
        allowedLocations.has(String(locationCode))
      );
    });

    const mappedLocations = mapLocationData(filteredResult);

    setLocations(mappedLocations);

    setSelectedLocations((prev) =>
      prev.filter((id) =>
        mappedLocations.some(
          (loc) => loc.id === id && !loc.isBlocked
        )
      )
    );

  } catch (error) {
    console.error("Location API error:", error);

    Swal.fire({
      icon: "error",
      title: "Location fetching error",
      text: getApiError(error),
    });
  } finally {
    setLoading(false);
  }
}, [
  user?.EMPCODE,
  user?.Comp_Code,
  user?.branch,
  apiHeaders,
  region,
  mapLocationData,
]);

useEffect(() => {
  if (user?.branch && user?.EMPCODE && user?.Comp_Code) {
    fetchLocationData();
  }
}, [
  user?.branch,
  user?.EMPCODE,
  user?.Comp_Code,
  fetchLocationData,
]);


  // -----------------------------------------
  // ALREADY PROCESSED SALARY CHECK
  // -----------------------------------------

  const fetchAlreadyProcessedData = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/SalaryLock/AlredyProcess_Slry_cal`,
        {
          locations: user.branch,
        },
        {
          headers: apiHeaders,
        }
      );

      const data = response?.data;

      const rows = Array.isArray(data?.result)
        ? data.result
        : [];

      if (data?.Status && data?.modelVisible) {
        const tableRows = rows
          .map(
            (row: any) => `
              <tr>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(row.Emp_Code)}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(row.Rerun)}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(row.loc_name)}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(row.Created_by)}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${
                    row.Created_At
                      ? escapeHtml(
                          new Date(row.Created_At).toLocaleString("en-IN")
                        )
                      : "—"
                  }
                </td>
              </tr>
            `
          )
          .join("");

        await Swal.fire({
          icon: "info",
          title: "Salary calculation already in progress",
          width: "1100px",
          html: `
            <div style="text-align:left">
              <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:16px;font-size:13px">
                <p><b>Total Pending Employees:</b> ${escapeHtml(
                  data?.total_emp || 0
                )}</p>
                <p><b>Estimated Waiting Time:</b> ${escapeHtml(
                  data?.estimated_time || "0 minutes"
                )}</p>
              </div>

              <div style="max-height:350px;overflow:auto">
                <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">
                  <thead>
                    <tr style="background:#f1f5f9">
                      <th style="padding:9px">Emp Code</th>
                      <th style="padding:9px">Month</th>
                      <th style="padding:9px">Location</th>
                      <th style="padding:9px">Imported By</th>
                      <th style="padding:9px">Imported On</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      tableRows ||
                      "<tr><td colspan='5' style='padding:12px'>No records found</td></tr>"
                    }
                  </tbody>
                </table>
              </div>
            </div>
          `,
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Already Process API error:", error);
    }
  }, [apiHeaders, user?.Comp_Code, user?.branch]);

  useEffect(() => {
    fetchAlreadyProcessedData();
  }, [fetchAlreadyProcessedData]);

  // -----------------------------------------
  // LOCATION SELECTION
  // -----------------------------------------

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();

    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.cluster.toLowerCase().includes(q) ||
        loc.id.toLowerCase().includes(q)
    );
  }, [locations, search]);

  const availableLocations = useMemo(
    () => filteredLocations.filter((loc) => !loc.isBlocked),
    [filteredLocations]
  );

  const toggleSelectAll = () => {
    const availableIds = availableLocations.map(
      (loc) => loc.id
    );

    const allSelected =
      availableIds.length > 0 &&
      availableIds.every((id) =>
        selectedLocations.includes(id)
      );

    if (allSelected) {
      setSelectedLocations((prev) =>
        prev.filter((id) => !availableIds.includes(id))
      );
    } else {
      setSelectedLocations((prev) =>
        Array.from(new Set([...prev, ...availableIds]))
      );
    }
  };

  const toggleSelectLocation = (id: string) => {
    const location = locations.find((loc) => loc.id === id);

    if (location?.isBlocked) {
      Swal.fire({
        icon: "warning",
        title: "Location already locked",
        text: "This location cannot be selected.",
      });

      return;
    }

    setSelectedLocations((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const blockedCount = useMemo(
    () => locations.filter((location) => location.isBlocked).length,
    [locations]
  );

  // -----------------------------------------
  // RUN SALARY CALCULATION
  // -----------------------------------------

  const handleRunSalaryCalculation = async () => {
    if (!user?.Comp_Code || !user?.branch) {
      Swal.fire({
        icon: "warning",
        title: "User details missing",
        text: "Company code or branch information is not available.",
      });

      return;
    }

    if (!month) {
      Swal.fire({
        icon: "warning",
        title: "Month required",
        text: "Please select a month.",
      });

      return;
    }

    if (!year || !/^\d{4}$/.test(year)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid year",
        text: "Please enter a valid four-digit year.",
      });

      return;
    }

    if (selectedLocations.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No location selected",
        text: "Select at least one location to run salary calculation.",
      });

      return;
    }

    const selectedLocationNumbers = selectedLocations
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (
      selectedLocationNumbers.length !== selectedLocations.length
    ) {
      Swal.fire({
        icon: "error",
        title: "Invalid location",
        text: "One or more selected location codes are invalid.",
      });

      return;
    }

    const blockedSelected = locations.filter(
      (loc) =>
        selectedLocations.includes(loc.id) && loc.isBlocked
    );

    if (blockedSelected.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Locked locations selected",
        text: "Please remove locked locations before continuing.",
      });

      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Run salary calculation?",
      html: `
        <div style="text-align:left;font-size:13px">
          <p><b>Month:</b> ${escapeHtml(
            MONTHS.find((item) => item.value === month)?.label
          )} ${escapeHtml(year)}</p>
          <p><b>Total Locations:</b> ${selectedLocationNumbers.length}</p>
          <p><b>Total Employees:</b> ${locations
            .filter((loc) => selectedLocations.includes(loc.id))
            .reduce((sum, loc) => sum + loc.totalEmployees, 0)
            .toLocaleString("en-IN")}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, Run Calculation",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#475569",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setLoading(true);

      const payload = {
        MONTH: month,
        locations: selectedLocationNumbers,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/SalaryLock/emp_slryrun_byLoction`,
        payload,
        {
          headers: apiHeaders,
        }
      );

      const data = response?.data;

      if (data?.success) {
        await Swal.fire({
          icon: "success",
          title: "Salary calculation initiated",
          text:
            data?.message ||
            "Salary calculation initiated successfully.",
          confirmButtonText: "OK",
        });

        setSelectedLocations([]);
      } else if (data?.warning) {
        await Swal.fire({
          icon: "warning",
          title: "Salary calculation warning",
          text: data.warning,
          confirmButtonText: "OK",
        });
      } else {
        throw new Error(
          data?.message ||
            data?.Message ||
            "Failed to initiate salary calculation."
        );
      }

      if (Array.isArray(data?.lockedLocations)) {
        const lockedRows = data.lockedLocations;

        const lockedIds = lockedRows
          .map((loc: any) =>
            getText(
              loc.value,
              loc.Location,
              loc.Loc_Code,
              loc.LocCode,
              loc.location_id,
              loc.id
            )
          )
          .filter(Boolean);

        setLockedLocationIds(lockedIds);

        setLocations((prev) =>
          prev.map((loc) => ({
            ...loc,
            isBlocked:
              lockedIds.includes(loc.id) || loc.isBlocked,
          }))
        );

        if (lockedRows.length > 0) {
          const lockedNames = lockedRows
            .map((loc: any) =>
              getText(
                loc.label,
                loc.loc_name,
                loc.Loc_Name,
                loc.name,
                loc.Location,
                loc.value
              )
            )
            .filter(Boolean);

          await Swal.fire({
            icon: "warning",
            title: "Already updated salary locations",
            html: `
              <div style="text-align:left;max-height:250px;overflow:auto">
                <ul style="padding-left:20px;list-style:disc">
                  ${
                    lockedNames.length
                      ? lockedNames
                          .map(
                            (name: string) =>
                              `<li style="padding:4px">${escapeHtml(name)}</li>`
                          )
                          .join("")
                      : "<li>Some locations are already locked.</li>"
                  }
                </ul>
              </div>
            `,
            confirmButtonText: "OK",
          });
        }
      }

      if (data?.warning && data?.success) {
        await Swal.fire({
          icon: "warning",
          title: "Warning",
          text: data.warning,
          confirmButtonText: "OK",
        });
      }

      await fetchLocationData();
      await fetchAlreadyProcessedData();
    } catch (error) {
      console.error("Salary calculation API error:", error);

      Swal.fire({
        icon: "error",
        title: "Execution Error",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-6">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto min-w-0 max-w-[1800px] space-y-4">

        {/* PAGE HEADER */}

        <div className="min-w-0">
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Salary calculation by location
          </h1>

          <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400 sm:text-[13px]">
            Select filters and locations to run salary calculation.
          </p>
        </div>

        {/* FILTER PANEL */}

        <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <div className="min-w-0">
              <Eselect
                title="CHANNEL"
                name="channel"
                option={channelOptions}
                initialValue={channels[0] || ""}
                handleInputChange={(name: string, value: any) => {
                  setChannels(value ? [String(value)] : []);
                  setSelectedLocations([]);
                }}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="CLUSTER"
                name="cluster"
                option={clusterOptions}
                initialValue={clusters[0] || ""}
                handleInputChange={(name: string, value: any) => {
                  setClusters(value ? [String(value)] : []);
                  setSelectedLocations([]);
                }}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="REGION"
                name="region"
                option={regionOptions}
                initialValue={region}
                handleInputChange={(name: string, value: any) => {
                  setRegion(value ? String(value) : "");
                  setSelectedLocations([]);
                }}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="MONTH"
                redlabel="*"
                name="month"
                option={MONTHS}
                initialValue={month}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="YEAR"
                name="year"
                option={YEAR_OPTIONS}
                initialValue={year}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>

          </div>
        </div>

        {/* LOCATION LIST */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-3 border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="checkbox"
                checked={
                  availableLocations.length > 0 &&
                  availableLocations.every((loc) =>
                    selectedLocations.includes(loc.id)
                  )
                }
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-[#dce5f1] text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />

              <span className="text-[13px] font-semibold text-[#152b4b] dark:text-slate-100">
                Locations
              </span>

              <span className="text-[12px] text-[#64748b] dark:text-slate-400">
                {locations.length} available · {blockedCount} blocked
              </span>

              {selectedLocations.length > 0 && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {selectedLocations.length} selected
                </span>
              )}
            </div>

            <div className="relative w-full sm:w-[240px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search locations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-[36px] w-full rounded-lg border border-[#dce5f1] bg-white pl-8 pr-3 text-[12px] text-[#152b4b] outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

          </div>

          {/* LOCATION ROWS */}

          <div className="divide-y divide-[#e8edf5] dark:divide-slate-800">

            {filteredLocations.map((loc) => {
              const isChecked = selectedLocations.includes(loc.id);

              return (
                <div
                  key={loc.id}
                  onClick={() => toggleSelectLocation(loc.id)}
                  className={`flex flex-col gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between ${
                    isChecked
                      ? "bg-slate-50/70 dark:bg-slate-800/40"
                      : ""
                  }`}
                >

                  <div className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectLocation(loc.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 shrink-0 rounded border-[#dce5f1] text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                    />

                    <span className="break-words text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                      {loc.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">

                    <span className="text-[11px] text-[#64748b] dark:text-slate-400">
                      {loc.cluster || "—"}
                    </span>

                    {/* TOTAL EMPLOYEES - LOCATION WISE */}

                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      Total Employees:{" "}
                      {loc.totalEmployees.toLocaleString("en-IN")}
                    </span>

                    {loc.isBlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                        <Lock size={13} />
                        Locked
                      </span>
                    ) : loc.isReady ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <Check size={13} />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                        Not Ready
                      </span>
                    )}

                  </div>
                </div>
              );
            })}

            {!loading && filteredLocations.length === 0 && (
              <div className="px-4 py-10 text-center text-[12px] text-[#64748b] dark:text-slate-400">
                No locations found.
              </div>
            )}

          </div>

          {/* FOOTER / ACTION */}

          <div className="flex flex-col gap-3 border-t border-[#e8edf5] p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">

            <div>
              {selectedLocations.length === 0 ? (
                <p className="text-[12px] font-medium text-rose-500">
                  Select at least one location
                </p>
              ) : (
                <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                  {selectedLocations.length} location(s) selected for calculation
                </p>
              )}
            </div>

            <AButton
              type="button"
              onClick={handleRunSalaryCalculation}
              disabled={
                loading || selectedLocations.length === 0
              }
              className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#475569] px-5 text-[12px] font-semibold text-white transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Calculator size={16} />
              Run salary calculation
            </AButton>

          </div>
        </div>
      </div>
    </div>
  );
}
