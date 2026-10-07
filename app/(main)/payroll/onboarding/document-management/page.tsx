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

  /* API DATA */
  Utd?: number | string;
  TRAN_ID?: number | string;
  SRNO?: number | string;
  Doc_Type?: string;
  SMBPath?: string;
  Keywords?: string;
  CreatedAt?: string;
  DocumentType?: string;
  RefId?: string;
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

  /* =======================================================
     OLD SEARCH FUNCTIONALITY
  ======================================================= */

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
    const search = query.trim().toLowerCase();

    return files.filter((file) => {
      if (scope === "ref" && docRef && refNo.trim()) {
        if (file.refType !== docRef || file.refNo !== refNo.trim()) {
          return false;
        }
      }

      if (
        search &&
        !`${file.name} ${file.refType} ${file.refNo} ${file.uploadedBy} ${file.Keywords || ""}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }

      return true;
    });
  }, [files, scope, docRef, refNo, query]);

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

        showSideAlert("No document masters found", "warning");
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

    const validExtensions = ["png", "jpeg", "jpg", "pdf", "xls", "xlsx"];

    if (queue.length + selectedFiles.length > 20) {
      showSideAlert(
        "More than 20 documents are selected, can't proceed",
        "warn",
      );
      return;
    }

    const validFiles: QueueFile[] = [];
    const invalidFiles: string[] = [];

    selectedFiles.forEach((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      if (!validExtensions.includes(extension)) {
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
      setQueue((previous) => [...previous, ...validFiles]);

      setIsUploaded(true);
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

  /* =======================================================
     DOCUMENT TYPE CHANGE
     
     IMPORTANT:
     useCallback prevents Eselect from receiving
     a new onChange function on every render.
  ======================================================= */

  const handleDocRefChange = useCallback((name: string, value: any) => {
    setDocRef(value ?? "");
  }, []);
  /* =======================================================
     REFERENCE NUMBER CHANGE
  ======================================================= */

  const handleRefNoChange = useCallback((name: string, value: any) => {
    setRefNo(value ?? "");
  }, []);

  /* =======================================================
     KEYWORDS CHANGE
  ======================================================= */

  const handleKeywordsChange = useCallback((name: string, value: any) => {
    setKeywords(value ?? "");
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
      if (!RefNum) {
        showSideAlert("Please select Reference No.", "warn");
        return;
      }

      if (!vin) {
        showSideAlert("Please select Doc Reference", "warn");
        return;
      }

      try {
        console.log("===== VIEW PREVIOUS DATA START =====");
        console.log("Doc Type:", vin);
        console.log("Reference:", RefNum);

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/DocManage/ViewPreviousData`,
          {
            RefNum: RefNum,
            vin: vin,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          },
        );

        console.log("===== VIEW PREVIOUS DATA RESPONSE =====");
        console.log("Status:", response.status);
        console.log("Data:", response.data);

        /*
         * Backend response:
         *
         * Result: {
         *   MI_REASON: [],
         *   dealer_details: []
         * }
         */

        const result =
          response.data?.Result?.MI_REASON || response.data?.Result || [];

        if (Array.isArray(result) && result.length > 0) {
          const selectedMaster = MastersOption.find(
            (item) => String(item.value) === String(vin),
          );

          const mappedFiles: StoredFile[] = result.map((item: any) => {
            const extension = item.OriginalName?.split(".")
              .pop()
              ?.toLowerCase();

            return {
              name: item.OriginalName || "Document",

              refType: selectedMaster?.label || item.DocumentType || vin,

              refNo: String(item.RefId || RefNum),

              uploadedBy: item.UploadedBy || user?.name || "",

              uploadedAt: item.CreatedAt
                ? new Date(item.CreatedAt).toLocaleString()
                : "",

              kind: extension === "pdf" ? "pdf" : "img",

              Utd: item.Utd ?? item.UTD,

              TRAN_ID: item.TRAN_ID,

              SRNO: item.SRNO,

              Doc_Type: item.Doc_Type,

              SMBPath: item.SMBPath,

              Keywords: item.Keywords,

              CreatedAt: item.CreatedAt,

              DocumentType: item.DocumentType,

              RefId: item.RefId || RefNum,
            };
          });

          setFiles(mappedFiles);

          console.log("Mapped previous files:", mappedFiles);
        } else {
          setFiles([]);

          console.log("No previous documents found");
        }
      } catch (error: any) {
        console.error("Error in getting previous document data:", error);

        console.error("Backend response:", error?.response?.data);

        /*
         * Don't throw again.
         * Throwing here causes the UI flow to break.
         */

        setFiles([]);

        showSideAlert(
          error?.response?.data?.message || "Unable to load previous documents",
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

  const [debouncedRefNum] = useDebounce(refNo, 500);

  useEffect(() => {
    if (debouncedRefNum && refNo && docRef) {
      ViewPreviousData(docRef, refNo);
    }
  }, [debouncedRefNum, refNo, docRef, ViewPreviousData]);

  /* =======================================================
     UPLOAD
     SAME API
  ======================================================= */

  const handleUpload = async () => {
    try {
      setIsLoading((prev) => ({
        ...prev,
        Show: true,
      }));

      if (!docRef) {
        showSideAlert("Please select the Document Type", "error");
        return;
      }

      if (!refNo.trim()) {
        showSideAlert("Please select the Reference Number", "error");
        return;
      }

      if (queue.length === 0) {
        showSideAlert("Please select document to upload", "error");
        return;
      }

      const selectedMaster = MastersOption.find(
        (item) => String(item.value) === String(docRef),
      );

      if (!selectedMaster) {
        showSideAlert("Document master not found", "error");
        return;
      }

      console.log("===== DOCUMENT SAVE START =====");

      console.log("Doc Reference:", docRef);

      console.log("Reference Number:", refNo);

      console.log("Selected Master:", selectedMaster);

      console.log("Queue Files:", queue);

      const formData = new FormData();

      /*
       * IMPORTANT:
       * Upload selected files from queue,
       * NOT from files.
       */
      queue.forEach((queueFile) => {
        formData.append("files", queueFile.file);

        formData.append("keywords", keywords || "");
      });

      /*
       * Same metadata as old working page
       */
      formData.append("refId", refNo.trim());

      formData.append("user_id", String(user?.id || ""));

      formData.append("doc_type", String(docRef));

      formData.append("EmpCode", String(user?.EMPCODE || ""));

      formData.append("Field", String(selectedMaster.Field || ""));

      formData.append("From_Field", String(selectedMaster.From_Field || ""));

      formData.append("Table_Name", String(selectedMaster.Table_Name || ""));

      formData.append("Misc_Abbr", String(selectedMaster.Misc_Abbr || ""));

      console.log("===== DOCUMENT SAVE FORM DATA =====");

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(key, value.name, value.size);
        } else {
          console.log(key, value);
        }
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/Save`,
        formData,
        {
          headers: {
            /*
             * Don't manually set boundary.
             * Axios/browser will create it correctly.
             */
            compcode: user?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        },
      );

      console.log("===== DOCUMENT SAVE RESPONSE =====");

      console.log("Status:", response.status);

      console.log("Data:", response.data);

      await Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Document Uploaded successfully.",
        timer: 1800,
        showConfirmButton: false,
      });

      /*
       * Refresh previous documents
       */
      await ViewPreviousData(docRef, refNo.trim());

      /*
       * Clear upload queue
       */
      setQueue([]);

      setIsUploaded(false);

      setKeywords("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("===== DOCUMENT SAVE ERROR =====");

      console.error(error);

      console.error("Backend response:", error?.response?.data);

      showSideAlert(
        error?.response?.data?.message || "Error uploading files",
        "error",
      );
    } finally {
      setIsLoading((prev) => ({
        ...prev,
        Show: false,
      }));
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

  const handleView = useCallback((file: StoredFile) => {
    if (!file.SMBPath) {
      showSideAlert("File path not available.", "warn");
      return;
    }

    const fileUrl = `https://erp.autovyn.com/backend/fetch?filePath=${file.SMBPath}`;

    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }, []);

  /* =======================================================
     DOWNLOAD FILE
     SAME BACKEND FETCH
  ======================================================= */

  const handleDownload = useCallback((file: StoredFile) => {
    if (!file.SMBPath) {
      showSideAlert("File path not available.", "warn");
      return;
    }

    const fileUrl = `https://erp.autovyn.com/backend/fetch?filePath=${file.SMBPath}`;

    const link = document.createElement("a");

    link.href = fileUrl;

    link.download = file.name || "document";

    link.target = "_blank";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    showSideAlert(`Downloading ${file.name}...`);
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
     SEARCH DIALOG
  ======================================================= */

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
          />

          {/* REFERENCE NUMBER */}
          <Einput
            title="REFERENCE NUMBER"
            redlabel="*"
            type="text"
            name="RefNum"
            value={refNo}
            handleInputChange={handleRefNoChange}
          />

          {/* KEYWORDS */}

          <Einput
            title="KEYWORDS"
            type="text"
            name="Keywords"
            value={keywords}
            handleInputChange={handleKeywordsChange}
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

        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-[22px] shadow-[var(--shadow)]">
          {/* DROP AREA */}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowse}
            className={[
              "flex h-[200px] cursor-pointer flex-col items-center justify-center",
              "rounded-[14px] border border-dashed hover:border-[var(--brand)]",
              "px-5 py-[30px] text-center",
              "transition-all duration-200 ease-in-out",
              "bg-[var(--field)]",
              isDragOver
                ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                : "border-[#D9E1EC]",
            ].join(" ")}
          >
            {/* CLOUD ICON */}

            <div className="mb-[14px] grid h-[60px] w-[60px] place-items-center rounded-[16px] bg-[#EEF2FF] text-[#4F46E5]">
              <UploadCloud size={24} strokeWidth={1.8} />
            </div>

            {/* TITLE */}

            <div className="mb-[13px] text-[13px] font-[650] leading-[1.2] text-[var(--fg)]">
              Upload documents
            </div>

            {/* DESCRIPTION */}

            <div className="mb-[14px] text-[13px] text-[#64748B]">
              Drag and drop files here, or click to browse
            </div>

            {/* FILE INFO */}

            <div className="text-[12px] text-[#4F6F9D]">
              PDF, JPG, PNG · up to 10 MB each ·{" "}
              <strong className="font-[650]">{queue.length}</strong>{" "}
              {queue.length === 1 ? "file" : "files"} selected for the reference
            </div>

            {/* FILE INPUT */}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              hidden
              onChange={handleFileChange}
            />
          </div>

          {/* =================================================
              QUEUE
          ================================================= */}

          {queue.length > 0 && (
            <div className="mt-3 flex flex-col gap-[7px]">
              {queue.map((file, index) => {
                const config = getFileConfig(file.kind);

                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-[10px] rounded-[9px] border border-[var(--border)] bg-[var(--sub)] px-[11px] py-[9px]"
                  >
                    {/* ICON */}

                    <span
                      className={[
                        "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px]",
                        config.backgroundClass,
                        config.colorClass,
                      ].join(" ")}
                    >
                      {config.icon}
                    </span>

                    {/* FILE NAME */}

                    <span className="min-w-0 flex-1 text-left">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-[550] text-[var(--fg)]">
                        {file.name}
                      </span>

                      <span className="mt-[2px] block text-[11px] text-[var(--muted)]">
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
                      className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[7px] border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="mt-5 flex flex-col items-start justify-between gap-3 min-[641px]:flex-row min-[641px]:items-center">
            {/* MESSAGE */}

            <div className="text-[10.5px] text-[#4F6F9D]">
              {docRef && refNo.trim()
                ? "Ready to upload against this reference."
                : "Pick a reference type and number before uploading."}
            </div>

            {/* BUTTONS */}

            <div className="flex shrink-0 items-center gap-3">
              {/* CLEAR */}

              <AButton
                onClick={clearQueue}
                className="
    h-12
    rounded-[12px]
    border border-[#D9E1EC]
    bg-[var(--card)]
    px-[17px]
    text-[13.5px]
    hover:bg-[var(--hover)]
    font-[550]
    text-[#475569]
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
                  "inline-flex h-12 items-center justify-center",
                  "gap-[9px] rounded-[12px] px-[17px]",
                  "bg-[#64748B] text-[13.5px] font-[650] text-white",
                  "hover:bg-[#64748B] active:bg-[#64748B]",
                  queue.length > 0
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-90",
                ].join(" ")}
              >
                <Upload size={17} />
                Upload
              </AButton>
            </div>
          </div>
        </div>

        {/* =================================================
            RIGHT - PREVIOUSLY UPLOADED
        ================================================= */}

        <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]">
          {/* HEADER */}

          {/* HEADER */}

          <div
            className="
    flex min-h-[64px] w-full
    flex-col gap-3
    border-b border-[var(--border)]
    px-4 py-3
    sm:flex-row sm:items-center sm:gap-[10px]
    sm:px-5 sm:py-[13px]
  "
          >
            {/* TITLE + COUNT */}

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h2
                className="
        m-0 min-w-0
        truncate
        text-[14px] font-[600]
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

            {/* SCOPE BUTTON */}

            <button
              type="button"
              onClick={() =>
                setScope((previous) => (previous === "ref" ? "all" : "ref"))
              }
              className="
      h-[34px]
      w-full
      shrink-0
      rounded-[10px]
      border border-[#D9E1EC]
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
            </button>
          </div>

          {/* FILE LIST */}

          <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto px-5 pb-4 pt-3">
            {displayedFiles.map((file) => {
              const config = getFileConfig(file.kind);

              return (
                <div
                  key={`${file.name}-${file.refNo}-${file.Utd || ""}`}
                  className="flex min-w-0 items-center gap-[11px] rounded-[10px] border border-[var(--border)] px-3 py-[10px] transition-colors hover:bg-[var(--hover)]"
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
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-[550] text-[var(--fg)]">
                      {file.name}
                    </span>

                    <span className="mt-[2px] block overflow-hidden text-ellipsis whitespace-nowrap text-[10.5px] text-[var(--muted)]">
                      {file.refType} · {file.refNo} · {file.uploadedAt} ·{" "}
                      {file.uploadedBy}
                    </span>
                  </span>

                  {/* VIEW */}

                  <button
                    type="button"
                    title="View"
                    onClick={() => handleView(file)}
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-[#D9E1EC] bg-[var(--card)] text-[#64748B] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                  >
                    <Eye size={15} />
                  </button>

                  {/* DOWNLOAD */}

                  <button
                    type="button"
                    title="Download"
                    onClick={() => handleDownload(file)}
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-[#D9E1EC] bg-[var(--card)] text-[#64748B] transition-colors hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                  >
                    <Download size={15} />
                  </button>

                  {/* DELETE */}

                  <button
                    type="button"
                    title="Delete"
                    onClick={() => handleDelete(file)}
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-[#D9E1EC] bg-[var(--card)] text-[#64748B] transition-colors hover:bg-[#FFF1F2] hover:text-[#E11D48]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}

            {/* EMPTY */}

            {displayedFiles.length === 0 && (
              <div className="px-3 py-10 text-center">
                <span className="inline-grid h-10 w-10 place-items-center rounded-[11px] bg-[var(--sub)] text-[var(--muted)]">
                  <FolderOpen size={18} />
                </span>

                <div className="mt-3 text-[13px] font-[550] text-[var(--fg)]">
                  No files for this reference yet
                </div>

                <div className="mt-1 text-[12px] text-[var(--muted)]">
                  Upload on the left, or switch to all references.
                </div>
              </div>
            )}
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

      <HashloaderComponent isLoading={isLoadingonpage} />
    </div>
  );
}
