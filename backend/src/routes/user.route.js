import express from "express";
import { deleteUser, getAllUsers } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", verifyToken(["admin", "manager", "employee"]), getAllUsers);
router.delete("/:id", verifyToken(["admin", "manager", "employee"]), deleteUser);

export default router;