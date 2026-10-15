import Permission from "../models/permission.model.js";
import Project from "../models/project.model.js";
import { toObjectId } from "./validators.js";

export const idOf = (value) => {
  const id = value?._id ?? value;
  return id == null ? null : String(id);
};

const sameId = (a, b) => {
  const x = idOf(a);
  const y = idOf(b);
  return Boolean(x && y && x === y);
};

export const accessibleProjectsFilter = async (user) => {
  if (user.role === "admin") return {};

  const userId = toObjectId(user.id);
  const permission = await Permission.findOne({ user: userId }).select("projects").lean();

  return {
    $or: [
      { manager: userId },
      { members: userId },
      { _id: { $in: permission?.projects ?? [] } },
    ],
  };
};

export const canAccessProject = async (user, project) => {
  if (!project) return false;
  if (user.role === "admin") return true;
  if (sameId(project.manager, user.id)) return true;
  if ((project.members ?? []).some((member) => sameId(member, user.id))) return true;

  const permitted = await Permission.exists({ user: user.id, projects: idOf(project) });
  return Boolean(permitted);
};

export const canManageProject = (user, project) =>
  Boolean(project) &&
  (user.role === "admin" || (user.role === "manager" && sameId(project.manager, user.id)));

export const visibleTasksFilter = async (user) => {
  if (user.role === "admin") return {};

  const userId = toObjectId(user.id);

  if (user.role === "manager") {
    const managedProjectIds = await Project.distinct("_id", { manager: userId });
    return { $or: [{ employee: userId }, { project: { $in: managedProjectIds } }] };
  }

  return { employee: userId };
};

export const canAccessTask = (user, task, project) => user.role === "admin" || sameId(task.employee, user.id) || canManageProject(user, project);
