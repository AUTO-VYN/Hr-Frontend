"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Check,
  Lock,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fingerprint,
  Calculator,
  ShieldCheck,
  CalendarDays,
  Gift,
  ReceiptIndianRupee,
  Loader2,
} from "lucide-react";

import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

/* ------------------------------------------------------------------ */
/*  Types & Interfaces                                                */
/* ------------------------------------------------------------------ */

export interface OptionType {
  label: string;
  value: string;
}

export interface ArsItem {
  label: string;
  value: string | number;
  dateText?: string | null;
  metaText?: string | null;
  empCount?: number | null;
  isLocked?: boolean;
  Cluster?: string;
  Region?: string;
  Channel?: string;
  [key: string]: any;
}

export interface InfoCardItem {
  icon?: React.ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
  title: string;
  description: string;
}

export interface LastRunItem {
  scope: string;
  meta: string;
  status: "Completed" | "Partial";
}

export interface BlockingCheckItem {
  icon?: React.ReactNode;
  iconColorClass?: string;
  label: string;
  count: string | number;
  countColorClass?: string;
  href?: string;
  onClick?: () => void;
}

export interface CurrentlyLockedItem {
  label: string;
  date?: string;
  meta?: string;
  value?: string | number;
  onUnlock?: () => void;
}

export interface ArsActionTemplateProps {
  // Page Header
  title: string;
  subtitle: string;
  onBack?: () => void;

  // Top Filters Card
  filterCardTitle?: string;
  onReset?: () => void;
  filterMode?: "date-lock" | "month-year" | "custom";
  customFilters?: React.ReactNode;

  // Filter props for "date-lock" mode
  channelOptions?: OptionType[];
  clusterOptions?: OptionType[];
  regionOptions?: OptionType[];
  selectedChannel?: any;
  selectedCluster?: any;
  selectedRegion?: any;
  selectedDate?: string | null;
  dateFieldLabel?: string;
  onFilterChange?: (name: string, value: any) => void;
  showQuickSet?: boolean;
  onQuickSet?: (type: "last-month" | "yesterday" | "this-month") => void;

  // Filter props for "month-year" mode
  showChannelCluster?: boolean;
  monthOptions?: OptionType[];
  yearOptions?: OptionType[];
  selectedMonth?: any;
  selectedYear?: any;

  // Checklist Card
  selectionLabel?: string; // e.g. "Locations" | "Regions"
  searchPlaceholder?: string;
  items: ArsItem[];
  selectedValues: (string | number)[];
  onToggleItem: (value: string | number) => void;
  onToggleAll: () => void;
  isLoadingItems?: boolean;
  emptyItemsText?: string;
  renderItemRight?: (item: ArsItem) => React.ReactNode;

  // Footer Action Bar
  validationText?: React.ReactNode;
  validationStatus?: "error" | "success" | "warning";
  actionButtonText: string;
  actionButtonIcon?: React.ReactNode;
  onAction: () => void;
  isActionLoading?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;

  // Right Sidebar Cards
  currentlyLocked?: {
    title?: string;
    countText?: string;
    emptyText?: string;
    items: CurrentlyLockedItem[];
  };
  infoCards?: {
    title?: string;
    items: InfoCardItem[];
  };
  lastRuns?: {
    title?: string;
    items: LastRunItem[];
  };
  blockingChecks?: {
    title?: string;
    items: BlockingCheckItem[];
  };
  customSidebar?: React.ReactNode;

  // Global Loader
  isLoading?: boolean;
}

export default function ArsActionTemplate({
  title,
  subtitle,
  onBack,

  filterCardTitle,
  onReset,
  filterMode = "date-lock",
  customFilters,

  channelOptions = [],
  clusterOptions = [],
  regionOptions = [],
  selectedChannel,
  selectedCluster,
  selectedRegion,
  selectedDate,
  dateFieldLabel = "LOCK DATE",
  onFilterChange,
  showQuickSet = true,
  onQuickSet,

  showChannelCluster = true,
  monthOptions = [],
  yearOptions = [],
  selectedMonth,
  selectedYear,

  selectionLabel = "Locations",
  searchPlaceholder,
  items,
  selectedValues,
  onToggleItem,
  onToggleAll,
  isLoadingItems = false,
  emptyItemsText = "No items found.",
  renderItemRight,

  validationText,
  validationStatus = "error",
  actionButtonText,
  actionButtonIcon,
  onAction,
  isActionLoading = false,
  showClearButton = true,
  onClear,

  currentlyLocked,
  infoCards,
  lastRuns,
  blockingChecks,
  customSidebar,

  isLoading = false,
}: ArsActionTemplateProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchLabel = item.label?.toLowerCase().includes(q);
      const matchCluster = item.Cluster?.toLowerCase().includes(q);
      const matchRegion = item.Region?.toLowerCase().includes(q);
      const matchChannel = item.Channel?.toLowerCase().includes(q);
      return matchLabel || matchCluster || matchRegion || matchChannel;
    });
  }, [items, searchTerm]);

  const isAllSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedValues.includes(item.value));

  const effectiveSearchPlaceholder =
    searchPlaceholder || `Search ${selectionLabel.toLowerCase()}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] dark:bg-[#0A0F1C] dark:text-[#E7ECF3] px-6 py-5 md:px-8 md:py-6 font-['Inter',system-ui,sans-serif] antialiased">
      {/* ------------------------------------------------------------------ */}
      {/* Top Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            {title}
          </h1>
          <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            {subtitle}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onBack ? onBack : () => window.history.back()}
          className="!h-[34px] !rounded-[9px] !px-3.5 !text-[12px] !font-[550] !border-[#E2E8F0] dark:!border-[#1F2937] !shadow-none"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Grid: Left Column + Right Sidebar */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ===================== LEFT COLUMN ===================== */}
        <div className="flex flex-col gap-4">
          {/* CARD 1: Filters */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
            {/* Header row inside Card 1 (Title or Reset button if present) */}
            {(filterCardTitle || onReset) && (
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                  {filterCardTitle || "FILTERS"}
                </span>
                {onReset && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onReset}
                    className="!h-[28px] !rounded-[7px] !px-2.5 !text-[11.5px] !font-[500] !border-[#E2E8F0] dark:!border-[#1F2937] !shadow-none text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
                  >
                    Reset
                  </Button>
                )}
              </div>
            )}

            {/* Custom filters override */}
            {filterMode === "custom" && customFilters}

            {/* Mode 1: Date Lock Filters */}
            {filterMode === "date-lock" && (
              <>
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
                      initialValue={selectedChannel}
                      handleInputChange={onFilterChange}
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
                      initialValue={selectedCluster}
                      handleInputChange={onFilterChange}
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
                      option={regionOptions}
                      hideChevron={true}
                      placeholder="All regions"
                      initialValue={selectedRegion}
                      handleInputChange={onFilterChange}
                      mb={0}
                      className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
                    />
                  </div>

                  {/* DATE INPUT */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                      {dateFieldLabel} <span className="text-[#E11D48]">*</span>
                    </span>
                    <Einput
                      type="date"
                      name="Date"
                      value={selectedDate ?? ""}
                      placeholder="dd-mm-yyyy"
                      onChange={(e) =>
                        onFilterChange && onFilterChange("Date", e.target.value)
                      }
                      hideLabel
                      wrapperClassName="w-full"
                      className={`!h-[38px] !rounded-[9px] !text-[12.5px] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-visible:!ring-0 ${
                        !selectedDate
                          ? "!border-[#FDA4AF] ring-1 ring-[#FDA4AF]/40 focus-visible:!border-[#E11D48]"
                          : "!border-[#E2E8F0] dark:!border-[#1F2937] focus-visible:!border-[#4F46E5]"
                      }`}
                    />
                  </div>
                </div>

                {/* Quick set buttons */}
                {showQuickSet && onQuickSet && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#1F2937]">
                    <span className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mr-1">
                      Quick set
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onQuickSet("last-month")}
                      className="!h-[32px] !rounded-[8px] !px-3 !text-[12px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] text-[#334155] dark:text-[#E7ECF3] hover:!bg-[#F8FAFC] !shadow-none"
                    >
                      End of last month
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onQuickSet("yesterday")}
                      className="!h-[32px] !rounded-[8px] !px-3 !text-[12px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] text-[#334155] dark:text-[#E7ECF3] hover:!bg-[#F8FAFC] !shadow-none"
                    >
                      Yesterday
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onQuickSet("this-month")}
                      className="!h-[32px] !rounded-[8px] !px-3 !text-[12px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] text-[#334155] dark:text-[#E7ECF3] hover:!bg-[#F8FAFC] !shadow-none"
                    >
                      End of this month
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Mode 2: Month / Year Filters */}
            {filterMode === "month-year" && (
              <div
                className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                  showChannelCluster ? "lg:grid-cols-4" : "lg:grid-cols-2"
                } items-end`}
              >
                {showChannelCluster && (
                  <>
                    {/* CHANNEL */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                        CHANNEL
                      </span>
                      <Eselect
                        name="Channel"
                        option={channelOptions}
                        isMulti={true}
                        placeholder="Add channel"
                        initialValue={selectedChannel}
                        handleInputChange={onFilterChange}
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
                        placeholder="Add cluster"
                        initialValue={selectedCluster}
                        handleInputChange={onFilterChange}
                        mb={0}
                        className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-2.5 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
                      />
                    </div>
                  </>
                )}

                {/* MONTH */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                    MONTH <span className="text-[#E11D48]">*</span>
                  </span>
                  <Eselect
                    name="Month"
                    option={monthOptions}
                    placeholder="Select month"
                    initialValue={selectedMonth}
                    handleInputChange={onFilterChange}
                    mb={0}
                    className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
                  />
                </div>

                {/* YEAR */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
                    YEAR
                  </span>
                  <Eselect
                    name="Year"
                    option={yearOptions}
                    placeholder="Select year"
                    initialValue={selectedYear}
                    handleInputChange={onFilterChange}
                    mb={0}
                    className="!h-[38px] !min-h-[38px] !mt-0 !rounded-[9px] !text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CARD 2: Checklist */}
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
            {/* Header of Checklist */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3 dark:border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onToggleAll}
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
                  {selectionLabel}
                </span>

                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  {selectedValues.length > 0
                    ? `${selectedValues.length} of ${filteredItems.length} selected`
                    : `${filteredItems.length} available`}
                </span>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B] dark:text-[#94A3B8] z-10" />
                <Einput
                  type="text"
                  name="SearchTerm"
                  placeholder={effectiveSearchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  hideLabel
                  wrapperClassName="w-full"
                  className="!h-8 !w-full !rounded-[9px] !pl-9 !pr-3 !text-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] shadow-none placeholder:!text-[#64748B]/60 focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="max-h-[300px] overflow-y-auto p-3.5">
              {isLoadingItems ? (
                <div className="py-12 text-center text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Loading {selectionLabel.toLowerCase()}…
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                  {emptyItemsText}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {filteredItems.map((item) => {
                    const isChecked = selectedValues.includes(item.value);

                    // Meta Text builder
                    const metaParts: string[] = [];
                    if (item.Channel) metaParts.push(item.Channel);
                    if (item.Cluster) metaParts.push(item.Cluster);
                    if (item.Region) metaParts.push(item.Region);
                    if (typeof item.empCount === "number") {
                      metaParts.push(`${item.empCount} emp`);
                    }
                    const fallbackMeta =
                      metaParts.join(" · ") || item.metaText || "";

                    return (
                      <Button
                        key={String(item.value)}
                        type="button"
                        variant="ghost"
                        onClick={() => onToggleItem(item.value)}
                        className={`!flex !w-full !justify-start !items-center !gap-2.5 !rounded-[8px] !px-3 !py-2.5 !h-auto text-left transition !shadow-none !font-normal ${
                          isChecked
                            ? "!bg-[#EEF2FF] !text-[#4F46E5] dark:!bg-[#1E1B4B] dark:!text-[#8B84FF]"
                            : "!bg-transparent !text-[#1E293B] hover:!bg-slate-100/70 dark:text-[#E7ECF3] dark:hover:!bg-[#182235]"
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition ${
                            isChecked
                              ? "border-[#4F46E5] bg-[#4F46E5] text-white dark:border-[#8B84FF] dark:bg-[#8B84FF]"
                              : "border-[#CBD5E1] bg-white dark:border-[#374151] dark:bg-[#0E1524]"
                          }`}
                        >
                          {isChecked && (
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          )}
                        </span>

                        <span
                          className={`flex-1 truncate text-[12.5px] uppercase tracking-[0.01em] ${
                            isChecked
                              ? "font-bold text-[#4F46E5]"
                              : "font-bold text-[#1E293B] dark:text-[#E7ECF3]"
                          }`}
                        >
                          {item.label}
                        </span>

                        {renderItemRight ? (
                          renderItemRight(item)
                        ) : item.dateText ? (
                          <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#E11D48] shrink-0">
                            <Lock className="h-3.5 w-3.5 text-[#E11D48]" />
                            {item.dateText}
                          </span>
                        ) : item.empCount !== undefined ? (
                          <span className="shrink-0 text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                            {item.empCount} employees
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                            {fallbackMeta}
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
                {validationText && (
                  <span
                    className={`text-[12.5px] font-medium ${
                      validationStatus === "error"
                        ? "text-[#E11D48]"
                        : validationStatus === "success"
                        ? "text-[#10B981]"
                        : "text-[#F59E0B]"
                    }`}
                  >
                    {validationText}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {showClearButton && onClear && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClear}
                    className="!h-[38px] !rounded-[9px] !px-4 !text-[12.5px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#334155] dark:text-[#E7ECF3] !shadow-none hover:!bg-[#F8FAFC]"
                  >
                    Clear
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={onAction}
                  loading={isActionLoading}
                  icon={actionButtonIcon}
                  className="!h-[38px] !rounded-[9px] !px-5 !text-[12.5px] !font-semibold !bg-[#334155] hover:!bg-[#1E293B] text-white !shadow-none active:scale-[0.98] transition-all"
                >
                  {actionButtonText}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT SIDEBAR ===================== */}
        <div className="flex flex-col gap-4">
          {/* Card: CURRENTLY LOCKED */}
          {currentlyLocked && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-[650] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                  {currentlyLocked.title || "CURRENTLY LOCKED"}
                </span>
                <span className="text-[12px] font-bold text-[#E11D48]">
                  {currentlyLocked.countText ||
                    `${currentlyLocked.items.length} locked`}
                </span>
              </div>

              <div className="mt-4">
                {currentlyLocked.items.length === 0 ? (
                  <div className="py-6 text-center text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                    {currentlyLocked.emptyText ||
                      "No location is locked right now."}
                  </div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1.5">
                    {currentlyLocked.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-[#F8FAFC] dark:bg-[#0E1524] px-2.5 py-1.5 text-[12px]"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.label}
                          </span>
                          {item.meta && (
                            <span className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                              {item.meta}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.date && (
                            <span className="text-[11px] font-semibold text-[#E11D48]">
                              {item.date}
                            </span>
                          )}
                          {item.onUnlock && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={item.onUnlock}
                              className="!h-[24px] !px-2 !text-[11px] !rounded-[6px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            >
                              Unlock
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card: WHAT THE LOCK BLOCKS / WHAT THIS RUN DOES */}
          {infoCards && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
              <span className="text-[11px] font-[650] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                {infoCards.title || "WHAT THIS RUN DOES"}
              </span>

              <div className="mt-4 flex flex-col gap-3.5">
                {infoCards.items.map((info, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                        info.iconBgClass || "bg-[#EEF2FF] dark:bg-[#1E1B4B]"
                      } ${
                        info.iconColorClass || "text-[#4F46E5] dark:text-[#8B84FF]"
                      }`}
                    >
                      {info.icon || <ShieldCheck className="h-4 w-4" />}
                    </span>
                    <div>
                      <h4 className="text-[12.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                        {info.title}
                      </h4>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                        {info.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card: LAST RUNS */}
          {lastRuns && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
              <span className="text-[11px] font-[650] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                {lastRuns.title || "LAST RUNS"}
              </span>

              <div className="mt-3 flex flex-col gap-2">
                {lastRuns.items.length === 0 ? (
                  <div className="py-4 text-center text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    No past runs recorded.
                  </div>
                ) : (
                  lastRuns.items.map((run, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#E2E8F0] bg-white p-3 dark:border-[#1F2937] dark:bg-[#0E1524]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                          {run.scope}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${
                            run.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        {run.meta}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Card: BLOCKING CHECKS */}
          {blockingChecks && (
            <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-[15px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]">
              <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                {blockingChecks.title || "BLOCKING CHECKS"}
              </span>

              <div className="mt-3 flex flex-col gap-2.5">
                {blockingChecks.items.map((check, idx) => {
                  const content = (
                    <div
                      key={idx}
                      onClick={check.onClick}
                      className={`flex items-center justify-between ${
                        check.onClick ? "cursor-pointer group" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="shrink-0">
                          {check.icon || (
                            <AlertTriangle
                              className={`h-3.5 w-3.5 ${
                                check.iconColorClass || "text-[#F59E0B]"
                              }`}
                              strokeWidth={1.8}
                            />
                          )}
                        </span>
                        <span className="text-[12px] font-normal text-slate-700 transition group-hover:text-amber-600 dark:text-slate-200">
                          {check.label}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-[600] ${
                          check.countColorClass || "text-[#D97706] dark:text-amber-400"
                        }`}
                      >
                        {check.count}
                      </span>
                    </div>
                  );

                  if (check.href) {
                    return (
                      <Link
                        key={idx}
                        href={check.href}
                        className="transition-colors hover:opacity-90"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return content;
                })}
              </div>
            </div>
          )}

          {/* Any other custom sidebar content */}
          {customSidebar}
        </div>
      </div>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}

