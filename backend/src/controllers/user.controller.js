import User from "../models/user.model.js";

export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments()
    ]);
    return res.status(200).json({
      message: "Users fetched successfully.", users,

      pagination: {
        totalUsers,
        currentPage: page,
        limit,
        totalPage: Math.ceil(totalUsers / limit),
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error("Get All Users error:", error.message);
    return res.status(500).json({ message: "Internal server error.", error: error });
  }
}

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const user = await User.findById(id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({ message: "User fetched successfully.", user });
  } catch (error) {
    console.error("Get User By ID error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
}