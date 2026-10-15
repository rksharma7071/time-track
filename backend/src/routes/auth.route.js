import express from "express";
import { changePassword, getCurrentUser, login, logout, register } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", verifyToken(), getCurrentUser);
router.patch("/change-password", verifyToken(), changePassword);

export default router;
