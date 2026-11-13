"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Send,
  Calendar,
  History,
  Gift,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

// Mandatory components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

export default function AddWeeklyOffChangePage() {
  const user = useCurrentUser();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Helper date function (monthsBack = 0 -> today)
  function getCurrentDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Helper date formatter: "28-07-2026"
  const formatDisplayDate = (dStr: any) => {
    if (!dStr) return "";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return String(dStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  function showSideAlert(message: string, type: "success" | "error" | "warning" | "info") {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
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

  const [formData, setFormdata] = useState({
    EmpCode: user?.EMPCODE || "",
    EmpName: user?.name || "",
    RequestDate: getCurrentDate(),
    CurrentWO: "",
    CurrentWOName: "",
    NewWO: "",
    NewWOValue: "",
    NewWOName: "",
    ApplicableDate: "",
    Reason: "",
  });

  const [applicableDates, setApplicableDates] = useState<{ value: string; label: string }[]>([]);

  const Days = useMemo(
    () => [
      { value: "0", label: "Sunday", short: "Sun" },
      { value: "1", label: "Monday", short: "Mon" },
      { value: "2", label: "Tuesday", short: "Tue" },
      { value: "3", label: "Wednesday", short: "Wed" },
      { value: "4", label: "Thursday", short: "Thu" },
      { value: "5", label: "Friday", short: "Fri" },
      { value: "6", label: "Saturday", short: "Sat" },
    ],
    []
  );

  // Sync user details on load
  useEffect(() => {
    if (user?.EMPCODE || user?.name) {
      setFormdata((prev) => ({
        ...prev,
        EmpCode: user?.EMPCODE || prev.EmpCode,
        EmpName: user?.name || prev.EmpName,
      }));
    }
  }, [user]);

  // Fetch Current Weekly Off
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.EMPCODE) return;
      setIsLoading(true);
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/mobile/getCurrentWO`,
          {
            EMPCODE: user?.EMPCODE,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );

        const currentWOVal = response.data?.CurrentWO != null ? String(response.data?.CurrentWO) : "";
        const woNumber = Number(currentWOVal);

        const weekDays = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        const woName = !isNaN(woNumber) && weekDays[woNumber] ? weekDays[woNumber] : "";

        setFormdata((prev) => ({
          ...prev,
          CurrentWO: currentWOVal,
          CurrentWOName: woName,
        }));
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.EMPCODE, user?.Comp_Code, user?.name]);

  // Calculate upcoming 4 weekdays
  function getUpcomingWeekdays(weekdayNumber: number) {
    const result: { value: string; label: string }[] = [];
    const date = new Date();

    while (date.getDay() !== weekdayNumber) {
      date.setDate(date.getDate() + 1);
    }

    for (let i = 0; i < 4; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i * 7);

      const backendValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

      const dayObj = Days.find((item) => Number(item.value) === weekdayNumber);
      const dayLabel = dayObj ? dayObj.label : "";

      const uiLabel = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}/${d.getFullYear()} (${dayLabel})`;

      result.push({
        value: backendValue,
        label: uiLabel,
      });
    }

    return result;
  }

  // Handle generic input changes
  const handleChange = (name: string, value: any) => {
    setFormdata((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "NewWO") {
      const dayNumber = Number(value);
      const selectedDay = Days.find((d) => d.value === String(value));

      setFormdata((prev) => ({
        ...prev,
        NewWO: String(value),
        NewWOValue: String(value),
        NewWOName: selectedDay?.label || "",
      }));

      if (dayNumber >= 0 && dayNumber <= 6) {
        const dates = getUpcomingWeekdays(dayNumber);
        setApplicableDates(dates);

        if (dates.length > 0) {
          setFormdata((prev) => ({
            ...prev,
            ApplicableDate: dates[0].value,
          }));
        }
      } else {
        setApplicableDates([]);
      }
    }
  };

  // Handle day pill selection
  const handleSelectNewDay = (dayVal: string) => {
    handleChange("NewWO", dayVal);
  };

  // Handle Clear / Reset
  const handleClear = () => {
    setFormdata((prev) => ({
      ...prev,
      NewWO: "",
      NewWOValue: "",
      NewWOName: "",
      ApplicableDate: "",
      Reason: "",
    }));
    setApplicableDates([]);
  };

  // Check if same day selected
  const isSameDay =
    formData.NewWO !== "" &&
    formData.CurrentWO !== "" &&
    String(formData.NewWO) === String(formData.CurrentWO);

  // Submit Request
  const handleSubmit = async () => {
    if (!formData.NewWO) {
      showSideAlert("Please select a New Weekly Off day.", "warning");
      return;
    }

    if (isSameDay) {
      showSideAlert("The new day cannot be the same as the current weekly off.", "warning");
      return;
    }

    if (!formData.ApplicableDate) {
      showSideAlert("Please select an Applicable Date.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL_LOCAL}/mobile/applyWOChange`,
        formData,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      console.log(response, "response");
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Weekly Off Change Request Submitted Successfully",
      });

      handleClear();
    } catch (error: any) {
      console.error("Error saving data:", error);
      const errMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong while saving Weekly Off Change";

      showSideAlert(errMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Transition label: e.g. "Tuesday → Saturday"
  const transitionText = useMemo(() => {
    const cur = formData.CurrentWOName || "Current";
    const next = formData.NewWOName || "Select day";
    return `${cur} → ${next}`;
  }, [formData.CurrentWOName, formData.NewWOName]);

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-[22px_24px_64px_24px]"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        fontFeatureSettings: "'tnum' 1",
      }}
    >
      {/* 1. Page Title & Subtitle */}
      <div className="mb-[20px]">
        <h1 className="m-0 text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
          Change my weekly off
        </h1>
        <p className="mt-[4px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
          Pick the new day and when it should start. The roster below previews the first four weeks after the change.
        </p>
      </div>

      {/* 2. Main Layout (Two Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[20px] items-start">
        {/* LEFT COLUMN: Main Form & Roster Preview Card (8 cols) */}
        <div className="lg:col-span-8 bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[14px] p-[20px_22px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.12)]">
          {/* Top Row: Employee & Request Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px] mb-[20px]">
            <div>
              <Einput
                title="EMPLOYEE"
                type="text"
                name="EmpNameDisplay"
                value={`${formData.EmpName || "Employee"} · ${formData.EmpCode || ""}`}
                handleInputChange={() => {}}
                disabled
                className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#F8FAFC] dark:!bg-[#0E1524] !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] font-[500]"
                labelClassName="!text-[11px] !font-[650] !text-[#64748B] dark:!text-[#94A3B8] uppercase !tracking-[0.03em] mb-[4px] block"
              />
            </div>

            <div>
              <Einput
                title="REQUEST DATE"
                type="text"
                name="RequestDateDisplay"
                value={formatDisplayDate(formData.RequestDate)}
                handleInputChange={() => {}}
                disabled
                className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-[#FFFFFF] dark:!bg-[#0E1524] !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] font-[500]"
                labelClassName="!text-[11px] !font-[650] !text-[#64748B] dark:!text-[#94A3B8] uppercase !tracking-[0.03em] mb-[4px] block"
              />
            </div>
          </div>

          {/* Current Weekly Off Row */}
          <div className="mb-[20px]">
            <label className="text-[11px] font-[650] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em] block mb-[8px]">
              CURRENT WEEKLY OFF
            </label>
            <div className="grid grid-cols-7 gap-[8px]">
              {Days.map((d) => {
                const isCurrent = formData.CurrentWO !== "" && String(d.value) === String(formData.CurrentWO);

                return (
                  <div
                    key={d.value}
                    className={`rounded-[10px] p-[8px_4px] text-center select-none transition-all flex flex-col items-center justify-center min-h-[50px] ${
                      isCurrent
                        ? "border-2 border-[#06B6D4] bg-[#ECFEFF] dark:bg-[#083344]/30 shadow-xs"
                        : "border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] opacity-80"
                    }`}
                  >
                    <span
                      className={`text-[12px] font-[650] leading-none ${
                        isCurrent
                          ? "text-[#0891B2] dark:text-[#22D3EE]"
                          : "text-[#64748B] dark:text-[#94A3B8]"
                      }`}
                    >
                      {d.short}
                    </span>
                    {isCurrent && (
                      <span className="text-[9.5px] font-[700] text-[#0891B2] dark:text-[#22D3EE] uppercase tracking-[0.03em] mt-[3px]">
                        wo
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* New Weekly Off Row */}
          <div className="mb-[20px]">
            <label className="text-[11px] font-[650] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em] block mb-[8px]">
              NEW WEEKLY OFF <span className="text-[#EF4444]">*</span>
            </label>
            <div className="grid grid-cols-7 gap-[8px]">
              {Days.map((d) => {
                const isSelected = formData.NewWO !== "" && String(d.value) === String(formData.NewWO);
                const isSelectedSame = isSelected && isSameDay;

                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => handleSelectNewDay(d.value)}
                    className={`rounded-[10px] p-[8px_4px] text-center select-none cursor-pointer transition-all flex flex-col items-center justify-center min-h-[50px] ${
                      isSelectedSame
                        ? "border-2 border-[#F59E0B] bg-[#FFFBEB] dark:bg-[#78350F]/20 shadow-xs"
                        : isSelected
                        ? "border-2 border-[#10B981] bg-[#ECFDF5] dark:bg-[#064E3B]/20 shadow-xs ring-1 ring-[#10B981]/40"
                        : "border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] hover:border-[#CBD5E1] dark:hover:border-[#374151] hover:bg-[#F8FAFC] dark:hover:bg-[#131D2E]"
                    }`}
                  >
                    <span
                      className={`text-[12px] font-[650] leading-none ${
                        isSelectedSame
                          ? "text-[#B45309] dark:text-[#FBBF24]"
                          : isSelected
                          ? "text-[#059669] dark:text-[#34D399]"
                          : "text-[#1E293B] dark:text-[#E7ECF3]"
                      }`}
                    >
                      {d.short}
                    </span>
                    {isSelected && (
                      <span
                        className={`text-[9px] font-[750] uppercase tracking-[0.03em] mt-[3px] ${
                          isSelectedSame
                            ? "text-[#B45309] dark:text-[#FBBF24]"
                            : "text-[#059669] dark:text-[#34D399]"
                        }`}
                      >
                        NEW WO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Applicable From & Reason Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px] mb-[22px]">
            <div>
              <Eselect
                option={applicableDates}
                title="APPLICABLE FROM *"
                name="ApplicableDate"
                initialValue={formData.ApplicableDate}
                handleInputChange={handleChange}
                placeholder="Select applicable date"
                required
                className="!h-[38px] !rounded-[9px] !border-[#FCA5A5] dark:!border-[#991B1B] !text-[12.5px]"
                labelClassName="!text-[11px] !font-[650] !text-[#64748B] dark:!text-[#94A3B8] uppercase !tracking-[0.03em] mb-[4px] block"
              />
            </div>

            <div>
              <label className="text-[11px] font-[650] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em] block mb-[4px]">
                REASON
              </label>
              <input
                type="text"
                name="Reason"
                value={formData.Reason}
                onChange={(e) => handleChange("Reason", e.target.value)}
                placeholder="Why the day needs to move..."
                className="w-full h-[38px] px-[12px] rounded-[9px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] placeholder:text-[#94A3B8] outline-none focus:border-[#4F46E5] dark:focus:border-[#818CF8] transition-all"
              />
            </div>
          </div>

          {/* Roster Preview */}
          <div className="mb-[24px]">
            <div className="flex items-center justify-between mb-[10px]">
              <span className="text-[11px] font-[650] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em]">
                ROSTER PREVIEW
              </span>
              <span className="text-[12px] font-[600] text-[#64748B] dark:text-[#94A3B8]">
                {transitionText}
              </span>
            </div>

            <div className="space-y-[6px]">
              {[1, 2, 3, 4].map((weekNum) => (
                <div key={weekNum} className="flex items-center gap-[8px]">
                  <span className="w-[52px] shrink-0 text-[11.5px] font-[500] text-[#64748B] dark:text-[#94A3B8]">
                    Week {weekNum}
                  </span>

                  <div className="grid grid-cols-7 gap-[8px] flex-1">
                    {Days.map((d) => {
                      const dayVal = Number(d.value);
                      const isOldWO = formData.CurrentWO !== "" && dayVal === Number(formData.CurrentWO);
                      const isNewWO = formData.NewWO !== "" && dayVal === Number(formData.NewWO);

                      // Case 1: Same day selected
                      if (isSameDay && isNewWO) {
                        return (
                          <div
                            key={d.value}
                            className="h-[28px] rounded-[7px] bg-[#ECFDF5] dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#047857] flex items-center justify-center text-[10.5px] font-[750] text-[#059669] dark:text-[#34D399] uppercase"
                          >
                            wo
                          </div>
                        );
                      }

                      // Case 2: New WO chosen (green)
                      if (isNewWO) {
                        return (
                          <div
                            key={d.value}
                            className="h-[28px] rounded-[7px] bg-[#ECFDF5] dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#047857] flex items-center justify-center text-[10.5px] font-[750] text-[#059669] dark:text-[#34D399] uppercase"
                          >
                            wo
                          </div>
                        );
                      }

                      // Case 3: Old WO being replaced (red/pink highlight)
                      if (isOldWO && formData.NewWO !== "") {
                        return (
                          <div
                            key={d.value}
                            className="h-[28px] rounded-[7px] bg-[#FEF2F2] dark:bg-[#991B1B]/20 border border-[#FECACA] dark:border-[#7F1D1D]/40"
                          />
                        );
                      }

                      // Case 4: Default regular working day
                      return (
                        <div
                          key={d.value}
                          className="h-[28px] rounded-[7px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]"
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar (Helper text + Clear + Apply WO Change) */}
          <div className="pt-[14px] border-t border-[#F1F5F9] dark:border-[#1F2937] flex flex-col sm:flex-row items-center justify-between gap-[12px]">
            <div>
              {isSameDay ? (
                <span className="text-[12.5px] font-[500] text-[#1E293B] dark:text-[#E7ECF3]">
                  The new day is the same as the current one
                </span>
              ) : (
                <span className="text-[12.5px] font-[500] text-[#64748B] dark:text-[#94A3B8]">
                  Pick the new day and when it applies
                </span>
              )}
            </div>

            <div className="flex items-center gap-[10px] w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="!h-[36px] !rounded-[9px] !px-[16px] !text-[12.5px] !font-[600] cursor-pointer"
              >
                Clear
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={isLoading || isSameDay || !formData.NewWO || !formData.ApplicableDate}
                className="!h-[36px] !rounded-[9px] !px-[18px] !text-[12.5px] !font-[600] flex items-center gap-[6px] cursor-pointer shadow-sm disabled:cursor-not-allowed"
              >
                <Send className="w-[13px] h-[13px]" />
                {isLoading ? "Submitting..." : "Apply WO change"}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: What Changes & Recent Changes Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-[18px]">
          {/* Card 1: WHAT CHANGES */}
          <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[14px] p-[18px_20px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.12)]">
            <h3 className="m-0 text-[11px] font-[650] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em] mb-[14px]">
              WHAT CHANGES
            </h3>

            <div className="space-y-[14px]">
              {/* Item 1 */}
              <div className="flex items-start gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-[7px] bg-[#EEF2FF] dark:bg-[#312E81]/30 flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8] shrink-0 mt-[2px]">
                  <Calendar className="w-[14px] h-[14px]" />
                </div>
                <div>
                  <div className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Roster rewritten
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px] leading-relaxed">
                    From the applicable date onwards, all future weeks use the new day.
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-[7px] bg-[#E0F2FE] dark:bg-[#0369A1]/30 flex items-center justify-center text-[#0284C7] dark:text-[#38BDF8] shrink-0 mt-[2px]">
                  <History className="w-[14px] h-[14px]" />
                </div>
                <div>
                  <div className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Past attendance untouched
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px] leading-relaxed">
                    Days already marked keep their original week-off status.
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-[7px] bg-[#F5F3FF] dark:bg-[#581C87]/30 flex items-center justify-center text-[#7C3AED] dark:text-[#A78BFA] shrink-0 mt-[2px]">
                  <Gift className="w-[14px] h-[14px]" />
                </div>
                <div>
                  <div className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Comp off recalculated
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px] leading-relaxed">
                    Work on the new week-off day becomes comp off eligible.
                  </div>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex items-start gap-[12px]">
                <div className="w-[28px] h-[28px] rounded-[7px] bg-[#FEF3C7] dark:bg-[#78350F]/30 flex items-center justify-center text-[#D97706] dark:text-[#FBBF24] shrink-0 mt-[2px]">
                  <ShieldCheck className="w-[14px] h-[14px]" />
                </div>
                <div>
                  <div className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Needs approval
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px] leading-relaxed">
                    Your reporting manager must approve before the roster changes.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: RECENT CHANGES */}
          <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[14px] p-[18px_20px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.12)]">
            <h3 className="m-0 text-[11px] font-[650] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.03em] mb-[14px]">
              RECENT CHANGES
            </h3>

            <div className="space-y-[12px]">
              {/* Item 1 */}
              <div className="p-[10px_12px] rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Sunday → Tuesday
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                    Applied 14 Apr 2026
                  </div>
                </div>
                <span className="px-[8px] py-[2px] text-[10.5px] font-[700] rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-[#064E3B]/30 dark:text-[#34D399] dark:border-[#047857]">
                  Approved
                </span>
              </div>

              {/* Item 2 */}
              <div className="p-[10px_12px] rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                    Monday → Sunday
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                    Applied 02 Jan 2026
                  </div>
                </div>
                <span className="px-[8px] py-[2px] text-[10.5px] font-[700] rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] dark:bg-[#991B1B]/30 dark:text-[#F87171] dark:border-[#7F1D1D]">
                  Rejected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
