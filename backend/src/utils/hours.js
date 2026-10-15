import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import { toObjectId } from "./validators.js";

export const sumTaskHours = async (match) => {
  const [result] = await Task.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$hours" } } },
  ]);
  return result?.total ?? 0;
};

const excludeTask = (taskId) => (taskId ? { _id: { $ne: toObjectId(taskId) } } : {});

export const getProjectHoursUsed = (projectId, excludeTaskId) =>
  sumTaskHours({ project: toObjectId(projectId), ...excludeTask(excludeTaskId) });

export const getEmployeeDayHours = (employeeId, day, excludeTaskId) => {
  const nextDay = new Date(day);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  return sumTaskHours({
    employee: toObjectId(employeeId),
    date: { $gte: day, $lt: nextDay },
    ...excludeTask(excludeTaskId),
  });
};

export const syncRemainingHours = async (projectId) => {
  const project = await Project.findById(projectId).select("totalHours").lean();
  if (!project) return;

  const used = await getProjectHoursUsed(projectId);

  await Project.updateOne(
    { _id: projectId },
    { $set: { remainingHours: Math.max(0, project.totalHours - used) } }
  );
};
