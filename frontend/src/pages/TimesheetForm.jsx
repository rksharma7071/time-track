
import { useEffect, useMemo, useState } from "react";
import {
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import API from "../data/api.js";
import "../styles/TimesheetForm.css";
import SearchableSelect from "../components/SearchableSelect";

const initialFormData = { title: "", project: "", employee: "", type: "development", status: "planned", date: new Date().toISOString().slice(0, 10), hours: "", description: "" };

const taskTypes = ["development", "bug-fix", "testing", "meeting", "research", "documentation", "deployment", "other"];
const taskStatuses = ["planned", "active", "on-hold", "completed", "cancelled"];

const TimesheetForm = () => {
  const data = useLoaderData();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();

  const users = data?.users ?? [];
  const projects = data?.projects ?? [];
  const pagination = data?.pagination ?? {};

  const currentPage = Math.max(1, Number(searchParams.get("page")) || pagination.currentPage || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || pagination.limit || 10);

  const totalTasks = pagination.totalTasks ?? data?.tasks?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTasks / limit));

  const [tasks, setTasks] = useState(data?.tasks ?? []);
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTasks(data?.tasks ?? []);
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const hours = Number(formData.hours);

    if (
      !Number.isFinite(hours) ||
      hours < 0.25 ||
      hours > 24 ||
      !Number.isInteger(hours * 4)
    ) {
      setError("Hours must be between 0.25 and 24 in increments of 0.25.");
      return;
    }

    setLoading(true);

    try {
      const payload = { ...formData, hours };

      const response = editingId
        ? await axios.put(`${API}/api/tasks/${editingId}`, payload, {
          withCredentials: true,
        })
        : await axios.post(`${API}/api/tasks`, payload, {
          withCredentials: true,
        });

      setSuccess(
        response.data.message || (editingId ? "Task updated successfully." : "Task created successfully.")
      );

      resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save task.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task) => {
    const taskId = task._id || task.id;
    setEditingId(taskId);

    setFormData({
      title: task.title ?? "",
      project: task.project?._id ?? task.project?.id ?? task.project ?? "",
      employee: task.employee?._id ?? task.employee?.id ?? task.employee ?? "",
      type: task.type ?? "development",
      status: task.status ?? "planned",
      date: task.date ? task.date.slice(0, 10) : "",
      hours: String(task.hours ?? ""),
      description: task.description ?? "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await axios.delete(`${API}/api/tasks/${id}`, {
        withCredentials: true,
      });

      setSuccess(response.data.message || "Task deleted successfully.");

      if (editingId === id) {
        resetForm();
      }

      revalidator.revalidate();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task.");
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(page));
      params.set("limit", String(limit));
      return params;
    });
  };

  const handleLimitChange = (e) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", "1");
      params.set("limit", e.target.value);
      return params;
    });
  };

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase();

    return tasks.filter((task) => {
      const taskProjectId = task.project?._id || task.project?.id || task.project;
      const taskEmployeeId = task.employee?._id || task.employee?.id || task.employee;

      const projectName =
        typeof task.project === "object" && task.project?.title
          ? task.project.title
          : projects.find((project) => (project._id || project.id) === taskProjectId)?.title;

      const employeeName =
        typeof task.employee === "object" && task.employee?.name
          ? task.employee.name
          : users.find((user) => (user._id || user.id) === taskEmployeeId)?.name;

      return (
        (task.title ?? "").toLowerCase().includes(query) ||
        (task.description ?? "").toLowerCase().includes(query) ||
        (projectName ?? "").toLowerCase().includes(query) ||
        (employeeName ?? "").toLowerCase().includes(query)
      );
    });
  }, [tasks, search, projects, users]);

  const pageHours = tasks.reduce((total, task) => total + Number(task.hours || 0), 0);

  return (
    <main className="timesheet-container">
      <section className="timesheet-form-section">
        <div className="section-header">
          <h1>{editingId ? "Update Task" : "Create Task"}</h1>
          <p>Record and manage your daily work activities.</p>
        </div>

        <form onSubmit={handleSubmit} className="timesheet-form">
          <div className="form-group">
            <label htmlFor="project">Project</label>
            <SearchableSelect
              options={projects}
              value={formData.project}
              onChange={(id) => {
                setFormData((prev) => ({ ...prev, project: id }));
                setError("");
                setSuccess("");
              }}
              labelKey="title"
              valueKey="_id"
              placeholder="Select Project"
              searchPlaceholder="Search projects..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="employee">Employee</label>

            <SearchableSelect
              options={users.filter((user) => user.role === "employee")}
              value={formData.employee}
              onChange={(id) => {
                setFormData((prev) => ({ ...prev, employee: id }));
                setError("");
                setSuccess("");
              }}
              labelKey="name"
              valueKey="_id"
              secondaryKey="email"
              placeholder="Select Employee"
              searchPlaceholder="Search employees..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Task Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace("-", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("-", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="hours">Hours Spent</label>
            <input
              id="hours"
              name="hours"
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              placeholder="e.g. 4.5"
              value={formData.hours}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              maxLength={2000}
              placeholder="Describe the work completed..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {error && <p className="timesheet-error" role="alert">{error}</p>}
          {success && <p className="timesheet-success" role="status">{success}</p>}

          <div className="timesheet-actions">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading
                ? "Saving..."
                : editingId
                  ? "Update Task"
                  : "Submit Task"}
            </button>

            {editingId && (
              <button
                type="button"
                className="cancel-btn"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="task-list-section">
        <div className="section-header">
          <h2>Task List</h2>
          <p>View and manage submitted tasks.</p>
        </div>

        <div className="task-toolbar">
          <input
            type="search"
            placeholder="Search tasks..."
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="task-table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => {
                  const taskId = task._id || task.id;
                  const taskProjectId = task.project?._id || task.project?.id || task.project;
                  const taskEmployeeId = task.employee?._id || task.employee?.id || task.employee;

                  return (
                    <tr key={taskId || index}>
                      <td>{task.title || "Untitled task"}</td>
                      <td>
                        {typeof task.project === "object" && task.project?.title
                          ? task.project.title
                          : projects.find((p) => (p._id || p.id) === taskProjectId)?.title ||
                          "—"}
                      </td>
                      <td>
                        {typeof task.employee === "object" && task.employee?.name
                          ? task.employee.name
                          : users.find((u) => (u._id || u.id) === taskEmployeeId)?.name || "—"}
                      </td>
                      <td>
                        <span className="task-type-badge">
                          {task.type?.replace("-", " ")}
                        </span>
                      </td>
                      <td>{task.status?.replace("-", " ")}</td>
                      <td>{task.date?.slice(0, 10)}</td>
                      <td>{task.hours}</td>
                      <td className="task-description">{task.description || "—"}</td>
                      <td>
                        <div className="task-row-actions">

                          <td>
                            <details className="row-menu">
                              <summary className="row-menu-trigger" aria-label="Open menu">
                                <span></span><span></span><span></span>
                              </summary>

                              <div className="row-menu-panel" role="menu">
                                <button type="button" className="row-menu-item" role="menuitem">
                                  <span className="row-menu-item-icon">👤</span>
                                  <span>View profile</span>
                                </button>

                                <button type="button" className="row-menu-item" role="menuitem" onClick={() => handleEdit(task)}>
                                  <span className="row-menu-item-icon">✏️</span>
                                  <span>Edit user</span>
                                </button>

                                <button type="button" className="row-menu-item" role="menuitem">
                                  <span className="row-menu-item-icon">🔑</span>
                                  <span>Reset password</span>
                                </button>

                                <button type="button" className="row-menu-item is-danger" role="menuitem" onClick={() => handleDelete(taskId)}>
                                  <span className="row-menu-item-icon">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              </div>
                            </details>
                          </td>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="empty-task-list">
                    {tasks.length === 0 ? "No tasks added yet." : "No matching tasks found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="task-summary">
          <span>Total Tasks: {totalTasks}</span>
          <span>Total Hours (this page): {pageHours.toFixed(2)}</span>

          <div className="pagination-controls">
            <label htmlFor="tasks-limit">Rows per page:</label>

            <select
              id="tasks-limit"
              value={limit}
              onChange={handleLimitChange}
            >
              {[5, 10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </button>

          </div>
        </div>
      </section>
    </main>
  );
};

export default TimesheetForm;
