"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Button from "@/components/atoms/Button";
import {
  Lock,
  ArrowLeft,
  Search,
  Check,
  Fingerprint,
  Clock,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface OptionType {
  label: string;
  value: string;
}

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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function AttendanceLockPage() {
  const user: any = useCurrentUser();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [LocationSearch, setLocationSearch] = useState<string>("");
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
  function showSideAlert(message: string, type: "success" | "error" | "warning" | "info" = "info") {
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
  /*  Filter Locations by Search                                        */
  /* ------------------------------------------------------------------ */
  const filteredLocations = useMemo(() => {
    if (!LocationSearch.trim()) return locationData;
    const q = LocationSearch.toLowerCase();
    return locationData.filter((loc) =>
      String(loc.label || "").toLowerCase().includes(q)
    );
  }, [locationData, LocationSearch]);

  /* ------------------------------------------------------------------ */
  /*  Checkbox selection handlers                                       */
  /* ------------------------------------------------------------------ */
  const handleCheckboxChange = (value: number | string) => {
    setSelectedLocations((prev) =>
      prev.includes(value)
        ? prev.filter((loc) => loc !== value)
        : [...prev, value]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === filteredLocations.length && filteredLocations.length > 0) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(filteredLocations.map((loc) => loc.value));
    }
  };

  const isAllSelected =
    filteredLocations.length > 0 &&
    selectedLocations.length === filteredLocations.length;

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
  /*  Currently locked summary                                          */
  /* ------------------------------------------------------------------ */
  const currentlyLocked = useMemo(() => {
    return locationData.filter((loc) => Boolean(loc.Join_Date));
  }, [locationData]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] dark:bg-[#0A0F1C] dark:text-[#E7ECF3] px-6 py-5 md:px-8 md:py-6 font-['Inter',system-ui,sans-serif] antialiased">
      {/* Top Header */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Attendance lock
          </h1>
          <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Freeze attendance up to a date so nobody can edit punches after payroll is calculated. Locked branches reject mispunch approvals and Excel imports.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="!h-[34px] !rounded-[9px] !px-3.5 !text-[12px] !font-[550] !border-[#E2E8F0] dark:!border-[#1F2937] !shadow-none"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back
        </Button>
      </div>

      {/* Main Grid: Left 2 Cards + Right Sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* LEFT COLUMN: Filters + Locations Checklist */}
        <div className="flex flex-col gap-4">
          {/* CARD 1: Filters & Quick set */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
              {/* CHANNEL */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                  CHANNEL
                </span>
                <Eselect
                  name="Channel"
                  option={channelOptions}
                  isMulti={true}
                  hideChevron={true}
                  placeholder="Add channel"
                  initialValue={formdata.Channel}
                  handleInputChange={handleInputChange}
                  mb={0}
                  className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-2.5 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
                />
              </div>

              {/* CLUSTER */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                  CLUSTER
                </span>
                <Eselect
                  name="Cluster"
                  option={clusterOptions}
                  isMulti={true}
                  hideChevron={true}
                  placeholder="Add cluster"
                  initialValue={formdata.Cluster}
                  handleInputChange={handleInputChange}
                  mb={0}
                  className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-2.5 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
                />
              </div>

              {/* REGION */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                  REGION
                </span>
                <Eselect
                  name="Region"
                  option={salRegionOptions}
                  hideChevron={true}
                  placeholder="All regions"
                  initialValue={formdata.Region}
                  handleInputChange={handleInputChange}
                  mb={0}
                  className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
                />
              </div>

              {/* LOCK DATE * */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                  LOCK DATE <span className="text-[#E11D48]">*</span>
                </span>
                <Einput
                  type="date"
                  name="Join_Date"
                  value={formdata.Join_Date ?? ""}
                  placeholder="dd-mm-yyyy"
                  onChange={(e) => handleInputChange("Join_Date", e.target.value)}
                  hideLabel
                  wrapperClassName="w-full"
                  className={`!h-[38px] !rounded-[9px] !text-[12.5px] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-visible:!ring-0 ${
                    !formdata.Join_Date
                      ? "!border-[#FDA4AF] ring-1 ring-[#FDA4AF]/40 focus-visible:!border-[#E11D48]"
                      : "!border-[#E2E8F0] dark:!border-[#1F2937] focus-visible:!border-[#4F46E5]"
                  }`}
                />
              </div>
            </div>

            {/* Quick set buttons */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#1F2937]">
              <span className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mr-1">
                Quick set
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickSet("last-month")}
                className="!h-[32px] !rounded-[8px] !px-3 !text-[12px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] text-[#334155] dark:text-[#E7ECF3] hover:!bg-[#F8FAFC] !shadow-none"
              >
                End of last month
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickSet("yesterday")}
                className="!h-[32px] !rounded-[8px] !px-3 !text-[12px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] text-[#334155] dark:text-[#E7ECF3] hover:!bg-[#F8FAFC] !shadow-none"
              >
                Yesterday
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleQuickSet("this-month")}
                className="!h-[32px] !rounded-[8px] !px-3 !text-[12px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] text-[#334155] dark:text-[#E7ECF3] hover:!bg-[#F8FAFC] !shadow-none"
              >
                End of this month
              </Button>
            </div>
          </div>

          {/* CARD 2: Locations checklist */}
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
            {/* Header of Checklist */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3 dark:border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSelectAll}
                  title={isAllSelected ? "Deselect all" : "Select all"}
                  className={`!grid !h-4 !w-4 !p-0 shrink-0 place-items-center !rounded-[4px] border transition !shadow-none ${
                    isAllSelected
                      ? "!border-[#4F46E5] !bg-[#4F46E5] !text-white dark:!border-[#8B84FF] dark:!bg-[#8B84FF]"
                      : "!border-[#CBD5E1] !bg-transparent !text-transparent dark:!border-[#374151]"
                  }`}
                >
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </Button>

                <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                  Locations
                </span>

                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  {selectedLocations.length > 0
                    ? `${selectedLocations.length} of ${filteredLocations.length} selected`
                    : `${filteredLocations.length} in this filter`}
                </span>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] dark:text-[#94A3B8] z-10" />
                <Einput
                  type="text"
                  name="LocationSearch"
                  placeholder="Search locations"
                  value={LocationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  hideLabel
                  wrapperClassName="w-full"
                  className="!h-8 !w-full !rounded-[9px] !pl-9 !pr-3 !text-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] shadow-none placeholder:!text-[#64748B]/60 focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="max-h-[300px] overflow-y-auto p-3.5">
              {isLoading ? (
                <div className="py-12 text-center text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Loading locations…
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                  No locations found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {filteredLocations.map((loc) => {
                    const isChecked = selectedLocations.includes(loc.value);
                    const metaParts: string[] = [];
                    if (loc.Cluster) metaParts.push(loc.Cluster);
                    if (loc.Region) metaParts.push(loc.Region);
                    if (typeof loc.empCount === "number") {
                      metaParts.push(`${loc.empCount} emp`);
                    }
                    const metaText = metaParts.join(" · ") || "DELHI · 86 emp";

                    return (
                      <Button
                        key={String(loc.value)}
                        type="button"
                        variant="ghost"
                        onClick={() => handleCheckboxChange(loc.value)}
                        className={`!flex !w-full !justify-start !items-center !gap-2.5 !rounded-[8px] !px-3 !py-2.5 !h-auto text-left transition !shadow-none !font-normal ${
                          isChecked
                            ? "!bg-[#EEF2FF] !text-[#4F46E5] dark:!bg-[#1E1B4B] dark:!text-[#8B84FF]"
                            : "!bg-transparent !text-[#1E293B] hover:!bg-slate-100/70 dark:!text-[#E7ECF3] dark:hover:!bg-[#182235]"
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition ${
                            isChecked
                              ? "border-[#4F46E5] bg-[#4F46E5] text-white dark:border-[#8B84FF] dark:bg-[#8B84FF]"
                              : "border-[#CBD5E1] bg-white dark:border-[#374151] dark:bg-[#0E1524]"
                          }`}
                        >
                          {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>

                        <span
                          className={`flex-1 truncate text-[12.5px] uppercase tracking-[0.01em] ${
                            isChecked ? "font-bold text-[#4F46E5]" : "font-bold text-[#1E293B] dark:text-[#E7ECF3]"
                          }`}
                        >
                          {loc.label}
                        </span>

                        {loc.Join_Date ? (
                          <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#E11D48] shrink-0">
                            <Lock className="h-3.5 w-3.5 text-[#E11D48]" />
                            {formatDisplayDate(loc.Join_Date)}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                            {metaText}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-white px-4 py-3.5 dark:border-[#1F2937] dark:bg-[#111827]">
              {/* Validation / Status Indicator */}
              <div className="flex items-center min-w-0">
                {!formdata.Join_Date ? (
                  <span className="text-[12.5px] font-medium text-[#E11D48]">
                    Pick the lock date to continue
                  </span>
                ) : !formdata.Region ? (
                  <span className="text-[12.5px] font-medium text-[#E11D48]">
                    Please select an Region
                  </span>
                ) : selectedLocations.length === 0 ? (
                  <span className="text-[12.5px] font-medium text-[#E11D48]">
                    Select at least one location
                  </span>
                ) : (
                  <span className="text-[12.5px] font-medium text-[#10B981]">
                    {selectedLocations.length} locations selected
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="!h-[38px] !rounded-[9px] !px-4 !text-[12.5px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#334155] dark:text-[#E7ECF3] !shadow-none hover:!bg-[#F8FAFC]"
                >
                  Clear
                </Button>

                <Button
                  type="button"
                  onClick={handleUpdateLocation}
                  icon={<Lock className="h-4 w-4 text-white" />}
                  className="!h-[38px] !rounded-[9px] !px-5 !text-[12.5px] !font-semibold !bg-[#334155] hover:!bg-[#1E293B] text-white !shadow-none active:scale-[0.98] transition-all"
                >
                  Apply attendance lock
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Cards */}
        <div className="flex flex-col gap-4">
          {/* Card 3: CURRENTLY LOCKED */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-[650] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                CURRENTLY LOCKED
              </span>
              <span
                className={`text-[12px] font-bold ${
                  currentlyLocked.length > 0 ? "text-[#E11D48]" : "text-[#E11D48]"
                }`}
              >
                {currentlyLocked.length} locked
              </span>
            </div>

            <div className="mt-4">
              {currentlyLocked.length === 0 ? (
                <div className="py-6 text-center text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                  No location is locked right now.
                </div>
              ) : (
                <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1.5">
                  {currentlyLocked.map((loc) => {
                    const dt = loc.Join_Date
                      ? loc.Join_Date.split("T")[0].split("-").reverse().join("-")
                      : "Locked";
                    return (
                      <div
                        key={String(loc.value)}
                        className="flex items-center justify-between rounded-lg bg-[#F8FAFC] dark:bg-[#0E1524] px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="truncate font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                          {loc.label}
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-[#E11D48]">
                          {dt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: WHAT THE LOCK BLOCKS */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
            <span className="text-[11px] font-[650] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
              WHAT THE LOCK BLOCKS
            </span>

            <div className="mt-4 flex flex-col gap-3.5">
              {/* Item 1 */}
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#FFE4E6] text-[#E11D48] dark:bg-[#4C0519] dark:text-[#FDA4AF]">
                  <Fingerprint className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    No punch edits
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                    Manual attendance, bulk punch and Excel import all reject dates on or before the lock date.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#FEF3C7] text-[#D97706] dark:bg-[#451A03] dark:text-[#FCD34D]">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Approvals frozen
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                    Pending mispunch and leave approvals for locked dates can no longer be actioned.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#F3E8FF] text-[#9333EA] dark:bg-[#3B0764] dark:text-[#D8B4FE]">
                  <Calculator className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Calculation skips locked days
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                    Re-running attendance calculation leaves locked days exactly as they are.
                  </p>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#DCFCE7] text-[#16A34A] dark:bg-[#052E16] dark:text-[#86EFAC]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Payroll safe to disburse
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                    Paid days cannot shift under a salary that has already been calculated.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
