import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  BadgeCheck,
  CheckSquare,
  ChevronDown,
  Clock,
  GitBranch,
  Link2,
  MapPin,
  Search,
  Smartphone,
  Square,
} from "lucide-react";

import Ainput from "@/components/atoms/Input";
import SelectSearch from "@/components/atoms/Select";
import { useFormData } from "./Context/FormDataContext";
import { useCurrentUser } from "@/app/hooks/use-current-user";

type AlertType = "success" | "error" | "warning" | "info" | "question";

function showSideAlert(message: string, type: AlertType) {
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

  Toast.fire({
    icon: type,
    title: message,
  });
}

const yesno = [
  { value: "1", label: "YES" },
  { value: "2", label: "NO" },
];

const type = [
  { value: "1", label: "TYPE1" },
  { value: "2", label: "TYPE2" },
];

function Card({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          {icon ? <span className="text-violet-600">{icon}</span> : null}
          <h2 className="text-sm font-semibold tracking-wider text-slate-900 uppercase">
            {title}
          </h2>
        </div>
        {right}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function Page() {
  const { formData, setFormData } = useFormData();
  const user = useCurrentUser();

  const [flagMessage, setFlagMessage] = useState<any>(false);
  const [isIphoneUser, setIsIphoneUser] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

  const [isRelaxationOpen, setIsRelaxationOpen] = useState(false);

  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<any[]>([]);
  const [GeoOffenceLocation, SetGeoOffenceLocation] = useState<any[]>([]);

  const [isAllSelected, setIsAllSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ Scroll fix (ONLY): make this tab content area take remaining viewport height and scroll fully
  const scrollWrapRef = useRef<HTMLDivElement | null>(null);
  const [scrollWrapHeight, setScrollWrapHeight] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => {
      const el = scrollWrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top; // viewport top offset
      const h = Math.max(200, window.innerHeight - top); // remaining height
      setScrollWrapHeight(h);
    };

    // run after layout paint
    const raf = requestAnimationFrame(calc);
    window.addEventListener("resize", calc);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", calc);
    };
  }, []);

  const handleSelectChange = (name: any, selectedOption: any) => {
    const value = selectedOption;
    setFormData((prevData: any) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));
  };

  const onCheck = (newCheckedKeys: string[], info: any) => {
    setCheckedKeys(newCheckedKeys);

    if (newCheckedKeys && newCheckedKeys.length > 0) {
      const selectedLocationsString = newCheckedKeys.join(",");
      setFormData((prev: any) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          GEOOFFENCELOC: selectedLocationsString,
        },
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          GEOOFFENCELOC: null,
        },
      }));
    }
  };

  const onExpand = (newExpandedKeys: any[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  const handleInputChange = (name: any, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      EmpMst: {
        ...prev.EmpMst,
        [name]: value,
      },
    }));

    if (name == "userNameIphone" && value?.length >= 3) {
      checkUsernameAvailability(value);
    }

    if (name == "IsiphoneUser") {
      setIsIphoneUser(value == "1");
      setIsUsernameValid(false);
    }
  };

  useEffect(() => {
    const syncIphoneUser = async () => {
      const isIphone = formData?.EmpMst?.IsiphoneUser == "1";
      setIsIphoneUser(isIphone);

      if (isIphone && formData?.EmpMst?.userNameIphone) {
        await checkUsernameAvailability(formData.EmpMst.userNameIphone);
      }
    };

    syncIphoneUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.EmpMst?.IsiphoneUser]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setIsUsernameValid(false);
      return;
    }

    setCheckingUser(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/CheakExistingUserName`,
        { User_Name: username },
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
            user_id: (user as any)?.id,
          },
        },
      );

      if (!res.data.success) {
        setIsUsernameValid(false);
        setFlagMessage(res.data.message);
        showSideAlert(res.data.message, "error");
      } else {
        setIsUsernameValid(true);
        setFlagMessage(null);
        showSideAlert("Username available", "success");
      }
    } catch (error) {
      console.error("Username check error:", error);
      setIsUsernameValid(false);
      showSideAlert("Unable to verify username", "error");
    } finally {
      setCheckingUser(false);
    }
  };

  useEffect(() => {
    if (
      formData?.EmpMst?.IsiphoneUser == "1" &&
      !formData?.EmpMst?.userNameIphone &&
      formData?.EmpMst?.EMPCODE
    ) {
      handleInputChange("userNameIphone", formData.EmpMst.EMPCODE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.EmpMst?.IsiphoneUser, formData?.EmpMst?.EMPCODE]);

  const FetchGeoOffenceLocation = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/users/GeoOffenceLocation`,
        {},
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
            token: (user as any)?.email,
          },
        },
      );
      SetGeoOffenceLocation(response.data.Result);
    } catch (error) {
      console.error("Error updating user data:", error);
      throw error;
    }
  };

  useEffect(() => {
    FetchGeoOffenceLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      GeoOffenceLocation.length > 0 &&
      formData?.EmpMst?.GEOOFFENCELOC &&
      !isInitialized
    ) {
      const geoLocString = formData.EmpMst.GEOOFFENCELOC;

      if (geoLocString) {
        const selectedKeys = geoLocString
          .split(",")
          .map((key: string) => key.trim());

        const validKeys = selectedKeys.filter((key: string) =>
          GeoOffenceLocation.some((loc: any) => loc.value.toString() === key),
        );

        setCheckedKeys(validKeys);
        setIsInitialized(true);
      }
    }
  }, [GeoOffenceLocation, formData?.EmpMst?.GEOOFFENCELOC, isInitialized]);

  useEffect(() => {
    if (!formData?.EmpMst?.GEOOFFENCELOC) {
      setCheckedKeys([]);
      setIsInitialized(false);
    }
  }, [formData?.EmpMst?.EMPCODE]);

  const transformedGeoData = useMemo(
    () =>
      GeoOffenceLocation.map((item: any) => ({
        key: item.value.toString(),
        title: item.label,
        splRem: item.splRem,
        children: [],
      })),
    [GeoOffenceLocation],
  );

  const isLocationSelectable = (location: any) => {
    return !!(location?.splRem && location.splRem.toString().trim() !== "");
  };

  const handleLocationToggle = (location: any) => {
    if (!isLocationSelectable(location)) {
      showSideAlert(
        `Geo location is not set for ${location.title} — cannot select it`,
        "warning",
      );
      return;
    }

    const isChecked = checkedKeys.includes(location.key);
    const newChecked = !isChecked
      ? [...checkedKeys, location.key]
      : checkedKeys.filter((key) => key !== location.key);

    onCheck(newChecked, { checked: !isChecked, node: location });
  };

  const filteredLocations = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return transformedGeoData.filter((location: any) =>
      location.title.toLowerCase().includes(t),
    );
  }, [transformedGeoData, searchTerm]);

  const handleSelectAll = (e: any) => {
    const checked = e.target.checked;
    setIsAllSelected(checked);

    const selectableFiltered = filteredLocations.filter(isLocationSelectable);
    const skippedLocations = filteredLocations.filter(
      (loc: any) => !isLocationSelectable(loc),
    );

    if (checked) {
      const filteredKeys = selectableFiltered.map((item: any) => item.key);
      const otherSelectedKeys = checkedKeys.filter(
        (key) => !filteredLocations.some((loc: any) => loc.key === key),
      );

      onCheck([...otherSelectedKeys, ...filteredKeys], { checked: true });

      if (skippedLocations.length > 0) {
        const msg =
          skippedLocations.length === 1
            ? `Geo location is not set for ${skippedLocations[0].title} — cannot select it`
            : `Geo location is not set for ${skippedLocations.length} locations — cannot select them`;
        showSideAlert(msg, "warning");
      }
    } else {
      const remainingKeys = checkedKeys.filter(
        (key) => !filteredLocations.some((loc: any) => loc.key === key),
      );
      onCheck(remainingKeys, { checked: false });
    }
  };

  useEffect(() => {
    const selectableFiltered = filteredLocations.filter(isLocationSelectable);
    if (selectableFiltered.length > 0) {
      const allFilteredSelected = selectableFiltered.every((loc: any) =>
        checkedKeys.includes(loc.key),
      );
      setIsAllSelected(allFilteredSelected);
    } else {
      setIsAllSelected(false);
    }
  }, [checkedKeys, filteredLocations]);

  const selectedCount = checkedKeys.length;

  return (
    <>
      <div
        className="tab-pane fade min-h-0"
        id="ex1-tabs-7"
        role="tabpanel"
        aria-labelledby="ex1-tab-7"
      >
        {/* ✅ Scroll container */}
        <div
          ref={scrollWrapRef}
          style={scrollWrapHeight ? { height: scrollWrapHeight } : undefined}
          className="min-h-0 overflow-y-auto pr-2 pb-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <Card
                title="Mobile app access"
                icon={<Smartphone className="h-5 w-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <SelectSearch
                    name={"App_Attendance"}
                    title="Allow app attendance"
                    options={yesno}
                    selectedValue={formData?.EmpMst?.App_Attendance}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />

                  <SelectSearch
                    options={yesno}
                    title="Allow mobile misspunch request"
                    name="mMispunch"
                    selectedValue={formData?.EmpMst?.mMispunch}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />

                  <Ainput
                    title="Mobile IMEI number"
                    label="Mobile IMEI number"
                    type="text"
                    name="IEMI"
                    value={formData?.EmpMst?.IEMI}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    ShortName
                  />

                  <SelectSearch
                    options={yesno}
                    title="Allow mobile app punch approval"
                    name="mApprove"
                    selectedValue={formData?.EmpMst?.mApprove}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />

                  <Ainput
                    title="Android mobile id"
                    label="Android mobile id"
                    type="text"
                    name="Android_ID"
                    value={formData?.EmpMst?.Android_ID}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />

                  <SelectSearch
                    options={yesno}
                    title="Allow mobile app leave request"
                    name="mLeave"
                    selectedValue={formData?.EmpMst?.mLeave}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />

                  <SelectSearch
                    title="Allow mobile app punch in/out"
                    name="mPunch"
                    options={yesno}
                    selectedValue={formData?.EmpMst?.mPunch}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />

                  <SelectSearch
                    options={yesno}
                    title="Allow attendance calendar view"
                    name="mCalender"
                    selectedValue={formData?.EmpMst?.mCalender}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />

                  <div className="md:col-span-2">
                    <SelectSearch
                      options={yesno}
                      title="Mobile rights"
                      name="MOBILE_RIGHTS"
                      selectedValue={formData?.EmpMst?.MOBILE_RIGHTS?.toString()}
                      handleInputChange={handleInputChange}
                      disabled={formData?.EmpMst?.mobile_rights_flag}
                      className="h-11"
                    />
                  </div>
                </div>
              </Card>

              <Card
                title="Employee reporting tree"
                icon={<GitBranch className="h-5 w-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SelectSearch
                    title="Reporting 1"
                    name="Reporting_1"
                    options={[]} // <-- yahan Reporting-1 ke options pass karo (employees list etc.)
                    selectedValue={formData?.EmpMst?.Reporting_1}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    placeholder="Select"
                  />

                  <SelectSearch
                    title="Reporting 2"
                    name="Reporting_2"
                    options={[]} // <-- yahan Reporting-2 ke options pass karo
                    selectedValue={formData?.EmpMst?.Reporting_2}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    placeholder="Select"
                  />

                  <SelectSearch
                    title="HR team"
                    name="Reporting_3"
                    options={[]} // <-- yahan HR team ke options pass karo
                    selectedValue={formData?.EmpMst?.Reporting_3}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    placeholder="Select"
                  />
                </div>
              </Card>

              <Card
                title="Link multiple employee codes"
                icon={<Link2 className="h-5 w-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Ainput
                    title="Emp code 2"
                    type="text"
                    name="empcode2"
                    placeholder="Emp code 2"
                    value={formData?.EmpMst?.empcode2}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />
                  <Ainput
                    title="Emp code 3"
                    type="text"
                    name="empcode3"
                    placeholder="Emp code 3"
                    value={formData?.EmpMst?.empcode3}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />
                  <Ainput
                    title="Emp code 4"
                    type="text"
                    name="empcode4"
                    placeholder="Emp code 4"
                    value={formData?.EmpMst?.empcode4}
                    handleInputChange={handleInputChange}
                    className="h-11"
                  />
                </div>
              </Card>

              <Card
                title="Use iPhone"
                icon={<Smartphone className="h-5 w-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3">
                    <SelectSearch
                      options={yesno}
                      title="iPhone user"
                      name="IsiphoneUser"
                      selectedValue={formData?.EmpMst?.IsiphoneUser?.toString()}
                      handleInputChange={handleInputChange}
                      className="h-11"
                      ShortName={true}
                    />
                  </div>

                  {isIphoneUser && (
                    <Ainput
                      title="User name"
                      type="text"
                      name="userNameIphone"
                      value={
                        formData?.EmpMst?.userNameIphone ||
                        formData?.EmpMst?.EMPCODE
                      }
                      handleInputChange={handleInputChange}
                      className="h-11"
                      ShortName={true}
                      disabled
                    />
                  )}

                  {isIphoneUser && (
                    <Ainput
                      title="User pass"
                      type="text"
                      name="userPassIphone"
                      value={formData?.EmpMst?.userPassIphone}
                      handleInputChange={handleInputChange}
                      className="h-11"
                      ShortName={true}
                    />
                  )}

                  {isIphoneUser && (
                    <div className="md:col-span-1 flex items-end">
                      <div className="text-xs text-slate-500">
                        {checkingUser ? "Checking username..." : null}
                        {!checkingUser && flagMessage ? (
                          <span className="text-red-600">
                            {String(flagMessage)}
                          </span>
                        ) : null}
                        {!checkingUser && isUsernameValid ? (
                          <span className="text-green-600">
                            Username available
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <Card
                title="Geo-fence location"
                icon={<MapPin className="h-5 w-5" />}
                right={
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAll({ target: { checked: !isAllSelected } })
                    }
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition
                      ${
                        isAllSelected
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <CheckSquare className="h-4 w-4" />
                    Select all
                  </button>
                }
              >
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search locations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  <div className="text-sm text-slate-600">
                    <span className="font-medium">{selectedCount}</span>{" "}
                    selected
                  </div>

                  <div className="h-[285px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
                    {filteredLocations.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                        {[
                          filteredLocations.slice(
                            0,
                            Math.ceil(filteredLocations.length / 2),
                          ),
                          filteredLocations.slice(
                            Math.ceil(filteredLocations.length / 2),
                          ),
                        ].map((col, colIdx) => (
                          <div key={colIdx} className="space-y-3">
                            {col.map((location: any) => {
                              const checked = checkedKeys.includes(
                                location.key,
                              );
                              const selectable = isLocationSelectable(location);

                              return (
                                <button
                                  key={location.key}
                                  type="button"
                                  onClick={() => handleLocationToggle(location)}
                                  disabled={!selectable}
                                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition
                                    ${
                                      !selectable
                                        ? "cursor-not-allowed opacity-50"
                                        : "hover:bg-slate-50"
                                    }`}
                                >
                                  <span className="text-slate-700">
                                    {checked ? (
                                      <CheckSquare className="h-5 w-5" />
                                    ) : (
                                      <Square className="h-5 w-5" />
                                    )}
                                  </span>
                                  <span
                                    className="truncate text-sm text-slate-800"
                                    title={location.title}
                                  >
                                    {location.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center text-sm text-slate-500">
                        No locations found
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card
                title="In/Out time relaxation in hrs"
                icon={<Clock className="h-5 w-5" />}
                right={
                  <button
                    type="button"
                    onClick={() => setIsRelaxationOpen((s) => !s)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    aria-label="Toggle relaxation"
                  >
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${
                        isRelaxationOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>
                }
              >
                {isRelaxationOpen ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Ainput
                      title="In time relaxation (hrs)"
                      label="In time relaxation (hrs)"
                      type="text"
                      name="ShiftIn_Relaxation"
                      value={formData?.EmpMst?.ShiftIn_Relaxation}
                      handleInputChange={handleInputChange}
                      className="h-11"
                    />

                    <Ainput
                      title="Out time relaxation (hrs)"
                      label="Out time relaxation (hrs)"
                      type="text"
                      value={formData?.EmpMst?.ShiftOut_Relaxation}
                      name="ShiftOut_Relaxation"
                      handleInputChange={handleInputChange}
                      className="h-11"
                    />

                    <div className="md:col-span-2">
                      <SelectSearch
                        options={type}
                        title="Apply on"
                        selectedValue={formData?.EmpMst?.Relaxation_Type?.toString()}
                        name="Relaxation_Type"
                        handleInputChange={handleInputChange}
                        className="h-11"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    {/* collapsed */}
                  </div>
                )}
              </Card>

              <Card
                title="Employee MSPN id"
                icon={<BadgeCheck className="h-5 w-5" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <Ainput
                    title="MSPIN"
                    label="MSPIN"
                    type="text"
                    name="MSPIN"
                    value={formData?.EmpMst?.MSPIN}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    ShortName={true}
                  />

                  <Ainput
                    title="MSPN id"
                    label="MSPN id"
                    type="text"
                    name="MSPN_Id"
                    value={formData?.EmpMst?.MSPN_Id}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    ShortName={true}
                  />

                  <SelectSearch
                    options={yesno}
                    title="MSPN certified"
                    name="IsMSPN"
                    selectedValue={formData?.EmpMst?.IsMSPN?.toString()}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    ShortName={true}
                  />

                  <Ainput
                    title="MSPN DTL"
                    label="MSPN DTL"
                    type="text"
                    name="MSPN_DTL"
                    value={formData?.EmpMst?.MSPN_DTL}
                    handleInputChange={handleInputChange}
                    className="h-11"
                    ShortName={true}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}