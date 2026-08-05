"use server";

import axios from "axios";
import { logoutAction } from "./loginAction";

export async function fetchBranch(user: any) {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/branch/all`,
      { User_Code: user?.id },
      {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching branches:", error);
    await logoutAction();
    return { error: "Unknown Error Found" };
  }
}

export async function fetchYear(year: string) {
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_URL}/users/getyear`,
    year,
    { headers: { compcode: year } }
  );
  return response.data;
}
