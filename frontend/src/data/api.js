import axios from "axios";
import { MAX_PAGE_LIMIT } from "../utils/constants.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const http = axios.create({
  baseURL: `${API}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url ?? "");
    if (error.response?.status === 401 && !url.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message || fallback;

export const fetchAllPages = async (url, key, params = {}) => {
  const items = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const { data } = await http.get(url, { params: { ...params, page, limit: MAX_PAGE_LIMIT } });
    items.push(...(data[key] ?? []));
    hasNextPage = Boolean(data.pagination?.hasNextPage);
    page += 1;
  }

  return items;
};

export default API;
