import { fetchAllPages, http } from "./api.js";
import { readListParams } from "../utils/helpers.js";

export const getUsers = (params) => http.get("/user/all", { params }).then((r) => r.data);
export const getAllUsersList = (params) => fetchAllPages("/user/all", "users", params);
export const createUser = (payload) => http.post("/user", payload).then((r) => r.data);
export const updateUser = (id, payload) => http.patch(`/user/${id}`, payload).then((r) => r.data);
export const deactivateUser = (id) => http.delete(`/user/${id}`).then((r) => r.data);

export const usersLoader = async ({ request }) => {
  const params = readListParams(request, ["role", "active", "search"]);

  const [list, activeUsers] = await Promise.all([
    getUsers(params),
    getAllUsersList({ active: "true" }),
  ]);

  return {
    users: list.users ?? [],
    pagination: list.pagination ?? {},
    activeUsers,
  };
};
