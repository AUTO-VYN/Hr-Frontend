import React, { ChangeEvent, FC, InputHTMLAttributes } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

interface AinputProps extends InputHTMLAttributes<HTMLInputElement> {
  title: string;
  type: string;
  name: string;
  disabled?: boolean;
  handleInputChange: (name: string, value: any) => void;
  required?: boolean;
  value: string | number | null;

  readOnly?: boolean;
  errorMessage?: string;
  redlabel?: string;
  autoComplete?: string;
  ShortName?: boolean;

  // ✅ attach button/icon inside input (right side)
  rightElement?: React.ReactNode;
}

const Ainput: FC<AinputProps> = ({
  title,
  type,
  name,
  handleInputChange,
  required,
  value,
  readOnly,
  disabled,
  errorMessage,
  className,
  maxLength,
  onKeyDown,
  redlabel,
  style,
  ShortName,
  autoComplete,
  rightElement,
  placeholder,
  ...rest
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const v = event.target.value;

    if (type === "date" && v === "") {
      handleInputChange(name, null);
      return;
    }
    if (type === "date") {
      const year = v.split("-")[0];
      if (year.length <= 4) handleInputChange(name, v);
      return;
    }
    handleInputChange(name, v);
  };

  const toTitleCase = (str?: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getAutoComplete = () =>
    autoComplete !== undefined ? autoComplete : "off";

  const isDate = type === "date";

  return (
    <div className="w-full space-y-1">
      <label
        className="flex items-center gap-2 text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300"
        htmlFor={name}
      >
        {ShortName ? title : toTitleCase(title)}
        {redlabel ? <span className="text-red-500">{redlabel}</span> : null}
        {errorMessage ? (
          <span className="text-red-500 text-[11px]">{errorMessage}</span>
        ) : null}
      </label>

      <div className="relative">
        <Input
          {...rest}
          placeholder={placeholder}
          className={cn(
            "h-9 w-full rounded-xl border bg-white px-3 text-[13px] text-slate-900 shadow-sm outline-none",
            "border-slate-200 placeholder:text-slate-400",
            "focus-visible:ring-4 focus-visible:ring-indigo-100 focus-visible:border-indigo-400",
            "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
            "dark:bg-black dark:text-white dark:border-slate-800 dark:placeholder:text-slate-500",
            "dark:focus-visible:ring-indigo-950/40",

            // ✅ date input: keep room + class for moving native icon to end
            isDate ? "date-end-icon pr-10" : "",

            // ✅ right attached element: override padding (more space)
            rightElement ? "pr-[112px]" : "",

            errorMessage
              ? "border-red-400 focus-visible:ring-red-100 focus-visible:border-red-400"
              : "",
            className
          )}
          type={type}
          name={name}
          onChange={handleChange}
          value={value ?? ""}
          required={required}
          disabled={disabled}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          maxLength={maxLength}
          style={style}
          autoComplete={getAutoComplete()}
          autoCorrect="off"
          spellCheck={false}
        />

        {/* ✅ Right attached button/icon */}
        {rightElement ? (
          <div className="absolute right-1 top-1 h-7 flex items-center">
            {rightElement}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Ainput;