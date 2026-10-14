import mongoose from "mongoose";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";

export const createTask = async (req, res) => {
  try {
    const { title, project, employee, type, status, date, hours, description } = req.body;

    if (!project || !employee || hours === undefined || hours === null || !date) {
      return res.status(400).json({ message: "Project, employee, date, and hours are required." });
    }

    if (
      !mongoose.isValidObjectId(project) ||
      !mongoose.isValidObjectId(employee)
    ) {
      return res.status(400).json({ message: "Invalid project or employee ID." });
    }

    const taskHours = Number(hours);

    if (
      !Number.isFinite(taskHours) ||
      taskHours < 0.25 ||
      taskHours > 24 ||
      !Number.isInteger(taskHours * 4)
    ) {
      return res.status(400).json({ message: "Hours must be between 0.25 and 24 in increments of 0.25." });
    }

    if (Number.isNaN(new Date(date).getTime())) {
      return res.status(400).json({ message: "Invalid task date." });
    }

    const projectData = await Project.findById(project);

    if (!projectData) {
      return res.status(404).json({ message: "Project does not exist.", });
    }

    const employeeData = await User.findById(employee);

    if (!employeeData) {
      return res.status(404).json({ message: "Employee does not exist." });
    }

    if (taskHours > projectData.totalHours) {
      return res.status(400).json({ message: "Task hours cannot exceed the project's allocated hours." });
    }

    const task = await Task.create({ title, project, employee, type, status, date, hours: taskHours, description });

    return res.status(201).json({ message: "Task created successfully.", task });
  } catch (error) {
    console.error("Create Task Error:", error.message);
    return res.status(400).json({ message: error.message || "Failed to create task." });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [tasks, totalTasks] = await Promise.all([
      Task.find()
        .populate("project", "title")
        .populate("employee", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),

      Task.countDocuments(),
    ]);

    return res.status(200).json({
      message: "Tasks fetched successfully.",
      tasks,
      pagination: {
        totalTasks,
        currentPage: page,
        limit,
        totalPage: Math.ceil(totalTasks / limit),
        hasNextPage: page * limit < totalTasks,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get All Tasks Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch tasks." });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findById(id)
      .populate("project", "title")
      .populate("employee", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    return res.status(200).json({ message: "Task fetched successfully.", task });
  } catch (error) {
    console.error("Get Task By ID Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch task." });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const projectId = req.body.project || task.project;
    const employeeId = req.body.employee || task.employee;
    const hours = req.body.hours !== undefined ? Number(req.body.hours) : task.hours;
    const date = req.body.date ?? task.date;

    if (
      !mongoose.isValidObjectId(projectId) ||
      !mongoose.isValidObjectId(employeeId)
    ) {
      return res.status(400).json({ message: "Invalid project or employee ID." });
    }

    if (
      !Number.isFinite(hours) ||
      hours < 0.25 ||
      hours > 24 ||
      !Number.isInteger(hours * 4)
    ) {
      return res.status(400).json({ message: "Hours must be between 0.25 and 24 in increments of 0.25." });
    }

    if (Number.isNaN(new Date(date).getTime())) {
      return res.status(400).json({ message: "Invalid task date." });
    }

    const projectData = await Project.findById(projectId);
    if (!projectData) {
      return res.status(404).json({ message: "Project does not exist." });
    }

    const employeeData = await User.findById(employeeId);
    if (!employeeData) {
      return res.status(404).json({ message: "Employee does not exist." });
    }

    const result = await Task.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(String(projectId)),
          _id: { $ne: task._id },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: "$hours" },
        },
      },
    ]);

    const totalHours = result[0]?.totalHours || 0;

    if (totalHours + hours > projectData.totalHours) {
      return res.status(400).json({ message: "Project's total allocated hours would be exceeded.", });
    }

    Object.assign(task, req.body, {
      project: projectId,
      employee: employeeId,
      hours,
      date,
    });

    await task.save();

    await task.populate("project", "title");
    await task.populate("employee", "name email");

    return res.status(200).json({ message: "Task updated successfully.", task });
  } catch (error) {
    console.error("Update Task Error:", error.message);
    return res.status(400).json({ message: error.message || "Failed to update task." });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    return res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete Task Error:", error.message);
    return res.status(500).json({ message: "Failed to delete task." });
  }
};