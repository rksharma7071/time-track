import Task, { TASK_STATUSES, TASK_TYPES } from "../models/task.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import { buildPagination, isId, isValidHours, parsePagination, toObjectId, toUtcDay } from "../utils/validators.js";
import { canAccessProject, canAccessTask, canManageProject, idOf, visibleTasksFilter } from "../utils/access.js";
import { getEmployeeDayHours, getProjectHoursUsed, sumTaskHours, syncRemainingHours } from "../utils/hours.js";

const MAX_HOURS_PER_DAY = 24;
const CLOSED_PROJECT_STATUSES = ["completed", "cancelled"];
const EDITABLE_FIELDS = ["project", "employee", "type", "status", "date", "hours", "description"];
const POPULATE = [
  { path: "project", select: "title" },
  { path: "employee", select: "name email" },
];

const fail = (status, message) => ({ error: { status, message } });

const pick = (source, keys) =>
  Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));

const validateTaskEntry = async ({ user, projectId, employeeId, hours, date, excludeTaskId }) => {
  if (!isId(projectId) || !isId(employeeId)) {
    return fail(400, "Invalid project or employee ID.");
  }

  if (!isValidHours(hours)) {
    return fail(400, "Hours must be between 0.25 and 24 in increments of 0.25.");
  }

  const day = toUtcDay(date);
  if (!day) return fail(400, "Invalid task date.");

  const latestAllowedDay = toUtcDay(Date.now());
  latestAllowedDay.setUTCDate(latestAllowedDay.getUTCDate() + 1);
  if (day > latestAllowedDay) return fail(400, "Hours cannot be logged for future dates.");

  const [project, employee] = await Promise.all([
    Project.findById(projectId).select("title status startDate totalHours manager members").lean(),
    User.findById(employeeId).select("role isActive").lean(),
  ]);

  if (!project) return fail(404, "Project does not exist.");
  if (!employee || employee.isActive === false) return fail(404, "Employee does not exist or is inactive.");

  if (CLOSED_PROJECT_STATUSES.includes(project.status)) {
    return fail(400, `Hours cannot be logged on a ${project.status} project.`);
  }

  if (day < toUtcDay(project.startDate)) {
    return fail(400, "Task date cannot be before the project start date.");
  }

  const isSelf = String(employeeId) === user.id;
  if (!isSelf && !canManageProject(user, project)) {
    return fail(403, "You can only log hours for yourself on this project.");
  }

  const employeeOnProject = await canAccessProject({ id: String(employeeId), role: employee.role }, project);
  if (!employeeOnProject) {
    return fail(403, isSelf ? "You do not have access to this project." : "This employee is not assigned to the project.");
  }

  const [projectUsed, dayUsed] = await Promise.all([
    getProjectHoursUsed(project._id, excludeTaskId),
    getEmployeeDayHours(employeeId, day, excludeTaskId),
  ]);

  if (projectUsed + hours > project.totalHours) {
    const left = Math.max(0, project.totalHours - projectUsed);
    return fail(400, `Project's allocated hours would be exceeded. Only ${left} hour(s) remaining.`);
  }

  if (dayUsed + hours > MAX_HOURS_PER_DAY) {
    return fail(400, `Daily limit exceeded: ${dayUsed} hour(s) are already logged for this date.`);
  }

  return { project, day };
};

export const createTask = async (req, res) => {
  const { project, type, status, date, hours, description } = req.body;
  const employee = req.body.employee ?? req.user.id;

  if (!project || hours === undefined || hours === null || !date) {
    return res.status(400).json({ message: "Project, date and hours are required." });
  }

  const taskHours = Number(hours);

  const result = await validateTaskEntry({
    user: req.user,
    projectId: project,
    employeeId: employee,
    hours: taskHours,
    date,
  });

  if (result.error) {
    return res.status(result.error.status).json({ message: result.error.message });
  }

  const task = await Task.create({
    project,
    employee,
    type,
    status,
    date: result.day,
    hours: taskHours,
    description,
  });

  await syncRemainingHours(project);
  await task.populate(POPULATE);

  return res.status(201).json({ message: "Task created successfully.", task });
};

export const getAllTasks = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { project, employee, status, type, from, to } = req.query;

  const conditions = [await visibleTasksFilter(req.user)];

  if (project !== undefined) {
    if (!isId(project)) return res.status(400).json({ message: "Invalid project filter." });
    conditions.push({ project: toObjectId(project) });
  }

  if (employee !== undefined) {
    if (!isId(employee)) return res.status(400).json({ message: "Invalid employee filter." });
    conditions.push({ employee: toObjectId(employee) });
  }

  if (status !== undefined) {
    if (!TASK_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status filter." });
    conditions.push({ status });
  }

  if (type !== undefined) {
    if (!TASK_TYPES.includes(type)) return res.status(400).json({ message: "Invalid type filter." });
    conditions.push({ type });
  }

  if (from !== undefined || to !== undefined) {
    const range = {};

    if (from !== undefined) {
      const fromDay = toUtcDay(from);
      if (!fromDay) return res.status(400).json({ message: "Invalid 'from' date." });
      range.$gte = fromDay;
    }

    if (to !== undefined) {
      const toDay = toUtcDay(to);
      if (!toDay) return res.status(400).json({ message: "Invalid 'to' date." });
      range.$lte = toDay;
    }

    conditions.push({ date: range });
  }

  const filter = { $and: conditions };

  const [tasks, totalTasks, totalHours] = await Promise.all([
    Task.find(filter).populate(POPULATE).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
    Task.countDocuments(filter),
    sumTaskHours(filter),
  ]);

  return res.status(200).json({
    message: "Tasks fetched successfully.",
    tasks,
    summary: { totalHours },
    pagination: buildPagination("totalTasks", totalTasks, page, limit),
  });
};

export const getTaskById = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid task ID." });
  }

  const task = await Task.findById(id).populate(POPULATE);

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const project = await Project.findById(idOf(task.project)).select("manager").lean();

  if (!canAccessTask(req.user, task, project)) {
    return res.status(403).json({ message: "You do not have access to this task." });
  }

  return res.status(200).json({ message: "Task fetched successfully.", task });
};

export const updateTask = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid task ID." });
  }

  const task = await Task.findById(id);

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const currentProject = await Project.findById(task.project).select("manager").lean();

  if (!canAccessTask(req.user, task, currentProject)) {
    return res.status(403).json({ message: "You are not allowed to update this task." });
  }

  const updates = pick(req.body, EDITABLE_FIELDS);

  const projectId = updates.project ?? String(task.project);
  const employeeId = updates.employee ?? String(task.employee);
  const hours = updates.hours !== undefined ? Number(updates.hours) : task.hours;
  const date = updates.date ?? task.date;

  const result = await validateTaskEntry({
    user: req.user,
    projectId,
    employeeId,
    hours,
    date,
    excludeTaskId: task._id,
  });

  if (result.error) {
    return res.status(result.error.status).json({ message: result.error.message });
  }

  const previousProjectId = String(task.project);

  Object.assign(task, updates, {
    project: projectId,
    employee: employeeId,
    hours,
    date: result.day,
  });

  await task.save();

  await Promise.all([...new Set([previousProjectId, String(projectId)])].map(syncRemainingHours));

  await task.populate(POPULATE);

  return res.status(200).json({ message: "Task updated successfully.", task });
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ message: "Invalid task ID." });
  }

  const task = await Task.findById(id);

  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const project = await Project.findById(task.project).select("manager status").lean();

  if (!canAccessTask(req.user, task, project)) {
    return res.status(403).json({ message: "You are not allowed to delete this task." });
  }

  if (project && CLOSED_PROJECT_STATUSES.includes(project.status) && req.user.role !== "admin") {
    return res.status(400).json({ message: `Entries on a ${project.status} project can only be removed by an admin.` });
  }

  await task.deleteOne();
  await syncRemainingHours(task.project);

  return res.status(200).json({ message: "Task deleted successfully." });
};
