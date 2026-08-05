"use client";

import React from "react";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import FileViewer from "@/components/atoms/Fileviewer";
import { RotateCw } from "lucide-react";

type Props = {
  user: any;

  formData: any;
  SaveDisable: boolean;
  IsGenerate: boolean;

  empcode: any[];
  MrOptions: any[];
  GenderOptions: any[];
  Type: any[];

  SalRegionoption: any[];
  CHANEELOPTION: any[];
  CLUSTEROPTION: any[];
  locationnoption: any[];
  SECTIONoption: any[];
  divisionoption: any[];
  EMPLOYEEDESIGNATIONoption: any[];

  handleEmpChange: (name: string, value: any) => void;
  handleInputChange: (name: string, value: any) => void;
  handleLocationChange: (name: string, value: any) => void;
  Generatecode: () => void;

  profileSrc: any;
  handleFileChange: (e: any) => void;
};

export default function EmployeeIdentitySection({
  user,
  formData,
  SaveDisable,
  IsGenerate,
  empcode,
  MrOptions,
  GenderOptions,
  Type,
  SalRegionoption,
  CHANEELOPTION,
  CLUSTEROPTION,
  locationnoption,
  SECTIONoption,
  divisionoption,
  EMPLOYEEDESIGNATIONoption,
  handleEmpChange,
  handleInputChange,
  handleLocationChange,
  Generatecode,
  profileSrc,
  handleFileChange,
}: Props) {
  return (
    <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl p-4 md:p-6">
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT FORM */}
        <div className="col-span-12 lg:col-span-9">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1 */}
            {user?.role1.includes("1.1.1") && (
              <div className="col-span-12 md:col-span-6 xl:col-span-3">
                <Eselect
                  title="Employee code"
                  redlabel="*"
                  name="SrNo"
                  handleInputChange={handleEmpChange}
                  option={empcode}
                  disabled={SaveDisable}
                  initialValue=""
                />
              </div>
            )}

            <div className="col-span-12 md:col-span-6 xl:col-span-2">
              <Einput
                type="text"
                name="EMPCODE"
                title="Empcode"
                value={formData?.EmpMst?.EMPCODE}
                handleInputChange={handleInputChange}
                disabled={IsGenerate}
              />
            </div>

            <div className="col-span-6 md:col-span-2 xl:col-span-1 flex items-end">
              <Button
                variant="outline"
                onClick={Generatecode}
                disabled={SaveDisable}
                className="h-10 w-full rounded-xl"
                title="Generate new code"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="col-span-6 md:col-span-4 xl:col-span-2">
              <Eselect
                title="Title"
                option={MrOptions}
                name="TITLE"
                initialValue={formData?.EmpMst?.TITLE?.toString()?.toLowerCase()}
                handleInputChange={handleInputChange}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-2">
              <Einput
                type="text"
                name="EMPFIRSTNAME"
                title="First name"
                value={formData?.EmpMst?.EMPFIRSTNAME}
                handleInputChange={handleInputChange}
                className="uppercase"
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-2">
              <Einput
                type="text"
                name="EMPLASTNAME"
                title="Last name"
                value={formData?.EmpMst?.EMPLASTNAME}
                handleInputChange={handleInputChange}
                className="uppercase"
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-2">
              <Eselect
                title="Gender"
                option={GenderOptions}
                name="GENDER"
                initialValue={formData?.EmpMst?.GENDER?.toString()}
                handleInputChange={handleInputChange}
              />
            </div>

            {/* Row 2 */}
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <Eselect
                title="Employee type"
                option={Type}
                name="EmpType"
                initialValue={formData?.EmpMst?.EmpType?.toString()?.toLowerCase()}
                handleInputChange={handleInputChange}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <Eselect
                option={SalRegionoption}
                title="Region"
                name="Sal_Region"
                initialValue={
                  formData?.EmpMst?.Sal_Region
                    ? formData?.EmpMst?.Sal_Region?.toString()
                    : null
                }
                handleInputChange={handleInputChange}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-2">
              <Eselect
                option={CHANEELOPTION}
                title="Channel"
                name="CHANNEL"
                handleInputChange={handleInputChange}
                initialValue={formData?.EmpMst?.CHANNEL?.toString()}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-2">
              <Eselect
                option={CLUSTEROPTION}
                title="Cluster"
                name="CLUSTER"
                handleInputChange={handleInputChange}
                initialValue={formData?.EmpMst?.CLUSTER?.toString()}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-2">
              <Eselect
                option={locationnoption}
                title="Location"
                name="LOCATION"
                initialValue={formData?.EmpMst?.LOCATION?.toString()}
                handleInputChange={handleLocationChange}
              />
            </div>

            {/* Row 3 */}
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <Eselect
                option={SECTIONoption}
                name="SECTION"
                title="Section"
                initialValue={formData?.EmpMst?.SECTION?.toString()}
                handleInputChange={handleInputChange}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <Eselect
                option={divisionoption}
                title="Department"
                name="DIVISION"
                initialValue={formData?.EmpMst?.DIVISION?.toString()}
                handleInputChange={handleInputChange}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <Eselect
                option={EMPLOYEEDESIGNATIONoption}
                title="Employee designation"
                name="EMPLOYEEDESIGNATION"
                initialValue={formData?.EmpMst?.EMPLOYEEDESIGNATION?.toString()}
                handleInputChange={handleInputChange}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <Einput
                type="text"
                title="Emp. punch code"
                name="PAY_CODE"
                id="PAY_CODE"
                value={formData?.EmpMst?.PAY_CODE}
                handleInputChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* RIGHT UPLOAD */}
        <div className="col-span-12 lg:col-span-3">
          <div className="flex lg:justify-end">
            <div className="w-full lg:max-w-[260px]">
              <label className="flex h-[285px] w-full items-center justify-center bg-white dark:bg-black rounded-2xl cursor-pointer border-2 border-dashed border-[#D0D5DD] dark:border-[#2A2F3A] overflow-hidden">
                {!(profileSrc || formData?.EmpMst?.photo) ? (
                  <div className="text-center px-6 py-10">
                    <div className="font-semibold text-[#344054] dark:text-white">
                      Upload image
                    </div>
                    <div className="text-xs text-[#667085] dark:text-[#A0A7B4] mt-1">
                      JPG or PNG • max 2 MB
                    </div>
                  </div>
                ) : (
                  <Image
                    width={500}
                    height={500}
                    src={
                      profileSrc != null
                        ? profileSrc
                        : `data:image/jpeg;base64,${formData?.EmpMst?.photo}`
                    }
                    alt="Uploaded"
                    className="w-full h-full object-cover"
                  />
                )}

                <input
                  type="file"
                  className="hidden"
                  name="profile"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                />
              </label>

              <div className="mt-2">
                <FileViewer fileLink={profileSrc} celldata="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}