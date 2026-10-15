import Permission from "../models/permission.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import { isId } from "../utils/validators.js";


const POPULATE = [
  { path: "user", select: "name email role" },
  { path: "projects", select: "title status" },
];

const validateProjectIds = async (projects) => {
  if (!Array.isArray(projects) || !projects.every(isId)) {
    return { error: "Projects must be an array of valid project IDs." };
  }

  const ids = [...new Set(projects.map(String))];

  if (ids.length) {
    const found = await Project.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) return { error: "One or more projects do not exist." };
  }

  return { ids };
};

export const createPermission = async (req, res) => {
  const { user, projects = [] } = req.body;

  if (!isId(user)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  if (!(await User.exists({ _id: user }))) {
    return res.status(404).json({ message: "User does not exist." });
  }

  const { ids, error } = await validateProjectIds(projects);
  if (error) return res.status(400).json({ message: error });

  if (await Permission.exists({ user })) {
    return res.status(409).json({ message: "Permission already exists for this user. Update it instead." });
  }

  const created = await Permission.create({ user, projects: ids });
  const permission = await Permission.findById(created._id).populate(POPULATE).lean();

  return res.status(201).json({ message: "Permission created successfully.", permission });
};

export const getAllPermissions = async (req, res) => {
  const permissions = await Permission.find().populate(POPULATE).sort({ createdAt: -1 }).lean();

  return res.status(200).json({ message: "Permissions fetched successfully.", permissions });
};

export const getPermissionById = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid permission ID." });
  }

  const permission = await Permission.findById(id).populate(POPULATE).lean();

  if (!permission) {
    return res.status(404).json({ message: "Permission not found." });
  }

  return res.status(200).json({ message: "Permission fetched successfully.", permission });
};

export const getPermissionByUser = async (req, res) => {
  const { userId } = req.params;

  if (!isId(userId)) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  const permission = await Permission.findOne({ user: userId }).populate(POPULATE).lean();

  if (!permission) {
    return res.status(404).json({ message: "No permission record for this user." });
  }

  return res.status(200).json({ message: "Permission fetched successfully.", permission });
};

export const updatePermission = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid permission ID." });
  }

  const { ids, error } = await validateProjectIds(req.body.projects);
  if (error) return res.status(400).json({ message: error });

  const permission = await Permission.findByIdAndUpdate(
    id,
    { $set: { projects: ids } },
    { returnDocument: "after", runValidators: true }
  )
    .populate(POPULATE)
    .lean();

  if (!permission) {
    return res.status(404).json({ message: "Permission not found." });
  }

  return res.status(200).json({ message: "Permission updated successfully.", permission });
};

export const deletePermission = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid permission ID." });
  }

  const permission = await Permission.findByIdAndDelete(id);

  if (!permission) {
    return res.status(404).json({ message: "Permission not found." });
  }

  return res.status(200).json({ message: "Permission deleted successfully." });
};
