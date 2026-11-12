"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Lock,
  Unlock,
  Search,
  Calculator,
  HandCoins,
  FileCheck,
  ShieldCheck,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";

type Location = {
  id: string;
  name: string;
  city: string;
  employees: number;
  channel: string;
  cluster: string;
  region: string;
  lockDate: string;
  raw: any;
};

type LockedLocation = {
  id: string;
  name: string;
  city: string;
  lockDate: string;
};

type FilterOption = {
  value: string;
  label: string;
};

const API_URL = process.env.NEXT_PUBLIC_URL;

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (date: string) => {
  if (!date) return "";

  const normalized = String(date).slice(0, 10);
  const [year, month, day] = normalized.split("-");

  if (!year || !month || !day) return date;

  return `${day} ${new Date(Number(year), Number(month) - 1).toLocaleString(
    "en-IN",
    { month: "short" },
  )} ${year}`;
};

const getLastMonthEnd = () => {
  const date = new Date();
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 0));
};

const getThisMonthEnd = () => {
  const date = new Date();
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
};

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toISODate(date);
};

const getText = (...values: any[]) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim() !== "",
  );

  return value === undefined ? "" : String(value).trim();
};

const getDateValue = (value: any) => {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return "";

  return toISODate(date);
};

const getRows = (response: any): any[] => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.recordset)) return data.recordset;
  if (Array.isArray(data?.data?.recordset)) return data.data.recordset;

  return [];
};

const getBranchCode = (item: any) =>
  getText(
    item.BRANCH,
    item.BRANCH_CODE,
    item.Branch,
    item.Branch_Code,
    item.LOCATION,
    item.LOCATION_CODE,
    item.Loc_Code,
    item.LocCode,
    item.location_id,
    item.LocationCode,
    item.value,
    item.id,
  );

const getEmployeeCount = (item: any) => {
  const value =
    item.TOTAL_EMPLOYEES ??
    item.TOTAL_EMPLOYEE ??
    item.TotalEmployees ??
    item.TotalEmployee ??
    item.Total_Employees ??
    item.total_employees ??
    item.total_employee ??
    item.total_emp ??
    item.EMPLOYEE_COUNT ??
    item.EmployeeCount ??
    item.employee_count ??
    item.EMP_COUNT ??
    item.emp_count ??
    item.employees ??
    0;

  const count = Number(value);

  return Number.isFinite(count) ? count : 0;
};

function InfoItem({
  icon: Icon,
  title,
  description,
  iconClass,
  bgClass,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  iconClass: string;
  bgClass: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bgClass}`}
      >
        <Icon size={14} className={iconClass} />
      </div>

      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] leading-[17px] text-[#64748b] dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SalaryLockPage() {
  const user = useCurrentUser();
  const compdata = useSecureStorage();

  const [locations, setLocations] = useState<Location[]>([]);
  const [lockedLocations, setLockedLocations] = useState<LockedLocation[]>([]);

  const [channel, setChannel] = useState("");
  const [cluster, setCluster] = useState("");
  const [region, setRegion] = useState("");
  const [lockDate, setLockDate] = useState(toISODate(new Date()));
  const [search, setSearch] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [channelOptions, setChannelOptions] = useState<FilterOption[]>([]);
  const [clusterOptions, setClusterOptions] = useState<FilterOption[]>([]);
  const [regionOptions, setRegionOptions] = useState<FilterOption[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const headers = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name],
  );

  const branchLocations = useMemo(() => {
    if (!user?.branch) return [];

    return String(user.branch)
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }, [user?.branch]);

  // --------------------------------------------------
  // MAP LOCATION RESPONSE
  // --------------------------------------------------
  const mapLocationData = useCallback((rows: any[]): Location[] => {
    return (Array.isArray(rows) ? rows : [])
      .map((item: any) => {
        const id = getText(
          item.value,
          item.Loc_Code,
          item.LocCode,
          item.location_id,
          item.LocationCode,
          item.id,
        );

        if (!id) return null;

        const name = getText(
          item.label,
          item.loc_name,
          item.Loc_Name,
          item.LocationName,
          item.location_name,
          item.BranchName,
          item.name,
        );

        const city = getText(
          item.city,
          item.City,
          item.Loc_City,
          item.LocationCity,
        );

        return {
          id,
          name: name || `Location ${id}`,
          city,
          employees: Number(
            item.TotalEmployees ??
              item.TotalEmployee ??
              item.Total_Employees ??
              item.employees ??
              0,
          ),
          channel: getText(item.Channel, item.channel, item.ChannelName),
          cluster: getText(item.Cluster, item.cluster, item.ClusterName),
          region: getText(
            item.Region,
            item.region,
            item.RegionName,
            item.Sal_Region,
            item.sal_region,
          ),
          lockDate: getDateValue(
            item.Lock_Date ?? item.lockDate ?? item.Join_Date,
          ),
          raw: item,
        } as Location;
      })
      .filter(Boolean) as Location[];
  }, []);

  // --------------------------------------------------
  // FETCH MASTER DATA
  // --------------------------------------------------
  const fetchMasters = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      const response = await axios.post(
        `${API_URL}/employee/masters`,
        {},
        { headers },
      );

      const data = response?.data?.data || {};

      const mapOptions = (items: any[]): FilterOption[] => {
        return (Array.isArray(items) ? items : [])
          .map((item: any) => {
            const value = getText(
              item.value,
              item.Value,
              item.code,
              item.Code,
              item.id,
              item.ID,
            );

            const label = getText(
              item.label,
              item.labelName,
              item.name,
              item.Name,
              value,
            );

            return value && label ? { value, label } : null;
          })
          .filter(Boolean) as FilterOption[];
      };

      setRegionOptions(mapOptions(data.Sal_Region));

      setChannelOptions(
        mapOptions(data.CHANNEL1 || data.Channel || data.CHANNEL),
      );

      setClusterOptions(
        mapOptions(data.CLUSTER1 || data.Cluster || data.CLUSTER),
      );
    } catch (error: any) {
      console.error("Salary lock masters error:", error);

      Swal.fire(
        "Error",
        error?.response?.data?.message || "Unable to load master data.",
        "error",
      );
    }
  }, [user?.Comp_Code, headers]);


  // --------------------------------------------------
  // FETCH BRANCH EMPLOYEE COUNTS
  // --------------------------------------------------

const fetchBranchEmployeeCounts = useCallback(async () => {
  const countMap = new Map<string, number>();

  if (!user?.Comp_Code || branchLocations.length === 0) {   
    return countMap;
  }

  try {
    const response = await axios.postt(
      `${process.env.NEXT_PUBLIC_URL_local}/ars/getEmployeeCountByBranchRegion`,
      {
        params: {
          branch: branchLocations.join(","),
          region: region || undefined,
          groupBy: "LOCATION",
        },
        headers,
      }
    );

    const rows = response?.data?.data || [];

    if (Array.isArray(rows)) {
      rows.forEach((item: any) => {
        const code = getText(
          item.LOCATION,
          item.Location,
          item.location,
          item.BRANCH,
          item.BRANCH_CODE
        );

        if (code) {
          countMap.set(String(code), getEmployeeCount(item));
        }
      });
    }

    return countMap;
  } catch (error: any) {
    console.error(
      "Branch employee count API error:",
      error?.response?.data || error
    );

    return countMap;
  }
}, [user?.Comp_Code, branchLocations, region, headers]);



  // --------------------------------------------------
  // FETCH LOCATIONS + BRANCH EMPLOYEE COUNTS
  // --------------------------------------------------
  const fetchLocationData = useCallback(async () => {
    if (!user?.Comp_Code || branchLocations.length === 0) {
      setLocations([]);
      setLockedLocations([]);
      setSelectedLocations([]);
      return;
    }

    setIsLoading(true);

    try {
      const [locationResponse, employeeCountMap] = await Promise.all([
        axios.post(
          `${API_URL}/SalaryLock/getLocationsByRegion`,
          {
            locations: branchLocations,
            Channel: channel || null,
            Cluster: cluster || null,
            Region: region || null,
          },
          { headers },
        ),
        fetchBranchEmployeeCounts(),
      ]);

      const rows = locationResponse?.data?.results || [];
      const mappedLocations = mapLocationData(rows).map((location) => {
        const branchCount = employeeCountMap.get(location.id);

        return {
          ...location,
          employees:
            branchCount !== undefined ? branchCount : location.employees,
        };
      });

      setLocations(mappedLocations);

      const locked = mappedLocations
        .filter((item) => Boolean(item.lockDate))
        .map((item) => ({
          id: item.id,
          name: item.name,
          city: item.city,
          lockDate: item.lockDate,
        }));

      setLockedLocations(locked);

      const availableIds = new Set(
        mappedLocations.filter((item) => !item.lockDate).map((item) => item.id),
      );

      setSelectedLocations((previous) =>
        previous.filter((id) => availableIds.has(id)),
      );
    } catch (error: any) {
      console.error("Salary lock locations error:", error);

      setLocations([]);
      setLockedLocations([]);

      Swal.fire(
        "Error",
        error?.response?.data?.message || "Unable to fetch locations.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.Comp_Code,
    branchLocations,
    channel,
    cluster,
    region,
    headers,
    mapLocationData,
    fetchBranchEmployeeCounts,
  ]);

  useEffect(() => {
    if (!user?.Comp_Code) return;

    fetchMasters();
  }, [user?.Comp_Code, fetchMasters]);

  useEffect(() => {
    if (!user?.Comp_Code || branchLocations.length === 0) return;

    fetchLocationData();
  }, [
    user?.Comp_Code,
    branchLocations,
    channel,
    cluster,
    region,
    fetchLocationData,
  ]);

  // --------------------------------------------------
  // FILTER HANDLING
  // --------------------------------------------------
  const handleFilterChange = (name: string, value: any) => {
    const val = String(value ?? "");

    if (name === "channel") setChannel(val);
    if (name === "cluster") setCluster(val);
    if (name === "region") setRegion(val);
    if (name === "lockDate") setLockDate(val);
    if (name === "search") setSearch(val);
  };

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return locations.filter((location) => {
      return (
        (!channel || location.channel === channel) &&
        (!cluster || location.cluster === cluster) &&
        (!region || location.region === region) &&
        (!query ||
          location.name.toLowerCase().includes(query) ||
          location.city.toLowerCase().includes(query))
      );
    });
  }, [locations, channel, cluster, region, search]);

  const isLocked = (id: string) =>
    lockedLocations.some((item) => item.id === id);

  const selectedCount = selectedLocations.length;

  const selectableLocations = filteredLocations.filter(
    (location) => !isLocked(location.id),
  );

  const allVisibleSelected =
    selectableLocations.length > 0 &&
    selectableLocations.every((location) =>
      selectedLocations.includes(location.id),
    );

  const selectedEmployeeCount = useMemo(
    () =>
      locations
        .filter((location) => selectedLocations.includes(location.id))
        .reduce((total, location) => total + location.employees, 0),
    [locations, selectedLocations],
  );

  const visibleEmployeeCount = useMemo(
    () =>
      filteredLocations.reduce(
        (total, location) => total + location.employees,
        0,
      ),
    [filteredLocations],
  );

  const toggleLocation = (id: string) => {
    if (isLocked(id)) return;

    setSelectedLocations((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const toggleAll = () => {
    const ids = selectableLocations.map((location) => location.id);

    if (ids.every((id) => selectedLocations.includes(id))) {
      setSelectedLocations((previous) =>
        previous.filter((id) => !ids.includes(id)),
      );
    } else {
      setSelectedLocations((previous) =>
        Array.from(new Set([...previous, ...ids])),
      );
    }
  };

  const clearSelection = () => setSelectedLocations([]);

  const quickSetDate = (type: string) => {
    if (type === "lastMonth") setLockDate(getLastMonthEnd());
    if (type === "yesterday") setLockDate(getYesterday());
    if (type === "thisMonth") setLockDate(getThisMonthEnd());
  };

  // --------------------------------------------------
  // UPDATE LOCATION LOCK DATE
  // --------------------------------------------------
  const handleUpdateLocation = async (date: string | null) => {
    try {
      const numericLocations = selectedLocations
        .map(Number)
        .filter(Number.isFinite);

      if (!numericLocations.length) {
        Swal.fire(
          "Select locations",
          "Please select valid locations.",
          "warning",
        );
        return false;
      }

      const response = await axios.post(
        `${API_URL}/SalaryLock/updateLocationDate`,
        {
          regionCode: region || null,
          joinDate: date,
          selectedLocations: numericLocations,
        },
        { headers },
      );

      const result = response?.data;

      if (result?.Status) {
        setSelectedLocations([]);

        await Swal.fire({
          icon: "success",
          title: date ? "Salary locked" : "Location unlocked",
          text:
            result?.message ||
            (date
              ? `${numericLocations.length} location(s) locked successfully.`
              : "Location unlocked successfully."),
          timer: 1600,
          showConfirmButton: false,
        });

        await fetchLocationData();
        return true;
      }

      Swal.fire(
        "Unable to update",
        result?.message || "Salary lock update failed.",
        "error",
      );

      return false;
    } catch (error: any) {
      console.error("Salary lock update error:", error);

      Swal.fire(
        "Error",
        error?.response?.data?.message || "Unable to update salary lock.",
        "error",
      );

      return false;
    }
  };

  // --------------------------------------------------
  // SALARY LOCK + BACKDATE OTP
  // --------------------------------------------------
  const handleUpdateClick = async () => {
    if (!region) {
      Swal.fire("Select region", "Please select a region.", "warning");
      return;
    }

    if (!lockDate) {
      Swal.fire("Select date", "Please select a valid lock date.", "warning");
      return;
    }

    if (!selectedLocations.length) {
      Swal.fire(
        "Select locations",
        "Please select at least one location.",
        "warning",
      );
      return;
    }

    const selected = locations.filter((location) =>
      selectedLocations.includes(location.id),
    );

    if (!selected.length) {
      Swal.fire(
        "No locations",
        "Selected locations are not available.",
        "warning",
      );
      return;
    }

    const confirmResult = await Swal.fire({
      icon: "warning",
      title: "Apply salary lock?",
      html: `
        <div style="text-align:left;font-size:12px;line-height:1.8">
          <p><b>Selected locations:</b> ${selected.length}</p>
          <p><b>Total employees:</b> ${selectedEmployeeCount}</p>
          <p><b>Lock date:</b> ${formatDate(lockDate)}</p>
          <p><b>Locations:</b> ${selected.map((item) => item.name).join(", ")}</p>
          <p style="color:#e11d48;margin-top:8px">
            Salary recalculation and changes to the locked month will be blocked.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, Lock Salary",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
    });

    if (!confirmResult.isConfirmed) return;

    const hasBackdate = selected.some(
      (location) => location.lockDate && lockDate < location.lockDate,
    );

    setIsSubmitting(true);

    try {
      if (!hasBackdate) {
        await handleUpdateLocation(lockDate);
        return;
      }

      const unlockMobile = compdata?.SalaryUnlock;

      if (!unlockMobile) {
        await handleUpdateLocation(lockDate);
        return;
      }

      setOtpSending(true);

      const otpResponse = await axios.post(
        `${API_URL}/SalaryLock/sendSalaryUnlockOtp`,
        {
          mobile: unlockMobile,
          joinDate: lockDate,
          locations: selectedLocations.map(Number).filter(Number.isFinite),
        },
        { headers },
      );

      if (!otpResponse?.data?.Status) {
        Swal.fire(
          "OTP failed",
          otpResponse?.data?.message || "Unable to send OTP.",
          "error",
        );
        return;
      }

      const otpResult = await Swal.fire({
        title: "Verify OTP",
        text: `An OTP has been sent to ${unlockMobile}.`,
        input: "text",
        inputLabel: "Enter 6-digit OTP",
        inputPlaceholder: "Enter OTP",
        inputAttributes: {
          maxlength: "6",
          autocapitalize: "off",
          autocorrect: "off",
          inputmode: "numeric",
        },
        showCancelButton: true,
        confirmButtonText: "Verify & Lock",
        cancelButtonText: "Cancel",
        inputValidator: (value) => {
          if (!value || !/^\d{6}$/.test(value)) {
            return "Please enter a valid 6-digit OTP.";
          }
          return null;
        },
      });

      if (!otpResult.isConfirmed || !otpResult.value) return;

      const verifyResponse = await axios.post(
        `${API_URL}/SalaryLock/verifySalaryUnlockOtp`,
        {
          mobile: unlockMobile,
          otp: otpResult.value,
        },
        { headers },
      );

      if (verifyResponse?.data?.Status || verifyResponse?.data?.success) {
        await handleUpdateLocation(lockDate);
      } else {
        Swal.fire(
          "Invalid OTP",
          verifyResponse?.data?.message || "OTP verification failed.",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Salary lock OTP error:", error);

      Swal.fire(
        "Error",
        error?.response?.data?.message ||
          "Something went wrong while verifying OTP.",
        "error",
      );
    } finally {
      setOtpSending(false);
      setIsSubmitting(false);
    }
  };

  const applySalaryLock = () => handleUpdateClick();

  // --------------------------------------------------
  // UNLOCK LOCATION
  // --------------------------------------------------
  const unlockLocation = async (location: LockedLocation) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Unlock location?",
      html: `
        <p style="font-size:12px">
          Are you sure you want to unlock <b>${location.name}</b>?
        </p>
        <p style="font-size:11px;color:#64748b;margin-top:6px">
          Lock date: ${formatDate(location.lockDate)}
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, Unlock",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e11d48",
    });

    if (!result.isConfirmed) return;

    setSelectedLocations([location.id]);
    setIsSubmitting(true);

    try {
      const numericId = Number(location.id);

      if (!Number.isFinite(numericId)) {
        Swal.fire("Invalid location", "Location code is invalid.", "error");
        return;
      }

      const response = await axios.post(
        `${API_URL}/SalaryLock/updateLocationDate`,
        {
          regionCode: region || null,
          joinDate: null,
          selectedLocations: [numericId],
        },
        { headers },
      );

      if (response?.data?.Status) {
        await Swal.fire({
          icon: "success",
          title: "Location unlocked",
          text:
            response?.data?.message ||
            `${location.name} unlocked successfully.`,
          timer: 1300,
          showConfirmButton: false,
        });

        setSelectedLocations([]);
        await fetchLocationData();
      } else {
        Swal.fire(
          "Unable to unlock",
          response?.data?.message || "Location could not be unlocked.",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Salary unlock error:", error);

      Swal.fire(
        "Error",
        error?.response?.data?.message || "Unable to unlock location.",
        "error",
      );
    } finally {
      setSelectedLocations([]);
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-2 transition-colors dark:bg-[#0b1220] sm:p-3 lg:p-4">
      <div className="mx-auto max-w-[1600px] space-y-3">
        {/* HEADER */}
        <div>
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[22px]">
            Salary lock
          </h1>

          <p className="mt-1 text-[11px] leading-5 text-[#64748b] dark:text-slate-400 sm:text-[12px]">
            Freeze the calculated salary for a month so nothing can be
            recalculated after disbursement. Lock a location once its bank
            transfer is out.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* LEFT SECTION */}
          <div className="min-w-0 space-y-3">
            {/* FILTER PANEL */}
            <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:p-4">
              <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_165px_175px]">
                <div className="min-w-0">
                  <Eselect
                    title="CHANNEL"
                    name="channel"
                    option={channelOptions}
                    initialValue={channel}
                    handleInputChange={handleFilterChange}
                    className="h-[36px] w-full"
                  />
                </div>

                <div className="min-w-0">
                  <Eselect
                    title="CLUSTER"
                    name="cluster"
                    option={clusterOptions}
                    initialValue={cluster}
                    handleInputChange={handleFilterChange}
                    className="h-[36px] w-full"
                  />
                </div>

                <div className="min-w-0">
                  <Eselect
                    title="REGION"
                    name="region"
                    option={regionOptions}
                    initialValue={region}
                    handleInputChange={handleFilterChange}
                    className="h-[36px] w-full"
                  />
                </div>

                <div className="min-w-0">
                  <Einput
                    title="LOCK DATE"
                    redlabel="*"
                    name="lockDate"
                    type="date"
                    value={lockDate}
                    handleInputChange={handleFilterChange}
                    className="h-[36px] w-full"
                  />
                </div>
              </div>

              {/* QUICK DATE */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] text-[#64748b] dark:text-slate-400">
                  Quick set
                </span>

                {[
                  { label: "End of last month", value: "lastMonth" },
                  { label: "Yesterday", value: "yesterday" },
                  { label: "End of this month", value: "thisMonth" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => quickSetDate(item.value)}
                    className="rounded-lg border border-[#dce5f1] px-2.5 py-1.5 text-[11px] font-medium text-[#52627c] transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-indigo-500/10"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LOCATIONS PANEL */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900">
              {/* LOCATION HEADER */}
              <div className="flex min-w-0 flex-col gap-2.5 border-b border-[#e2e8f0] p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-indigo-600"
                    aria-label="Select all locations"
                  />

                  <span className="text-[13px] font-bold text-[#152b4b] dark:text-slate-100">
                    Locations
                  </span>

                  <span className="text-[11px] text-[#64748b] dark:text-slate-400">
                    {selectedCount} of {locations.length} selected
                  </span>

                  <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {visibleEmployeeCount.toLocaleString("en-IN")} employees
                  </span>
                </div>

                <div className="w-full sm:max-w-[235px]">
                  <Einput
                    title=""
                    name="search"
                    type="text"
                    value={search}
                    handleInputChange={handleFilterChange}
                    className="h-[32px] w-full"
                  />
                </div>
              </div>

              {/* LOCATION LIST */}
              <div className="grid min-w-0 grid-cols-1 gap-x-2 gap-y-0.5 p-2 sm:grid-cols-2 sm:p-3">
                {isLoading ? (
                  <div className="col-span-full flex min-h-[100px] items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <span className="ml-2 text-[12px] text-slate-500">
                      Loading locations...
                    </span>
                  </div>
                ) : (
                  <>
                    {filteredLocations.map((location) => {
                      const locked = isLocked(location.id);
                      const selected = selectedLocations.includes(location.id);

                      const lockInfo = lockedLocations.find(
                        (item) => item.id === location.id,
                      );

                      return (
                        <div
                          key={location.id}
                          onClick={() => toggleLocation(location.id)}
                          className={`flex min-w-0 min-h-[40px] cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 transition ${
                            locked
                              ? "cursor-not-allowed"
                              : selected
                                ? "bg-indigo-50 dark:bg-indigo-500/15"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={locked || isSubmitting}
                              onChange={() => toggleLocation(location.id)}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 shrink-0 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                            />

                            <span
                              className={`truncate text-[12px] font-medium ${
                                selected
                                  ? "text-indigo-700 dark:text-indigo-300"
                                  : "text-[#152b4b] dark:text-slate-100"
                              }`}
                            >
                              {location.name}
                            </span>
                          </div>

                          {locked ? (
                            <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              <Lock size={14} />
                              <span>
                                {formatDate(lockInfo?.lockDate || "")}
                              </span>
                            </div>
                          ) : (
                            <span className="shrink-0 text-right text-[10px] text-[#64748b] dark:text-slate-400">
                              {location.city}
                              {location.city ? " · " : ""}
                              {location.employees.toLocaleString("en-IN")} emp
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {filteredLocations.length === 0 && (
                      <div className="col-span-full flex min-h-[100px] flex-col items-center justify-center text-center">
                        <Search size={22} className="text-slate-400" />
                        <p className="mt-2 text-[12px] font-semibold text-[#152b4b] dark:text-slate-200">
                          No locations found
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          No location data available.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* FOOTER */}
              <div className="flex min-w-0 flex-col gap-2.5 border-t border-[#e2e8f0] bg-[#f8fafc] p-3 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] leading-5 text-[#64748b] dark:text-slate-400">
                  <p>
                    Locking {selectedCount} location
                    {selectedCount !== 1 ? "s" : ""} up to and including{" "}
                    <span className="font-semibold text-[#152b4b] dark:text-slate-200">
                      {formatDate(lockDate)}
                    </span>
                  </p>

                  <p>
                    Selected employees:{" "}
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                      {selectedEmployeeCount.toLocaleString("en-IN")}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <AButton
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedCount === 0 || isSubmitting}
                    className="h-[35px] rounded-lg border border-[#dce5f1] bg-white px-4 text-[11px] font-semibold text-[#52627c] hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Clear
                  </AButton>

                  <AButton
                    type="button"
                    onClick={applySalaryLock}
                    disabled={
                      selectedCount === 0 ||
                      !lockDate ||
                      isSubmitting ||
                      otpSending
                    }
                    className="inline-flex h-[35px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 text-[11px] font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Lock size={14} />
                    {otpSending
                      ? "Verifying OTP..."
                      : isSubmitting
                        ? "Processing..."
                        : "Apply salary lock"}
                  </AButton>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
            {/* CURRENTLY LOCKED */}
            <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#52627c] dark:text-slate-300">
                  Currently locked
                </h2>

                <span className="shrink-0 text-[12px] font-semibold text-rose-600 dark:text-rose-400">
                  {lockedLocations.length} locked
                </span>
              </div>

              <div className="space-y-1.5">
                {lockedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[#dce5f1] p-2 dark:border-slate-700"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/15">
                        <Lock
                          size={14}
                          className="text-rose-600 dark:text-rose-400"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-[#152b4b] dark:text-slate-100">
                          {location.name}
                        </p>

                        <p className="truncate text-[10px] text-[#64748b] dark:text-slate-400">
                          {location.city} · {formatDate(location.lockDate)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => unlockLocation(location)}
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#dce5f1] px-2.5 text-[10px] font-semibold text-[#52627c] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-rose-500/10"
                    >
                      <Unlock size={12} />
                      Unlock
                    </button>
                  </div>
                ))}

                {lockedLocations.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#dce5f1] p-4 text-center dark:border-slate-700">
                    <Unlock className="mx-auto text-slate-400" size={20} />
                    <p className="mt-2 text-[11px] text-slate-500">
                      No locations currently locked.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* WHAT THE LOCK BLOCKS */}
            <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-[#52627c] dark:text-slate-300">
                What the lock blocks
              </h2>

              <div className="space-y-3">
                <InfoItem
                  icon={Calculator}
                  title="No recalculation"
                  description="Salary calculation, GLB runs and Excel salary imports skip locked locations."
                  bgClass="bg-rose-100 dark:bg-rose-500/15"
                  iconClass="text-rose-600 dark:text-rose-400"
                />

                <InfoItem
                  icon={HandCoins}
                  title="Deductions and deviations frozen"
                  description="New deductions or approved deviations no longer change the locked month."
                  bgClass="bg-orange-100 dark:bg-orange-500/15"
                  iconClass="text-orange-600 dark:text-orange-400"
                />

                <InfoItem
                  icon={FileCheck}
                  title="Payslips become final"
                  description="Issued payslips and the bank transfer sheet can no longer drift apart."
                  bgClass="bg-violet-100 dark:bg-violet-500/15"
                  iconClass="text-violet-600 dark:text-violet-400"
                />

                <InfoItem
                  icon={ShieldCheck}
                  title="Statutory filings safe"
                  description="PF, ESIC and TDS returns are filed against numbers that cannot move."
                  bgClass="bg-emerald-100 dark:bg-emerald-500/15"
                  iconClass="text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
