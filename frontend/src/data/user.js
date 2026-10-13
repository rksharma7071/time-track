import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const getAllUsers = async () => {
  const response = await axios.get(`${API}/api/user/all`, {
    withCredentials: true,
  });

  return response.data;
};