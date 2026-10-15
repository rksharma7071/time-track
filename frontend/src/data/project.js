import { fetchAllPages, http } from "./api.js";
import { getAllUsersList } from "./user.js";
import { readListParams } from "../utils/helpers.js";

export const getProjects = (params) => http.get("/project/all", { params }).then((r) => r.data);
export const getAllProjectsList = (params) => fetchAllPages("/project/all", "projects", params);
export const getProject = (id) => http.get(`/project/${id}`).then((r) => r.data);
export const createProject = (payload) => http.post("/project", payload).then((r) => r.data);
export const updateProject = (id, payload) => http.put(`/project/${id}`, payload).then((r) => r.data);
export const deleteProject = (id) => http.delete(`/project/${id}`).then((r) => r.data);

export const projectsLoader = async ({ request }) => {
  const params = readListParams(request, ["status"]);

  const [list, users] = await Promise.all([getProjects(params), getAllUsersList()]);

  return {
    projects: list.projects ?? [],
    pagination: list.pagination ?? {},
    users,
  };
};
