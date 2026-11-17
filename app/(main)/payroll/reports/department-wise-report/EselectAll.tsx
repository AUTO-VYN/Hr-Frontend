
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { BiChevronDown } from "react-icons/bi";
import { AiOutlineSearch } from "react-icons/ai";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

type EselectAllProps = {
  title?: string;
  name: string;
  option: SelectOption[];
  handleInputChange: (
    name: string,
    value: string | string[]
  ) => void;
  className?: string;
  isMulti?: boolean;
  initialValue?: string | string[] | Record<string, any>;
  readOnly?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  redlabel?: string;
  h?: string;
  mb?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  required?: boolean;
};

const EselectAll: React.FC<EselectAllProps> = ({
  title,
  name,
  option = [],
  handleInputChange,
  className,
  isMulti = false,
  initialValue,
  readOnly = false,
  disabled = false,
  autoFocus = false,
  redlabel,
  h,
  mb,
  onKeyDown,
  required = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<SelectOption[]>([]);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------
  // INITIAL VALUE
  // --------------------------------------------------

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      const selectedValues = Array.isArray(initialValue)
        ? initialValue.map(String)
        : typeof initialValue === "string"
          ? [initialValue]
          : Object.values(initialValue).map(String);

      const initialSelected = option.filter((opt) =>
        selectedValues.includes(String(opt.value))
      );

      setSelectedOptions(initialSelected);
    } else {
      setSelectedOptions([]);
    }
  }, [initialValue, option]);

  // --------------------------------------------------
  // CLICK OUTSIDE
  // --------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setInputValue("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --------------------------------------------------
  // FILTER OPTIONS
  // --------------------------------------------------

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();

    return option.filter((opt) =>
      String(opt?.label ?? "").toLowerCase().includes(query)
    );
  }, [option, inputValue]);

  // --------------------------------------------------
  // SELECTED VALUES
  // --------------------------------------------------

  const selectedText = useMemo(() => {
    if (!selectedOptions.length) return "";

    return selectedOptions.map((opt) => opt.label).join(", ");
  }, [selectedOptions]);

  // --------------------------------------------------
  // OPEN DROPDOWN
  // --------------------------------------------------

  const toggleDropdown = () => {
    if (disabled || readOnly) return;

    setOpen((previous) => {
      const next = !previous;

      if (!next) {
        setInputValue("");
      }

      return next;
    });
  };

  // --------------------------------------------------
  // SELECT OPTION
  // --------------------------------------------------

  const handleSelect = (selectedOption: SelectOption) => {
    if (disabled || readOnly) return;

    if (isMulti) {
      const alreadySelected = selectedOptions.some(
        (opt) => opt.value === selectedOption.value
      );

      const newSelectedOptions = alreadySelected
        ? selectedOptions.filter(
            (opt) => opt.value !== selectedOption.value
          )
        : [...selectedOptions, selectedOption];

      setSelectedOptions(newSelectedOptions);

      handleInputChange(
        name,
        newSelectedOptions.map((opt) => opt.value)
      );
    } else {
      setSelectedOptions([selectedOption]);

      handleInputChange(name, selectedOption.value);

      setOpen(false);
    }

    setInputValue("");
  };

  // --------------------------------------------------
  // SELECT ALL
  // --------------------------------------------------

  const allSelected =
    option.length > 0 &&
    option.every((opt) =>
      selectedOptions.some(
        (selected) => selected.value === opt.value
      )
    );

  const handleSelectAll = () => {
    if (disabled || readOnly || !isMulti || !option.length) return;

    if (allSelected) {
      setSelectedOptions([]);
      handleInputChange(name, []);
    } else {
      setSelectedOptions([...option]);

      handleInputChange(
        name,
        option.map((opt) => opt.value)
      );
    }

    setInputValue("");
  };

  // --------------------------------------------------
  // KEYBOARD
  // --------------------------------------------------

  const handleControlKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    onKeyDown?.(event);

    if (event.key === "Escape") {
      setOpen(false);
      setInputValue("");
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      !open
    ) {
      event.preventDefault();
      setOpen(true);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full font-medium space-y-1.5",
        disabled && "opacity-60"
      )}
      style={{
        marginBottom: mb !== undefined ? `${mb}px` : undefined,
      }}
    >
      {/* LABEL */}

      {title && (
        <label
          htmlFor={name}
          className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300"
        >
          {title.toLowerCase()}

          {required && (
            <span className="text-red-500">*</span>
          )}

          {redlabel && (
            <span className="text-red-500">{redlabel}</span>
          )}
        </label>
      )}

      {/* SELECT CONTROL */}

      <button
        id={name}
        type="button"
        disabled={disabled}
        autoFocus={autoFocus}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggleDropdown}
        onKeyDown={handleControlKeyDown}
        className={cn(
          "relative flex h-9 w-full items-center justify-between gap-3",
          "rounded-xl border border-slate-200 bg-white px-3 shadow-sm",
          "text-left text-[13px] font-normal text-slate-900",
          "transition-all duration-150 hover:border-slate-300",
          "focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400",
          "dark:border-slate-800 dark:bg-slate-900 dark:text-white",
          "dark:focus:ring-indigo-950/40",
          open && "border-indigo-400 ring-2 ring-indigo-100",
          disabled && "cursor-not-allowed opacity-60",
          readOnly && "cursor-default",
          className
        )}
        style={h ? { height: `${h}px` } : undefined}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selectedText && "text-slate-400"
          )}
        >
          {selectedText || title || "Select"}
        </span>

        <BiChevronDown
          size={18}
          className={cn(
            "shrink-0 text-slate-500 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* DROPDOWN */}

      {open && !disabled && !readOnly && (
        <div className="absolute left-0 top-full z-[100] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">

          {/* SEARCH */}

          <div className="border-b border-slate-200 p-2.5 dark:border-slate-700">
            <div className="relative">
              <AiOutlineSearch
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={searchRef}
                type="text"
                value={inputValue}
                onChange={(event) =>
                  setInputValue(event.target.value)
                }
                placeholder="Search options..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] font-normal text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* SELECT ALL */}

          {isMulti && (
            <div
              onClick={handleSelectAll}
              className="flex cursor-pointer items-center gap-2.5 border-b border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-800 transition hover:bg-indigo-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={allSelected}
                readOnly
                className="h-4 w-4 cursor-pointer accent-indigo-600"
              />

              <span>Select All</span>
            </div>
          )}

          {/* OPTIONS */}

          <div className="max-h-[230px] overflow-y-auto py-1.5">
            {filteredOptions.length > 0 ? (
              <ul className="space-y-0.5">
                {filteredOptions.map((opt) => {
                  const isSelected = selectedOptions.some(
                    (selected) => selected.value === opt.value
                  );

                  return (
                    <li
                      key={opt.value}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 px-3 py-2.5",
                        "text-[13px] font-normal text-slate-700",
                        "transition hover:bg-indigo-50",
                        "dark:text-slate-200 dark:hover:bg-slate-800",
                        isSelected && "bg-indigo-50/70 dark:bg-slate-800"
                      )}
                    >
                      {isMulti && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="pointer-events-none h-4 w-4 accent-indigo-600"
                        />
                      )}

                      <span className="min-w-0 flex-1">
                        {opt.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-3 py-5 text-center text-[12px] text-slate-400">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EselectAll;
