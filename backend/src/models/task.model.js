import mongoose from "mongoose";

export const TASK_TYPES = ["development", "bug-fix", "testing", "meeting", "research", "documentation", "deployment", "other",];
export const TASK_STATUSES = ["planned", "active", "on-hold", "completed", "cancelled"];

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 160, default: "" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: TASK_TYPES, default: "development" },
    status: { type: String, enum: TASK_STATUSES, default: "planned" },
    date: { type: Date, required: true, default: Date.now },
    hours: {
      type: Number,
      required: true,
      min: 0.25,
      max: 24,
      validate: {
        validator: (value) => Number.isFinite(value) && Number.isInteger(value * 4),
        message: "Hours must be in increments of 0.25",
      },
    },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

taskSchema.index({ project: 1, date: -1 });
taskSchema.index({ employee: 1, date: -1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ employee: 1, status: 1 });
taskSchema.index({ title: "text", description: "text" });

taskSchema.virtual("isLogged").get(function () {
  return this.hours > 0;
});

taskSchema.pre("save", function () {
  if (this.isModified("date") && this.date) {
    this.date.setUTCHours(0, 0, 0, 0);
  }
});

const Task = mongoose.model("Task", taskSchema);

export default Task;