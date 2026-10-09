"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";

import { Download } from "lucide-react";
import { FaFolderOpen } from "react-icons/fa";
import { LuFolderOpen } from "react-icons/lu";

import Swal from "sweetalert2";
import axios from "axios";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import FileViewer from "@/components/atoms/FileviewerBank";

import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";

import { useDebounce } from "use-debounce";

type MasterOption = {
  value: string;
  label?: string;
  Misc_Dtl1?: string;
  Misc_Hod?: number | string;
  Field?: string;
  From_Field?: string;
  Table_Name?: string;
  Misc_Abbr?: string;
  [key: string]: any;
};

type DealerOption = {
  value: string;
  label: string;
  Ledger_Name?: string;
  Bill_Date?: string;
};

type DocumentItem = {
  Utd?: number | string;
  TRAN_ID?: number | string;
  SRNO?: number | string;
  DocType?: string;
  DocTypeName?: string;
  DocumentType?: string;
  Doc_Type?: string;
  RefId?: string | number;
  Keywords?: string;
  OriginalName?: string;
  CreatedAt?: string;
  CreatedNewDate?: string;
  SMBPath?: string;
  DOC_PATH?: string;
  DOC_NAME?: string;
  UploadedBy?: string;
  UploadedByName?: string;
  uploadedBy?: string;
  name?: string;
  [key: string]: any;
};

export default function Page() {
  const user = useCurrentUser();

  // =========================================================
  // CURRENT DATE
  // =========================================================

  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();

    if (monthsBack > 0) {
      today.setMonth(today.getMonth() - monthsBack);
    }

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =========================================================
  // STATES
  // =========================================================

  const [dates, setDates] = useState({
    DATE_FROM: getCurrentDate(1),
    DATE_TO: getCurrentDate(),
  });

  const [MastersOption, setMastersOption] = useState<MasterOption[]>([]);
  const [ViewPrevious, setViewPrevious] = useState<DocumentItem[]>([]);
  const [dealerOptions, setDealerOptions] = useState<DealerOption[]>([]);

  const [tabledata, setTabledata] = useState<DocumentItem[]>([]);
  const [displayedFiles, setDisplayedFiles] = useState<any[]>([]);

  const [docRef, setDocRef] = useState("");
  const [refNum, setRefNum] = useState("");
  const [selectedDealer, setSelectedDealer] = useState("");
  const [selectedMaster, setSelectedMaster] = useState<MasterOption | null>(
    null,
  );

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<DocumentItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [tranId, setTranId] = useState<number | null>(null);

  // =========================================================
  // SIDE ALERT
  // =========================================================

  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warn" | "info" | "warning" = "info",
  ) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon:
        type === "warn" || type === "warning"
          ? "warning"
          : type === "error"
            ? "error"
            : type === "success"
              ? "success"
              : "info",
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  };

  // =========================================================
  // API HEADERS
  // =========================================================

  const getHeaders = useCallback(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name],
  );

  // =========================================================
  // MASTERS API
  // Existing API and request preserved
  // =========================================================

  const HandleMasters = useCallback(async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/Masters`,
        {},
        {
          headers: getHeaders(),
        },
      );

      const result: MasterOption[] = response.data?.Result || [];

      if (Array.isArray(result) && result.length > 0) {
        const formattedMasters = result.map((item: any) => ({
          ...item,
          value: String(item.value ?? item.Misc_Code ?? item.MISC_CODE ?? ""),
          label:
            item.label ??
            item.Misc_Name ??
            item.MISC_NAME ??
            item.Misc_Desc ??
            item.value ??
            "",
        }));

        setMastersOption(
          formattedMasters.filter((item) => Boolean(item.value)),
        );
      } else {
        setMastersOption([]);
        showSideAlert("No document masters found", "warning");
      }
    } catch (error: any) {
      console.error("Masters API error:", error);
      console.error("Response:", error?.response?.data);

      showSideAlert(
        error?.response?.data?.message || "Failed to load document masters",
        "error",
      );
    }
  }, [getHeaders]);

  useEffect(() => {
    if (user?.Comp_Code) {
      HandleMasters();
    }
  }, [user?.Comp_Code, HandleMasters]);

  // =========================================================
  // SELECTED MASTER
  // =========================================================

  const handleDocRefChange = useCallback(
    (name: string, value: any) => {
      const selectedValue = String(value ?? "");

      setDocRef(selectedValue);
      setRefNum("");
      setSelectedDealer("");
      setDealerOptions([]);
      setViewPrevious([]);

      const master = MastersOption.find(
        (item) => String(item.value) === selectedValue,
      );

      setSelectedMaster(master || null);

      setCurrentPage(1);
    },
    [MastersOption],
  );

  // =========================================================
  // DYNAMIC REFERENCE FIELD TITLE
  // =========================================================

  const referenceFieldLabel = useMemo(() => {
    const master =
      selectedMaster ||
      MastersOption.find((item) => String(item.value) === String(docRef));

    const isEmployee =
      String(master?.Table_Name || "").toUpperCase() === "EMPLOYEEMASTER" ||
      String(master?.From_Field || "").toUpperCase() === "EMPCODE" ||
      String(master?.Field || "").toUpperCase() === "EMPCODE" ||
      String(master?.Misc_Abbr || "").toUpperCase() === "EMPLOYEE";

    if (isEmployee) {
      return "Employee Code";
    }

    return master?.Misc_Dtl1 || "Reference Number";
  }, [MastersOption, docRef, selectedMaster]);

  const documentReferenceOptions = useMemo(() => {
    return MastersOption.map((item) => ({
      value: String(item.value),
      label: item.label || String(item.value),
    })).filter((item) => item.value);
  }, [MastersOption]);

  // =========================================================
  // DATE CHANGE
  // =========================================================

  const handleDateChange = (name: string, value: string | null) => {
    setDates((prevData) => ({
      ...prevData,
      [name]: value || "",
    }));
  };

  // =========================================================
  // MAP API RESPONSE TO TABLE DATA
  // =========================================================


const getDocumentReferenceName = (seqNo: any): string => {
  const documentNames: Record<number, string> = {
    1: "PROFILE PHOTO",
    2: "AADHAR IMAGE",
    3: "PAN IMAGE",
    4: "SALARY IMAGE",
    5: "OTHER 1",
    6: "OTHER 2",
    7: "OTHER 3",
    8: "OTHER 4",
    9: "OTHER PDF",
    10: "SEPARATION 1",
    11: "SEPARATION 2",
  };

  const normalizedSeqNo = Number(
    String(seqNo ?? "").trim()
  );

  return documentNames[normalizedSeqNo] || "OTHER";
};

const mapDocumentData = useCallback((data: DocumentItem[]) => {
  return (data || []).map((item: DocumentItem, index: number) => {
    // API response mein Seq_No ke possible field names
    const seqNo =
      item.Seq_No ??
      item.SeqNo ??
      item.SEQ_NO ??
      item.seq_no ??
      item.seqNo ??
      item.SEQNO;

    // Seq_No milne par document name hi DOC REFERENCE mein show hoga
    const docReference =
      seqNo !== undefined && seqNo !== null && String(seqNo).trim() !== ""
        ? getDocumentReferenceName(seqNo)
        : getDocumentReferenceName(
            item.Keywords ??
            item.KEYWORDS ??
            item.DocTypeName ??
            item.DocumentType ??
            item.DocType ??
            item.Doc_Type
          );

    const referenceId =
      item.RefId ??
      item.RefNum ??
      item.REF_ID ??
      item.ReferenceNo ??
      item.Reference_No ??
      item.Ref_No ??
      "";

    const filePath =
      item.SMBPath ??
      item.DOC_PATH ??
      item.FilePath ??
      item.FILE_PATH ??
      item.SMB_PATH ??
      "";

    const employeeName =
      item.EmployeeName ??
      item.EMPNAME ??
      item.EmpName ??
      item.Employee ??
      item.EMPLOYEE ??
      "";

    const uploadedBy =
      item.UploadedByName ??
      item.UploadedBy ??
      item.uploadedBy ??
      item.Uploaded_By ??
      "";

    const uploadedAt =
      item.CreatedNewDate ??
      item.CreatedAt ??
      item.CREATED_AT ??
      item.UploadDate ??
      "";

    const fileName =
      item.OriginalName ??
      item.DOC_NAME ??
      item.FileName ??
      item.FILE_NAME ??
      item.name ??
      "";

    return {
      ...item,

      srNo: item.SRNO ?? item.Utd ?? item.TRAN_ID ?? index + 1,

      // Correct document reference name
      refType: docReference,

      refNo: referenceId,

      Keywords:
        item.Keywords ??
        item.KEYWORDS ??
        item.Remark ??
        item.MI_REASON ??
        "",

      RefId: referenceId,

      Employee: employeeName || referenceId || "—",

      uploadedBy,
      uploadedAt,
      name: fileName,
      SMBPath: filePath,

      Seq_No: seqNo,

      TRAN_ID: item.TRAN_ID ?? item.Utd,

      // Don't overwrite original type if API supplies one
      Doc_Type: item.Doc_Type ?? item.DocType ?? docReference,
    };
  });
}, []);

  // =========================================================
  // DOCUMENT VIEW API
  // Existing endpoint, body and headers preserved
  // =========================================================

  const OutServiceView = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert("Company code is not available", "warning");
      return;
    }

    setIsClicked(true);
    setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/DocmentView`,
        {
          EmpCode: user?.EMPCODE,
          DateFrom: dates.DATE_FROM,
          DateTo: dates.DATE_TO,
        },
        {
          headers: getHeaders(),
        },
      );

      const resultData = result.data?.Result;

      if (Array.isArray(resultData)) {
        setTabledata(resultData);
        setCurrentPage(1);

        if (resultData.length === 0) {
          showSideAlert("No documents found.", "warning");
        }
      } else {
        setTabledata([]);
        setDisplayedFiles([]);
        setTotalCount(0);

        showSideAlert("No documents found.", "warning");
      }
    } catch (error: any) {
      console.error("Document View API error:", error);
      console.error("Response:", error?.response?.data);

      setTabledata([]);
      setDisplayedFiles([]);
      setTotalCount(0);

      showSideAlert(
        error?.response?.data?.message || "Unable to load documents.",
        "error",
      );
    } finally {
      setIsClicked(false);
      setIsLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.EMPCODE,
    dates.DATE_FROM,
    dates.DATE_TO,
    getHeaders,
  ]);

  // =========================================================
  // AUTO LOAD
  // =========================================================

  useEffect(() => {
    if (!user?.Comp_Code) {
      return;
    }

    OutServiceView();
  }, [user?.Comp_Code, OutServiceView]);

  // =========================================================
  // VIEW PREVIOUS FILES API
  // Existing endpoint and request properties preserved
  // =========================================================

  const ViewPreviousData = useCallback(
    async (vin: string, referenceNumber: string) => {
      if (!referenceNumber) {
        showSideAlert(`Please enter ${referenceFieldLabel}`, "info");
        return;
      }

      if (!vin) {
        showSideAlert("Please select Doc Reference", "info");
        return;
      }

      const selectedDealerObj = dealerOptions.find(
        (dealer) => dealer.value === selectedDealer,
      );

      const Ledger_Name = selectedDealerObj?.Ledger_Name || "";
      const Bill_Date = selectedDealerObj?.Bill_Date || "";

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/DocManage/ViewPreviousData`,
          {
            RefNum: referenceNumber,
            vin,
            ledger_name: Ledger_Name,
            bill_date: Bill_Date,
          },
          {
            headers: getHeaders(),
          },
        );

        setTranId(response.data?.TranId ?? null);

        const result = response.data?.Result;

        if (
          Array.isArray(result?.dealer_details) &&
          result.dealer_details.length > 0
        ) {
          const formattedDealerOptions: DealerOption[] =
            result.dealer_details.map((dealer: any) => ({
              value: String(dealer.TRAN_ID),
              label: String(dealer.dealer_details ?? ""),
              Ledger_Name: dealer.Ledger_Name,
              Bill_Date: dealer.Bill_Date,
            }));

          setDealerOptions(formattedDealerOptions);
        } else {
          setDealerOptions([]);
        }

        if (Array.isArray(result?.MI_REASON) && result.MI_REASON.length > 0) {
          setViewPrevious(result.MI_REASON);
        } else {
          setViewPrevious([]);
          showSideAlert("No Previous Files", "warning");
        }
      } catch (error: any) {
        console.error("ViewPreviousData API error:", error);
        console.error("Response:", error?.response?.data);

        setViewPrevious([]);

        showSideAlert(
          error?.response?.data?.message || "Unable to load previous files.",
          "error",
        );
      }
    },
    [dealerOptions, selectedDealer, getHeaders, referenceFieldLabel],
  );

  // =========================================================
  // DEALER CHANGE
  // =========================================================

  const handleDealerChange = useCallback(
    async (name: string, value: any) => {
      setSelectedDealer(String(value ?? ""));

      if (docRef && refNum) {
        const selected = dealerOptions.find(
          (dealer) => dealer.value === String(value ?? ""),
        );

        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/DocManage/ViewPreviousData`,
            {
              RefNum: refNum,
              vin: docRef,
              ledger_name: selected?.Ledger_Name || "",
              bill_date: selected?.Bill_Date || "",
            },
            {
              headers: getHeaders(),
            },
          );

          setTranId(response.data?.TranId ?? null);

          const reasons = response.data?.Result?.MI_REASON;

          if (Array.isArray(reasons)) {
            setViewPrevious(reasons);
          } else {
            setViewPrevious([]);
          }
        } catch (error: any) {
          console.error("Dealer selection API error:", error);

          showSideAlert(
            error?.response?.data?.message ||
              "Unable to load dealer documents.",
            "error",
          );
        }
      }
    },
    [docRef, refNum, dealerOptions, getHeaders],
  );

  // =========================================================
  // DEBOUNCED PREVIOUS FILE LOOKUP
  // =========================================================

  const [debouncedRefNum] = useDebounce(refNum, 500);

  const lastRequestedRef = useRef("");

  useEffect(() => {
    if (!docRef || !debouncedRefNum?.trim()) {
      lastRequestedRef.current = "";
      setViewPrevious([]);
      setDealerOptions([]);
      return;
    }

    const requestKey = `${docRef}::${debouncedRefNum.trim()}`;

    // Same document reference aur employee code par repeat API call nahi hogi
    if (lastRequestedRef.current === requestKey) {
      return;
    }

    lastRequestedRef.current = requestKey;

    ViewPreviousData(docRef, debouncedRefNum.trim());
  }, [docRef, debouncedRefNum]);

  // =========================================================
  // SEARCH API
  // Existing endpoint and request body preserved
  // =========================================================

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      if (!user?.Comp_Code) {
        return;
      }

      setIsSearching(true);

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/DocManage/SearchingView`,
          {
            EmpCode: user?.EMPCODE,
            searchQuery: query,
          },
          {
            headers: getHeaders(),
          },
        );

        setSearchResults(
          Array.isArray(response.data?.Result) ? response.data.Result : [],
        );
      } catch (error: any) {
        console.error("SearchingView API error:", error);

        setSearchResults([]);

        showSideAlert(
          error?.response?.data?.message || "Unable to search documents.",
          "error",
        );
      } finally {
        setIsSearching(false);
      }
    },
    [user?.Comp_Code, user?.EMPCODE, getHeaders],
  );

  // =========================================================
  // SEARCH RESULT SELECTION
  // =========================================================

  const handleCardClick = useCallback(
    async (item: DocumentItem) => {
      const documentType = String(item.DocType ?? item.Doc_Type ?? "");
      const referenceId = String(item.RefId ?? "");

      setDocRef(documentType);
      setRefNum(referenceId);
      setSearchInput("");
      setSearchResults([]);
      setIsDialogOpen(false);

      const master = MastersOption.find(
        (option) => String(option.value) === documentType,
      );

      setSelectedMaster(master || null);

      await ViewPreviousData(documentType, referenceId);
    },
    [MastersOption, ViewPreviousData],
  );

  // =========================================================
  // FILTER + PAGINATION
  // =========================================================

  useEffect(() => {
    const combinedRows = [...(tabledata || []), ...(ViewPrevious || [])];

    // Duplicate files ko avoid karein
    const uniqueRows = Array.from(
      new Map(
        combinedRows.map((item: DocumentItem, index) => {
          const uniqueKey = [
            item.Utd ?? item.TRAN_ID ?? item.SRNO ?? "",
            item.SMBPath ?? item.DOC_PATH ?? "",
            item.OriginalName ?? item.DOC_NAME ?? "",
            item.RefId ?? item.RefNum ?? "",
          ].join("|");

          return [uniqueKey === "|||" ? `row-${index}` : uniqueKey, item];
        }),
      ).values(),
    );

    let rows = uniqueRows;

    if (docRef.trim()) {
      const selectedMasterLabel =
        selectedMaster?.label ||
        MastersOption.find((item) => String(item.value) === docRef)?.label ||
        "";

      rows = rows.filter((item: DocumentItem) => {
        const type =
          item.DocTypeName ??
          item.DocType ??
          item.DocumentType ??
          item.Doc_Type ??
          "";

        return (
          String(type).toLowerCase().includes(docRef.toLowerCase()) ||
          String(type)
            .toLowerCase()
            .includes(String(selectedMasterLabel).toLowerCase())
        );
      });
    }

    if (refNum.trim()) {
      const search = refNum.trim().toLowerCase();

      rows = rows.filter((item: DocumentItem) =>
        String(item.RefId ?? "")
          .toLowerCase()
          .includes(search),
      );
    }

    if (searchInput.trim()) {
      const search = searchInput.trim().toLowerCase();

      rows = rows.filter((item: DocumentItem) => {
        const values = [
          item.Utd,
          item.DocTypeName,
          item.DocType,
          item.DocumentType,
          item.RefId,
          item.Keywords,
          item.UploadedByName,
          item.UploadedBy,
          item.CreatedNewDate,
          item.CreatedAt,
          item.OriginalName,
          item.DOC_NAME,
          item.SMBPath,
        ];

        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );
      });
    }

    const mappedRows = mapDocumentData(rows);

    setTotalCount(mappedRows.length);

    const size = pageSize === -1 ? mappedRows.length || 1 : pageSize;

    const start = (currentPage - 1) * size;
    const end = start + size;

    const paginatedRows =
      pageSize === -1 ? mappedRows : mappedRows.slice(start, end);

    setDisplayedFiles(paginatedRows);
  }, [
    tabledata,
    docRef,
    ViewPrevious,
    refNum,
    searchInput,
    currentPage,
    pageSize,
    mapDocumentData,
    selectedMaster,
    MastersOption,
  ]);

  // =========================================================
  // RESET FILTERS
  // =========================================================

  const handleReset = () => {
    setDocRef("");
    setRefNum("");
    setSelectedMaster(null);
    setSelectedDealer("");
    setDealerOptions([]);
    setViewPrevious([]);
    setSearchInput("");
    setSearchResults([]);
    setCurrentPage(1);
  };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const handleExport = () => {
    try {
      const rows = displayedFiles.map((file, index) => ({
        "SR NO":
          (currentPage - 1) *
            (pageSize === -1 ? displayedFiles.length : pageSize) +
          index +
          1,

        "DOC REFERENCE": file.refType || "",
        "REFERENCE ID": file.refNo || "",
        KEYWORD: file.Keywords || "",
        EMPLOYEE: file.RefId || "",
        "UPLOADED BY": file.uploadedBy || "",
        "CREATED AT": file.uploadedAt || "",
        FILE: file.name || "",
      }));

      if (!rows.length) {
        showSideAlert("No documents available to export.", "warning");
        return;
      }

      const headers = Object.keys(rows[0]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];

              return `"${String(value ?? "").replace(/"/g, '""')}"`;
            })
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "Document_View.csv";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      showSideAlert("Export failed.", "error");
    }
  };

  // =========================================================
  // TABLE COLUMNS
  // =========================================================

  const columns = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "srNo",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value ?? "—"}
          </span>
        ),
      },

      {
        Header: "DOC REFERENCE",
        accessor: "refType",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "REFERENCE ID",
        accessor: "refNo",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "KEYWORD",
        accessor: "Keywords",

        Cell: ({ value }: any) => (
          <span className="max-w-[180px] truncate text-[13px] text-slate-600 dark:text-slate-300 sm:max-w-[250px] sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "EMPLOYEE",
        accessor: "Employee",
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

    

      {
        Header: "CREATED AT",
        accessor: "uploadedAt",

        Cell: ({ value }: any) => {
          if (!value) {
            return "—";
          }

          const dateObj = new Date(value);

          if (isNaN(dateObj.getTime())) {
            return "—";
          }

          const day = dateObj.getDate();

          const month = dateObj.toLocaleString("default", {
            month: "long",
          });

          const year = dateObj.getFullYear();

          return (
            <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
              {`${day} ${month} ${year}`}
            </span>
          );
        },
      },

      {
        Header: "FILE",
        accessor: "name",

        Cell: ({ row }: any) => {
          const SMBPath = row.original?.SMBPath;

          return SMBPath ? (
            <div className="flex min-w-[70px] items-center justify-center">
              <FileViewer
                fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${SMBPath}`}
              />
            </div>
          ) : (
            <span>—</span>
          );
        },
      },
    ],
    [],
  );

  // =========================================================
  // SERVER PAGINATION OBJECT
  // =========================================================

  const totalPages = useMemo(() => {
    const size = pageSize === -1 ? totalCount || 1 : pageSize;

    return Math.max(1, Math.ceil((totalCount || 0) / size));
  }, [totalCount, pageSize]);

  const serverPagination = useMemo(
    () => ({
      currentPage,
      pageSize,
      totalPages,
      totalRecords: totalCount,
    }),
    [currentPage, pageSize, totalPages, totalCount],
  );

  // =========================================================
  // UI
  // Existing Document View layout and styling preserved
  // =========================================================

  return (
    <div
      className="
        min-h-screen
        bg-white dark:bg-gray-900 text-slate-800 dark:text-slate-100
        w-full
        overflow-x-hidden
        bg-[var(--bg)]
        px-[8px]
        py-[10px]
        text-[var(--fg)]
        sm:px-[12px]
        sm:py-[12px]
        lg:px-[16px]
      "
    >
      {/* PAGE HEADER */}

      <div
        className="
          mb-[18px]
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div className="min-w-0">
          <h1
            className="
              m-0
              text-[19px]
              font-[650]
              leading-[1.2]
              tracking-[-0.02em]
              text-[var(--fg)]
              sm:text-[21px]
            "
          >
            Document view
          </h1>

          <p
            className="
              mb-0
              mt-[5px]
              max-w-[700px]
              text-[12px]
              leading-[1.5]
              text-[var(--muted)]
              sm:text-[12.5px]
            "
          >
            Every file uploaded against an employee or reference, searchable by
            keyword.
          </p>
        </div>

        <div
          className="
            flex
            w-full
            flex-col
            gap-2
            sm:w-auto
            sm:flex-row
            sm:items-center
          "
        >
          <AButton
            type="button"
            onClick={handleReset}
            className="
              h-[42px]
              w-full
              rounded-[11px]
              border
              border-[#D9E1EC]
              bg-[var(--card)]
              px-[16px]
              text-[13px]
              font-[550]
              text-[#334155]
              transition-colors
              hover:bg-[var(--hover)]
              sm:w-auto
              dark:text-white
              dark:border-[#334155]
            "
          >
            Reset filters
          </AButton>

          <AButton
            type="button"
            onClick={handleExport}
            className="
              inline-flex
              h-[42px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-[11px]
              bg-[#4F46E5]
              px-[18px]
              text-[13px]
              font-[650]
              text-white
              transition-colors
              hover:bg-[#4338CA]
              sm:w-auto
            "
          >
            <Download size={16} />
            <span className="whitespace-nowrap">Export to Excel</span>
          </AButton>
        </div>
      </div>

      {/* FILTER CARD */}

      <div
        className="
          mb-[18px]
          w-full
          rounded-[14px]
          border
          border-[var(--border)]
          bg-[var(--card)]
          px-[14px]
          pb-[19px]
          pt-[18px]
          shadow-[var(--shadow)]
          sm:px-[18px]
          lg:px-[22px]
        "
      >
        <div
          className="
            grid
            grid-cols-1
            items-end
            gap-[14px]
            sm:grid-cols-2
            lg:grid-cols-4
            xl:grid-cols-[210px_210px_minmax(220px,1.2fr)_minmax(220px,1.2fr)_96px]
          "
        >
          {/* DOC REFERENCE */}

          <div className="min-w-0">
            <Eselect
              title="DOC REFERENCE"
              name="Doc reference"
              redlabel="*"
              required
              ShortName
              placeholder="Select a reference type"
              option={documentReferenceOptions}
              initialValue={docRef}
              handleInputChange={handleDocRefChange}
              className="h-[34px]"
            />
          </div>

          {/* DYNAMIC REFERENCE FIELD */}

          <div className="min-w-0">
            <Einput
              className="h-[34px]"
              title={referenceFieldLabel}
              name="ReferenceNumber"
              redlabel="*"
              value={refNum}
              handleInputChange={(name: string, value: any) => {
                setRefNum(value || "");
                setCurrentPage(1);
              }}
            />
          </div>

          {/* DEALER DETAILS - ONLY WHEN MISC_HOD IS 2 */}

          {selectedMaster?.Misc_Hod == 2 && (
            <div className="min-w-0">
              <Eselect
                title="Dealer Details"
                name="dealer_details"
                option={dealerOptions}
                initialValue={selectedDealer}
                handleInputChange={handleDealerChange}
                className="h-[34px]"
              />
            </div>
          )}

          {/* SHOW */}

          <div
            className="
              flex
              w-full
              sm:col-span-2
              lg:col-span-2
              xl:col-span-1
            "
          >
            <AButton
              type="button"
              onClick={async () => {
                await OutServiceView();

                if (docRef && refNum) {
                  await ViewPreviousData(docRef, refNum);
                }
              }}
              disabled={isClicked}
              className="
                w-full
                xl:w-auto
                text-xl
                h-[34px]
              "
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* DOCUMENT TABLE CARD */}

      <div
        className="
          w-full
          overflow-hidden
          rounded-[14px]
          border
          border-[var(--border)]
          bg-[var(--card)]
          shadow-[var(--shadow)]
        "
      >
        {/* TABLE HEADER */}

        <div
          className="
            flex
            min-h-[68px]
            flex-col
            gap-3
            border-b
            border-[var(--border)]
            px-[14px]
            py-[14px]
            sm:flex-row
            sm:items-center
            sm:px-[18px]
            lg:px-[22px]
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-3
            "
          >
            <h2
              className="
                m-0
                whitespace-nowrap
                text-[14px]
                font-[650]
                text-[var(--fg)]
                sm:text-[15px]
              "
            >
              Uploaded documents
            </h2>

            <span
              className="
                whitespace-nowrap
                text-[11px]
                text-[var(--muted)]
                sm:text-[12px]
              "
            >
              {totalCount > 0 ? `${totalCount} records` : ""}
            </span>
          </div>

          <div className="hidden flex-1 sm:block" />

          {/* ROW COUNT */}

          <div
            className="
              flex
              w-full
              items-center
              justify-between
              gap-2
              sm:w-auto
              sm:justify-end
            "
          >
            <span className="text-[12px] text-[#64748B]">Rows</span>

            <select
              className="
                h-[38px]
                min-w-[80px]
                rounded-[10px]
                border
                border-[#D9E1EC]
                bg-[var(--card)]
                px-[12px]
                text-[12px]
                text-[var(--fg)]
                outline-none
              "
              value={String(pageSize)}
              onChange={(e) => {
                const size = Number(e.target.value);

                setPageSize(size);
                setCurrentPage(1);
              }}
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="-1">All</option>
            </select>
          </div>
        </div>

        {/* SERVICE TABLE */}

        <div
          className="
            w-full
            overflow-hidden
            border
            border-slate-200/90
            bg-white
            shadow-2xs
            dark:border-slate-800
            dark:bg-[#0B1220]
          "
        >
          <div className="w-full">
            <ServiceTablePagination
              title=""
              columns={columns}
              data={displayedFiles}
              height={580}
              serverMode={true}
              serverPagination={serverPagination}
              showPageSizeInFooter={true}
              showTopSearch={true}
              searchValue={searchInput}
              onSearchChange={(val: string) => {
                setSearchInput(val);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search by file, keyword or reference..."
              onServerPageChange={(page: number) => {
                setCurrentPage(page);
              }}
              onServerPageSizeChange={(size: number) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* SEARCH DIALOG */}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);

          if (!open) {
            setSearchResults([]);
            setSearchInput("");
          }
        }}
      >
        <DialogContent
          className="
            w-full
            max-w-screen-md
            overflow-y-auto
            p-0
            overflow-hidden
            bg-white
            dark:bg-black
            max-h-[90vh]
            [&_button.absolute_svg]:w-8
            [&_button.absolute_svg]:font-bold
            [&_button.absolute_svg]:h-6
            [&_button_svg]:text-header
            [&_button_svg]:dark:text-white
            border
            dark:border-borderColor-dark
          "
        >
          <div className="flex items-center justify-between border-b border-borderColor bg-[#F3F8FC] px-6 py-3 dark:border-borderColor-dark dark:bg-black">
            <h2 className="text-xl font-bold text-[#1f3b73] dark:text-white">
              Search Documents
            </h2>
          </div>

          <div className="max-h-[75vh] overflow-y-auto bg-white px-5 py-4 dark:bg-black">
            <DialogDescription>
              <div className="mb-4">
                <label className="mb-1 flex text-xs font-bold text-header dark:text-white">
                  Search
                </label>

                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    const query = e.target.value;

                    setSearchInput(query);
                    handleSearch(query);
                  }}
                  placeholder="Search in DocManage..."
                  className="
                    flex
                    h-10
                    w-full
                    rounded-md
                    border
                    border-borderColor
                    bg-white
                    px-4
                    py-2
                    text-sm
                    text-header
                    shadow-sm
                    outline-none
                    dark:border-borderColor-dark
                    dark:bg-input
                    dark:text-white
                  "
                />
              </div>

              {isSearching && (
                <div className="py-4 text-center text-sm text-slate-500">
                  Searching documents...
                </div>
              )}

              <div className="mt-4 grid max-h-[500px] grid-cols-1 gap-3 overflow-y-auto">
                {searchInput && searchResults.length > 0 ? (
                  searchResults.map((item, index) => (
                    <button
                      key={item.Utd ?? item.TRAN_ID ?? index}
                      type="button"
                      onClick={() => handleCardClick(item)}
                      className="
                        rounded-lg
                        border
                        border-borderColor
                        bg-gray-50
                        p-4
                        text-left
                        shadow-sm
                        transition-colors
                        hover:bg-gray-100
                        dark:border-borderColor-dark
                        dark:bg-gray-800
                        dark:hover:bg-gray-700
                      "
                    >
                      {Object.entries(item).map(([key, value]) => (
                        <div
                          key={key}
                          className="mb-1 break-words text-sm text-header dark:text-white"
                        >
                          <strong>{key}:</strong> {String(value ?? "")}
                        </div>
                      ))}
                    </button>
                  ))
                ) : searchInput && !isSearching ? (
                  <div className="col-span-12 py-10 text-center text-lg text-header opacity-70 dark:text-white">
                    No results found.
                  </div>
                ) : !searchInput ? (
                  <div className="col-span-12 py-10 text-center text-lg text-header opacity-70 dark:text-white">
                    Start typing to search...
                  </div>
                ) : null}
              </div>
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>

      {/* LOADER */}

      <HashloaderComponent isLoading={isLoading || isClicked} />
    </div>
  );
}
