"use client";

import React, {
  FC,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  title?: string;
  name: string;

  // Parent state value
  // Expected: YYYY-MM-DD
  value: string | null;

  // Same pattern as Ainput
  handleInputChange: (
    name: string,
    value: string | null
  ) => void;

  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;

  errorMessage?: string;
  redlabel?: string;

  placeholder?: string;
  className?: string;

  minDate?: string;
  maxDate?: string;

  ShortName?: boolean;
}

const DatePicker: FC<DatePickerProps> = ({
  title,
  name,
  value,
  handleInputChange,
  disabled = false,
  readOnly = false,
  required = false,
  errorMessage,
  redlabel,
  placeholder = "DD/MM/YYYY",
  className,
  minDate,
  maxDate,
  ShortName = false,
}) => {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const yearInputRef =
    useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] =
    useState(false);

  // =========================================================
  // DATE HELPERS
  // =========================================================

  function pad(value: number) {
    return String(value).padStart(2, "0");
  }

  function toApiDate(date: Date) {
    return `${date.getFullYear()}-${pad(
      date.getMonth() + 1
    )}-${pad(date.getDate())}`;
  }

  function parseApiDate(value: string) {
    const [year, month, day] =
      value.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  function isValidApiDate(value: string) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return false;
    }

    const date = parseApiDate(value);

    return (
      toApiDate(date) === value
    );
  }

  function formatDisplayDate(
    value: string | null
  ) {
    if (
      !value ||
      !isValidApiDate(value)
    ) {
      return "";
    }

    const [year, month, day] =
      value.split("-");

    return `${day}/${month}/${year}`;
  }

  // =========================================================
  // LABEL
  // =========================================================

  const toTitleCase = (str?: string) => {
    if (!str) return "";

    return str
      .toLowerCase()
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  };

  // =========================================================
  // MONTH / WEEK DAYS
  // =========================================================

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = [
    "Su",
    "Mo",
    "Tu",
    "We",
    "Th",
    "Fr",
    "Sa",
  ];

  // =========================================================
  // VIEW DATE
  // =========================================================

  const [viewDate, setViewDate] =
    useState<Date>(() => {
      if (
        value &&
        isValidApiDate(value)
      ) {
        return parseApiDate(value);
      }

      return new Date();
    });

  const currentMonth =
    viewDate.getMonth();

  const currentYear =
    viewDate.getFullYear();

  // =========================================================
  // EDITABLE YEAR STATE
  // =========================================================

  const [yearInput, setYearInput] =
    useState(String(currentYear));

  // Keep year input synchronized
  // with calendar view.
  useEffect(() => {
    setYearInput(
      String(currentYear)
    );
  }, [currentYear]);

  // =========================================================
  // CALENDAR DAYS
  // =========================================================

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      currentYear,
      currentMonth,
      1
    ).getDay();

    const daysInMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();

    const previousMonthDays =
      new Date(
        currentYear,
        currentMonth,
        0
      ).getDate();

    const days: {
      date: Date;
      currentMonth: boolean;
    }[] = [];

    // Previous month
    for (
      let i = firstDay - 1;
      i >= 0;
      i--
    ) {
      days.push({
        date: new Date(
          currentYear,
          currentMonth - 1,
          previousMonthDays - i
        ),
        currentMonth: false,
      });
    }

    // Current month
    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      days.push({
        date: new Date(
          currentYear,
          currentMonth,
          day
        ),
        currentMonth: true,
      });
    }

    // Next month
    let nextDay = 1;

    while (days.length < 42) {
      days.push({
        date: new Date(
          currentYear,
          currentMonth + 1,
          nextDay++
        ),
        currentMonth: false,
      });
    }

    return days;
  }, [
    currentMonth,
    currentYear,
  ]);

  // =========================================================
  // DATE COMPARISON
  // =========================================================

  const isSameDate = (
    date1: Date,
    date2: Date
  ) => {
    return (
      date1.getFullYear() ===
        date2.getFullYear() &&
      date1.getMonth() ===
        date2.getMonth() &&
      date1.getDate() ===
        date2.getDate()
    );
  };

  const isToday = (date: Date) => {
    return isSameDate(
      date,
      new Date()
    );
  };

  // =========================================================
  // MIN / MAX
  // =========================================================

  const isDateDisabled = (
    date: Date
  ) => {
    const apiDate =
      toApiDate(date);

    if (
      minDate &&
      apiDate < minDate
    ) {
      return true;
    }

    if (
      maxDate &&
      apiDate > maxDate
    ) {
      return true;
    }

    return false;
  };

  // =========================================================
  // SELECT DATE
  // =========================================================

  const handleDateSelect = (
    date: Date
  ) => {
    if (isDateDisabled(date)) {
      return;
    }

    const selectedDate =
      toApiDate(date);

    handleInputChange(
      name,
      selectedDate
    );

    setViewDate(date);
    setIsOpen(false);
  };

  // =========================================================
  // PREVIOUS MONTH
  // =========================================================

  const goToPreviousMonth = () => {
    setViewDate(
      new Date(
        currentYear,
        currentMonth - 1,
        1
      )
    );
  };

  // =========================================================
  // NEXT MONTH
  // =========================================================

  const goToNextMonth = () => {
    setViewDate(
      new Date(
        currentYear,
        currentMonth + 1,
        1
      )
    );
  };

  // =========================================================
  // MONTH SELECT
  // =========================================================

  const handleMonthChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const month = Number(
      event.target.value
    );

    setViewDate(
      new Date(
        currentYear,
        month,
        1
      )
    );
  };

  // =========================================================
  // YEAR CHANGE
  // =========================================================

  const applyYear = (
    yearValue: string
  ) => {
    const year =
      Number(yearValue);

    // Only valid 4 digit years
    if (
      !/^\d{4}$/.test(yearValue)
    ) {
      setYearInput(
        String(currentYear)
      );
      return;
    }

    // Prevent unreasonable years
    if (
      year < 1900 ||
      year > 2100
    ) {
      setYearInput(
        String(currentYear)
      );
      return;
    }

    setViewDate(
      new Date(
        year,
        currentMonth,
        1
      )
    );
  };

  // =========================================================
  // YEAR INPUT CHANGE
  // =========================================================

  const handleYearInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 4);

    setYearInput(value);
  };

  // =========================================================
  // YEAR KEY DOWN
  // =========================================================

  const handleYearKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      applyYear(yearInput);

      yearInputRef.current?.blur();
    }

    if (event.key === "Escape") {
      setYearInput(
        String(currentYear)
      );

      yearInputRef.current?.blur();
    }
  };

  // =========================================================
  // YEAR BLUR
  // =========================================================

  const handleYearBlur = () => {
    applyYear(yearInput);
  };

  // =========================================================
  // TODAY
  // =========================================================

  const handleToday = () => {
    const today = new Date();

    if (!isDateDisabled(today)) {
      handleDateSelect(today);
    }
  };

  // =========================================================
  // CLEAR
  // =========================================================

  const handleClear = (
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();

    handleInputChange(
      name,
      null
    );
  };

  // =========================================================
  // OUTSIDE CLICK
  // =========================================================

  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // =========================================================
  // SYNC VIEW DATE WITH VALUE
  // =========================================================

  useEffect(() => {
    if (
      value &&
      isValidApiDate(value)
    ) {
      setViewDate(
        parseApiDate(value)
      );
    }
  }, [value]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      ref={containerRef}
      className="relative w-full"
    >
      {/* =====================================================
          LABEL
      ===================================================== */}

      {title && (
        <label
          htmlFor={name}
          className="mb-1.5 flex items-center gap-2 text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300"
        >
          {ShortName
            ? title
            : toTitleCase(title)}

          {required && (
            <span className="text-red-500">
              *
            </span>
          )}

          {redlabel && (
            <span className="text-red-500">
              {redlabel}
            </span>
          )}

          {errorMessage && (
            <span className="text-red-500 text-[11px]">
              {errorMessage}
            </span>
          )}
        </label>
      )}

      {/* =====================================================
          INPUT
      ===================================================== */}

      <div className="relative">
        <button
          type="button"
          id={name}
          disabled={disabled}
          onClick={() => {
            if (
              !disabled &&
              !readOnly
            ) {
              setIsOpen(
                (prev) => !prev
              );
            }
          }}
          className={cn(
            "flex h-9 w-full items-center rounded-xl border bg-white px-3 text-left text-[13px] shadow-sm transition-all",

            "border-slate-200 text-slate-900",

            "hover:border-slate-300",

            "focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400",

            "dark:bg-[#0F1A2D] dark:border-slate-700 dark:text-slate-100",

            "dark:hover:border-slate-600",

            "dark:focus:ring-indigo-500/20 dark:focus:border-indigo-400",

            disabled &&
              "cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-[#0B1220] dark:text-slate-500",

            readOnly &&
              "cursor-default",

            errorMessage &&
              "border-red-400 focus:border-red-400 focus:ring-red-100 dark:border-red-500/70",

            className
          )}
        >
          {/* DATE TEXT */}

          <span
            className={cn(
              "flex-1 truncate",
              !value &&
                "text-slate-400 dark:text-slate-500"
            )}
          >
            {formatDisplayDate(
              value
            ) || placeholder}
          </span>

          {/* CLEAR */}

          {value &&
          !disabled &&
          !readOnly ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                    "Enter" ||
                  event.key === " "
                ) {
                  handleClear();
                }
              }}
              className="mr-2 flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </span>
          ) : null}

          {/* CALENDAR ICON */}

          <CalendarDays
            size={17}
            className="shrink-0 text-slate-400 dark:text-slate-500"
          />
        </button>

        {/* ===================================================
            CALENDAR POPUP
        =================================================== */}

        {isOpen && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-[9999] w-[330px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0F1A2D]">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-3 flex items-center justify-between gap-2">

              {/* PREVIOUS */}

              <button
                type="button"
                onClick={
                  goToPreviousMonth
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <ChevronLeft
                  size={18}
                />
              </button>

              {/* MONTH + YEAR */}

              <div className="flex flex-1 items-center justify-center gap-2">

                {/* MONTH */}

                <select
                  value={
                    currentMonth
                  }
                  onChange={
                    handleMonthChange
                  }
                  className="h-8 max-w-[125px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-[#0B1220] dark:text-slate-200 dark:focus:border-indigo-400"
                >
                  {monthNames.map(
                    (
                      month,
                      index
                    ) => (
                      <option
                        key={
                          month
                        }
                        value={
                          index
                        }
                      >
                        {month}
                      </option>
                    )
                  )}
                </select>

                {/* YEAR EDITABLE */}

                <input
                  ref={
                    yearInputRef
                  }
                  type="text"
                  inputMode="numeric"
                  value={
                    yearInput
                  }
                  maxLength={4}
                  onChange={
                    handleYearInputChange
                  }
                  onBlur={
                    handleYearBlur
                  }
                  onKeyDown={
                    handleYearKeyDown
                  }
                  className="h-8 w-[68px] rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-[#0B1220] dark:text-slate-200 dark:focus:border-indigo-400"
                  aria-label="Year"
                />
              </div>

              {/* NEXT */}

              <button
                type="button"
                onClick={
                  goToNextMonth
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <ChevronRight
                  size={18}
                />
              </button>
            </div>

            {/* =================================================
                WEEK DAYS
            ================================================= */}

            <div className="mb-1 grid grid-cols-7">
              {weekDays.map(
                (day) => (
                  <div
                    key={day}
                    className="flex h-8 items-center justify-center text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            {/* =================================================
                DAYS
            ================================================= */}

            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map(
                ({
                  date,
                  currentMonth:
                    isCurrentMonth,
                }) => {
                  const dateValue =
                    toApiDate(date);

                  const selected =
                    value ===
                    dateValue;

                  const today =
                    isToday(date);

                  const disabledDate =
                    isDateDisabled(
                      date
                    );

                  return (
                    <button
                      key={dateValue}
                      type="button"
                      disabled={
                        disabledDate
                      }
                      onClick={() =>
                        handleDateSelect(
                          date
                        )
                      }
                      className={cn(
                        "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-[12px] transition-colors",

                        isCurrentMonth
                          ? "text-slate-700 dark:text-slate-200"
                          : "text-slate-300 dark:text-slate-600",

                        !disabledDate &&
                          "hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300",

                        today &&
                          !selected &&
                          "font-bold ring-1 ring-indigo-300 dark:ring-indigo-500",

                        selected &&
                          "bg-indigo-600 font-semibold text-white hover:bg-indigo-600 hover:text-white",

                        disabledDate &&
                          "cursor-not-allowed opacity-30"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                }
              )}
            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">

              {/* TODAY */}

              <button
                type="button"
                onClick={
                  handleToday
                }
                disabled={isDateDisabled(
                  new Date()
                )}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
              >
                Today
              </button>

              {/* CLEAR */}

              <button
                type="button"
                onClick={() =>
                  handleClear()
                }
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatePicker;