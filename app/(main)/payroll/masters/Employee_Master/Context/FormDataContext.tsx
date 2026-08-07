import React, { createContext, useState, useContext } from "react";

interface EmpMst {
  OTP: string | null;
  EMPCODE: string | null;
  MSPIN: string | null;
  TITLE: string | null;
  EMPFIRSTNAME: string | null;
  EMPLASTNAME: string | null;
  PERMANENTADDRESS1: string | null;
  PERMANENTADDRESS2: string | null;
  MOBILE_NO: string | null;
   CONTRACT_NUMBER: string | null,
  landline_no: string | null;
  Father_Mob: string | null;
  Mother_Mob: string | null;
  Spouse_Mob: string | null;
  CNATIONALITY: string | null;
  PCITY: number | null;
  EXP_IN_YEAR: string | null;
  PPINCODE: string | null;
  PSTATE: number | null;
  CURRENTADDRESS1: string | null;
  CURRENTADDRESS2: string | null;
  CCITY: number | null;
  CPINCODE: string | null;
  CSTATE: number | null;
  LANDLINENO: string | null;
  MOBILENO: string | null;
  EMERGENCYNAME: string | null;
  EMERGENCYNO: string | null;
  PANNO: string | null;
  PAN_CARD_VER: string | null;
  OTP_With_Aadhaar: string | null;
  PAN_NAME_MATCH_VER: string | null;
  AADHAAR_LINKED_VER: string | null;
  DRIVING_VER: string | null;
  PASSPORT_VER: string | null;
  AADHAR_CARD_VER: string | null;
  AADHAAR_LINKED_PAN_VAR: string | null;
  PASSPORTNO: string | null;
  PASSEXPIRYDATE: string | null;
  DATE_OF_EXIT_INTERVIEW: string | null;
  driving_licence: string | null;
  columndoc_type: string | null;
  BLOODGROUP: string | null;
  DOB: string | null;
  GENDER: string | null;
  MARITALSTATUS: string | null;
  DOM: string | null;
  SKILLS: string | null;
  BASICQUALIFICATION: string | null;
  PROFESSIONALQUALIFICATION: string | null;
  FATHERNAME: string | null;
  FATHEROCCUPATION: number | null;
  FATHERCONTACTNO: string | null;
  MOTHERNAME: string | null;
  MOTHERCONTACTNO: string | null;
  SPOUSENAME: string | null;
  SPOUSECONTACTNO: string | null;
  SPOUSEGENDER: string | null;
  SIBLINGNAME: string | null;
  SIBLINGCONTACTNO: string | null;
  PREVIOUSCOMPANYNAME: string | null;
  PRECOMPCITY: number | null;
  PRECOMPCONTACTNO: string | null;
  PREJOININGDATE: string | null;
  PREENDDATE: string | null;
  PREDESIGNATION: string | null;
  MSPN_Id: string | null;
  Relaxation_Type: string | null;
  Cumulative_Relaxation: string | null;
  EMPREFERENCENAME: string | null;
  REFERENCEDESIGNATION: string | null;
  ISMEDICALATTENTION: string | null;
  ISSERIOUSILLNESS: string | null;
  ISALLERGIES: string | null;
  CORPORATEMAILID: string | null;
  CURRENTJOINDATE: string | null;
  PAYMENTMODE: string | null;
  BANKNAME: string | null;
  BANKACCOUNTNO: string | null;
  Cnf_BANKACCOUNTNO: string | null;
  EMPLOYEETYPE: string | null;
  ORGANISATIONNAME: string | null;
  SBU_FUNCTION: string | null;
  DIVISION: string | null;
  REGION: number | null;
  UNIT: string | null;
  SECTION: string | null;
  LEVEL: string | null;
  uidno: string | null;
  pfper: number | null;
  esiper: number | null;
  PFNO: string | null;
  ESINO: string | null;
  Ledger_Code: number | null;
  Acnt_Loc: number | null;
  UAN_No: string | null;
  EmpType: number | null;
  IsMSPN: number | null;
  MSPN_DTL: string | null;
  ESI_DEDUCTION: number | null;
  PF_DEDUCTION: number | null;
  pro_tax: number | null;
  TCS_Rate: number | null;
  Rec_Date: string | null;
  ifsc_code: string | null;
  pre_Exp: string | null;
  Interview_Date: string | null;
  Sal_Region: number | null;
  LWFNO: number | null;
  Emp_Ac_Name: string | null;
  PF_Date: string | null;
  Effective_date: string | null;
  HRA: string | null;
  ESI_Date: string | null;
  PASSPORT_EXPDATE: string | null;
  Punch_Type: string | null;
  PAY_CODE: string | null;
  Sal_Hold: number | null;
  InBudget: false;
  Induction_Done: false;
  ExitInterview_Done: false;
  LOCATION: string | null;
  ROLE: string | null;
  EMPLOYEEDESIGNATION: string | null;
  GRADE: string | null;
  SUPERVISORID: number | null;
  SUPERVISOR: string | null;
  ISTIMEVALIDATION: string | null;
  ISPAYROLL: string | null;
  PAYCYCLEDURATION: string | null;
  PROBATIONPERIOD: string | null;
  PROBATIONLEAVES: string | null;
  RESIGNATION_SUBMISSION_DATE: string | null;
  NOTICEPERIOD: string | null;
  TEN_LEAVE_DATE: string | null;
  SEPERATIONREMARKS: string | null;
  SEPARATION_MODE: string | null;
  INTERVIEWREMAKS: string | null;
  DATE_OF_SETTLEMENT: string | null;
  REASON_FOR_RESIGNATION: string | null;
  RELCODE: number | null;
  Exp_Date: string | null;
  Export_Type: number | null;
  Loc_Code: number | null;
  ServerId: number | null;
  DRIVINGLIC_ISSUEDATE: string | null;
  DRIVINGLIC_ISSUEPALACE: string | null;
  ACCOUNT_TYPE: string | null;
  PFTRUST_NO: string | null;
  EMPHEIGHT: number | null;
  EMPWEIGHT: number | null;
  // RELIGION: number | null;
  P_NATIONALITY: string | null;
  UID_NO: string | null;
  ALTERNET_MAIL: string | null;
  EMPDEPENDENT: number | null;
  CHILDREN_DETAIL: string | null;
  LANGUAGE_DETAIL: string | null;
  NOMINEE_DETAIL: number | null;
  EMP_SHIFT: string | null;
  PF: number | null;
  PFSALARY_LIMIT: number | null;
  LWF: number | null;
  ESI_AMOUNT: number | null;
  BONUS_AMOUNT: number | null;
  MONTHLY_CTC: number | null;
  ANNUAL_CTC: number | null;
  COMP_NAME: string | null;
  JOINING_TYPE: string | null;
  BRANCH: string | null;
  EMP_STATUS: string | null;
  Apprentice_Date_From: string | null,
  Apprentice_Date_To: string | null,
  USR_NAME: string | null;
  APPLICATION_ID: string | null;
  APPROVED_AUTHO: string | null;
  CREATED_ON: string | null;
  MACHINE_NAME: string | null;
  BIOMETRIC_ID: string | null;
  LASTMODI_ON: string | null;
  PROPOSEDRETIRE_DATE: string | null;
  LASTWOR_DATE: string | null;
  RELEVE_STATUS: string | null;
  ADUSER_NAME: string | null;
  EXT_NO: string | null;
  AUTOMAILER: string | null;
  WEEKLYOFF: string | null;
  RESIGN_APPR: string | null;
  AX_EMP_CODE: string | null;
  AX_BAL: number | null;
  Prob_period: string | null;
  empcode2: string | null;
  empcode3: string | null;
  empcode4: string | null;
  ADHARNO: string | null;
  pfnumber: string | null;
  esinumber: string | null;
  ein: string | null;
  mobile_limit: string | null;
  LASTMODI_BY: string | null;
  IEMI: string | null;
  IsRW: number | null;
  Reporting_1: string | null;
  Reporting_2: string | null;
  Reporting_3: string | null;
  App_Mispunch: string | null;
  App_Leave: string | null;
  App_Attendance: string | null;
  FCM_TockenId: string | null;
  Android_ID: string | null;
  multi_loc: string | null;
  Token: string | null;
  Is_Profile_Filled: number | null;
  mPunch: string | null;
  mApprove: string | null;
  mMispunch: string | null;
  mLeave: string | null;
  mCalender: string | null;
  mDeviceLog: string | null;
  mAttendanceLog: string | null;
  mLocationLog: string | null;
  mToDoList: string | null;
  mSuggestions: string | null;
  mUpdateIMEI: string | null;
  mTrackingReport: string | null;
  mLiveLocation: string | null;
  mAssetScan: string | null;
  mGeoFenceSetting: string | null;
  CREATED_BY: string | null;
  profile: string | null;
  photo: string | null;
  full_addressAadhaar: string | null;
  adhar: string | null;
  pan: string | null;
  salary: string | null;
  other1: string | null;
  other2: string | null;
  other3: string | null;
  other4: string | null;
  otherpdf: string | null;
  CATEGORY: string | null;
  CLUSTER: string | null;
  CHANNEL: string | null;
  COSTCENTRE: string | null;
  uploaded_document: string | null;
  LIN_NO: string | null;
  DRIVINGLIC_EXPDATE: string | null;
  Dlv_Type: string | null;
  Separation1: string | null;
  Separation2: string | null;
  MOBILE_RIGHTS: string | null,
  Marital_Status: string | null,
  Confirmation_Date: string | null;
  CDIST: string | null;
  PDIST: string | null;
  IsiphoneUser: string | null;
  userPassIphone: string | null;
  userNameIphone: string | null;
  DD_CLUB: string | null;
  GEOOFFENCELOC: string | null;
   RESIGNED_STATUS: string | null;
  SEPRATION_CATE: string | null;
  // salaryDetails

  // PF_Date: string | null;
  // pfnumber: string | null;
  // UAN_No: string | null;
  // PFNO: string | null;
  // pfper: string | null;
  // ESI_Date: string | null;
  // esinumber: string | null;
  // ESINO: string | null;
  // LWFNO: string | null;
  // WEEKLYOFF: string | null;
  BONUS: string | null;
  Source_Code: string | null;
  // pro_tax: string | null;
  // EMP_SHIFT: string | null;
}

interface FormData {
  Comp_Code: string | null;
  SrNo: string | null;
  CREATED_BY: string | null;
  EmpMst: EmpMst;
  EmpEdu: object[];
  EmpLang: object[];
  EmpItSkill: object[];
  EmpExperience: object[];
  AssetIssue: object[];
  EmpFamily: object[];
}

const FormDataContext = createContext<{
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}>({
  formData: {
    Comp_Code: null,
    SrNo: null,
    CREATED_BY: null,
    EmpMst: {
      OTP: null,
      EMPCODE: null,
      MSPIN: null,
      TITLE: null,
      EMPFIRSTNAME: null,
      EMPLASTNAME: null,
      PERMANENTADDRESS1: null,
      PERMANENTADDRESS2: null,
      MOBILE_NO: null,
       CONTRACT_NUMBER: null,
      landline_no: null,
      Father_Mob: null,
      Mother_Mob: null,
      Spouse_Mob: null,
      CNATIONALITY: null,
      PCITY: null,
      EXP_IN_YEAR: null,
      PPINCODE: null,
      PSTATE: null,
      CURRENTADDRESS1: null,
      CURRENTADDRESS2: null,
      CCITY: null,
      CPINCODE: null,
      CSTATE: null,
      LANDLINENO: null,
      MOBILENO: null,
      EMERGENCYNAME: null,
      EMERGENCYNO: null,
      PANNO: null,
      PAN_CARD_VER: null,
      OTP_With_Aadhaar: null,
      PAN_NAME_MATCH_VER: null,
      AADHAAR_LINKED_VER: null,
      DRIVING_VER: null,
      PASSPORT_VER: null,
      AADHAR_CARD_VER: null,
      AADHAAR_LINKED_PAN_VAR: null,
      PASSPORTNO: null,
      PASSEXPIRYDATE: null,
      DATE_OF_EXIT_INTERVIEW: null,
      driving_licence: null,
      columndoc_type: null,
      BLOODGROUP: null,
      DOB: null,
      GENDER: null,
      MARITALSTATUS: null,
      DOM: null,
      SKILLS: null,
      BASICQUALIFICATION: null,
      PROFESSIONALQUALIFICATION: null,
      FATHERNAME: null,
      FATHEROCCUPATION: null,
      FATHERCONTACTNO: null,
      MOTHERNAME: null,
      MOTHERCONTACTNO: null,
      SPOUSENAME: null,
      SPOUSECONTACTNO: null,
      SPOUSEGENDER: null,
      SIBLINGNAME: null,
      SIBLINGCONTACTNO: null,
      PREVIOUSCOMPANYNAME: null,
      PRECOMPCITY: null,
      PRECOMPCONTACTNO: null,
      PREJOININGDATE: null,
      PREENDDATE: null,
      PREDESIGNATION: null,
      MSPN_Id: null,
      Relaxation_Type: null,
      Cumulative_Relaxation: null,
      EMPREFERENCENAME: null,
      REFERENCEDESIGNATION: null,
      ISMEDICALATTENTION: null,
      ISSERIOUSILLNESS: null,
      ISALLERGIES: null,
      CORPORATEMAILID: null,
      CREATED_BY: null,
      CURRENTJOINDATE: null,
      PAYMENTMODE: null,
      BANKNAME: null,
      BANKACCOUNTNO: null,
      Cnf_BANKACCOUNTNO: null,
      EMPLOYEETYPE: null,
      ORGANISATIONNAME: null,
      SBU_FUNCTION: null,
      DIVISION: null,
      REGION: null,
      UNIT: null,
      SECTION: null,
      LEVEL: null,
      uidno: null,
      pfper: null,
      esiper: null,
      PFNO: null,
      ESINO: null,
      Ledger_Code: null,
      Acnt_Loc: null,
      UAN_No: null,
      EmpType: null,
      IsMSPN: null,
      MSPN_DTL: null,
      ESI_DEDUCTION: null,
      PF_DEDUCTION: null,
      pro_tax: null,
      TCS_Rate: null,
      Rec_Date: null,
      ifsc_code: null,
      pre_Exp: null,
      Interview_Date: null,
      Sal_Region: null,
      LWFNO: null,
      Emp_Ac_Name: null,
      PF_Date: null,
      Effective_date: null,
      HRA: null,
      ESI_Date: null,
      PASSPORT_EXPDATE: null,
      Punch_Type: null,
      PAY_CODE: null,
      Sal_Hold: null,
      InBudget: false,
      Induction_Done: false,
      ExitInterview_Done: false,
      LOCATION: null,
      ROLE: null,
      EMPLOYEEDESIGNATION: null,
      GRADE: null,
      SUPERVISORID: null,
      SUPERVISOR: null,
      ISTIMEVALIDATION: null,
      ISPAYROLL: null,
      PAYCYCLEDURATION: null,
      PROBATIONPERIOD: null,
      PROBATIONLEAVES: null,
      RESIGNATION_SUBMISSION_DATE: null,
      NOTICEPERIOD: null,
      TEN_LEAVE_DATE: null,
      SEPERATIONREMARKS: null,
      SEPARATION_MODE: null,
      INTERVIEWREMAKS: null,
      DATE_OF_SETTLEMENT: null,
      REASON_FOR_RESIGNATION: null,
      RELCODE: null,
      Exp_Date: null,
      Export_Type: 1,
      Loc_Code: null,
      ServerId: 1,
      DRIVINGLIC_ISSUEDATE: null,
      DRIVINGLIC_ISSUEPALACE: null,
      ACCOUNT_TYPE: null,
      PFTRUST_NO: null,
      EMPHEIGHT: null,
      EMPWEIGHT: null,
      // RELIGION: null,
      P_NATIONALITY: null,
      UID_NO: null,
      ALTERNET_MAIL: null,
      EMPDEPENDENT: null,
      CHILDREN_DETAIL: null,
      LANGUAGE_DETAIL: null,
      NOMINEE_DETAIL: null,
      EMP_SHIFT: null,
      PF: null,
      PFSALARY_LIMIT: null,
      LWF: null,
      ESI_AMOUNT: null,
      BONUS_AMOUNT: null,
      MONTHLY_CTC: null,
      ANNUAL_CTC: null,
      COMP_NAME: null,
      JOINING_TYPE: null,
      BRANCH: null,
      EMP_STATUS: null,
      Apprentice_Date_From: null,
      Apprentice_Date_To: null,
      USR_NAME: null,
      APPLICATION_ID: null,
      APPROVED_AUTHO: null,
      CREATED_ON: null,
      MACHINE_NAME: null,
      BIOMETRIC_ID: null,
      LASTMODI_ON: null,
      PROPOSEDRETIRE_DATE: null,
      LASTWOR_DATE: null,
      RELEVE_STATUS: null,
      ADUSER_NAME: null,
      EXT_NO: null,
      AUTOMAILER: null,
      WEEKLYOFF: null,
      RESIGN_APPR: null,
      AX_EMP_CODE: null,
      AX_BAL: null,
      Prob_period: null,
      empcode2: null,
      empcode3: null,
      empcode4: null,
      ADHARNO: null,
      pfnumber: null,
      esinumber: null,
      ein: null,
      mobile_limit: null,
      LASTMODI_BY: null,
      IEMI: null,
      IsRW: null,
      Reporting_1: null,
      Reporting_2: null,
      Reporting_3: null,
      App_Mispunch: null,
      App_Leave: null,
      App_Attendance: null,
      FCM_TockenId: null,
      Android_ID: null,
      multi_loc: null,
      Token: null,
      Is_Profile_Filled: null,
      mPunch: null,
      mApprove: null,
      mMispunch: null,
      mLeave: null,
      mCalender: null,
      mDeviceLog: null,
      mAttendanceLog: null,
      mLocationLog: null,
      mToDoList: null,
      mSuggestions: null,
      mUpdateIMEI: null,
      mTrackingReport: null,
      mLiveLocation: null,
      mAssetScan: null,
      mGeoFenceSetting: null,
      profile: null,
      photo: null,
      full_addressAadhaar: null,
      adhar: null,
      pan: null,
      salary: null,
      other1: null,
      other2: null,
      other3: null,
      other4: null,
      otherpdf: null,
      CATEGORY: null,
      CLUSTER: null,
      CHANNEL: null,
      COSTCENTRE: null,
      uploaded_document: null,
      LIN_NO: null,
      DRIVINGLIC_EXPDATE: null,
      Dlv_Type: null,
      Separation2: null,
      Separation1: null,
      MOBILE_RIGHTS: null,
      Marital_Status: null,
      Confirmation_Date: null,
      GEOOFFENCELOC: null,
      PDIST: null,
      CDIST: null,
      IsiphoneUser: null,
      userPassIphone: null,
      userNameIphone: null,
      DD_CLUB: null,
       RESIGNED_STATUS:null,
      SEPRATION_CATE:  null,

      // salaryDetails

      // PF_Date: null,
      // pfnumber: null,
      // UAN_No: null,
      // PFNO: null,
      // pfper: null,
      // ESI_Date: null,
      // esinumber: null,
      // ESINO: null,
      // LWFNO: null,
      // WEEKLYOFF: null,
      BONUS: null,
      Source_Code: null,
      // pro_tax: null,
      // EMP_SHIFT: null,
    },
    EmpEdu: [],
    EmpLang: [],
    EmpItSkill: [],
    EmpExperience: [],
    AssetIssue: [],
    EmpFamily: [],
  },
  setFormData: () => { },
});

export const useFormData = () => {
  return useContext(FormDataContext);
};
interface FormDataProviderProps {
  children: React.ReactNode;
}

export const FormDataProvider: React.FC<FormDataProviderProps> = ({
  children,
}) => {
  const [formData, setFormData] = useState<FormData>({
    Comp_Code: null,
    CREATED_BY: null,
    SrNo: null,
    EmpMst: {
      OTP: null,
      EMPCODE: null,
      MSPIN: null,
      TITLE: null,
      EMPFIRSTNAME: null,
      EMPLASTNAME: null,
      PERMANENTADDRESS1: null,
      PERMANENTADDRESS2: null,
      MOBILE_NO: null,
       CONTRACT_NUMBER: null,
      landline_no: null,
      Father_Mob: null,
      Mother_Mob: null,
      Spouse_Mob: null,
      CNATIONALITY: null,
      PCITY: null,
      EXP_IN_YEAR: null,
      PPINCODE: null,
      PSTATE: null,
      CURRENTADDRESS1: null,
      CURRENTADDRESS2: null,
      CCITY: null,
      CPINCODE: null,
      CSTATE: null,
      LANDLINENO: null,
      MOBILENO: null,
      EMERGENCYNAME: null,
      EMERGENCYNO: null,
      PANNO: null,
      PAN_CARD_VER: null,
      OTP_With_Aadhaar: null,
      PAN_NAME_MATCH_VER: null,
      AADHAAR_LINKED_VER: null,
      DRIVING_VER: null,
      PASSPORT_VER: null,
      AADHAR_CARD_VER: null,
      AADHAAR_LINKED_PAN_VAR: null,
      PASSPORTNO: null,
      PASSEXPIRYDATE: null,
      DATE_OF_EXIT_INTERVIEW: null,
      driving_licence: null,
      columndoc_type: null,
      BLOODGROUP: null,
      DOB: null,
      GENDER: null,
      MARITALSTATUS: null,
      DOM: null,
      SKILLS: null,
      BASICQUALIFICATION: null,
      PROFESSIONALQUALIFICATION: null,
      FATHERNAME: null,
      FATHEROCCUPATION: null,
      FATHERCONTACTNO: null,
      MOTHERNAME: null,
      MOTHERCONTACTNO: null,
      SPOUSENAME: null,
      SPOUSECONTACTNO: null,
      SPOUSEGENDER: null,
      SIBLINGNAME: null,
      SIBLINGCONTACTNO: null,
      PREVIOUSCOMPANYNAME: null,
      PRECOMPCITY: null,
      PRECOMPCONTACTNO: null,
      PREJOININGDATE: null,
      PREENDDATE: null,
      PREDESIGNATION: null,
      MSPN_Id: null,
      Relaxation_Type: null,
      Cumulative_Relaxation: null,
      EMPREFERENCENAME: null,
      REFERENCEDESIGNATION: null,
      ISMEDICALATTENTION: null,
      ISSERIOUSILLNESS: null,
      ISALLERGIES: null,
      CORPORATEMAILID: null,
      CREATED_BY: null,
      CURRENTJOINDATE: null,
      PAYMENTMODE: null,
      BANKNAME: null,
      BANKACCOUNTNO: null,
      Cnf_BANKACCOUNTNO: null,
      EMPLOYEETYPE: null,
      ORGANISATIONNAME: null,
      SBU_FUNCTION: null,
      DIVISION: null,
      REGION: null,
      UNIT: null,
      SECTION: null,
      LEVEL: null,
      uidno: null,
      pfper: null,
      esiper: null,
      PFNO: null,
      ESINO: null,
      Ledger_Code: null,
      Acnt_Loc: null,
      UAN_No: null,
      EmpType: null,
      IsMSPN: null,
      MSPN_DTL: null,
      ESI_DEDUCTION: null,
      PF_DEDUCTION: null,
      pro_tax: null,
      TCS_Rate: null,
      Rec_Date: null,
      ifsc_code: null,
      pre_Exp: null,
      Interview_Date: null,
      Sal_Region: null,
      LWFNO: null,
      Emp_Ac_Name: null,
      PF_Date: null,
      Effective_date: null,
      HRA: null,
      ESI_Date: null,
      PASSPORT_EXPDATE: null,
      Punch_Type: null,
      PAY_CODE: null,
      Sal_Hold: null,
      InBudget: false,
      Induction_Done: false,
      ExitInterview_Done: false,
      LOCATION: null,
      ROLE: null,
      EMPLOYEEDESIGNATION: null,
      GRADE: null,
      SUPERVISORID: null,
      SUPERVISOR: null,
      ISTIMEVALIDATION: null,
      ISPAYROLL: null,
      PAYCYCLEDURATION: null,
      PROBATIONPERIOD: null,
      PROBATIONLEAVES: null,
      RESIGNATION_SUBMISSION_DATE: null,
      NOTICEPERIOD: null,
      TEN_LEAVE_DATE: null,
      REASON_FOR_RESIGNATION: null,
      SEPERATIONREMARKS: null,
      SEPARATION_MODE: null,
      INTERVIEWREMAKS: null,
      DATE_OF_SETTLEMENT: null,
      RELCODE: null,
      Exp_Date: null,
      Export_Type: 1,
      Loc_Code: null,
      ServerId: 1,
      DRIVINGLIC_ISSUEDATE: null,
      DRIVINGLIC_ISSUEPALACE: null,
      ACCOUNT_TYPE: null,
      PFTRUST_NO: null,
      EMPHEIGHT: null,
      EMPWEIGHT: null,
      // RELIGION: null,
      P_NATIONALITY: null,
      UID_NO: null,
      ALTERNET_MAIL: null,
      EMPDEPENDENT: null,
      CHILDREN_DETAIL: null,
      LANGUAGE_DETAIL: null,
      NOMINEE_DETAIL: null,
      EMP_SHIFT: null,
      PF: null,
      PFSALARY_LIMIT: null,
      LWF: null,
      ESI_AMOUNT: null,
      BONUS_AMOUNT: null,
      MONTHLY_CTC: null,
      ANNUAL_CTC: null,
      COMP_NAME: null,
      JOINING_TYPE: null,
      BRANCH: null,
      EMP_STATUS: null,
      USR_NAME: null,
      APPLICATION_ID: null,
      APPROVED_AUTHO: null,
      CREATED_ON: null,
      MACHINE_NAME: null,
      BIOMETRIC_ID: null,
      LASTMODI_ON: null,
      PROPOSEDRETIRE_DATE: null,
      Apprentice_Date_From: null,
      Apprentice_Date_To: null,
      LASTWOR_DATE: null,
      RELEVE_STATUS: null,
      ADUSER_NAME: null,
      EXT_NO: null,
      AUTOMAILER: null,
      WEEKLYOFF: null,
      RESIGN_APPR: null,
      AX_EMP_CODE: null,
      AX_BAL: null,
      Prob_period: null,
      empcode2: null,
      empcode3: null,
      empcode4: null,
      ADHARNO: null,
      pfnumber: null,
      esinumber: null,
      ein: null,
      mobile_limit: null,
      LASTMODI_BY: null,
      IEMI: null,
      IsRW: null,
      Reporting_1: null,
      Reporting_2: null,
      Reporting_3: null,
      App_Mispunch: null,
      App_Leave: null,
      App_Attendance: null,
      FCM_TockenId: null,
      Android_ID: null,
      multi_loc: null,
      Token: null,
      Is_Profile_Filled: null,
      mPunch: null,
      mApprove: null,
      mMispunch: null,
      mLeave: null,
      mCalender: null,
      mDeviceLog: null,
      mAttendanceLog: null,
      mLocationLog: null,
      mToDoList: null,
      mSuggestions: null,
      mUpdateIMEI: null,
      mTrackingReport: null,
      mLiveLocation: null,
      mAssetScan: null,
      mGeoFenceSetting: null,
      profile: null,
      photo: null,
      full_addressAadhaar: null,
      adhar: null,
      pan: null,
      salary: null,
      other1: null,
      other2: null,
      other3: null,
      other4: null,
      otherpdf: null,
      CATEGORY: null,
      CLUSTER: null,
      CHANNEL: null,
      COSTCENTRE: null,
      uploaded_document: null,
      LIN_NO: null,
      DRIVINGLIC_EXPDATE: null,
      Dlv_Type: null,
      MOBILE_RIGHTS: null,
      // salaryDetails
      Separation2: null,
      Separation1: null,
      Marital_Status: null,
      Confirmation_Date: null,
      GEOOFFENCELOC: null,
      PDIST: null,
      CDIST: null,
      IsiphoneUser: null,
      userPassIphone: null,
      userNameIphone: null,
      DD_CLUB: null,
      RESIGNED_STATUS:null,
      SEPRATION_CATE:  null,
      // PF_Date: null,
      // pfnumber: null,
      // UAN_No: null,
      // PFNO: null,
      // pfper: null,
      // ESI_Date: null,
      // esinumber: null,
      // ESINO: null,
      // LWFNO: null,
      // WEEKLYOFF: null,
      BONUS: null,
      Source_Code: null,
      // pro_tax: null,
      // EMP_SHIFT: null,
    },
    EmpEdu: [],
    EmpLang: [],
    EmpItSkill: [],
    EmpExperience: [],
    AssetIssue: [],
    EmpFamily: [],
  });
  return (
    <FormDataContext.Provider value={{ formData, setFormData }}>
      {children}
    </FormDataContext.Provider>
  );
};

export default FormDataContext;
