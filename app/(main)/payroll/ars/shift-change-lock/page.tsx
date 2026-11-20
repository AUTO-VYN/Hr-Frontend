"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Lock, ArrowRightLeft, CalendarDays, Clock, Gift } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import ArsActionTemplate, {
  OptionType,
  InfoCardItem,
} from "@/components/Templates/ArsActionTemplate";

export default function ShiftChangeLockPage() {
  const user: any = useCurrentUser();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [channelOptions, setChannelOption] = useState<OptionType[]>([]);
  const [clusterOptions, setClusterOption] = useState<OptionType[]>([]);
  const [salRegionOptions, setSalRegionOption] = useState<OptionType[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<(string | number)[]>([]);

  const [formdata, setFormData] = useState<{
    Shift_Date: string | null;
    Channel: any;
    Cluster: any;
    Region: any;
    Month: string | null;
  }>({
    Shift_Date: null,
    Channel: null,
    Cluster: null,
    Region: null,
    Month: null,
  });

  const [locationData, setLocationData] = useState<any[]>([]);

  /* ------------------------------------------------------------------ */
  /*  Side Alert Notification Helper                                    */
  /* ------------------------------------------------------------------ */
  function showSideAlert(message: string, type: "success" | "error" | "warning" | "info" = "info") {
    const Toast = Swal.mixin({
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
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Fetch Dropdown Masters                                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );

        const convertValuesToString = (array: any[]) => {
          if (!Array.isArray(array)) return [];
          return array.map((obj) => ({
            label: obj.label,
            value: String(obj.value),
          }));
        };

        const masters = data.data.data;
        if (masters) {
          setChannelOption(convertValuesToString(masters.CHANNEL1));
          setClusterOption(convertValuesToString(masters.CLUSTER1));
          setSalRegionOption(convertValuesToString(masters.Sal_Region));
        }
      } catch (err) {
        console.error("Error fetching masters:", err);
      }
    };

    if (user?.Comp_Code) {
      fetchData();
    }
  }, [user?.Comp_Code, user?.name]);

  /* ------------------------------------------------------------------ */
  /*  Fetch Locations based on user branch & filters                     */
  /* ------------------------------------------------------------------ */
  const fetchLocationData = async () => {
    if (user?.EMPCODE && user?.Comp_Code) {
      setIsLoading(true);
      try {
        const locationsArray = user?.branch
          ? String(user.branch).split(",").map(Number)
          : [];

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunGetLocation_2`,
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
  /*  Handlers                                                          */
  /* ------------------------------------------------------------------ */
  const handleInputChange = (name: string, value: any) => {
    const fieldName = name === "Date" ? "Shift_Date" : name;
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleToggleLocation = (val: string | number) => {
    setSelectedLocations((prev) =>
      prev.includes(val)
        ? prev.filter((location) => location !== val)
        : [...prev, val]
    );
  };

  const handleToggleAll = () => {
    if (selectedLocations.length === locationData.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(locationData.map((loc) => loc.value));
    }
  };

  const handleClear = () => {
    setSelectedLocations([]);
    setFormData({
      Channel: null,
      Cluster: null,
      Region: null,
      Month: null,
      Shift_Date: null,
    });
  };

  const handleQuickSet = (type: "last-month" | "yesterday" | "this-month") => {
    const today = new Date();
    let target = new Date();
    if (type === "last-month") {
      target = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (type === "yesterday") {
      target = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    } else if (type === "this-month") {
      target = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    handleInputChange("Shift_Date", `${yyyy}-${mm}-${dd}`);
  };

  /* ------------------------------------------------------------------ */
  /*  Submit: Update Shift Lock                                         */
  /* ------------------------------------------------------------------ */
  const handleUpdateLocation = async () => {
    if (!formdata?.Shift_Date) {
      showSideAlert("Pick the shift date to continue", "warning");
      return;
    }

    if (!formdata?.Region) {
      showSideAlert("Please select an Region.", "warning");
      return;
    }

    if (selectedLocations.length === 0) {
      showSideAlert("Please select at least one location", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/UpdateShiftByLocation`,
        {
          regionCode: formdata?.Region,
          joinDate: formdata?.Shift_Date,
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
        const smessage = result.data.message || "Shift locked successfully";
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
          Shift_Date: null,
        });
        await fetchLocationData();
      } else {
        Swal.fire({
          icon: "error",
          title: "Warning",
          text: result.data?.message || "Failed to update shift lock",
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
  /*  Unlock Branch Action                                              */
  /* ------------------------------------------------------------------ */
  const handleUnlock = async (locValue: string | number) => {
    const confirm = await Swal.fire({
      title: "Unlock Shift?",
      text: "Are you sure you want to unlock this branch?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, unlock",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/UpdateShiftByLocation`,
        {
          regionCode: formdata?.Region || 0,
          joinDate: null,
          selectedLocations: [locValue],
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.data?.Status) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: result.data.message || "Branch unlocked successfully",
        });
        await fetchLocationData();
      } else {
        Swal.fire({
          icon: "error",
          title: "Warning",
          text: result.data?.message || "Failed to unlock branch",
        });
      }
    } catch (err: any) {
      console.error("Error unlocking branch:", err);
      Swal.fire({
        icon: "error",
        title: "Warning",
        text: err?.response?.data?.message || "Error unlocking branch",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Format Display Date Helper                                        */
  /* ------------------------------------------------------------------ */
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
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  /* ------------------------------------------------------------------ */
  /*  Map Items for Template                                            */
  /* ------------------------------------------------------------------ */
  const itemsForTemplate = useMemo(() => {
    return locationData.map((loc) => ({
      ...loc,
      label: loc.label,
      value: loc.value,
      dateText: loc.Shift_Date ? formatDisplayDate(loc.Shift_Date) : undefined,
      metaText: loc.Cluster
        ? `${loc.Cluster}${loc.empCount ? ` · ${loc.empCount} emp` : ""}`
        : loc.empCount
        ? `${loc.empCount} emp`
        : undefined,
    }));
  }, [locationData]);

  /* ------------------------------------------------------------------ */
  /*  Currently Locked Summary for Sidebar                              */
  /* ------------------------------------------------------------------ */
  const currentlyLockedItems = useMemo(() => {
    return locationData
      .filter((loc) => Boolean(loc.Shift_Date))
      .map((loc) => {
        const dateStr = formatDisplayDate(loc.Shift_Date);
        const clusterMeta = loc.Cluster ? `${loc.Cluster} · ` : "";
        return {
          label: loc.label,
          date: dateStr,
          meta: `${clusterMeta}Shift date ${dateStr}`,
          value: loc.value,
          onUnlock: () => handleUnlock(loc.value),
        };
      });
  }, [locationData]);

  /* ------------------------------------------------------------------ */
  /*  Validation Indicator                                              */
  /* ------------------------------------------------------------------ */
  const validationText = useMemo(() => {
    if (!formdata.Shift_Date) {
      return "Pick the shift date to continue";
    }
    if (!formdata.Region) {
      return "Please select an Region.";
    }
    if (selectedLocations.length === 0) {
      return "Select at least one location";
    }
    return `${selectedLocations.length} locations selected`;
  }, [formdata.Shift_Date, formdata.Region, selectedLocations.length]);

  const validationStatus = useMemo(() => {
    if (!formdata.Shift_Date || !formdata.Region || selectedLocations.length === 0) {
      return "error" as const;
    }
    return "success" as const;
  }, [formdata.Shift_Date, formdata.Region, selectedLocations.length]);

  /* ------------------------------------------------------------------ */
  /*  Info Rules for Right Sidebar                                      */
  /* ------------------------------------------------------------------ */
  const lockRules: InfoCardItem[] = [
    {
      icon: <ArrowRightLeft className="h-4 w-4" />,
      iconBgClass: "bg-[#FFE4E6] dark:bg-[#4C0519]",
      iconColorClass: "text-[#E11D48] dark:text-[#FDA4AF]",
      title: "No shift reassignment",
      description:
        "Shift change requests and roster uploads reject dates on or before the lock date.",
    },
    {
      icon: <CalendarDays className="h-4 w-4" />,
      iconBgClass: "bg-[#FEF3C7] dark:bg-[#451A03]",
      iconColorClass: "text-[#D97706] dark:text-[#FCD34D]",
      title: "Week off changes blocked",
      description:
        "Weekly off change requests for locked dates cannot be raised or approved.",
    },
    {
      icon: <Clock className="h-4 w-4" />,
      iconBgClass: "bg-[#F3E8FF] dark:bg-[#3B0764]",
      iconColorClass: "text-[#9333EA] dark:text-[#D8B4FE]",
      title: "Overtime basis fixed",
      description:
        "Shift windows stay put, so late marks and OT stop moving after the fact.",
    },
    {
      icon: <Gift className="h-4 w-4" />,
      iconBgClass: "bg-[#DCFCE7] dark:bg-[#052E16]",
      iconColorClass: "text-[#16A34A] dark:text-[#86EFAC]",
      title: "Comp off eligibility settled",
      description:
        "Nobody can turn a working day into a week off to earn comp off.",
    },
  ];

  return (
    <ArsActionTemplate
      title="Shift change lock"
      subtitle="Stop branches from moving employees between shifts for dates up to the chosen day. Roster and week-off changes stay locked with it."
      filterMode="date-lock"
      dateFieldLabel="SHIFT DATE"
      channelOptions={channelOptions}
      clusterOptions={clusterOptions}
      regionOptions={salRegionOptions}
      selectedChannel={formdata.Channel}
      selectedCluster={formdata.Cluster}
      selectedRegion={formdata.Region}
      selectedDate={formdata.Shift_Date}
      onFilterChange={handleInputChange}
      showQuickSet={true}
      onQuickSet={handleQuickSet}
      selectionLabel="Locations"
      items={itemsForTemplate}
      selectedValues={selectedLocations}
      onToggleItem={handleToggleLocation}
      onToggleAll={handleToggleAll}
      actionButtonText="Apply shift lock"
      actionButtonIcon={<Lock className="h-4 w-4 text-white" />}
      onAction={handleUpdateLocation}
      showClearButton={true}
      onClear={handleClear}
      validationText={validationText}
      validationStatus={validationStatus}
      currentlyLocked={{
        title: "CURRENTLY LOCKED",
        countText: `${currentlyLockedItems.length} locked`,
        emptyText: "No branch is locked right now.",
        items: currentlyLockedItems,
      }}
      infoCards={{
        title: "WHAT THE LOCK BLOCKS",
        items: lockRules,
      }}
      isLoading={isLoading}
    />
  );
}
