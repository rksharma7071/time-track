import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
  },
  { timestamps: true }
);

permissionSchema.index({ projects: 1 });

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;
