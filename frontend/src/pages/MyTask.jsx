import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect.jsx";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useListParams } from "../hooks/useListParams.js";
import { createTask, deleteTask, TASK_FILTER_KEYS, updateTask, updateTaskApproval } from "../data/task.js";
import { getErrorMessage } from "../data/api.js";
import { CLOSED_PROJECT_STATUSES, TASK_APPROVAL_STATUSES, TASK_STATUSES, TASK_TYPES } from "../utils/constants.js";
import { closeRowMenu, getId, isValidHours, labelize, sameId, toDateInput, todayLocal } from "../utils/helpers.js";
import "../styles/TimesheetForm.css";

const emptyForm = () => ({
  project: "",
  employee: "",
  type: "development",
  status: "planned",
  date: todayLocal(),
  hours: "",
  description: "",
});

const MyTask = () => {
  const { tasks, summary, pagination, projects, users } = useLoaderData();
  const { user } = useAuth();
  const revalidator = useRevalidator();
  const { get, setFilter, clearFilters, hasFilters } = useListParams(TASK_FILTER_KEYS);

  const isAdmin = user?.role === "admin";
  const isPrivileged = isAdmin || user?.role === "manager";

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const projectsById = useMemo(() => new Map(projects.map((p) => [getId(p), p])), [projects]);
  const selectedProject = projectsById.get(formData.project);

  const projectOptions = useMemo(
    () => projects.filter((p) => !CLOSED_PROJECT_STATUSES.includes(p.status) || getId(p) === formData.project),
    [projects, formData.project]
  );

  const canAssignEmployee =
    isPrivileged && (isAdmin || (selectedProject && sameId(selectedProject.manager, user?.id)));

  const employeeOptions = useMemo(
    () => users.filter((u) => u.isActive !== false && getId(u) !== user?.id),
    [users, user]
  );

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => updateField(e.target.name, e.target.value);

  const resetForm = () => {
    setFormData(emptyForm());
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const hours = Number(formData.hours);

    if (!formData.project) return setError("Please select a project.");
    if (!formData.date) return setError("Please select a date.");
    if (formData.date > todayLocal()) return setError("Hours cannot be logged for future dates.");
    if (!isValidHours(hours)) return setError("Hours must be between 0.25 and 24 in increments of 0.25.");

    const payload = {
      project: formData.project,
      type: formData.type,
      status: formData.status,
      date: formData.date,
      hours,
      description: formData.description.trim(),
    };

    if (canAssignEmployee && formData.employee) payload.employee = formData.employee;

    setSaving(true);
    try {
      const data = editingId ? await updateTask(editingId, payload) : await createTask(payload);
      setSuccess(data.message || (editingId ? "Task updated." : "Task saved."));
      resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save task."));
    } finally {
      setSaving(false);
    }
  };

  const canApprove = () => Boolean(isPrivileged);

  const handleApproval = async (id, approvalStatus) => {
    setError("");
    setSuccess("");
    setApprovingId(id);
    try {
      const data = await updateTaskApproval(id, approvalStatus);
      setSuccess(data.message || `Task ${approvalStatus}.`);
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to update task approval to ${approvalStatus}.`));
    } finally {
      setApprovingId(null);
    }
  };

  const handleEdit = (task) => {
    if (task.approvalStatus === "approved" && !isPrivileged) {
      setError("Approved time entries cannot be edited. Please contact your manager or admin.");
      return;
    }

    const employeeId = getId(task.employee);

    setEditingId(getId(task));
    setFormData({
      project: getId(task.project),
      employee: employeeId === user?.id ? "" : employeeId,
      type: task.type ?? "development",
      status: task.status ?? "planned",
      date: toDateInput(task.date),
      hours: String(task.hours ?? ""),
      description: task.description ?? "",
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, task) => {
    if (task?.approvalStatus === "approved" && !isPrivileged) {
      setError("Approved time entries cannot be deleted. Please contact your manager or admin.");
      return;
    }

    if (!window.confirm("Delete this time entry? This can't be undone.")) return;
    setError("");
    setSuccess("");

    try {
      const data = await deleteTask(id);
      setSuccess(data.message || "Task deleted.");
      if (editingId === id) resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete task."));
    }
  };

  const projectTitle = (task) =>
    (typeof task.project === "object" && task.project?.title) ||
    projectsById.get(getId(task.project))?.title ||
    "—";

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;

    return tasks.filter((task) =>
      [
        task.description,
        projectTitle(task),
        task.employee?.name,
        task.type,
        task.status,
        task.approvalStatus,
        task.approvedBy?.name,
      ].some((field) => String(field ?? "").toLowerCase().includes(query))
    );
  }, [tasks, search, projectsById]);

  return (
    <main className="timesheet-container">
      <section className="timesheet-form-section">
        <div className="section-header">
          <h1>{editingId ? "Edit time entry" : "Log time"}</h1>
          <p>Record the hours you spent on a project.</p>
        </div>

        <form onSubmit={handleSubmit} className="timesheet-form" noValidate>
          <div className="form-group">
            <label>Project</label>
            <SearchableSelect
              options={projectOptions}
              value={formData.project}
              onChange={(id) => {
                updateField("project", id);
                if (!id) updateField("employee", "");
              }}
              labelKey="title"
              valueKey="_id"
              secondaryKey="clientName"
              placeholder={projectOptions.length ? "Select project" : "No open projects assigned to you"}
              searchPlaceholder="Search projects..."
            />
          </div>

          {isPrivileged && (
            <div className="form-group">
              <label>Employee</label>
              <SearchableSelect
                options={employeeOptions}
                value={formData.employee}
                onChange={(id) => updateField("employee", id)}
                labelKey="name"
                valueKey="id"
                secondaryKey="email"
                placeholder="Myself"
                searchPlaceholder="Search employees..."
                disabled={!canAssignEmployee}
              />
              <small className="form-hint">
                {canAssignEmployee
                  ? "Leave empty to log for yourself. The employee must be assigned to this project."
                  : "You can log for others only on projects you manage."}
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="type">Task type</label>
            <select id="type" name="type" value={formData.type} onChange={handleChange}>
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>{labelize(type)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange}>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>{labelize(status)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              max={todayLocal()}
              min={selectedProject?.startDate ? toDateInput(selectedProject.startDate) : undefined}
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="hours">Hours spent</label>
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
            {selectedProject && (
              <small className="form-hint">
                {selectedProject.remainingHours ?? selectedProject.totalHours} of {selectedProject.totalHours} allocated hours left on this project.
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              maxLength={2000}
              placeholder="What did you work on?"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {error && <p className="timesheet-error" role="alert">{error}</p>}
          {success && <p className="timesheet-success" role="status">{success}</p>}

          <div className="timesheet-actions">
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Log time"}
            </button>
            {editingId && (
              <button type="button" className="cancel-btn" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="task-list-section">
        <div className="section-header">
          <h2>{isPrivileged ? "Time entries" : "My time entries"}</h2>
          <p>
            {isAdmin
              ? "All entries across every project."
              : isPrivileged
                ? "Your entries plus entries on projects you manage."
                : "Entries you have logged."}
          </p>
        </div>

        <div className="list-filters">
          <select aria-label="Filter by project" value={get("project")} onChange={(e) => setFilter("project", e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={getId(p)} value={getId(p)}>{p.title}</option>
            ))}
          </select>

          {isPrivileged && (
            <select aria-label="Filter by employee" value={get("employee")} onChange={(e) => setFilter("employee", e.target.value)}>
              <option value="">All employees</option>
              <option value={user?.id}>Me</option>
              {employeeOptions.map((u) => (
                <option key={getId(u)} value={getId(u)}>{u.name}</option>
              ))}
            </select>
          )}

          <select aria-label="Filter by status" value={get("status")} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
          </select>

          <select aria-label="Filter by approval status" value={get("approvalStatus")} onChange={(e) => setFilter("approvalStatus", e.target.value)}>
            <option value="">All approvals</option>
            {TASK_APPROVAL_STATUSES.map((a) => <option key={a} value={a}>{labelize(a)}</option>)}
          </select>

          <select aria-label="Filter by type" value={get("type")} onChange={(e) => setFilter("type", e.target.value)}>
            <option value="">All types</option>
            {TASK_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
          </select>

          <label className="list-filter-date">
            <span>From</span>
            <input type="date" value={get("from")} max={get("to") || undefined} onChange={(e) => setFilter("from", e.target.value)} />
          </label>

          <label className="list-filter-date">
            <span>To</span>
            <input type="date" value={get("to")} min={get("from") || undefined} onChange={(e) => setFilter("to", e.target.value)} />
          </label>

          {hasFilters && (
            <button type="button" className="list-filters-clear" onClick={clearFilters}>Clear filters</button>
          )}
        </div>

        <div className="task-toolbar">
          <input
            type="search"
            placeholder="Search this page..."
            aria-label="Search tasks on this page"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="task-table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const taskId = getId(task);
                  const isApproved = task.approvalStatus === "approved";
                  const isRejected = task.approvalStatus === "rejected";
                  const approvalState = task.approvalStatus || "pending";
                  const userCanApprove = canApprove(task);

                  return (
                    <tr key={taskId} className={editingId === taskId ? "is-editing" : undefined}>
                      <td>{projectTitle(task)}</td>
                      <td>{task.employee?.name ?? "—"}</td>
                      <td><span className="task-type-badge">{labelize(task.type)}</span></td>
                      <td><span className={`task-status-badge status-${task.status}`}>{labelize(task.status)}</span></td>
                      <td>
                        <div className="approval-cell">
                          <span className={`approval-badge approval-${approvalState}`}>
                            {isApproved && "✓ "}
                            {isRejected && "✕ "}
                            {!isApproved && !isRejected && "🕒 "}
                            {labelize(approvalState)}
                          </span>
                          {task.approvedBy?.name && (
                            <span className="approval-meta" title={task.approvedAt ? `On ${new Date(task.approvedAt).toLocaleDateString()}` : undefined}>
                              by {task.approvedBy.name}
                            </span>
                          )}
                          {userCanApprove && (
                            <div className="approval-quick-actions">
                              {!isApproved && (
                                <button
                                  type="button"
                                  className="approval-btn approve-btn"
                                  title="Approve task"
                                  disabled={approvingId === taskId}
                                  onClick={() => handleApproval(taskId, "approved")}
                                >
                                  {approvingId === taskId ? "..." : "Approve"}
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  type="button"
                                  className="approval-btn reject-btn"
                                  title="Reject task"
                                  disabled={approvingId === taskId}
                                  onClick={() => handleApproval(taskId, "rejected")}
                                >
                                  {approvingId === taskId ? "..." : "Reject"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{toDateInput(task.date)}</td>
                      <td>{task.hours}</td>
                      <td className="task-description">{task.description || "—"}</td>
                      <td>
                        <details className="row-menu">
                          <summary className="row-menu-trigger" aria-label="Open menu">
                            <span></span><span></span><span></span>
                          </summary>
                          <div className="row-menu-panel" role="menu">
                            {userCanApprove && (
                              <>
                                {!isApproved && (
                                  <button
                                    type="button"
                                    className="row-menu-item is-success"
                                    role="menuitem"
                                    disabled={approvingId === taskId}
                                    onClick={(e) => { closeRowMenu(e); handleApproval(taskId, "approved"); }}
                                  >
                                    <span className="row-menu-item-icon">✅</span>
                                    <span>Approve task</span>
                                  </button>
                                )}
                                {!isRejected && (
                                  <button
                                    type="button"
                                    className="row-menu-item is-warning"
                                    role="menuitem"
                                    disabled={approvingId === taskId}
                                    onClick={(e) => { closeRowMenu(e); handleApproval(taskId, "rejected"); }}
                                  >
                                    <span className="row-menu-item-icon">❌</span>
                                    <span>Reject task</span>
                                  </button>
                                )}
                                {approvalState !== "pending" && (
                                  <button
                                    type="button"
                                    className="row-menu-item"
                                    role="menuitem"
                                    disabled={approvingId === taskId}
                                    onClick={(e) => { closeRowMenu(e); handleApproval(taskId, "pending"); }}
                                  >
                                    <span className="row-menu-item-icon">🔄</span>
                                    <span>Reset to pending</span>
                                  </button>
                                )}
                              </>
                            )}
                            {(!isApproved || isPrivileged) ? (
                              <button
                                type="button"
                                className="row-menu-item"
                                role="menuitem"
                                onClick={(e) => { closeRowMenu(e); handleEdit(task); }}
                              >
                                <span className="row-menu-item-icon">✏️</span>
                                <span>Edit entry</span>
                              </button>
                            ) : null}
                            {(!isApproved || isPrivileged) ? (
                              <button
                                type="button"
                                className="row-menu-item is-danger"
                                role="menuitem"
                                onClick={(e) => { closeRowMenu(e); handleDelete(taskId, task); }}
                              >
                                <span className="row-menu-item-icon">🗑️</span>
                                <span>Delete entry</span>
                              </button>
                            ) : null}
                            {isApproved && !isPrivileged && (
                              <div className="row-menu-item is-disabled" style={{ opacity: 0.6, cursor: "not-allowed", padding: "8px 12px", fontSize: "12px", color: "var(--color-muted)" }}>
                                🔒 Locked (Approved)
                              </div>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="empty-task-list">
                    {tasks.length === 0
                      ? hasFilters ? "No entries match these filters." : "No time logged yet. Use the form to log your first entry."
                      : "No entries on this page match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="task-summary">
          <span>Entries: {pagination.totalTasks ?? 0}</span>
          <span>Total hours{hasFilters ? " (filtered)" : ""}: {Number(summary?.totalHours ?? 0).toFixed(2)}</span>
          <Pagination pagination={pagination} id="tasks-limit" />
        </div>
      </section>
    </main>
  );
};

export default MyTask;
