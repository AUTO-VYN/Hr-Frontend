"use client";
import Ainput from "@/components/atoms/Input";
import SelectSearch from "@/components/atoms/Select";
import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
 

function showSideAlert(message, type) {
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

export default function Page() {
  const { formData, setFormData } = useFormData();
  const [flagMessage, setFlagMessage] = useState(false);
  const [isIphoneUser, setIsIphoneUser] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [isRelaxationOpen, setIsRelaxationOpen] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [GeoOffenceLocation, SetGeoOffenceLocation] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const user = useCurrentUser();

  const handleSelectChange = (name: any, selectedOption: any) => {
    const value = selectedOption;
    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));
  };

  const onCheck = (newCheckedKeys, info) => {
    setCheckedKeys(newCheckedKeys);

    // Update formData with selected locations as comma-separated string
    if (newCheckedKeys && newCheckedKeys.length > 0) {
      const selectedLocationsString = newCheckedKeys.join(',');
      setFormData(prev => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          GEOOFFENCELOC: selectedLocationsString
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          GEOOFFENCELOC: null
        }
      }));
    }
  };

  const onExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
  };

  const handleInputChange = (name: any, value: any) => {
    setFormData(prev => ({
      ...prev,
      EmpMst: {
        ...prev.EmpMst,
        [name]: value,
      },
    }));

    if (name == "userNameIphone" && value.length >= 3) {
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
            name: user?.name,
            user_id: user?.id,
          },
        }
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
  }, [
    formData?.EmpMst?.IsiphoneUser,
    formData?.EmpMst?.EMPCODE
  ]);

  const FetchGeoOffenceLocation = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/users/GeoOffenceLocation`,
        {},
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        }
      );
      console.log(response, "GeoOffenceLocation")
      SetGeoOffenceLocation(response.data.Result);
    } catch (error) {
      console.error("Error updating user data:", error);
      throw error;
    }
  };

  useEffect(() => {
    FetchGeoOffenceLocation();
  }, []);

  // Initialize checkedKeys from formData when GeoOffenceLocation is loaded
  useEffect(() => {
    if (GeoOffenceLocation.length > 0 && formData?.EmpMst?.GEOOFFENCELOC && !isInitialized) {
      const geoLocString = formData.EmpMst.GEOOFFENCELOC;

      if (geoLocString) {
        // Split the comma-separated string into an array of keys
        const selectedKeys = geoLocString.split(',').map(key => key.trim());

        // Filter to only include keys that exist in GeoOffenceLocation
        const validKeys = selectedKeys.filter(key =>
          GeoOffenceLocation.some(loc => loc.value.toString() === key)
        );

        setCheckedKeys(validKeys);
        setIsInitialized(true);
      }
    }
  }, [GeoOffenceLocation, formData?.EmpMst?.GEOOFFENCELOC, isInitialized]);

  // Reset initialization when formData changes significantly (new employee loaded)
  useEffect(() => {
    // If GEOOFFENCELOC is empty or null, reset initialization
    if (!formData?.EmpMst?.GEOOFFENCELOC) {
      setCheckedKeys([]);
      setIsInitialized(false);
    }
  }, [formData?.EmpMst?.EMPCODE]); // Re-run when EMPCODE changes (new employee loaded)

  const transformedGeoData = GeoOffenceLocation.map(item => ({
    key: item.value.toString(),
    title: item.label,
    splRem: item.splRem,
    children: []
  }));

  const isLocationSelectable = (location) => {
    return !!(location?.splRem && location.splRem.toString().trim() !== "");
  };

  const handleLocationToggle = (location) => {
    if (!isLocationSelectable(location)) {
      showSideAlert(`Geo location is not set for ${location.title} — cannot select it`, "warning");
      return;
    }
    const isChecked = checkedKeys.includes(location.key);
    const newChecked = !isChecked
      ? [...checkedKeys, location.key]
      : checkedKeys.filter(key => key !== location.key);
    onCheck(newChecked, { checked: !isChecked, node: location });
  };

  const filteredLocations = transformedGeoData.filter(location =>
    location.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setIsAllSelected(checked);

    const selectableFiltered = filteredLocations.filter(isLocationSelectable);
    const skippedLocations = filteredLocations.filter(loc => !isLocationSelectable(loc));

    if (checked) {
      const filteredKeys = selectableFiltered.map(item => item.key);
      const otherSelectedKeys = checkedKeys.filter(key =>
        !filteredLocations.some(loc => loc.key === key)
      );
      onCheck([...otherSelectedKeys, ...filteredKeys], { checked: true });

      if (skippedLocations.length > 0) {
        const msg = skippedLocations.length === 1
          ? `Geo location is not set for ${skippedLocations[0].title} — cannot select it`
          : `Geo location is not set for ${skippedLocations.length} locations — cannot select them`;
        showSideAlert(msg, "warning");
      }
    } else {
      const remainingKeys = checkedKeys.filter(key =>
        !filteredLocations.some(loc => loc.key === key)
      );
      onCheck(remainingKeys, { checked: false });
    }
  };

  useEffect(() => {
    const selectableFiltered = filteredLocations.filter(isLocationSelectable);
    if (selectableFiltered.length > 0) {
      const allFilteredSelected = selectableFiltered.every(loc =>
        checkedKeys.includes(loc.key)
      );
      setIsAllSelected(allFilteredSelected);
    } else {
      setIsAllSelected(false);
    }
  }, [checkedKeys, filteredLocations]);

  return (
    <>
      <div
        className="tab-pane fade "
        id="ex1-tabs-7"
        role="tabpanel"
        aria-labelledby="ex1-tab-7"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="col-span-1  ">
            <div className="">
              <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">
                <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                  Mobile App access
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
                <div className="col-span-1">
                  <div className="grid grid-cols-1">
                    <div className="col-span-1 mt-1.5 mb-1">
                      <SelectSearch
                        name={"App_Attendance"}
                        title="Allow App Attendance"
                        options={yesno}
                        selectedValue={formData.EmpMst.App_Attendance}
                        handleInputChange={handleInputChange}
                        className="h-[30px]"
                      />
                    </div>

                    <div className="col-span-1">
                      <div className="p-1">
                        <Ainput
                          title="Mobile IMEI Number:"
                          type="text"
                          name="IEMI"
                          value={formData.EmpMst.IEMI}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                          ShortName
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="p-1">
                        <Ainput
                          title="Android Mobile id:"
                          type="text"
                          name="Android_ID"
                          value={formData.EmpMst.Android_ID}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="p-1">
                        <div className="grid grid-cols-12 gap-x-2">
                          <div className="col-span-12 md:col-span-6">
                            <SelectSearch
                              title="Allow Mobile App Punch In/Out:"
                              name="mPunch"
                              options={yesno}
                              selectedValue={formData.EmpMst.mPunch}
                              handleInputChange={handleInputChange}
                              className="h-[30px]"
                            />
                          </div>

                          <div className="col-span-12 md:col-span-6">
                            <SelectSearch
                              options={yesno}
                              title="MOBILE RIGHTS"
                              name="MOBILE_RIGHTS"
                              selectedValue={formData.EmpMst.MOBILE_RIGHTS?.toString()}
                              handleInputChange={handleInputChange}
                              disabled={formData.EmpMst?.mobile_rights_flag}
                              className="h-[30px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="grid grid-cols-1">
                    <div className="col-span-1">
                      <div className="p-1">
                        <SelectSearch
                          options={yesno}
                          title="Allow Mobile Misspunch Request:"
                          name="mMispunch"
                          selectedValue={formData.EmpMst.mMispunch}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="p-1">
                        <SelectSearch
                          options={yesno}
                          title="Allow Mobile App Punch Approval:"
                          name="mApprove"
                          selectedValue={formData.EmpMst.mApprove}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="p-1 ">
                        <SelectSearch
                          options={yesno}
                          title="Allow Mobile App Leave Request:"
                          name="mLeave"
                          selectedValue={formData.EmpMst.mLeave}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="p-1">
                        <SelectSearch
                          options={yesno}
                          title="Allow Attendance Calendar View:"
                          name="mCalender"
                          selectedValue={formData.EmpMst.mCalender}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">
                <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                  Employee Reporting tree
                </h1>
              </div>
              <div className="grid grid-cols-12 gap-3 p-4 py-10 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
                <div className="col-span-4">
                  <div className="p-1">
                    <Ainput
                      title="Reporting 1"
                      type="text"
                      name="Reporting_1"
                      className="form-control !h-8"
                      value={formData?.EmpMst.Reporting_1}
                      handleInputChange={handleInputChange}
                      disabled
                    />
                  </div>
                </div>

                <div className="col-span-4  ">
                  <div className="p-1">
                    <Ainput
                      title="Reporting 2"
                      type="text"
                      name="Reporting_2"
                      className="form-control !h-8"
                      value={formData.EmpMst.Reporting_2}
                      handleInputChange={handleInputChange}
                      disabled
                    />
                  </div>
                </div>

                <div className="col-span-4  ">
                  <div className="p-1">
                    <Ainput
                      title="HR Team"
                      type="text"
                      name="Reporting_3"
                      className="form-control !h-8"
                      value={formData.EmpMst.Reporting_3}
                      ShortName={true}
                      handleInputChange={handleInputChange}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 mb-3">
              <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">
                <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                  Employee MSPN ID
                </h1>
              </div>

              <div className="grid grid-cols-12 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
                <div className="col-span-3">
                  <div className="p-1">
                    <Ainput
                      title="MSPIN"
                      type="text"
                      name="MSPIN"
                      value={formData.EmpMst.MSPIN}
                      handleInputChange={handleInputChange}
                      className="h-[30px]"
                      ShortName={true}
                    />
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="p-1">
                    <Ainput
                      title="MSPN Id"
                      type="text"
                      name="MSPN_Id"
                      value={formData.EmpMst.MSPN_Id}
                      handleInputChange={handleInputChange}
                      className="h-[30px]"
                      ShortName={true}
                    />
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="p-1">
                    <SelectSearch
                      options={yesno}
                      title="MSPN Certified"
                      name="IsMSPN"
                      selectedValue={formData.EmpMst.IsMSPN?.toString()}
                      handleInputChange={handleInputChange}
                      className="h-[30px]"
                      ShortName={true}
                    />
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="p-1">
                    <Ainput
                      title="MSPN DTL"
                      type="text"
                      name="MSPN_DTL"
                      value={formData.EmpMst.MSPN_DTL}
                      handleInputChange={handleInputChange}
                      className="h-[30px]"
                      ShortName={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1">
            {/* GEO-OFFENCE LOCATION section */}
            <div className="grid grid-cols-1">
              <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-1 border dark:border-[#D0D5DD]">
                <div className="flex justify-between items-center">
                  <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                    GEO-OFFENCE LOCATION
                  </h1>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search locations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-black text-gray-900 dark:text-white
                     focus:outline-none focus:ring-1 focus:ring-[#193A69] dark:focus:ring-[#37a9dd]
                     w-48"
                      />
                      <svg
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-white dark:text-[#37a9dd] text-sm font-medium cursor-pointer select-none">
                        Select All
                      </label>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-md border cursor-pointer transition-all duration-200
                ${isAllSelected
                              ? 'bg-[#193A69] dark:bg-[#37a9dd] border-[#193A69] dark:border-[#37a9dd]'
                              : 'bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] '
                            }`}
                          onClick={() => handleSelectAll({ target: { checked: !isAllSelected } })}
                        >
                          {isAllSelected && (
                            <svg
                              className="w-4 h-4 text-white mx-auto mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-6 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] 
    rounded-b shadow overflow-y-auto h-[285px]">

                <div className="grid grid-cols-2 gap-4">
                  {filteredLocations.length > 0 ? (
                    <>
                      <div className="space-y-1">
                        {filteredLocations.slice(0, Math.ceil(filteredLocations.length / 2)).map((location) => (
                          <div key={location.key} className="flex items-center gap-2 py-1">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={checkedKeys.includes(location.key)}
                                onChange={() => handleLocationToggle(location)}
                                disabled={!isLocationSelectable(location)}
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded-md border cursor-pointer transition-all duration-200
        ${checkedKeys.includes(location.key)
                                    ? 'bg-[#193A69] dark:bg-[#37a9dd] border-[#193A69] dark:border-[#37a9dd]'
                                    : 'bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] '
                                  }
        ${!isLocationSelectable(location) ? 'opacity-40 cursor-not-allowed' : ''}
      `}
                                onClick={() => handleLocationToggle(location)}
                              >
                                {checkedKeys.includes(location.key) && (
                                  <svg
                                    className="w-4 h-4 text-white mx-auto mt-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={location.title}>
                              {location.title}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        {filteredLocations.slice(Math.ceil(filteredLocations.length / 2)).map((location) => (
                          <div key={location.key} className="flex items-center gap-2 py-1">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={checkedKeys.includes(location.key)}
                                onChange={() => handleLocationToggle(location)}
                                disabled={!isLocationSelectable(location)}
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded-md border cursor-pointer transition-all duration-200
        ${checkedKeys.includes(location.key)
                                    ? 'bg-[#193A69] dark:bg-[#37a9dd] border-[#193A69] dark:border-[#37a9dd]'
                                    : 'bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] '
                                  }
        ${!isLocationSelectable(location) ? 'opacity-40 cursor-not-allowed' : ''}
      `}
                                onClick={() => handleLocationToggle(location)}
                              >
                                {checkedKeys.includes(location.key) && (
                                  <svg
                                    className="w-4 h-4 text-white mx-auto mt-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={location.title}>
                              {location.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                      No locations found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rest of your component remains the same */}
            <div className="grid grid-cols-1 mt-3">
              <div
                className="rounded-t bg-[#193A69] dark:bg-black px-3 py-1 border dark:border-[#D0D5DD] cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsRelaxationOpen(!isRelaxationOpen)}
              >
                <div className="flex justify-between items-center">
                  <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                    In/Out time in Relaxation in hrs
                  </h1>
                  <span className="text-white dark:text-[#37a9dd] text-lg">
                    {isRelaxationOpen ? '−' : '+'}
                  </span>
                </div>
              </div>

              {isRelaxationOpen && (
                <div className="col-span-6 gap-3 p-3 py-11 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <SelectSearch
                        options={type}
                        title="Relaxation Type:"
                        selectedValue={formData.EmpMst.Relaxation_Type?.toString()}
                        name="Relaxation_Type"
                        handleInputChange={handleInputChange}
                        className="h-[30px]"
                      />
                    </div>

                    <div className="col-span-1">
                      <Ainput
                        title="Shift In Relation (in hrs):"
                        type="text"
                        name="ShiftIn_Relaxation"
                        value={formData.EmpMst.ShiftIn_Relaxation}
                        handleInputChange={handleInputChange}
                        className="h-[30px]"
                      />
                    </div>

                    <div className="col-span-1">
                      <Ainput
                        title="Shift Out Relation (in hrs):"
                        type="text"
                        value={formData.EmpMst.ShiftOut_Relaxation}
                        name="ShiftOut_Relaxation"
                        handleInputChange={handleInputChange}
                        className="h-[30px]"
                      />
                    </div>

                    <div className="col-span-1">
                      <Ainput
                        title="Cumulative Shift Relation:"
                        type="number"
                        value={formData.EmpMst.Cumulative_Relaxation}
                        name="Cumulative_Relaxation"
                        handleInputChange={handleInputChange}
                        className="h-[30px]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`transition-all duration-300 ${isRelaxationOpen ? 'hidden' : 'block'}`}>
              <div className="mt-3 rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">
                <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                  Link Multiple Employee Codes
                </h1>
              </div>

              <div className="col-span-12">
                <div className="w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
                    <div className="col-span-12 md:col-span-1">
                      <div className="p-1">
                        <Ainput
                          title="EMP Code2:"
                          type="text"
                          name="empcode2"
                          value={formData.EmpMst.empcode2}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                        />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-1">
                      <div className="p-1">
                        <Ainput
                          title="EMP Code3:"
                          type="text"
                          name="empcode3"
                          value={formData.EmpMst.empcode3}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                        />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-1">
                      <div className="p-1">
                        <Ainput
                          title="EMP Code4:"
                          type="text"
                          name="empcode4"
                          className="form-input !h-8"
                          value={formData.EmpMst.empcode4}
                          handleInputChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-300 ${isRelaxationOpen ? 'hidden' : 'block'}`}>
              <div className="mt-3 mb-3">
                <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">
                  <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                    USE IPHONE
                  </h1>
                </div>

                <div className="grid grid-cols-12 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
                  <div className="col-span-4">
                    <div className="p-1">
                      <SelectSearch
                        options={yesno}
                        title="IPHONE USER"
                        name="IsiphoneUser"
                        selectedValue={formData.EmpMst.IsiphoneUser?.toString()}
                        handleInputChange={handleInputChange}
                        className="h-[30px]"
                        ShortName={true}
                      />
                    </div>
                  </div>

                  {isIphoneUser && (
                    <div className="col-span-4">
                      <div className="p-1">
                        <Ainput
                          title="User Name"
                          type="text"
                          name="userNameIphone"
                          value={formData.EmpMst.userNameIphone || formData.EmpMst.EMPCODE}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                          ShortName={true}
                          disabled
                        />
                      </div>
                    </div>
                  )}

                  {isIphoneUser && (
                    <div className="col-span-4">
                      <div className="p-1">
                        <Ainput
                          title="User Pass"
                          type="text"
                          name="userPassIphone"
                          value={formData.EmpMst.userPassIphone}
                          handleInputChange={handleInputChange}
                          className="h-[30px]"
                          ShortName={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}