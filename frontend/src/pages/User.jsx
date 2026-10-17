import { useEffect, useMemo, useState } from "react";
import { useLoaderData, useRevalidator } from "react-router-dom";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useListParams } from "../hooks/useListParams.js";
import { createUser, deactivateUser, updateUser } from "../data/user.js";
import { getErrorMessage } from "../data/api.js";
import { USER_ROLES } from "../utils/constants.js";
import { closeRowMenu, EMAIL_REGEX, getId, toDateInput, validatePassword } from "../utils/helpers.js";
import "../styles/User.css";

const initialFormData = { name: "", email: "", password: "", role: "employee", managerId: "" };

const User = () => {
  const { users, pagination, activeUsers } = useLoaderData();
  const { user: currentUser } = useAuth();
  const revalidator = useRevalidator();
  const { get, setFilter } = useListParams(["role", "active", "search"]);

  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const urlSearch = get("search");
  const [searchInput, setSearchInput] = useState(urlSearch);

  useEffect(() => {
    const value = searchInput.trim();
    if (value === urlSearch) return undefined;
    const timer = setTimeout(() => setFilter("search", value), 400);
    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, setFilter]);

  const isEditingSelf = editingId !== null && editingId === currentUser?.id;

  const usersById = useMemo(() => new Map(activeUsers.map((u) => [getId(u), u])), [activeUsers]);

  const managerOptions = useMemo(
    () => activeUsers.filter((u) => ["manager", "admin"].includes(u.role) && getId(u) !== editingId),
    [activeUsers, editingId]
  );

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

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name) return setError("Name is required.");

    if (!editingId) {
      if (!EMAIL_REGEX.test(email)) return setError("Please enter a valid email address.");
      const passwordError = validatePassword(formData.password);
      if (passwordError) return setError(passwordError);
    }

    const payload = editingId
      ?
      { name, role: formData.role, managerId: formData.managerId || null }
      : { name, email, password: formData.password, role: formData.role, managerId: formData.managerId || null };

    setSaving(true);
    try {
      const data = editingId ? await updateUser(editingId, payload) : await createUser(payload);

      setSuccess(data.message || (editingId ? "User updated." : "User created."));
      resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save user."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(getId(row));
    setFormData({
      name: row.name ?? "",
      email: row.email ?? "",
      password: "",
      role: row.role ?? "employee",
      managerId: getId(row.managerId),
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeactivate = async (row) => {
    if (!window.confirm(`Deactivate ${row.name}? They won't be able to log in until reactivated.`)) return;
    setError("");
    setSuccess("");

    try {
      const data = await deactivateUser(getId(row));
      setSuccess(data.message || "User deactivated.");
      if (editingId === getId(row)) resetForm();
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to deactivate user."));
    }
  };

  const handleReactivate = async (row) => {
    setError("");
    setSuccess("");
    try {
      await updateUser(getId(row), { isActive: true });
      setSuccess(`${row.name} has been reactivated.`);
      revalidator.revalidate();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reactivate user."));
    }
  };

  return (
    <main className="user-container">
      <section className="user-form-section">
        <div className="user-section-header">
          <h1>{editingId ? "Edit user" : "Add user"}</h1>
          <p>{editingId ? "Change this person's name, role or manager." : "Create an account and choose its role."}</p>
        </div>

        <form className="user-form" onSubmit={handleSubmit} noValidate>
          <div className="user-form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" maxLength={100} placeholder="Enter full name" value={formData.name} onChange={handleChange} autoComplete="off" required />
          </div>

          <div className="user-form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
              disabled={Boolean(editingId)}
              required
            />
            {editingId && <small>Email can't be changed after the account is created.</small>}
          </div>

          {!editingId && (
            <div className="user-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Set an initial password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                maxLength={72}
                required
              />
              <small>8–72 characters, with at least one letter and one number. The user can change it from their Account page.</small>
            </div>
          )}

          <div className="user-form-group">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" value={formData.role} onChange={handleChange} disabled={isEditingSelf}>
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
              ))}
            </select>
            {isEditingSelf && <small>You can't change your own role.</small>}
          </div>

          <div className="user-form-group">
            <label htmlFor="managerId">Reports to</label>
            <select id="managerId" name="managerId" value={formData.managerId} onChange={handleChange}>
              <option value="">No manager</option>
              {managerOptions.map((u) => (
                <option key={getId(u)} value={getId(u)}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          {error && <p className="user-message user-error" role="alert">{error}</p>}
          {success && <p className="user-message user-success" role="status">{success}</p>}

          <div className="user-actions">
            <button type="submit" className="user-submit-btn" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create user"}
            </button>
            {editingId && (
              <button type="button" className="user-cancel-btn" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="user-list-section">
        <div className="user-section-header user-list-header">
          <div>
            <h2>Users</h2>
            <p>Everyone with an account, including deactivated users.</p>
          </div>
        </div>

        <div className="user-toolbar">
          <input
            type="search"
            placeholder="Search by name or email..."
            aria-label="Search users"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select aria-label="Filter users by role" value={get("role")} onChange={(e) => setFilter("role", e.target.value)}>
            <option value="">All roles</option>
            {USER_ROLES.map((role) => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
          </select>
          <select aria-label="Filter users by status" value={get("active")} onChange={(e) => setFilter("active", e.target.value)}>
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </div>

        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Reports to</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((row) => {
                  const userId = getId(row);
                  const isSelf = userId === currentUser?.id;

                  return (
                    <tr key={userId} className={editingId === userId ? "is-editing" : undefined}>
                      <td>
                        <div className="user-profile">
                          <div className="user-avatar">{row.name?.charAt(0).toUpperCase()}</div>
                          <div className="user-profile-details">
                            <strong>{row.name}{isSelf && " (you)"}</strong>
                            <span>{row.email}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className={`user-role-badge role-${row.role}`}>{row.role}</span></td>
                      <td>{row.managerId ? usersById.get(getId(row.managerId))?.name ?? "Inactive user" : "—"}</td>
                      <td>
                        <span className={`status-pill ${row.isActive ? "is-active" : "is-inactive"}`}>
                          {row.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td>{toDateInput(row.createdAt) || "—"}</td>
                      <td>
                        <details className="row-menu">
                          <summary className="row-menu-trigger" aria-label="Open menu">
                            <span></span><span></span><span></span>
                          </summary>
                          <div className="row-menu-panel" role="menu">
                            <button type="button" className="row-menu-item" role="menuitem" onClick={(e) => { closeRowMenu(e); handleEdit(row); }}>
                              <span className="row-menu-item-icon">✏️</span>
                              <span>Edit user</span>
                            </button>

                            {row.isActive ? (
                              !isSelf && (
                                <button type="button" className="row-menu-item is-danger" role="menuitem" onClick={(e) => { closeRowMenu(e); handleDeactivate(row); }}>
                                  <span className="row-menu-item-icon">⛔</span>
                                  <span>Deactivate</span>
                                </button>
                              )
                            ) : (
                              <button type="button" className="row-menu-item" role="menuitem" onClick={(e) => { closeRowMenu(e); handleReactivate(row); }}>
                                <span className="row-menu-item-icon">✅</span>
                                <span>Reactivate</span>
                              </button>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="user-empty-state">
                    <div className="user-empty-icon">👥</div>
                    <strong>No matching users</strong>
                    <p>Try a different search or filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="user-list-footer">
          <span>{pagination.totalUsers ?? 0} users</span>
          <Pagination pagination={pagination} id="users-limit" />
        </div>
      </section>
    </main>
  );
};

export default User;