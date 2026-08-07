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
  title: string;
  name: string;
  option: Option[];
  handleInputChange: (name: string, value: any) => void;

  className?: string;
  isMulti?: boolean;
  initialValue?: any;

  disabled?: boolean;
  autoFocus?: boolean;
  redlabel?: string;
  mb?: number | string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  required?: boolean;
  ShortName?: boolean;
  style?: React.CSSProperties;

  rightElement?: React.ReactNode;
};

const Eselect = ({
  title,
  name,
  option = [],
  handleInputChange,
  className,
  isMulti,
  initialValue,
  disabled,
  autoFocus,
  redlabel,
  mb,
  onKeyDown,
  required,
  ShortName,
  style,
  rightElement,
}: Props) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropup, setDropup] = useState(false);
  const [maxOptionWidth, setMaxOptionWidth] = useState(0);

  // ✅ portal positioning
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const focusedItemRef = useRef<HTMLLIElement | null>(null);

  // ✅ portal dropdown ref
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  const filteredOptions = useMemo(() => {
    const q = inputValue.toLowerCase();
    return (option || []).filter((opt) => opt?.label?.toLowerCase().includes(q));
  }, [option, inputValue]);

  // measure max width needed
  const calculateMaxWidth = useMemo(() => {
    if (typeof document === "undefined" || !option?.length) return 0;

    const temp = document.createElement("span");
    document.body.appendChild(temp);
    temp.style.visibility = "hidden";
    temp.style.whiteSpace = "nowrap";
    temp.style.fontSize = "13px";
    temp.style.padding = "0 12px";

    let max = 0;
    option.forEach((o) => {
      temp.textContent = o.label;
      const w = temp.offsetWidth + 56;
      if (w > max) max = w;
    });

    document.body.removeChild(temp);
    return max;
  }, [option]);

  useEffect(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    setMaxOptionWidth(Math.max(containerWidth, calculateMaxWidth));
  }, [calculateMaxWidth]);

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

      const selected = (option || []).filter((o) => values.includes(normalize(o.value)));
      setSelectedOptions(selected);
    } else {
      setSelectedOptions([]);
    }

    if (autoFocus && inputRef.current) inputRef.current.focus();
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
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, disabled, filteredOptions, focusedIndex]);

  const handleSelect = (selectedOption: Option) => {
    if (disabled) return;

    if (isMulti) {
      const exists = selectedOptions.some((o) => String(o.value) === String(selectedOption.value));
      const newSelected = exists
        ? selectedOptions.filter((o) => String(o.value) !== String(selectedOption.value))
        : [...selectedOptions, selectedOption];

      setSelectedOptions(newSelected);
      handleInputChange(name, newSelected.map((o) => o.value));
    } else {
      setSelectedOptions([selectedOption]);
      handleInputChange(name, selectedOption.value);
      setOpen(false);
    }
    setInputValue("");
  };

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

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
    const measuredH = dropdownRef.current?.offsetHeight || 260;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const need = Math.min(measuredH, 320);

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
    setOpen((p) => !p);
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
      className={cn("w-full font-medium relative space-y-1", disabled && "opacity-60")}
      style={{ marginBottom: mbPx, ...style }}
    >
      <label className="flex items-center gap-2 text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300">
        {ShortName ? title : toTitleCase(title)}
        {redlabel ? <span className="text-red-500">{redlabel}</span> : null}
      </label>

      <input
        type="hidden"
        name={name}
        value={selectedOptions?.length ? selectedOptions.map((o) => o.value).join(",") : ""}
        required={required}
      />

      {/* main box */}
      <div
        onMouseDown={handleMouseDown}
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
          {selectedOptions.length ? selectedOptions.map((o) => o.label).join(", ") : "Select"}
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
                "bg-white dark:bg-black shadow-lg overflow-hidden"
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
                  onKeyDown={onKeyDown}
                />
              </div>

              {/* list */}
              <ul
                ref={listRef}
                className={cn(
                  "max-h-60 overflow-y-auto py-1",
                  "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent]",
                  "[&::-webkit-scrollbar]:w-[6px]",
                  "[&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full",
                  "dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/60"
                )}
                onMouseDown={(e) => e.preventDefault()}
              >
                {filteredOptions.map((opt, index) => (
                  <li
                    key={String(opt.value)}
                    ref={focusedIndex === index ? focusedItemRef : null}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "px-3 py-2 text-[13px] cursor-pointer",
                      "text-slate-700 dark:text-slate-200",
                      "hover:bg-slate-50 dark:hover:bg-white/5",
                      focusedIndex === index && "bg-slate-50 dark:bg-white/5"
                    )}
                  >
                    {opt.label}
                  </li>
                ))}
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