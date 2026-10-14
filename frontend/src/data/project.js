import axios from "axios";
import { getAllUsers } from "./user.js";
import API from "./api.js";


export const getAllProjects = async ({ page = 1, limit = 10 } = {}) => {
  const response = await axios.get(`${API}/api/project/all`, {
    params: { page, limit },
    withCredentials: true,
  });

  return response.data || {};
};

export const getProjectsAndUsers = async ({ request }) => {
  const url = new URL(request.url);

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(url.searchParams.get("limit")) || 10);

  const [projectsResponse, usersResponse] = await Promise.all([
    getAllProjects({ page, limit }),
    getAllUsers({ page: 1, limit: 1000 }),
  ]);

  return {
    projects: projectsResponse.projects ?? [],
    pagination: projectsResponse.pagination ?? {},
    users: usersResponse.users ?? [],
  };
};
