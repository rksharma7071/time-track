import express from "express";
import { createUser, deactivateUser, getAllUsers, getUserById, updateUser } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", verifyToken(["admin", "manager"]), getAllUsers);
router.post("/", verifyToken(["admin"]), createUser);
router.get("/:id", verifyToken(), getUserById);
router.patch("/:id", verifyToken(["admin"]), updateUser);
router.delete("/:id", verifyToken(["admin"]), deactivateUser);

export default router;
