
import { useMemo, useState } from "react";
import "../styles/User.css";
import { useLoaderData } from "react-router-dom";

const initialFormData = {
  name: "",
  email: "",
  password: "",
  role: "employee",
};

const User = () => {
  const data = useLoaderData();

  console.log(data);

  const [formData, setFormData] = useState(initialFormData);
  const [users, setUsers] = useState(data.users || []);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = (e) => {
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

    const emailExists = users.some(
      (user) => user.email.toLowerCase() === email
    );

    if (emailExists) {
      setError("A user with this email already exists.");
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      role: formData.role,
      createdAt: new Date().toLocaleDateString(),
    };

    setUsers((prev) => [newUser, ...prev]);
    setFormData(initialFormData);
    setSuccess("User created successfully.");
  };

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmed) return;

    setUsers((prev) => prev.filter((user) => user.id !== id));
    setSuccess("User removed from the list.");
    setError("");
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const adminCount = users.filter(
    (user) => user.role === "admin"
  ).length;

  const managerCount = users.filter(
    (user) => user.role === "manager"
  ).length;

  const employeeCount = users.filter(
    (user) => user.role === "employee"
  ).length;

  return (
    <main className="user-container">
      {/* Left side: User form */}
      <section className="user-form-section">
        <div className="user-section-header">
          <span className="user-subtitle">USER MANAGEMENT</span>
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
            <p className="user-message user-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="user-message user-success" role="status">
              {success}
            </p>
          )}

          <button type="submit" className="user-submit-btn">
            Create User
          </button>
        </form>
      </section>

      {/* Right side: User list */}
      <section className="user-list-section">
        <div className="user-section-header user-list-header">
          <div>
            <span className="user-subtitle">TEAM DIRECTORY</span>
            <h2>User List</h2>
            <p>View and manage users and their roles.</p>
          </div>

          <span className="user-count">
            {users.length} {users.length === 1 ? "User" : "Users"}
          </span>
        </div>

        {/* User summary */}
        <div className="user-stats">
          <div className="user-stat-card">
            <span>Total Users</span>
            <strong>{users.length}</strong>
          </div>

          <div className="user-stat-card">
            <span>Admins</span>
            <strong>{adminCount}</strong>
          </div>

          <div className="user-stat-card">
            <span>Managers</span>
            <strong>{managerCount}</strong>
          </div>

          <div className="user-stat-card">
            <span>Employees</span>
            <strong>{employeeCount}</strong>
          </div>
        </div>

        {/* Search and filter */}
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

        {/* Users table */}
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
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

                    <td>
                      <button
                        type="button"
                        className="user-delete-btn"
                        onClick={() => handleDelete(user.id)}
                        aria-label={`Delete ${user.name}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="user-empty-state">
                    <div className="user-empty-icon">👥</div>
                    <strong>
                      {users.length === 0
                        ? "No users yet"
                        : "No matching users"}
                    </strong>
                    <p>
                      {users.length === 0
                        ? "Create your first user using the form."
                        : "Try changing your search or role filter."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="user-list-footer">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </section>
    </main>
  );
};

export default User;
