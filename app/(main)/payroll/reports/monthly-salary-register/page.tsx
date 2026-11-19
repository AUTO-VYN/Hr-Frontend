"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { Save, Search, X, FileSpreadsheet } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type Field = {
  id: string;
  label: string;
  apiField: string;
  blockId?: string;
  aliases?: string[];
};

type FieldGroup = {
  id: string;
  title: string;
  color: string;
  fields: Field[];
};

type SavedTemplate = {
  id: string;
  name: string;
  fields: string[];
};

type RegisterRow = {
  id: string;
  raw: any;
  [key: string]: any;
};

const API_URL = process.env.NEXT_PUBLIC_URL;
const CURRENT_YEAR = new Date().getFullYear();

const MONTHS: Option[] = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const YEARS: Option[] = Array.from({ length: 15 }, (_, index) => {
  const year = CURRENT_YEAR - index;
  return { value: String(year), label: String(year) };
});

const EMPLOYEE_TYPES: Option[] = [
  { value: "both", label: "Both" },
  { value: "regular", label: "Regular" },
  { value: "casual", label: "Casual" },
];

const DEFAULT_FIELDS = [
  "branch",
  "emp_code",
  "first_name",
  "designation",
  "month_days",
  "present_days",
  "basic",
  "gross",
  "net_payment",
];

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.recordset)) return value.recordset;
  if (Array.isArray(value?.Result)) return value.Result;
  return [];
};

// API sometimes returns nested arrays like [ [ {...}, {...} ], 4 ].
// This keeps only the object items and ignores stray numbers/strings.
const flattenObjects = (input: any): any[] => {
  if (!Array.isArray(input)) {
    return input && typeof input === "object" ? [input] : [];
  }

  return input.flatMap((item: any) =>
    Array.isArray(item)
      ? flattenObjects(item)
      : item && typeof item === "object"
        ? [item]
        : [],
  );
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

const getLabel = (item: any, keys: string[]): string => {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      return String(item[key]);
    }
  }

  return "";
};

const makeOptions = (
  data: any[],
  codeKeys: string[],
  nameKeys: string[],
): Option[] => {
  const result = data
    .map((item) => {
      const code = getLabel(item, codeKeys);
      const name = getLabel(item, nameKeys);

      if (!code && !name) return null;

      const value = code || name;
      const label =
        code && name && code !== name ? `${code} - ${name}` : name || code;

      return {
        value: String(value),
        label: String(label),
      };
    })
    .filter(Boolean) as Option[];

  return Array.from(new Map(result.map((item) => [item.value, item])).values());
};

const getCode = (value: any) => {
  if (value === undefined || value === null) return "";
  return String(value).split(" - ")[0].trim();
};

const getMonthLabel = (month: string) =>
  MONTHS.find((item) => item.value === month)?.label || month;

const normalizeTemplateFields = (value: any): string[] => {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item: any) =>
      typeof item === "string"
        ? item
        : getText(item?.field_key, item?.apiField, item?.id),
    )
    .filter(Boolean);
};

const getBlockColor = (color: any, fallback: string) => {
  const value = String(color || "").trim();

  if (!value) return fallback;

  if (
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl")
  ) {
    return value;
  }

  return fallback;
};

export default function MonthlySalaryRegisterPage() {
  const user = useCurrentUser();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);

  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [employeeType, setEmployeeType] = useState("both");
  const [savedTemplate, setSavedTemplate] = useState("none");

  const [regions, setRegions] = useState<Option[]>([]);
  const [channels, setChannels] = useState<Option[]>([]);
  const [clusters, setClusters] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [region, setRegion] = useState("all");
  const [channel, setChannel] = useState("all");
  const [cluster, setCluster] = useState("all");
  const [section, setSection] = useState("all");
  const [department, setDepartment] = useState("all");
  const [designation, setDesignation] = useState("all");

  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [blockColors, setBlockColors] = useState<Record<string, any>>({});
  const [blocksLoading, setBlocksLoading] = useState(false);

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldSearch, setFieldSearch] = useState("");

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");

  const compcode = user?.Comp_Code;
  const userName = user?.name || "";
  const empcode = user?.EMPCODE || "";

  // ---------------------------------------------------
  // API HELPERS
  // ---------------------------------------------------

  const apiHeadersBase = useMemo(
    () => ({
      compcode: compcode || "",
      name: userName,
      empcode: empcode,
    }),
    [compcode, userName, empcode],
  );

  const postApi = useCallback(
    async (path: string, payload: any, config: any = {}) => {
      if (!compcode) {
        throw new Error("Company code is not ready.");
      }

      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_URL is not configured.");
      }

      return axios.post(`${API_URL}${path}`, payload, {
        ...config,
        headers: {
          ...apiHeadersBase,
          ...(config?.headers || {}),
        },
      });
    },
    [compcode, apiHeadersBase],
  );

  const getApi = useCallback(
    async (path: string, config: any = {}) => {
      if (!compcode) {
        throw new Error("Company code is not ready.");
      }

      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_URL is not configured.");
      }

      return axios.get(`${API_URL}${path}`, {
        ...config,
        headers: {
          ...apiHeadersBase,
          ...(config?.headers || {}),
        },
      });
    },
    [compcode, apiHeadersBase],
  );

  // ---------------------------------------------------
  // DYNAMIC FIELD HELPERS
  // ---------------------------------------------------

  const allFields = useMemo(
    () => fieldGroups.flatMap((group) => group.fields),
    [fieldGroups],
  );

  const getSelectedField = useCallback(
    (id: string) => allFields.find((field) => field.id === id),
    [allFields],
  );

  const getAllSelectedFields = useCallback(
    (ids: string[]) =>
      ids
        .map((id) => allFields.find((field) => field.id === id))
        .filter(Boolean) as Field[],
    [allFields],
  );

  const getExcelSelectedFields = useCallback(
    (ids: string[]) =>
      getAllSelectedFields(ids).map((field) => ({
        field_key: field.apiField,
        alias: field.label,
        block_id: field.blockId || "",
      })),
    [getAllSelectedFields],
  );

  // ---------------------------------------------------
  // FILTER PAYLOAD
  // (defined early because templates / report calls use it)
  // ---------------------------------------------------

 const getFilterPayload = useCallback(() => {
  const userLocations = selectedLocations.map((item) => getCode(item));

  return {
    location: userLocations.filter(Boolean),
    Region: region === "all" ? "" : getCode(region),
    CHANNEL: channel === "all" ? "" : getCode(channel),
    CLUSTER: cluster === "all" ? "" : getCode(cluster),
    SECTION: section === "all" ? "" : getCode(section),
    DIVISION: department === "all" ? "" : getCode(department),
    DESIGNATION: designation === "all" ? "" : getCode(designation),
  };
}, [
  selectedLocations,
  region,
  channel,
  cluster,
  section,
  department,
  designation,
]);
  // ---------------------------------------------------
  // OPTIONS
  // ---------------------------------------------------

  const withAll = useCallback(
    (options: Option[]): Option[] => [
      { value: "all", label: "All" },
      ...options,
    ],
    [],
  );

  const regionOptions = useMemo(() => withAll(regions), [regions, withAll]);
  const channelOptions = useMemo(() => withAll(channels), [channels, withAll]);
  const clusterOptions = useMemo(() => withAll(clusters), [clusters, withAll]);
  const sectionOptions = useMemo(() => withAll(sections), [sections, withAll]);
  const departmentOptions = useMemo(
    () => withAll(departments),
    [departments, withAll],
  );
  const designationOptions = useMemo(
    () => withAll(designations),
    [designations, withAll],
  );

  const templateOptions = useMemo(
    () => [
      { value: "none", label: "None" },
      ...templates.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    ],
    [templates],
  );

  // ---------------------------------------------------
  // FETCH DYNAMIC REPORT BLOCKS
  // ---------------------------------------------------

  const fetchReportBlocks = useCallback(async () => {
    if (!compcode) return;

    try {
      setBlocksLoading(true);

      const response = await getApi(
        `/admin/getReportBlocks?report_type=SALARY_REPORT`,
      );

      let blocks = getArray(response?.data?.data);

      if (!blocks.length) {
        await postApi("/hrmsreport/importDemoBlocks", {});
        const refreshed = await getApi(
          `/admin/getReportBlocks?report_type=SALARY_REPORT`,
        );
        blocks = getArray(refreshed?.data?.data);
      }

      const fallbackColors = [
        "#0ea5e9",
        "#4f46e5",
        "#7c3aed",
        "#ea580c",
        "#0891b2",
        "#dc2626",
        "#475569",
        "#15803d",
      ];

      const mappedGroups: FieldGroup[] = [];
      const colors: Record<string, any> = {};

      blocks
        .sort(
          (a: any, b: any) =>
            Number(a?.block_seq || 0) - Number(b?.block_seq || 0),
        )
        .forEach((block: any, blockIndex: number) => {
          const blockId = String(block?.id ?? block?.block_id ?? "");
          const blockName = getText(
            block?.block_name,
            block?.name,
            `Block ${blockIndex + 1}`,
          );

          const blockFields = getArray(block?.fields)
            .sort(
              (a: any, b: any) =>
                Number(a?.field_seq || 0) - Number(b?.field_seq || 0),
            )
            .map((item: any) => {
              const fieldKey = getText(
                item?.field_key,
                item?.Field_Key,
                item?.fieldKey,
              );

              const alias = getText(
                item?.field_alias,
                item?.alias,
                item?.field_name,
                fieldKey,
              );

              if (!fieldKey) return null;

              return {
                id: fieldKey,
                label: alias,
                apiField: fieldKey,
                blockId,
                aliases: [alias],
              } as Field;
            })
            .filter(Boolean) as Field[];

          if (!blockFields.length) return;

          const fallback = fallbackColors[blockIndex % fallbackColors.length];

          const headerColor = getBlockColor(block?.header_color, fallback);
          const dataColor = getBlockColor(block?.data_color, "#ffffff");

          mappedGroups.push({
            id: blockId || `block_${blockIndex}`,
            title: blockName,
            color: headerColor,
            fields: blockFields,
          });

          colors[blockId] = {
            header: headerColor,
            data: dataColor,
            fields: blockFields.map((field) => field.label),
          };
        });

      // Add Locations block if API does not return it
      const hasLocationBlock = mappedGroups.some(
        (group) =>
          group.title.toLowerCase().includes("location") ||
          group.fields.some((field) => field.id.toLowerCase() === "branch"),
      );

      if (!hasLocationBlock) {
        const locationBlockId = "locations";
        const locationColor = "#0ea5e9";

        mappedGroups.unshift({
          id: locationBlockId,
          title: "Locations",
          color: locationColor,
          fields: [
            {
              id: "branch",
              label: "Branch - 1",
              apiField: "branch",
              blockId: locationBlockId,
              aliases: ["Branch - 1", "Branch", "Location", "Loc_name"],
            },
          ],
        });

        colors[locationBlockId] = {
          header: locationColor,
          data: "#ffffff",
          fields: ["Branch - 1"],
        };
      }

      setFieldGroups(mappedGroups);
      setBlockColors(colors);

      if (!mappedGroups.length) {
        throw new Error("No report fields were returned by the server.");
      }
    } catch (error) {
      console.error("Salary report blocks:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load report fields",
        text: getApiError(error),
      });
    } finally {
      setBlocksLoading(false);
    }
  }, [compcode, getApi, postApi]);

  useEffect(() => {
    if (compcode) fetchReportBlocks();
  }, [compcode, fetchReportBlocks]);

  // ---------------------------------------------------
  // MASTER API
  // ---------------------------------------------------

  const fetchMasters = useCallback(async () => {
    if (!compcode || !user?.branch) return;

    try {
      setMasterLoading(true);

      const response = await postApi("/hrmsreport/findMasters", {
        multiloc: user.branch,
        Month: month,
        Year: year,
      });

      console.log("FIND MASTERS FULL RESPONSE:", response?.data);

      const data =
        response?.data?.data || response?.data?.Data || response?.data || {};

      // LOCATION MASTER
      // API shape: "Location": [ [ {value,label,...}, ... ], 4 ]
      const rawLocation =
        data?.Location ??
        data?.Location1 ??
        data?.location1 ??
        data?.location ??
        [];

      const locationData = flattenObjects(rawLocation);

      const parsedLocations = locationData
        .map((item: any) => {
          const value = getText(
            item?.value,
            item?.EMP_Code,
            item?.Emp_Code,
            item?.Loc_code,
            item?.LOC_CODE,
            item?.LocationCode,
            item?.Code,
          );

          const label = getText(
            item?.label,
            item?.Emp_Name,
            item?.Loc_name,
            item?.LocationName,
            item?.LOC_NAME,
            item?.Name,
          );

          if (!value && !label) return null;

          return {
            value: value || label,
            label: label || value,
          };
        })
        .filter(Boolean) as Option[];

      const uniqueLocations = Array.from(
        new Map(parsedLocations.map((item) => [item.value, item])).values(),
      );

      console.log("FINAL LOCATION OPTIONS:", uniqueLocations);

      setLocations(uniqueLocations);

      // REGION
      setRegions(
        makeOptions(
          getArray(data?.Region),
          ["Region_Code", "RegionCode", "REGION_CODE", "Code", "value"],
          ["Region_Name", "RegionName", "REGION_NAME", "Name", "label"],
        ),
      );

      // CHANNEL
      setChannels(
        makeOptions(
          getArray(data?.CHANNEL),
          ["Channel_Code", "ChannelCode", "CHANNEL_CODE", "Code", "value"],
          ["Channel_Name", "ChannelName", "CHANNEL_NAME", "Name", "label"],
        ),
      );

      // CLUSTER
      setClusters(
        makeOptions(
          getArray(data?.CLUSTER),
          ["Cluster_Code", "ClusterCode", "CLUSTER_CODE", "Code", "value"],
          ["Cluster_Name", "ClusterName", "Name", "label"],
        ),
      );

      // SECTION
      setSections(
        makeOptions(
          getArray(data?.SECTION),
          ["Section_Code", "SectionCode", "SECTION_CODE", "Code", "value"],
          ["Section_Name", "SectionName", "Name", "label"],
        ),
      );

      // DEPARTMENT
      setDepartments(
        makeOptions(
          getArray(data?.DIVISION),
          ["Division_Code", "DivisionCode", "DIVISION_CODE", "Code", "value"],
          ["Division_Name", "DivisionName", "Name", "label"],
        ),
      );

      // DESIGNATION
      setDesignations(
        makeOptions(
          getArray(data?.DESIGNATION),
          [
            "Designation_Code",
            "DesignationCode",
            "Desig_Code",
            "DESIGNATION_CODE",
            "Code",
            "value",
          ],
          [
            "Designation_Name",
            "DesignationName",
            "Desig_Name",
            "DESIGNATION_NAME",
            "Name",
            "label",
          ],
        ),
      );
    } catch (error) {
      console.error("Monthly register masters:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load filters",
        text: getApiError(error),
      });
    } finally {
      setMasterLoading(false);
    }
  }, [compcode, user?.branch, month, year, postApi]);

  useEffect(() => {
    if (compcode && user?.branch) fetchMasters();
  }, [fetchMasters, compcode, user?.branch]);

  // ---------------------------------------------------
  // DATABASE TEMPLATE API
  // ---------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    if (!compcode || !userName) return;

    try {
      const response = await getApi(
        `/hrmsreport/getSalaryTemplates?user_code=${encodeURIComponent(
          userName,
        )}`,
      );

      const rawTemplates = getArray(response?.data?.data ?? response?.data);

      const mapped: SavedTemplate[] = rawTemplates
        .map((item: any) => ({
          id: String(item?.id ?? item?.ID ?? item?.template_id ?? ""),
          name: getText(item?.template_name, item?.Template_Name, item?.name),
          fields: normalizeTemplateFields(
            item?.selected_fields ?? item?.selectedFields,
          ),
        }))
        .filter((item) => item.id && item.name);

      setTemplates(mapped);
    } catch (error) {
      console.error("Salary templates:", error);
    }
  }, [compcode, userName, getApi]);

  useEffect(() => {
    if (compcode && userName) fetchTemplates();
  }, [compcode, userName, fetchTemplates]);

  const loadTemplateById = useCallback(
    async (templateId: string) => {
      if (!templateId || templateId === "none") return;

      try {
        const response = await getApi(
          `/hrmsreport/getTemplateById?id=${encodeURIComponent(templateId)}`,
        );

        const data =
          response?.data?.data?.[0] ||
          response?.data?.data ||
          response?.data?.result ||
          response?.data;

        const rawFields = data?.selected_fields ?? data?.selectedFields;
        let parsedFields: any[] = [];

        if (Array.isArray(rawFields)) {
          parsedFields = rawFields;
        } else if (typeof rawFields === "string") {
          try {
            const parsed = JSON.parse(rawFields);
            parsedFields = Array.isArray(parsed) ? parsed : [];
          } catch {
            parsedFields = [];
          }
        }

        const orderedKeys = parsedFields
          .map((item: any) =>
            typeof item === "string"
              ? item
              : getText(item?.field_key, item?.apiField, item?.id),
          )
          .filter(Boolean);

        const availableIds = new Set(allFields.map((field) => field.id));

        const validFields = orderedKeys.filter((id) => availableIds.has(id));

        setSelectedFields(validFields);
        setSavedTemplate(templateId);

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Template data fetched successfully",
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });

        if (data?.template_name || data?.Template_Name) {
          setTemplateName(getText(data?.template_name, data?.Template_Name));
        }

        if (data?.template_name || data?.Template_Name) {
          setTemplateName(getText(data?.template_name, data?.Template_Name));
        }

        // Restore the locations saved in the template
        if (data?.location) {
          const savedLocations: string[] = Array.isArray(data.location)
            ? data.location.map((item: any) => String(item))
            : String(data.location)
                .split(",")
                .map((item: string) => item.trim())
                .filter(Boolean);

          const validIds = new Set(locations.map((item) => item.value));
          const matched = savedLocations.filter((id) => validIds.has(id));
          setSelectedLocations(
            matched.length === locations.length ? [] : matched,
          );
        }
      } catch (error) {
        console.error("Load salary template:", error);

        Swal.fire({
          icon: "error",
          title: "Unable to load template",
          text: getApiError(error),
        });
      }
    },
    [getApi, allFields, locations],
  );

  const saveTemplateToDatabase = useCallback(
    async (name: string, templateId?: string) => {
      const selectedTemplateFields = getExcelSelectedFields(selectedFields);

      const payload = {
        user_code: userName,
        template_name: name,
        selectedTemplate: templateId || "",
        selectedFields: selectedTemplateFields,
        location: getFilterPayload().location,
        created_by: userName,
      };

      return postApi("/hrmsreport/saveSalaryTemplate", payload);
    },
    [
      userName,
      selectedFields,
      getExcelSelectedFields,
      getFilterPayload,
      postApi,
    ],
  );

  const handleSaveTemplate = async () => {
    const name = templateName.trim();

    if (!name) {
      Swal.fire({
        icon: "warning",
        title: "Template name required",
        text: "Please enter a name for your template.",
      });
      return;
    }

    if (!selectedFields.length) {
      Swal.fire({
        icon: "warning",
        title: "No columns selected",
        text: "Select at least one field before saving a template.",
      });
      return;
    }

    const normalizedName = name.toLowerCase().replace(/\s+/g, "");

    const existing = templates.find(
      (item) =>
        item.name.toLowerCase().replace(/\s+/g, "") === normalizedName &&
        item.id !== savedTemplate,
    );

    if (existing) {
      Swal.fire({
        icon: "warning",
        title: "Template already exists",
        text: "Please use another template name.",
      });
      return;
    }

    try {
      setLoading(true);

      await saveTemplateToDatabase(
        name,
        savedTemplate !== "none" ? savedTemplate : "",
      );

      await fetchTemplates();

      setTemplateName(name);

      Swal.fire({
        icon: "success",
        title: "Template saved",
        text: `"${name}" has been saved successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Save salary template:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to save template",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // SELECT HANDLER
  // ---------------------------------------------------

  const handleInputChange = (name: string, value: any) => {
    const selectedValue = String(value ?? "all");

    switch (name) {
      case "year":
        setYear(selectedValue);
        break;

      case "month":
        setMonth(selectedValue);
        break;

      case "employeeType":
        setEmployeeType(selectedValue);
        break;

      case "savedTemplate":
        setSavedTemplate(selectedValue);

        if (selectedValue === "none") {
          setTemplateName("");
          return;
        }

        loadTemplateById(selectedValue);
        break;

      case "region":
        setRegion(selectedValue);
        break;

      case "channel":
        setChannel(selectedValue);
        break;

      case "cluster":
        setCluster(selectedValue);
        break;

      case "section":
        setSection(selectedValue);
        break;

      case "department":
        setDepartment(selectedValue);
        break;

      case "designation":
        setDesignation(selectedValue);
        break;

      default:
        break;
    }
  };

  // ---------------------------------------------------
  // FIELD SELECTION
  // ---------------------------------------------------

  const toggleField = (fieldId: string) => {
    setSelectedFields((previous) =>
      previous.includes(fieldId)
        ? previous.filter((item) => item !== fieldId)
        : [...previous, fieldId],
    );

    setSavedTemplate("none");
  };

  const toggleGroup = (group: FieldGroup) => {
    const groupIds = group.fields.map((item) => item.id);

    const allSelected = groupIds.every((id) => selectedFields.includes(id));

    setSelectedFields((previous) => {
      if (allSelected) {
        return previous.filter((id) => !groupIds.includes(id));
      }

      return Array.from(new Set([...previous, ...groupIds]));
    });

    setSavedTemplate("none");
  };

  const isGroupSelected = (group: FieldGroup) =>
    group.fields.every((field) => selectedFields.includes(field.id));

  const isGroupPartiallySelected = (group: FieldGroup) =>
    group.fields.some((field) => selectedFields.includes(field.id));

  const toggleLocation = (value: string) => {
    setSelectedLocations((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
    setSavedTemplate("none");
  };

  const toggleAllLocations = () => {
    setSelectedLocations((previous) =>
      previous.length === locations.length
        ? []
        : locations.map((item) => item.value),
    );
    setSavedTemplate("none");
  };

  const renderLocationCard = (group: FieldGroup) => {
    const allChecked =
      locations.length > 0 && selectedLocations.length === locations.length;
    const someChecked = selectedLocations.length > 0 && !allChecked;
    const branchField = group.fields[0];

    return (
      <div
        key={group.id}
        className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex h-[43px] items-center justify-between border-b border-[#e8edf5] bg-[#fbfcfe] px-3 dark:border-slate-800 dark:bg-slate-800/60">
          <label className="flex min-w-0 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(element) => {
                if (element) element.indeterminate = someChecked;
              }}
              onChange={toggleAllLocations}
              disabled={!locations.length}
              className="h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-indigo-600 focus:ring-indigo-500"
            />

            <span
              className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
              style={{ backgroundColor: group.color }}
            />

            <span className="truncate text-[13px] font-bold text-[#152b4b] dark:text-slate-100">
              {group.title}
            </span>
          </label>

          <span className="ml-2 rounded-full bg-[#f0f4f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b] dark:bg-slate-700 dark:text-slate-300">
            {selectedLocations.length
              ? `${selectedLocations.length}/${locations.length}`
              : locations.length}
          </span>
        </div>

        <div
          className={`grid grid-cols-2 gap-x-2 gap-y-3 p-3 ${
            locations.length > 12 ? "max-h-[190px] overflow-y-auto" : ""
          }`}
        >
          {locations.length === 0 ? (
            <p className="col-span-2 text-[12px] text-slate-400">
              {masterLoading ? "Loading locations..." : "No locations found"}
            </p>
          ) : (
            locations.map((item) => (
              <label
                key={item.value}
                className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md py-0.5"
              >
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(item.value)}
                  onChange={() => toggleLocation(item.value)}
                  className="mt-[2px] h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-indigo-600 focus:ring-indigo-500"
                />

                <span className="min-w-0 text-[12px] leading-[17px] text-[#152b4b] dark:text-slate-300">
                  {item.label}
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    );
  };

  const handleLoadDefaults = () => {
    const available = new Set(allFields.map((field) => field.id));
    const defaults = DEFAULT_FIELDS.filter((id) => available.has(id));

    setSelectedFields(
      defaults.length
        ? defaults
        : allFields.slice(0, 9).map((field) => field.id),
    );

    setSavedTemplate("none");
  };

  const handleClearFields = () => {
    setSelectedFields([]);
    setSavedTemplate("none");
  };

  const filteredGroups = useMemo(() => {
    const search = fieldSearch.trim().toLowerCase();

    if (!search) return fieldGroups;

    return fieldGroups
      .map((group) => ({
        ...group,
        fields: group.fields.filter(
          (field) =>
            field.label.toLowerCase().includes(search) ||
            group.title.toLowerCase().includes(search),
        ),
      }))
      .filter((group) => group.fields.length > 0);
  }, [fieldGroups, fieldSearch]);

  // ---------------------------------------------------
  // ACTUAL EXCEL DOWNLOAD API
  // ---------------------------------------------------

  const handleExportExcel = async () => {
    if (!selectedFields.length) {
      Swal.fire({
        icon: "warning",
        title: "Select columns",
        text: "Please select at least one column.",
      });
      return;
    }

      // LOCATION REQUIRED VALIDATION
  if (!selectedLocations.length) {
    Swal.fire({
      icon: "warning",
      title: "Location Required",
      text: "Please select at least one location before downloading the salary register.",
      confirmButtonText: "OK",
      confirmButtonColor: "#4f46e5",
    });
    return;
  }


    try {
      setLoading(true);

      const filters = getFilterPayload();

      const payload = {
        salyear: Number(year),
        SalMnth: Number(month),
        empType: employeeType,
        selectFields: getExcelSelectedFields(selectedFields),
        location: filters.location.length ? filters.location : null,
        region: filters.Region ? [filters.Region] : null,
        cluster: filters.CLUSTER ? [filters.CLUSTER] : null,
        channel: filters.CHANNEL ? [filters.CHANNEL] : null,
        section: filters.SECTION ? [filters.SECTION] : null,
        department: filters.DIVISION ? [filters.DIVISION] : null,
        designation: filters.DESIGNATION ? [filters.DESIGNATION] : null,
        blockColors,
      };

      console.log("MonthlySalaryReport Excel payload:", payload);

      const response = await postApi(
        "/hrmsreport/MonthlySalaryReport",
        payload,
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const blob = new Blob([response.data], {
        type:
          response?.headers?.["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (!blob.size) {
        throw new Error("The server returned an empty Excel file.");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `Monthly_Salary_Report_${month}_${year}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      // Save selected configuration as a database template.
      const name =
        templateName.trim() || `Monthly Salary ${getMonthLabel(month)} ${year}`;

      await saveTemplateToDatabase(
        name,
        savedTemplate !== "none" ? savedTemplate : "",
      );

      await fetchTemplates();

      setTemplateName(name);

      Swal.fire({
        icon: "success",
        title: "Excel downloaded",
        text: "Monthly salary report downloaded successfully.",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Monthly salary Excel download:", error);

      // If server returns JSON inside Blob, extract its message.
      let message = getApiError(error);

      const responseData = (error as any)?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message =
            parsed?.message || parsed?.Message || parsed?.error || message;
        } catch {
          // Keep the original error message.
        }
      }

      Swal.fire({
        icon: "error",
        title: "Unable to download Excel",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------
  // RESET FILTERS
  // ---------------------------------------------------

  const handleResetFilters = () => {
    setSelectedLocations([]);
    setRegion("all");
    setChannel("all");
    setCluster("all");
    setSection("all");
    setDepartment("all");
    setDesignation("all");

    setEmployeeType("both");
    setSavedTemplate("none");
    setTemplateName("");

    setFieldSearch("");
    setSelectedFields([]);
  };

  const periodLabel = `${getMonthLabel(month)} ${year}`;

  const employeeTypeLabel =
    EMPLOYEE_TYPES.find((item) => item.value === employeeType)?.label || "Both";

  const locationLabel = selectedLocations.length
    ? `${selectedLocations.length} location${
        selectedLocations.length > 1 ? "s" : ""
      }`
    : "all locations";

  // ---------------------------------------------------
  // UI
  // ---------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-6">
      <HashloaderComponent
        isLoading={loading || masterLoading || blocksLoading}
      />

      <div className="mx-auto min-w-0 max-w-[1800px] space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Monthly Salary Register
            </h1>

            <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400">
              Customize columns and generate your monthly salary register.
            </p>
          </div>
        </div>

        {/* FILTER SECTION */}
        <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 border-b border-[#e8edf5] p-4 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0">
              <Eselect
                title="YEAR"
                name="year"
                option={YEARS}
                initialValue={year}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="MONTH"
                name="month"
                option={MONTHS}
                initialValue={month}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="EMPLOYEE TYPE"
                name="employeeType"
                option={EMPLOYEE_TYPES}
                initialValue={employeeType}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="SAVED TEMPLATE"
                name="savedTemplate"
                option={templateOptions}
                initialValue={savedTemplate}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="min-w-0">
              <Eselect
                title="REGION"
                name="region"
                option={regionOptions}
                initialValue={region}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="CHANNEL"
                name="channel"
                option={channelOptions}
                initialValue={channel}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="CLUSTER"
                name="cluster"
                option={clusterOptions}
                initialValue={cluster}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="SECTION"
                name="section"
                option={sectionOptions}
                initialValue={section}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="DEPARTMENT"
                name="department"
                option={departmentOptions}
                initialValue={department}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="DESIGNATION"
                name="designation"
                option={designationOptions}
                initialValue={designation}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>
          </div>
        </div>

        {/* COLUMN BUILDER AND REGISTER PANEL */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_365px]">
          {/* LEFT SIDE */}
          <div className="min-w-0">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#152b4b] dark:text-slate-100">
                  Choose columns
                </h2>

                <p className="mt-0.5 text-[12px] text-[#64748b] dark:text-slate-400">
                  Tick the fields to include in the register. Order follows the
                  order you pick them.
                </p>
              </div>

              <div className="relative w-full sm:w-[270px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  placeholder="Find any field..."
                  className="h-[41px] w-full rounded-lg border border-[#dce5f1] bg-white pl-9 pr-9 text-[12px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/10"
                />

                {fieldSearch && (
                  <button
                    type="button"
                    onClick={() => setFieldSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* FIELD GROUP GRID */}
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredGroups.map((group) => {
                const allSelected = isGroupSelected(group);
                const partiallySelected = isGroupPartiallySelected(group);

                if (group.id === "locations") return renderLocationCard(group);

                return (
                  <div
                    key={group.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-[43px] items-center justify-between border-b border-[#e8edf5] bg-[#fbfcfe] px-3 dark:border-slate-800 dark:bg-slate-800/60">
                      <label className="flex min-w-0 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(element) => {
                            if (element) {
                              element.indeterminate =
                                partiallySelected && !allSelected;
                            }
                          }}
                          onChange={() => toggleGroup(group)}
                          className="h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-indigo-600 focus:ring-indigo-500"
                        />

                        <span
                          className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                          style={{ backgroundColor: group.color }}
                        />

                        <span className="truncate text-[13px] font-bold text-[#152b4b] dark:text-slate-100">
                          {group.title}
                        </span>
                      </label>

                      <span className="ml-2 rounded-full bg-[#f0f4f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b] dark:bg-slate-700 dark:text-slate-300">
                        {group.fields.length}
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-2 gap-x-2 gap-y-3 p-3 ${
                        group.fields.length > 12
                          ? "max-h-[228px] overflow-y-auto"
                          : ""
                      }`}
                    >
                      {group.fields.map((field) => {
                        const checked = selectedFields.includes(field.id);

                        return (
                          <label
                            key={field.id}
                            className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md py-0.5"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleField(field.id)}
                              className="mt-[2px] h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-indigo-600 focus:ring-indigo-500"
                            />

                            <span className="min-w-0 text-[12px] leading-[17px] text-[#152b4b] dark:text-slate-300">
                              {field.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredGroups.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-[#dce5f1] bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <Search size={25} className="mx-auto mb-2 text-slate-400" />

                  <p className="text-[13px] font-semibold text-[#52627c] dark:text-slate-300">
                    {blocksLoading
                      ? "Loading report fields..."
                      : "No matching fields"}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Try searching with another field name.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT REGISTER PANEL */}
          <div className="min-w-0">
            <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-4">
              <div className="border-b border-[#e8edf5] px-4 py-4 dark:border-slate-800">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#64748b] dark:text-slate-400">
                  Register
                </p>

                <h3 className="mt-1 text-[17px] font-bold text-[#152b4b] dark:text-slate-100">
                  {periodLabel}
                </h3>

                <p className="mt-0.5 text-[12px] text-[#64748b] dark:text-slate-400">
                  {employeeTypeLabel} · {locationLabel}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800">
                <span className="text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
                  Selected columns ({selectedFields.length})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDefaults}
                    className="h-[32px] rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400"
                  >
                    Load defaults
                  </button>

                  <button
                    type="button"
                    onClick={handleClearFields}
                    disabled={!selectedFields.length}
                    className="h-[32px] rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="min-h-[135px] max-h-[300px] overflow-y-auto p-3">
                {selectedFields.length === 0 ? (
                  <div className="flex min-h-[115px] items-center justify-center text-center">
                    <p className="max-w-[270px] text-[12px] leading-5 text-[#71839e] dark:text-slate-400">
                      No columns yet. Tick fields on the left, or load the
                      default set.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedFields.map((id, index) => {
                      const field = getSelectedField(id);
                      if (!field) return null;

                      return (
                        <div
                          key={id}
                          className="group flex items-center justify-between gap-2 rounded-lg border border-[#edf1f7] bg-[#fbfcfe] px-2.5 py-2 dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-400">
                              {index + 1}.
                            </span>

                            <span className="truncate text-[12px] font-medium text-[#334155] dark:text-slate-300">
                              {field.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            title="Remove field"
                            onClick={() => toggleField(id)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-500/10"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SAVE TEMPLATE */}
              <div className="space-y-2 border-t border-[#e8edf5] p-4 dark:border-slate-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTemplate();
                    }}
                    placeholder="Template name"
                    className="h-[38px] min-w-0 flex-1 rounded-lg border border-[#dce5f1] bg-white px-3 text-[12px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />

                  <AButton
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={!selectedFields.length || loading}
                    className="inline-flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#dce5f1] bg-white px-3 text-[12px] font-semibold text-[#152b4b] hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Save size={14} />
                    Save
                  </AButton>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!selectedFields.length || loading}
                  className="inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileSpreadsheet size={16} />
                  Download register (Excel)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
