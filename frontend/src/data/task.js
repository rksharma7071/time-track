
import axios from "axios";
import API from "./api.js";

export const createTask = async (taskData) => {
  const response = await axios.post(`${API}/api/tasks`, taskData, {
    withCredentials: true,
  });

  return response.data || {};
};

export const getAllTasks = async ({ page = 1, limit = 10 } = {}) => {
  const response = await axios.get(`${API}/api/tasks`, {
    params: { page, limit },
    withCredentials: true,
  });

  return response.data || {};
};

export const getTaskById = async (id) => {
  const response = await axios.get(`${API}/api/tasks/${id}`, {
    withCredentials: true,
  });

  return response.data || {};
};

export const updateTask = async (id, taskData) => {
  const response = await axios.put(`${API}/api/tasks/${id}`, taskData, {
    withCredentials: true,
  });

  return response.data || {};
};

export const deleteTask = async (id) => {
  const response = await axios.delete(`${API}/api/tasks/${id}`, {
    withCredentials: true,
  });

  return response.data || {};
};

export const getTasksAndUsers = async ({ request }) => {
  const url = new URL(request.url);

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(url.searchParams.get("limit")) || 10);

  const [tasksResponse, usersResponse, projectResponse] = await Promise.all([
    getAllTasks({ page, limit }),
    axios.get(`${API}/api/user/all`, {
      withCredentials: true,
    }),
    axios.get(`${API}/api/project/all`, {
      withCredentials: true,
    }),
  ]);

  // console.log("projectResponse: ", projectResponse.data?.projects);


  return {
    tasks: tasksResponse.tasks ?? [],
    pagination: tasksResponse.pagination ?? {},
    users: usersResponse.data?.users ?? [],
    projects: projectResponse.data?.projects ?? [],
  };
};
