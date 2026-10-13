import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import "../styles/Project.css";

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

  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const users = Array.isArray(data?.users) ? data.users : [];

  const getUserName = (userId) => {
    const id = typeof userId === "object" ? userId?._id : userId;
    return users.find((user) => user._id === id)?.name || "Unknown user";
  };

  const [projectList, setProjectList] = useState(() =>
    projects.map((project) => ({
      ...project,
      managerName: getUserName(project.manager),
      memberNames: (project.members ?? []).map(getUserName),
    }))
  );

  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const managers = users.filter((user) =>
    ["manager", "admin"].includes(user.role)
  );

  const employees = users.filter(
    (user) => user.role === "employee"
  );

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.dueDate && formData.dueDate < formData.startDate
    ) {
      setError("Due date cannot be before the start date.");
      return;
    }

    const newProject = {
      id: crypto.randomUUID(),
      ...formData,
      totalHours: Number(formData.totalHours),
      managerName: getUserName(formData.manager),
      memberNames: formData.members.map(getUserName),
    };

    setProjectList((prev) => [newProject, ...prev]);
    setFormData(initialFormData);
    setSuccess("Project added to the list successfully.");
  };

  const totalHours = projectList.reduce((total, project) => total + Number(project.totalHours || 0), 0);

  return (
    <main className="project-container">
      {/* Left side: Project form */}
      <section className="project-form-section">
        <div className="project-section-header">
          <span className="project-subtitle">
            PROJECT MANAGEMENT
          </span>
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
            <select
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
            </select>

            <small>
              Hold Ctrl (Windows) or Command (Mac) to select
              multiple members.
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
            <label htmlFor="totalHours">
              Total Allocated Hours
            </label>
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

      {/* Right side: Project list */}
      <section className="project-list-section">
        <div className="project-section-header project-list-header">
          <div>
            <h2>Project List</h2>
            <p>Manage your projects and assigned team members.</p>
          </div>

          <span className="project-count">
            {projectList.length}{" "}
            {projectList.length === 1 ? "Project" : "Projects"}
          </span>
        </div>

        <div className="project-table-wrapper">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Type</th>
                <th>Status</th>
                <th>Manager</th>
                <th>Members</th>
                <th>Timeline</th>
                <th>Hours</th>
              </tr>
            </thead>

            <tbody>
              {projectList.length > 0 ? (
                projectList.map((project) => {
                  const memberNames =
                    project.memberNames ??
                    (project.members ?? []).map(getUserName);

                  return (
                    <tr key={project._id || project.id}>
                      <td>
                        <div className="project-table-title">
                          {project.title}
                        </div>
                        <small>
                          {project.clientName || "No client"}
                        </small>
                      </td>

                      <td>
                        <span className="project-type-badge">
                          {project.type}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`project-status-badge status-${project.status}`}
                        >
                          {project.status?.replace("-", " ") || "Unknown"}
                        </span>
                      </td>

                      <td>
                        {project.managerName ||
                          getUserName(project.manager)}
                      </td>

                      <td>
                        {memberNames.length > 0
                          ? memberNames.join(", ")
                          : "No members"}
                      </td>

                      <td>
                        <div className="project-timeline">
                          <span>
                            {project.startDate?.slice(0, 10) || "—"}
                          </span>
                          <span>
                            {project.dueDate?.slice(0, 10) ||
                              "No due date"}
                          </span>
                        </div>
                      </td>

                      <td>{project.totalHours ?? 0} hrs</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="project-empty-state">
                    <div className="project-empty-icon">📁</div>
                    <strong>No projects yet</strong>
                    <p>Create your first project using the form.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="project-summary">
          <span>Total Projects: {projectList.length}</span>
          <span>Total Allocated Hours: {totalHours} hrs</span>
        </div>
      </section>
    </main>
  );
};

export default Project;