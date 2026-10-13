
import { useState } from "react";
import "../styles/TimesheetForm.css";

const TimesheetForm = () => {
  const [formData, setFormData] = useState({
    project: "",
    taskType: "",
    date: "",
    hours: "",
    description: "",
  });

  const [tasks, setTasks] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newTask = {
      id: crypto.randomUUID(),
      ...formData,
    };

    setTasks((prev) => [newTask, ...prev]);

    setFormData({
      project: "",
      taskType: "",
      date: "",
      hours: "",
      description: "",
    });
  };

  return (
    <main className="timesheet-container">
      {/* First Part: Timesheet Form */}
      <section className="timesheet-form-section">
        <div className="section-header">
          <h1>Timesheet Form</h1>
          <p>Record your daily work activities.</p>
        </div>

        <form onSubmit={handleSubmit} className="timesheet-form">
          <div className="form-group">
            <label htmlFor="project">Project</label>
            <select
              id="project"
              name="project"
              value={formData.project}
              onChange={handleChange}
              required
            >
              <option value="">Select Project</option>
              <option value="SchoolBooks">SchoolBooks</option>
              <option value="Reviewly">Reviewly</option>
              <option value="Timesheet App">Timesheet App</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="taskType">Task Type</label>
            <select
              id="taskType"
              name="taskType"
              value={formData.taskType}
              onChange={handleChange}
              required
            >
              <option value="">Select Task Type</option>
              <option value="Development">Development</option>
              <option value="Bug Fixing">Bug Fixing</option>
              <option value="Testing">Testing</option>
              <option value="Meeting">Meeting</option>
              <option value="Research">Research</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Calendar Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="hours">Hours Spent</label>
            <input
              type="number"
              id="hours"
              name="hours"
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
              placeholder="Describe the work completed..."
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Submit Task
          </button>
        </form>
      </section>

      {/* Second Part: Task List */}
      <section className="task-list-section">
        <div className="section-header">
          <h2>Task List</h2>
          <p>View your submitted tasks.</p>
        </div>

        <div className="task-table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Task Type</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Description</th>
              </tr>
            </thead>

            <tbody>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.project}</td>
                    <td>
                      <span className="task-type-badge">
                        {task.taskType}
                      </span>
                    </td>
                    <td>{task.date}</td>
                    <td>{task.hours}</td>
                    <td className="task-description">
                      {task.description}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-task-list">
                    No tasks added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="task-summary">
          <span>Total Tasks: {tasks.length}</span>
          <span>
            Total Hours:{" "}
            {tasks
              .reduce((total, task) => total + Number(task.hours), 0)
              .toFixed(2)}
          </span>
        </div>
      </section>
    </main>
  );
};

export default TimesheetForm;
