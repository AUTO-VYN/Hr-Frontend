
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Search,
  Users,
  Camera,
  CameraOff,
  Eye,
  X,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// ==================================================
// API CONFIGURATION
// ==================================================

const BASE_URL = process.env.NEXT_PUBLIC_URL;
const IMAGE_FETCH_URL = process.env.NEXT_PUBLIC_imagepath;

const EMPLOYEE_FACE_DATA_API =
  "/SalaryLock/getEmployeesWithFaceData";

const EMPLOYEE_FACE_SEARCH_API =
  "/SalaryLock/getEmployeeFaceDataByCode";

// ==================================================
// TYPES
// ==================================================

type FaceEmbeddingType = any[] | string | null;

type EmployeeRow = {
  [key: string]: any;

  _rowId: number;

  SRNO: number;
  EMPCODE: string;

  EMPFIRSTNAME: string;
  EMPLASTNAME: string;
  FULL_NAME: string;

  FIRST_NAME: string;
  LAST_NAME: string;

  MOBILENO: string | null;
  MOBILE: string;

  FACE_EMBEDDING: FaceEmbeddingType;

  DOC_PATH: string | null;
  PHOTO: string;

  HAS_DOC: boolean;
  PHOTO_STATUS: string;
};

type SummaryType = {
  totalWithFace: number;
  totalWithDoc: number;
  totalWithoutDoc: number;
};

type TableColumn = {
  Header: string;
  accessor: string;
  minWidth: number;
  width: number;
  Cell?: ({ value, row }: any) => React.ReactNode;
};

type ApiResponse = {
  success?: boolean;
  Status?: boolean | string;
  status?: boolean | string;
  message?: string;
  Message?: string;
  data?: any;
  total?: number;
  summary?: SummaryType;
};

// ==================================================
// ALERT
// ==================================================

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

// ==================================================
// COMMON HELPERS
// ==================================================

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "" &&
      String(value).toLowerCase() !== "null" &&
      String(value).toLowerCase() !== "undefined"
    ) {
      return String(value).trim();
    }
  }

  return "";
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch Employee Face Data.";

// ==================================================
// RESPONSE ARRAY HANDLING
// ==================================================

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  const possibleKeys = [
    "data",
    "Data",
    "result",
    "Result",
    "records",
    "Records",
    "rows",
    "Rows",
    "Table",
    "recordset",
    "employees",
    "Employees",
    "EMPLOYEE",
    "Employee",
    "faceData",
    "FaceData",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  for (const key of possibleKeys) {
    const nested = response?.[key];

    if (nested && typeof nested === "object") {
      const result = getResponseArray(nested);

      if (result.length) return result;
    }
  }

  return [];
};

// ==================================================
// IMAGE URL BUILDER
// ==================================================

const buildImageUrl = (
  docPath: string | null | undefined,
): string => {
  if (!docPath) return "";

  const raw = String(docPath).trim();

  if (
    !raw ||
    raw.toLowerCase() === "null" ||
    raw.toLowerCase() === "undefined"
  ) {
    return "";
  }

  const clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  if (
    clean.startsWith("data:image/") ||
    clean.startsWith("blob:")
  ) {
    return clean;
  }

  // Base64 image without data URI prefix.
  if (
    clean.length > 100 &&
    /^[A-Za-z0-9+/=\r\n]+$/.test(clean)
  ) {
    return `data:image/jpeg;base64,${clean.replace(/\s/g, "")}`;
  }

  const imageBase = (IMAGE_FETCH_URL || "").replace(/\/+$/, "");

  if (!imageBase) {
    return `${(BASE_URL || "").replace(/\/+$/, "")}/${clean}`;
  }

  return `${imageBase}/${clean}`;
};

// ==================================================
// PHOTO FIELD HANDLING
// ==================================================

const getPhotoValue = (item: any): string => {
  const possibleFields = [
    "DOC_PATH",
    "Doc_Path",
    "doc_path",
    "PHOTO",
    "Photo",
    "photo",
    "EMP_PHOTO",
    "Emp_Photo",
    "EMPLOYEE_PHOTO",
    "EmployeePhoto",
    "IMAGE",
    "Image",
    "image",
    "PHOTO_URL",
    "PhotoUrl",
    "PHOTO_PATH",
    "PhotoPath",
    "FACE_IMAGE",
    "FaceImage",
    "FACE_DATA",
    "FaceData",
    "BASE64",
    "Base64",
    "IMAGE_DATA",
    "ImageData",
    "PROFILE_IMAGE",
    "ProfileImage",
  ];

  for (const field of possibleFields) {
    const value = item?.[field];

    if (
      typeof value === "string" &&
      value.trim() &&
      value.toLowerCase() !== "null" &&
      value.toLowerCase() !== "undefined"
    ) {
      return value.trim();
    }
  }

  return "";
};

// ==================================================
// NORMALIZE EMPLOYEE DATA
// ==================================================

const normalizeRows = (data: any[]): EmployeeRow[] => {
  return data.map((item, index) => {
    const photo = getPhotoValue(item);

    const firstName = getText(
      item.EMPFIRSTNAME,
      item.FIRST_NAME,
      item.FirstName,
      item.FIRSTNAME,
      item.FNAME,
      item.First_Name,
      item.Emp_First_Name,
      item.EMP_NAME,
      item.EmployeeName,
      item.Employee_Name,
      item.Name,
    );

    const lastName = getText(
      item.EMPLASTNAME,
      item.LAST_NAME,
      item.LastName,
      item.LASTNAME,
      item.LNAME,
      item.Last_Name,
      item.Emp_Last_Name,
    );

    const fullName = getText(
      item.FULL_NAME,
      item.Full_Name,
      item.full_name,
      `${firstName} ${lastName}`,
    );

    const empCode = getText(
      item.EMPCODE,
      item.EmpCode,
      item.EMP_CODE,
      item.Emp_Code,
      item.EmployeeCode,
      item.Employee_Code,
      item.EMPID,
      item.EmployeeId,
    );

    const mobile = getText(
      item.MOBILENO,
      item.MOBILE,
      item.Mobile,
      item.MobileNo,
      item.MOBILE_NO,
      item.Mobile_Number,
      item.PHONE,
      item.Phone,
      item.CONTACT_NO,
    );

    return {
      ...item,

      _rowId: index + 1,

      SRNO: Number(item.SRNO ?? index + 1),

      EMPCODE: empCode || "—",

      EMPFIRSTNAME: firstName,
      EMPLASTNAME: lastName,

      FULL_NAME: fullName || "—",

      FIRST_NAME: firstName || "—",
      LAST_NAME: lastName || "—",

      MOBILENO: mobile || null,
      MOBILE: mobile || "—",

      FACE_EMBEDDING:
        item.FACE_EMBEDDING ??
        item.Face_Embedding ??
        item.face_embedding ??
        null,

      DOC_PATH: photo || null,

      PHOTO: photo,

      HAS_DOC: Boolean(buildImageUrl(photo)),

      PHOTO_STATUS: buildImageUrl(photo) ? "Yes" : "No",
    };
  });
};

// ==================================================
// NORMALIZE SINGLE EMPLOYEE
// ==================================================

const normalizeEmployee = (input: any): EmployeeRow | null => {
  if (!input || typeof input !== "object") return null;

  const data = input?.original ?? input?.row?.original ?? input;

  const empCode = getText(
    data.EMPCODE,
    data.EmpCode,
    data.EMP_CODE,
    data.Emp_Code,
    data.EmployeeCode,
    data.EMPID,
  );

  if (!empCode) return null;

  return normalizeRows([data])[0] || null;
};

// ==================================================
// CSV HELPER
// ==================================================

const escapeCSV = (value: any) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

// ==================================================
// SEARCH EMPLOYEE BY CODE MODAL
// ==================================================

type SearchModalProps = {
  onClose: () => void;
  onSuccess: (employee: EmployeeRow) => void;
  apiHeaders: Record<string, any>;
};

const SearchByCodeModal: React.FC<SearchModalProps> = ({
  onClose,
  onSuccess,
  apiHeaders,
}) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!code.trim()) {
      setError("Please enter employee code.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        `${BASE_URL}${EMPLOYEE_FACE_SEARCH_API}`,
        {
          EMPCODE: code.trim(),
        },
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      if (
        responseData?.success === false ||
        responseData?.Status === false ||
        responseData?.Status === "false" ||
        responseData?.status === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Employee not found.",
        );
      }

      const rawEmployee = Array.isArray(responseData?.data)
        ? responseData.data[0]
        : responseData?.data?.data ??
          responseData?.data ??
          responseData?.Data ??
          responseData?.result ??
          responseData?.Result;

      const employee = normalizeEmployee(rawEmployee);

      if (!employee) {
        setError(
          responseData?.message ||
            responseData?.Message ||
            "Employee not found or invalid employee data.",
        );
        return;
      }

      onSuccess(employee);
      onClose();

    } catch (err: any) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5">

      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

        <div className="flex items-center justify-between border-b border-[#e8edf5] px-4 py-3.5 dark:border-slate-700">

          <div>
            <h2 className="text-[15px] font-bold text-[#152b4b] dark:text-slate-100">
              Search by EmpCode
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Find employee face details.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>

        </div>

        <div className="space-y-4 p-4">

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-[#152b4b] dark:text-slate-200">
              Employee Code
            </label>

            <input
              type="text"
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleSearch();
                }
              }}
              placeholder="Enter employee code..."
              className="h-[41px] w-full rounded-lg border border-[#dce5f1] bg-white px-3 text-[12px] text-[#152b4b] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />

            {error && (
              <p className="mt-1.5 text-[11px] text-rose-500">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2">

            <AButton
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex h-[38px] flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-[12px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Search size={14} />
              {loading ? "Searching..." : "Search"}
            </AButton>

            <AButton
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex h-[38px] items-center justify-center rounded-lg border border-[#dce5f1] bg-white px-4 text-[12px] font-semibold text-[#152b4b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Cancel
            </AButton>

          </div>

        </div>
      </div>
    </div>
  );
};

// ==================================================
// MAIN PAGE
// ==================================================

export default function EmployeeFaceDataPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // ==================================================
  // STATES
  // ==================================================

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeRow | null>(null);

  const [showSearchModal, setShowSearchModal] = useState(false);

  const [imageError, setImageError] = useState(false);

  // ==================================================
  // API HEADERS
  // ==================================================

  const apiHeaders = useMemo(
    () => ({
      accept: "application/json",
      compcode: user?.Comp_Code,
      name: user?.name,
      loc_code: user?.branch,
      "Content-Type": "application/json",
    }),
    [user?.Comp_Code, user?.name, user?.branch],
  );

  // ==================================================
  // FETCH EMPLOYEE FACE DATA
  // ==================================================

  const fetchEmployeeFaceData = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "error",
      );
      return;
    }

    try {
      setLoading(true);
      setHasSearched(false);

      const response = await axios.post<ApiResponse>(
        `${BASE_URL}${EMPLOYEE_FACE_DATA_API}`,
        {
          loc_code: user?.branch,
        },
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      console.log(
        "Employee Face Data Response:",
        responseData,
      );

      if (
        responseData?.Status === false ||
        responseData?.Status === "false" ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch Employee Face Data.",
        );
      }

      const apiData = getResponseArray(responseData);

      console.log(
        "Employee Face Data Records:",
        apiData,
      );

      const mappedRows = normalizeRows(apiData);

      setRows(mappedRows);

      setSearch("");
      setFilters({});

      // API summary
      const apiSummary = responseData?.summary ??
        responseData?.data?.summary;

      setHasSearched(true);

      if (apiSummary) {
        setSummaryFromAPI(apiSummary, mappedRows);
      } else {
        setSummaryFromAPI({}, mappedRows);
      }

      if (!mappedRows.length) {
        showSideAlert(
          "No Employee Face Data records found.",
          "info",
        );
      } else {
        showSideAlert(
          `${mappedRows.length} employee records loaded.`,
          "success",
        );
      }

    } catch (error: any) {
      console.error(
        "Employee Face Data Error:",
        error,
      );

      setRows([]);
      setSummary({
        totalWithFace: 0,
        totalWithDoc: 0,
        totalWithoutDoc: 0,
      });

      setHasSearched(true);

      Swal.fire({
        icon: "error",
        title: "Unable to load Employee Face Data",
        text: getApiError(error),
        confirmButtonColor: "#4f46e5",
      });

    } finally {
      setLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    apiHeaders,
  ]);

  // ==================================================
  // SUMMARY
  // ==================================================

  const [summary, setSummary] = useState<SummaryType>({
    totalWithFace: 0,
    totalWithDoc: 0,
    totalWithoutDoc: 0,
  });

  const setSummaryFromAPI = (
    apiSummary: any,
    mappedRows: EmployeeRow[],
  ) => {
    setSummary({
      totalWithFace: Number(
        apiSummary?.totalWithFace ??
        apiSummary?.TotalWithFace ??
        apiSummary?.total ??
        mappedRows.length,
      ),

      totalWithDoc: Number(
        apiSummary?.totalWithDoc ??
        apiSummary?.TotalWithDoc ??
        apiSummary?.withPhoto ??
        mappedRows.filter((row) => row.HAS_DOC).length,
      ),

      totalWithoutDoc: Number(
        apiSummary?.totalWithoutDoc ??
        apiSummary?.TotalWithoutDoc ??
        apiSummary?.withoutPhoto ??
        mappedRows.filter((row) => !row.HAS_DOC).length,
      ),
    });
  };

  // ==================================================
  // INITIAL API CALL
  // ==================================================

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchEmployeeFaceData();
    }
  }, [
    user?.Comp_Code,
    fetchEmployeeFaceData,
  ]);

  // ==================================================
  // SUMMARY VALUES
  // ==================================================

  const totalEmployees = summary.totalWithFace;

  const withPhoto = summary.totalWithDoc;

  const withoutPhoto = summary.totalWithoutDoc;

  // ==================================================
  // TABLE HEADERS
  // ==================================================

  const tableHeaders = useMemo(
    () => [
      "EMPCODE",
      "FIRST_NAME",
      "LAST_NAME",
      "MOBILE",
      "PHOTO_STATUS",
    ],
    [],
  );

  // ==================================================
  // FILTER HANDLING
  // ==================================================

  const handleFilterChange = (
    name: string,
    value: string,
  ) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setSearch("");
    setFilters({});
  };

  // ==================================================
  // FILTERED ROWS
  // ==================================================

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        tableHeaders.some((header) =>
          String(row[header] ?? "")
            .toLowerCase()
            .includes(query),
        ) ||
        row.FULL_NAME.toLowerCase().includes(query);

      const matchesColumns = Object.entries(filters).every(
        ([key, value]) => {
          if (!value.trim()) return true;

          return String(row[key] ?? "")
            .toLowerCase()
            .includes(value.trim().toLowerCase());
        },
      );

      return matchesSearch && matchesColumns;
    });
  }, [
    rows,
    search,
    filters,
    tableHeaders,
  ]);

  // ==================================================
  // VIEW EMPLOYEE DETAIL / PHOTO
  // ==================================================

  const handleViewPhoto = (employee: EmployeeRow) => {
    setImageError(false);
    setSelectedEmployee(employee);
  };

  const closePhotoModal = () => {
    setSelectedEmployee(null);
    setImageError(false);
  };

  // ==================================================
  // SEARCH EMPLOYEE SUCCESS
  // ==================================================

  const handleSearchSuccess = (employee: EmployeeRow) => {
    setImageError(false);
    setSelectedEmployee(employee);

    showSideAlert(
      `Found: ${employee.FULL_NAME} (${employee.EMPCODE})`,
      "success",
    );
  };

  // ==================================================
  // TABLE COLUMNS
  // ==================================================

  const columns = useMemo((): TableColumn[] => {
    return [
      {
        Header: "#",
        accessor: "_rowId",
        minWidth: 65,
        width: 70,

        Cell: ({ value }: any) => (
          <span className="font-semibold tabular-nums text-[#152b4b] dark:text-slate-200">
            {value}
          </span>
        ),
      },

      {
        Header: "EMP CODE",
        accessor: "EMPCODE",
        minWidth: 130,
        width: 160,

        Cell: ({ value }: any) => (
          <span className="font-semibold text-[#152b4b] dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "FIRST NAME",
        accessor: "FIRST_NAME",
        minWidth: 160,
        width: 200,

        Cell: ({ value }: any) => (
          <span className="font-medium text-[#152b4b] dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "LAST NAME",
        accessor: "LAST_NAME",
        minWidth: 180,
        width: 220,

        Cell: ({ value }: any) => (
          <span className="text-[#152b4b] dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "MOBILE",
        accessor: "MOBILE",
        minWidth: 150,
        width: 180,

        Cell: ({ value }: any) => (
          <span className="tabular-nums text-[#152b4b] dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "PHOTO STATUS",
        accessor: "PHOTO_STATUS",
        minWidth: 145,
        width: 165,

        Cell: ({ value }: any) => (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
              value === "Yes"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                value === "Yes"
                  ? "bg-emerald-500"
                  : "bg-rose-500"
              }`}
            />

            {value}
          </span>
        ),
      },

      {
        Header: "ACTION",
        accessor: "PHOTO",
        minWidth: 135,
        width: 155,

        Cell: ({ row }: any) => {
          const employee = row.original as EmployeeRow;

          return (
            <button
              type="button"
              onClick={() => handleViewPhoto(employee)}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <Eye size={15} />

              View details
            </button>
          );
        },
      },
    ];
  }, []);

  // ==================================================
  // EXPORT TO EXCEL / CSV
  // ==================================================

  const exportToExcel = () => {
    if (!filteredRows.length) {
      showSideAlert(
        "No records available to export.",
        "warning",
      );
      return;
    }

    const headers = [
      "EMPCODE",
      "FIRST_NAME",
      "LAST_NAME",
      "MOBILE",
      "PHOTO_STATUS",
    ];

    const csvHeaders = [
      "EMP CODE",
      "FIRST NAME",
      "LAST NAME",
      "MOBILE",
      "PHOTO STATUS",
    ];

    const csvContent = [
      csvHeaders.map(escapeCSV).join(","),

      ...filteredRows.map((row) =>
        headers
          .map((header) => escapeCSV(row[header]))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "Employee_Face_Data.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);

    showSideAlert(
      "Employee Face Data exported successfully.",
      "success",
    );
  };

  // ==================================================
  // SUMMARY CARD COMPONENT
  // ==================================================

  const summaryCards = [
    {
      title: "Total employees",
      value: totalEmployees,
      icon: Users,
      iconBg: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "With photo",
      value: withPhoto,
      icon: Camera,
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Without photo",
      value: withoutPhoto,
      icon: CameraOff,
      iconBg: "bg-rose-50 dark:bg-rose-500/10",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      title: "Showing",
      value: filteredRows.length,
      icon: Eye,
      iconBg: "bg-violet-50 dark:bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-5">

      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1800px] space-y-4">

        {/* =========================================
            PAGE HEADER
        ========================================= */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="min-w-0">
            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Employee Face Data
            </h1>

            <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400">
              View and manage employee face photographs.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">

            <AButton
              type="button"
              onClick={() => setShowSearchModal(true)}
              disabled={loading}
              className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-4 text-[12px] font-semibold text-[#152b4b] transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Search size={14} />
              Search EmpCode
            </AButton>
          </div>
        </div>

        {/* =========================================
            SUMMARY CARDS
        ========================================= */}

        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">

          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="flex min-w-0 items-center justify-between rounded-2xl border border-[#dce5f1] bg-white px-4 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="min-w-0">

                  <p className="text-[12px] font-medium text-[#64748b] dark:text-slate-400">
                    {card.title}
                  </p>

                  <p className="mt-1 text-[25px] font-bold leading-none tabular-nums text-[#152b4b] dark:text-slate-100">
                    {card.value}
                  </p>

                </div>

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
                >
                  <Icon
                    size={21}
                    className={card.iconColor}
                  />
                </div>

              </div>
            );
          })}

        </div>

        {/* =========================================
            REPORT CARD
        ========================================= */}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">

          {/* TOOLBAR */}

          <div className="flex min-w-0 flex-col gap-3 border-b border-[#e8edf5] p-3.5 dark:border-slate-700 xl:flex-row xl:items-center xl:justify-between">

            <p className="shrink-0 text-[13px] font-medium text-[#64748b] dark:text-slate-400">

              <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                {filteredRows.length}
              </span>{" "}

              of {rows.length} rows

            </p>

          
          </div>

          {/* =====================================
              COLUMN FILTER PANEL
          ===================================== */}

          {showColumnFilters && (
            <div className="border-b border-[#e8edf5] bg-[#f8fafc] p-3.5 dark:border-slate-700 dark:bg-slate-800/60">

              <div className="mb-3 flex items-center justify-between">

                <p className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                  Filter individual columns
                </p>

                <button
                  type="button"
                  onClick={() => setShowColumnFilters(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X size={15} />
                </button>

              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

                {tableHeaders.map((header) => (
                  <div key={header} className="min-w-0">

                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {header.replaceAll("_", " ")}
                    </label>

                    <input
                      type="text"
                      value={filters[header] || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          header,
                          e.target.value,
                        )
                      }
                      placeholder={`Search ${header
                        .replaceAll("_", " ")
                        .toLowerCase()}`}
                      className="h-[37px] w-full rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />

                  </div>
                ))}

              </div>
            </div>
          )}

          {/* =====================================
              TABLE
          ===================================== */}

          {hasSearched ? (

            <div className="w-full min-w-0 max-w-full overflow-hidden">

              {filteredRows.length > 0 ? (

                <DataTable
                  columns={columns}
                  data={filteredRows}
                  showTopSearch={true}
                  showExcelExport={true}
                  showColumnFilters={true}
                  resetfilters={true}
                  showPageSizeInFooter={true}
                  initialPageSize={10}
                />

              ) : (

                <div className="flex min-h-[280px] flex-col items-center justify-center px-4 text-center">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Search
                      size={22}
                      className="text-slate-400"
                    />
                  </div>

                  <h3 className="mt-3 text-[14px] font-semibold text-[#152b4b] dark:text-slate-100">
                    No records found
                  </h3>

                  <p className="mt-1 max-w-[350px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                    Try changing your search or column filters.
                  </p>

                  <AButton
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 inline-flex h-[36px] items-center justify-center rounded-lg bg-indigo-600 px-4 text-[12px] font-semibold text-white hover:bg-indigo-700"
                  >
                    Reset filters
                  </AButton>

                </div>
              )}

            </div>

          ) : (

            <div className="flex min-h-[290px] flex-col items-center justify-center px-4 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#dce5f1] bg-[#f8fafc] dark:border-slate-700 dark:bg-slate-800">
                <ImageIcon
                  size={23}
                  className="text-[#64748b] dark:text-slate-400"
                />
              </div>

              <h3 className="mt-3 text-[14px] font-semibold text-[#152b4b] dark:text-slate-100">
                Employee Face Data
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Employee face records will appear here after the data is loaded.
              </p>

              <AButton
                type="button"
                onClick={fetchEmployeeFaceData}
                disabled={loading}
                className="mt-4 inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Search size={15} />
                Load Data
              </AButton>

            </div>

          )}

        </div>
      </div>

      {/* =========================================
          VIEW EMPLOYEE DETAIL / PHOTO MODAL
      ========================================= */}

      {selectedEmployee && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5"
          onClick={closePhotoModal}
        >

          <div
            className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#e8edf5] px-4 py-3.5 dark:border-slate-700">

              <div className="min-w-0">

                <h2 className="text-[15px] font-bold text-[#152b4b] dark:text-slate-100">
                  Employee Face Detail
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Employee Code: {selectedEmployee.EMPCODE}
                </p>

              </div>

              <button
                type="button"
                onClick={closePhotoModal}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={19} />
              </button>

            </div>

            {/* EMPLOYEE DETAILS */}

            <div className="px-4 pt-4">

              <div className="flex items-center gap-3 rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-3 dark:border-slate-700 dark:bg-slate-800/60">

                <div className="min-w-0 flex-1">

                  <p className="text-[13px] font-semibold text-[#152b4b] dark:text-slate-100">
                    {selectedEmployee.FULL_NAME}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Mobile: {selectedEmployee.MOBILE}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Employee Code: {selectedEmployee.EMPCODE}
                  </p>

                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    selectedEmployee.HAS_DOC
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  }`}
                >
                  {selectedEmployee.HAS_DOC
                    ? "Photo Available"
                    : "No Photo"}
                </span>

              </div>

            </div>

            {/* PHOTO */}

            <div className="flex min-h-[320px] items-center justify-center p-5">

              {selectedEmployee.PHOTO && !imageError ? (

                <img
                  src={buildImageUrl(selectedEmployee.PHOTO)}
                  alt={`${selectedEmployee.FULL_NAME} employee photo`}
                  onError={() => setImageError(true)}
                  className="max-h-[390px] w-full rounded-xl object-contain"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />

              ) : (

                <div className="flex flex-col items-center justify-center text-center">

                  <ImageIcon
                    size={42}
                    className="text-slate-300 dark:text-slate-600"
                  />

                  <p className="mt-3 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                    {imageError
                      ? "Unable to display photo"
                      : "Employee photo not available"}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Please check the image path or image format.
                  </p>

                </div>

              )}

            </div>

            {/* IMAGE URL */}

            {selectedEmployee.PHOTO && (

              <div className="px-4 pb-3">

                <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/10">

                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
                    Image URL
                  </p>

                  <a
                    href={buildImageUrl(selectedEmployee.PHOTO)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[10px] text-blue-600 underline dark:text-blue-400"
                  >
                    {buildImageUrl(selectedEmployee.PHOTO)}
                  </a>

                </div>

              </div>

            )}

            {/* MODAL FOOTER */}

            <div className="flex justify-end border-t border-[#e8edf5] px-4 py-3 dark:border-slate-700">

              <AButton
                type="button"
                onClick={closePhotoModal}
                className="inline-flex h-[36px] items-center justify-center rounded-lg bg-indigo-600 px-5 text-[12px] font-semibold text-white transition hover:bg-indigo-700"
              >
                Close
              </AButton>

            </div>

          </div>
        </div>

      )}

      {/* =========================================
          SEARCH EMPLOYEE MODAL
      ========================================= */}

      {showSearchModal && (

        <SearchByCodeModal
          apiHeaders={apiHeaders}
          onClose={() => setShowSearchModal(false)}
          onSuccess={handleSearchSuccess}
        />

      )}

    </div>
  );
}
