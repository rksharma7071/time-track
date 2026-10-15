import { useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect.jsx";
import ProjectsSelect from "../components/ProjectsSelect.jsx";
import { createPermission, deletePermission, updatePermission } from "../data/permission.js";
import { getErrorMessage } from "../data/api.js";
import { closeRowMenu, getId, labelize } from "../utils/helpers.js";
import "../styles/TimesheetForm.css";

const initialFormData = { user: "", projects: [] };

/**
 * A permission grants a user extra project access on top of being the
 * project's manager or a member. One record per user (backend enforces).
 */
const Permission = () => {
  const { permissions, projects, users } = useLoaderData();
  const revalidator = useRevalidator();

  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);

  // Admins already see every project, so only managers/employees need grants.
  const userOptions = useMemo(() => users.filter((u) => u.role !== "admin"), [users]);

  const permissionByUser = useMemo(
    () => new Map(permissions.map((p) => [getId(p.user), p])),
    [permissions]
  );

  const clearMessages = () => {
    setError("");
    setSuccess("");
    setInfo("");
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const startEdit = (permission) => {
    setEditingId(getId(permission));
    setFormData({
      user: getId(permission.user),
      projects: (permission.projects ?? []).map(getId),
    });
  };

  const handleUserChange = (userId) => {
    clearMessages();
    const existing = userId ? permissionByUser.get(userId) : null;

    // Backend returns 409 if a record already exists, so switch to editing it.
    if (existing) {
      startEdit(existing);
      setInfo("This user already has a permission record — you're now editing it.");
      return;
    }

    setEditingId(null);
    setFormData((prev) => ({ ...prev, user: userId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!formData.user) return setError("Please select a user.");

    setSaving(true);
    try {
      const data = editingId
        ? await updatePermission(editingId, formData.projects)
        : await createPermission({ user: formData.user, projects: formData.projects });

      setSuccess(data.message || (editingId ? "Permission updated." : "Permission created."));
      resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save permission."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (permission) => {
    clearMessages();
    startEdit(permission);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this user's extra project access?")) return;
    clearMessages();

    try {
      const data = await deletePermission(id);
      setSuccess(data.message || "Permission deleted.");
      if (editingId === id) resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete permission."));
    }
  };

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissions;

    return permissions.filter((permission) => {
      const projectNames = (permission.projects ?? []).map((p) => p?.title ?? "").join(" ");
      return [permission.user?.name, permission.user?.email, projectNames]
        .some((field) => String(field ?? "").toLowerCase().includes(query));
    });
  }, [permissions, search]);

  return (
    <main className="timesheet-container">
      <section className="timesheet-form-section">
        <div className="section-header">
          <h1>{editingId ? "Edit project access" : "Grant project access"}</h1>
          <p>Give someone access to projects they don't manage and aren't a member of.</p>
        </div>

        <form onSubmit={handleSubmit} className="timesheet-form">
          <div className="form-group">
            <label>User</label>
            <SearchableSelect
              options={userOptions}
              value={formData.user}
              onChange={handleUserChange}
              labelKey="name"
              valueKey="id"
              secondaryKey="email"
              placeholder="Select user"
              searchPlaceholder="Search users..."
              disabled={Boolean(editingId)}
              clearable={!editingId}
            />
            {editingId && <small className="form-hint">To change the user, cancel and start a new grant.</small>}
          </div>

          <div className="form-group permission-projects">
            <div className="permission-project-header">
              <div>
                <label className="permission-project-title">Projects</label>
                <p className="permission-project-subtitle">Choose the projects this user can view and log hours on.</p>
              </div>
              <span className="permission-selected-count">{formData.projects.length} selected</span>
            </div>

            <ProjectsSelect
              options={projects}
              value={formData.projects}
              onChange={(ids) => {
                clearMessages();
                setFormData((prev) => ({ ...prev, projects: ids }));
              }}
            />
          </div>

          {info && <p className="timesheet-info" role="status">{info}</p>}
          {error && <p className="timesheet-error" role="alert">{error}</p>}
          {success && <p className="timesheet-success" role="status">{success}</p>}

          <div className="timesheet-actions">
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save access" : "Grant access"}
            </button>
            {(editingId || formData.user) && (
              <button type="button" className="cancel-btn" onClick={() => { resetForm(); clearMessages(); }} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="task-list-section">
        <div className="section-header">
          <h2>Access grants</h2>
          <p>Extra project access by user.</p>
        </div>

        <div className="task-toolbar">
          <input
            type="search"
            placeholder="Search users or projects..."
            aria-label="Search permissions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="task-table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Projects</th>
                <th>Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPermissions.length > 0 ? (
                filteredPermissions.map((permission) => {
                  const id = getId(permission);
                  const projectList = permission.projects ?? [];

                  return (
                    <tr key={id} className={editingId === id ? "is-editing" : undefined}>
                      <td>
                        <div>{permission.user?.name ?? "Deleted user"}</div>
                        <small className="muted-text">{permission.user?.email ?? ""}</small>
                      </td>
                      <td className="text-capitalize">{permission.user?.role ?? "—"}</td>
                      <td>
                        {projectList.length ? (
                          <div className="chip-list">
                            {projectList.map((p) => (
                              <span key={getId(p)} className="chip" title={labelize(p?.status)}>
                                {p?.title ?? "Unknown project"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="muted-text">No projects</span>
                        )}
                      </td>
                      <td>{projectList.length}</td>
                      <td>
                        <details className="row-menu">
                          <summary className="row-menu-trigger" aria-label="Open menu">
                            <span></span><span></span><span></span>
                          </summary>
                          <div className="row-menu-panel" role="menu">
                            <button type="button" className="row-menu-item" role="menuitem" onClick={(e) => { closeRowMenu(e); handleEdit(permission); }}>
                              <span className="row-menu-item-icon">✏️</span>
                              <span>Edit access</span>
                            </button>
                            <button type="button" className="row-menu-item is-danger" role="menuitem" onClick={(e) => { closeRowMenu(e); handleDelete(id); }}>
                              <span className="row-menu-item-icon">🗑️</span>
                              <span>Remove access</span>
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="empty-task-list">
                    {permissions.length === 0 ? "No access grants yet." : "No grants match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default Permission;
