import { useState, useCallback, useMemo } from "react";

/**
 * Format a Date object to 'YYYY-MM-DD' using local timezone (no UTC shift).
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_year";

export interface UseDateRangeOptions {
  defaultFrom?: string | Date;
  defaultTo?: string | Date;
  preset?: DateRangePreset;
}

export interface DateRangeState {
  DATE_FROM: string;
  DATE_TO: string;
}

/**
 * Get date range for standard presets.
 */
export function getPresetDates(preset: DateRangePreset): DateRangeState {
  const today = new Date();

  switch (preset) {
    case "today": {
      const formatted = formatDate(today);
      return { DATE_FROM: formatted, DATE_TO: formatted };
    }

    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const formatted = formatDate(yesterday);
      return { DATE_FROM: formatted, DATE_TO: formatted };
    }

    case "last_7_days": {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { DATE_FROM: formatDate(from), DATE_TO: formatDate(today) };
    }

    case "last_30_days": {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { DATE_FROM: formatDate(from), DATE_TO: formatDate(today) };
    }

    case "this_month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { DATE_FROM: formatDate(from), DATE_TO: formatDate(today) };
    }

    case "last_month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { DATE_FROM: formatDate(from), DATE_TO: formatDate(to) };
    }

    case "this_year": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { DATE_FROM: formatDate(from), DATE_TO: formatDate(today) };
    }

    default: {
      const formatted = formatDate(today);
      return { DATE_FROM: formatted, DATE_TO: formatted };
    }
  }
}

/**
 * Custom hook to manage Date Range (DATE_FROM and DATE_TO).
 *
 * @example
 * const { DATE_FROM, DATE_TO, setDateFrom, setDateTo, handleDateChange, setThisMonth } = useDateRange({
 *   preset: "this_month",
 * });
 */
export const useDateRange = (options?: UseDateRangeOptions) => {
  const initialDates = useMemo<DateRangeState>(() => {
    if (options?.preset) {
      return getPresetDates(options.preset);
    }

    const todayStr = formatDate(new Date());
    const fromStr = options?.defaultFrom
      ? options.defaultFrom instanceof Date
        ? formatDate(options.defaultFrom)
        : options.defaultFrom
      : getPresetDates("this_month").DATE_FROM;

    const toStr = options?.defaultTo
      ? options.defaultTo instanceof Date
        ? formatDate(options.defaultTo)
        : options.defaultTo
      : todayStr;

    return { DATE_FROM: fromStr, DATE_TO: toStr };
  }, [options?.defaultFrom, options?.defaultTo, options?.preset]);

  const [dates, setDates] = useState<DateRangeState>(initialDates);

  // Setters
  const setDateFrom = useCallback((val: string | Date) => {
    const str = val instanceof Date ? formatDate(val) : val;
    setDates((prev) => ({ ...prev, DATE_FROM: str }));
  }, []);

  const setDateTo = useCallback((val: string | Date) => {
    const str = val instanceof Date ? formatDate(val) : val;
    setDates((prev) => ({ ...prev, DATE_TO: str }));
  }, []);

  const setDateRange = useCallback((from: string | Date, to: string | Date) => {
    const fromStr = from instanceof Date ? formatDate(from) : from;
    const toStr = to instanceof Date ? formatDate(to) : to;
    setDates({ DATE_FROM: fromStr, DATE_TO: toStr });
  }, []);

  // Generic input change handler for <input type="date" name="DATE_FROM" ... />
  const handleDateChange = useCallback(
    (field: "DATE_FROM" | "DATE_TO" | "from" | "to" | string, val: string) => {
      if (field === "DATE_FROM" || field === "from" || field === "dateFrom") {
        setDates((prev) => ({ ...prev, DATE_FROM: val }));
      } else if (field === "DATE_TO" || field === "to" || field === "dateTo") {
        setDates((prev) => ({ ...prev, DATE_TO: val }));
      }
    },
    []
  );

  // Preset helpers
  const applyPreset = useCallback((preset: DateRangePreset) => {
    setDates(getPresetDates(preset));
  }, []);

  const setToday = useCallback(() => applyPreset("today"), [applyPreset]);
  const setYesterday = useCallback(() => applyPreset("yesterday"), [applyPreset]);
  const setLast7Days = useCallback(() => applyPreset("last_7_days"), [applyPreset]);
  const setLast30Days = useCallback(() => applyPreset("last_30_days"), [applyPreset]);
  const setThisMonth = useCallback(() => applyPreset("this_month"), [applyPreset]);
  const setLastMonth = useCallback(() => applyPreset("last_month"), [applyPreset]);
  const setThisYear = useCallback(() => applyPreset("this_year"), [applyPreset]);

  // Reset to initial
  const reset = useCallback(() => {
    setDates(initialDates);
  }, [initialDates]);

  return {
    // Exact keys matching backend
    DATE_FROM: dates.DATE_FROM,
    DATE_TO: dates.DATE_TO,

    // Aliases
    dateFrom: dates.DATE_FROM,
    dateTo: dates.DATE_TO,
    startDate: dates.DATE_FROM,
    endDate: dates.DATE_TO,

    // Raw state object
    dates,

    // Setters
    setDateFrom,
    setDateTo,
    setDateRange,
    handleDateChange,
    setDates,

    // Presets
    applyPreset,
    setToday,
    setYesterday,
    setLast7Days,
    setLast30Days,
    setThisMonth,
    setLastMonth,
    setThisYear,
    reset,

    // Helper payload for API requests
    payload: {
      DATE_FROM: dates.DATE_FROM,
      DATE_TO: dates.DATE_TO,
    },
  };
};

export default useDateRange;
