import mongoose from "mongoose";

export const USER_ROLES = ["admin", "manager", "employee"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address."],
    },
    password: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "employee", index: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ managerId: 1, role: 1 });

export default mongoose.model("User", userSchema);
