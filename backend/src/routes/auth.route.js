import express from "express";
import { getCurrentUser, login, logout, register } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyToken(["admin", "manager", "employee"]), logout);
router.get("/me", verifyToken(["admin", "manager", "employee"]), getCurrentUser);

export default router;