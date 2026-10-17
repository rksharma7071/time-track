import { http } from "./api.js";
import { getAllProjectsList } from "./project.js";
import { getAllUsersList } from "./user.js";
import { readListParams } from "../utils/helpers.js";

export const TASK_FILTER_KEYS = ["project", "employee", "status", "type", "approvalStatus", "from", "to"];

export const getTasks = (params) => http.get("/tasks", { params }).then((r) => r.data);
export const getTask = (id) => http.get(`/tasks/${id}`).then((r) => r.data);
export const createTask = (payload) => http.post("/tasks", payload).then((r) => r.data);
export const updateTask = (id, payload) => http.put(`/tasks/${id}`, payload).then((r) => r.data);
export const updateTaskApproval = (id, approvalStatus) =>
  http.patch(`/tasks/${id}/approval`, { approvalStatus }).then((r) => r.data);
export const deleteTask = (id) => http.delete(`/tasks/${id}`).then((r) => r.data);

export const tasksLoader = async ({ request }) => {
  const params = readListParams(request, TASK_FILTER_KEYS);

  const [list, projects, users] = await Promise.all([
    getTasks(params),
    getAllProjectsList(),
    getAllUsersList().catch(() => []),
  ]);

  return {
    tasks: list.tasks ?? [],
    summary: list.summary ?? { totalHours: 0 },
    pagination: list.pagination ?? {},
    projects,
    users,
  };
};
