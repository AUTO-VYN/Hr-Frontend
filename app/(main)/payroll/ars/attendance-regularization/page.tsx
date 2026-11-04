"use client";
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaCheck,
  FaTimes,
  FaMapMarkerAlt,
  FaUserCircle,
  FaCommentDots,
  FaClock,
  FaFileExcel,
} from "react-icons/fa";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import HashloaderComponent from "@/components/Templates/hashloader";
import FileViewer from "@/components/atoms/Fileviewer";

/* ------------------------------------------------------------------ */
/*  CONSTANTS + PURE HELPERS (no state, same output as production)     */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 30; // old DataTable: initialState.pageSize
const IMAGE_BASE_URL = "https://erp.autovyn.com/backend/fetch"; // hardcoded in old page
const ALL_REASONS = "All reasons";

const options = [
  { value: "1", label: "ERP Mispunch Approver" },
  { value: "2", label: "Mobile Mispunch Approver" },
];

const formatDate = (dateString: any) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatTime = (date: any) => date?.split("T")[1].substring(0, 5);

const getStatusMeta = (val: any) => {
  const s = String(val ?? "").trim();
  const upper = s.toUpperCase();

  if (!upper || upper === "—" || upper === "-") {
    return { label: "—", tint: "var(--muted)", bg: "transparent" };
  }

  // 1. Rejected
  if (upper === "REJ" || upper.includes("REJECT")) {
    return {
      label: "Rejected",
      tint: "#EF4444",
      bg: "rgba(239, 68, 68, 0.14)",
    };
  }

  // 2. Absent (explicitly map 'A' / 'ABSENT' to full name 'Absent')
  if (upper === "A" || upper === "ABSENT" || upper.includes("ABSENT")) {
    return { label: "Absent", tint: "#E11D48", bg: "rgba(225, 29, 72, 0.12)" };
  }

  // 3. Week off (map 'WO', 'W-OFF', etc. to 'Week off')
  if (
    upper === "WO" ||
    upper === "W-OFF" ||
    upper === "W/O" ||
    upper === "OFF" ||
    upper === "WEEK OFF" ||
    upper === "WEEKOFF" ||
    upper.includes("WEEK OFF") ||
    upper.includes("WEEKOFF") ||
    upper.includes("WEEKEND")
  ) {
    return {
      label: "Week off",
      tint: "#0EA5E9",
      bg: "rgba(14, 165, 233, 0.12)",
    };
  }

  // 4. Overtime (map 'OT' to 'Overtime')
  if (
    upper === "OT" ||
    upper === "OVERTIME" ||
    upper.includes("OVERTIME") ||
    upper.includes("OVER TIME")
  ) {
    return {
      label: "Overtime",
      tint: "#7C3AED",
      bg: "rgba(124, 58, 237, 0.12)",
    };
  }

  // 5. Half Day (map 'HD', 'HL', 'HF' to 'Half Day')
  if (
    upper === "HD" ||
    upper === "HL" ||
    upper === "HF" ||
    upper === "HALF DAY" ||
    upper === "HALFDAY" ||
    upper.includes("HALF")
  ) {
    return {
      label: "Half Day",
      tint: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
    };
  }

  // 6. Late Mark (map 'LM', 'L', 'LATE' to 'Late mark')
  if (
    upper === "LM" ||
    upper === "L" ||
    upper === "LATE" ||
    upper === "LATE MARK" ||
    upper === "LATEMARK" ||
    upper.includes("LATE MARK") ||
    upper.includes("LATEMARK")
  ) {
    return {
      label: "Late mark",
      tint: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
    };
  }

  // 7. On Duty (map 'OD' to 'On Duty')
  if (
    upper === "OD" ||
    upper === "ON DUTY" ||
    upper.includes("OFFICIAL DUTY") ||
    upper.includes("ON DUTY")
  ) {
    return { label: "On Duty", tint: "#0284C7", bg: "rgba(2, 132, 199, 0.12)" };
  }

  // 8. Comp Off (map 'CO', 'C-OFF' to 'Comp Off')
  if (
    upper === "CO" ||
    upper === "C-OFF" ||
    upper === "COMP OFF" ||
    upper.includes("COMP")
  ) {
    return {
      label: "Comp Off",
      tint: "#6366F1",
      bg: "rgba(99, 102, 241, 0.12)",
    };
  }

  // 9. Holiday (map 'H', 'HOL' to 'Holiday')
  if (
    upper === "H" ||
    upper === "HOL" ||
    upper === "HOLIDAY" ||
    upper.includes("HOLIDAY")
  ) {
    return {
      label: "Holiday",
      tint: "#0D9488",
      bg: "rgba(13, 148, 136, 0.12)",
    };
  }

  // 10. Leaves (map 'CL', 'SL', 'PL', 'EL', 'ML', 'LV' to full names)
  if (upper === "CL" || upper.includes("CASUAL")) {
    return {
      label: "Casual Leave",
      tint: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.12)",
    };
  }
  if (upper === "SL" || upper.includes("SICK")) {
    return {
      label: "Sick Leave",
      tint: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.12)",
    };
  }
  if (
    upper === "PL" ||
    upper === "EL" ||
    upper.includes("PAID LEAVE") ||
    upper.includes("EARNED")
  ) {
    return {
      label: "Paid Leave",
      tint: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.12)",
    };
  }
  if (upper === "ML" || upper.includes("MATERNITY")) {
    return {
      label: "Maternity Leave",
      tint: "#EC4899",
      bg: "rgba(236, 72, 153, 0.12)",
    };
  }
  if (
    upper === "LV" ||
    upper === "LVE" ||
    upper === "LEAVE" ||
    upper.includes("LEAVE")
  ) {
    return { label: "Leave", tint: "#8B5CF6", bg: "rgba(139, 92, 246, 0.12)" };
  }

  // 11. Mispunch (map 'MP' to 'Mispunch')
  if (upper === "MP" || upper.includes("MISPUNCH")) {
    return {
      label: "Mispunch",
      tint: "#D97706",
      bg: "rgba(217, 119, 6, 0.12)",
    };
  }

  // 12. Working / Present (map 'P', 'W', 'WRK' to full names)
  if (upper === "W" || upper === "WRK" || upper.includes("WORK")) {
    return {
      label: "Working",
      tint: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
    };
  }
  if (upper === "P" || upper === "PRESENT" || upper.includes("PRESENT")) {
    return {
      label: "Present",
      tint: "#10B981",
      bg: "rgba(16, 185, 129, 0.12)",
    };
  }

  // Clean fallback: If raw string is already multi-char/readable, use it; otherwise avoid raw single/double letter code
  return {
    label: s || "Working",
    tint: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
  };
};

const statusCell = ({ value }: any) => {
  if (!value && value !== 0)
    return <span style={{ color: "var(--muted)" }}>—</span>;
  const { label, tint, bg } = getStatusMeta(value);
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "10.5px",
        fontWeight: 700,
        color: tint,
        background: bg,
        padding: "3px 8px",
        borderRadius: "999px",
        whiteSpace: "nowrap",
        lineHeight: "1.2",
      }}
    >
      {label}
    </span>
  );
};

const inTimeCell = ({ value, row }: any) => {
  const isManual =
    row?.In1Mannual === "Y" ||
    row?.in1mannual === "Y" ||
    row?.In1Mannual === true ||
    row?.in1 === "Y" ||
    row?.in1 === true;

  if (!value) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: "#E11D48", fontWeight: 600 }}>—</span>
        {isManual && (
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              color: "#4F46E5",
              background: "rgba(79,70,229,.14)",
              padding: "2px 5px",
              borderRadius: "5px",
            }}
          >
            MAN
          </span>
        )}
      </span>
    );
  }
  const date = new Date(value);
  const formattedTime = !isNaN(date.getTime())
    ? date.toISOString().split("T")[1]?.slice(0, 5)
    : String(value).slice(0, 5);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 550 }}>{formattedTime}</span>
      {isManual && (
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 700,
            color: "#4F46E5",
            background: "rgba(79,70,229,.14)",
            padding: "2px 5px",
            borderRadius: "5px",
          }}
        >
          MAN
        </span>
      )}
    </span>
  );
};

const outTimeCell = ({ value, row }: any) => {
  const isManual =
    row?.Out1Mannual === "Y" ||
    row?.out1mannual === "Y" ||
    row?.Out1Mannual === true ||
    row?.out1 === "Y" ||
    row?.out1 === true;

  if (!value) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: "#E11D48", fontWeight: 600 }}>—</span>
        {isManual && (
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 700,
              color: "#4F46E5",
              background: "rgba(79,70,229,.14)",
              padding: "2px 5px",
              borderRadius: "5px",
            }}
          >
            MAN
          </span>
        )}
      </span>
    );
  }
  const date = new Date(value);
  const formattedTime = !isNaN(date.getTime())
    ? date.toISOString().split("T")[1]?.slice(0, 5)
    : String(value).slice(0, 5);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 550 }}>{formattedTime}</span>
      {isManual && (
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 700,
            color: "#4F46E5",
            background: "rgba(79,70,229,.14)",
            padding: "2px 5px",
            borderRadius: "5px",
          }}
        >
          MAN
        </span>
      )}
    </span>
  );
};

const decimalCell = ({ value }: any) => (
  <span>{value ? value.toFixed(2) : ""}</span>
);
const dateCell = ({ value }: any) => (value ? formatDate(value) : "");

// Same column configs as production (Header / accessor / Cell / width) so Excel export gets identical input.
// `hidden: true` = kept in config (UTD is the row id + export) but not drawn in the new table.
const columns = [
  { Header: "Code", accessor: "Code_" },
  { Header: "EmpName", accessor: "EmpName", width: 450 },
  { Header: "Date", accessor: "Date_", Cell: dateCell },
  { Header: "StTime", accessor: "StTime", Cell: decimalCell },
  { Header: "EndTime", accessor: "EndTime", Cell: decimalCell },
  { Header: "in2", accessor: "In2", Cell: inTimeCell },
  { Header: "In1 Manual", accessor: "In1Mannual" },
  { Header: "out2", accessor: "Out2", Cell: outTimeCell },
  { Header: "Out1 Manual", accessor: "Out1Mannual" },
  { Header: "Status", accessor: "Status", Cell: statusCell },
  { Header: "MP Reason", accessor: "Mipunch_Reason1" },
  { Header: ".", accessor: "UTD", width: 100, hidden: true },
];
const columns1 = [
  { Header: "Code", accessor: "Code_" },
  { Header: "EmpName", accessor: "EmpName", width: 400 },
  { Header: "Date", accessor: "Date_", Cell: dateCell },
  { Header: "StTime", accessor: "StTime", Cell: decimalCell },
  { Header: "EndTime", accessor: "EndTime", Cell: decimalCell },
  { Header: "App In1 ", accessor: "App_In1", Cell: inTimeCell },
  { Header: "In Add", accessor: "In_Add", width: 300 },
  { Header: "App out1 ", accessor: "App_Out1", Cell: outTimeCell },
  { Header: "Out Add", accessor: "Out_Add", width: 300 },
  { Header: "Status", accessor: "Status", Cell: statusCell },
  { Header: ".", accessor: "UTD", width: 1, hidden: true },
  { Header: "Mispunch Reason", accessor: "mipunch_reason" },
  { Header: "In1", accessor: "in1" },
  { Header: "Out1", accessor: "out1" },
  { Header: "Region", accessor: "Region" },
  { Header: "Special Remark", accessor: "SPL_REMARK" },
  { Header: "Night Shift", accessor: "NightShift" },
  { Header: "App_in1", accessor: "App_in1" },
  { Header: "App_out1", accessor: "App_out1" },
];

function showSideAlert(message: any, type: any) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      container: "side-alert-container",
      popup: `side-alert-${type}`,
      title: "side-alert-title",
      icon: "side-alert-icon",
    },
  });
  Toast.fire({ icon: type, title: message });
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */
const MispunchApproverMobile = () => {
  const user = useCurrentUser();

  // ---- state (same names as production) ----
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedrowdata, setsellectedrowdata] = useState([]); // [{ id: UTD, rowData }]
  const [tabledata, setTabledata] = useState([]);
  const [remark, setRemark] = useState(null);
  const [check, setCheck] = useState(true);
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({
    Emp_Code: null,
    OfficeDate: null,
    OfficeMonth: null,
    EmpLoc: null,
    selectedOption: "1",
    In_Add: null,
    Out_Add: null,
    Mispunch_Out_Image: null,
    Mispunch_In_Image: null,
  });

  // ---- new-UI-only state (client side view controls) ----
  const [detailRow, setDetailRow] = useState(null); // row shown in "Punch evidence"
  const [reasonF, setReasonF] = useState(ALL_REASONS);
  const [search, setSearch] = useState(""); // old react-table global filter
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);

  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  const compcode = user?.Comp_Code; // header value; empty until the session has loaded
  const apiHeaders = () => ({ compcode, name: user?.name });
  const isErp = formData.selectedOption === "1";
  const activeColumns = isErp ? columns : columns1;
  const visibleColumns = activeColumns.filter((c: any) => !c.hidden);
  const reasonKey = isErp ? "Mipunch_Reason1" : "mipunch_reason";

  const onclickExceldownload = () => {
    const downloadCols = activeColumns
      .filter((c: any) => !c.hidden)
      .map((c: any) => ({
        Header: c.Header,
        accessor: c.accessor,
      }));
    handleExcelDownload(downloadCols, filteredRows);
  };

  /* ================= API 1 : locations (findMasters) ================= */
  const fetchBranches = async () => {
    if (!compcode) return; // session not loaded yet -> header would be empty
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/findMasters`,
        { multiloc: user?.branch },
        { headers: apiHeaders() },
      );
      const locationArray = response.data?.data?.Location?.[0] || [];
      let finalLocations = [...locationArray];
      // "All Locations" only when there are 2 or more
      if (locationArray.length > 1) {
        const allLocationValues = locationArray
          .map((loc: any) => loc.value)
          .join(",");
        finalLocations = [
          { value: allLocationValues, label: "All Locations" },
          ...locationArray,
        ];
      }
      setBranches(finalLocations);
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= API 2 : table data (Attendance_Regularization) ================= */
  const handleshow = async () => {
    if (!compcode) return; // session not loaded yet -> backend says "company code missing"
    setsellectedrowdata([]);
    setTabledata([]);
    setSelectAll(false);
    setPageIndex(0);
    setIsLoading(true);
    setCheck(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/Attendance_Regularization`,
        {
          status: formData.selectedOption,
          Year: user?.Year,
          EmpLoc: formData.EmpLoc || user?.branch,
          Emp_Code: formData.Emp_Code,
          OfficeDate: formData.OfficeDate,
          OfficeMonth: formData.OfficeMonth,
        },
        { headers: apiHeaders() },
      );
      setCheck(false);
      setIsLoading(false);
      setTabledata(response.data.result);
    } catch (error) {
      setCheck(false);
      setIsLoading(false);
      console.log("Response Data:", error?.response?.data);
    }
  };

  /* ================= API 3 : approve ================= */
  // rows defaults to the table selection; the evidence panel passes just its own row.
  const handleapprove = async (rows = selectedrowdata) => {
    if (rows.length === 0) {
      showSideAlert("Please select an Entry to approve.", "warning");
      return;
    }
    const id = rows.map((item: any) => item.id); // approve sends ids only
    setCheck(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/Attendance_Regularization_Approve`,
        {
          selectedrowdata: id,
          id: user?.id,
          status: formData.selectedOption,
          Remark: remark,
          Appr_Code: user?.EMPCODE,
        },
        { headers: apiHeaders() },
      );
      // approve responds with capital-S "Status" / "Message"
      const ok = response.data.Status == "true";
      Swal.fire({
        icon: ok ? "success" : "warning",
        title: ok ? "Success" : "Warning",
        text: response.data.Message || "No message from server",
      });
      if (ok) setClearedCount((n) => n + rows.length);
      clearSelection();
      setCheck(false);
      await handleshow();
    } catch (error) {
      clearSelection();
      console.log("Response Data:", error?.response?.data);
      setCheck(false);
    }
  };

  /* ================= API 4 : reject ================= */
  const handlereject = async (rows = selectedrowdata) => {
    if (rows.length === 0) {
      showSideAlert("Please select an Entry to Reject.", "warning");
      return;
    }
    if (!remark) {
      showSideAlert("Please Enter Remark for Reject.", "warning");
      return;
    }
    setCheck(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/Attendance_Regularization_Reject`,
        {
          selectedrowdata: rows, // reject sends full {id, rowData} objects
          id: user?.id,
          status: formData.selectedOption,
          user: user?.name,
          EMPCODE: user?.EMPCODE,
          rejectionRemark: remark,
        },
        { headers: apiHeaders() },
      );
      // reject responds with lowercase "success" / "message"
      const ok = response.data.success == "true";
      Swal.fire({
        icon: ok ? "success" : "warning",
        title: ok ? "Success" : "Warning",
        text: response.data.message || "No message from server",
      });
      if (ok) setClearedCount((n) => n + rows.length);
      clearSelection();
      setCheck(false);
      await handleshow();
    } catch (error) {
      setCheck(false);
      clearSelection();
      console.log("Response Data:", error?.response?.data?.Message);
      showSideAlert(error?.response?.data?.Message, "warning");
    }
  };

  /* ================= form + detail panel ================= */
  const handleSelectChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleRemark = (name: any, value: any) => setRemark(value);

  // old onRowDoubleClick: reset detail fields, then fill from the row
  const onRowDoubleClick = (row: any) => {
    setDetailRow(row);
    setFormData((prev) => ({
      ...prev,
      In_Add: row.In_Add,
      Out_Add: row.Out_Add,
      Mispunch_Out_Image: row.Mispunch_Out_Image
        ? `${IMAGE_BASE_URL}?filePath=${row.Mispunch_Out_Image}`
        : null,
      Mispunch_In_Image: row.Mispunch_In_Image
        ? `${IMAGE_BASE_URL}?filePath=${row.Mispunch_In_Image}`
        : null,
      Mipunch_Reason1: row.Mipunch_Reason1,
      MI_Remark1: row.MI_Remark1,
      SPL_REMARK: row.SPL_REMARK,
      Out_Time:
        prev.selectedOption == 1
          ? formatTime(row.Out2)
          : formatTime(row.App_Out1),
      In_Time:
        prev.selectedOption == 1
          ? formatTime(row.In2)
          : formatTime(row.App_In1),
    }));
  };

  /* ================= selection (old DataTable logic) ================= */
  const clearSelection = () => {
    setsellectedrowdata([]);
    setSelectAll(false);
  };
  const isSelected = (utd: any) =>
    selectedrowdata.some((r: any) => r.id === utd);

  const toggleRowSelection = (rowId: any, rowData: any) => {
    setsellectedrowdata((prev: any) =>
      prev.some((r: any) => r.id === rowId)
        ? prev.filter((r: any) => r.id !== rowId)
        : [...prev, { id: rowId, rowData }],
    );
    onRowDoubleClick(rowData); // select / deselect always fills the panel
  };
  const toggleSelectAll = () => {
    // selects every row in `data` (all pages, ignores search/reason filter) – same as production
    const next = selectAll
      ? []
      : tabledata.map((row: any) => ({ id: row["UTD"], rowData: row }));
    setsellectedrowdata(next);
    setSelectAll(!selectAll);
  };

  /* ================= effects (same triggers as production) ================= */
  // Wait for the session: both calls need the compcode header.
  useEffect(() => {
    if (!compcode) return;
    handleshow(); // on mount (as soon as compcode is available)
  }, [compcode]);

  useEffect(() => {
    if (!compcode) return;
    fetchBranches();
  }, [compcode, user?.branch]);

  useEffect(() => {
    if (branches.length > 0 && user?.branch) {
      setFormData((prev) => ({
        ...prev,
        EmpLoc: branches[0].value.toString(),
      }));
    }
  }, [branches, user?.branch]);

  // Reset Filters – identical to production (incl. Emp_Code <- user?.branch), plus new-UI view filters
  const handleReset = async () => {
    setFormData((prev) => ({
      ...prev,
      Emp_Code: user?.branch,
      OfficeDate: null,
      OfficeMonth: null,
      EmpLoc: null,
    }));
    setReasonF(ALL_REASONS);
    setSearch("");
  };

  /* ================= table view: search -> reason -> sort -> page ================= */
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = (tabledata || []).filter((row: any) => {
      if (reasonF !== ALL_REASONS && row[reasonKey] !== reasonF) return false;
      if (
        q &&
        !activeColumns.some((c: any) =>
          String(row[c.accessor] ?? "")
            .toLowerCase()
            .includes(q),
        )
      )
        return false;
      return true;
    });
    if (sortKey) {
      list = list.slice().sort((a: any, b: any) => {
        const av = a[sortKey],
          bv = b[sortKey];
        const c =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av ?? "").localeCompare(String(bv ?? ""));
        return sortAsc ? c : -c;
      });
    }
    return list;
  }, [tabledata, search, reasonF, sortKey, sortAsc, reasonKey, isErp]);

  const reasonOptions = useMemo(() => {
    const set = new Set<string>();
    (tabledata || []).forEach(
      (r: any) => r[reasonKey] && set.add(r[reasonKey]),
    );
    return [ALL_REASONS, ...Array.from(set)];
  }, [tabledata, reasonKey]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const pageRows = filteredRows.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const onSort = (key: string) => {
    setPageIndex(0);
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  /* ================= KPIs (derived from the loaded data) ================= */
  const missingPunch = (tabledata || []).filter((r: any) =>
    isErp ? !r.In2 || !r.Out2 : !r.App_In1 || !r.App_Out1,
  ).length;
  const kpis = [
    {
      label: "Pending with you",
      value: (tabledata || []).length,
      sub: options.find((o) => o.value === formData.selectedOption)?.label,
      tint: "#F59E0B",
    },
    {
      label: "Missing a punch",
      value: missingPunch,
      sub: "No in or out time",
      tint: "#E11D48",
    },
    {
      label: "Selected",
      value: selectedrowdata.length,
      sub: "Row count",
      tint: "#4F46E5",
    },
    {
      label: "Cleared this session",
      value: clearedCount,
      sub: "Approved or rejected",
      tint: "#10B981",
    },
  ];

  const renderCell = (col: any, row: any) => {
    const v = row[col.accessor];
    return col.Cell ? (col.Cell({ value: v, row }) ?? "") : v;
  };

  /* ================= UI ================= */
  return (
    <div className="ars">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <main className="ars-main">
        {/* title + approver role (old: selectedOption dropdown) */}
        <div className="ars-titlebar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>Attendance regularization</h1>
            <p>
              Approve the manual punches your branches raised. Each row carries
              the punch evidence — app location and mispunch photo — so you can
              decide without leaving the queue.
            </p>
          </div>
          <label className="ars-field-wrap" style={{ width: 262 }}>
            <span className="ars-label">Approver role</span>
            <select
              className="ars-field"
              value={formData.selectedOption}
              onChange={(e) => {
                handleSelectChange("selectedOption", e.target.value);
                setReasonF(ALL_REASONS);
                setPageIndex(0);
              }}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="ars-kpis">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="ars-card"
              style={{ padding: "13px 15px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: k.tint,
                  }}
                />
                <span
                  className="ars-muted"
                  style={{ fontSize: 11.5, fontWeight: 600 }}
                >
                  {k.label}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 650, marginTop: 7 }}>
                {k.value}
              </div>
              <div className="ars-muted" style={{ fontSize: 11, marginTop: 3 }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        <div className="ars-layout">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minWidth: 0,
            }}
          >
            {/* filters: server filters (need Show Data) + client view filters */}
            <div className="ars-card ars-filters">
              <label className="ars-field-wrap">
                <span className="ars-label">Location</span>
                <select
                  className="ars-field"
                  value={formData.EmpLoc ?? ""}
                  onChange={(e) => handleSelectChange("EmpLoc", e.target.value)}
                >
                  {branches.map((b: any) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ars-field-wrap">
                <span className="ars-label">Employee code</span>
                <input
                  className="ars-field"
                  type="text"
                  value={formData.Emp_Code ?? ""}
                  onChange={(e) =>
                    handleSelectChange("Emp_Code", e.target.value || null)
                  }
                />
              </label>
              <label className="ars-field-wrap">
                <span className="ars-label">Office date</span>
                <input
                  className="ars-field"
                  type="date"
                  value={formData.OfficeDate ?? ""}
                  onChange={(e) =>
                    handleSelectChange("OfficeDate", e.target.value || null)
                  }
                />
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button
                  className="ars-btn"
                  style={{ flex: 1, height: 36, justifyContent: "center" }}
                  onClick={handleReset}
                >
                  Reset filters
                </button>
                <button
                  className="ars-btn ars-primary"
                  style={{ flex: 1, height: 36, justifyContent: "center" }}
                  onClick={handleshow}
                >
                  Show data
                </button>
              </div>
              <label
                className="ars-field-wrap"
                style={{ gridColumn: "span 2" }}
              >
                <span className="ars-label">Search</span>
                <input
                  className="ars-field"
                  value={search}
                  placeholder="Search any column"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPageIndex(0);
                  }}
                />
              </label>
              <label
                className="ars-field-wrap"
                style={{ gridColumn: "span 2" }}
              >
                <span className="ars-label">Reason</span>
                <select
                  className="ars-field"
                  value={reasonF}
                  onChange={(e) => {
                    setReasonF(e.target.value);
                    setPageIndex(0);
                  }}
                >
                  {reasonOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="ars-card" style={{ overflow: "hidden" }}>
              <div className="ars-tablehead">
                <span
                  className={`ars-box ${selectAll ? "on" : ""}`}
                  onClick={toggleSelectAll}
                >
                  {selectAll && <FaCheck size={9} />}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {filteredRows.length} requests
                </span>
                <span className="ars-muted" style={{ fontSize: 11.5 }}>
                  {selectedrowdata.length
                    ? `${selectedrowdata.length} selected`
                    : "Click a row to select it and inspect the evidence"}
                </span>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="ars-btn"
                    onClick={onclickExceldownload}
                    disabled={isExcelLoading || filteredRows.length === 0}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    title="Export filtered regularization requests to Excel"
                  >
                    <FaFileExcel style={{ color: "#10B981" }} />
                    <span>
                      {isExcelLoading ? "Exporting..." : "Export to Excel"}
                    </span>
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 520, overflow: "auto" }}>
                <table className="ars-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }} />
                      {visibleColumns.map((c: any, i: number) => (
                        <th
                          key={`${c.accessor}-${i}`}
                          onClick={() => onSort(c.accessor)}
                          style={{
                            color:
                              sortKey === c.accessor
                                ? "var(--brand)"
                                : "var(--muted)",
                          }}
                        >
                          {c.Header}
                          {sortKey === c.accessor
                            ? sortAsc
                              ? " ↑"
                              : " ↓"
                            : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row: any, ri: number) => {
                      const utd = row["UTD"];
                      const sel = isSelected(utd);
                      const open = detailRow === row;
                      return (
                        <tr
                          key={utd ?? ri}
                          className="ars-tr"
                          style={{
                            background: open
                              ? "var(--brand-soft)"
                              : sel
                                ? "rgba(79,70,229,.06)"
                                : "transparent",
                          }}
                          onClick={() => toggleRowSelection(utd, row)}
                          onDoubleClick={() => onRowDoubleClick(row)}
                        >
                          <td>
                            <span
                              className={`ars-box ${sel ? "on" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowSelection(utd, row);
                              }}
                            >
                              {sel && <FaCheck size={9} />}
                            </span>
                          </td>
                          {visibleColumns.map((c: any, ci: number) => (
                            <td
                              key={`${c.accessor}-${ci}`}
                              style={{
                                maxWidth: c.width || "auto",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={String(row[c.accessor] ?? "")}
                            >
                              {renderCell(c, row)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!isLoading && filteredRows.length === 0 && (
                  <div style={{ padding: "56px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      Nothing left to regularize
                    </div>
                    <div
                      className="ars-muted"
                      style={{ fontSize: 12, marginTop: 4 }}
                    >
                      No pending punches match this role and filter.
                    </div>
                  </div>
                )}
              </div>

              {/* pagination (old Previous / Page x of y / Next) */}
              <div className="ars-pager">
                <button
                  className="ars-btn"
                  disabled={safePage === 0}
                  onClick={() => setPageIndex(safePage - 1)}
                >
                  Previous
                </button>
                <span className="ars-muted" style={{ fontSize: 12 }}>
                  Page{" "}
                  <b style={{ color: "var(--fg)" }}>
                    {safePage + 1} of {pageCount}
                  </b>{" "}
                  ({filteredRows.length} items)
                </span>
                <button
                  className="ars-btn"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPageIndex(safePage + 1)}
                >
                  Next
                </button>
              </div>

              {/* action bar: remark + reject + approve */}
              <div className="ars-actions">
                <input
                  className="ars-field"
                  style={{ width: 300, maxWidth: "100%" }}
                  maxLength={500}
                  value={remark ?? ""}
                  placeholder="Remark — required to reject"
                  onChange={(e) => handleRemark("remark", e.target.value)}
                />
                <div style={{ flex: 1 }} />
                <button
                  className="ars-btn ars-danger"
                  onClick={() => handlereject()}
                >
                  <FaTimes size={11} />
                  Reject
                </button>
                <button
                  className="ars-btn ars-ok"
                  style={{ opacity: selectedrowdata.length ? 1 : 0.6 }}
                  onClick={() => handleapprove()}
                >
                  <FaCheck size={11} />
                  Approve {selectedrowdata.length}
                </button>
              </div>
            </div>
          </div>

          {/* punch evidence (old detail section) */}
          <div className="ars-side">
            <div className="ars-card" style={{ padding: "15px 17px 17px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="ars-label">Punch evidence</span>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--brand)",
                  }}
                >
                  {detailRow
                    ? `${detailRow.Code_} · ${formatDate(detailRow.Date_)}`
                    : "—"}
                </span>
              </div>

              {!detailRow ? (
                <div style={{ padding: "34px 12px", textAlign: "center" }}>
                  <span className="ars-chip">
                    <FaMapMarkerAlt size={15} />
                  </span>
                  <div
                    style={{ fontSize: 12.5, fontWeight: 600, marginTop: 11 }}
                  >
                    Select a request
                  </div>
                  <div
                    className="ars-muted"
                    style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.5 }}
                  >
                    App location, mispunch photos and remarks appear here.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginTop: 13,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        label: "Mispunch in image",
                        src: formData.Mispunch_In_Image,
                        time: formData.In_Time,
                      },
                      {
                        label: "Mispunch out image",
                        src: formData.Mispunch_Out_Image,
                        time: formData.Out_Time,
                      },
                    ].map((p) => (
                      <div
                        key={p.label}
                        className="ars-sub"
                        style={{ borderRadius: 10, overflow: "hidden" }}
                      >
                        <div
                          style={{
                            minHeight: 110,
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(0,0,0,0.03)",
                            position: "relative",
                          }}
                        >
                          {p.src ? (
                            <div
                              style={{
                                width: "100%",
                                height: 110,
                                position: "relative",
                              }}
                            >
                              <img
                                src={p.src}
                                alt={p.label}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 4,
                                  right: 6,
                                  zIndex: 10,
                                }}
                              >
                                <FileViewer fileLink={p.src} celldata="View" />
                              </div>
                            </div>
                          ) : (
                            <span
                              className="ars-muted"
                              style={{ fontSize: 11 }}
                            >
                              Not captured
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            padding: "7px 9px",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600 }}>
                            {p.label}
                          </div>
                          <div
                            className="ars-muted"
                            style={{ fontSize: 10.5, marginTop: 2 }}
                          >
                            {p.time ? `Office time ${p.time}` : "No time"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {[
                    {
                      label: "Mobile app in location",
                      text: formData.In_Add,
                      tint: "#10B981",
                    },
                    {
                      label: "Mobile app out location",
                      text: formData.Out_Add,
                      tint: "#0EA5E9",
                    },
                  ].map((g) => (
                    <div
                      key={g.label}
                      className="ars-sub"
                      style={{ borderRadius: 10, padding: "10px 11px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span style={{ color: g.tint, display: "grid" }}>
                          <FaMapMarkerAlt size={12} />
                        </span>
                        <span className="ars-label">{g.label}</span>
                      </div>
                      <div
                        style={{ fontSize: 12, marginTop: 7, lineHeight: 1.5 }}
                      >
                        {g.text || "No location captured"}
                      </div>
                    </div>
                  ))}

                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {[
                      {
                        icon: <FaUserCircle size={12} />,
                        title: "Mispunch reason",
                        sub: formData.Mipunch_Reason1,
                        tint: "#4F46E5",
                      },
                      {
                        icon: <FaCommentDots size={12} />,
                        title: "Mispunch remark",
                        sub: formData.MI_Remark1,
                        tint: "#0EA5E9",
                      },
                      {
                        icon: <FaClock size={12} />,
                        title: "Special remark",
                        sub: formData.SPL_REMARK,
                        tint: "#F59E0B",
                      },
                    ]
                      .filter((t) => t.sub)
                      .map((t) => (
                        <div
                          key={t.title}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 7,
                              flex: "0 0 auto",
                              display: "grid",
                              placeItems: "center",
                              background: t.tint + "24",
                              color: t.tint,
                            }}
                          >
                            {t.icon}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {t.title}
                            </span>
                            <span
                              className="ars-muted"
                              style={{
                                display: "block",
                                fontSize: 11,
                                marginTop: 2,
                              }}
                            >
                              {t.sub}
                            </span>
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* single-row actions reuse the same API functions */}
                  <div style={{ display: "flex", gap: 9 }}>
                    <button
                      className="ars-btn ars-danger"
                      onClick={() =>
                        handlereject([
                          { id: detailRow.UTD, rowData: detailRow },
                        ])
                      }
                    >
                      Reject
                    </button>
                    <button
                      className="ars-btn ars-ok"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() =>
                        handleapprove([
                          { id: detailRow.UTD, rowData: detailRow },
                        ])
                      }
                    >
                      <FaCheck size={11} />
                      Approve this punch
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
};

export default MispunchApproverMobile;

/* ------------------------------------------------------------------ */
/*  Styles (scoped to .ars, light/dark via data-theme)                 */
/* ------------------------------------------------------------------ */
const CSS = `
.ars{--bg:#F8FAFC;--card:#fff;--fg:#1E293B;--muted:#64748B;--border:#E2E8F0;--brand:#4F46E5;--brand-soft:#EEF2FF;--hover:#F1F5F9;--sub:#F8FAFC;--field:#fff;
 --shadow:0 1px 2px rgba(15,23,42,.04),0 10px 26px -14px rgba(15,23,42,.14);
 background:var(--bg);color:var(--fg);min-height:100vh;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.dark .ars{--bg:#0A0F1C;--card:#111827;--fg:#E7ECF3;--muted:#94A3B8;--border:#1F2937;--brand:#8B84FF;--brand-soft:#1E1B4B;--hover:#182235;--sub:#0E1524;--field:#0E1524;
 --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 26px -14px rgba(0,0,0,.6)}
.ars *{box-sizing:border-box}
.ars-header{position:sticky;top:0;z-index:30;background:var(--card);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;gap:16px;min-width:0}
.ars-crumbs{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted)}
.ars-crumbs b{color:var(--fg);font-weight:550}
.ars-main{padding:22px 24px 60px}
.ars-titlebar{display:flex;align-items:flex-end;gap:16px;margin-bottom:18px}
.ars-titlebar h1{margin:0;font-size:21px;font-weight:650;letter-spacing:-.02em}
.ars-titlebar p{margin:5px 0 0;font-size:12.5px;color:var(--muted)}
.ars-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:14px}
.ars-layout{display:grid;grid-template-columns:minmax(0,1fr) 372px;gap:14px;align-items:start}
.ars-side{position:sticky;top:82px}
.ars-card{background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow)}
.ars-filters{padding:12px 15px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;align-items:end}
.ars-field-wrap{display:flex;flex-direction:column;gap:5px;min-width:0}
.ars-label{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.03em;text-transform:uppercase}
.ars-muted{color:var(--muted)}
.ars-field{width:100%;border:1px solid var(--border);border-radius:9px;background:var(--field);color:var(--fg);font-size:12.5px;padding:9px 10px;outline:none;font-family:inherit}
.ars-field:focus{border-color:var(--brand)}
.ars-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:9px;background:var(--card);color:var(--fg);font-size:12.5px;font-weight:550;padding:8px 13px;cursor:pointer;white-space:nowrap;font-family:inherit}
.ars-btn:hover:not(:disabled){background:var(--hover)}
.ars-btn:disabled{opacity:.5;cursor:not-allowed}
.ars-icon{width:34px;height:34px;padding:0;justify-content:center;border-radius:10px}
.ars-primary{background:var(--brand);border-color:var(--brand);color:#fff}
.ars-primary:hover:not(:disabled){background:var(--brand);filter:brightness(1.08)}
.ars-danger{border-color:rgba(225,29,72,.4);color:#E11D48;background:transparent;font-weight:600}
.ars-danger:hover:not(:disabled){background:rgba(225,29,72,.08)}
.ars-ok{background:#10B981;border-color:#10B981;color:#fff;font-weight:600}
.ars-ok:hover:not(:disabled){background:#10B981;filter:brightness(1.08)}
.ars-avatar{width:30px;height:30px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:600}
.ars-tablehead{padding:11px 15px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:11px}
.ars-box{display:grid;place-items:center;width:17px;height:17px;border-radius:5px;border:1px solid var(--border);color:#fff;cursor:pointer;flex:0 0 auto}
.ars-box.on{background:var(--brand);border-color:var(--brand)}
.ars-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12.5px}
.ars-table th{position:sticky;top:0;z-index:5;background:var(--sub);border-bottom:1px solid var(--border);text-align:left;padding:9px 12px;font-size:10.5px;font-weight:650;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;cursor:pointer}
.ars-table td{border-bottom:1px solid var(--border);padding:9px 12px}
.ars-tr{cursor:pointer}
.ars-tr:hover{background:var(--hover)!important}
.ars-pager{padding:10px 15px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:11px}
.ars-actions{padding:11px 15px;border-top:1px solid var(--border);display:flex;align-items:center;gap:11px;background:var(--sub);flex-wrap:wrap}
.ars-sub{background:var(--sub);border:1px solid var(--border)}
.ars-chip{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:11px;background:var(--sub);color:var(--muted);border:1px solid var(--border)}
@media (max-width:1180px){
 .ars-layout{grid-template-columns:minmax(0,1fr)}
 .ars-side{position:static}
 .ars-kpis,.ars-filters{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:900px){
 .ars-header,.ars-main{padding-left:14px;padding-right:14px}
 .ars-titlebar{flex-direction:column;align-items:stretch}
 .ars-titlebar label{width:100%!important}
 .ars-crumbs{display:none}
}
@media (max-width:640px){
 .ars-titlebar h1{font-size:18px}
 .ars-filters>*{grid-column:span 2!important}
}
`;
