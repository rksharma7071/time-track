import mongoose from "mongoose";

export const PROJECT_TYPES = ["billable", "non-billable", "internal"];
export const PROJECT_STATUSES = ["planned", "active", "on-hold", "completed", "cancelled"];
export const TITLE_COLLATION = { locale: "en", strength: 2 };

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "", maxlength: 5000 },
    type: { type: String, enum: PROJECT_TYPES, default: "non-billable" },
    status: { type: String, enum: PROJECT_STATUSES, default: "planned" },
    clientName: { type: String, trim: true, default: "", maxlength: 200 },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startDate: { type: Date, required: true },
    dueDate: { type: Date },
    totalHours: { type: Number, required: true, min: 0 },
    remainingHours: { type: Number, default: function () { return this.totalHours; }, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

projectSchema.index({ title: 1 }, { unique: true, collation: TITLE_COLLATION });
projectSchema.index({ manager: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ status: 1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;