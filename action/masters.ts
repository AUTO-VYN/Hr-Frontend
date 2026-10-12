"use server";

import axios from "axios";
import { auth } from "@/app/auth";

async function resolveUserAuth(user?: any) {
  let sessionUser: any = null;
  try {
    const session = await auth();
    sessionUser = session?.user;
  } catch (err) {
    // Ignore error if auth is not available
  }

  const compcode =
    user?.Comp_Code ||
    user?.compcode ||
    user?.comp_code ||
    user?.COMP_CODE ||
    user?.company_code ||
    user?.DB ||
    user?.db ||
    sessionUser?.Comp_Code ||
    sessionUser?.compcode ||
    sessionUser?.comp_code ||
    sessionUser?.COMP_CODE ||
    sessionUser?.company_code ||
    sessionUser?.DB ||
    sessionUser?.db ||
    "";

  const name =
    user?.name ||
    sessionUser?.name ||
    "";

  const branch =
    user?.branch ||
    sessionUser?.branch ||
    "";

  return {
    compcode: String(compcode || ""),
    name: String(name || ""),
    branch: String(branch || ""),
  };
}

export async function FindMaster(data: any, user?: any) {
  try {
    const { compcode, name } = await resolveUserAuth(user);
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://127.0.0.1:5000";
    const response = await fetch(
      `${baseUrl}/Master/FindMaster`,
      {
        method: "POST",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          compcode,
          name,
        },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error in getting loan approvers data:", error);
    throw error;
  }
}

export async function UpdateMaster(data: any, UTD: any, user?: any) {
  try {
    const { compcode, name } = await resolveUserAuth(user);
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://127.0.0.1:5000";
    const response = await axios.post(
      `${baseUrl}/Master/updateMaster/${UTD}`,
      data,
      {
        headers: {
          compcode,
          name,
        },
      }
    );
    return response.status;
  } catch (error) {
    console.error("Error in getting loan approvers data:", error);
    throw error;
  }
}

export async function AddMaster(data: any, user?: any) {
  try {
    const { compcode, name } = await resolveUserAuth(user);
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://127.0.0.1:5000";
    const response = await axios.post(
      `${baseUrl}/Master/insertData`,
      data,
      {
        headers: {
          compcode,
          name,
        },
      }
    );
    return response.status;
  } catch (error) {
    console.error("Error in getting loan approvers data:", error);
    throw error;
  }
}

export async function AddMaster1(data: any, user?: any) {
  try {
    const { compcode, name, branch } = await resolveUserAuth(user);

    // Ensure Created_by and Loc_Code are populated if missing in payload
    if (data && typeof data === "object") {
      if (!data.Created_by && name) {
        data.Created_by = name;
      }
      if (data.MiscMst && typeof data.MiscMst === "object") {
        if (!data.MiscMst.Loc_Code && branch) {
          data.MiscMst.Loc_Code = branch;
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://127.0.0.1:5000";
    const response = await axios.post(
      `${baseUrl}/Master/insertData1`,
      data,
      {
        headers: {
          compcode,
          name,
        },
      }
    );
    return response.status;
  } catch (error: any) {
    console.error("Error in AddMaster1:", error?.response?.data || error.message);
    throw error;
  }
}

export async function AddUserActionHst(data: any, user?: any) {
  try {
    console.log("RunhistoryApi");

    if (!data) {
      console.warn("⚠ No 'data' provided to AddUserActionHst");
      return null;
    }

    const { compcode, name } = await resolveUserAuth(user);
    if (!compcode) {
      console.warn("⚠ No valid 'compcode' provided to AddUserActionHst");
      return null;
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://127.0.0.1:5000";
    const response = await axios.post(
      `${baseUrl}/users/InsertUserActHst`,
      data,
      {
        headers: {
          compcode,
          name,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("🔥 Error in AddUserActionHst:", error?.response?.data || error.message);
    return null;
  }
}

