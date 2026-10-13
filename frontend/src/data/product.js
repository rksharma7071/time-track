import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const getAllProjects = async () => {
  const response = await axios.get(`${API}/api/project/all`, {
    withCredentials: true,
  });

  return response.data;
};

export const getAllUsers = async () => {
  const response = await axios.get(`${API}/api/user/all`, {
    withCredentials: true,
  });

  return response.data;
};

export const getProjectsAndUsers = async () => {
  const [projectsResponse, usersResponse] = await Promise.all([
    getAllProjects(),
    getAllUsers(),
  ]);

  return {
    projects: projectsResponse.projects,
    users: usersResponse.users,
  };
};