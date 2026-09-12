"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  ScanLine,
  Clock,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Moon,
  Eraser,
  CheckCircle2,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import DataTable from "@/components/Templates/reacttable";
import SelectSearch from "@/components/atoms/Select";
import { AddMaster1, FindMaster } from "@/action/masters";

export default function HrMasterPage() {
  const router = useRouter();
  const user = useCurrentUser();

  // Active Tab: 1 = MisPunch Reason, 2 = Shift Master, 3 = Holiday Master
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // =========================================================================
  // 1. MISPUNCH REASON STATE & FUNCTIONS
  // =========================================================================
  const [tableMisPunch, setTableMisPunch] = useState<any[]>([]);
  const [saveDisabledMisPunch, setSaveDisabledMisPunch] = useState(false);
  const [updateDisabledMisPunch, setUpdateDisabledMisPunch] = useState(true);

  const [formDataMisPunch, setFormDataMisPunch] = useState({
    Misc_Name: "",
    Misc_Abbr: "",
    Misc_Dtl1: "Actual",
    Misc_Dtl3: "0",
    Misc_Dtl2: "Actual",
    Misc_Num1: "0",
    MISC_NUM2: "0",
    Misc_Mob: "0",
    UTD: "",
    Exp_Date: null as any,
    CC_Group: "0",
    CC_Ledg: "0",
    Created_By: user?.name,
    Loc_Code: user?.branch,
  });

  const PresentValueOptions = [
    { label: "Actual", value: "Actual" },
    { label: "0", value: "0" },
    { label: ".25", value: ".25" },
    { label: ".50", value: ".50" },
    { label: ".65", value: ".65" },
    { label: ".75", value: ".75" },
    { label: "-1", value: "-1" },
  ];

  const AbsentValueOptions = [
    { label: "Actual", value: "Actual" },
    { label: "0", value: "0" },
    { label: ".25", value: ".25" },
    { label: ".50", value: ".50" },
    { label: ".65", value: ".65" },
    { label: ".75", value: ".75" },
    { label: "-1", value: "-1" },
    { label: "2", value: "2" },
  ];

  const LeaveValueOptions = [
    { label: "0", value: "0" },
    { label: "1", value: "1" },
    { label: ".5", value: ".5" },
    { label: ".25", value: ".25" },
  ];

  const InTimeOptions = [
    { label: "Actual", value: "0" },
    { label: "Shift Time", value: "1" },
    { label: "Not Required", value: "2" },
  ];

  const fetchMisPunchData = async () => {
    if (!user?.Comp_Code) return;
    setIsLoading(true);
    try {
      const data = { Misc_Type: 92 };
      const response = await FindMaster(data, user);
      if (response?.data?.MiscMst) {
        setTableMisPunch(response.data.MiscMst);
      }
    } catch (error) {
      console.error("Error fetching mispunch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputMisPunch = (name: string, value: any) => {
    setFormDataMisPunch((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearMisPunch = () => {
    setFormDataMisPunch({
      Misc_Name: "",
      Misc_Abbr: "",
      Misc_Dtl1: "Actual",
      Misc_Dtl3: "0",
      Misc_Dtl2: "Actual",
      Misc_Num1: "0",
      MISC_NUM2: "0",
      Misc_Mob: "0",
      UTD: "",
      Exp_Date: null,
      CC_Group: "0",
      CC_Ledg: "0",
      Created_By: user?.name,
      Loc_Code: user?.branch,
    });
    setSaveDisabledMisPunch(false);
    setUpdateDisabledMisPunch(true);
  };

  const handleSaveMisPunch = async () => {
    if (user?.branch?.toString().includes(",")) {
      Swal.fire({
        icon: "warning",
        title: "Not Allowed",
        text: "Multi branch not allowed to save entry",
      });
      return;
    }

    if (!formDataMisPunch.Misc_Name || formDataMisPunch.Misc_Name.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Mispunch Reason cannot be empty",
      });
      return;
    }

    const BodyData = {
      Created_by: user?.name,
      MiscMst: {
        Misc_Name: formDataMisPunch.Misc_Name,
        Misc_Abbr: formDataMisPunch.Misc_Abbr,
        Misc_Dtl1: formDataMisPunch.Misc_Dtl1,
        Misc_Dtl2: formDataMisPunch.Misc_Dtl2,
        Misc_Dtl3: formDataMisPunch.Misc_Dtl3,
        Misc_Num1: formDataMisPunch.Misc_Num1,
        MISC_NUM2: formDataMisPunch.MISC_NUM2,
        Misc_Mob: formDataMisPunch.Misc_Mob,
        Exp_Date: formDataMisPunch.Exp_Date,
        CC_Group: formDataMisPunch.CC_Group,
        CC_Ledg: formDataMisPunch.CC_Ledg,
        Misc_Type: 92,
        Loc_Code: user?.branch,
      },
    };

    setIsLoading(true);
    try {
      const response = await AddMaster1(BodyData, user);
      if (response === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Mispunch reason saved successfully.",
        });
        await fetchMisPunchData();
        handleClearMisPunch();
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to save mispunch reason",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMisPunch = async () => {
    if (!formDataMisPunch.Misc_Name || formDataMisPunch.Misc_Name.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Mispunch Reason cannot be empty",
      });
      return;
    }

    setIsLoading(true);
    const BodyData = {
      Created_by: user?.name,
      MiscMst: formDataMisPunch,
    };

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/master/updateMaster1/${formDataMisPunch?.UTD}`,
        BodyData,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (response?.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Mispunch reason updated successfully.",
        });
        await fetchMisPunchData();
        handleClearMisPunch();
      }
    } catch (e: any) {
      Swal.fire({
        icon: "warning",
        title: "Wait!",
        text: e?.response?.data?.message || "There is something wrong, please check the data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowSelectMisPunch = (rowData: any) => {
    let formattedExpDate = null;
    if (rowData?.Exp_Date) {
      try {
        formattedExpDate = new Date(rowData.Exp_Date).toISOString().split("T")[0];
      } catch (err) {
        formattedExpDate = null;
      }
    }

    setFormDataMisPunch({
      ...rowData,
      Exp_Date: formattedExpDate,
    });
    setSaveDisabledMisPunch(true);
    setUpdateDisabledMisPunch(false);
  };

  const columnsMisPunch = useMemo(
    () => [
      { Header: "SR NO", accessor: "Misc_Code", Cell: ({ value, row }: any) => value || row.index + 1 },
      {
        Header: "MISPUNCH REASON",
        accessor: "Misc_Name",
        Cell: ({ value }: any) => <span className="font-bold text-[#4F46E5] dark:text-indigo-400 uppercase">{value}</span>,
      },
      { Header: "STATUS", accessor: "Misc_Abbr", Cell: ({ value }: any) => value || "—" },
      { Header: "PRESENT VALUE", accessor: "Misc_Dtl1", Cell: ({ value }: any) => value || "—" },
      { Header: "ABSENT VALUE", accessor: "Misc_Dtl2", Cell: ({ value }: any) => value || "—" },
      { Header: "LEAVE VALUE", accessor: "Misc_Dtl3", Cell: ({ value }: any) => value || "—" },
      {
        Header: "ACTIONS",
        id: "actions",
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRowSelectMisPunch(row.original)}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 flex items-center justify-center transition-colors"
              title="Edit record"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                Swal.fire({
                  title: "Delete Reason?",
                  text: `Are you sure you want to delete ${row.original.Misc_Name}?`,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#EF4444",
                  confirmButtonText: "Yes, delete",
                });
              }}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-rose-500 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
              title="Delete record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // =========================================================================
  // 2. SHIFT MASTER STATE & FUNCTIONS
  // =========================================================================
  const [tableShift, setTableShift] = useState<any[]>([]);
  const [saveDisabledShift, setSaveDisabledShift] = useState(false);
  const [updateDisabledShift, setUpdateDisabledShift] = useState(true);

  // Shift Master Pagination State
  const [shiftPage, setShiftPage] = useState<number>(1);
  const [shiftPageSize, setShiftPageSize] = useState<number>(10);
  const [shiftSearchQuery, setShiftSearchQuery] = useState<string>("");

  const filteredShiftData = useMemo(() => {
    if (!shiftSearchQuery) return tableShift;
    const q = shiftSearchQuery.toLowerCase().trim();
    return tableShift.filter((item) =>
      String(item.Misc_Name || "").toLowerCase().includes(q) ||
      String(item.Misc_Code || "").toLowerCase().includes(q) ||
      String(item.Misc_Add1 || "").toLowerCase().includes(q) ||
      String(item.Misc_Add2 || "").toLowerCase().includes(q)
    );
  }, [tableShift, shiftSearchQuery]);

  const totalShiftRecords = filteredShiftData.length;
  const totalShiftPages = Math.max(
    1,
    Math.ceil(totalShiftRecords / (shiftPageSize === -1 ? totalShiftRecords || 1 : shiftPageSize))
  );

  const paginatedShiftData = useMemo(() => {
    if (shiftPageSize === -1) return filteredShiftData;
    const start = (shiftPage - 1) * shiftPageSize;
    return filteredShiftData.slice(start, start + shiftPageSize);
  }, [filteredShiftData, shiftPage, shiftPageSize]);

  const [formDataShift, setFormDataShift] = useState({
    Misc_Name: "",
    Misc_Add1: "",
    Misc_Add2: "",
    Misc_Num1: 0,
    UTD: "",
    Created_By: user?.name,
    Loc_Code: user?.branch,
  });

  const fetchShiftData = async () => {
    if (!user?.Comp_Code) return;
    setIsLoading(true);
    try {
      const data = { Misc_Type: 90 };
      const response = await FindMaster(data, user);
      if (response?.data?.MiscMst) {
        setTableShift(response.data.MiscMst);
      }
    } catch (error) {
      console.error("Error fetching shift data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputShift = (name: string, value: any) => {
    setFormDataShift((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearShift = () => {
    setFormDataShift({
      Misc_Name: "",
      Misc_Add1: "",
      Misc_Add2: "",
      Misc_Num1: 0,
      UTD: "",
      Created_By: user?.name,
      Loc_Code: user?.branch,
    });
    setSaveDisabledShift(false);
    setUpdateDisabledShift(true);
  };

  const validateFormShift = (data: any) => {
    if (!data.Misc_Name || data.Misc_Name.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Shift Name cannot be empty",
      });
      return false;
    }
    if (!data.Misc_Add1 || data.Misc_Add1.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Shift In Time cannot be empty",
      });
      return false;
    }
    if (!data.Misc_Add2 || data.Misc_Add2.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Shift Out Time cannot be empty",
      });
      return false;
    }
    return true;
  };

  const formatTimeToDot = (timeString: any) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const formattedHours = hours ? hours.padStart(2, "0") : "00";
    const formattedMinutes = minutes ? minutes.padStart(2, "0") : "00";
    return `${formattedHours}.${formattedMinutes}`;
  };

  const formatTimeToColon = (timeString: any) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.includes(".") ? timeString.split(".") : timeString.split(":");
    const formattedHours = hours ? hours.padStart(2, "0") : "00";
    const formattedMinutes = minutes ? minutes.padStart(2, "0") : "00";
    return `${formattedHours}:${formattedMinutes}`;
  };

  const handleSaveShift = async () => {
    if (!validateFormShift(formDataShift)) return;

    const BodyData = {
      Created_by: user?.name,
      MiscMst: {
        Misc_Name: formDataShift.Misc_Name,
        Misc_Add1: formatTimeToDot(formDataShift.Misc_Add1),
        Misc_Add2: formatTimeToDot(formDataShift.Misc_Add2),
        Misc_Num1: formDataShift.Misc_Num1 ? 1 : 0,
        Misc_Type: 90,
        Loc_Code: user?.branch,
      },
    };

    setIsLoading(true);
    try {
      const response = await AddMaster1(BodyData, user);
      if (response === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Shift master saved successfully.",
        });
        await fetchShiftData();
        handleClearShift();
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to save shift",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShift = async () => {
    if (!validateFormShift(formDataShift)) return;

    setIsLoading(true);
    const formattedFormData1 = {
      ...formDataShift,
      Misc_Add1: formatTimeToDot(formDataShift.Misc_Add1),
      Misc_Add2: formatTimeToDot(formDataShift.Misc_Add2),
      Misc_Num1: formDataShift.Misc_Num1 ? 1 : 0,
    };

    const BodyData = {
      Created_by: user?.name,
      MiscMst: formattedFormData1,
    };

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/master/updateMaster1/${formDataShift?.UTD}`,
        BodyData,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (response?.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Shift master updated successfully.",
        });
        await fetchShiftData();
        handleClearShift();
      }
    } catch (e: any) {
      Swal.fire({
        icon: "warning",
        title: "Wait!",
        text: e?.response?.data?.message || "There is something wrong, please check the data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowSelectShift = (rowData: any) => {
    const updatedRowData = {
      ...rowData,
      Misc_Add1: formatTimeToColon(rowData.Misc_Add1),
      Misc_Add2: formatTimeToColon(rowData.Misc_Add2),
      Misc_Num1: Number(rowData.Misc_Num1) === 1 ? 1 : 0,
    };

    setFormDataShift(updatedRowData);
    setSaveDisabledShift(true);
    setUpdateDisabledShift(false);
  };

  const columnsShift = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "Misc_Code",
        Cell: ({ value, row }: any) => {
          if (value) return value;
          const offset = shiftPageSize === -1 ? 0 : (shiftPage - 1) * shiftPageSize;
          return offset + row.index + 1;
        },
      },
      {
        Header: "SHIFT NAME",
        accessor: "Misc_Name",
        Cell: ({ value }: any) => <span className="font-bold text-[#4F46E5] dark:text-indigo-400 uppercase">{value}</span>,
      },
      { Header: "SHIFT IN TIME", accessor: "Misc_Add1", Cell: ({ value }: any) => formatTimeToColon(value) || "—" },
      { Header: "SHIFT OUT TIME", accessor: "Misc_Add2", Cell: ({ value }: any) => formatTimeToColon(value) || "—" },
      {
        Header: "ACTIONS",
        id: "actions",
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRowSelectShift(row.original)}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 flex items-center justify-center transition-colors"
              title="Edit record"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                Swal.fire({
                  title: "Delete Shift?",
                  text: `Are you sure you want to delete ${row.original.Misc_Name}?`,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#EF4444",
                  confirmButtonText: "Yes, delete",
                });
              }}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-rose-500 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
              title="Delete record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [shiftPage, shiftPageSize]
  );

  // =========================================================================
  // 3. HOLIDAY MASTER STATE & FUNCTIONS
  // =========================================================================
  const relCodeOptions = [
    { label: "ALL RELIGION", value: "1,2,3,4,5,6,7" },
    { value: "1", label: "Hindu" },
    { value: "2", label: "Muslim" },
    { value: "3", label: "Sikh" },
    { value: "4", label: "Christian" },
    { value: "5", label: "Jain" },
    { value: "6", label: "Buddhist" },
    { value: "7", label: "Parsi" },
  ];

  const [tableHoliday, setTableHoliday] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [saveDisabledHoliday, setSaveDisabledHoliday] = useState(false);
  const [updateDisabledHoliday, setUpdateDisabledHoliday] = useState(true);

  const [formDataHoliday, setFormDataHoliday] = useState<any>({
    Holiday_Name: "",
    Holiday_Code: "",
    Rec_Date: "",
    Dept_Code: [],
    Loc_Code: [],
    Rel_Code: [],
    Half_Holiday: 0,
  });

  const getReligionLabel = (codes: any) => {
    if (!codes) return "";
    const codeArray = String(codes).split(",");
    return codeArray
      .map((code) => {
        const religion = relCodeOptions.find((item) => String(item.value) === code.trim());
        return religion ? religion.label : "Unknown";
      })
      .join(", ");
  };

  const getDepartmentLabel = (codes: any) => {
    if (!codes) return "";
    if (Array.isArray(codes)) return codes.map((c) => c.label || c).join(", ");
    const codeArray = String(codes).split(",");
    return codeArray
      .map((code) => {
        const dept = departmentsList.find(
          (item) => String(item.value) === code.trim() && item.label !== "ALL DEPARTMENT"
        );
        return dept ? dept.label : "Unknown";
      })
      .join(", ");
  };

  const getBranchLabel = (codes: any) => {
    if (!codes) return "";
    if (Array.isArray(codes)) return codes.map((c) => c.label || c).join(", ");
    const codeArray = String(codes).split(",");
    return codeArray
      .map((code) => {
        const branch = branchesList.find((item) => String(item.value) === code.trim());
        return branch ? branch.label : "Unknown";
      })
      .join(", ");
  };

  const fetchBranchDepartment = async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Master/findbranchdivision`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      if (response.data?.data) {
        setBranchesList(response.data.data.Location || []);
        setDepartmentsList(response.data.data.department || []);
      }
    } catch (error) {
      console.error("Error fetching branch and department:", error);
    }
  };

  const fetchHolidayData = async () => {
    if (!user?.Comp_Code) return;
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Master/holidaydata`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      if (response.data?.Result) {
        setTableHoliday(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching holiday data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHoliday = () => {
    setFormDataHoliday({
      Holiday_Name: "",
      Holiday_Code: "",
      Rec_Date: "",
      Dept_Code: [],
      Loc_Code: [],
      Rel_Code: [],
      Half_Holiday: 0,
    });
    setSaveDisabledHoliday(false);
    setUpdateDisabledHoliday(true);
  };

  const toggleChipSelection = (fieldName: "Rel_Code" | "Dept_Code" | "Loc_Code", item: any) => {
    setFormDataHoliday((prev: any) => {
      const currentList = Array.isArray(prev[fieldName]) ? [...prev[fieldName]] : [];
      const itemValStr = String(item.value);
      const existsIndex = currentList.findIndex(
        (selected) => String(selected.value || selected) === itemValStr
      );

      if (existsIndex >= 0) {
        currentList.splice(existsIndex, 1);
      } else {
        currentList.push({ label: item.label, value: item.value });
      }

      return {
        ...prev,
        [fieldName]: currentList,
      };
    });
  };

  const isChipSelected = (fieldName: "Rel_Code" | "Dept_Code" | "Loc_Code", itemVal: any) => {
    const list = formDataHoliday[fieldName];
    if (!list) return false;
    if (Array.isArray(list)) {
      return list.some((selected) => String(selected.value || selected) === String(itemVal));
    }
    return String(list).split(",").map((c) => c.trim()).includes(String(itemVal));
  };

  const handleSaveHoliday = async () => {
    if (!formDataHoliday.Holiday_Name || formDataHoliday.Holiday_Name.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Holiday Description cannot be empty",
      });
      return;
    }
    if (!formDataHoliday.Rec_Date) {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Holiday Date cannot be empty",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Master/saveholiday`,
        { formData2: formDataHoliday },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Holiday saved successfully.",
      });
      handleClearHoliday();
      await fetchHolidayData();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to save holiday",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateHoliday = async () => {
    if (!formDataHoliday.Holiday_Name || formDataHoliday.Holiday_Name.trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please Ensure",
        text: "Holiday Description cannot be empty",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Master/updateholiday`,
        { formData2: formDataHoliday },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Holiday updated successfully.",
      });
      handleClearHoliday();
      await fetchHolidayData();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Failed to update holiday",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowSelectHoliday = (rowData: any) => {
    const getSelectedObjects = (codes: any, options: any[], allOptionLabel: string) => {
      if (!codes) return [];
      const codeArray = String(codes).split(",").map((c) => c.trim());
      return codeArray
        .map((code) => {
          const found = options.find((opt) => String(opt.value) === code);
          return found ? { value: found.value, label: found.label } : null;
        })
        .filter(Boolean);
    };

    const selectedReligions = getSelectedObjects(rowData.Rel_Code, relCodeOptions, "ALL RELIGION");
    const selectedDepartments = getSelectedObjects(rowData.Dept_Code, departmentsList, "ALL DEPARTMENT");
    const selectedBranches = getSelectedObjects(rowData.Loc_Code, branchesList, "ALL BRANCH");

    let formattedDate = "";
    if (rowData.Rec_Date) {
      try {
        formattedDate = new Date(rowData.Rec_Date).toISOString().split("T")[0];
      } catch (err) {
        formattedDate = rowData.Rec_Date;
      }
    }

    setFormDataHoliday({
      ...rowData,
      Rec_Date: formattedDate,
      Rel_Code: selectedReligions,
      Dept_Code: selectedDepartments,
      Loc_Code: selectedBranches,
      Half_Holiday: rowData.Half_Holiday ? 1 : 0,
    });
    setSaveDisabledHoliday(true);
    setUpdateDisabledHoliday(false);
  };

  const columnsHoliday = useMemo(
    () => [
      { Header: "SR NO", accessor: "Srno", Cell: ({ row }: any) => row.index + 1 },
      {
        Header: "HOLIDAY DESCRIPTION",
        accessor: "Holiday_Name",
        Cell: ({ value }: any) => <span className="font-bold text-[#4F46E5] dark:text-indigo-400 uppercase">{value}</span>,
      },
      {
        Header: "HOLIDAY DATE",
        accessor: "Rec_Date",
        Cell: ({ value }: any) => {
          if (!value) return "—";
          try {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          } catch (e) {
            return String(value);
          }
        },
      },
      {
        Header: "DEPARTMENT",
        accessor: "Dept_Label",
        Cell: ({ value, row }: any) => {
          const text = value || getDepartmentLabel(row.original.Dept_Code) || "—";
          return (
            <div className="max-w-[200px] xl:max-w-[260px] truncate text-slate-700 dark:text-slate-300" title={text}>
              {text}
            </div>
          );
        },
      },
      {
        Header: "BRANCH LOCATION",
        accessor: "Loc_Label",
        Cell: ({ value, row }: any) => {
          const text = value || getBranchLabel(row.original.Loc_Code) || "—";
          return (
            <div className="max-w-[180px] xl:max-w-[230px] truncate text-slate-700 dark:text-slate-300" title={text}>
              {text}
            </div>
          );
        },
      },
      {
        Header: "RELIGION",
        accessor: "Rel_Code",
        Cell: ({ value }: any) => {
          const text = getReligionLabel(value) || "—";
          return (
            <div className="max-w-[150px] xl:max-w-[200px] truncate text-slate-700 dark:text-slate-300" title={text}>
              {text}
            </div>
          );
        },
      },
      {
        Header: "ACTIONS",
        id: "actions",
        Cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRowSelectHoliday(row.original)}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 flex items-center justify-center transition-colors"
              title="Edit record"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                Swal.fire({
                  title: "Delete Holiday?",
                  text: `Are you sure you want to delete ${row.original.Holiday_Name}?`,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#EF4444",
                  confirmButtonText: "Yes, delete",
                });
              }}
              className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-rose-500 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition-colors"
              title="Delete record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [departmentsList, branchesList]
  );

  // Initial Data Fetching - guarded by user?.Comp_Code
  useEffect(() => {
    if (!user?.Comp_Code) return;
    fetchMisPunchData();
    fetchShiftData();
    fetchBranchDepartment();
    fetchHolidayData();
  }, [user?.Comp_Code, user?.name, user?.branch]);

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#060911] text-slate-900 dark:text-white p-4 sm:p-6 lg:p-7 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand + Back + Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-bold text-sm select-none shadow-sm">
            <h1 className="text-lg">HS</h1>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs inline-flex items-center gap-2 transition-colors text-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Right: Branch Info & Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Branch - {user?.branch || "4"}
          </div>

          <div className="h-10 w-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.name?.slice(0, 2).toUpperCase() || "AK"}
          </div>
        </div>
      </div>

      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Organisation Setup
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure attendance reasons, work shifts and the holiday calendar for every branch.
        </p>
      </div>

      {/* Main Tabs Switcher */}
      <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Tab 1: MisPunch Reason */}
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`h-11 px-5 rounded-xl text-sm sm:text-[15px] font-bold flex items-center gap-3 transition-all ${
            activeTab === 1
              ? "bg-[#4F46E5] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <ScanLine className="h-4.5 w-4.5" />
          <span>MisPunch Reason</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 1
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {tableMisPunch.length}
          </span>
        </button>

        {/* Tab 2: Shift */}
        <button
          type="button"
          onClick={() => setActiveTab(2)}
          className={`h-11 px-5 rounded-xl text-sm sm:text-[15px] font-bold flex items-center gap-3 transition-all ${
            activeTab === 2
              ? "bg-[#4F46E5] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="h-4.5 w-4.5" />
          <span>Shift</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 2
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {tableShift.length}
          </span>
        </button>

        {/* Tab 3: Holiday */}
        <button
          type="button"
          onClick={() => setActiveTab(3)}
          className={`h-11 px-5 rounded-xl text-sm sm:text-[15px] font-bold flex items-center gap-3 transition-all ${
            activeTab === 3
              ? "bg-[#4F46E5] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="h-4.5 w-4.5" />
          <span>Holiday</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 3
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {tableHoliday.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1 CONTENT: MISPUNCH REASON                                            */}
      {/* ========================================================================= */}
      {activeTab === 1 && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Form Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 sm:p-7 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shadow-xs">
                  <ScanLine className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Mispunch Reason
                  </h2>
                  <p className="text-[15px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    How each punch exception counts toward present, absent and leave.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearMisPunch}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-[15px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-2xs transition-colors"
                >
                  <Eraser className="h-4.5 w-4.5" />
                  Clear
                </button>

                {!updateDisabledMisPunch ? (
                  <button
                    type="button"
                    onClick={handleUpdateMisPunch}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Update
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveMisPunch}
                    disabled={saveDisabledMisPunch}
                    className="h-11 px-6 rounded-xl bg-[#4F46E5] hover:bg-[#433df0] text-white text-[15px] font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Row 1: Mispunch Reason */}
            <div>
              <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                Mispunch Reason <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Casual Leave (CL)"
                value={formDataMisPunch.Misc_Name}
                onChange={(e) => handleInputMisPunch("Misc_Name", e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>

            {/* Row 2: Status, Present, Leave, Absent, In Time, Out Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Status
                </label>
                <input
                  type="text"
                  placeholder="CL"
                  value={formDataMisPunch.Misc_Abbr}
                  onChange={(e) => handleInputMisPunch("Misc_Abbr", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <SelectSearch
                  title="Present Value"
                  name="Misc_Dtl1"
                  options={PresentValueOptions}
                  selectedValue={formDataMisPunch.Misc_Dtl1}
                  handleInputChange={handleInputMisPunch}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <SelectSearch
                  title="Leave Value"
                  name="Misc_Dtl3"
                  options={LeaveValueOptions}
                  selectedValue={formDataMisPunch.Misc_Dtl3}
                  handleInputChange={handleInputMisPunch}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <SelectSearch
                  title="Absent Value"
                  name="Misc_Dtl2"
                  options={AbsentValueOptions}
                  selectedValue={formDataMisPunch.Misc_Dtl2}
                  handleInputChange={handleInputMisPunch}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <SelectSearch
                  title="In Time"
                  name="Misc_Num1"
                  options={InTimeOptions}
                  selectedValue={String(formDataMisPunch.Misc_Num1)}
                  handleInputChange={handleInputMisPunch}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <SelectSearch
                  title="Out Time"
                  name="MISC_NUM2"
                  options={InTimeOptions}
                  selectedValue={String(formDataMisPunch.MISC_NUM2)}
                  handleInputChange={handleInputMisPunch}
                  disabled={true}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Row 3: Minimum Bal, Expiry Date, Days Front, Days Back */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Minimum Bal. Req.
                </label>
                <input
                  type="text"
                  placeholder="0"
                  value={formDataMisPunch.Misc_Mob}
                  onChange={(e) => handleInputMisPunch("Misc_Mob", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  A/C Expiry Date
                </label>
                <input
                  type="date"
                  value={formDataMisPunch.Exp_Date || ""}
                  onChange={(e) => handleInputMisPunch("Exp_Date", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Days Front
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formDataMisPunch.CC_Group}
                  onChange={(e) => handleInputMisPunch("CC_Group", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Days Back
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={formDataMisPunch.CC_Ledg}
                  onChange={(e) => handleInputMisPunch("CC_Ledg", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="w-full">
            <DataTable
              columns={columnsMisPunch}
              data={tableMisPunch}
              onRowDoubleClick={handleRowSelectMisPunch}
              showTopSearch={true}
              showExcelExport={true}
              searchPlaceholder="Search records..."
              height="380px"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 CONTENT: SHIFT MASTER                                               */}
      {/* ========================================================================= */}
      {activeTab === 2 && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Form Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 sm:p-7 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shadow-xs">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Shift Master
                  </h2>
                  <p className="text-[15px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Define shift names with their in and out times.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearShift}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-[15px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-2xs transition-colors"
                >
                  <Eraser className="h-4.5 w-4.5" />
                  Clear
                </button>

                {!updateDisabledShift ? (
                  <button
                    type="button"
                    onClick={handleUpdateShift}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Update
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveShift}
                    disabled={saveDisabledShift}
                    className="h-11 px-6 rounded-xl bg-[#4F46E5] hover:bg-[#433df0] text-white text-[15px] font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Inputs: Shift Name, Shift In Time, Shift Out Time, Night Shift Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              <div className="md:col-span-5">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Shift Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. K22"
                  value={formDataShift.Misc_Name}
                  onChange={(e) => handleInputShift("Misc_Name", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Shift In Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formDataShift.Misc_Add1}
                  onChange={(e) => handleInputShift("Misc_Add1", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Shift Out Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formDataShift.Misc_Add2}
                  onChange={(e) => handleInputShift("Misc_Add2", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              {/* Night Shift Switch Toggle */}
              <div className="md:col-span-3 flex items-center justify-start md:justify-end pb-2">
                <label className="inline-flex items-center gap-3.5 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Number(formDataShift.Misc_Num1) === 1}
                      onChange={(e) => handleInputShift("Misc_Num1", e.target.checked ? 1 : 0)}
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-[#4F46E5]"></div>
                  </div>
                  <span className="text-[15px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Moon className="h-4.5 w-4.5 text-indigo-500" />
                    Night shift
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="w-full">
            <DataTable
              columns={columnsShift}
              data={paginatedShiftData}
              onRowDoubleClick={handleRowSelectShift}
              showTopSearch={true}
              showExcelExport={true}
              showPageSizeInFooter={true}
              searchValue={shiftSearchQuery}
              onSearchChange={(val) => {
                setShiftSearchQuery(val);
                setShiftPage(1);
              }}
              serverMode={true}
              serverPagination={{
                currentPage: shiftPage,
                pageSize: shiftPageSize,
                totalPages: totalShiftPages,
                totalRecords: totalShiftRecords,
              }}
              onServerPageChange={(newPage) => setShiftPage(newPage)}
              onServerPageSizeChange={(newSize) => {
                setShiftPageSize(newSize);
                setShiftPage(1);
              }}
              searchPlaceholder="Search records..."
              height="380px"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3 CONTENT: HOLIDAY MASTER                                             */}
      {/* ========================================================================= */}
      {activeTab === 3 && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Form Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 sm:p-7 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shadow-xs">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Holiday Master
                  </h2>
                  <p className="text-[15px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Set the holiday calendar per department, branch and religion.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearHoliday}
                  className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-[15px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-2xs transition-colors"
                >
                  <Eraser className="h-4.5 w-4.5" />
                  Clear
                </button>

                {!updateDisabledHoliday ? (
                  <button
                    type="button"
                    onClick={handleUpdateHoliday}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Update
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveHoliday}
                    disabled={saveDisabledHoliday}
                    className="h-11 px-6 rounded-xl bg-[#4F46E5] hover:bg-[#433df0] text-white text-[15px] font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Row 1: Holiday Description, Holiday Date, Half Day Switch */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              <div className="md:col-span-6">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Holiday Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day"
                  value={formDataHoliday.Holiday_Name || ""}
                  onChange={(e) => setFormDataHoliday((prev: any) => ({ ...prev, Holiday_Name: e.target.value }))}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Holiday Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formDataHoliday.Rec_Date || ""}
                  onChange={(e) => setFormDataHoliday((prev: any) => ({ ...prev, Rec_Date: e.target.value }))}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="md:col-span-3 flex items-center justify-start md:justify-end pb-2">
                <label className="inline-flex items-center gap-3.5 cursor-pointer select-none">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Number(formDataHoliday.Half_Holiday) === 1}
                      onChange={(e) =>
                        setFormDataHoliday((prev: any) => ({
                          ...prev,
                          Half_Holiday: e.target.checked ? 1 : 0,
                        }))
                      }
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-[#4F46E5]"></div>
                  </div>
                  <span className="text-[15px] font-bold text-slate-700 dark:text-slate-200">
                    Half day
                  </span>
                </label>
              </div>
            </div>

            {/* Row 2: Chip Multi-Selectors for Religion, Department, Branch */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Religion Chips */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Religion
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = relCodeOptions.filter((r) => r.value !== "1,2,3,4,5,6,7");
                      setFormDataHoliday((prev: any) => ({
                        ...prev,
                        Rel_Code: prev.Rel_Code?.length === allSelected.length ? [] : allSelected,
                      }));
                    }}
                    className="text-sm font-bold text-[#4F46E5] hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {relCodeOptions
                    .filter((r) => r.value !== "1,2,3,4,5,6,7")
                    .map((r) => {
                      const selected = isChipSelected("Rel_Code", r.value);
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => toggleChipSelection("Rel_Code", r)}
                          className={`px-4 py-2 rounded-xl text-[14px] font-semibold border transition-all ${
                            selected
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                              : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Department Chips */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Department
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allDepts = departmentsList.filter((d) => d.label !== "ALL DEPARTMENT");
                      setFormDataHoliday((prev: any) => ({
                        ...prev,
                        Dept_Code: prev.Dept_Code?.length === allDepts.length ? [] : allDepts,
                      }));
                    }}
                    className="text-sm font-bold text-[#4F46E5] hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5 max-h-44 overflow-y-auto pr-1">
                  {departmentsList
                    .filter((d) => d.label !== "ALL DEPARTMENT")
                    .map((d) => {
                      const selected = isChipSelected("Dept_Code", d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleChipSelection("Dept_Code", d)}
                          className={`px-4 py-2 rounded-xl text-[14px] font-semibold border transition-all ${
                            selected
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                              : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Branch Location Chips */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Branch Location
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormDataHoliday((prev: any) => ({
                        ...prev,
                        Loc_Code: prev.Loc_Code?.length === branchesList.length ? [] : branchesList,
                      }));
                    }}
                    className="text-sm font-bold text-[#4F46E5] hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5 max-h-44 overflow-y-auto pr-1">
                  {branchesList.map((b) => {
                    const selected = isChipSelected("Loc_Code", b.value);
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => toggleChipSelection("Loc_Code", b)}
                        className={`px-4 py-2 rounded-xl text-[14px] font-semibold border transition-all ${
                          selected
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="w-full">
            <DataTable
              columns={columnsHoliday}
              data={tableHoliday}
              onRowDoubleClick={handleRowSelectHoliday}
              showTopSearch={true}
              showExcelExport={true}
              searchPlaceholder="Search records..."
              height="380px"
            />
          </div>
        </div>
      )}

      {/* Loader */}
      {/* <HashloaderComponent isLoading={isLoading} /> */}
    </div>
  );
}
