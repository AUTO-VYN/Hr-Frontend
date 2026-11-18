"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, MapPin, CalendarDays, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import { useDateRange } from "@/app/hooks/use-date-range";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type TripRow = {
  id: string;
  tourId: string;
  tripName: string;
  startDate: string;
  endDate: string;
  status: string;
  endReason: string;

  // Original API fields for DataTable and route API
  Tour_ID: string;
  Trip_Name: string;
  Actual_Start_DateTime: string;
  Actual_End_DateTime: string;
  Status: string;
  End_Reason: string;

  raw: any;
};

type LocationLog = {
  Log_ID?: string | number;
  Address?: string;
  Latitude?: string | number;
  Longitude?: string | number;
  Fetched_At?: string;
  Fetch_Status?: string;
  Reason?: string;
  [key: string]: any;
};

declare global {
  interface Window {
    L: any;
  }
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getCurrentDate = (monthsBack = 0) => {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsBack);

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (value: any) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.Message ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const getStatusClass = (status: string) => {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("complete") ||
    value.includes("closed") ||
    value.includes("approved")
  ) {
    return "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  }

  if (
    value.includes("ongoing") ||
    value.includes("progress") ||
    value.includes("pending")
  ) {
    return "inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }

  if (value.includes("cancel") || value.includes("reject")) {
    return "inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
  }

  return "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

const TripReportPage = () => {
  const router = useRouter();
  const user = useCurrentUser();
  const globalDateRange = useDateRange();

  const mapInstanceRef = useRef<any>(null);

  // --------------------------------------------------
  // FILTER STATES
  // --------------------------------------------------

  const [dateFrom, setDateFrom] = useState(
    globalDateRange?.from || getCurrentDate(1),
  );

  const [dateTo, setDateTo] = useState(globalDateRange?.to || getCurrentDate());

  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [tripNames, setTripNames] = useState<SelectOption[]>([]);
  const [selectedTrip, setSelectedTrip] = useState("");

  // --------------------------------------------------
  // TABLE STATES
  // --------------------------------------------------

  const [tripRows, setTripRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --------------------------------------------------
  // ROUTE MODAL STATES
  // --------------------------------------------------

  const [routeModal, setRouteModal] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedTripRow, setSelectedTripRow] = useState<TripRow | null>(null);

  const [locationData, setLocationData] = useState<LocationLog[]>([]);

  const [leafletCssLoaded, setLeafletCssLoaded] = useState(false);
  const [leafletJsLoaded, setLeafletJsLoaded] = useState(false);

  const leafletLoaded = leafletCssLoaded && leafletJsLoaded;

  // --------------------------------------------------
  // HEADERS
  // --------------------------------------------------

  const requestHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code || "",
      name: user?.name || "",
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // ALERT
  // --------------------------------------------------

  const showAlert = useCallback(
    (message: string, icon: "success" | "error" | "warning" | "info") => {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon,
        title: message,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
      });
    },
    [],
  );

  // --------------------------------------------------
  // EMPLOYEE MASTER API
  // POST /employee/all
  // --------------------------------------------------

  const fetchEmployees = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      setEmployeeLoading(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/all`,
        {},
        {
          headers: requestHeaders,
        },
      );

      const rows =
        response.data?.data ||
        response.data?.Data ||
        response.data?.Employee_Data ||
        response.data?.employeeData ||
        [];

      const formatted: SelectOption[] = (Array.isArray(rows) ? rows : [])
        .map((item: any) => {
          const code =
            item.EMPCODE ??
            item.Emp_Code ??
            item.EmpCode ??
            item.Empcode ??
            item.value ??
            item.Value ??
            item.UTD ??
            "";

          const name =
            item.NAME ??
            item.Emp_Name ??
            item.Employee_Name ??
            item.EmpName ??
            item.Emp_Name1 ??
            item.label ??
            item.name ??
            "";

          return {
            value: String(code),
            label: `${code} · ${name}`.trim(),
          };
        })
        .filter((item: SelectOption) => item.value && item.label);

      setEmployees(formatted);
    } catch (error) {
      console.error("Employee API Error:", error);

      showAlert(getErrorMessage(error, "Unable to load employees."), "error");
    } finally {
      setEmployeeLoading(false);
    }
  }, [user?.Comp_Code, requestHeaders, showAlert]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // --------------------------------------------------
  // EMPLOYEE CHANGE
  // --------------------------------------------------

  const handleEmployeeChange = (_name: string, value: any) => {
    const selected =
      typeof value === "string" ? value : (value?.target?.value ?? "");

    setSelectedEmployee(String(selected));
  };

  // --------------------------------------------------
  // TRIP CHANGE
  // --------------------------------------------------

  const handleTripChange = (_name: string, value: any) => {
    const selected =
      typeof value === "string" ? value : (value?.target?.value ?? "");

    setSelectedTrip(String(selected));
  };

  // --------------------------------------------------
  // DATE CHANGE
  // --------------------------------------------------

  const handleDateChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: any,
  ) => {
    setter(typeof value === "string" ? value : (value?.target?.value ?? ""));
  };

  const handleDateFrom = (_name: string, value: any) => {
    handleDateChange(setDateFrom, value);
  };

  const handleDateTo = (_name: string, value: any) => {
    handleDateChange(setDateTo, value);
  };

  // --------------------------------------------------
  // NORMALIZE TRIP DATA
  // --------------------------------------------------

  const normalizeTripRows = (rows: any[]): TripRow[] => {
    return rows.map((item: any, index: number) => {
      const tourId = String(
        item.Tour_ID ??
          item.TOUR_ID ??
          item.TourId ??
          item.TRIP_ID ??
          item.Trip_ID ??
          item.id ??
          "—",
      );

      const tripName = String(
        item.Trip_Name ??
          item.TRIP_NAME ??
          item.TripName ??
          item.trip_name ??
          item.NAME ??
          "—",
      );

      const startDate =
        item.Actual_Start_DateTime ??
        item.ACTUAL_START_DATETIME ??
        item.START_DATE ??
        item.Start_Date ??
        item.StartDate ??
        "";

      const endDate =
        item.Actual_End_DateTime ??
        item.ACTUAL_END_DATETIME ??
        item.END_DATE ??
        item.End_Date ??
        item.EndDate ??
        "";

      const status = String(
        item.Status ??
          item.STATUS ??
          item.TRIP_STATUS ??
          item.Trip_Status ??
          "—",
      );

      const endReason = String(
        item.End_Reason ??
          item.END_REASON ??
          item.EndReason ??
          item.REMARK ??
          item.Remark ??
          "",
      );

      const id = String(item.UTD ?? item.ID ?? item.id ?? tourId ?? index);

      return {
        ...item,

        id,
        tourId,
        tripName,
        startDate: String(startDate || ""),
        endDate: String(endDate || ""),
        status,
        endReason,

        Tour_ID: tourId,
        Trip_Name: tripName,
        Actual_Start_DateTime: String(startDate || ""),
        Actual_End_DateTime: String(endDate || ""),
        Status: status,
        End_Reason: endReason,

        raw: item,
      };
    });
  };

  // --------------------------------------------------
  // SHOW TRIP REPORT
  // GET /mobile/getTripListByEmpDate
  // --------------------------------------------------

  const showReport = async () => {
    if (!user?.Comp_Code) {
      showAlert("User information missing. Please login again.", "error");
      return;
    }

    if (!selectedEmployee) {
      showAlert("Please select an employee.", "warning");
      return;
    }

    if (!dateFrom || !dateTo) {
      showAlert("Please select Date From and Date To.", "warning");
      return;
    }

    if (dateFrom > dateTo) {
      showAlert("Date From cannot be greater than Date To.", "warning");
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);

      setTripRows([]);
      setTripNames([]);
      setSelectedTrip("");

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getTripListByEmpDate`,
        {
          params: {
            EMP_Code: selectedEmployee,
            Date: dateFrom,
            DateTo: dateTo,
          },
          headers: requestHeaders,
        },
      );

      const rows =
        response.data?.Result ||
        response.data?.result ||
        response.data?.Data ||
        response.data?.data ||
        [];

      if (!Array.isArray(rows)) {
        setTripRows([]);
        showAlert("Invalid trip report response.", "warning");
        return;
      }

      const formatted = normalizeTripRows(rows);

      setTripRows(formatted);

      // Create unique trip options using Tour_ID
      const uniqueTrips = Array.from(
        new Map(
          formatted
            .filter((item) => item.Tour_ID && item.Tour_ID !== "—")
            .map((item) => [
              item.Tour_ID,
              {
                value: item.Tour_ID,
                label: item.Trip_Name,
              },
            ]),
        ).values(),
      );

      setTripNames(uniqueTrips);

      if (!formatted.length) {
        showAlert("No trip records found.", "info");
      }
    } catch (error) {
      console.error("Trip Report Error:", error);

      showAlert(getErrorMessage(error, "Unable to load trip report."), "error");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // TRIP NAME FILTER
  // --------------------------------------------------

  const filteredTripRows = useMemo(() => {
    if (!selectedTrip || selectedTrip === "ALL") {
      return tripRows;
    }

    return tripRows.filter(
      (item) => String(item.Tour_ID) === String(selectedTrip),
    );
  }, [tripRows, selectedTrip]);

  // --------------------------------------------------
  // LOAD LEAFLET CSS + JS
  // --------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.L) {
      setLeafletCssLoaded(true);
      setLeafletJsLoaded(true);
      return;
    }

    // CSS
    const existingLink = document.querySelector(
      'link[data-leaflet="true"]',
    ) as HTMLLinkElement | null;

    if (existingLink) {
      setLeafletCssLoaded(true);
    } else {
      const link = document.createElement("link");

      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

      link.setAttribute("data-leaflet", "true");

      link.onload = () => setLeafletCssLoaded(true);

      document.head.appendChild(link);
    }

    // JS
    const existingScript = document.querySelector(
      'script[data-leaflet="true"]',
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.L) {
        setLeafletJsLoaded(true);
      } else {
        existingScript.addEventListener(
          "load",
          () => setLeafletJsLoaded(true),
          { once: true },
        );
      }
    } else {
      const script = document.createElement("script");

      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

      script.async = true;
      script.setAttribute("data-leaflet", "true");

      script.onload = () => setLeafletJsLoaded(true);

      document.body.appendChild(script);
    }
  }, []);

  // --------------------------------------------------
  // FETCH LOCATION LOG
  // GET /mobile/getTripLocationLog
  // --------------------------------------------------

  const fetchLocationLog = async (tourId: string) => {
    if (!user?.Comp_Code) return;

    setRouteLoading(true);
    setLocationData([]);

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getTripLocationLog`,
        {
          params: {
            Tour_ID: tourId,
          },
          headers: requestHeaders,
        },
      );

      const rows =
        response.data?.Result ||
        response.data?.result ||
        response.data?.Data ||
        response.data?.data ||
        [];

      const formatted = Array.isArray(rows) ? rows : [];

      setLocationData(formatted);

      if (!formatted.length) {
        showAlert("No location logs found for this trip.", "info");
      }
    } catch (error) {
      console.error("Trip Location Log Error:", error);

      showAlert(
        getErrorMessage(error, "Location data load nahi ho paya."),
        "error",
      );
    } finally {
      setRouteLoading(false);
    }
  };

  // --------------------------------------------------
  // OPEN TRIP ROUTE
  // --------------------------------------------------

  const openTripRoute = async (row: any) => {
    // DataTable may return original row or row.original
    const selectedRow = row?.original ?? row;

    if (!selectedRow) return;

    const tourId = String(
      selectedRow.Tour_ID ??
        selectedRow.tourId ??
        selectedRow.raw?.Tour_ID ??
        "",
    );

    if (!tourId) {
      showAlert("Trip ID not found.", "warning");
      return;
    }

    setSelectedTripRow(selectedRow);
    setLocationData([]);
    setRouteModal(true);

    await fetchLocationLog(tourId);
  };

  // --------------------------------------------------
  // RENDER LEAFLET MAP
  // --------------------------------------------------

  useEffect(() => {
    if (
      !routeModal ||
      routeLoading ||
      !leafletLoaded ||
      locationData.length === 0
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const L = window.L;
      const container = document.getElementById("tripLocationMap");

      if (!L || !container) return;

      // Remove previous map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const validPoints = locationData
        .map((loc) => ({
          ...loc,
          lat: Number.parseFloat(String(loc.Latitude ?? "")),
          lng: Number.parseFloat(String(loc.Longitude ?? "")),
        }))
        .filter((loc) => Number.isFinite(loc.lat) && Number.isFinite(loc.lng));

      if (!validPoints.length) return;

      const map = L.map("tripLocationMap", {
        scrollWheelZoom: true,
      }).setView([validPoints[0].lat, validPoints[0].lng], 15);

      mapInstanceRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        referrerPolicy: "strict-origin-when-cross-origin",
      }).addTo(map);

      const latlngs: [number, number][] = [];

      validPoints.forEach((loc, index) => {
        latlngs.push([loc.lat, loc.lng]);

        const isFail = loc.Fetch_Status && loc.Fetch_Status !== "SUCCESS";

        const bg = isFail ? "#DC2626" : "#FF5944";

        const numberIcon = L.divIcon({
          className: "",
          html: `<div style="
            background:${bg};
            color:#ffffff;
            width:24px;
            height:24px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:11px;
            font-weight:700;
            border:2px solid #ffffff;
            box-shadow:0 1px 4px rgba(0,0,0,0.4);
          ">${index + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: numberIcon }).addTo(
          map,
        );

        const fetchedAt = loc.Fetched_At
          ? new Date(loc.Fetched_At).toLocaleString()
          : "-";

        marker.bindPopup(`
          <b>#${index + 1}</b><br/>
          ${loc.Address || "-"}<br/>
          ${fetchedAt}<br/>
          Status: ${loc.Fetch_Status || "-"}
          ${loc.Reason ? `<br/>Reason: ${loc.Reason}` : ""}
        `);
      });

      // Connect location points
      if (latlngs.length > 1) {
        L.polyline(latlngs, {
          color: "#1f3b73",
          weight: 4,
        }).addTo(map);

        map.fitBounds(L.latLngBounds(latlngs), {
          padding: [40, 40],
          maxZoom: 17,
        });
      }

      map.invalidateSize();

      window.setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [routeModal, routeLoading, leafletLoaded, locationData]);

  // --------------------------------------------------
  // CLOSE ROUTE MODAL
  // --------------------------------------------------

  const closeRouteModal = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    setRouteModal(false);
    setSelectedTripRow(null);
    setLocationData([]);
  };

  // Cleanup map when component unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------
  // DATA TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo(
    () => [
      {
        Header: "TOUR ID",
        accessor: "Tour_ID",
        minWidth: 130,
        width: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-[#172b4d] dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "TRIP NAME",
        accessor: "Trip_Name",
        minWidth: 160,
        width: 200,
        Cell: ({ value }: any) => (
          <span className="text-[#172b4d] dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "START DATE",
        accessor: "Actual_Start_DateTime",
        minWidth: 140,
        width: 160,
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[#172b4d] dark:text-slate-200">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "END DATE",
        accessor: "Actual_End_DateTime",
        minWidth: 140,
        width: 160,
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[#172b4d] dark:text-slate-200">
            {value ? formatDate(value) : "—"}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "Status",
        minWidth: 130,
        width: 150,
        Cell: ({ value }: any) => (
          <span className={getStatusClass(String(value || ""))}>
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "END REASON",
        accessor: "End_Reason",
        minWidth: 160,
        width: 200,
        Cell: ({ value }: any) => (
          <span className="text-[#172b4d] dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

  const resetFilters = () => {
    setDateFrom(globalDateRange?.from || getCurrentDate(1));
    setDateTo(globalDateRange?.to || getCurrentDate());
    setSelectedEmployee("");
    setSelectedTrip("");
    setTripRows([]);
    setTripNames([]);
    setHasSearched(false);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-3 py-3 text-[#172b4d] transition-colors dark:bg-slate-950 dark:text-slate-100 sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* PAGE HEADER */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold text-[#172b4d] dark:text-slate-100 sm:text-[24px]">
            Trip Report
          </h1>
        </div>

        {/* FILTER CARD */}
        <div className="mb-4 rounded-2xl border border-[#dce5f0] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            {/* DATE FROM */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Einput
                name="dateFrom"
                type="date"
                title="Date from"
                value={dateFrom}
                handleInputChange={handleDateFrom}
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Einput
                name="dateTo"
                type="date"
                title="Date to"
                value={dateTo}
                handleInputChange={handleDateTo}
                className="h-[40px] w-full"
              />
            </div>

            {/* EMPLOYEE */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Eselect
                name="employee"
                title="Employee"
                option={[{ value: "", label: "Select employee" }, ...employees]}
                initialValue={selectedEmployee}
                handleInputChange={handleEmployeeChange}
                className="h-[40px] w-full"
              />

              {employeeLoading && (
                <p className="mt-1 text-xs text-slate-400">
                  Loading employees...
                </p>
              )}
            </div>

            {/* TRIP NAME */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Eselect
                name="tripName"
                title="Trip name"
                option={[{ value: "", label: "All trips" }, ...tripNames]}
                initialValue={selectedTrip}
                handleInputChange={handleTripChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* SHOW BUTTON */}
            <AButton
              type="button"
              onClick={showReport}
              disabled={loading || employeeLoading}
              className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Loading...
                </>
              ) : (
                "Show"
              )}
            </AButton>
          </div>
        </div>

        {/* TIP */}
        <div className="mb-4 flex items-center gap-2 text-sm text-[#61748f] dark:text-slate-400">
          <MapPin size={16} />
          Tip: double-click a row to view its location route.
        </div>

        {/* DATA TABLE */}
        <div className="mt-4">
          {loading ? (
            <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              Loading trip report...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredTripRows}
              showExcelExport={true}
              showTopSearch={true}
              resetFilters={true}
              showPageSizeInFooter={true}
              showColumnFilters={true}
              onRowDoubleClick={openTripRoute}
            />
          )}

          {!loading && !hasSearched && tripRows.length === 0 && (
            <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
              Select filters and click Show to view trip records.
            </p>
          )}

          {!loading && hasSearched && tripRows.length === 0 && (
            <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
              No trip records found.
            </p>
          )}
        </div>
      </div>

      {/* --------------------------------------------------
          TRIP ROUTE MODAL
      -------------------------------------------------- */}

      {routeModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px]"
          onClick={closeRouteModal}
        >
          <div
            className="w-full max-w-[700px] overflow-hidden rounded-2xl border border-[#e3eaf3] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-[#e3eaf3] px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-[#172b4d] dark:text-slate-100">
                  Trip Location Route
                </h2>

                {selectedTripRow && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedTripRow.Tour_ID} · {selectedTripRow.Trip_Name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeRouteModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="max-h-[65vh] overflow-y-auto p-5">
              {routeLoading || !leafletLoaded ? (
                <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  Loading route details...
                </div>
              ) : locationData.length === 0 ? (
                <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 dark:text-slate-400">
                  <MapPin size={30} className="text-slate-300" />
                  No location route details available.
                </div>
              ) : (
                <>
                  <div
                    id="tripLocationMap"
                    style={{
                      height: "420px",
                      width: "100%",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                    }}
                  />

                  <div className="mt-3 max-h-40 space-y-1 overflow-y-auto border-t border-[#e3eaf3] pt-2 dark:border-slate-700">
                    {locationData.map((loc, index) => (
                      <div
                        key={loc.Log_ID ?? index}
                        className="flex items-center justify-between gap-2 border-b border-[#f1f5f9] px-1 py-2 text-xs dark:border-slate-700"
                      >
                        <span
                          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{
                            backgroundColor:
                              loc.Fetch_Status === "SUCCESS"
                                ? "#FF5944"
                                : "#DC2626",
                          }}
                        >
                          {index + 1}
                        </span>

                        <span className="flex-1 truncate text-[#334155] dark:text-slate-200">
                          {loc.Address || "—"}
                        </span>

                        <span className="whitespace-nowrap text-slate-400">
                          {loc.Fetched_At
                            ? new Date(loc.Fetched_At).toLocaleString()
                            : "—"}
                        </span>

                        <span
                          className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] text-white"
                          style={{
                            backgroundColor:
                              loc.Fetch_Status === "SUCCESS"
                                ? "#16A34A"
                                : "#DC2626",
                          }}
                        >
                          {loc.Fetch_Status || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex justify-end border-t border-[#e3eaf3] px-5 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={closeRouteModal}
                className="h-[38px] rounded-lg border border-[#dce5f0] bg-white px-5 text-sm font-semibold text-[#172b4d] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripReportPage;
