"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FolderOpen,
  UploadCloud,
  Upload,
  X,
  Eye,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

import Swal from "sweetalert2";
import axios from "axios";
import { useDebounce } from "use-debounce";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import certificate from "@/components/atoms/CertificateUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* =========================================================
   TYPES
========================================================= */

type FileKind = "pdf" | "img";

type MasterOption = {
  value: string;
  label?: string;
  Field?: string;
  From_Field?: string;
  Table_Name?: string;
  Misc_Abbr?: string;
  [key: string]: any;
};

type StoredFile = {
  name: string;
  refType: string;
  refNo: string;
  uploadedBy: string;
  uploadedAt: string;
  kind: FileKind;

  Utd?: number | string;
  TRAN_ID?: number | string;
  SRNO?: number | string;
  Doc_Type?: string;
  SMBPath?: string;

  Keywords?: string;
  Seq_No?: number | string;

  CreatedAt?: string;
  DocumentType?: string;
  RefId?: string;

  file?: File;
};

type QueueFile = {
  file: File;
  name: string;
  size: string;
  kind: FileKind;
};

/* =========================================================
   CONSTANTS
========================================================= */

const INITIAL_FILES: StoredFile[] = [];

/* =========================================================
   ALERT
========================================================= */

function showSideAlert(message: string, type: "ok" | "warn" | "error" = "ok") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      container: "side-alert-container",
      popup: `side-alert-${type}`,
    },
  });

  Toast.fire({
    icon: type === "ok" ? "success" : type === "warn" ? "warning" : "error",
    title: message,
  });
}

/* =========================================================
   PAGE
========================================================= */

export default function DocumentManagementPage() {
  /* =======================================================
     USER
  ======================================================= */

  const user = useCurrentUser();

  /* =======================================================
     STATE
  ======================================================= */

  const [MastersOption, setMastersOption] = useState<MasterOption[]>([]);

  const [docRef, setDocRef] = useState("");
  const [refNo, setRefNo] = useState("");
  const [keywords, setKeywords] = useState("");

  const [queue, setQueue] = useState<QueueFile[]>([]);

  const [files, setFiles] = useState<StoredFile[]>(INITIAL_FILES);

  const [scope, setScope] = useState<"ref" | "all">("ref");

  const [query, setQuery] = useState("");

  const [isDragOver, setIsDragOver] = useState(false);

  const [isUploaded, setIsUploaded] = useState(false);

  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  /* =======================================================
     OLD SEARCH FUNCTIONALITY
  ======================================================= */
  const [seqNo, setSeqNo] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [filteredData, setFilteredData] = useState<any[]>([]);

  /* =======================================================
     REFS
  ======================================================= */

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* =======================================================
     LOADING
  ======================================================= */

  const [isLoading, setIsLoading] = useState({
    Reset: false,
    Show: false,
    Print: false,
    ShowQr: false,
    Excel: false,
    ExcelLocaton: false,
  });

  const KEYWORD_SEQUENCE_OPTIONS = [
    { value: "1", label: "PROFILE PHOTO" },
    { value: "2", label: "AADHAR IMAGE" },
    { value: "3", label: "PAN IMAGE" },
    { value: "4", label: "SALARY IMAGE" },
    { value: "5", label: "OTHER 1" },
    { value: "6", label: "OTHER 2" },
    { value: "7", label: "OTHER 3" },
    { value: "8", label: "OTHER 4" },
    { value: "9", label: "OTHER PDF" },
    { value: "10", label: "SEPARATION 1" },
    { value: "11", label: "SEPARATION 2" },
  ];

  const getKeywordBySeqNo = (seqNo: string | number) => {
    return (
      KEYWORD_SEQUENCE_OPTIONS.find(
        (item) => String(item.value) === String(seqNo),
      )?.label || "OTHER"
    );
  };

  /* =======================================================
     FILE ICON CONFIG
  ======================================================= */

  const getFileConfig = (kind: FileKind) => {
    if (kind === "pdf") {
      return {
        icon: <FileText size={16} strokeWidth={1.8} />,
        colorClass: "text-[#E11D48]",
        backgroundClass: "bg-[#E11D481F]",
      };
    }

    return {
      icon: <ImageIcon size={16} strokeWidth={1.8} />,
      colorClass: "text-[#0EA5E9]",
      backgroundClass: "bg-[#0EA5E91F]",
    };
  };

  /* =======================================================
     MASTER OPTIONS FOR ESELECT
  ======================================================= */
  const documentReferenceOptions = useMemo(() => {
    return MastersOption.map((item) => ({
      value: item.value,
      label: item.label || item.value,
    })).filter((item) => item.value);
  }, [MastersOption]);

  /* =======================================================
     FILTERED FILES
  ======================================================= */

  const displayedFiles = useMemo(() => {
    const search = String(query || "")
      .trim()
      .toLowerCase();

    return files.filter((file) => {
      // ============================================
      // FILTER: CURRENT REFERENCE
      // ============================================
      if (scope === "ref") {
        const currentDocRef = String(docRef || "").trim();
        const currentRefNo = String(refNo || "").trim();

        if (currentDocRef && currentRefNo) {
          const fileRefNo = String(file.RefId || file.refNo || "").trim();

          const selectedMaster = MastersOption.find(
            (item) => String(item.value || "").trim() === currentDocRef,
          );

          const normalize = (value: unknown) =>
            String(value || "")
              .trim()
              .toLowerCase();

          const currentValues = [
            currentDocRef,
            selectedMaster?.value,
            selectedMaster?.label,
            selectedMaster?.Misc_Abbr,
          ]
            .map(normalize)
            .filter(Boolean);

          const fileValues = [file.DocumentType, file.Doc_Type, file.refType]
            .map(normalize)
            .filter(Boolean);

          // Reference number must match.
          if (fileRefNo !== currentRefNo) {
            return false;
          }

          // If the document type is known on both sides,
          // require a match. Missing type data won't hide
          // an otherwise matching reference.
          if (
            currentValues.length > 0 &&
            fileValues.length > 0 &&
            !fileValues.some((value) => currentValues.includes(value))
          ) {
            return false;
          }
        }
      }

      // ============================================
      // FILTER: SEARCH
      // ============================================
      if (search) {
        const searchableText = [
          file.name,
          file.refType,
          file.refNo,
          file.RefId,
          file.uploadedBy,
          file.Keywords,
          file.DocumentType,
          file.Doc_Type,
          file.SMBPath,
        ]
          .map((value) => String(value || ""))
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [files, scope, docRef, refNo, query, MastersOption]);

  /* =======================================================
     GET MASTERS
     SAME API
  ======================================================= */
  const HandleMasters = async () => {
    try {
      console.log("===== MASTERS API START =====");
      console.log("URL:", `${process.env.NEXT_PUBLIC_URL}/DocManage/Masters`);
      console.log("Comp Code:", user?.Comp_Code);
      console.log("User Name:", user?.name);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/Masters`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log("===== MASTERS API RESPONSE =====");
      console.log("Status:", response.status);
      console.log("Data:", response.data);
      console.log("Result:", response.data?.Result);

      const result = response.data?.Result || [];

      if (result.length > 0) {
        setMastersOption(result);
      } else {
        setMastersOption([]);

        showSideAlert("No document masters found", "warn");
      }
    } catch (error: any) {
      console.error("===== MASTERS API ERROR =====");
      console.error(error);
      console.error("Response:", error?.response?.data);

      showSideAlert(
        error?.response?.data?.message || "Failed to load document masters",
        "error",
      );
    }
  };
  useEffect(() => {
    if (!user?.Comp_Code) {
      console.log("Comp_Code not available yet");
      return;
    }

    HandleMasters();
  }, [user?.Comp_Code, user?.name]);

  /* =======================================================
     BROWSE
  ======================================================= */

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /* =======================================================
     FILE HANDLING
  ======================================================= */

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const selectedFiles = Array.from(fileList);
    const validExtensions = ["png", "jpeg", "jpg", "pdf"];
    const validFiles: QueueFile[] = [];
    const invalidFiles: string[] = [];

    selectedFiles.forEach((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      if (!validExtensions.includes(extension)) {
        invalidFiles.push(file.name);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        invalidFiles.push(file.name);
        return;
      }

      const kind: FileKind = extension === "pdf" ? "pdf" : "img";

      validFiles.push({
        file,
        name: file.name,
        size:
          file.size < 1024 * 1024
            ? `${Math.max(1, Math.round(file.size / 1024))} KB`
            : `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        kind,
      });
    });

    if (invalidFiles.length > 0) {
      showSideAlert(
        "Only PDF, JPG and PNG files up to 10 MB are allowed.",
        "warn",
      );
    }

    if (validFiles.length > 0) {
      setQueue((previous) => {
        const available = Math.max(0, 20 - previous.length);
        const filesToAdd = validFiles.slice(0, available);

        if (filesToAdd.length < validFiles.length) {
          showSideAlert(
            "More than 20 documents are selected, can't proceed",
            "warn",
          );
        }

        if (filesToAdd.length > 0) {
          setIsUploaded(true);
        }

        return [...previous, ...filesToAdd];
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
    },
    [handleFiles],
  );

  /* =======================================================
     DRAG & DROP
  ======================================================= */

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragOver(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragOver(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragOver(false);

      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  /* =======================================================
     REMOVE QUEUE FILE
  ======================================================= */

  const removeFile = useCallback((index: number) => {
    setQueue((previous) => {
      const updated = previous.filter((_, i) => i !== index);

      if (updated.length === 0) {
        setIsUploaded(false);
      }

      return updated;
    });
  }, []);

  /* =======================================================
     CLEAR
  ======================================================= */

  const clearQueue = useCallback(() => {
    setQueue([]);
    setIsUploaded(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const referenceFieldLabel = useMemo(() => {
    const master = MastersOption.find(
      (item) => String(item.value) === String(docRef),
    );

    const isEmployee =
      String(master?.Table_Name || "").toUpperCase() === "EMPLOYEEMASTER" ||
      String(master?.From_Field || "").toUpperCase() === "EMPCODE" ||
      String(master?.Field || "").toUpperCase() === "EMPCODE" ||
      String(master?.Misc_Abbr || "").toUpperCase() === "EMPLOYEE";

    return isEmployee ? "Employee Code" : "Reference Number";
  }, [MastersOption, docRef]);

  /* =======================================================
     DOCUMENT TYPE CHANGE
     
     IMPORTANT:
     useCallback prevents Eselect from receiving
     a new onChange function on every render.
  ======================================================= */

  const handleDocRefChange = useCallback((name: string, value: any) => {
    setDocRef(value ?? "");
    setScope("ref");
  }, []);
  /* =======================================================
     REFERENCE NUMBER CHANGE
  ======================================================= */

  const handleRefNoChange = useCallback((name: string, value: any) => {
    setRefNo(value ?? "");
    setScope("ref");
  }, []);

  /* =======================================================
     KEYWORDS CHANGE
  ======================================================= */

  const handleKeywordsChange = useCallback((name: string, value: any) => {
    const selectedSeqNo = String(value ?? "");

    const selectedOption = KEYWORD_SEQUENCE_OPTIONS.find(
      (item) => String(item.value) === selectedSeqNo,
    );

    if (!selectedOption) {
      return;
    }

    setSeqNo(String(selectedOption.value));
    setKeywords(selectedOption.label);
  }, []);
  /* =======================================================
     GET MASTER DETAILS
  ======================================================= */

  const getSelectedMaster = useCallback(() => {
    return MastersOption.find((item) => String(item.value) === String(docRef));
  }, [MastersOption, docRef]);

  /* =======================================================
     VIEW PREVIOUS DATA
     SAME API
  ======================================================= */

  const ViewPreviousData = useCallback(
    async (vin: string, RefNum: string) => {
      const documentReference = String(vin || "").trim();
      const referenceNumber = String(RefNum || "").trim();

      if (!referenceNumber || !documentReference) {
        return;
      }

      try {
        console.log("===== VIEW PREVIOUS DATA START =====");
        console.log("Document reference:", documentReference);
        console.log("Reference number:", referenceNumber);

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/DocManage/ViewPreviousData`,
          {
            RefNum: referenceNumber,
            vin: documentReference,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          },
        );

        console.log("===== VIEW PREVIOUS DATA RESPONSE =====", response.data);

        const responseData = response.data;
        const apiResult =
          responseData?.Result ??
          responseData?.result ??
          responseData?.data ??
          [];

        // ============================================
        // NORMALIZE RESPONSE TO AN ARRAY
        // ============================================
        let result: any[] = [];

        if (Array.isArray(apiResult)) {
          result = apiResult;
        } else if (Array.isArray(apiResult?.MI_REASON)) {
          result = apiResult.MI_REASON;
        } else if (Array.isArray(apiResult?.dealer_details)) {
          result = apiResult.dealer_details;
        } else if (Array.isArray(apiResult?.data)) {
          result = apiResult.data;
        } else if (Array.isArray(responseData?.MI_REASON)) {
          result = responseData.MI_REASON;
        } else if (Array.isArray(responseData?.dealer_details)) {
          result = responseData.dealer_details;
        }

        console.log("Documents returned:", result);

        const selectedMaster = MastersOption.find(
          (item) => String(item.value || "").trim() === documentReference,
        );

        const normalize = (value: unknown) => String(value || "").trim();

        // ============================================
        // MAP BACKEND DOCUMENTS
        // ============================================
        const mappedFiles: StoredFile[] = result
          .filter((item: any) => item && typeof item === "object")
          .map((item: any) => {
            const fileName = normalize(
              item.OriginalName ??
                item.File_Name ??
                item.FileName ??
                item.filename ??
                item.name ??
                "Document",
            );

            const extension = fileName.split(".").pop()?.toLowerCase() || "";

            const rawPath =
              item.SMBPath ??
              item.path ??
              item.Path ??
              item.filePath ??
              item.FilePath ??
              "";

            const fileRefNo = normalize(
              item.RefId ??
                item.refId ??
                item.RefNum ??
                item.ReferenceNo ??
                item.refNo ??
                referenceNumber,
            );

            const docType = normalize(
              item.Doc_Type ??
                item.DocType ??
                item.DocumentType ??
                item.Misc_Abbr ??
                selectedMaster?.Misc_Abbr ??
                selectedMaster?.value ??
                documentReference,
            );

            const refType = normalize(
              item.DocReference ??
                selectedMaster?.label ??
                item.DocumentType ??
                item.DocType ??
                item.Doc_Type ??
                documentReference,
            );

            const sequence =
              item.Seq_No ??
              item.SEQ_NO ??
              item.SeqNo ??
              item.seq_no ??
              item.sequence_no ??
              item.Sequence_No ??
              item.SRNO ??
              item.SrNo ??
              item.srno ??
              "";

            const keyword =
              normalize(item.Keywords ?? item.keywords) ||
              getKeywordBySeqNo(sequence);

            const tranId =
              item.TRAN_ID ??
              item.TranId ??
              item.tran_id ??
              item.Tran_Id ??
              undefined;

            const utd = item.Utd ?? item.UTD ?? item.utd ?? tranId;

            const uploadDate =
              item.CreatedAt ?? item.Upload_Date ?? item.UploadDate ?? "";

            return {
              name: fileName,
              refType,
              refNo: fileRefNo,

              uploadedBy: normalize(
                item.UploadedBy ??
                  item.User_Name ??
                  item.UserName ??
                  item.Created_by ??
                  "",
              ),

              uploadedAt: uploadDate
                ? (() => {
                    const date = new Date(uploadDate);
                    return Number.isNaN(date.getTime())
                      ? String(uploadDate)
                      : date.toLocaleString();
                  })()
                : "",

              kind: extension === "pdf" ? "pdf" : "img",

              Utd: utd,
              TRAN_ID: tranId,
              SRNO:
                item.SRNO ?? item.SrNo ?? item.srno ?? sequence ?? undefined,

              Doc_Type: docType,
              SMBPath: normalize(rawPath),

              Seq_No: sequence,
              Keywords: keyword,

              CreatedAt: uploadDate,
              DocumentType: normalize(
                item.DocumentType ??
                  item.DocType ??
                  item.Doc_Type ??
                  selectedMaster?.value ??
                  documentReference,
              ),

              RefId: fileRefNo,
            } satisfies StoredFile;
          });

        console.log("Mapped backend files:", mappedFiles);

        // ============================================
        // MERGE WITHOUT DUPLICATES
        // Backend version wins over a temporary local
        // version of the same document.
        // ============================================
        setFiles((previousFiles) => {
          const combined = [...mappedFiles, ...previousFiles];
          const seen = new Set<string>();
          const unique: StoredFile[] = [];

          for (const file of combined) {
            const stableKey = [
              normalize(file.name).toLowerCase(),
              normalize(file.RefId || file.refNo).toLowerCase(),
              normalize(
                file.Doc_Type || file.DocumentType || file.refType,
              ).toLowerCase(),
              normalize(file.Seq_No || file.SRNO),
            ].join("|");

            if (seen.has(stableKey)) {
              continue;
            }

            seen.add(stableKey);
            unique.push(file);
          }

          return unique.sort(
            (a, b) =>
              Number(a.Seq_No || a.SRNO || 999) -
              Number(b.Seq_No || b.SRNO || 999),
          );
        });

        setScope("ref");
        setRefNo(referenceNumber);
      } catch (error: any) {
        console.error("VIEW PREVIOUS DATA ERROR:", error);
        console.error("Backend response:", error?.response?.data);

        showSideAlert(
          error?.response?.data?.message ||
            error?.response?.data?.Message ||
            "Unable to load previous documents",
          "error",
        );
      }
    },
    [user?.Comp_Code, user?.name, MastersOption],
  );

  /* =======================================================
     DEBOUNCE REFERENCE NUMBER
     SAME FUNCTIONALITY
  ======================================================= */

  const [debouncedRefNum] = useDebounce(refNo, 1000);

  // Last API request ko track karega
  const lastRequestedRef = useRef("");

  useEffect(() => {
    const documentReference = String(docRef || "").trim();
    const referenceNumber = String(debouncedRefNum || "").trim();

    if (!documentReference || !referenceNumber) {
      return;
    }

    // Same reference ke liye dobara API call nahi hogi
    const requestKey = `${documentReference}|${referenceNumber}`;

    if (lastRequestedRef.current === requestKey) {
      return;
    }

    lastRequestedRef.current = requestKey;

    setScope("ref");
    void ViewPreviousData(documentReference, referenceNumber);
  }, [debouncedRefNum, docRef, ViewPreviousData]);

  /* =======================================================
     UPLOAD
     SAME API
  ======================================================= */

  const handleUpload = async () => {
    try {
      // =========================================================
      // VALIDATION
      // =========================================================

      if (!docRef) {
        showSideAlert("Please select document reference.", "warn");
        return;
      }

      const referenceNumber = String(refNo || "").trim();

      if (!referenceNumber) {
        showSideAlert("Please enter reference number.", "warn");
        return;
      }

      if (!seqNo) {
        showSideAlert("Please select document keyword.", "warn");
        return;
      }

      if (!queue.length) {
        showSideAlert("Please select at least one file.", "warn");
        return;
      }

      const selectedMaster = MastersOption.find(
        (item) => String(item.value) === String(docRef),
      );

      if (!selectedMaster) {
        showSideAlert("Selected document reference not found.", "warn");
        return;
      }

      // =========================================================
      // SEQUENCE -> NUMERIC VALUE + KEYWORD
      // =========================================================

      const selectedSeqNo = String(seqNo).trim();
      const selectedSeqNumber = Number(selectedSeqNo);
      const selectedKeyword = getKeywordBySeqNo(selectedSeqNo);

      if (
        !Number.isInteger(selectedSeqNumber) ||
        selectedSeqNumber < 1 ||
        selectedSeqNumber > 11 ||
        !selectedKeyword ||
        selectedKeyword === "OTHER"
      ) {
        showSideAlert("Invalid document sequence selected.", "warn");
        return;
      }

      // =========================================================
      // FIND EXISTING TRANSACTION ID
      // =========================================================

      const selectedDocumentTypes = [
        selectedMaster.value,
        selectedMaster.Misc_Abbr,
        selectedMaster.label,
      ]
        .map((value) =>
          String(value || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);

      const matchingFiles = files.filter((file) => {
        const fileReference = String(file.RefId || file.refNo || "").trim();

        const fileDocumentTypes = [
          file.DocumentType,
          file.Doc_Type,
          file.refType,
        ]
          .map((value) =>
            String(value || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean);

        return (
          fileReference === referenceNumber &&
          selectedDocumentTypes.some((value) =>
            fileDocumentTypes.includes(value),
          )
        );
      });

      // Prefer an actual matching row with a valid transaction ID.
      // Do not use the employee/reference number as TRAN_ID.
      const matchingFile = matchingFiles.find((file) => {
        const rawId = file.TRAN_ID;

        if (
          rawId === undefined ||
          rawId === null ||
          String(rawId).trim() === ""
        ) {
          return false;
        }

        const id = Number(rawId);

        return Number.isSafeInteger(id) && id > 0;
      });

      const rawTranId = matchingFile?.TRAN_ID;
      const existingTranId = Number(rawTranId);

      if (
        !matchingFile ||
        !Number.isSafeInteger(existingTranId) ||
        existingTranId <= 0
      ) {
        console.error("No matching document with a valid TRAN_ID.", {
          referenceNumber,
          selectedMaster,
          matchingFiles,
          allFiles: files,
        });

        showSideAlert(
          "Valid transaction ID not found. Verify that ViewPreviousData returns the document's actual TRAN_ID.",
          "error",
        );

        return;
      }

      console.log("Selected transaction record:", matchingFile);
      console.log("Selected TRAN_ID:", existingTranId);

      setIsUploaded(true);

      // =========================================================
      // FORM DATA
      // =========================================================

      const formData = new FormData();

      // Attach files
      queue.forEach((queueFile) => {
        formData.append("files", queueFile.file);
      });

      // Numeric sequence values: 1, 2, 3...
      formData.append("Seq_No", String(selectedSeqNumber));
      formData.append("seq_no", String(selectedSeqNumber));
      formData.append("SRNO", String(selectedSeqNumber));

      // Keyword names: PROFILE PHOTO, AADHAR IMAGE, PAN IMAGE...
      formData.append("keywords", selectedKeyword);
      formData.append("Keywords", selectedKeyword);

      // Existing API data
      formData.append("refId", referenceNumber);
      formData.append("tran_id", String(existingTranId));

      formData.append(
        "user_id",
        String(user?.EMPCODE || user?.id || user?.name || ""),
      );

      formData.append("EmpCode", referenceNumber);

      formData.append("doc_type", String(selectedMaster.value || docRef));

      formData.append("Field", String(selectedMaster.Field || ""));
      formData.append("From_Field", String(selectedMaster.From_Field || ""));
      formData.append("Table_Name", String(selectedMaster.Table_Name || ""));

      formData.append(
        "Misc_Abbr",
        String(
          selectedMaster.Misc_Abbr ||
            selectedMaster.label ||
            selectedMaster.value ||
            docRef,
        ),
      );

      // =========================================================
      // DEBUG
      // =========================================================

      console.log("========== DOCUMENT UPLOAD ==========");
      console.log("docRef:", docRef);
      console.log("refNo:", referenceNumber);
      console.log("tran_id:", existingTranId);
      console.log("Seq_No:", selectedSeqNumber);
      console.log("SRNO:", selectedSeqNumber);
      console.log("Keywords:", selectedKeyword);
      console.log("selectedMaster:", selectedMaster);
      console.log("queue:", queue);

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, value.name, value.type, value.size);
        } else {
          console.log(`${key}:`, value);
        }
      }

      // =========================================================
      // SAVE API
      // =========================================================

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL_local}/DocManage/Save`,
        formData,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            // Axios sets the multipart Content-Type and boundary.
          },
        },
      );

      console.log(
        "========== DOCUMENT UPLOAD RESPONSE ==========",
        response.data,
      );

      const statusValue =
        response.data?.Status ??
        response.data?.status ??
        response.data?.success ??
        response.data?.Success;

      const isSuccess =
        statusValue === true ||
        statusValue === 1 ||
        statusValue === "1" ||
        String(statusValue || "").toLowerCase() === "true";

      if (!isSuccess) {
        throw new Error(
          response.data?.Message ||
            response.data?.message ||
            "Document upload failed.",
        );
      }

      // =========================================================
      // CREATE FRONTEND FILE RECORDS
      // =========================================================

      const uploadedAt = new Date();

      const documentTypeValue = String(docRef).trim();

      const documentTypeLabel = String(
        selectedMaster.label ||
          selectedMaster.Misc_Abbr ||
          selectedMaster.value ||
          docRef,
      ).trim();

      const miscAbbr = String(
        selectedMaster.Misc_Abbr ||
          selectedMaster.label ||
          selectedMaster.value ||
          docRef,
      ).trim();

      const uploadedFiles: StoredFile[] = queue.map((queueFile) => ({
        name: queueFile.name,
        kind: queueFile.kind,
        file: queueFile.file,

        uploadedBy: user?.name || "",
        uploadedAt: uploadedAt.toLocaleString(),
        CreatedAt: uploadedAt.toISOString(),

        refType: documentTypeLabel,
        refNo: referenceNumber,
        DocumentType: documentTypeValue,
        RefId: referenceNumber,
        Doc_Type: miscAbbr,

        // Keep sequence fields numeric.
        Seq_No: selectedSeqNumber,
        SRNO: selectedSeqNumber,

        // Keep the descriptive keyword separate.
        Keywords: selectedKeyword,

        SMBPath: "",
        Utd: undefined,
        TRAN_ID: existingTranId,
      }));

      // =========================================================
      // UPDATE FRONTEND FILE LIST
      // =========================================================

      setFiles((previousFiles) => {
        const combinedFiles = [...uploadedFiles, ...previousFiles];
        const seen = new Set<string>();
        const uniqueFiles: StoredFile[] = [];

        for (const file of combinedFiles) {
          const stableKey = [
            String(file.name || "")
              .trim()
              .toLowerCase(),
            String(file.RefId || file.refNo || "")
              .trim()
              .toLowerCase(),
            String(file.Doc_Type || file.DocumentType || file.refType || "")
              .trim()
              .toLowerCase(),
            String(file.Seq_No || file.SRNO || "").trim(),
          ].join("|");

          if (seen.has(stableKey)) {
            continue;
          }

          seen.add(stableKey);
          uniqueFiles.push(file);
        }

        return uniqueFiles.sort(
          (a, b) =>
            Number(a.Seq_No || a.SRNO || 999) -
            Number(b.Seq_No || b.SRNO || 999),
        );
      });

      // =========================================================
      // RELOAD FROM BACKEND
      // =========================================================

      await ViewPreviousData(documentTypeValue, referenceNumber);

      // =========================================================
      // RESET FORM
      // =========================================================

      setScope("ref");
      setQueue([]);
      setKeywords("");
      setSeqNo("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // =========================================================
      // SUCCESS
      // =========================================================

      await Swal.fire({
        icon: "success",
        title: "Uploaded Successfully",
        text:
          queue.length === 1
            ? `${selectedKeyword} uploaded successfully.`
            : `${queue.length} documents uploaded as ${selectedKeyword}.`,
        confirmButtonText: "OK",
      });
    } catch (error: any) {
      console.error("========== DOCUMENT UPLOAD ERROR ==========");
      console.error(error);
      console.error("Backend response:", error?.response?.data);

      const errorMessage =
        error?.response?.data?.Message ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to upload document.";

      showSideAlert(String(errorMessage), "error");
    } finally {
      setIsUploaded(false);
    }
  };

  /* =======================================================
     DELETE FILE
     SAME API
  ======================================================= */
  const handleDelete = async (item: StoredFile) => {
    try {
      const confirmed = await Swal.fire({
        icon: "info",
        title: item.name,
        text: "Do You Really Want to Delete This File?",
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        showCancelButton: true,
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/Deletedata`,
        {
          Utd: item.Utd,
          TRAN_ID: item.TRAN_ID,
          SRNO: item.SRNO,
          Doc_Type: item.Doc_Type,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log("Delete response:", response.data);

      showSideAlert("Document deleted successfully", "ok");

      await ViewPreviousData(docRef, refNo);
    } catch (error: any) {
      console.error("Error deleting document:", error);

      showSideAlert(
        error?.response?.data?.message || "Error deleting document",
        "error",
      );
    }
  };

  /* =======================================================
     VIEW FILE
     SAME BACKEND FETCH
  ======================================================= */

  const handleView = useCallback(
    (file: StoredFile) => {
      try {
        // =========================================================
        // CLEAN PREVIOUS PREVIEW URL
        // =========================================================

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl("");
        }

        // =========================================================
        // LOCAL UPLOADED FILE
        // =========================================================

        if (file.file) {
          const localUrl = URL.createObjectURL(file.file);

          setPreviewFile(file);
          setPreviewUrl(localUrl);
          setIsPreviewOpen(true);

          return;
        }

        // =========================================================
        // BACKEND FILE
        // =========================================================

        if (file.SMBPath) {
          const fileUrl = `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(
            file.SMBPath,
          )}`;

          setPreviewFile(file);
          setPreviewUrl(fileUrl);
          setIsPreviewOpen(true);

          return;
        }

        // =========================================================
        // NO FILE SOURCE
        // =========================================================

        showSideAlert("File preview path is not available.", "warn");
      } catch (error) {
        console.error("FILE PREVIEW ERROR:", error);

        showSideAlert("Unable to preview document.", "error");
      }
    },
    [previewUrl],
  );

  const closePreview = useCallback(() => {
    if (previewUrl && previewFile?.file) {
      URL.revokeObjectURL(previewUrl);
    }

    setIsPreviewOpen(false);
    setPreviewFile(null);
    setPreviewUrl("");
  }, [previewUrl, previewFile]);

  /* =======================================================
     DOWNLOAD FILE
     SAME BACKEND FETCH
  ======================================================= */

  const handleDownload = useCallback(async (file: StoredFile) => {
    let objectUrl = "";

    try {
      // 1. Locally selected/uploaded file
      if (file.file) {
        objectUrl = URL.createObjectURL(file.file);

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name || "document";
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 1500);

        showSideAlert(`Downloading ${file.name}...`);
        return;
      }

      // 2. Backend file
      if (!file.SMBPath?.trim()) {
        showSideAlert("File path is not available.", "warn");
        return;
      }

      const fileUrl = `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(
        file.SMBPath,
      )}`;

      const response = await axios.get(fileUrl, {
        responseType: "blob",
      });

      // Check if backend returned an error instead of a file.
      const contentType = String(
        response.headers["content-type"] || "",
      ).toLowerCase();

      if (
        contentType.includes("text/html") ||
        contentType.includes("application/json")
      ) {
        const errorText = await response.data.text();
        console.error("Download API returned an error:", errorText);

        showSideAlert(
          "Server returned an error instead of the document.",
          "error",
        );
        return;
      }

      if (!response.data || response.data.size === 0) {
        showSideAlert("Downloaded file is empty.", "error");
        return;
      }

      // 3. Trigger browser download without navigating away
      objectUrl = URL.createObjectURL(response.data);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name || "document";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1500);

      showSideAlert(`Downloading ${file.name}...`);
    } catch (error: any) {
      console.error("DOWNLOAD ERROR:", error);
      console.error("Backend response:", error?.response?.data);

      showSideAlert(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to download document.",
        "error",
      );
    }
  }, []);

  /* =======================================================
     OLD SEARCH API
     SAME API
  ======================================================= */

  const handleSearch = async (e) => {
    const query = e.target.value; // Get the search query
    setSearchQuery(query); // Update local state

    if (!query) {
      setFilteredData([]); // Clear results if input is empty
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/SearchingView`,
        { EmpCode: user?.EMPCODE, searchQuery: query }, // Pass the query as is
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );
      setFilteredData(response.data.Result || []); // Update filtered data
    } catch (error) {
      console.error("Error fetching search results:", error);
      setFilteredData([]); // Handle errors gracefully
    }
  };

  /* =======================================================
   SHOW ALL / CURRENT REFERENCE
   FRONTEND ONLY
======================================================= */
  const handleScopeChange = useCallback(async () => {
    const nextScope = scope === "ref" ? "all" : "ref";

    // =========================================================
    // SHOW THIS REFERENCE
    // =========================================================

    if (nextScope === "ref") {
      setScope("ref");

      if (!docRef || !refNo.trim()) {
        console.log("Reference type/number not selected.");
        return;
      }

      console.log("===== SHOW THIS REFERENCE =====");

      console.log("docRef:", docRef);

      console.log("refNo:", refNo.trim());

      await ViewPreviousData(docRef, refNo.trim());

      return;
    }

    // =========================================================
    // SHOW ALL REFERENCES
    // =========================================================

    try {
      setScope("all");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/SearchingView`,
        {
          EmpCode: user?.EMPCODE,
          searchQuery: "",
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log("========== SEARCHING VIEW ==========");

      console.log("STATUS:", response.status);

      console.log("FULL RESPONSE:", response.data);

      const result = response.data?.Result;

      // =======================================================
      // API CAN RETURN ARRAY DIRECTLY
      // =======================================================

      let documents: any[] = [];

      if (Array.isArray(result)) {
        documents = result;
      } else if (Array.isArray(result?.data)) {
        documents = result.data;
      } else if (Array.isArray(result?.MI_REASON)) {
        documents = result.MI_REASON;
      } else if (Array.isArray(result?.dealer_details)) {
        documents = result.dealer_details;
      }

      console.log("Documents returned:", documents);

      // =======================================================
      // IMPORTANT
      //
      // DO NOT setFiles([]) here.
      //
      // SearchingView can return Result: []
      // even when newly uploaded files are already
      // present in frontend state.
      // =======================================================

      if (documents.length === 0) {
        console.log("SearchingView returned Result: [].");

        console.log("Keeping existing frontend files.");

        return;
      }

      // =======================================================
      // MAP API DOCUMENTS
      // =======================================================

      const mappedFiles: StoredFile[] = documents.map((item: any) => {
        const fileName =
          item.OriginalName ||
          item.File_Name ||
          item.FileName ||
          item.filename ||
          item.name ||
          "Document";

        const extension = fileName.split(".").pop()?.toLowerCase() || "";

        return {
          name: fileName,

          refType:
            item.DocReference ||
            item.DocumentType ||
            item.DocType ||
            item.Doc_Type ||
            item.Misc_Abbr ||
            "",

          refNo: String(
            item.RefId ||
              item.refId ||
              item.RefNum ||
              item.ReferenceNo ||
              item.EMPCODE ||
              "",
          ),

          uploadedBy:
            item.UploadedBy ||
            item.User_Name ||
            item.UserName ||
            user?.name ||
            "",

          uploadedAt: item.CreatedAt
            ? new Date(item.CreatedAt).toLocaleString()
            : item.Upload_Date
              ? new Date(item.Upload_Date).toLocaleString()
              : "",

          kind: extension === "pdf" ? "pdf" : "img",

          Utd: item.Utd ?? item.UTD ?? item.utd,

          TRAN_ID: item.TRAN_ID ?? item.TranId,

          SRNO: item.SRNO ?? item.SrNo,

          Doc_Type: item.DocType ?? item.Doc_Type,

          SMBPath: item.SMBPath ?? item.path ?? item.Path ?? "",

          Seq_No:
            item.Seq_No ??
            item.SEQ_NO ??
            item.SeqNo ??
            item.seq_no ??
            item.sequence_no ??
            item.Sequence_No ??
            "",

          Keywords:
            item.Keywords ??
            item.keywords ??
            getKeywordBySeqNo(
              item.Seq_No ??
                item.SEQ_NO ??
                item.SeqNo ??
                item.seq_no ??
                item.sequence_no ??
                item.Sequence_No ??
                "",
            ),

          CreatedAt: item.CreatedAt ?? item.Upload_Date ?? "",

          DocumentType:
            item.DocReference ??
            item.DocumentType ??
            item.DocType ??
            item.Doc_Type ??
            "",

          RefId: item.RefId ?? item.refId ?? item.RefNum ?? "",
        };
      });

      console.log("Mapped all reference files:", mappedFiles);

      // =======================================================
      // MERGE API FILES + FRONTEND UPLOADED FILES
      // =======================================================

      setFiles((previousFiles) => {
        const combined = [...mappedFiles, ...previousFiles];
        const seen = new Set<string>();
        const unique: StoredFile[] = [];

        for (const file of combined) {
          const stableKey = [
            String(file.name || "")
              .trim()
              .toLowerCase(),
            String(file.RefId || file.refNo || "")
              .trim()
              .toLowerCase(),
            String(file.Doc_Type || file.DocumentType || file.refType || "")
              .trim()
              .toLowerCase(),
            String(file.Seq_No || file.SRNO || "").trim(),
          ].join("|");

          if (seen.has(stableKey)) {
            continue;
          }

          seen.add(stableKey);
          unique.push(file);
        }

        return unique.sort(
          (a, b) =>
            Number(a.Seq_No || a.SRNO || 999) -
            Number(b.Seq_No || b.SRNO || 999),
        );
      });
    } catch (error: any) {
      console.error("SEARCHING VIEW ERROR:", error);

      console.error("BACKEND RESPONSE:", error?.response?.data);

      // IMPORTANT:
      // Don't clear frontend files on API error.
      showSideAlert(
        error?.response?.data?.message ||
          error?.response?.data?.Message ||
          "Unable to load all documents",
        "error",
      );
    }
  }, [
    scope,
    docRef,
    refNo,
    user?.EMPCODE,
    user?.Comp_Code,
    user?.name,
    ViewPreviousData,
  ]);
  /* =======================================================
     SEARCH DIALOG
  ======================================================= */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  const handleDialogOpen = useCallback((isOpen: boolean) => {
    setIsDialogOpen(isOpen);

    if (isOpen) {
      setFilteredData([]);
      setSearchQuery("");
    }
  }, []);

  const escapeRegExp = useCallback(
    (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    [],
  );

  const highlightText = useCallback(
    (text: string, search: string) => {
      if (!search) {
        return text;
      }

      const escapedQuery = escapeRegExp(search);

      const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

      return parts.map((part, index) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <span key={index} className="bg-yellow-300">
            {part}
          </span>
        ) : (
          part
        ),
      );
    },
    [escapeRegExp],
  );

  /* =======================================================
     SEARCH CARD CLICK
  ======================================================= */

  const handleCardClick = useCallback(
    async (item: any) => {
      const documentType = item.DocType || "";

      const selectedRefId = item.RefId || "";

      setDocRef(documentType);

      setRefNo(selectedRefId);

      handleDialogOpen(false);

      await ViewPreviousData(documentType, selectedRefId);
    },
    [handleDialogOpen, ViewPreviousData],
  );

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <div className="min-h-screen bg-[var(--bg)] px-[14px] py-[10px] text-[var(--fg)]">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-[18px]">
        <h1 className="m-0 text-[21px] font-[650] leading-[1.2] tracking-[-0.02em] text-[var(--fg)]">
          Document management
        </h1>

        <p className="mb-0 mt-[5px] text-[12.5px] leading-[1.5] text-[var(--muted)]">
          Attach files against a reference so they stay findable later — KYC,
          letters, certificates, anything.
        </p>
      </div>

      {/* =================================================
          REFERENCE CARD
      ================================================= */}

      <div className="mb-[14px] rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-[18px] pb-[17px] pt-[15px] shadow-[var(--shadow)]">
        <div className="grid grid-cols-1 items-end gap-[13px] min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* DOC REFERENCE */}
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
            className="h-[34px] "
          />

          {/* REFERENCE NUMBER */}
          <Einput
            placeholder="Employee code or document no."
            title={`${referenceFieldLabel}`}
            redlabel="*"
            type="text"
            name="RefNum"
            value={refNo}
            handleInputChange={handleRefNoChange}
            className="h-[34px] "
          />

          {/* KEYWORDS */}
          <Eselect
            title="KEYWORDS"
            name="Keywords"
            required
            placeholder="Comma separated — helps future searches"
            option={KEYWORD_SEQUENCE_OPTIONS}
            initialValue={seqNo}
            handleInputChange={handleKeywordsChange}
            className="h-[34px] "
          />
        </div>
      </div>

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="grid grid-cols-1 items-start gap-[14px] min-[901px]:grid-cols-[minmax(0,2fr)_minmax(460px,1fr)]">
        {/* =================================================
    LEFT - UPLOAD
================================================= */}

        <div
          className="
    flex
    h-[400px]
    min-h-[400px]
    max-h-[400px]
    flex-col
    overflow-hidden
    rounded-[12px]
    border
    border-[var(--border)]
    bg-[var(--card)]
    p-[18px]
    shadow-[var(--shadow)]
  "
        >
          {/* =================================================
      DROP AREA
  ================================================= */}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowse}
            className={[
              "flex  w-full h-[240px] shrink-0 cursor-pointer flex-col items-center justify-center",
              "rounded-[14px] border border-dashed",
              "px-5 py-[22px] text-center",
              "transition-all duration-200 ease-in-out",
              "bg-[var(--field)] hover:border-[var(--brand)]",
              isDragOver
                ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                : "border-[#D9E1EC]",
            ].join(" ")}
          >
            {/* CLOUD ICON */}

            <div
              className="
        mb-[10px]
        grid
        h-[52px]
        w-[52px]
        shrink-0
        place-items-center
        rounded-[14px]
        bg-[#EEF2FF]
        text-[#4F46E5]
      "
            >
              <UploadCloud size={22} strokeWidth={1.8} />
            </div>

            {/* TITLE */}

            <div
              className="
        mb-[8px]
        text-[13px]
        font-[650]
        leading-[1.2]
        text-[var(--fg)]
      "
            >
              Upload documents
            </div>

            {/* DESCRIPTION */}

            <div
              className="
        mb-[9px]
        text-[12px]
        text-[#64748B]
      "
            >
              Drag and drop files here, or click to browse
            </div>

            {/* FILE INFO */}

            <div
              className="
        text-[11px]
        text-[#4F6F9D]
      "
            >
              PDF, JPG, PNG · up to 10 MB each ·{" "}
              <strong className="font-[650]">{queue.length}</strong>{" "}
              {queue.length === 1 ? "file" : "files"} selected
            </div>

            {/* FILE INPUT */}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              hidden
              onChange={handleFileChange}
            />
          </div>

          {/* =================================================
      QUEUE
      AVAILABLE SPACE + SCROLL
  ================================================= */}

          <div
            className="
      min-h-0
      flex-1
      overflow-y-auto
      overflow-x-hidden
      pr-[2px]
      pt-2
    "
          >
            {queue.length > 0 && (
              <div className="flex flex-col gap-[6px]">
                {queue.map((file, index) => {
                  const config = getFileConfig(file.kind);

                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className="
                flex
                min-w-0
                items-center
                gap-[9px]
                rounded-[9px]
                border
                border-[var(--border)]
                bg-[var(--sub)]
                px-[10px]
                py-[7px]
              "
                    >
                      {/* ICON */}

                      <span
                        className={[
                          "grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[7px]",
                          config.backgroundClass,
                          config.colorClass,
                        ].join(" ")}
                      >
                        {config.icon}
                      </span>

                      {/* FILE NAME */}

                      <span className="min-w-0 flex-1 text-left">
                        <span
                          className="
                    block
                    overflow-hidden
                    text-ellipsis
                    whitespace-nowrap
                    text-[12px]
                    font-[550]
                    text-[var(--fg)]
                  "
                        >
                          {file.name}
                        </span>

                        <span
                          className="
                    mt-[1px]
                    block
                    text-[10px]
                    text-[var(--muted)]
                  "
                        >
                          {file.size}
                        </span>
                      </span>

                      {/* REMOVE */}

                      <button
                        type="button"
                        title="Remove"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeFile(index);
                        }}
                        className="
                  grid
                  h-[28px]
                  w-[28px]
                  shrink-0
                  place-items-center
                  rounded-[7px]
                  border
                  border-[var(--border)]
                  bg-[var(--card)]
                  text-[var(--muted)]
                  transition-colors
                  hover:bg-[var(--hover)]
                  hover:text-[var(--fg)]
                "
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =================================================
      FOOTER
      FIXED AT BOTTOM
  ================================================= */}

          <div
            className="
      mt-[10px]
      flex
      shrink-0
      items-center
      justify-between
      gap-3
      border-t
      border-[var(--border)]
      pt-[10px]
    "
          >
            {/* MESSAGE */}

            <div
              className="
        min-w-0
        flex-1
        truncate
        text-[10.5px]
        text-[#4F6F9D]
      "
            >
              {docRef && refNo.trim()
                ? "Ready to upload against this reference."
                : "Pick a reference type and number before uploading."}
            </div>

            {/* BUTTONS */}

            <div
              className="
        flex
        shrink-0
        items-center
        gap-2
      "
            >
              {/* CLEAR */}

              <AButton
                onClick={clearQueue}
                className="
          inline-flex
          h-[38px]
          items-center
          justify-center
          rounded-[10px]
          border
          border-[#D9E1EC]
          bg-[var(--card)]
          px-[15px]
          text-[13px]
          font-[550]
          text-[#475569]
          hover:bg-[var(--hover)]
          dark:border-[#334155]
          dark:text-white
        "
              >
                Clear
              </AButton>

              {/* UPLOAD */}

              <AButton
                onClick={handleUpload}
                disabled={queue.length === 0}
                className={[
                  `
            inline-flex
            h-[38px]
            items-center
            justify-center
            gap-[7px]
            rounded-[10px]
            px-[16px]
            text-[13px]
            font-[650]
            text-white
          `,
                  queue.length > 0
                    ? "cursor-pointer bg-[#64748B] hover:bg-[#475569]"
                    : "cursor-not-allowed bg-[#94A3B8] opacity-90",
                ].join(" ")}
              >
                <Upload size={16} />
                Upload
              </AButton>
            </div>
          </div>
        </div>

        {/* =================================================
      RIGHT - PREVIOUSLY UPLOADED
      EXACT 400px HEIGHT
  ================================================= */}

        <div
          className="
      flex
      h-[400px]
      min-h-[400px]
      max-h-[400px]
      flex-col
      overflow-hidden
      rounded-[12px]
      border
      border-[var(--border)]
      bg-[var(--card)]
      shadow-[var(--shadow)]
    "
        >
          {/* HEADER - FIXED */}

          <div
            className="
        flex
        min-h-[64px]
        w-full
        shrink-0
        flex-col
        gap-3
        border-b
        border-[var(--border)]
        px-4
        py-3
        sm:flex-row
        sm:items-center
        sm:gap-[10px]
        sm:px-5
        sm:py-[13px]
      "
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h2
                className="
            m-0
            min-w-0
            truncate
            text-[14px]
            font-[600]
            text-[var(--fg)]
          "
              >
                Previously uploaded
              </h2>

              <span
                className="
            shrink-0
            whitespace-nowrap
            text-[11.5px]
            text-[var(--muted)]
          "
              >
                {displayedFiles.length} files
              </span>
            </div>

            <AButton
              onClick={handleScopeChange}
              className="
          h-[34px]
          w-full
          shrink-0
          rounded-[10px]
          border
          border-[#D9E1EC]
          bg-[var(--card)]
          px-[13px]
          text-[10.5px]
          font-[550]
          text-[#334155]
          transition-colors
          hover:bg-[var(--hover)]
          sm:w-auto
        "
            >
              {scope === "ref"
                ? "Showing this reference"
                : "Showing all references"}
            </AButton>
          </div>

          {/* =================================================
        FILE LIST
        SCROLL ONLY THIS AREA
    ================================================= */}

          <div
            className="
        min-h-0
        flex-1
        overflow-y-auto
        overflow-x-hidden
        px-5
        pb-4
        pt-3

        scrollbar-thin
        scrollbar-track-transparent
        scrollbar-thumb-[#CBD5E1]
        dark:scrollbar-thumb-[#475569]
      "
          >
            <div className="flex flex-col gap-2">
              {displayedFiles.map((file) => {
                const config = getFileConfig(file.kind);

                return (
                  <div
                    key={`${file.name}-${file.refNo}-${file.Utd || ""}`}
                    className="
                flex
                min-w-0
                items-center
                gap-[11px]
                rounded-[10px]
                border
                border-[var(--border)]
                px-3
                py-[10px]
                transition-colors
                hover:bg-[var(--hover)]
              "
                  >
                    {/* ICON */}

                    <span
                      className={[
                        "grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[11px]",
                        config.backgroundClass,
                        config.colorClass,
                      ].join(" ")}
                    >
                      {config.icon}
                    </span>

                    {/* FILE DETAILS */}

                    <span className="min-w-0 flex-1">
                      <span
                        className="
                    block
                    overflow-hidden
                    text-ellipsis
                    whitespace-nowrap
                    text-[12.5px]
                    font-[550]
                    text-[var(--fg)]
                  "
                      >
                        {file.name}
                      </span>
                      <span
                        className="
    mt-[2px]
    block
    overflow-hidden
    text-ellipsis
    whitespace-nowrap
    text-[10.5px]
    text-[var(--muted)]
  "
                      >
                        {`${
                          Number(
                            file.Seq_No ||
                              file.SRNO ||
                              KEYWORD_SEQUENCE_OPTIONS.find(
                                (item) => item.label === file.Keywords,
                              )?.value ||
                              0,
                          ) || "-"
                        } · Seq`}{" "}
                        · {file.refType} · {file.refNo} · {file.uploadedAt} ·{" "}
                        {file.uploadedBy}
                      </span>
                    </span>

                    {/* VIEW */}

                    <button
                      title="View"
                      onClick={() => handleView(file)}
                      className="
                  grid
                  h-[34px]
                  w-[34px]
                  shrink-0
                  place-items-center
                  rounded-[9px]
                  border
                  border-[#D9E1EC]
                  bg-[var(--card)]
                  text-[#64748B]
                  transition-colors
                  hover:bg-[var(--hover)]
                  hover:text-[var(--fg)]
                "
                    >
                      <Eye size={15} />
                    </button>

                    {/* DOWNLOAD */}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleDownload(file);
                      }}
                            className="
                  grid
                  h-[34px]
                  w-[34px]
                  shrink-0
                  place-items-center
                  rounded-[9px]
                  border
                  border-[#D9E1EC]
                  bg-[var(--card)]
                  text-[#64748B]
                  transition-colors
                  hover:bg-[var(--hover)]
                  hover:text-[var(--fg)]
                "
                      title="Download document"
                    >
                      <Download size={16} />
                    </button>

                    {/* DELETE */}

                    <button
                      title="Delete"
                      onClick={() => handleDelete(file)}
                      className="
                  grid
                  h-[34px]
                  w-[34px]
                  shrink-0
                  place-items-center
                  rounded-[9px]
                  border
                  border-[#D9E1EC]
                  bg-[var(--card)]
                  text-[#64748B]
                  transition-colors
                  hover:bg-[#FFF1F2]
                  hover:text-[#E11D48]
                "
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}

              {/* EMPTY */}

              {displayedFiles.length === 0 && (
                <div className="px-3 py-10 text-center">
                  <span
                    className="
                inline-grid
                h-10
                w-10
                place-items-center
                rounded-[11px]
                bg-[var(--sub)]
                text-[var(--muted)]
              "
                  >
                    <FolderOpen size={18} />
                  </span>

                  <div
                    className="
                mt-3
                text-[13px]
                font-[550]
                text-[var(--fg)]
              "
                  >
                    No files for this reference yet
                  </div>

                  <div
                    className="
                mt-1
                text-[12px]
                text-[var(--muted)]
              "
                  >
                    Upload on the left, or switch to all references.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          SEARCH DIALOG
          OLD API/FUNCTIONALITY
      ================================================= */}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
        <DialogContent className="w-full max-w-screen-md xs:h-[600px] rounded-lg bg-[var(--card)] shadow-xl">
          <DialogHeader className="border-b-2 border-gray-300 dark:border-gray-700">
            <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white">
              Details
            </DialogTitle>
          </DialogHeader>

          <DialogDescription className="space-y-4">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search in DocManage..."
              className="w-full rounded-lg bg-[var(--field)] px-4 py-2 text-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
            />

            <div className="mt-4 grid grid-cols-1 gap-2">
              {searchQuery && filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <div
                    key={index}
                    className="cursor-pointer rounded-lg bg-gray-100 p-4 shadow hover:bg-[var(--hover)] dark:bg-[var(--sub)]"
                    onClick={() => handleCardClick(item)}
                  >
                    {Object.entries(item).map(([key, value]) => {
                      let displayValue = value;

                      if (key === "CreatedAt" && value) {
                        const date = new Date(value as string);

                        displayValue = `${String(date.getDate()).padStart(
                          2,
                          "0",
                        )}-${String(date.getMonth() + 1).padStart(
                          2,
                          "0",
                        )}-${date.getFullYear()}`;
                      }

                      return (
                        <div
                          key={key}
                          className="text-sm text-gray-600 dark:text-gray-300"
                        >
                          <strong className="font-semibold">{key}:</strong>{" "}
                          {highlightText(
                            displayValue?.toString() || "",
                            searchQuery,
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : searchQuery ? (
                <p className="col-span-12 text-center text-lg text-gray-500 dark:text-gray-300">
                  No results found.
                </p>
              ) : (
                <p className="col-span-12 text-center text-lg text-gray-500 dark:text-gray-300">
                  Start typing to search...
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* =================================================
    DOCUMENT PREVIEW DIALOG
================================================= */}

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePreview();
          }
        }}
      >
        <DialogContent
          className="
      w-[95vw]
      max-w-[1000px]
      overflow-hidden
      rounded-[14px]
      border
      border-[var(--border)]
      bg-[var(--card)]
      p-0
    "
        >
          {/* =================================================
        HEADER
    ================================================= */}

          <DialogHeader
            className="
        flex
        flex-row
        items-center
        justify-between
        border-b
        border-[var(--border)]
        px-5
        py-4
      "
          >
            <div className="min-w-0">
              <DialogTitle
                className="
            truncate
            text-[14px]
            font-[650]
            text-[var(--fg)]
          "
              >
                {previewFile?.name || "Document Preview"}
              </DialogTitle>

              <DialogDescription
                className="
            mt-1
            text-[11px]
            text-[var(--muted)]
          "
              >
                {previewFile?.refType || ""}
                {previewFile?.refNo ? ` · ${previewFile.refNo}` : ""}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* =================================================
        PREVIEW AREA
    ================================================= */}

          <div
            className="
        flex
        h-[70vh]
        min-h-[400px]
        w-full
        items-center
        justify-center
        overflow-auto
        bg-[#F8FAFC]
        p-3
        dark:bg-[#0F172A]
      "
          >
            {previewFile && previewUrl ? (
              previewFile.kind === "pdf" ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.name || "PDF Preview"}
                  className="
              h-full
              w-full
              rounded-[8px]
              border
              border-[var(--border)]
              bg-white
            "
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={previewFile.name || "Image Preview"}
                  className="
              max-h-full
              max-w-full
              rounded-[8px]
              object-contain
              shadow-sm
            "
                />
              )
            ) : (
              <div
                className="
            text-[13px]
            text-[var(--muted)]
          "
              >
                Unable to preview this document.
              </div>
            )}
          </div>

          {/* =================================================
        FOOTER
    ================================================= */}

          <div
            className="
        flex
        items-center
        justify-end
        border-t
        border-[var(--border)]
        px-5
        py-3
      "
          >
            <AButton
              type="button"
              onClick={closePreview}
              className="
          h-[36px]
          rounded-[9px]
          border
          border-[#D9E1EC]
          bg-[var(--card)]
          px-4
          text-[12px]
          font-[550]
          text-[var(--fg)]
          hover:bg-[var(--hover)]
        "
            >
              Close
            </AButton>
          </div>
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isLoadingonpage} />
    </div>
  );
}
