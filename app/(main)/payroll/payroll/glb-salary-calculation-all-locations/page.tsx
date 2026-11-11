"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  CalendarCheck,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  Lock,
  MapPin,
  Calculator,
  Search,
  Wallet,
  X,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

const API_URL = process.env.NEXT_PUBLIC_URL;

type AnyRecord = Record<string, any>;
type Option = { value: string; label: string };

type StepKey = "step1" | "step2" | "step3" | "step4";
type StepStatus = "success" | "fail" | "pending";

type ValidationStatus = {
  step1: StepStatus;
  step2: StepStatus;
  step3: StepStatus;
  step4: StepStatus;
  lockDate: string | null;
  salaryLocked: boolean;
  SalaryLockDate: string | null;
};

type LocationItem = {
  id: string;
  name: string;
  city: string;
  employees: number;
  channel: string;
  cluster: string;
  region: string;
  isReady: boolean;
  isBlocked: boolean;
  raw: AnyRecord;
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

const STEPS: { id: number; key: StepKey; label: string }[] = [
  { id: 1, key: "step1", label: "Leave / MissPunch" },
  { id: 2, key: "step2", label: "Bank Validation" },
  { id: 3, key: "step3", label: "Attendance Calc" },
  { id: 4, key: "step4", label: "Attendance Lock" },
];

const COLORS = {
  success: "#22c55e",
  fail: "#ef4444",
  pending: "#9ca3af",
};

const EMPTY_VALIDATION: ValidationStatus = {
  step1: "pending",
  step2: "pending",
  step3: "pending",
  step4: "pending",
  lockDate: null,
  salaryLocked: false,
  SalaryLockDate: null,
};

const getValue = (obj: AnyRecord, keys: string[], fallback: any = "") => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
};

const getArray = (response: any): AnyRecord[] => {
  const candidates = [
    response?.data?.data?.[0],
    response?.data?.data,
    response?.data?.result,
    response?.data?.locations,
    response?.data?.data?.locations,
    response?.data?.recordset,
  ];

  return candidates.find(Array.isArray) || [];
};

// Find master arrays even when API nests them inside objects.
const findMasterList = (
  source: any,
  possibleKeys: string[],
  depth = 0,
): any[] => {
  if (!source || typeof source !== "object" || depth > 4) {
    return [];
  }

  const normalize = (value: string) =>
    value.toLowerCase().replace(/[_\s-]/g, "");

  const keys = possibleKeys.map(normalize);

  for (const [key, value] of Object.entries(source)) {
    if (keys.includes(normalize(key)) && Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    if (value && typeof value === "object") {
      const result = findMasterList(value, possibleKeys, depth + 1);

      if (result.length) return result;
    }
  }

  return [];
};

const makeOptions = (
  list: any[],
  type: "channel" | "cluster" | "region" | "common" = "common",
): Option[] => {
  const options = (Array.isArray(list) ? list : [])
    .map((item: any) => {
      if (typeof item === "string" || typeof item === "number") {
        return {
          value: String(item).trim(),
          label: String(item).trim(),
        };
      }

      let valueKeys: string[] = [];
      let labelKeys: string[] = [];

      // IMPORTANT: Specific fields must come before generic UTD / Code.
      if (type === "cluster") {
        valueKeys = [
          "Cluster_Code",
          "CLUSTER_CODE",
          "ClusterCode",
          "Cluster_Id",
          "Cluster_ID",
          "ClusterId",
          "CLUSTER_ID",
          "Cluster_No",
          "CLUSTER_NO",
          "Sal_Cluster",
          "SAL_CLUSTER",
          "Cluster",
          "CLUSTER",
          "value",
          "Value",
          "Code",
          "id",
          "ID",
          "UTD",
        ];

        labelKeys = [
          "Cluster_Name",
          "CLUSTER_NAME",
          "ClusterName",
          "Cluster_Description",
          "CLUSTER_DESCRIPTION",
          "Sal_Cluster_Name",
          "SAL_CLUSTER_NAME",
          "Cluster",
          "CLUSTER",
          "Name",
          "name",
          "Description",
          "label",
          "label_name",
          "display_label",
        ];
      } else if (type === "channel") {
        valueKeys = [
          "Channel_Code",
          "CHANNEL_CODE",
          "ChannelCode",
          "Channel_Id",
          "Channel_ID",
          "Sal_Channel",
          "SAL_CHANNEL",
          "Channel",
          "CHANNEL",
          "value",
          "Value",
          "Code",
          "id",
          "ID",
          "UTD",
        ];

        labelKeys = [
          "Channel_Name",
          "CHANNEL_NAME",
          "ChannelName",
          "Sal_Channel_Name",
          "SAL_CHANNEL_NAME",
          "Channel",
          "CHANNEL",
          "Name",
          "name",
          "Description",
          "label",
          "label_name",
          "display_label",
        ];
      } else if (type === "region") {
        valueKeys = [
          "Region_Code",
          "REGION_CODE",
          "RegionCode",
          "Region_Id",
          "Region_ID",
          "RegionId",
          "SAL_REGION",
          "Sal_Region",
          "Region",
          "REGION",
          "Loc_Code",
          "value",
          "Value",
          "Code",
          "id",
          "ID",
          "UTD",
        ];

        labelKeys = [
          "Region_Name",
          "REGION_NAME",
          "RegionName",
          "Sal_Region_Name",
          "SAL_REGION_NAME",
          "Region_Description",
          "Region",
          "REGION",
          "Name",
          "name",
          "Description",
          "label",
          "label_name",
          "display_label",
        ];
      } else {
        valueKeys = ["value", "Value", "Code", "id", "ID", "UTD"];

        labelKeys = [
          "label",
          "label_name",
          "display_label",
          "Name",
          "name",
          "Description",
        ];
      }

      const value = getValue(item, valueKeys);
      const label = getValue(item, labelKeys, value);

      return {
        value: String(value ?? "").trim(),
        label: String(label ?? "").trim(),
      };
    })
    .filter(
      (item) =>
        item.value &&
        item.label &&
        item.value.toLowerCase() !== "null" &&
        item.value.toLowerCase() !== "undefined",
    );

  // Remove duplicate cluster codes only.
  return Array.from(
    new Map(options.map((item) => [item.value.toLowerCase(), item])).values(),
  );
};

const getFlag = (value: any, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true" ||
    String(value).toLowerCase() === "yes" ||
    String(value).toLowerCase() === "ready"
  );
};

const getBranchNumbers = (branch: any): string[] => {
  if (Array.isArray(branch)) {
    return branch.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof branch === "string") {
    return branch
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return branch ? [String(branch)] : [];
};

const mapLocation = (item: AnyRecord, index: number): LocationItem => {
  const id = String(
    getValue(
      item,
      [
        "Loc_Code",
        "LocCode",
        "location_id",
        "Location_Id",
        "LocationID",
        "id",
        "value",
        "UTD",
      ],
      index + 1,
    ),
  );

  const name = String(
    getValue(
      item,
      [
        "loc_name",
        "Loc_Name",
        "Location_Name",
        "LocationName",
        "Branch_Name",
        "BranchName",
        "label",
        "name",
      ],
      `Location ${id}`,
    ),
  );

  const blocked = getFlag(
    getValue(
      item,
      ["isBlocked", "IsBlocked", "Blocked", "is_locked", "IsLocked"],
      false,
    ),
  );

  const readyValue = getValue(
    item,
    ["isReady", "IsReady", "Ready", "Status", "status", "PreCheckStatus"],
    true,
  );

  return {
    id,
    name,
    city: String(
      getValue(item, ["City", "city", "City_Name", "Location_City"], "-"),
    ),
    employees:
      Number(
        getValue(
          item,
          [
            "empCount",
            "EmpCount",
            "TotalEmployees",
            "Total_Employees",
            "Employees",
            "Emp_Count",
          ],
          0,
        ),
      ) || 0,
    channel: String(
      getValue(item, ["Channel", "CHANNEL", "Channel_Name", "Sal_Channel"], ""),
    ),
    cluster: String(
      getValue(item, ["Cluster", "CLUSTER", "Cluster_Name", "Sal_Cluster"], ""),
    ),
    region: String(
      getValue(
        item,
        [
          "Region",
          "REGION",
          "Sal_Region",
          "SAL_REGION",
          "Region_Name",
          "RegionName",
        ],
        "",
      ),
    ),
    isReady: !blocked && getFlag(readyValue, true),
    isBlocked: blocked,
    raw: item,
  };
};

const formatDate = (value: any) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* -------------------------------------------------------
   REUSABLE LOCAL MODAL
------------------------------------------------------- */

function CustomModal({
  open,
  onClose,
  children,
  maxWidth = "max-w-6xl",
  contentClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  contentClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#111827] ${contentClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X size={18} />
        </button>

        {children}
      </div>
    </div>
  );
}

export default function SalaryCalculationByLocationPage() {
  const user = useCurrentUser();
  const today = new Date();

  const compcode = user?.Comp_Code;
  const username = user?.name;

  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const [channel, setChannel] = useState("all");
  const [cluster, setCluster] = useState("all");
  const [region, setRegion] = useState("all");

  const [channelOptions, setChannelOptions] = useState<Option[]>([]);
  const [clusterOptions, setClusterOptions] = useState<Option[]>([]);
  const [regionOptions, setRegionOptions] = useState<Option[]>([]);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [running, setRunning] = useState(false);

  const [locationStatus, setLocationStatus] = useState<
    Record<string, ValidationStatus>
  >({});

  const [modalData, setModalData] = useState<AnyRecord[]>([]);
  const [modalType, setModalType] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [processData, setProcessData] = useState<AnyRecord | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  const [warning, setWarning] = useState("");
  const [lockedLocations, setLockedLocations] = useState<any[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [showLockedLocations, setShowLockedLocations] = useState(false);

  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  const headers = useMemo(
    () => ({
      compcode,
      name: username,
    }),
    [compcode, username],
  );

  const yearOptions: Option[] = Array.from(
    { length: 8 },
    (_, index) => today.getFullYear() - 4 + index,
  ).map((item) => ({
    value: String(item),
    label: String(item),
  }));

  const showSideAlert = useCallback(
    (message: string, type: "success" | "error" | "warning" | "info") => {
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 6000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: type,
        title: message,
      });
    },
    [],
  );

  const handleInputChange = (name: string, value: any) => {
    const selectedValue = String(value ?? "all");

    if (name === "channel") setChannel(selectedValue || "all");
    if (name === "cluster") setCluster(selectedValue || "all");
    if (name === "region") setRegion(selectedValue || "all");
    if (name === "month") setMonth(selectedValue);
    if (name === "year") setYear(selectedValue);
  };

  // MASTER DATA
  const getMasterData = useCallback(async () => {
    if (!compcode) return;

    try {
      const response = await axios.post(
        `${API_URL}/employee/masters`,
        {},
        { headers },
      );

      console.log("FULL MASTER API RESPONSE:", response.data);

      const masterRoot = response?.data?.data;
      const masters = Array.isArray(masterRoot)
        ? masterRoot[0] || {}
        : masterRoot || response?.data || {};

      // CHANNEL
      const channels = findMasterList(masters, [
        "CHANNEL1",
        "CHANNEL",
        "CHANNELS",
      ]);

      // CLUSTER: Directly use CLUSTER1
      const clusters = Array.isArray(masters?.CLUSTER1) ? masters.CLUSTER1 : [];

      // REGION
      const regions = findMasterList(masters, [
        "REGION1",
        "REGION",
        "REGION_MASTER",
        "REGIONMASTER",
        "SAL_REGION",
        "REGIONS",
      ]);

      console.log("CHANNEL RECORDS:", channels);
      console.log("CLUSTER1 RAW RECORDS:", clusters);
      console.log("CLUSTER1 COUNT:", clusters.length);
      console.log("CLUSTER OPTIONS:", makeOptions(clusters, "cluster"));
      console.log("REGION RECORDS:", regions);

      setChannelOptions(makeOptions(channels, "channel"));
      setClusterOptions(makeOptions(clusters, "cluster"));
      setRegionOptions(makeOptions(regions, "region"));
    } catch (error) {
      console.error("Salary calculation master error:", error);
    }
  }, [compcode, headers]);

  // LOCATION DATA
  const getLocations = useCallback(async () => {
    if (!compcode) return;

    const branchNumbers = getBranchNumbers(user?.branch);

    if (!branchNumbers.length) {
      setLocations([]);
      setSelectedLocations([]);
      setLocationStatus({});
      setHasLoaded(true);
      return;
    }

    setLoading(true);
    setHasLoaded(false);

    try {
      const payload = {
        locations: branchNumbers,
        Channel: channel !== "all" ? channel : null,
        Cluster: cluster !== "all" ? cluster : null,
        Region: region !== "all" ? region : null,
      };

      const response = await axios.post(
        `${API_URL}/ars/Emp_AtnrunGetLocation_1`,
        payload,
        { headers },
      );

      const apiRows = getArray(response);
      const mapped = apiRows.map(mapLocation);

      setLocations(mapped);
      setLocationStatus({});
      setSelectedLocations([]);
      setHasLoaded(true);
    } catch (error: any) {
      console.error("Get salary locations error:", error);

      setLocations([]);
      setSelectedLocations([]);
      setLocationStatus({});
      setHasLoaded(true);

      Swal.fire({
        icon: "error",
        title: "Unable to load locations",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Something went wrong while loading locations.",
      });
    } finally {
      setLoading(false);
    }
  }, [compcode, headers, user?.branch, channel, cluster, region]);

  useEffect(() => {
    if (compcode) getMasterData();
  }, [compcode, getMasterData]);

  useEffect(() => {
    if (compcode) getLocations();
  }, [compcode, getLocations]);

  // VALIDATION STATUS FOR EACH LOCATION
  const fetchValidationStatus = useCallback(async () => {
    if (!compcode || !month || !year || !locations.length) {
      setLocationStatus({});
      return;
    }

    setLoading(true);

    try {
      const results = await Promise.all(
        locations.map(async (location) => {
          try {
            const response = await axios.post(
              `${API_URL}/SalaryLock/validateLocation`,
              {
                locationId: location.id,
                month,
                Year: year,
              },
              { headers },
            );

            const data = response?.data?.data || {};

            const status: ValidationStatus = {
              step1: getFlag(data.leaveMissPunch) ? "success" : "fail",
              step2: getFlag(data.bankValidation) ? "success" : "fail",
              step3: getFlag(data.attendanceCalculated) ? "success" : "fail",
              step4: getFlag(data.attendanceLocked) ? "success" : "fail",
              lockDate: data.lockDate || null,
              salaryLocked: getFlag(data.salaryLocked),
              SalaryLockDate: data.SalaryLockDate || null,
            };

            return [location.id, status] as const;
          } catch (error) {
            console.error(
              `Validation failed for location ${location.id}:`,
              error,
            );

            return [
              location.id,
              {
                ...EMPTY_VALIDATION,
                step1: "fail",
                step2: "fail",
                step3: "fail",
                step4: "fail",
              },
            ] as const;
          }
        }),
      );

      setLocationStatus(Object.fromEntries(results));
    } catch (error) {
      console.error("Validation status error:", error);
      showSideAlert("Unable to validate location status.", "error");
    } finally {
      setLoading(false);
    }
  }, [compcode, month, year, locations, headers, showSideAlert]);

  useEffect(() => {
    if (locations.length && month && year) {
      fetchValidationStatus();
    } else {
      setLocationStatus({});
    }
  }, [locations, month, year, fetchValidationStatus]);

  // ALREADY RUNNING SALARY PROCESS
  const fetchAlreadyProcessData = useCallback(async () => {
    if (!compcode || !user?.branch) return;

    try {
      const response = await axios.post(
        `${API_URL}/SalaryLock/AlredyProcess_Slry_cal`,
        { locations: user.branch },
        { headers },
      );

      const data = response?.data || {};

      if (data.Status && data.modelVisible) {
        setProcessData(data);
        setIsProcessModalOpen(true);
      } else {
        setProcessData(null);
        setIsProcessModalOpen(false);
      }
    } catch (error) {
      console.error("Already Process Data error:", error);
    }
  }, [compcode, user?.branch, headers]);

  useEffect(() => {
    fetchAlreadyProcessData();
  }, [fetchAlreadyProcessData]);

  // LOCATION VALIDATION HELPERS
  const getLocationStatus = (id: string): ValidationStatus =>
    locationStatus[id] || EMPTY_VALIDATION;

  const isFullyPassed = (id: string) => {
    const status = getLocationStatus(id);

    return (
      status.step1 === "success" &&
      status.step2 === "success" &&
      status.step3 === "success" &&
      status.step4 === "success" &&
      !status.salaryLocked
    );
  };

  const getStepColor = (value: StepStatus) => {
    if (value === "success") return COLORS.success;
    if (value === "fail") return COLORS.fail;
    return COLORS.pending;
  };

  // FILTERED LOCATIONS
  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return locations.filter((item) => {
      return (
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query) ||
        item.cluster.toLowerCase().includes(query)
      );
    });
  }, [locations, search]);

  const readyLocations = filteredLocations.filter(
    (item) => isFullyPassed(item.id) && item.isReady && !item.isBlocked,
  );

  const blockedCount = locations.filter((item) => {
    const status = getLocationStatus(item.id);

    return (
      item.isBlocked ||
      !item.isReady ||
      status.salaryLocked ||
      !isFullyPassed(item.id)
    );
  }).length;

  const allVisibleSelected =
    readyLocations.length > 0 &&
    readyLocations.every((item) => selectedLocations.includes(item.id));

  const selectedEmployeeCount = locations
    .filter((item) => selectedLocations.includes(item.id))
    .reduce((sum, item) => sum + item.employees, 0);

  const toggleLocation = (id: string) => {
    const item = locations.find((location) => location.id === id);

    if (!item || !isFullyPassed(id) || item.isBlocked || !item.isReady) {
      return;
    }

    setSelectedLocations((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const toggleAllLocations = () => {
    if (allVisibleSelected) {
      const visibleIds = readyLocations.map((item) => item.id);

      setSelectedLocations((previous) =>
        previous.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedLocations((previous) =>
        Array.from(
          new Set([...previous, ...readyLocations.map((item) => item.id)]),
        ),
      );
    }
  };

  const selectOnlyPassed = () => {
    setSelectedLocations(
      locations
        .filter(
          (item) => isFullyPassed(item.id) && item.isReady && !item.isBlocked,
        )
        .map((item) => item.id),
    );
  };

  // RESET FILTERS
  const resetFilters = () => {
    setChannel("all");
    setCluster("all");
    setRegion("all");
    setSearch("");
    setSelectedLocations([]);
  };

  // OPEN VALIDATION DETAILS MODAL
  const handleOpenModal = async (
    locationId: string,
    stepKey: StepKey,
    statusType: StepStatus,
  ) => {
    const typeMap: Record<StepKey, string> = {
      step1: "leave",
      step2: "bank",
      step3: "calc",
      step4: "lock",
    };

    const type = typeMap[stepKey];

    setActiveLocationId(locationId);
    setModalType(type);
    setModalData([]);
    setIsModalOpen(true);
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/SalaryLock/getValidationDetails`,
        {
          locationId,
          type,
          month,
          Year: year,
          status: statusType,
        },
        { headers },
      );

      setModalData(
        Array.isArray(response?.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error("Validation details error:", error);
      showSideAlert("Unable to load validation details.", "error");
    } finally {
      setLoading(false);
    }
  };

  // CANCEL LEAVE FROM DETAILS MODAL
  const handleCancelLeave = async (cancelCode: any, utd: any) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Cancel this leave?",
      text: "Are you sure you want to cancel this leave entry?",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel leave",
      cancelButtonText: "Keep it",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/SalaryLock/cancelLeaveBySlryCalPage`,
        {
          locations: user?.branch,
          Canc_Code: cancelCode,
          EMPCODE: user?.EMPCODE,
          utd,
          Remark: "Cancel By Salary Calculation Page",
        },
        { headers },
      );

      const data = response?.data || {};

      if (data.Status) {
        showSideAlert(
          data.Message || "Leave cancelled successfully.",
          "success",
        );

        setModalData((previous) => previous.filter((item) => item.UTD !== utd));

        await fetchValidationStatus();
      } else {
        showSideAlert(data.Message || "Failed to cancel leave.", "error");
      }
    } catch (error) {
      console.error("Cancel leave error:", error);
      showSideAlert("Error occurred while cancelling leave.", "error");
    } finally {
      setLoading(false);
    }
  };

  // RUN SALARY CALCULATION
  const handleRunCalculation = async () => {
    if (!month) {
      showSideAlert("Please select a month.", "warning");
      return;
    }

    if (!year) {
      showSideAlert("Please select a year.", "warning");
      return;
    }

    if (!selectedLocations.length) {
      Swal.fire({
        icon: "warning",
        title: "Select locations",
        text: "Select at least one fully passed location before running GLB calculation.",
      });
      return;
    }

    const selectedItems = locations.filter((item) =>
      selectedLocations.includes(item.id),
    );

    const invalidItems = selectedItems.filter(
      (item) => !isFullyPassed(item.id) || item.isBlocked || !item.isReady,
    );

    if (invalidItems.length) {
      Swal.fire({
        icon: "warning",
        title: "Locations not ready",
        text: "Only locations passing all four validations and not already salary locked can be included.",
      });
      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Run GLB salary calculation?",
      html: `
        <div style="font-size:13px;color:#64748b;line-height:1.7">
          <b>${selectedLocations.length}</b> location(s) selected
          <br/>
          <b>${selectedEmployeeCount.toLocaleString("en-IN")}</b> employees
          <br/>
          Salary month: <b>${MONTHS.find((item) => item.value === month)?.label} ${year}</b>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Run calculation",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#5145e9",
    });

    if (!confirmation.isConfirmed) return;

    setRunning(true);
    setWarning("");
    setLockedLocations([]);
    setShowWarning(false);
    setShowLockedLocations(false);

    try {
      const locationNumbers = selectedItems.map((item) => item.id);

      const preRunResponse = await axios.post(
        `${API_URL}/SalaryLock/AlredyProcess_Slry_cal`,
        {
          locations: user?.branch,
        },
        { headers },
      );

      const preRunData = preRunResponse?.data || {};

      if (preRunData.Status && preRunData.modelVisible) {
        setProcessData(preRunData);
        setIsProcessModalOpen(true);

        await Swal.fire({
          icon: "warning",
          title: "Salary calculation already in progress",
          text: "An existing salary calculation process is running. Please wait until it completes.",
        });

        return;
      }

      const response = await axios.post(
        `${API_URL}/SalaryLock/emp_slryrun_byLoction`,
        {
          MONTH: month,
          YEAR: year,
          locations: locationNumbers,
        },
        { headers },
      );

      const data = response?.data || {};

      if (data.lockedLocations) {
        setLockedLocations(data.lockedLocations || []);
      }

      if (data.warning) {
        setWarning(String(data.warning));
      }

      if (
        data.success === false ||
        data.status === false ||
        data.Status === false
      ) {
        throw new Error(
          data.message ||
            data.Message ||
            data.warning ||
            "Salary calculation failed.",
        );
      }

      if (data.success || data.Status) {
        showSideAlert(
          data.message ||
            data.Message ||
            "Salary calculation started successfully.",
          "success",
        );
      } else {
        showSideAlert(
          data.message ||
            data.Message ||
            "Salary calculation request has been processed.",
          "success",
        );
      }

      setSelectedLocations([]);

      await fetchAlreadyProcessData();
      await getLocations();
    } catch (error: any) {
      console.error("GLB salary calculation error:", error);

      Swal.fire({
        icon: "error",
        title: "Calculation failed",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Unable to run GLB salary calculation.",
      });
    } finally {
      setRunning(false);
    }
  };

  // WARNING DISPLAY TIMING
  useEffect(() => {
    if (!warning) {
      setShowWarning(false);
      return;
    }

    const timer = setTimeout(() => setShowWarning(true), 1500);

    return () => clearTimeout(timer);
  }, [warning]);

  useEffect(() => {
    if (!lockedLocations.length) {
      setShowLockedLocations(false);
      return;
    }

    const timer = setTimeout(() => setShowLockedLocations(true), 2000);

    return () => clearTimeout(timer);
  }, [lockedLocations]);

  const selectedMonth =
    MONTHS.find((item) => item.value === month)?.label || month;

  const closeValidationModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const closeProcessModal = useCallback(() => {
    setIsProcessModalOpen(false);
  }, []);

  return (
    <div className="glb-page min-h-screen min-w-0 bg-[#f5f8fc] p-3 text-slate-800 transition-colors dark:bg-[#0b1220] dark:text-slate-100 sm:p-4 xl:p-5">
      <HashloaderComponent isLoading={loading || running} />

      <div className="mx-auto min-w-0 max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[#10213b] dark:text-slate-100">
            GLB salary calculation
          </h1>
          <p className="mt-1 text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
            The month-end run. Only locations that pass every pre-check can be
            selected — nothing half-ready enters the final salary.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_425px]">
          <div className="min-w-0 space-y-4">
            {/* FILTER PANEL - ALL FIVE FILTERS IN ONE ROW */}
            <div className="grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none sm:grid-cols-2 xl:grid-cols-5">
              <Eselect
                title="CHANNEL"
                name="channel"
                option={[
                  { value: "all", label: "All channels" },
                  ...channelOptions.filter((item) => item.value !== "all"),
                ]}
                initialValue={channel}
                handleInputChange={handleInputChange}
                className="h-[42px] w-full"
                placeholder="Select channel"
              />

              <Eselect
                title="CLUSTER"
                name="cluster"
                option={[
                  { value: "all", label: "All clusters" },
                  ...clusterOptions.filter((item) => item.value !== "all"),
                ]}
                initialValue={cluster}
                handleInputChange={handleInputChange}
                className="h-[42px] w-full"
                placeholder="Select cluster"
              />

              <Eselect
                title="REGION"
                name="region"
                option={[
                  { value: "all", label: "All regions" },
                  ...regionOptions.filter((item) => item.value !== "all"),
                ]}
                initialValue={region}
                handleInputChange={handleInputChange}
                className="h-[42px] w-full"
                placeholder="Select region"
              />

              <Eselect
                title="MONTH"
                redlabel="*"
                name="month"
                option={MONTHS}
                initialValue={month}
                handleInputChange={handleInputChange}
                className="h-[42px] w-full"
                placeholder="Select month"
              />

              <Eselect
                title="YEAR"
                name="year"
                option={yearOptions}
                initialValue={year}
                handleInputChange={handleInputChange}
                className="h-[42px] w-full"
                placeholder="Select year"
              />
            </div>

            {/* LOCATIONS PANEL */}
            <div className="min-w-0 overflow-hidden rounded-2xl border border-[#dce5f1] bg-white shadow-[0_3px_12px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
              {/* LOCATION TOOLBAR */}
              <div className="flex min-w-0 flex-col gap-3 border-b border-[#dce5f1] px-4 py-3 dark:border-slate-700 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllLocations}
                    disabled={!readyLocations.length}
                    className="h-5 w-5 shrink-0 cursor-pointer accent-[#5145e9] disabled:cursor-not-allowed"
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#172b4d] dark:text-slate-100">
                        Locations
                      </span>
                      <span className="text-[11px] text-[#64748b] dark:text-slate-400">
                        {readyLocations.length} available · {blockedCount}{" "}
                        blocked
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Select only locations that pass all salary checks
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={selectOnlyPassed}
                    className="inline-flex h-[36px] shrink-0 items-center justify-center rounded-lg border border-[#dce5f1] bg-white px-3 text-[11px] font-semibold text-[#172b4d] transition hover:bg-slate-50 dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Select only fully passed
                  </button>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-[36px] shrink-0 items-center justify-center rounded-lg border border-[#dce5f1] bg-white px-3 text-[11px] font-semibold text-[#172b4d] transition hover:bg-slate-50 dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Reset filters
                  </button>

                  <div className="relative min-w-0 sm:w-[250px]">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search locations"
                      className="h-[36px] w-full rounded-lg border border-[#dce5f1] bg-white pl-9 pr-3 text-[12px] text-[#172b4d] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* LOCATION LIST */}
              <div className="divide-y divide-[#edf1f7] dark:divide-slate-700">
                {filteredLocations.length ? (
                  filteredLocations.map((item) => {
                    const status = getLocationStatus(item.id);
                    const checked = selectedLocations.includes(item.id);
                    const fullyPassed = isFullyPassed(item.id);
                    const salaryLocked = status.salaryLocked;

                    const disabled =
                      !fullyPassed || item.isBlocked || !item.isReady;

                    return (
                      <div
                        key={item.id}
                        className={`flex min-w-0 flex-col gap-3 px-4 py-3 transition ${
                          checked
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleLocation(item.id)}
                              className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#5145e9] disabled:cursor-not-allowed disabled:opacity-40"
                            />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[12px] font-semibold text-[#172b4d] dark:text-slate-100">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  #{item.id}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#64748b] dark:text-slate-400">
                                {item.city !== "-" && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin size={11} />
                                    {item.city}
                                  </span>
                                )}
                                {item.cluster && <span>{item.cluster}</span>}
                                {item.region && <span>{item.region}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 pl-7 sm:justify-end sm:pl-0">
                            <span className="whitespace-nowrap text-[11px] text-[#64748b] dark:text-slate-400">
                              {item.employees.toLocaleString("en-IN")} emp
                            </span>

                            {salaryLocked ? (
                              <span className="inline-flex min-w-[82px] items-center justify-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
                                <Lock size={12} />
                                Salary Locked
                              </span>
                            ) : fullyPassed &&
                              item.isReady &&
                              !item.isBlocked ? (
                              <span className="inline-flex min-w-[82px] items-center justify-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                                <Check size={13} />
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex min-w-[82px] items-center justify-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                                <CircleAlert size={12} />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* FOUR LIVE VALIDATION STEPS */}
                        <div className="grid grid-cols-2 gap-2 pl-7 sm:grid-cols-4">
                          {STEPS.map((step) => {
                            const value = status[step.key];
                            const color = getStepColor(value);

                            return (
                              <button
                                key={step.key}
                                type="button"
                                onClick={() =>
                                  handleOpenModal(item.id, step.key, value)
                                }
                                className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                title={`View ${step.label} details`}
                              >
                                <span
                                  className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                  style={{ backgroundColor: color }}
                                >
                                  {value === "success"
                                    ? "✓"
                                    : value === "fail"
                                      ? "✕"
                                      : step.id}
                                </span>

                                <span className="min-w-0 truncate text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                  {step.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {salaryLocked && status.SalaryLockDate && (
                          <div className="pl-7 text-[10px] text-rose-500">
                            Salary lock date:{" "}
                            {formatDate(status.SalaryLockDate)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-[190px] flex-col items-center justify-center px-4 text-center">
                    <MapPin size={25} className="mb-2 text-slate-300" />
                    <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                      {hasLoaded ? "No locations found" : "Loading locations"}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {search
                        ? "Try another location search."
                        : "No locations are available for the selected filters."}
                    </p>
                  </div>
                )}
              </div>

              {/* RUN FOOTER */}
              <div className="flex min-w-0 flex-col gap-3 border-t border-[#dce5f1] bg-[#f8fafc] px-4 py-3 dark:border-slate-700 dark:bg-[#111b2b] sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px]">
                  {selectedLocations.length ? (
                    <span className="font-medium text-[#475569] dark:text-slate-300">
                      {selectedLocations.length} location(s) selected ·{" "}
                      {selectedEmployeeCount.toLocaleString("en-IN")} employees
                    </span>
                  ) : (
                    <span className="text-rose-500">
                      Select at least one fully validated location
                    </span>
                  )}
                </div>

                <AButton
                  type="button"
                  onClick={handleRunCalculation}
                  disabled={!selectedLocations.length || running || loading}
                  className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[#64748b] px-5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#475569] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Calculator size={16} />
                  Run GLB calculation
                </AButton>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="min-w-0 space-y-4">
            {/* PRE-RUN CHECKLIST */}
            <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
              <h2 className="mb-4 text-[11px] font-bold tracking-wide text-[#64748b] dark:text-slate-400">
                PRE-RUN CHECKLIST
              </h2>

              <div className="space-y-3.5">
                <ChecklistItem
                  icon={<CalendarCheck size={17} />}
                  color="indigo"
                  title="Attendance calculated"
                  description="Paid days must exist for the month before salary runs."
                />

                <ChecklistItem
                  icon={<CheckCheck size={17} />}
                  color="sky"
                  title="Deviations approved"
                  description="Only approved paid-day deviations are picked up."
                />

                <ChecklistItem
                  icon={<Wallet size={17} />}
                  color="violet"
                  title="Deductions loaded"
                  description="Advances, EMIs and recoveries for the month are applied."
                />

                <ChecklistItem
                  icon={<Lock size={17} />}
                  color="rose"
                  title="Attendance locked"
                  description="Mandatory for GLB — punches cannot move after this run."
                />
              </div>
            </div>

            {/* LAST RUNS */}
            <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-bold tracking-wide text-[#64748b] dark:text-slate-400">
                  LAST RUNS
                </h2>
                <Clock3 size={15} className="text-slate-400" />
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center dark:border-slate-700">
                <Clock3 size={21} className="mx-auto mb-2 text-slate-300" />
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Run history is not connected yet
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Connect the salary run history API to show previous runs here.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RUN RESPONSE WARNING */}
        {showWarning && warning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <div className="flex items-center gap-2 font-semibold">
              <CircleAlert size={16} />
              Salary calculation warning
            </div>
            <p className="mt-1">{warning}</p>
          </div>
        )}

        {/* LOCKED LOCATIONS RESPONSE */}
        {showLockedLocations && lockedLocations.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Lock size={15} />
              Locked locations returned by salary API
            </div>

            <div className="space-y-1">
              {lockedLocations.map((item: any, index: number) => (
                <div key={index}>
                  {typeof item === "object"
                    ? item.loc_name ||
                      item.LocationName ||
                      item.name ||
                      item.Loc_Code ||
                      JSON.stringify(item)
                    : item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VALIDATION DETAILS MODAL */}
      <CustomModal
        open={isModalOpen}
        onClose={closeValidationModal}
        maxWidth="max-w-6xl"
      >
        <div className="flex items-center justify-between border-b border-borderColor bg-[#F3F8FC] px-6 py-3 pr-14 dark:border-borderColor-dark dark:bg-black">
          <div>
            <h2 className="text-xl font-bold text-[#1f3b73] dark:text-white">
              {modalType === "leave" && "LEAVE DETAILS"}
              {modalType === "bank" && "BANK VALIDATION DETAILS"}
              {modalType === "calc" && "ATTENDANCE CALCULATION DETAILS"}
              {modalType === "lock" && "ATTENDANCE LOCK DETAILS"}
            </h2>

            <p className="mt-1 text-[11px] text-slate-500">
              Location:{" "}
              {locations.find((item) => item.id === activeLocationId)?.name ||
                activeLocationId}
              {" · "}
              {selectedMonth} {year}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 dark:bg-black sm:p-5">
          <div className="min-w-0">
            {modalData.length === 0 ? (
              <>
                {modalType === "bank" ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="mb-3 text-5xl text-green-600">✔</div>
                    <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                      Employee Bank Details Validation Completed
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      No missing or duplicate account found
                    </div>
                    <div className="mt-3 text-sm text-gray-500">
                      <b>Note: Account authenticity not verified.</b>
                    </div>
                  </div>
                ) : modalType === "calc" ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="mb-3 text-5xl text-green-600">✔</div>
                    <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                      All Employee Attendance Calculation is Done
                    </div>
                  </div>
                ) : modalType === "lock" ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    Attendance lock details not found.
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm text-slate-500">
                    No Data Found
                  </div>
                )}
              </>
            ) : modalType === "leave" ? (
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full border border-borderColor text-sm dark:border-borderColor-dark">
                  <thead className="sticky top-0 z-10 bg-[#F3F8FC] dark:bg-black">
                    <tr>
                      {[
                        "Emp Code",
                        "Name",
                        "Designation",
                        "Location",
                        "Date",
                        "Reason",
                        "Status",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="border border-borderColor p-2 text-left text-header dark:border-borderColor-dark dark:text-white"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {modalData.map((item, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item.empcode}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item.empfirstname}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item.employeedesignation}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item.LocationName}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {formatDate(item.dateoffice)}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item.MispunchName}
                        </td>
                        <td className="border border-borderColor p-2">
                          <span
                            className="rounded px-2 py-1 text-xs text-white"
                            style={{
                              backgroundColor:
                                item.Status === "Approved"
                                  ? "#16a34a"
                                  : item.Status === "Rejected"
                                    ? "#dc2626"
                                    : "#f59e0b",
                            }}
                          >
                            {item.Status}
                          </span>
                        </td>
                        <td className="border border-borderColor p-2">
                          {item.Status !== "Approved" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCancelLeave(item.empcode, item.UTD)
                              }
                              className="whitespace-nowrap rounded bg-red-500 px-3 py-1 text-xs text-white transition hover:bg-red-600"
                            >
                              Cancel Leave
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : modalType === "bank" ? (
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full border border-borderColor text-sm dark:border-borderColor-dark">
                  <thead className="sticky top-0 z-10 bg-[#F3F8FC] dark:bg-black">
                    <tr>
                      {[
                        "Emp Code",
                        "Name",
                        "Account No",
                        "Payment Mode",
                        "Issue",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="border border-borderColor p-2 text-left text-header dark:border-borderColor-dark dark:text-white"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {modalData.map((item, index) => {
                      const issue = !item.BANKACCOUNTNO
                        ? "Missing Account"
                        : "Duplicate Account";

                      return (
                        <tr
                          key={index}
                          className="transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                            {item?.empcode}
                          </td>
                          <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                            {item?.empfirstname}
                          </td>
                          <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                            {item?.BANKACCOUNTNO || "-"}
                          </td>
                          <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                            {item?.PAYMENTMODE}
                          </td>
                          <td className="border border-borderColor p-2">
                            <span className="rounded bg-red-600 px-2 py-1 text-xs text-white">
                              {issue}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : modalType === "calc" ? (
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full border border-borderColor text-sm dark:border-borderColor-dark">
                  <thead className="sticky top-0 z-10 bg-[#F3F8FC] dark:bg-black">
                    <tr>
                      {[
                        "Emp Code",
                        "Name",
                        "Designation",
                        "Month",
                        "Status",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="border border-borderColor p-2 text-left text-header dark:border-borderColor-dark dark:text-white"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {modalData.map((item, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item?.EMP_CODE}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item?.EmpFirstName}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item?.EMPLOYEEDESIGNATION}
                        </td>
                        <td className="border border-borderColor p-2 text-header dark:border-borderColor-dark dark:text-white">
                          {item?.Month}
                        </td>
                        <td className="border border-borderColor p-2">
                          <span className="rounded bg-amber-500 px-2 py-1 text-xs text-white">
                            Running
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : modalType === "lock" ? (
              <div className="space-y-2 rounded-lg border border-borderColor bg-white p-4 text-sm dark:border-borderColor-dark dark:bg-slate-900">
                <div className="text-header dark:text-white">
                  <b>Location:</b>{" "}
                  {modalData[0]?.locationName ||
                    locations.find((item) => item.id === activeLocationId)
                      ?.name ||
                    "-"}
                </div>

                <div className="text-header dark:text-white">
                  <b>Lock Date:</b> {formatDate(modalData[0]?.Join_Date)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CustomModal>

      {/* ALREADY RUNNING PROCESS MODAL */}
      <CustomModal
        open={isProcessModalOpen}
        onClose={closeProcessModal}
        maxWidth="max-w-screen-xl"
      >
        <div className="border-b border-slate-200 px-6 py-4 pr-14 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white sm:text-2xl">
            Salary Calculation Process is Already In Progress
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Please wait until the existing salary calculation process completes.
          </p>
        </div>

        {processData && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 dark:text-slate-200">
              <p>
                <b>Total Pending Employees :</b> {processData?.total_emp || 0}
              </p>

              <p>
                <b>Estimated Waiting Time :</b>{" "}
                {processData?.estimated_time || "0 minutes"}
              </p>
            </div>

            <div className="mt-4 max-h-[450px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="sticky top-0 z-10 bg-[#F3F8FC] text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <tr className="font-semibold">
                    <th className="p-3 text-left">Emp Code</th>
                    <th className="p-3 text-left">Month</th>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Imported By</th>
                    <th className="p-3 text-left">Imported On</th>
                  </tr>
                </thead>

                <tbody>
                  {processData?.result?.length ? (
                    processData.result.map((row: AnyRecord, index: number) => (
                      <tr
                        key={index}
                        className="border-t border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        <td className="p-3">{row.Emp_Code || "-"}</td>
                        <td className="p-3">{row.Rerun || "-"}</td>
                        <td className="p-3">{row.loc_name || "-"}</td>
                        <td className="p-3">{row.Created_by || "-"}</td>
                        <td className="p-3">
                          {row.Created_At
                            ? new Date(row.Created_At).toLocaleString("en-IN")
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-slate-500"
                      >
                        No pending process details found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CustomModal>

      {/* DARK MODE */}
      <style jsx global>{`
        .dark .glb-page input:not([type="checkbox"]),
        .dark .glb-page select {
          color: #e2e8f0;
        }

        .dark .glb-page input::placeholder {
          color: #94a3b8;
          opacity: 1;
        }

        .dark .glb-page select option {
          color: #e2e8f0;
          background: #202c3e;
        }

        .glb-page {
          overflow-x: clip;
        }
      `}</style>
    </div>
  );
}

function ChecklistItem({
  icon,
  color,
  title,
  description,
}: {
  icon: React.ReactNode;
  color: "indigo" | "sky" | "violet" | "rose";
  title: string;
  description: string;
}) {
  const colors = {
    indigo:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300",
    violet:
      "bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300",
  };

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg ${colors[color]}`}
      >
        {icon}
      </div>

      <div className="min-w-0 pt-0.5">
        <h3 className="text-[12px] font-semibold leading-4 text-[#26354d] dark:text-slate-200">
          {title}
        </h3>

        <p className="mt-1 text-[11px] leading-[17px] text-[#64748b] dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
