
import { useEffect, useMemo, useState } from "react";
import "../styles/User.css";
import { useSearchParams, useLoaderData, useRevalidator } from "react-router-dom";
import axios from "axios";
import API from "../data/api";

const initialFormData = {
  name: "",
  email: "",
  password: "",
  role: "employee",
};

const User = () => {
  const data = useLoaderData();

  const [formData, setFormData] = useState(initialFormData);
  const [users, setUsers] = useState(data.users || []);
  const pagination = data.pagination || {};
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get("page")) || pagination.currentPage || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || pagination.limit || 10);
  const totalUsers = pagination.totalUsers ?? users.length;
  const totalPage = Math.max(1, Math.ceil(totalUsers / limit));
  const revalidator = useRevalidator();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value, }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name || !email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === email)) {
      setError("A user with this email already exists.");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/api/auth/register`,
        { name, email, password: formData.password, role: formData.role },
        { withCredentials: true }
      );

      const createdUser = response.data.user;

      if (createdUser) {
        setUsers((prev) => [createdUser, ...prev]);
      }

      setFormData(initialFormData);
      setSuccess("User created successfully.");
      revalidator.revalidate();
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to create user."
      );
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPage || page === currentPage) {
      return;
    }

    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", String(page));
      params.set("limit", String(limit));
      return params;
    });
  };

  useEffect(() => {
    setUsers(data.users || []);
  }, [data]);

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);

    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("page", "1");
      params.set("limit", String(newLimit));
      return params;
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await axios.delete(
        `${API}/api/user/${id}`,
        { withCredentials: true }
      );

      setSuccess(response.data.message || "User deleted successfully.");

      revalidator.revalidate();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete user.");
      console.error("Delete User Error:", error.response?.data || error.message);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <main className="user-container">
      <section className="user-form-section">
        <div className="user-section-header">
          {/* <span className="user-subtitle">USER MANAGEMENT</span> */}
          <h1>Create User</h1>
          <p>Add a user and assign the appropriate role.</p>
        </div>

        <form className="user-form" onSubmit={handleSubmit}>
          <div className="user-form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <div className="user-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="user-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <small>Password must be at least 8 characters.</small>
          </div>

          <div className="user-form-group">
            <label htmlFor="role">User Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <p className="user-message user-error" role="alert">{error}</p>
          )}

          {success && (
            <p className="user-message user-success" role="status">{success}</p>
          )}

          <button type="submit" className="user-submit-btn">Create User</button>
        </form>
      </section>

      <section className="user-list-section">
        <div className="user-section-header user-list-header">
          <div>
            {/* <span className="user-subtitle">TEAM DIRECTORY</span> */}
            <h2>User List</h2>
            <p>View and manage users and their roles.</p>
          </div>
        </div>

        <div className="user-toolbar">
          <input
            type="search"
            placeholder="Search by name or email..."
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            aria-label="Filter users by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {
                filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-profile">
                          <div className="user-avatar">
                            {user.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="user-profile-details">
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`user-role-badge role-${user.role}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td>{user.createdAt}</td>
                      {/* 
                      <td>
                        <button
                          type="button"
                          className="user-delete-btn"
                          onClick={() => handleDelete(user.id)}
                          aria-label={`Delete ${user.name}`}
                        >
                          Delete
                        </button>

                      </td> */}
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

                            <button type="button" className="row-menu-item" role="menuitem">
                              <span className="row-menu-item-icon">✏️</span>
                              <span>Edit user</span>
                            </button>

                            <button type="button" className="row-menu-item" role="menuitem">
                              <span className="row-menu-item-icon">🔑</span>
                              <span>Reset password</span>
                            </button>

                            <button type="button" className="row-menu-item is-danger" role="menuitem" onClick={() => handleDelete(user._id)}
                              aria-label={`Delete ${user.name}`}>
                              <span className="row-menu-item-icon">🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="user-empty-state">
                      <div className="user-empty-icon">👥</div>
                      <strong>
                        {users.length === 0 ? "No users yet" : "No matching users"}
                      </strong>
                      <p>
                        {users.length === 0
                          ? "Create your first user using the form."
                          : "Try changing your search or role filter."}
                      </p>
                    </td>
                  </tr>
                )
              }
            </tbody>
          </table>
        </div>

        <div className="user-list-footer">
          <span>{totalUsers} total users</span>

          <div className="pagination-controls">
            <label htmlFor="users-limit">Rows per page:</label>

            <select
              id="users-limit"
              value={limit}
              onChange={handleLimitChange}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPage}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPage}
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

export default User;
