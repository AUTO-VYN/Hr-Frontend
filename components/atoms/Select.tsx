"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  forwardRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const Input = forwardRef<any, any>(
  ({ placeholder, value, onChange, onClick, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onClick={onClick}
        className={cn(
          "h-9 w-full rounded-lg bg-slate-50 dark:bg-slate-900/30 px-3 text-[13px] outline-none",
          "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500",
          "border border-slate-200 dark:border-slate-800",
          "focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 dark:focus:ring-indigo-950/40",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

const CustomSelectSearch = ({
  title,
  options,
  name,
  selectedValue,
  handleInputChange,
  isSelectAll = false,
  readOnly,
  redlabel,
  disabled = false,
  className = "",
  uppertitle,
  labelClass,
  ShortName = false,
  placeholder = "Select",
  rightElement,
  ...props
}: any) => {
  const [selected, setSelected] = useState(selectedValue || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // ✅ portal positioning
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setSelected(selectedValue || "");
  }, [selectedValue]);

  // outside click close (portal-safe)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (containerRef.current && containerRef.current.contains(t)) return;
      if (dropdownRef.current && dropdownRef.current.contains(t)) return; // ✅
      setIsOpen(false);
      setSearchTerm("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // focus search on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);

      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    } else {
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleSelectionChange = (newValue: any) => {
    const stringValue = newValue?.toString() || "";
    setSelected(stringValue);
    handleInputChange?.(name, stringValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const toTitleCase = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filteredOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    const search = (searchTerm || "").toLowerCase();
    return options.filter((option: any) => {
      const label =
        typeof option?.label === "string"
          ? option.label.toLowerCase()
          : String(option?.label || "").toLowerCase();
      return label.includes(search);
    });
  }, [options, searchTerm]);

  const handleSearchClick = (e: any) => {
    e.stopPropagation();
    searchInputRef.current?.focus();
  };

  const handleSearchChange = (e: any) => {
    e.stopPropagation();
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
  };

  const ALL_VALUE = Array.isArray(options) ? options.map((o: any) => o.value).join(",") : "";

  const isAllSelected = () => {
    const allValues = options?.map((o: any) => o.value).join(",");
    return selected === allValues;
  };

  const handleSearchKeyDown = (e: any) => {
    e.stopPropagation();

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const totalOptions = isSelectAll ? filteredOptions.length + 1 : filteredOptions.length;
        setHighlightedIndex((prev: number) => (prev < totalOptions - 1 ? prev + 1 : prev));
        break;
      }
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev: number) => (prev > 0 ? prev - 1 : 0));
        break;

      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (isSelectAll && highlightedIndex === 0) {
            handleSelectionChange(ALL_VALUE);
          } else {
            const optionIndex = isSelectAll ? highlightedIndex - 1 : highlightedIndex;
            if (filteredOptions[optionIndex]) {
              handleSelectionChange(filteredOptions[optionIndex].value);
            }
          }
        }
        break;

      case "Tab":
        setIsOpen(false);
        setSearchTerm("");
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current[highlightedIndex]) {
      optionsRef.current[highlightedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  const getDisplayValue = () => {
    if (!selected) return placeholder;

    const hasMultipleOptions = Array.isArray(options) && options.length > 1;

    if (selected === ALL_VALUE && hasMultipleOptions) {
      return `All ${title || "options"}`;
    }

    const selectedOption = options?.find(
      (opt: any) => opt.value?.toString() === selected?.toString()
    );

    return selectedOption ? selectedOption.label : placeholder;
  };

  const handleOptionClick = (e: any, value: any) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelectionChange(value);
  };

  const isOptionSelected = (optionValue: any) => {
    if (optionValue === ALL_VALUE) return selected === ALL_VALUE;
    return selected?.toString() === optionValue?.toString();
  };

  const isDisabledUI = disabled || readOnly;

  // ✅ portal position updater
  const updatePos = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const measuredH = dropdownRef.current?.offsetHeight || 300;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeTop = spaceBelow < measuredH && spaceAbove > measuredH;

    const width = rect.width;
    let left = rect.left;

    const maxLeft = window.innerWidth - width - 8;
    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;

    let top = placeTop ? rect.top - measuredH - 8 : rect.bottom + 8;
    if (top < 8) top = 8;

    setPos({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePos();
    const raf = requestAnimationFrame(() => updatePos());

    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [isOpen, filteredOptions.length, updatePos]);

  return (
    <div className="relative w-full space-y-1" ref={containerRef}>
      {(title || uppertitle || redlabel) && (
        <label
          className={cn(
            "flex items-center gap-2 text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300",
            labelClass
          )}
          htmlFor={name}
        >
          {ShortName ? title : toTitleCase(title)}
          {uppertitle ? <span className="ml-1">{uppertitle}</span> : null}
          {redlabel ? <span className="text-red-500">{redlabel}</span> : null}
        </label>
      )}

      {/* Trigger */}
      <div
        tabIndex={isDisabledUI ? -1 : 0}
        className={cn(
          "relative h-9 w-full rounded-xl border bg-white px-3 shadow-sm",
          "border-slate-200 text-[13px] text-slate-900",
          "dark:bg-black dark:text-white dark:border-slate-800",
          "flex items-center justify-between cursor-pointer",
          isDisabledUI && "opacity-60 cursor-not-allowed",
          !isDisabledUI && "hover:border-indigo-300 dark:hover:border-slate-700",
          isOpen && "ring-4 ring-indigo-100 border-indigo-400 dark:ring-indigo-950/40",
          rightElement ? "pr-[112px]" : "",
          className
        )}
        onFocus={() => {
          if (!isDisabledUI) setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (isDisabledUI) return;

          const totalOptions = isSelectAll ? filteredOptions.length + 1 : filteredOptions.length;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setHighlightedIndex(0);
            } else {
              setHighlightedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : prev));
            }
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }

          if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0) {
              if (isSelectAll && highlightedIndex === 0) {
                handleSelectionChange(ALL_VALUE);
              } else {
                const optionIndex = isSelectAll ? highlightedIndex - 1 : highlightedIndex;
                if (filteredOptions[optionIndex]) {
                  handleSelectionChange(filteredOptions[optionIndex].value);
                }
              }
            }
          }

          if (e.key === "Escape") {
            setIsOpen(false);
            setSearchTerm("");
          }
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!isDisabledUI) setIsOpen((prev) => !prev);
        }}
        {...props}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{getDisplayValue()}</span>

        {/* chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            "text-slate-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>

        {rightElement ? (
          <div className="absolute right-1 top-1 h-7 flex items-center">{rightElement}</div>
        ) : null}
      </div>

      {/* ✅ Dropdown (PORTAL) */}
      {isOpen && mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              className={cn(
                "fixed z-[99999] w-full min-w-[200px] rounded-xl shadow-lg overflow-hidden",
                "bg-white dark:bg-black border border-slate-200 dark:border-slate-800"
              )}
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: "300px",
              }}
            >
              {/* Search */}
              <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-inherit">
                <Input
                  ref={searchInputRef}
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onClick={handleSearchClick}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>

              {/* Options */}
              <div
                className={cn(
                  "max-h-60 overflow-y-auto",
                  "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent]",
                  "[&::-webkit-scrollbar]:w-[6px]",
                  "[&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full",
                  "dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/60"
                )}
              >
                {Array.isArray(options) && options.length > 0 ? (
                  <>
                    {/* Select All */}
                    {isSelectAll && Array.isArray(options) && options.length > 1 && (
                      <div
                        ref={(el) => (optionsRef.current[0] = el)}
                        className={cn(
                          "px-3 py-2 cursor-pointer transition-colors border-b",
                          "border-slate-200 dark:border-slate-800 font-semibold",
                          "hover:bg-slate-50 dark:hover:bg-white/5",
                          highlightedIndex === 0 && "bg-slate-50 dark:bg-white/5",
                          isAllSelected() && "bg-indigo-50/70 dark:bg-indigo-950/20"
                        )}
                        onClick={(e) => handleOptionClick(e, ALL_VALUE)}
                        onMouseEnter={() => setHighlightedIndex(0)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{`All ${title || "options"}`}</span>
                          {isAllSelected() && (
                            <svg
                              className="text-indigo-600 dark:text-indigo-300"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Filtered options */}
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((opt: any, index: number) => {
                        const actualIndex = isSelectAll ? index + 1 : index;
                        const selectedNow = isOptionSelected(opt.value);

                        return (
                          <div
                            key={`${opt.value}-${index}`}
                            ref={(el) => (optionsRef.current[actualIndex] = el)}
                            className={cn(
                              "px-3 py-2 text-[13px] cursor-pointer transition-colors",
                              "text-slate-700 dark:text-slate-200",
                              "hover:bg-slate-50 dark:hover:bg-white/5",
                              highlightedIndex === actualIndex && "bg-slate-50 dark:bg-white/5",
                              selectedNow && "bg-indigo-50/70 dark:bg-indigo-950/20"
                            )}
                            onClick={(e) => handleOptionClick(e, opt.value)}
                            onMouseEnter={() => setHighlightedIndex(actualIndex)}
                          >
                            <div className="flex items-center justify-between">
                              <span>{opt.label}</span>
                              {selectedNow && (
                                <svg
                                  className="text-indigo-600 dark:text-indigo-300"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                >
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-slate-400 text-[13px]">
                        No options found
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-4 text-center text-slate-400 text-[13px]">
                    No options available
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default CustomSelectSearch;