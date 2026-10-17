import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router-dom";
import MembersSelect from "../components/MembersSelect.jsx";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useListParams } from "../hooks/useListParams.js";
import {
  createProject,
  deleteProject,
  getProject,
  updateProject,
} from "../data/project.js";
import { getErrorMessage } from "../data/api.js";
import { PROJECT_STATUSES, PROJECT_TYPES } from "../utils/constants.js";
import {
  closeRowMenu,
  getId,
  labelize,
  sameId,
  toDateInput,
  todayLocal,
} from "../utils/helpers.js";
import "../styles/Project.css";

const emptyForm = (manager = "") => ({
  title: "",
  description: "",
  type: "non-billable",
  status: "planned",
  clientName: "",
  manager,
  members: [],
  startDate: todayLocal(),
  dueDate: "",
  totalHours: "",
});

const Project = () => {
  const { projects, pagination, users } = useLoaderData();
  const { user } = useAuth();
  const revalidator = useRevalidator();
  const { get, setFilter } = useListParams(["status"]);

  const myRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = myRole === "admin";
  const isManager = myRole === "manager";

  const defaultManager = isAdmin ? "" : user?.id ?? "";

  const [formData, setFormData] = useState(() => emptyForm(defaultManager));
  const [editingId, setEditingId] = useState(null);
  const [hoursUsed, setHoursUsed] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const usersById = useMemo(
    () => new Map(users.map((u) => [getId(u), u])),
    [users]
  );

  const userName = (ref) =>
    (typeof ref === "object" && ref?.name) ||
    usersById.get(getId(ref))?.name ||
    "Inactive user";

  const managerOptions = useMemo(() => {
    return users
      .filter((u) => u && u.isActive !== false)
      .filter((u) => {
        const r = String(u.role ?? "").toLowerCase();
        return r === "manager" || r === "admin";
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [users]);

  const memberOptions = useMemo(() => {
    return users.filter((u) => {
      if (!u || u.isActive === false) return false;
      return getId(u) !== formData.manager;
    });
  }, [users, formData.manager]);

  const canManage = (project) => {
    if (isAdmin) return true;
    if (!isManager) return false;
    return sameId(project.manager, user.id);
  };

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => updateField(e.target.name, e.target.value);

  const resetForm = () => {
    setFormData(emptyForm(defaultManager));
    setEditingId(null);
    setHoursUsed(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const title = formData.title.trim();
    const totalHours = Number(formData.totalHours);

    if (!title) return setError("Project title is required.");
    if (!formData.manager) return setError("Please select a project manager.");
    if (!formData.startDate) return setError("Start date is required.");
    if (formData.dueDate && formData.dueDate < formData.startDate) {
      return setError("Due date cannot be before the start date.");
    }
    if (!Number.isFinite(totalHours) || totalHours <= 0) {
      return setError("Total hours must be a positive number.");
    }
    if (editingId && totalHours < hoursUsed) {
      return setError(
        `Total hours cannot be less than the ${hoursUsed} hour(s) already logged.`
      );
    }

    const payload = {
      title,
      description: formData.description.trim(),
      type: formData.type,
      status: formData.status,
      clientName: formData.clientName.trim(),
      manager: formData.manager,
      members: formData.members,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      totalHours,
    };

    setSaving(true);
    try {
      const data = editingId
        ? await updateProject(editingId, payload)
        : await createProject(payload);

      setSuccess(
        data.message || (editingId ? "Project updated." : "Project created.")
      );
      resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save project."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (row) => {
    const id = getId(row);
    setLoadingId(id);
    setError("");
    setSuccess("");

    try {
      const { project } = await getProject(id);

      setEditingId(id);
      setHoursUsed(project.hoursUsed ?? 0);
      setFormData({
        title: project.title ?? "",
        description: project.description ?? "",
        type: project.type ?? "non-billable",
        status: project.status ?? "planned",
        clientName: project.clientName ?? "",
        manager: getId(project.manager),
        members: (project.members ?? []).map(getId),
        startDate: toDateInput(project.startDate),
        dueDate: toDateInput(project.dueDate),
        totalHours:
          project.totalHours != null ? String(project.totalHours) : "",
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load project."));
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this project? Projects with logged hours can't be deleted — close them instead."
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const data = await deleteProject(id);
      setSuccess(data.message || "Project deleted.");
      if (editingId === id) resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete project."));
    }
  };

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((p) =>
      [p.title, p.clientName].some((field) =>
        String(field ?? "").toLowerCase().includes(query)
      )
    );
  }, [projects, search]);

  const managerLocked = !isAdmin;

  return (
    <main className="project-container">
      <section className="project-form-section">
        <div className="project-section-header">
          <h1>{editingId ? "Edit project" : "New project"}</h1>
          <p>{editingId ? "Update the project details and save your changes." : "Set up a project and choose who works on it."}</p>
        </div>

        <form className="project-form" onSubmit={handleSubmit} noValidate>
          <div className="project-form-group">
            <label htmlFor="title">Project title</label>
            <input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              placeholder="e.g. Website redesign"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="project-form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              maxLength={5000}
              placeholder="What is this project about?"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="project-form-row">
            <div className="project-form-group">
              <label htmlFor="type">Project type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{labelize(t)}</option>
                ))}
              </select>
            </div>

            <div className="project-form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{labelize(s)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="project-form-group">
            <label htmlFor="clientName">Client name</label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              maxLength={200}
              placeholder="Optional"
              value={formData.clientName}
              onChange={handleChange}
            />
          </div>

          <div className="project-form-group">
            <label htmlFor="manager">Project manager</label>
            <select
              id="manager"
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              disabled={managerLocked}
              required
            >
              <option value="">Select manager</option>
              {managerOptions.map((u) => (
                <option key={getId(u)} value={getId(u)}>{u.name} ({String(u.role).toLowerCase()})</option>
              ))}
            </select>

            {managerLocked && (<small>Only an admin can assign a different manager.</small>)}
            {!managerLocked && managerOptions.length === 0 && (<small>No active managers or admins available.</small>)}
          </div>

          <div className="project-form-group">
            <label>Members</label>
            <MembersSelect
              options={memberOptions}
              value={formData.members}
              onChange={(ids) => updateField("members", ids)}
            />
            <small>Members can see this project and log hours on it.</small>
          </div>

          <div className="project-form-row">
            <div className="project-form-group">
              <label htmlFor="startDate">Start date</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="project-form-group">
              <label htmlFor="dueDate">Due date</label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                min={formData.startDate || undefined}
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="project-form-group">
            <label htmlFor="totalHours">Allocated hours</label>
            <input
              id="totalHours"
              name="totalHours"
              type="number"
              min={editingId ? Math.max(hoursUsed, 0.25) : 0.25}
              step="0.25"
              placeholder="e.g. 500"
              value={formData.totalHours}
              onChange={handleChange}
              required
            />
            {editingId && (
              <small>{hoursUsed} hour(s) already logged — the allocation can't go below that.</small>
            )}
          </div>

          {error && (<p className="project-error" role="alert">{error}</p>)}
          {success && (<p className="project-success" role="status">{success}</p>)}

          <div className="project-actions">
            <button
              type="submit"
              className="project-submit-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId ? "Save changes" : "Create project"}
            </button>

            {editingId && (
              <button
                type="button"
                className="project-cancel-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="project-list-section">
        <div className="project-section-header project-list-header">
          <div>
            <h2>Projects</h2>
            <p>{isAdmin ? "Every project in the organisation." : "Projects you manage or belong to."}</p>
          </div>
        </div>

        <div className="project-toolbar">
          <input
            type="search"
            placeholder="Search this page by title or client..."
            aria-label="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            aria-label="Filter projects by status"
            value={get("status")}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{labelize(s)}</option>
            ))}
          </select>
        </div>

        <div className="project-table-wrapper">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Type</th>
                <th>Status</th>
                <th>Manager</th>
                <th>Timeline</th>
                <th>Hours used</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                  const projectId = getId(project);
                  const total = Number(project.totalHours ?? 0);
                  const remaining = Number(project.remainingHours ?? total);
                  const used = Math.max(0, total - remaining);
                  const manageable = canManage(project);

                  return (
                    <tr
                      key={projectId}
                      className={editingId === projectId ? "is-editing" : undefined}
                    >
                      <td>
                        <div className="project-table-title">{project.title}</div>
                        <small>{project.clientName || "No client"}</small>
                      </td>

                      <td>
                        <span className="project-type-badge">{labelize(project.type)}</span>
                      </td>

                      <td>
                        <span
                          className={`project-status-badge status-${project.status}`}
                        >
                          {labelize(project.status)}
                        </span>
                      </td>

                      <td>{userName(project.manager)}</td>

                      <td>
                        <div className="project-timeline">
                          <span>{toDateInput(project.startDate) || "—"}</span>
                          <span>{toDateInput(project.dueDate) || "No due date"}</span>
                        </div>
                      </td>

                      <td>
                        <div
                          className="hours-meter"
                          title={`${remaining} hour(s) remaining`}
                        >
                          <span>
                            {used} / {total} hrs
                          </span>
                          <span className="hours-meter-track">
                            <span
                              className="hours-meter-fill"
                              style={{ width: `${total ? Math.min(100, (used / total) * 100) : 0}%` }}
                            />
                          </span>
                        </div>
                      </td>

                      <td>
                        {manageable ? (
                          <details className="row-menu">
                            <summary
                              className="row-menu-trigger"
                              aria-label="Open menu"
                            >
                              <span></span>
                              <span></span>
                              <span></span>
                            </summary>

                            <div className="row-menu-panel" role="menu">
                              <button
                                type="button"
                                className="row-menu-item"
                                role="menuitem"
                                disabled={loadingId === projectId}
                                onClick={(e) => {
                                  closeRowMenu(e);
                                  handleEdit(project);
                                }}
                              >
                                <span className="row-menu-item-icon">✏️</span>
                                <span>
                                  {loadingId === projectId ? "Loading..." : "Edit project"}
                                </span>
                              </button>

                              {isAdmin && (
                                <button
                                  type="button"
                                  className="row-menu-item is-danger"
                                  role="menuitem"
                                  onClick={(e) => {
                                    closeRowMenu(e);
                                    handleDelete(projectId);
                                  }}
                                >
                                  <span className="row-menu-item-icon">🗑️</span>
                                  <span>Delete project</span>
                                </button>
                              )}
                            </div>
                          </details>
                        ) : (
                          <span className="muted-text">Member</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="project-empty-state">
                    <div className="project-empty-icon">📁</div>
                    <strong>
                      {projects.length === 0
                        ? get("status")
                          ? "No projects with this status"
                          : "No projects yet"
                        : "No matching projects"}
                    </strong>
                    <p>
                      {projects.length === 0
                        ? "Create a project using the form."
                        : "Try a different search."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="project-summary">
          <span>Total projects: {pagination.totalProjects ?? 0}</span>
          <Pagination pagination={pagination} id="projects-limit" />
        </div>
      </section>
    </main>
  );
};

export default Project;