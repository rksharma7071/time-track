import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const getAllProjects = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [projects, totalProjects] = await Promise.all([
      Project.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Project.countDocuments()
    ]);
    return res.status(200).json({
      message: "Project fetched successfully.", projects,
      pagination: {
        totalProjects,
        currentPage: page,
        limit,
        totalPage: Math.ceil(totalProjects / limit),
        hasNextPage: page * limit < totalProjects,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error("Get All Project error:", error.message);
    return res.status(500).json({ message: "Internal server error.", error: error });
  }
}

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid project ID." });
    }

    const project = await Project.findById(id)
      .populate("manager", "name email role")
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    return res.status(200).json({ message: "Project fetched successfully.", project });
  } catch (error) {
    console.error("Get Project By ID error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const createProject = async (req, res) => {
  try {
    const { title, description, type, status, clientName, manager, members = [], startDate, dueDate, totalHours } = req.body;

    if (!title?.trim() || !manager || !startDate || totalHours === undefined || totalHours === null) {
      return res.status(400).json({ message: "Title, manager, start date and total hours are required." });
    }

    const existProject = await Project.findOne({ title: title.trim() });

    if (existProject) {
      return res.status(409).json({ message: `Project "${existProject.title}" already exists.` });
    }

    if (!mongoose.isValidObjectId(manager)) {
      return res.status(400).json({ message: "Invalid manager ID." });
    }

    if (!Array.isArray(members)) {
      return res.status(400).json({ message: "Members must be an array of user IDs." });
    }

    const memberIds = [...new Set(members.map(String))];

    if (memberIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "One or more member IDs are invalid." });
    }

    const start = new Date(startDate);
    const due = dueDate ? new Date(dueDate) : null;

    if (Number.isNaN(start.getTime()) || (dueDate && (!due || Number.isNaN(due.getTime())))) {
      return res.status(400).json({ message: "Invalid project date." });
    }

    if (due && due < start) {
      return res.status(400).json({ message: "Due date cannot be before the start date." });
    }

    if (typeof totalHours !== "number" || !Number.isFinite(totalHours) || totalHours <= 0) {
      return res.status(400).json({ message: "Total hours must be a positive number." });
    }

    const userIds = [...new Set([manager, ...memberIds])];
    const users = await User.find({ _id: { $in: userIds } })
      .select("_id role")
      .lean();

    if (users.length !== userIds.length) {
      return res.status(400).json({ message: "Manager or one or more members do not exist." });
    }

    const managerUser = users.find((user) => user._id.toString() === manager);

    if (!["manager", "admin"].includes(managerUser.role)) {
      return res.status(400).json({ message: "Selected user must be a manager or admin." });
    }

    const createdBy = req.user?.id || req.user?._id;
    console.log("-----------------------------------------");
    console.log("Create Product: ", req.user);
    console.log("-----------------------------------------");

    if (!createdBy || !mongoose.isValidObjectId(createdBy)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const project = await Project.create({
      title: title.trim(),
      description,
      type,
      status,
      clientName,
      manager,
      members: memberIds,
      startDate: start,
      dueDate: due || undefined,
      totalHours,
      remainingHours: totalHours,
      createdBy,
    });

    const createdProject = await Project.findById(project._id)
      .populate("manager", "name email role")
      .populate("members", "name email role")
      .populate("createdBy", "name email")
      .lean();

    return res.status(201).json({ message: "Project created successfully.", project: createdProject });
  } catch (error) {
    console.error("Create Project error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({ message: "A project with these unique details already exists." });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error." });
  }
};