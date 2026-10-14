import { useEffect, useMemo, useState } from "react";
import {
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import "../styles/Project.css";
import MembersSelect from "../components/MembersSelect";
import API from "../data/api";


const initialFormData = {
  title: "",
  description: "",
  type: "non-billable",
  status: "planned",
  clientName: "",
  manager: "",
  members: [],
  startDate: "",
  dueDate: "",
  totalHours: "",
};

const Project = () => {
  const data = useLoaderData();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();

  const users = Array.isArray(data?.users) ? data.users : [];
  const pagination = data.pagination || {};

  const currentPage = Math.max(1, Number(searchParams.get("page")) || pagination.currentPage || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || pagination.limit || 10);

  const totalProjects =
    pagination.totalProjects ??
    pagination.total ??
    (Array.isArray(data?.projects) ? data.projects.length : 0);

  const totalPage = Math.max(1, Math.ceil(totalProjects / limit));

  const getUserName = (userId) => {
    const id = typeof userId === "object" ? userId?._id : userId;
    return users.find((user) => user._id === id)?.name || "Unknown user";
  };

  const decorateProjects = (list) =>
    list.map((project) => ({
      ...project,
      managerName: getUserName(project.manager),
      memberNames: (project.members ?? []).map(getUserName),
    }));

  const [projectList, setProjectList] = useState(() =>
    decorateProjects(Array.isArray(data?.projects) ? data.projects : [])
  );

  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setProjectList(decorateProjects(Array.isArray(data?.projects) ? data.projects : []));
  }, [data]);

  const managers = users.filter((user) => ["manager", "admin"].includes(user.role));
  const employees = users.filter((user) => user.role === "employee");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleMembersChange = (e) => {
    const selectedMembers = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, members: selectedMembers }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.dueDate && formData.dueDate < formData.startDate) {
      setError("Due date cannot be before the start date.");
      return;
    }

    try {
      await axios.post(
        `${API}/api/project`,
        {
          ...formData,
          totalHours: Number(formData.totalHours),
        },
        { withCredentials: true }
      );

      setFormData(initialFormData);
      setSuccess("Project created successfully.");
      revalidator.revalidate();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project.");
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
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await axios.delete(
        `${API}/api/project/${id}`,
        { withCredentials: true }
      );

      setSuccess(response.data.message || "Project deleted successfully.");

      revalidator.revalidate();
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete project.");
      console.error("Delete Project Error:", error.response?.data || error.message);
    }
  };

  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase();

    return projectList.filter((project) => {
      const matchesSearch =
        (project.title ?? "").toLowerCase().includes(query) ||
        (project.clientName ?? "").toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projectList, search, statusFilter]);

  const pageHours = projectList.reduce((total, project) => total + Number(project.totalHours || 0), 0);

  return (
    <main className="project-container">
      <section className="project-form-section">
        <div className="project-section-header">
          {/* <span className="project-subtitle">PROJECT MANAGEMENT</span> */}
          <h1>Create Project</h1>
          <p>Add a new project and assign team members.</p>
        </div>

        <form className="project-form" onSubmit={handleSubmit}>
          <div className="project-form-group">
            <label htmlFor="title">Project Title</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Enter project title"
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
              placeholder="Describe the project..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="project-form-row">
            <div className="project-form-group">
              <label htmlFor="type">Project Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="billable">Billable</option>
                <option value="non-billable">Non-billable</option>
                <option value="internal">Internal</option>
              </select>
            </div>

            <div className="project-form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="project-form-group">
            <label htmlFor="clientName">Client Name</label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              placeholder="Enter client name"
              value={formData.clientName}
              onChange={handleChange}
            />
          </div>

          <div className="project-form-group">
            <label htmlFor="manager">Project Manager</label>
            <select
              id="manager"
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              required
            >
              <option value="">Select Manager</option>

              {managers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>

            {managers.length === 0 && (
              <small>No managers or admins available.</small>
            )}
          </div>

          <div className="project-form-group">
            <label htmlFor="members">Assign Members</label>
            {/* <select
              id="members"
              name="members"
              multiple
              size="4"
              value={formData.members}
              onChange={handleMembersChange}
            >
              {employees.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select> */}
            <MembersSelect
              options={employees}
              value={formData.members}
              onChange={(ids) => {
                setFormData((prev) => ({ ...prev, members: ids }));
                setError("");
                setSuccess("");
              }}
              placeholder="Search and select members..."
            />
            <small>
              Hold Ctrl (Windows) or Command (Mac) to select multiple members.
            </small>
          </div>

          <div className="project-form-row">
            <div className="project-form-group">
              <label htmlFor="startDate">Start Date</label>
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
              <label htmlFor="dueDate">Due Date</label>
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
            <label htmlFor="totalHours">Total Allocated Hours</label>
            <input
              id="totalHours"
              name="totalHours"
              type="number"
              min="1"
              step="0.5"
              placeholder="e.g. 500"
              value={formData.totalHours}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <p className="project-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="project-success" role="status">
              {success}
            </p>
          )}

          <button type="submit" className="project-submit-btn">
            Create Project
          </button>
        </form>
      </section>

      <section className="project-list-section">
        <div className="project-section-header project-list-header">
          <div>
            {/* <span className="project-subtitle">PROJECT DIRECTORY</span> */}
            <h2>Project List</h2>
            <p>Manage your projects and assigned team members.</p>
          </div>
        </div>

        <div className="project-toolbar">
          <input
            type="search"
            placeholder="Search by title or client..."
            aria-label="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            aria-label="Filter projects by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
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
                <th>Hours</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => {
                  const memberNames =
                    project.memberNames ??
                    (project.members ?? []).map(getUserName);

                  return (
                    <tr key={project._id || project.id}>
                      <td>
                        <div className="project-table-title">{project.title}</div>
                        <small>{project.clientName || "No client"}</small>
                      </td>

                      <td>
                        <span className="project-type-badge">{project.type}</span>
                      </td>

                      <td>
                        <span
                          className={`project-status-badge status-${project.status}`}
                        >
                          {project.status?.replace("-", " ") || "Unknown"}
                        </span>
                      </td>

                      <td>{project.managerName || getUserName(project.manager)}</td>
                      <td>
                        <div className="project-timeline">
                          <span>{project.startDate?.slice(0, 10) || "—"}</span>
                          <span>{project.dueDate?.slice(0, 10) || "No due date"}</span>
                        </div>
                      </td>

                      <td>{project.totalHours ?? 0} hrs</td>
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

                            <button type="button" className="row-menu-item is-danger" role="menuitem" onClick={() => handleDelete(project._id)}>
                              <span className="row-menu-item-icon">🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="project-empty-state">
                    <div className="project-empty-icon">📁</div>
                    <strong>
                      {projectList.length === 0
                        ? "No projects yet"
                        : "No matching projects"}
                    </strong>
                    <p>
                      {projectList.length === 0
                        ? "Create your first project using the form."
                        : "Try changing your search or status filter."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="project-summary">
          <span>Total Projects: {totalProjects}</span>
          <span>Allocated Hours (this page): {pageHours} hrs</span>

          <div className="pagination-controls">
            <label htmlFor="projects-limit">Rows per page:</label>

            <select
              id="projects-limit"
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

            <span>Page {currentPage} of {totalPage}</span>

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

export default Project;