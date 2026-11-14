"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  AlertCircle,
  Wrench,
  Sparkles,
  Monitor,
  Smartphone,
  ImagePlus,
  Send,
  Search,
  Trash2,
  Pencil,
  X,
  CalendarDays,
  Layers,
  FileText,
  RotateCcw,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import Einput from "@/components/atoms/Einput";
type Platform = "WEB" | "MOBILE" | "BOTH";

type Screenshot = {
  name: string;
  url: string;
};

type ReleaseNote = {
  id: number | string;
  module: string;
  platform: Platform;
  date: string;
  problem: string;
  solution: string;
  benefit: string;
  screenshots: Screenshot[];
};

type Option = {
  value: string;
  label: string;
};

const MODULES: Option[] = [
  { value: "REPORTS", label: "Reports" },
  { value: "DEMO CAR GATEPASS", label: "Demo Car Gatepass" },
  { value: "MISSPUNCH", label: "Misspunch" },
  { value: "LEAVE", label: "Leave" },
  { value: "WHATS NEW", label: "Whats New" },
  { value: "PAYROLL", label: "Payroll" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "EMPLOYEE", label: "Employee Management" },
  { value: "HRMS", label: "HRMS" },
  { value: "OTHER", label: "Other" },
];

const PLATFORMS: Option[] = [
  { value: "WEB", label: "Web" },
  { value: "MOBILE", label: "Mobile" },
  { value: "BOTH", label: "Both platforms" },
];

const MAX_LENGTH = 150;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const getModuleName = (value: string) =>
  MODULES.find(
    (item) => item.value.toLowerCase() === String(value || "").toLowerCase(),
  )?.label || value;

const normalizePlatform = (value: any): Platform => {
  const platform = String(value || "")
    .trim()
    .toUpperCase();

  if (platform === "MOBILE") return "MOBILE";
  if (platform === "BOTH") return "BOTH";

  return "WEB";
};

const getPlatformApiValue = (value: Platform) => {
  if (value === "MOBILE") return "Mobile";
  if (value === "BOTH") return "Both";
  return "Web";
};

const normalizeDate = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (value: string) => {
  if (!value) return "-";

  const date = new Date(value + "T00:00:00");

  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replaceAll("/", "-");
};

const getImageArray = (value: any): string[] => {
  if (!value) return [];

  let images = value;

  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = images ? [images] : [];
    }
  }

  if (!Array.isArray(images)) {
    images = [images];
  }

  return images.map((image: any) => {
    if (typeof image === "string") return image;

    return image?.url || image?.path || image?.filePath || image?.Image || "";
  });
};

const getImageUrl = (path: string) => {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  return `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(
    path,
  )}`;
};

export default function ReleaseNotesPage() {
  const user = useCurrentUser();

  const [notes, setNotes] = useState<ReleaseNote[]>([]);

  const [module, setModule] = useState("");
  const [platform, setPlatform] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [benefit, setBenefit] = useState("");

  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");

  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState<number | null>(null);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const headers = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name],
  );

  // SIDE ALERT
  const showSideAlert = (message: string, type: any = "info") => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  };

  // FILTERED RELEASE NOTES
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes
      .filter((note) => {
        const matchesPlatform =
          platformFilter === "ALL" || note.platform === platformFilter;

        const matchesSearch =
          !query ||
          getModuleName(note.module).toLowerCase().includes(query) ||
          note.problem.toLowerCase().includes(query) ||
          note.solution.toLowerCase().includes(query) ||
          note.benefit.toLowerCase().includes(query);

        return matchesPlatform && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          String(b.id).localeCompare(String(a.id)),
      );
  }, [notes, search, platformFilter]);

  // API RESPONSE NORMALIZATION
  const mapReleaseData = useCallback((row: any): ReleaseNote => {
    const images = getImageArray(
      row?.ImgSourseArray ??
        row?.imgSourseArray ??
        row?.images ??
        row?.screenshots,
    );

    return {
      id: row?.id ?? row?.ID ?? row?.UTD ?? "",
      module: String(row?.module_name ?? row?.ModuleName ?? row?.module ?? ""),
      platform: normalizePlatform(
        row?.platform ?? row?.PlateForm ?? row?.Platform,
      ),
      date: normalizeDate(
        row?.release_date ?? row?.Release_Date ?? row?.releaseDate,
      ),
      problem: String(row?.description ?? row?.Details ?? row?.problem ?? ""),
      solution: String(row?.solution ?? ""),
      benefit: String(row?.benefit ?? ""),
      screenshots: images
        .filter(Boolean)
        .map((image: string, index: number) => ({
          name: `Screenshot ${index + 1}`,
          url: getImageUrl(image),
        })),
    };
  }, []);

  // GET RELEASE NOTES
  const showapi = useCallback(async () => {
    if (!user?.Comp_Code || !user?.name) return;

    setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ReleaseView`,
        {},
        { headers },
      );

      const responseData = result?.data;

      const rows = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
          ? responseData.data
          : Array.isArray(responseData?.result)
            ? responseData.result
            : Array.isArray(responseData?.Data)
              ? responseData.Data
              : [];

      const mappedData = rows.map(mapReleaseData);

      setNotes(mappedData);

      setSelectedId((previous) => {
        if (
          previous !== null &&
          mappedData.some((item: ReleaseNote) => item.id === previous)
        ) {
          return previous;
        }

        return mappedData.length ? mappedData[0].id : null;
      });
    } catch (error: any) {
      console.error("Error fetching release notes:", error);

      showSideAlert(
        error?.response?.data?.Message ||
          error?.response?.data?.message ||
          "Unable to fetch release notes",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.name, headers, mapReleaseData]);

  useEffect(() => {
    if (user?.Comp_Code && user?.name) {
      showapi();
    }
  }, [user?.Comp_Code, user?.name, showapi]);

  // RESET FORM
  const resetForm = () => {
    setModule("");
    setPlatform("");
    setReleaseDate("");
    setProblem("");
    setSolution("");
    setBenefit("");
    setScreenshots([]);
    setEditingId(null);
    setFormError("");

    fileRefs.current.forEach((input) => {
      if (input) input.value = "";
    });
  };

  // INPUT HANDLER
  const handleInputChange = (name: string, value: any) => {
    if (name === "module") setModule(String(value));
    if (name === "platform") setPlatform(String(value));
    setFormError("");
  };

  // IMAGE UPLOAD
  const handleImageUpload = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid file",
        text: "Please upload a PNG or JPG image.",
      });

      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      Swal.fire({
        icon: "warning",
        title: "File too large",
        text: "Maximum image size is 5 MB.",
      });

      event.target.value = "";
      return;
    }

    if (!user?.Comp_Code || !user?.name) {
      showSideAlert("User details not available. Please login again.", "error");
      event.target.value = "";
      return;
    }

    setIsUploading(index);

    try {
      const formData = new FormData();

      formData.append("name", user.name);
      formData.append("Image", file);

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Asset/uploadedImage`,
        formData,
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
            token: user.email,
          },
        },
      );

      const uploadedPath =
        typeof result.data === "string"
          ? result.data
          : (result.data?.filePath ??
            result.data?.path ??
            result.data?.Image ??
            result.data?.image ??
            result.data?.url ??
            result.data?.data ??
            "");

      if (!uploadedPath || typeof uploadedPath !== "string") {
        throw new Error("Image upload response did not contain a file path.");
      }

      setScreenshots((previous) => {
        const updated = [...previous];

        updated[index] = {
          name: file.name,
          url: getImageUrl(uploadedPath),
        };

        return updated;
      });

      showSideAlert("Document Uploaded Successfully", "success");
    } catch (error: any) {
      console.error("Error uploading image:", error);

      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text:
          error?.response?.data?.Message ||
          error?.response?.data?.message ||
          error?.message ||
          "Image upload failed",
      });

      event.target.value = "";
    } finally {
      setIsUploading(null);
    }
  };

  // REMOVE IMAGE FROM FORM
  const removeImage = (index: number) => {
    setScreenshots((previous) => {
      const updated = [...previous];
      updated[index] = undefined as any;
      return updated;
    });

    if (fileRefs.current[index]) {
      fileRefs.current[index]!.value = "";
    }
  };

  // GET IMAGE PATHS FOR SAVE / UPDATE
  const getScreenshotPaths = () => {
    return screenshots.map((image) => {
      if (!image?.url) return "";

      const url = image.url;

      if (url.includes("/backend/fetch?filePath=")) {
        try {
          return decodeURIComponent(
            url.split("filePath=")[1]?.split("&")[0] || "",
          );
        } catch {
          return url;
        }
      }

      return url;
    });
  };

  // EDIT RELEASE
  const handleEdit = (note: ReleaseNote) => {
    setEditingId(note.id);
    setSelectedId(note.id);

    setModule(
      MODULES.find(
        (item) => item.value.toLowerCase() === note.module.toLowerCase(),
      )?.value || note.module,
    );

    setPlatform(note.platform);
    setReleaseDate(note.date);
    setProblem(note.problem);
    setSolution(note.solution);
    setBenefit(note.benefit);
    setScreenshots([...note.screenshots]);

    setFormError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // FORM VALIDATION
  const validateForm = () => {
    if (
      !module ||
      !platform ||
      !releaseDate ||
      !problem.trim() ||
      !solution.trim() ||
      !benefit.trim()
    ) {
      setFormError("Please complete all required fields.");

      Swal.fire({
        icon: "warning",
        title: "Required fields missing",
        text: "Please fill in module, platform, date, problem, solution and benefit.",
        confirmButtonColor: "#5145e9",
      });

      return false;
    }

    if (
      problem.length > MAX_LENGTH ||
      solution.length > MAX_LENGTH ||
      benefit.length > MAX_LENGTH
    ) {
      showSideAlert(
        "Maximum 150 characters allowed in each text field.",
        "warning",
      );
      return false;
    }

    return true;
  };

  // API PAYLOAD
  const getApiPayload = () => ({
    ID: editingId ?? "",
    ModuleName: module,
    PlateForm: getPlatformApiValue(platform as Platform),
    Release_Date: releaseDate,
    Details: problem.trim(),
    solution: solution.trim(),
    benefit: benefit.trim(),
    ImgSourseArray: getScreenshotPaths(),
    CreatedBy: user?.name || "",
  });

  // SAVE RELEASE
  const handlePublish = async () => {
    if (!validateForm()) return;

    if (!user?.Comp_Code || !user?.name) {
      showSideAlert("User details not available. Please login again.", "error");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        ...getApiPayload(),
        ID: "",
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ReleaseSave`,
        payload,
        { headers },
      );

      await Swal.fire({
        icon: "success",
        title: "Release published!",
        text: "Release note saved successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      resetForm();
      await showapi();
    } catch (error: any) {
      console.error("Error saving release:", error);

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error?.response?.data?.Message ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save release note.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATE RELEASE
  const handleUpdate = async () => {
    if (!validateForm()) return;

    if (editingId === null) {
      showSideAlert("Please select a release note to update.", "warning");
      return;
    }

    if (!user?.Comp_Code || !user?.name) {
      showSideAlert("User details not available. Please login again.", "error");
      return;
    }

    setIsLoading(true);

    try {
      const payload = getApiPayload();

      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ReleaseUpdate`,
        payload,
        { headers },
      );

      await Swal.fire({
        icon: "success",
        title: "Release updated!",
        text: "Release note updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      resetForm();
      await showapi();
    } catch (error: any) {
      console.error("Error updating release:", error);

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error?.response?.data?.Message ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to update release note.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // PUBLISH / UPDATE BUTTON HANDLER
  const handlePublishOrUpdate = () => {
    if (editingId !== null) {
      handleUpdate();
    } else {
      handlePublish();
    }
  };

  // DELETE RELEASE
  // No delete API was present in the supplied backend reference code.
  const handleDelete = async (event: React.MouseEvent, id: number | string) => {
    event.stopPropagation();

    await Swal.fire({
      icon: "info",
      title: "Delete API not available",
      text: "The supplied backend reference does not include a delete endpoint. No record has been deleted.",
      confirmButtonColor: "#5145e9",
    });
  };

  const handleResetFilters = () => {
    setSearch("");
    setPlatformFilter("ALL");
  };

  const columns = useMemo(
    () => [
      {
        Header: "MODULE",
        accessor: "module",
        Cell: ({ row }: any) => (
          <span className="font-semibold text-[#172b4d] dark:text-slate-100">
            {getModuleName(row.original.module).toUpperCase()}
          </span>
        ),
      },
      {
        Header: "PLATFORM",
        accessor: "platform",
        Cell: ({ row }: any) => {
          const value = row.original.platform;

          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                value === "WEB"
                  ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : value === "MOBILE"
                    ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300"
                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
              }`}
            >
              {value === "WEB" ? (
                <Monitor size={12} />
              ) : value === "MOBILE" ? (
                <Smartphone size={12} />
              ) : (
                <Layers size={12} />
              )}
              {value}
            </span>
          );
        },
      },
      {
        Header: "RELEASE DATE",
        accessor: "date",
        Cell: ({ row }: any) => (
          <span className="whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-300">
            {formatDate(row.original.date)}
          </span>
        ),
      },
      {
        Header: "PROBLEM",
        accessor: "problem",
        Cell: ({ row }: any) => (
          <div className="min-w-[150px] max-w-[220px] whitespace-normal text-[11px] leading-5 text-slate-600 dark:text-slate-300">
            {row.original.problem}
          </div>
        ),
      },
      {
        Header: "SOLUTION",
        accessor: "solution",
        Cell: ({ row }: any) => (
          <div className="min-w-[150px] max-w-[220px] whitespace-normal text-[11px] leading-5 text-slate-600 dark:text-slate-300">
            {row.original.solution}
          </div>
        ),
      },
      {
        Header: "BENEFIT",
        accessor: "benefit",
        Cell: ({ row }: any) => (
          <div className="min-w-[150px] max-w-[220px] whitespace-normal text-[11px] leading-5 text-slate-600 dark:text-slate-300">
            {row.original.benefit}
          </div>
        ),
      },
      {
        Header: "SCREENSHOTS",
        accessor: "screenshots",
        Cell: ({ row }: any) => {
          const images = row.original.screenshots || [];

          return (
            <div className="flex min-w-[90px] flex-wrap gap-1.5">
              {images.length > 0 ? (
                images.map((image: Screenshot, index: number) => (
                  <img
                    key={index}
                    src={image.url}
                    alt="Release attachment"
                    onClick={() => setImagePreview(image.url)}
                    className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 object-cover hover:border-indigo-500 dark:border-slate-600"
                  />
                ))
              ) : (
                <span className="text-[10px] text-slate-400">No images</span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        Header: "ACTIONS",
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const note = row.original;

          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title="Edit release"
                onClick={() => handleEdit(note)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
              >
                <Pencil size={13} />
              </button>

              <button
                type="button"
                title="Delete release"
                onClick={(e) => handleDelete(e, note.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 dark:text-slate-300 dark:hover:bg-rose-500/20"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        },
      },
    ],
    [handleEdit, handleDelete],
  );

  return (
    <div className="release-page min-h-screen bg-[#f6f8fc] p-2 text-[#172b4d] transition-colors duration-200 sm:p-3 xl:p-5">
      {/* HEADER */}
      <div className="mb-4">
        <h1 className="text-[21px] font-bold leading-tight text-[#10213b]">
          Release notes
        </h1>

        <p className="mt-1 text-[12px] text-[#64748b]">
          What shipped, per module and platform. Write it as problem → solution
          → benefit so branch users can read it without a translation.
        </p>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-3.5 xl:grid-cols-[430px_minmax(0,1fr)]">
        {/* LEFT FORM */}
        <div className="release-panel min-w-0 rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-[#172b4d]">
                {editingId !== null ? "Edit release note" : "New release note"}
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {editingId !== null
                  ? `Editing release #${editingId}`
                  : "Add a product update"}
              </p>
            </div>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
              >
                <X size={12} />
                Cancel
              </button>
            )}
          </div>

          {/* MODULE + PLATFORM */}
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <Eselect
              title="MODULE"
              redlabel="*"
              name="module"
              option={MODULES}
              initialValue={module}
              handleInputChange={handleInputChange}
              className="h-[36px] w-full"
              placeholder="Select module"
            />

            <Eselect
              title="PLATFORM"
              redlabel="*"
              name="platform"
              option={PLATFORMS}
              initialValue={platform}
              handleInputChange={handleInputChange}
              className="h-[36px] w-full"
              placeholder="Select platform"
            />
          </div>

          {/* DATE */}
          <div className="mt-3">
            <Einput
              type="date"
              name="releaseDate"
              value={releaseDate}
              handleInputChange={(name: string, value: string) => {
                setReleaseDate(value);
                setFormError("");
              }}
              className="h-[37px] w-full"
            />
          </div>

          {/* PROBLEM */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[10px] font-semibold text-[#52627c]">
                PROBLEM <span className="text-rose-500">*</span>
              </label>

              <span
                className={`text-[10px] ${
                  problem.length >= MAX_LENGTH
                    ? "text-rose-500"
                    : "text-slate-400"
                }`}
              >
                {problem.length} / {MAX_LENGTH}
              </span>
            </div>

            <textarea
              value={problem}
              maxLength={MAX_LENGTH}
              onChange={(e) => {
                setProblem(e.target.value);
                setFormError("");
              }}
              rows={2}
              placeholder="What was painful before this release..."
              className="release-input w-full resize-y rounded-lg border border-[#dce5f1] bg-white px-3 py-2.5 text-[12px] text-[#172b4d] outline-none placeholder:text-slate-400 focus:border-[#5145e9] focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* SOLUTION */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[10px] font-semibold text-[#52627c]">
                SOLUTION <span className="text-rose-500">*</span>
              </label>

              <span
                className={`text-[10px] ${
                  solution.length >= MAX_LENGTH
                    ? "text-rose-500"
                    : "text-slate-400"
                }`}
              >
                {solution.length} / {MAX_LENGTH}
              </span>
            </div>

            <textarea
              value={solution}
              maxLength={MAX_LENGTH}
              onChange={(e) => {
                setSolution(e.target.value);
                setFormError("");
              }}
              rows={2}
              placeholder="What you changed, in plain words..."
              className="release-input w-full resize-y rounded-lg border border-[#dce5f1] bg-white px-3 py-2.5 text-[12px] text-[#172b4d] outline-none placeholder:text-slate-400 focus:border-[#5145e9] focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* BENEFIT */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[10px] font-semibold text-[#52627c]">
                BENEFIT <span className="text-rose-500">*</span>
              </label>

              <span
                className={`text-[10px] ${
                  benefit.length >= MAX_LENGTH
                    ? "text-rose-500"
                    : "text-slate-400"
                }`}
              >
                {benefit.length} / {MAX_LENGTH}
              </span>
            </div>

            <textarea
              value={benefit}
              maxLength={MAX_LENGTH}
              onChange={(e) => {
                setBenefit(e.target.value);
                setFormError("");
              }}
              rows={2}
              placeholder="What the branch user gets out of it..."
              className="release-input w-full resize-y rounded-lg border border-[#dce5f1] bg-white px-3 py-2.5 text-[12px] text-[#172b4d] outline-none placeholder:text-slate-400 focus:border-[#5145e9] focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* SCREENSHOTS */}
          <div className="mt-4">
            <label className="mb-2 block text-[10px] font-semibold text-[#52627c]">
              SCREENSHOTS
              <span className="ml-1 font-normal text-slate-400">
                (Optional · Max 5 MB each)
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="relative">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    ref={(el) => {
                      fileRefs.current[index] = el;
                    }}
                    onChange={(e) => handleImageUpload(index, e)}
                    className="hidden"
                  />

                  {screenshots[index]?.url ? (
                    <div className="group relative h-[74px] overflow-hidden rounded-xl border border-[#dce5f1]">
                      <img
                        src={screenshots[index].url}
                        alt="Release screenshot"
                        className="h-full w-full cursor-pointer object-cover"
                        onClick={() => setImagePreview(screenshots[index].url)}
                      />

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploading !== null}
                      onClick={() => fileRefs.current[index]?.click()}
                      className="release-upload flex h-[74px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#dce5f1] bg-[#f8fafc] text-[#64748b] transition hover:border-[#5145e9] hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUploading === index ? (
                        <span className="text-[10px] font-medium">
                          Uploading...
                        </span>
                      ) : (
                        <>
                          <ImagePlus size={15} />
                          <span className="text-[10px] font-medium">
                            Upload image
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FORM FOOTER */}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#dce5f1] pt-3.5">
            <div className="min-w-0">
              {formError ? (
                <span className="flex items-center gap-1 text-[10px] text-rose-500">
                  <AlertCircle size={12} />
                  Required fields
                </span>
              ) : (
                <span className="text-[11px] text-rose-500">
                  {!module || !platform
                    ? "Pick the module"
                    : editingId !== null
                      ? "Ready to update"
                      : "Ready to publish"}
                </span>
              )}
            </div>

            <AButton
              type="button"
              onClick={handlePublishOrUpdate}
              disabled={isLoading || isUploading !== null}
              className="inline-flex h-[35px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[#64748b] px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#475569]"
            >
              {editingId !== null ? <Pencil size={14} /> : <Send size={14} />}
              {editingId !== null ? "Update note" : "Publish note"}
            </AButton>
          </div>
        </div>

        {/* RIGHT RELEASE HISTORY */}
        <div className="release-panel flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_3px_12px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#111b2b]">
          {/* TOOLBAR */}
          <div className="flex min-w-0 flex-col gap-3 border-b border-[#dce5f1] px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-[#172b4d] dark:text-slate-100">
                {filteredNotes.length} releases
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Product update history
              </p>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="release-input h-[32px] rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] text-[#172b4d] outline-none focus:border-[#5145e9] dark:border-slate-600 dark:bg-[#1e293b] dark:text-slate-100"
              >
                <option value="ALL">All platforms</option>
                <option value="WEB">Web</option>
                <option value="MOBILE">Mobile</option>
                <option value="BOTH">Both platforms</option>
              </select>

              <div className="relative min-w-0 flex-1 sm:w-[200px] sm:flex-none">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search module or text"
                  className="release-input h-[32px] w-full rounded-lg border border-[#dce5f1] bg-white pl-8 pr-3 text-[11px] text-[#172b4d] outline-none placeholder:text-slate-400 focus:border-[#5145e9] dark:border-slate-600 dark:bg-[#1e293b] dark:text-slate-100"
                />
              </div>

              {(search || platformFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="release-reset flex h-[32px] items-center gap-1 rounded-lg border border-[#dce5f1] px-2 text-[10px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* DATATABLE */}
          <div className="w-full min-w-0 p-2">
            {filteredNotes.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700">
                  <FileText size={22} />
                </div>

                <h3 className="text-[13px] font-semibold text-[#172b4d] dark:text-slate-100">
                  No release notes found
                </h3>

                <p className="mt-1 text-[11px] text-slate-400">
                  Try changing your search or platform filter.
                </p>
              </div>
            ) : (
              <div className="w-full min-w-0">
                <DataTable
                  columns={columns}
                  data={filteredNotes}
                  showTopSearch={false}
                  showExcelExport={true}
                      showColumnFilters= {true}
                  initialPageSize={10}
                  onRowClick={(row: ReleaseNote) => setSelectedId(row.id)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div
          className="release-preview fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setImagePreview(null)}
        >
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700"
          >
            <X size={18} />
          </button>

          <img
            src={imagePreview}
            alt="Full release screenshot"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* LOADER */}
      <HashloaderComponent isLoading={isLoading} />

      {/* LIGHT / DARK THEME STYLES */}
      <style jsx global>{`
        .release-page {
          color-scheme: light;
        }

        .release-page textarea {
          min-height: 60px;
        }

        .release-page input,
        .release-page select,
        .release-page textarea {
          font-family: inherit;
        }

        .release-page input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }

        .release-page ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .release-page ::-webkit-scrollbar-thumb {
          background: #d5deeb;
          border-radius: 10px;
        }

        .release-page ::-webkit-scrollbar-track {
          background: transparent;
        }

        /* DARK MODE */
        .dark .release-page {
          color-scheme: dark;
          background-color: #0b1220 !important;
          color: #e2e8f0 !important;
        }

        /* Main panels */
        .dark .release-page .release-panel {
          background-color: #111c2e !important;
          border-color: #29384d !important;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.18) !important;
        }

        /* Headings */
        .dark .release-page h1,
        .dark .release-page h2,
        .dark .release-page h3 {
          color: #f1f5f9 !important;
        }

        /* General text */
        .dark .release-page p,
        .dark .release-page span {
          color: #a8b5c8;
        }

        .dark .release-page label {
          color: #cbd5e1 !important;
        }

        /* Inputs, selects and textareas */
        .dark .release-page .release-input,
        .dark .release-page input,
        .dark .release-page select,
        .dark .release-page textarea {
          color: #e2e8f0 !important;
          background-color: #0b1628 !important;
          border-color: #33445c !important;
          color-scheme: dark;
        }

        .dark .release-page input::placeholder,
        .dark .release-page textarea::placeholder {
          color: #718096 !important;
        }

        .dark .release-page select option {
          color: #e2e8f0;
          background-color: #111c2e;
        }

        .dark .release-page .release-input:focus,
        .dark .release-page textarea:focus {
          border-color: #818cf8 !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15) !important;
        }

        /* Release cards */
        .dark .release-page .release-note-card {
          background-color: #142137 !important;
          border-color: #2b3b53 !important;
        }

        .dark .release-page .release-note-card:hover {
          border-color: #6474c8 !important;
        }

        .dark .release-page .release-note-card[class*="border-[#5145e9]"] {
          background-color: #17243b !important;
          border-color: #818cf8 !important;
        }

        /* Muted backgrounds */
        .dark .release-page [class*="bg-[#f8fafc]"],
        .dark .release-page [class*="bg-slate-100"] {
          background-color: #1b2a40 !important;
        }

        /* White backgrounds */
        .dark .release-page [class*="bg-white"] {
          background-color: #111c2e !important;
        }

        /* Borders */
        .dark .release-page [class*="border-[#dce5f1]"],
        .dark .release-page [class*="border-slate-100"],
        .dark .release-page [class*="border-slate-200"] {
          border-color: #2b3b53 !important;
        }

        /* Text colors */
        .dark .release-page [class*="text-[#10213b]"],
        .dark .release-page [class*="text-[#172b4d]"] {
          color: #f1f5f9 !important;
        }

        .dark .release-page [class*="text-[#52627c]"],
        .dark .release-page [class*="text-[#64748b]"],
        .dark .release-page [class*="text-slate-500"],
        .dark .release-page [class*="text-slate-600"] {
          color: #a8b5c8 !important;
        }

        .dark .release-page [class*="text-slate-400"] {
          color: #8796ac !important;
        }

        /* Upload box */
        .dark .release-page .release-upload {
          background-color: #0d192b !important;
          border-color: #3b4d67 !important;
          color: #a8b5c8 !important;
        }

        .dark .release-page .release-upload:hover {
          background-color: #1b2943 !important;
          border-color: #818cf8 !important;
        }

        /* Reset button */
        .dark .release-page .release-reset {
          border-color: #33445c !important;
          color: #cbd5e1 !important;
        }

        .dark .release-page .release-reset:hover {
          background-color: #1b2a40 !important;
        }

        /* Cancel button */
        .dark .release-page button[class*="bg-slate-100"] {
          background-color: #26364c !important;
          color: #dbeafe !important;
        }

        .dark .release-page button[class*="bg-slate-100"]:hover {
          background-color: #33465f !important;
        }

        /* Footer */
        .dark .release-page .release-footer {
          background-color: #0d192b !important;
          border-color: #29384d !important;
        }

        /* Empty state */
        .dark .release-page [class*="bg-slate-100"] {
          background-color: #1b2a40 !important;
        }

        /* Screenshot borders */
        .dark .release-page img {
          border-color: #33445c;
        }

        /* Platform badges retain their semantic colors */
        .dark .release-page [class*="bg-indigo-100"] {
          background-color: rgba(99, 102, 241, 0.18) !important;
          color: #a5b4fc !important;
        }

        .dark .release-page [class*="bg-purple-100"] {
          background-color: rgba(168, 85, 247, 0.18) !important;
          color: #d8b4fe !important;
        }

        .dark .release-page [class*="bg-emerald-100"] {
          background-color: rgba(16, 185, 129, 0.16) !important;
          color: #6ee7b7 !important;
        }

        /* Image preview */
        .dark .release-page .release-preview button {
          background-color: #1e293b !important;
          color: #f8fafc !important;
        }

        /* SweetAlert dark popup */
        .dark .swal2-popup {
          background-color: #172337 !important;
          color: #e2e8f0 !important;
        }

        .dark .swal2-title,
        .dark .swal2-html-container {
          color: #e2e8f0 !important;
        }

        .dark .swal2-timer-progress-bar {
          background: #818cf8 !important;
        }
      `}</style>
    </div>
  );
}
