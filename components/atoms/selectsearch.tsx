import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

interface CustomInputWithDatalistProps {
  idPrefix: string;
  className?: string;
  name: string;
  selectedValue?: string | number | null;
  title: string;
  options?: any[];
  handleInputChange: (name: string, value: any) => void;
  redlabel?: string;
  disabled?: boolean;
  placeholder?: string;
  labelClassName?: string;
  ShortName?: boolean;
  [key: string]: any;
}

const CustomInputWithDatalist: React.FC<CustomInputWithDatalistProps> = ({
  idPrefix,
  className,
  name,
  selectedValue,
  title,
  options = [],
  handleInputChange,
  redlabel,
  disabled = false,
  placeholder = "",
  labelClassName = "",
  ShortName = false,
  ...rest
}) => {
  const inputId = `${idPrefix}-input`;
  const [selected, setSelected] = useState(selectedValue || "");
  const [debouncedValue, setDebouncedValue] = useState(selectedValue || "");
  const [selectedLabel, setSelectedLabel] = useState("");

  useEffect(() => {
    setSelected(selectedValue || "");
  }, [selectedValue]);

  const [optionValues, setOptionValues] = useState<string[]>([]);
  useEffect(() => {
    // Extract values from options array
    const values = options?.map((option: any) =>
      typeof option === "object"
        ? (option?.value ?? option?.EmpCode ?? option?.Emp_Code ?? option?.id ?? "").toString()
        : option?.toString()
    ) || [];
    setOptionValues(values);
  }, [options]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(selected);
    }, 200);

    return () => clearTimeout(timeout);
  }, [selected]);

  const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSelected(newValue);
    const selectedOption = options?.find((option: any) => {
      const optVal = typeof option === "object" ? (option?.value ?? option?.EmpCode) : option;
      return optVal == newValue;
    });
    setSelectedLabel(selectedOption ? (selectedOption.label ?? selectedOption.FullName ?? "") : "");
  };

  useEffect(() => {
    handleInputChange(name, debouncedValue ? debouncedValue : "");
  }, [debouncedValue]);

  const toTitleCase = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="w-full space-y-1.5">
      <label
        className={cn(
          "flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400",
          labelClassName
        )}
        htmlFor={name}
      >
        {ShortName ? title : toTitleCase(title)}
        {redlabel && <span className="text-red-500 text-[11px] font-semibold">{redlabel}</span>}
      </label>
      <input
        autoComplete="off"
        className={cn(
          "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400",
          "focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100",
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
          "dark:border-slate-700 dark:bg-[#0F1A2D] dark:text-slate-100 dark:placeholder:text-slate-500",
          "dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-500/20",
          "dark:disabled:bg-[#0B1220] dark:disabled:text-slate-500",
          className
        )}
        type="text"
        id={inputId}
        list={`${idPrefix}-datalist`}
        value={selected}
        onChange={handleSelectionChange}
        disabled={disabled}
        placeholder={placeholder}
        {...rest}
      />
      <datalist id={`${idPrefix}-datalist`} className="w-full">
        {options?.map((option: any, index: number) => {
          const val = typeof option === "object" ? (option?.value ?? option?.EmpCode ?? option?.id) : option;
          const lbl = typeof option === "object" ? (option?.label ?? option?.FullName ?? option?.Emp_Name ?? val) : option;
          return (
            <option key={index} value={val}>
              {lbl}
            </option>
          );
        })}
      </datalist>
    </div>
  );
};

export default CustomInputWithDatalist;
