"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import {
  Lock,
  Fingerprint,
  Clock,
  Calculator,
  ShieldCheck,
} from "lucide-react";
import ArsActionTemplate, {
  OptionType,
  InfoCardItem,
  ArsItem,
} from "@/components/Templates/ArsActionTemplate";

interface LocationItem {
  label: string;
  value: number | string;
  Join_Date?: string | null;
  Cluster?: string;
  Region?: string;
  Channel?: string;
  empCount?: number;
}

const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const cleanStr = String(dateStr).split("T")[0];
  const parts = cleanStr.split(/[-/]/);
  let d: Date;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function AttendanceLockPage() {
  const user: any = useCurrentUser();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [channelOptions, setChannelOption] = useState<OptionType[]>([]);
  const [clusterOptions, setClusterOption] = useState<OptionType[]>([]);
  const [salRegionOptions, setSalRegionOption] = useState<OptionType[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<(number | string)[]>([]);

  const [formdata, setFormData] = useState<{
    Join_Date: string | null;
    Channel: any;
    Cluster: any;
    Region: any;
    Month: string | null;
  }>({
    Join_Date: null,
    Channel: null,
    Cluster: null,
    Region: null,
    Month: null,
  });

  const [locationData, setLocationData] = useState<LocationItem[]>([]);

  /* ------------------------------------------------------------------ */
  /*  Toast Alert Helper                                                */
  /* ------------------------------------------------------------------ */
  function showSideAlert(
    message: string,
    type: "success" | "error" | "warning" | "info" = "info"
  ) {
    Swal.mixin({
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
    }).fire({
      icon: type,
      title: message,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Fetch Masters Data                                                */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );

        const convertValuesToString = (array: any[] = []): OptionType[] => {
          return array.map((obj) => ({
            label: String(obj.label || ""),
            value: String(obj.value ?? ""),
          }));
        };

        const masters = res?.data?.data || {};
        setChannelOption(convertValuesToString(masters.CHANNEL1));
        setClusterOption(convertValuesToString(masters.CLUSTER1));
        setSalRegionOption(convertValuesToString(masters.Sal_Region));
      } catch (err) {
        console.error("Error fetching masters:", err);
      }
    };

    if (user?.Comp_Code) {
      fetchData();
    }
  }, [user?.Comp_Code, user?.name]);

  /* ------------------------------------------------------------------ */
  /*  Fetch Location Data                                               */
  /* ------------------------------------------------------------------ */
  const fetchLocationData = async () => {
    if (user?.EMPCODE && user?.Comp_Code) {
      setIsLoading(true);
      try {
        const locationsArray = user?.branch
          ? String(user.branch).split(",").map(Number)
          : [];

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunGetLocation_1`,
          {
            locations: locationsArray,
            Channel: formdata.Channel,
            Cluster: formdata.Cluster,
            Region: formdata.Region,
          },
          {
            headers: {
              compcode: user.Comp_Code,
              name: user.name,
            },
          }
        );

        setLocationData(response?.data?.results || []);
      } catch (error) {
        console.error("Error fetching locations:", error);
        showSideAlert("Error fetching data", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user?.branch) {
      fetchLocationData();
    }
  }, [user?.branch, formdata.Channel, formdata.Cluster, formdata.Region]);

  /* ------------------------------------------------------------------ */
  /*  Selection Handlers                                                */
  /* ------------------------------------------------------------------ */
  const handleToggleItem = (value: number | string) => {
    setSelectedLocations((prev) =>
      prev.includes(value)
        ? prev.filter((loc) => loc !== value)
        : [...prev, value]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === locationData.length && locationData.length > 0) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(locationData.map((loc) => loc.value));
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name === "Date" ? "Join_Date" : name]: value,
    }));
  };

  /* ------------------------------------------------------------------ */
  /*  Quick Set Date Buttons                                            */
  /* ------------------------------------------------------------------ */
  const handleQuickSet = (type: "last-month" | "yesterday" | "this-month") => {
    const now = new Date();
    let target = new Date();

    if (type === "last-month") {
      target = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === "yesterday") {
      target = new Date(now);
      target.setDate(now.getDate() - 1);
    } else if (type === "this-month") {
      target = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, Join_Date: `${yyyy}-${mm}-${dd}` }));
  };

  /* ------------------------------------------------------------------ */
  /*  Clear Form & Selection                                            */
  /* ------------------------------------------------------------------ */
  const handleClear = () => {
    setSelectedLocations([]);
    setFormData({
      Channel: null,
      Cluster: null,
      Region: null,
      Month: null,
      Join_Date: null,
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Submit Lock Update                                                */
  /* ------------------------------------------------------------------ */
  const handleUpdateLocation = async () => {
    if (!formdata?.Region) {
      showSideAlert("Please select an Region.", "warning");
      return;
    }

    if (!formdata?.Join_Date) {
      showSideAlert("Please select an Lock Date", "warning");
      return;
    }

    if (selectedLocations.length === 0) {
      showSideAlert("Please select at least one location", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/UpdateAttendanseByLocation`,
        {
          regionCode: formdata?.Region,
          joinDate: formdata?.Join_Date,
          selectedLocations,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.data?.Status) {
        const smessage = result.data?.message || "Attendance locked successfully";
        Swal.fire({
          icon: "success",
          title: "Success",
          text: smessage,
        });
        setSelectedLocations([]);
        setFormData({
          Channel: null,
          Cluster: null,
          Region: null,
          Month: null,
          Join_Date: null,
        });
        await fetchLocationData();
      } else {
        Swal.fire({
          icon: "error",
          title: "Warning",
          text: result.data?.message || "Failed to update attendance lock",
        });
      }
    } catch (error: any) {
      console.error("Error updating location:", error);
      Swal.fire({
        icon: "error",
        title: "Warning",
        text: error?.response?.data?.message || "Error updating location",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Items mapping for Template                                        */
  /* ------------------------------------------------------------------ */
  const itemsForTemplate: ArsItem[] = useMemo(() => {
    return locationData.map((loc) => {
      const metaParts: string[] = [];
      if (loc.Cluster) metaParts.push(loc.Cluster);
      if (loc.Region) metaParts.push(loc.Region);
      if (typeof loc.empCount === "number") {
        metaParts.push(`${loc.empCount} emp`);
      }
      const metaText = metaParts.join(" · ") || "DELHI · 86 emp";

      return {
        label: loc.label,
        value: loc.value,
        dateText: loc.Join_Date ? formatDisplayDate(loc.Join_Date) : null,
        metaText,
        Join_Date: loc.Join_Date,
        Cluster: loc.Cluster,
        Region: loc.Region,
        Channel: loc.Channel,
      };
    });
  }, [locationData]);

  /* ------------------------------------------------------------------ */
  /*  Currently locked summary                                          */
  /* ------------------------------------------------------------------ */
  const currentlyLocked = useMemo(() => {
    return locationData.filter((loc) => Boolean(loc.Join_Date));
  }, [locationData]);

  const currentlyLockedConfig = useMemo(() => {
    return {
      title: "CURRENTLY LOCKED",
      countText: `${currentlyLocked.length} locked`,
      emptyText: "No location is locked right now.",
      items: currentlyLocked.map((loc) => {
        const dt = loc.Join_Date
          ? loc.Join_Date.split("T")[0].split("-").reverse().join("-")
          : "Locked";
        return {
          label: loc.label,
          date: dt,
          value: loc.value,
        };
      }),
    };
  }, [currentlyLocked]);

  /* ------------------------------------------------------------------ */
  /*  Rules Card items                                                  */
  /* ------------------------------------------------------------------ */
  const lockRules: InfoCardItem[] = [
    {
      icon: <Fingerprint className="h-4 w-4" />,
      iconBgClass: "bg-[#FFE4E6] dark:bg-[#4C0519]",
      iconColorClass: "text-[#E11D48] dark:text-[#FDA4AF]",
      title: "No punch edits",
      description:
        "Manual attendance, bulk punch and Excel import all reject dates on or before the lock date.",
    },
    {
      icon: <Clock className="h-4 w-4" />,
      iconBgClass: "bg-[#FEF3C7] dark:bg-[#451A03]",
      iconColorClass: "text-[#D97706] dark:text-[#FCD34D]",
      title: "Approvals frozen",
      description:
        "Pending mispunch and leave approvals for locked dates can no longer be actioned.",
    },
    {
      icon: <Calculator className="h-4 w-4" />,
      iconBgClass: "bg-[#F3E8FF] dark:bg-[#3B0764]",
      iconColorClass: "text-[#9333EA] dark:text-[#D8B4FE]",
      title: "Calculation skips locked days",
      description:
        "Re-running attendance calculation leaves locked days exactly as they are.",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      iconBgClass: "bg-[#DCFCE7] dark:bg-[#052E16]",
      iconColorClass: "text-[#16A34A] dark:text-[#86EFAC]",
      title: "Payroll safe to disburse",
      description:
        "Paid days cannot shift under a salary that has already been calculated.",
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Validation indicators                                             */
  /* ------------------------------------------------------------------ */
  const validationText = !formdata.Join_Date
    ? "Pick the lock date to continue"
    : !formdata.Region
    ? "Please select an Region"
    : selectedLocations.length === 0
    ? "Select at least one location"
    : `${selectedLocations.length} locations selected`;

  const validationStatus =
    !formdata.Join_Date || !formdata.Region || selectedLocations.length === 0
      ? ("error" as const)
      : ("success" as const);

  return (
    <ArsActionTemplate
      title="Attendance lock"
      subtitle="Freeze attendance up to a date so nobody can edit punches after payroll is calculated. Locked branches reject mispunch approvals and Excel imports."
      onBack={() => window.history.back()}
      filterMode="date-lock"
      dateFieldLabel="LOCK DATE"
      channelOptions={channelOptions}
      clusterOptions={clusterOptions}
      regionOptions={salRegionOptions}
      selectedChannel={formdata.Channel}
      selectedCluster={formdata.Cluster}
      selectedRegion={formdata.Region}
      selectedDate={formdata.Join_Date}
      onFilterChange={handleInputChange}
      showQuickSet={true}
      onQuickSet={handleQuickSet}
      selectionLabel="Locations"
      searchPlaceholder="Search locations"
      items={itemsForTemplate}
      selectedValues={selectedLocations}
      onToggleItem={handleToggleItem}
      onToggleAll={handleSelectAll}
      isLoadingItems={isLoading}
      emptyItemsText="No locations found."
      renderItemRight={(item) =>
        item.dateText ? (
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#E11D48] shrink-0">
            <Lock className="h-3.5 w-3.5 text-[#E11D48]" />
            {item.dateText}
          </span>
        ) : (
          <span className="shrink-0 text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
            {item.metaText}
          </span>
        )
      }
      validationText={validationText}
      validationStatus={validationStatus}
      actionButtonText="Apply attendance lock"
      actionButtonIcon={<Lock className="h-4 w-4 text-white" />}
      onAction={handleUpdateLocation}
      isActionLoading={isLoading}
      showClearButton={true}
      onClear={handleClear}
      currentlyLocked={currentlyLockedConfig}
      infoCards={{
        title: "WHAT THE LOCK BLOCKS",
        items: lockRules,
      }}
      isLoading={isLoading}
    />
  );
}
