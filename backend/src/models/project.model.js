import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["billable", "non-billable", "internal"], default: "non-billable" },
    status: { type: String, enum: ["planned", "active", "on-hold", "completed", "cancelled"], default: "planned" },
    clientName: { type: String, trim: true, default: "" },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startDate: { type: Date, required: true },
    dueDate: { type: Date },
    totalHours: { type: Number, required: true, min: 0 },
    remainingHours: { type: Number, default: function () { return this.totalHours; }, min: 0, },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ manager: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ status: 1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;