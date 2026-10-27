"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Swal from "sweetalert2";
import useExcelDownload from "@/app/hooks/excel-download";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

export default function CompOffGenerationPage() {
    const user = useCurrentUser();
    const { handleExcelDownload } = useExcelDownload();

    const [locationData, setLocationData] = useState<any[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<any[]>([]);
    const [locationSearch, setLocationSearch] = useState("");
    const [empCode, setEmpCode] = useState("");
    const [employeedata, setEmployeedata] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [selectedEmpCodes, setSelectedEmpCodes] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const isJustPreviewedRef = React.useRef(false);

    function showSideAlert(message: string, type: "success" | "error" | "warning") {
        const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
        });
        Toast.fire({ icon: type, title: message });
    }

    // Fetch branches / locations
    const fetchLocationData = async () => {
        if (user?.EMPCODE && user?.Comp_Code) {
            try {
                const locationsArray = user?.branch
                    ? String(user.branch).split(",").map(Number)
                    : [];
                const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunGetLocation_1`,
                    { locations: locationsArray },
                    { headers: { compcode: user.Comp_Code, name: user.name } }
                );
                setLocationData(response?.data?.results || []);
            } catch (error) {
                console.error("Error fetching locations:", error);
            }
        }
    };

    useEffect(() => {
        if (user?.branch) fetchLocationData();
    }, [user?.branch]);

    // Fetch all employees
    const fetchemployeedata = async () => {
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/employee/All`,
                {},
                {
                    headers: {
                        compcode: user?.Comp_Code,
                        name: user?.name,
                    },
                }
            );
            setEmployeedata(response.data?.data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    useEffect(() => {
        if (user?.Comp_Code) {
            fetchemployeedata();
        }
    }, [user?.Comp_Code]);

    // Map employee options for Eselect
    const employeeOptions = useMemo(() => {
        const list = (employeedata || []).map((emp: any) => {
            const code = String(
                emp.emp_code || emp.EMP_CODE || emp.Emp_Code || emp.value || ""
            ).trim();
            let name = String(
                emp.emp_name || emp.EMP_NAME || emp.Emp_Name || emp.label || ""
            ).trim();

            // If name already starts with the empcode, strip the prefix to prevent duplication
            if (code && name.startsWith(code)) {
                name = name.slice(code.length).replace(/^[\s\-–—:]+/, "").trim();
            }

            const label = code && name ? `${code} - ${name}` : code || name;

            return {
                value: code,
                label,
            };
        });
        return [{ value: "", label: "All Employee" }, ...list];
    }, [employeedata]);

    // Location filter logic
    const filteredLocations = useMemo(() => {
        return locationData.filter((l) =>
            l.label?.toLowerCase().includes(locationSearch.toLowerCase())
        );
    }, [locationData, locationSearch]);

    const handleLocationCheckbox = (value: any) => {
        setSelectedLocations((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };

    const handleSelectAllLocations = () => {
        if (
            selectedLocations.length === filteredLocations.length &&
            filteredLocations.length > 0
        ) {
            setSelectedLocations([]);
        } else {
            setSelectedLocations(filteredLocations.map((l) => l.value));
        }
    };

    // Auto-select all employees whenever previewData is loaded
    useEffect(() => {
        if (previewData?.employees?.length) {
            isJustPreviewedRef.current = true;
            const allSelected = previewData.employees.map((e: any) => ({
                id: e.empCode,
                empCode: e.empCode,
                ...e,
            }));
            setSelectedRows(allSelected);
            setSelectedEmpCodes(previewData.employees.map((e: any) => e.empCode));
            const timer = setTimeout(() => {
                isJustPreviewedRef.current = false;
            }, 500);
            return () => clearTimeout(timer);
        } else {
            isJustPreviewedRef.current = false;
            setSelectedRows([]);
            setSelectedEmpCodes([]);
        }
    }, [previewData]);

    // Handler for table row & select-all changes
    const handleTableSelectionChange = (rows: any[]) => {
        // Ignore initial empty reset from ServiceTablePagination right after preview load
        if (
            isJustPreviewedRef.current &&
            rows.length === 0 &&
            (previewData?.employees?.length || 0) > 0
        ) {
            return;
        }
        setSelectedRows(rows);
        setSelectedEmpCodes(rows.map((r: any) => r.empCode || r.id));
    };

    // Preview API call
    const handlePreview = async () => {
        if (selectedLocations.length === 0) {
            showSideAlert("Please select at least one branch/location", "warning");
            return;
        }

        setIsLoading(true);
        setPreviewData(null);
        setSelectedEmpCodes([]);
        setSelectedRows([]);
        isJustPreviewedRef.current = false;

        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/ars/PreviewCompOff`,
                {
                    empCode: empCode.trim() || undefined,
                    locations: selectedLocations,
                },
                {
                    headers: {
                        compcode: user?.Comp_Code,
                        name: user?.name,
                    },
                }
            );

            if (response.data.Status) {
                isJustPreviewedRef.current = true;
                setPreviewData(response.data.Result);
                const empList = response.data.Result?.employees || [];
                const allSelected = empList.map((e: any) => ({
                    id: e.empCode,
                    empCode: e.empCode,
                    ...e,
                }));
                setSelectedRows(allSelected);
                setSelectedEmpCodes(empList.map((e: any) => e.empCode));
                if (empList.length === 0) {
                    showSideAlert("No Eligible employees found", "warning");
                }
            } else {
                showSideAlert(response.data.Message || "Preview failed", "error");
            }
        } catch (error: any) {
            showSideAlert(
                error?.response?.data?.Message || "Error fetching preview",
                "error"
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Generate / Update Comp-off API call
    const handleUpdate = async () => {
        if (!selectedEmpCodes.length) {
            showSideAlert("Please select at least one employee", "warning");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/ars/ManualGenerateCompOff`,
                {
                    empCode: empCode.trim() || undefined,
                    locations: selectedLocations,
                    selectedEmpCodes,
                },
                { headers: { compcode: user?.Comp_Code, name: user?.name } }
            );

            if (response.data.Status) {
                showSideAlert(response.data.Message, "success");
                setPreviewData(null);
                setSelectedEmpCodes([]);
                setSelectedRows([]);
            } else {
                showSideAlert(response.data.Message || "Generation failed", "error");
            }
        } catch (error: any) {
            showSideAlert(
                error?.response?.data?.Message || "Error generating comp-off",
                "error"
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Export to Excel
    const exportColumns = useMemo(() => [
        {
            Header: "Emp Code",
            accessor: "empCode",
        },
        {
            Header: "Employee Name",
            accessor: "empName",
        },
        {
            Header: "Location",
            accessor: "locationLabel",
        },
        {
            Header: "Full Hr",
            accessor: "fullHr",
        },
        {
            Header: "Half Hr",
            accessor: "halfHr",
        },
    ], []);


    // Format cycle date
    const formatCycleDate = (dateStr?: string) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    const cycleDisplay = useMemo(() => {
        if (previewData?.fromDate && previewData?.toDate) {
            return `${formatCycleDate(previewData.fromDate)} – ${formatCycleDate(previewData.toDate)}`;
        }
        return "01 Oct 2026 – 31 Oct 2026";
    }, [previewData?.fromDate, previewData?.toDate]);

    // React Table Data Transformation
    const tableData = useMemo(() => {
        if (!previewData?.employees) return [];
        return previewData.employees.map((e: any) => {
            const locObj = locationData.find(
                (loc: any) => String(loc.value) === String(e.location)
            );
            const fullHr =
                e.fullHr ??
                e.coFullHour ??
                (e.dates
                    ? e.dates.filter((d: any) => Number(d.coValue) === 1).length
                    : 0);
            const halfHr =
                e.halfHr ??
                e.coHalfHour ??
                (e.dates
                    ? e.dates.filter((d: any) => Number(d.coValue) === 0.5).length
                    : 0);

            return {
                id: e.empCode,
                ...e,
                locationLabel:
                    locObj?.label || (e.location ? `Branch - ${e.location}` : "-"),
                fullHr,
                halfHr,
            };
        });
    }, [previewData?.employees, locationData]);

    // Columns definition for ServiceTablePagination with medium font size
    const columns = useMemo(
        () => [
            {
                Header: "EMP CODE",
                accessor: "empCode",
                Cell: ({ value }: any) => (
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-md">
                        {value}
                    </span>
                ),
            },
            {
                Header: "EMPLOYEE",
                accessor: "empName",
                Cell: ({ value }: any) => (
                    <span className="text-slate-700 dark:text-slate-300 text-md font-medium">
                        {value}
                    </span>
                ),
            },
            {
                Header: "BRANCH",
                accessor: "locationLabel",
                Cell: ({ value }: any) => (
                    <span className="text-slate-500 dark:text-slate-400 text-md font-medium">
                        {value}
                    </span>
                ),
            },
            {
                Header: "FULL HR",
                accessor: "fullHr",
                Cell: ({ value }: any) => (
                    <span className="text-slate-700 dark:text-slate-300 text-md font-medium">
                        {value}
                    </span>
                ),
            },
            {
                Header: "HALF HR",
                accessor: "halfHr",
                Cell: ({ value }: any) => (
                    <span className="text-slate-700 dark:text-slate-300 text-md font-medium">
                        {value}
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] p-4 sm:p-6 lg:p-7 space-y-4">
            {/* Top Breadcrumbs & Page Header matching Screenshot 1 & 2 */}


            {/* Main 2-Column Layout */}
            <div className="flex flex-col lg:flex-row gap-5 items-start">
                {/* Left Filter Card - compact fixed width matching reference */}
                <div className="w-full lg:w-[260px] xl:w-[270px] shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-3.5">
                    {/* Employee Dropdown using Eselect atom */}
                    <div>
                        <label className="text-[12px] font-normal text-slate-500 dark:text-slate-400 mb-1.5 block">
                            Employee
                        </label>
                        <Eselect
                            title=""
                            name="empCode"
                            option={employeeOptions}
                            initialValue={empCode}
                            handleInputChange={(name, val) => setEmpCode(val || "")}
                            placeholder="All Employee"
                            className="!h-10 sm:!h-10 !rounded-lg !border-slate-200 dark:!border-slate-700/80 !text-md !px-3 font-normal"
                        />
                    </div>

                    {/* Branch / Location Section */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400">
                                Branch / Location
                            </span>
                            <AButton
                                type="button"
                                variant="link"
                                onClick={handleSelectAllLocations}
                                className="!p-0 !h-auto text-md font-medium !text-[#4F46E5] hover:!text-[#4338CA] dark:!text-[#818CF8] hover:underline cursor-pointer"
                            >
                                {selectedLocations.length === filteredLocations.length &&
                                    filteredLocations.length > 0
                                    ? "Deselect all"
                                    : "Select all branches"}
                            </AButton>
                        </div>

                        {/* Inner Location Box with Search & Checkboxes */}
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                            {/* Search input using Einput atom */}
                            <Einput
                                title=""
                                type="text"
                                name="locationSearch"
                                value={locationSearch}
                                handleInputChange={(name, val) => setLocationSearch(val || "")}
                                placeholder="Search location"
                                className="!h-8 !rounded-none !border-0 !border-b !border-slate-100 dark:border-slate-800 !text-md !shadow-none !px-3 bg-white dark:bg-slate-900 focus-visible:!ring-0 placeholder:!text-slate-400"
                            />

                            {/* Scrollable Checkbox List */}
                            <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                                {filteredLocations.length > 0 ? (
                                    filteredLocations.map((loc) => {
                                        const isChecked = selectedLocations.includes(loc.value);
                                        return (
                                            <label
                                                key={loc.value}
                                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs text-slate-700 dark:text-slate-300 select-none transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleLocationCheckbox(loc.value)}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                                                />
                                                <span className="truncate">{loc.label}</span>
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div className="py-3 text-center text-xs text-slate-400">
                                        No locations found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview Button using AButton atom */}
                    <AButton
                        variant="primary"
                        size="md"
                        fullWidth
                        onClick={handlePreview}
                        loading={isLoading}
                        className="w-full !bg-[#4F46E5] hover:!bg-[#4338CA] text-white font-medium !rounded-lg !py-2 !h-9 text-md shadow-xs transition-colors"
                    >
                        Preview
                    </AButton>
                </div>

                {/* Right Preview Card */}
                <div className="w-full flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col min-h-[460px] overflow-hidden">
                    {/* Preview Header matching Screenshot 1 & 2 */}
                    <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    Comp-off preview
                                </h2>

                                {/* Badges Row */}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {/* Cycle Date Badge */}
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        <span className="font-normal text-slate-500 dark:text-slate-400">
                                            Cycle
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-100">
                                            {cycleDisplay}
                                        </span>
                                    </div>

                                    {/* Full Hr Badge */}
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-md bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-400 font-medium">
                                        <span>Full Hr</span>
                                        <span className="font-bold">
                                            {previewData?.coFullHour ?? 1}
                                        </span>
                                    </div>

                                    {/* Half Hr Badge */}
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-md bg-[#FFFBEB] dark:bg-amber-950/40 text-[#D97706] dark:text-amber-400 font-medium">
                                        <span>Half Hr</span>
                                        <span className="font-bold">
                                            {previewData?.coHalfHour ?? 2}
                                        </span>
                                    </div>

                                    {/* Employees Badge */}
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-md bg-[#EEF2FF] dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 font-medium">
                                        <span>Employees</span>
                                        <span className="font-bold">
                                            {previewData?.employees?.length ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Export to Excel Action */}
                            {/* <div className="shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!previewData?.employees?.length}
                  className="inline-flex items-center px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Export to Excel
                </button>
              </div> */}
                        </div>
                    </div>

                    {/* Content Area: Table using ServiceTablePagination or Empty State */}
                    {tableData.length > 0 ? (
                        <div className="flex-1 w-full min-w-0 flex flex-col justify-between overflow-hidden">
                            <div className="w-full min-w-0 flex-1 overflow-x-auto touch-auto">
                                <ServiceTablePagination
                                    columns={columns}
                                    data={tableData}
                                    check={true}
                                    selectValue="empCode"
                                    selectedRows={selectedRows}
                                    setSelectedRows={handleTableSelectionChange}
                                    setsellectedrowdata={handleTableSelectionChange}
                                    showTopSearch={false}
                                    showExcelExport={true}
                                    columnsDownload={exportColumns}
                                    onExportAll={() => tableData}
                                    showPageSizeInFooter={false}
                                    initialPageSize={10}
                                    height="auto"
                                    size="small"
                                    containerClassName="border-0 shadow-none bg-transparent [&_thead]:!bg-transparent [&_th]:!py-2.5 [&_th]:!px-4 [&_th]:!text-[11px] [&_th]:!font-semibold [&_th]:!text-slate-400 [&_th]:!tracking-wider [&_th]:!border-b [&_th]:!border-slate-100 [&_th]:!bg-transparent [&_th_span.ml-2]:!hidden [&_td]:!py-2.5 [&_td]:!px-4 [&_td]:!text-sm [&_td]:!font-medium [&_td]:!border-b [&_td]:!border-slate-100/80 [&_.border-t]:!border-slate-100 [&_.border-t]:!py-2.5 [&_.border-t]:!px-4 [&_.border-t_div]:!text-xs [&_.border-t_button]:!py-1 [&_.border-t_button]:!px-3 [&_.border-t_button]:!text-xs [&_.border-t_button]:!rounded-lg [&_table]:!min-w-[650px] [&_table]:!w-full [&_.custom-scrollbar]:!touch-auto"
                                />
                            </div>

                            {/* Footer with Selection info and Update / Generate Action */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedEmpCodes.length}
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {previewData.employees.length}
                                    </span>{" "}
                                    employee(s) eligible
                                </div>
                                <AButton
                                    variant="primary"
                                    size="sm"
                                    onClick={handleUpdate}
                                    disabled={!selectedEmpCodes.length || isLoading}
                                    className="!bg-[#4F46E5] hover:!bg-[#4338CA] text-white !rounded-lg !px-4 !py-1.5 text-xs font-semibold shadow-xs"
                                >
                                    Generate Comp-Off ({selectedEmpCodes.length})
                                </AButton>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-12 min-h-[360px] text-center">
                            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-normal">
                                Select branches and click Preview.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Hashloader */}
            <HashloaderComponent isLoading={isLoading} />
        </div>
    );
}
