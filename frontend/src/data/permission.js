import { http } from "./api.js";
import { getAllProjectsList } from "./project.js";
import { getAllUsersList } from "./user.js";

export const getPermissions = () => http.get("/permissions/all").then((r) => r.data.permissions ?? []);
export const createPermission = (payload) => http.post("/permissions", payload).then((r) => r.data);
export const updatePermission = (id, projects) => http.patch(`/permissions/${id}`, { projects }).then((r) => r.data);
export const deletePermission = (id) => http.delete(`/permissions/${id}`).then((r) => r.data);

export const permissionsLoader = async () => {
  const [permissions, projects, users] = await Promise.all([
    getPermissions(),
    getAllProjectsList(),
    getAllUsersList(),
  ]);

  return { permissions, projects, users };
};
