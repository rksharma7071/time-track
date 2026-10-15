import Project, { PROJECT_STATUSES, TITLE_COLLATION } from "../models/project.model.js";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Permission from "../models/permission.model.js";
import { buildPagination, isId, parsePagination } from "../utils/validators.js";
import { accessibleProjectsFilter, canAccessProject, canManageProject } from "../utils/access.js";
import { getProjectHoursUsed } from "../utils/hours.js";

const POPULATE = [
  { path: "manager", select: "name email role" },
  { path: "members", select: "name email role" },
  { path: "createdBy", select: "name email" },
];

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const findTitleConflict = (title, excludeId) =>
  Project.findOne({ title, ...(excludeId && { _id: { $ne: excludeId } }) })
    .collation(TITLE_COLLATION)
    .select("title")
    .lean();

const validateManager = async (managerId) => {
  if (!isId(managerId)) return "Invalid manager ID.";

  const user = await User.findById(managerId).select("role isActive").lean();

  if (!user || user.isActive === false) return "Manager does not exist or is inactive.";
  if (!["manager", "admin"].includes(user.role)) return "Selected user must be a manager or admin.";

  return null;
};

const validateMembers = async (members) => {
  if (!Array.isArray(members)) return { error: "Members must be an array of user IDs." };

  const ids = [...new Set(members.map(String))];

  if (ids.some((id) => !isId(id))) return { error: "One or more member IDs are invalid." };

  if (ids.length) {
    const found = await User.countDocuments({ _id: { $in: ids }, isActive: { $ne: false } });
    if (found !== ids.length) return { error: "One or more members do not exist or are inactive." };
  }

  return { ids };
};

export const getAllProjects = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = await accessibleProjectsFilter(req.user);

  if (req.query.status !== undefined) {
    if (!PROJECT_STATUSES.includes(req.query.status)) {
      return res.status(400).json({ message: "Invalid status filter." });
    }
    filter.status = req.query.status;
  }

  const [projects, totalProjects] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);

  return res.status(200).json({
    message: "Projects fetched successfully.",
    projects,
    pagination: buildPagination("totalProjects", totalProjects, page, limit),
  });
};

export const getProjectById = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid project ID." });
  }

  const project = await Project.findById(id).populate(POPULATE).lean();

  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  if (!(await canAccessProject(req.user, project))) {
    return res.status(403).json({ message: "You do not have access to this project." });
  }

  const hoursUsed = await getProjectHoursUsed(project._id);

  return res.status(200).json({
    message: "Project fetched successfully.",
    project: {
      ...project,
      hoursUsed,
      remainingHours: Math.max(0, project.totalHours - hoursUsed),
    },
  });
};

export const createProject = async (req, res) => {
  const { title, description, type, status, clientName, manager, members = [], startDate, dueDate, totalHours } = req.body;
  const trimmedTitle = String(title ?? "").trim();

  if (!trimmedTitle || !manager || !startDate || totalHours === undefined || totalHours === null) {
    return res.status(400).json({ message: "Title, manager, start date and total hours are required." });
  }

  if (req.user.role === "manager" && String(manager) !== req.user.id) {
    return res.status(403).json({ message: "Managers can only create projects that they manage themselves." });
  }

  const managerError = await validateManager(manager);
  if (managerError) return res.status(400).json({ message: managerError });

  const { ids: memberIds, error: membersError } = await validateMembers(members);
  if (membersError) return res.status(400).json({ message: membersError });

  const start = parseDate(startDate);
  const due = dueDate ? parseDate(dueDate) : null;

  if (!start || (dueDate && !due)) {
    return res.status(400).json({ message: "Invalid project date." });
  }

  if (due && due < start) {
    return res.status(400).json({ message: "Due date cannot be before the start date." });
  }

  const hours = Number(totalHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    return res.status(400).json({ message: "Total hours must be a positive number." });
  }

  const conflict = await findTitleConflict(trimmedTitle);
  if (conflict) {
    return res.status(409).json({ message: `Project "${conflict.title}" already exists.` });
  }

  const project = await Project.create({
    title: trimmedTitle,
    description,
    type,
    status,
    clientName,
    manager,
    members: memberIds,
    startDate: start,
    dueDate: due || undefined,
    totalHours: hours,
    remainingHours: hours,
    createdBy: req.user.id,
  });

  const createdProject = await Project.findById(project._id).populate(POPULATE).lean();

  return res.status(201).json({ message: "Project created successfully.", project: createdProject });
};

export const updateProject = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid project ID." });
  }

  const project = await Project.findById(id);

  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  if (!canManageProject(req.user, project)) {
    return res.status(403).json({ message: "You are not allowed to update this project." });
  }

  const { title, description, type, status, clientName, manager, members, startDate, dueDate, totalHours } = req.body;

  if (title !== undefined) {
    const trimmed = String(title).trim();
    if (!trimmed) return res.status(400).json({ message: "Title cannot be empty." });

    const conflict = await findTitleConflict(trimmed, id);
    if (conflict) {
      return res.status(409).json({ message: `Project "${conflict.title}" already exists.` });
    }
    project.title = trimmed;
  }

  if (description !== undefined) project.description = description;
  if (clientName !== undefined) project.clientName = clientName;
  if (type !== undefined) project.type = type;
  if (status !== undefined) project.status = status;

  if (manager !== undefined && String(manager) !== String(project.manager)) {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only an admin can reassign the project manager." });
    }
    const managerError = await validateManager(manager);
    if (managerError) return res.status(400).json({ message: managerError });
    project.manager = manager;
  }

  if (members !== undefined) {
    const { ids, error } = await validateMembers(members);
    if (error) return res.status(400).json({ message: error });
    project.members = ids;
  }

  if (startDate !== undefined) {
    const start = parseDate(startDate);
    if (!start) return res.status(400).json({ message: "Invalid start date." });
    project.startDate = start;
  }

  if (dueDate !== undefined) {
    if (dueDate === null || dueDate === "") {
      project.dueDate = undefined;
    } else {
      const due = parseDate(dueDate);
      if (!due) return res.status(400).json({ message: "Invalid due date." });
      project.dueDate = due;
    }
  }

  if (project.dueDate && project.dueDate < project.startDate) {
    return res.status(400).json({ message: "Due date cannot be before the start date." });
  }

  if (totalHours !== undefined) {
    const parsed = Number(totalHours);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ message: "Total hours must be a positive number." });
    }

    const used = await getProjectHoursUsed(project._id);

    if (parsed < used) {
      return res.status(400).json({ message: `Total hours cannot be less than the ${used} hour(s) already logged.` });
    }

    project.totalHours = parsed;
    project.remainingHours = parsed - used;
  }

  await project.save();

  const updatedProject = await Project.findById(id).populate(POPULATE).lean();

  return res.status(200).json({ message: "Project updated successfully.", project: updatedProject });
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid project ID." });
  }

  const project = await Project.findById(id).select("title");

  if (!project) {
    return res.status(404).json({ message: "Project not found." });
  }

  const taskCount = await Task.countDocuments({ project: id });

  if (taskCount > 0) {
    return res.status(409).json({
      message: `This project has ${taskCount} logged task(s). Set its status to "completed" or "cancelled" instead of deleting it.`,
    });
  }

  await Promise.all([
    project.deleteOne(),
    Permission.updateMany({ projects: id }, { $pull: { projects: id } }),
  ]);

  return res.status(200).json({ message: "Project deleted successfully." });
};
