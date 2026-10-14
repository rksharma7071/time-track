import axios from "axios";
import API from "./api";


export const getAllUsers = async ({ page = 1, limit = 10 } = {}) => {
  const response = await axios.get(`${API}/api/user/all`, {
    params: { page, limit },
    withCredentials: true,
  });

  return response.data;
};

export const usersLoader = async ({ request }) => {
  const url = new URL(request.url);

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(url.searchParams.get("limit")) || 10);

  const response = await axios.get(`${API}/api/user/all`, {
    params: { page, limit },
    withCredentials: true,
  });

  return response.data;
};