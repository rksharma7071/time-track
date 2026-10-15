import { http } from "./api.js";

export const login = (payload) => http.post("/auth/login", payload).then((r) => r.data);
export const register = (payload) => http.post("/auth/register", payload).then((r) => r.data);
export const logout = () => http.post("/auth/logout").then((r) => r.data);
export const getCurrentUser = () => http.get("/auth/me").then((r) => r.data);
export const changePassword = (payload) => http.patch("/auth/change-password", payload).then((r) => r.data);
