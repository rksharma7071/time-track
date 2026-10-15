import bcrypt from "bcrypt";
import User, { USER_ROLES } from "../models/user.model.js";
import Project from "../models/project.model.js";
import {
  EMAIL_REGEX,
  buildPagination,
  escapeRegex,
  isId,
  normalizeEmail,
  parsePagination,
  validatePassword,
} from "../utils/validators.js";
import { toPublicUser } from "../utils/serializers.js";

const resolveManagerId = async (managerId, userId) => {
  if (managerId === null || managerId === "") return { value: null };

  if (!isId(managerId)) return { error: "Invalid manager ID." };

  if (userId && String(managerId) === String(userId)) {
    return { error: "A user cannot be their own manager." };
  }

  const manager = await User.findById(managerId).select("role isActive").lean();

  if (!manager || manager.isActive === false) return { error: "Manager does not exist or is inactive." };

  if (!["manager", "admin"].includes(manager.role)) {
    return { error: "Assigned manager must have the manager or admin role." };
  }

  return { value: managerId };
};

export const getAllUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.role !== undefined) {
    if (!USER_ROLES.includes(req.query.role)) {
      return res.status(400).json({ message: "Invalid role filter." });
    }
    filter.role = req.query.role;
  }

  if (req.user.role !== "admin") {
    filter.isActive = { $ne: false };
  } else if (req.query.active !== undefined) {
    filter.isActive = req.query.active === "true" ? { $ne: false } : false;
  }

  const search = String(req.query.search ?? "").trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, totalUsers] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return res.status(200).json({
    message: "Users fetched successfully.",
    users: users.map(toPublicUser),
    pagination: buildPagination("totalUsers", totalUsers, page, limit),
  });
};

export const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  const isPrivileged = ["admin", "manager"].includes(req.user.role);

  if (!isPrivileged && id !== req.user.id) {
    return res.status(403).json({ message: "You can only view your own profile." });
  }

  const user = await User.findById(id).select("-password").lean();

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({ message: "User fetched successfully.", user: toPublicUser(user) });
};

export const createUser = async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const email = normalizeEmail(req.body.email);
  const { password, role = "employee", managerId = null } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  if (!USER_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  const manager = await resolveManagerId(managerId);
  if (manager.error) {
    return res.status(400).json({ message: manager.error });
  }

  if (await User.exists({ email })) {
    return res.status(409).json({ message: "Email id already registered." });
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role,
    managerId: manager.value,
  });

  return res.status(201).json({ message: "User created successfully.", user: toPublicUser(user) });
};

export const updateUser = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const { name, role, managerId, isActive } = req.body;
  const isSelf = id === req.user.id;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return res.status(400).json({ message: "Name cannot be empty." });
    user.name = trimmed;
  }

  if (role !== undefined) {
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }
    if (isSelf && role !== "admin") {
      return res.status(400).json({ message: "You cannot remove your own admin role." });
    }
    user.role = role;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false." });
    }
    if (isSelf && !isActive) {
      return res.status(400).json({ message: "You cannot deactivate your own account." });
    }
    user.isActive = isActive;
  }

  if (managerId !== undefined) {
    const manager = await resolveManagerId(managerId, id);
    if (manager.error) return res.status(400).json({ message: manager.error });
    user.managerId = manager.value;
  }

  await user.save();

  return res.status(200).json({ message: "User updated successfully.", user: toPublicUser(user) });
};

export const deactivateUser = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  if (id === req.user.id) {
    return res.status(400).json({ message: "You cannot deactivate your own account." });
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { returnDocument: "after" }
  )
    .select("-password")
    .lean();

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const managedProjects = await Project.countDocuments({
    manager: id,
    status: { $nin: ["completed", "cancelled"] },
  });

  return res.status(200).json({
    message: managedProjects
      ? `User deactivated. They still manage ${managedProjects} open project(s) - please assign a new manager.`
      : "User deactivated successfully.",
    user: toPublicUser(user),
    managedProjects,
  });
};
