import { useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router-dom";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useListParams } from "../hooks/useListParams.js";
import { TASK_FILTER_KEYS } from "../data/task.js";
import {
  TASK_APPROVAL_STATUSES,
  TASK_STATUSES,
  TASK_TYPES,
} from "../utils/constants.js";
import { getId, labelize, toDateInput } from "../utils/helpers.js";
import "../styles/Report.css";

/* ------------------------------------------------------------------
 * Week helpers
 * ------------------------------------------------------------------ */

// Formats a Date as YYYY-MM-DD in local time.
const toInput = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Returns Monday of the week containing `date` (week starts Monday).
const getMonday = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

// Returns the Friday of the current week.
const getFriday = (date = new Date()) => {
  const monday = getMonday(date);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  return friday;
};

// True if the given YYYY-MM-DD string falls on a weekend.
const isWeekend = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(String(dateStr).slice(0, 10));
  const day = d.getUTCDay();
  return day === 0 || day === 6;
};

// Human-readable range, e.g. "13 Oct – 17 Oct"
const formatRange = (from, to) => {
  if (!from || !to) return "";
  const opts = { day: "2-digit", month: "short" };
  return `${new Date(from).toLocaleDateString(undefined, opts)} – ${new Date(
    to
  ).toLocaleDateString(undefined, opts)}`;
};

const Report = () => {
  const { tasks, summary, pagination, projects, users } = useLoaderData();
  const { user } = useAuth();
  const { get, setFilter, clearFilters, hasFilters } = useListParams(
    TASK_FILTER_KEYS
  );

  const [search, setSearch] = useState("");

  /* --------------------------------------------------------------
   * Current week's Mon–Fri, computed once per mount
   * -------------------------------------------------------------- */
  const weekStart = useMemo(() => toInput(getMonday()), []);
  const weekEnd = useMemo(() => toInput(getFriday()), []);

  const initializedRef = useRef(false);

  // On first mount, if no date filters are set, default to this week.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const from = get("from");
    const to = get("to");

    if (!from) setFilter("from", weekStart);
    if (!to) setFilter("to", weekEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyThisWeek = () => {
    setFilter("from", weekStart);
    setFilter("to", weekEnd);
  };

  const myRole = String(user?.role ?? "").toLowerCase();
  const isPrivileged = myRole === "admin" || myRole === "manager";

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [getId(p), p])),
    [projects]
  );

  const projectTitle = (task) =>
    (typeof task.project === "object" && task.project?.title) ||
    projectsById.get(getId(task.project))?.title ||
    "—";

  /* --------------------------------------------------------------
   * Filter — search + drop weekends
   * -------------------------------------------------------------- */
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      // Weekends never appear, regardless of the active range.
      if (isWeekend(task.date)) return false;

      if (!query) return true;

      return [
        task.description,
        projectTitle(task),
        task.employee?.name,
        task.type,
        task.status,
        task.approvalStatus,
      ].some((field) => String(field ?? "").toLowerCase().includes(query));
    });
  }, [tasks, search, projectsById]);

  const totalHours = useMemo(
    () => filteredTasks.reduce((sum, t) => sum + Number(t.hours || 0), 0),
    [filteredTasks]
  );

  const activeFrom = get("from");
  const activeTo = get("to");
  const rangeLabel = formatRange(activeFrom, activeTo);

  return (
    <main className="report-container">
      {/* -------------------- Page header -------------------- */}
      <section className="report-header">
        <div>
          <h1>Timesheet report</h1>
          <p>
            {myRole === "admin"
              ? "Time entries across every project."
              : isPrivileged
                ? "Your entries plus entries on projects you manage."
                : "Your logged time."}
            {rangeLabel ? (
              <>
                {" "}
                Showing <strong>{rangeLabel}</strong> (Mon–Fri only).
              </>
            ) : null}
          </p>
        </div>

        <div className="report-kpis">
          <div className="report-kpi">
            <span className="report-kpi-label">Entries</span>
            <span className="report-kpi-value">{filteredTasks.length}</span>
            <span className="report-kpi-sub">on this page</span>
          </div>

          <div className="report-kpi">
            <span className="report-kpi-label">Hours (page)</span>
            <span className="report-kpi-value">
              {totalHours.toFixed(2)}h
            </span>
            <span className="report-kpi-sub">from this page</span>
          </div>

          <div className="report-kpi">
            <span className="report-kpi-label">Total entries</span>
            <span className="report-kpi-value">
              {pagination.totalTasks ?? 0}
            </span>
            <span className="report-kpi-sub">all filtered rows</span>
          </div>
        </div>
      </section>

      {/* -------------------- Filters -------------------- */}
      <section className="report-filters-wrap">
        <div className="list-filters">
          <select
            aria-label="Filter by project"
            value={get("project")}
            onChange={(e) => setFilter("project", e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={getId(p)} value={getId(p)}>
                {p.title}
              </option>
            ))}
          </select>

          {isPrivileged && (
            <select
              aria-label="Filter by employee"
              value={get("employee")}
              onChange={(e) => setFilter("employee", e.target.value)}
            >
              <option value="">All employees</option>
              <option value={user?.id}>Me</option>
              {users
                .filter((u) => getId(u) !== user?.id)
                .map((u) => (
                  <option key={getId(u)} value={getId(u)}>
                    {u.name}
                  </option>
                ))}
            </select>
          )}

          <select
            aria-label="Filter by status"
            value={get("status")}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by approval status"
            value={get("approvalStatus")}
            onChange={(e) => setFilter("approvalStatus", e.target.value)}
          >
            <option value="">All approvals</option>
            {TASK_APPROVAL_STATUSES.map((a) => (
              <option key={a} value={a}>
                {labelize(a)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by type"
            value={get("type")}
            onChange={(e) => setFilter("type", e.target.value)}
          >
            <option value="">All types</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </select>

          <label className="list-filter-date">
            <span>From</span>
            <input
              type="date"
              value={get("from")}
              max={get("to") || undefined}
              onChange={(e) => setFilter("from", e.target.value)}
            />
          </label>

          <label className="list-filter-date">
            <span>To</span>
            <input
              type="date"
              value={get("to")}
              min={get("from") || undefined}
              onChange={(e) => setFilter("to", e.target.value)}
            />
          </label>

          <button
            type="button"
            className="list-filters-clear list-filters-thisweek"
            onClick={applyThisWeek}
            title="Show this week (Monday to Friday)"
          >
            This week
          </button>

          {hasFilters && (
            <button
              type="button"
              className="list-filters-clear"
              onClick={clearFilters}
            >
              Clear filters
            </button>
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
      </section>

      {/* -------------------- Single task table -------------------- */}
      <section className="report-card">
        <header className="report-card-header">
          <div>
            <h2>All time entries</h2>
            <p>
              Monday to Friday of the selected week.
              {rangeLabel ? ` Currently: ${rangeLabel}.` : ""}
            </p>
          </div>
          <div className="report-card-badges">
            <span className="report-badge report-badge--hours">
              {totalHours.toFixed(2)}h
            </span>
            <span className="report-badge">
              {filteredTasks.length} row{filteredTasks.length === 1 ? "" : "s"}
            </span>
          </div>
        </header>

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
                <th>Day</th>
                <th>Hours</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const taskId = getId(task);
                  const approvalState = task.approvalStatus || "pending";
                  const dateStr = toDateInput(task.date);
                  const weekday = dateStr
                    ? new Date(dateStr).toLocaleDateString(undefined, {
                        weekday: "short",
                      })
                    : "—";

                  return (
                    <tr key={taskId}>
                      <td>{projectTitle(task)}</td>
                      <td>{task.employee?.name ?? "—"}</td>
                      <td>
                        <span className="task-type-badge">
                          {labelize(task.type)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`task-status-badge status-${task.status}`}
                        >
                          {labelize(task.status)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`approval-badge approval-${approvalState}`}
                        >
                          {approvalState === "approved" && "✓ "}
                          {approvalState === "rejected" && "✕ "}
                          {approvalState === "pending" && "🕒 "}
                          {labelize(approvalState)}
                        </span>
                      </td>
                      <td>{dateStr}</td>
                      <td>
                        <span className="task-day-chip">{weekday}</span>
                      </td>
                      <td>{task.hours}</td>
                      <td className="task-description">
                        {task.description || "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="empty-task-list">
                    {tasks.length === 0
                      ? hasFilters
                        ? "No weekday entries match these filters."
                        : "No time logged this week."
                      : "No weekday entries on this page match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------- Footer / pagination -------------------- */}
      <div className="task-summary report-summary">
        <span>Total entries: {pagination.totalTasks ?? 0}</span>
        <span>Hours (this page): {totalHours.toFixed(2)}</span>
        <Pagination pagination={pagination} id="report-limit" />
      </div>
    </main>
  );
};

export default Report;