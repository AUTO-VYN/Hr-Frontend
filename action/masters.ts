"use server";

import axios from "axios";

export async function FindMaster(data: any, user: any) {
  if (!user?.Comp_Code) {
    return { data: { MiscMst: [] } };
  }
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/master/findmaster`,
      data,
      {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error in FindMaster:", error?.response?.data || error.message);
    return { data: { MiscMst: [] } };
  }
}

export async function AddMaster(data: any, user: any) {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/master/addmaster`,
      data,
      {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      }
    );
    return response.status;
  } catch (error: any) {
    console.error("Error in AddMaster:", error?.response?.data || error.message);
    throw error;
  }
}

export async function AddMaster1(data: any, user: any) {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/master/addmaster1`,
      data,
      {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      }
    );
    return response.status;
  } catch (error: any) {
    console.error("Error in AddMaster1:", error?.response?.data || error.message);
    throw error;
  }
}

export async function UpdateMaster(data: any, user: any) {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/master/updateMaster`,
      data,
      {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      }
    );
    return response.status;
  } catch (error: any) {
    console.error("Error in UpdateMaster:", error?.response?.data || error.message);
    throw error;
  }
}
