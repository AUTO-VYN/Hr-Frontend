"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { BiChevronDown } from "react-icons/bi";
import { AiOutlineSearch } from "react-icons/ai";
import { cn } from "@/lib/utils";

type Option = { value: any; label: string };

type Props = {
  title?: string;
  name: string;
  option: Option[];
  handleInputChange: (name: string, value: any) => void;

  className?: string;
  isMulti?: boolean;
  checkbox?: boolean;
  initialValue?: any;

  disabled?: boolean;
  autoFocus?: boolean;
  redlabel?: string;
  mb?: number | string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  required?: boolean;
  ShortName?: boolean;
  style?: React.CSSProperties;
  placeholder?: string;

  rightElement?: React.ReactNode;
  labelClassName?: string;
};

const Eselect = ({
  title,
  name,
  option = [],
  handleInputChange,
  className,
  isMulti,
  checkbox = false,
  initialValue,
  disabled,
  autoFocus,
  redlabel,
  mb,
  onKeyDown,
  required,
  ShortName,
  style,
  placeholder = "Select",
  rightElement,
  labelClassName,
}: Props) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropup, setDropup] = useState(false);
  const [maxOptionWidth, setMaxOptionWidth] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(80);

  // ✅ portal positioning
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const isMultiMode = isMulti || checkbox;

  const selectedValuesSet = useMemo(() => {
    return new Set(selectedOptions.map((o) => String(o.value)));
  }, [selectedOptions]);

  useEffect(() => {
    setDisplayLimit(80);
  }, [inputValue, open]);

  const handleScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      setDisplayLimit((prev) => Math.min(prev + 80, filteredOptions.length));
    }
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const focusedItemRef = useRef<HTMLLIElement | null>(null);
  const isSelectingRef = useRef(false);

  // ✅ portal dropdown ref
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  const filteredOptions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return option || [];

    const matched: { opt: Option; rank: number; index: number }[] = [];

    (option || []).forEach((opt, index) => {
      const label = (opt?.label || "").toLowerCase();
      const val = String(opt?.value ?? "").toLowerCase();

      const valExact = val === q;
      const labelExact = label === q;
      const valStarts = val.startsWith(q);
      const labelStarts = label.startsWith(q);

      // Support space, dash, pipe, comma, underscore
      const words = label.split(/[\s\-|,_]+/);
      const wordStarts = words.some((w) => w.startsWith(q));

      const valIncludes = val.includes(q);
      const labelIncludes = label.includes(q);

      if (!valIncludes && !labelIncludes) return;

      let rank = 10;
      if (valExact) {
        rank = 0; // Highest priority: exact empcode
      } else if (labelExact) {
        rank = 1; // Exact label
      } else if (valStarts) {
        rank = 2; // Empcode starts with search query
      } else if (labelStarts) {
        rank = 3; // Label starts with search query
      } else if (wordStarts) {
        rank = 4; // Any word in label/name starts with query
      } else if (valIncludes) {
        rank = 5;
      } else if (labelIncludes) {
        rank = 6;
      }

      matched.push({ opt, rank, index });
    });

    matched.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.index - b.index;
    });

    return matched.map((m) => m.opt);
  }, [option, inputValue]);

  // measure max width needed only when dropdown is open
  const calculateMaxWidth = useMemo(() => {
    if (!open || typeof document === "undefined" || !option?.length) return 0;

    const sampleOptions = option.length > 50 ? option.slice(0, 50) : option;

    const temp = document.createElement("span");
    document.body.appendChild(temp);
    temp.style.visibility = "hidden";
    temp.style.whiteSpace = "nowrap";
    temp.style.fontSize = "13px";
    temp.style.padding = "0 12px";

    let max = 0;
    sampleOptions.forEach((o) => {
      temp.textContent = o.label;
      const w = temp.offsetWidth + 56;
      if (w > max) max = w;
    });

    document.body.removeChild(temp);
    return max;
  }, [open, option]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    setMaxOptionWidth(Math.max(containerWidth, calculateMaxWidth));
  }, [open, calculateMaxWidth]);

  // init selected
  useEffect(() => {
    const normalize = (v: any) => String(v);

    if (initialValue !== undefined && initialValue !== null && initialValue !== "") {
      let values: string[] = [];

      if (typeof initialValue === "string" || typeof initialValue === "number") {
        values = [normalize(initialValue)];
      } else if (Array.isArray(initialValue)) {
        values = initialValue.map(normalize);
      } else if (typeof initialValue === "object") {
        values = Object.values(initialValue).map(normalize);
      }

      const valSet = new Set(values);
      const selected = (option || []).filter((o) => valSet.has(normalize(o.value)));

      const isSame =
        selected.length === selectedOptions.length &&
        selected.every((s, i) => String(s.value) === String(selectedOptions[i]?.value));

      if (isSame) {
        return;
      }

      setSelectedOptions(selected);
    } else {
      if (selectedOptions.length > 0) {
        setSelectedOptions([]);
      }
    }

    if (autoFocus && triggerRef.current) triggerRef.current.focus();
  }, [initialValue, option, autoFocus]);

  // ✅ click outside close (portal-safe)
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return; // ✅ portal dropdown
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // Helper: Find and focus the next or previous tabbable element in the page
  const focusNextElement = useCallback((reverse: boolean = false) => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof document === "undefined") return;

    const selector = [
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ].join(", ");

    const all = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    const visibleElements = all.filter((el) => {
      if (dropdownRef.current && dropdownRef.current.contains(el)) return false;
      if (containerRef.current && containerRef.current.contains(el) && el !== triggerEl) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return (
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el.getClientRects().length > 0
      );
    });

    const currentIndex = visibleElements.indexOf(triggerEl);
    if (currentIndex === -1) return;

    const targetEl = reverse
      ? visibleElements[currentIndex - 1]
      : visibleElements[currentIndex + 1];

    if (targetEl) {
      targetEl.focus();
    } else {
      isSelectingRef.current = true;
      triggerEl.focus();
    }
  }, []);

  // keyboard navigation
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!open || disabled) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((p) => (p < filteredOptions.length - 1 ? p + 1 : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((p) => (p > 0 ? p - 1 : filteredOptions.length - 1));
      } else if (
        event.key === "Enter" &&
        focusedIndex >= 0 &&
        focusedIndex < filteredOptions.length
      ) {
        event.preventDefault();
        handleSelect(filteredOptions[focusedIndex]);
      } else if (event.key === "Escape") {
        isSelectingRef.current = true;
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === "Tab") {
        event.preventDefault();
        if (
          !isMultiMode &&
          focusedIndex >= 0 &&
          focusedIndex < filteredOptions.length
        ) {
          const opt = filteredOptions[focusedIndex];
          setSelectedOptions([opt]);
          handleInputChange(name, opt.value);
        }
        setOpen(false);
        focusNextElement(event.shiftKey);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, disabled, filteredOptions, focusedIndex, isMultiMode, name, handleInputChange, focusNextElement]);

  const isAllSelected = useMemo(() => {
    if (!checkbox || !option?.length) return false;
    const target = filteredOptions.length > 0 ? filteredOptions : option;
    if (target.length === 0) return false;
    if (target.length === option.length && selectedOptions.length === option.length) {
      return true;
    }
    return target.every((o) => selectedValuesSet.has(String(o.value)));
  }, [checkbox, option, filteredOptions, selectedOptions.length, selectedValuesSet]);

  const lastSelectAllTimeRef = useRef(0);
  const lastSelectRef = useRef<{ val: string; time: number }>({ val: "", time: 0 });

  const handleSelectAll = () => {
    if (disabled) return;

    const now = Date.now();
    if (now - lastSelectAllTimeRef.current < 250) {
      return;
    }
    lastSelectAllTimeRef.current = now;

    const target = filteredOptions.length > 0 ? filteredOptions : option;
    if (isAllSelected) {
      if (target.length === option.length) {
        setSelectedOptions([]);
        handleInputChange(name, []);
      } else {
        const targetValues = new Set(target.map((o) => String(o.value)));
        const newSelected = selectedOptions.filter(
          (s) => !targetValues.has(String(s.value))
        );
        setSelectedOptions(newSelected);
        handleInputChange(name, newSelected.map((o) => o.value));
      }
    } else {
      if (target.length === option.length) {
        setSelectedOptions([...option]);
        handleInputChange(name, option.map((o) => o.value));
      } else {
        const toAdd = target.filter((o) => !selectedValuesSet.has(String(o.value)));
        const newSelected = [...selectedOptions, ...toAdd];
        setSelectedOptions(newSelected);
        handleInputChange(name, newSelected.map((o) => o.value));
      }
    }
  };

  const handleSelect = (selectedOption: Option) => {
    if (disabled) return;

    const optVal = String(selectedOption.value);
    const now = Date.now();
    if (lastSelectRef.current.val === optVal && now - lastSelectRef.current.time < 250) {
      return;
    }
    lastSelectRef.current = { val: optVal, time: now };

    if (isMultiMode) {
      const exists = selectedValuesSet.has(optVal);
      const newSelected = exists
        ? selectedOptions.filter((o) => String(o.value) !== optVal)
        : [...selectedOptions, selectedOption];

      setSelectedOptions(newSelected);
      handleInputChange(name, newSelected.map((o) => o.value));
    } else {
      setSelectedOptions([selectedOption]);
      handleInputChange(name, selectedOption.value);
      isSelectingRef.current = true;
      setOpen(false);
      triggerRef.current?.focus();
    }
    if (!checkbox) {
      setInputValue("");
    }
  };

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) {
      setFocusedIndex(-1);
      setInputValue("");
    }
  }, [open]);

  useEffect(() => {
    if (inputValue.trim()) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(-1);
    }
  }, [inputValue]);

  useEffect(() => {
    if (focusedItemRef.current) {
      focusedItemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [focusedIndex]);

  // ✅ portal position updater
  const updateDropdownPos = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // dropdown height (measured if possible)
    const measuredH = dropdownRef.current?.offsetHeight || (checkbox ? 210 : 170);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const need = Math.min(measuredH, checkbox ? 220 : 180);

    const shouldDropup = spaceBelow < need && spaceAbove > need;
    setDropup(shouldDropup);

    const width = Math.max(rect.width, maxOptionWidth);
    let left = rect.left;

    // keep within viewport
    const maxLeft = window.innerWidth - width - 8;
    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;

    let top = shouldDropup ? rect.top - measuredH - 8 : rect.bottom + 8;
    if (top < 8) top = 8;

    setPos({ top, left, width });
  }, [maxOptionWidth]);

  useLayoutEffect(() => {
    if (!open) return;

    updateDropdownPos();

    // wait 1 frame so dropdownRef has height
    const raf = requestAnimationFrame(() => updateDropdownPos());

    window.addEventListener("resize", updateDropdownPos);
    window.addEventListener("scroll", updateDropdownPos, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateDropdownPos);
      window.removeEventListener("scroll", updateDropdownPos, true);
    };
  }, [open, filteredOptions.length, updateDropdownPos]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (disabled) return;
    event.preventDefault();
    if (open) {
      isSelectingRef.current = true;
      setOpen(false);
      triggerRef.current?.focus();
    } else {
      setOpen(true);
    }
  };

  const handleFocus = () => {
    if (disabled) return;
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }
    setOpen(true);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const toTitleCase = (str?: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const mbPx =
    mb === undefined
      ? undefined
      : typeof mb === "number"
        ? `${mb}px`
        : /^\d+$/.test(String(mb))
          ? `${mb}px`
          : String(mb);

  return (
    <div
      ref={containerRef}
      className={cn("w-full font-medium relative space-y-1.5", disabled && "opacity-60")}
      style={{ marginBottom: mbPx, ...style }}
    >
      {title ? (
        <label
          className={cn(
            "flex items-center gap-2 text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300 whitespace-nowrap",
            labelClassName
          )}
        >
          {ShortName ? title : toTitleCase(title)}
          {redlabel ? <span className="text-red-500">{redlabel}</span> : null}
        </label>
      ) : null}

      <input
        type="hidden"
        name={name}
        value={selectedOptions?.length ? selectedOptions.map((o) => o.value).join(",") : ""}
        required={required}
      />

      {/* main box */}
      <div
        ref={triggerRef}
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onBlur={() => {
          isSelectingRef.current = false;
        }}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "relative h-9 w-full rounded-xl border bg-white px-3 shadow-sm",
          "border-slate-200 text-[13px] text-slate-900",
          "focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-400",
          "dark:bg-black dark:text-white dark:border-slate-800 dark:focus-within:ring-indigo-950/40",
          "flex items-center justify-between cursor-pointer",
          disabled && "cursor-not-allowed",
          rightElement ? "pr-[112px]" : "",
          className
        )}
      >
        <div className={cn("truncate", selectedOptions.length ? "" : "text-slate-400")}>
          {selectedOptions.length
            ? checkbox && selectedOptions.length === option.length && option.length > 1
              ? `All Selected (${option.length})`
              : selectedOptions.map((o) => o.label).join(", ")
            : placeholder}
        </div>

        {!disabled ? (
          <BiChevronDown
            size={18}
            className={cn("text-slate-500 transition", open && "rotate-180")}
          />
        ) : null}

        {rightElement ? (
          <div className="absolute right-1 top-1 h-7 flex items-center">{rightElement}</div>
        ) : null}
      </div>

      {/* ✅ dropdown (PORTAL) */}
      {open && !disabled && mounted && typeof document !== "undefined"
        ? createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              "fixed z-[99999] rounded-xl border border-slate-200 dark:border-slate-800",
              "bg-white dark:bg-black shadow-lg overflow-hidden pointer-events-auto"
            )}
            style={{ top: pos.top, left: pos.left, width: `${pos.width}px` }}
          >
            {/* search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
              <AiOutlineSearch size={16} className="text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search..."
                className={cn(
                  "h-9 w-full rounded-lg bg-slate-50 dark:bg-slate-900/30 px-3 text-[13px] outline-none",
                  "text-slate-900 dark:text-white placeholder:text-slate-400",
                  "focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                  }
                  onKeyDown?.(e);
                }}
              />
            </div>

            {/* select all checkbox row */}
            {checkbox && option.length > 0 && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectAll();
                }}
                className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-[13px] select-none"
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  readOnly
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none accent-indigo-600 shrink-0"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Select All {filteredOptions.length < option.length ? `(${filteredOptions.length})` : `(${option.length})`}
                </span>
                {selectedOptions.length > 0 && (
                  <span className="ml-auto text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {selectedOptions.length} selected
                  </span>
                )}
              </div>
            )}

            {/* list */}
            <ul
              ref={listRef}
              onScroll={handleScroll}
              className={cn(
                "max-h-[160px] overflow-y-auto py-1",
                "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent]",
                "[&::-webkit-scrollbar]:w-[6px]",
                "[&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full",
                "dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/60"
              )}
            >
              {filteredOptions.slice(0, displayLimit).map((opt, index) => {
                const isSelected = selectedValuesSet.has(String(opt.value));
                return (
                  <li
                    key={`${String(opt.value)}_${index}`}
                    ref={focusedIndex === index ? focusedItemRef : null}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(opt);
                    }}
                    className={cn(
                      "px-3 py-2 text-[13px] cursor-pointer transition-colors flex items-center gap-2.5",
                      "text-slate-700 dark:text-slate-200",
                      "hover:bg-slate-50 dark:hover:bg-blue-600 dark:hover:text-white",
                      focusedIndex === index &&
                        "bg-slate-50 dark:bg-blue-600 dark:text-white",
                      isSelected &&
                        checkbox &&
                        "bg-indigo-50/60 dark:bg-indigo-950/40 font-medium text-indigo-900 dark:text-indigo-200"
                    )}
                  >
                    {checkbox && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none accent-indigo-600 shrink-0"
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </li>
                );
              })}
              {filteredOptions.length > displayLimit ? (
                <li className="px-3 py-1.5 text-center text-xs text-slate-400 select-none">
                  Showing {displayLimit} of {filteredOptions.length} (scroll for more)
                </li>
              ) : null}
              {!filteredOptions.length ? (
                <li className="px-3 py-2 text-[13px] text-slate-400">No results</li>
              ) : null}
            </ul>
          </div>,
          document.body
        )
        : null}
    </div>
  );
};

export default Eselect;