import express from "express";
import {
  createPermission,
  deletePermission,
  getAllPermissions,
  getPermissionById,
  getPermissionByUser,
  updatePermission,
} from "../controllers/permission.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken(["admin"]));

router.post("/", createPermission);
router.get("/all", getAllPermissions);
router.get("/user/:userId", getPermissionByUser);
router.get("/:id", getPermissionById);
router.patch("/:id", updatePermission);
router.delete("/:id", deletePermission);

export default router;
