
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ProjectsSelect.css";

const ProjectsSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = "Search and select projects...",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    const timer = setTimeout(() => searchRef.current?.focus(), 0);

    return () => clearTimeout(timer);
  }, [open]);

  const getId = (project) =>
    String(project._id || project.id || "");

  const getName = (project) =>
    project.title || project.name || "Untitled Project";

  const filteredProjects = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return options;

    return options.filter((project) =>
      getName(project).toLowerCase().includes(search)
    );
  }, [options, query]);

  const selectedIds = useMemo(
    () => new Set(value.map(String)),
    [value]
  );

  const selectedProjects = useMemo(
    () => options.filter((project) => selectedIds.has(getId(project))),
    [options, selectedIds]
  );

  const toggleProject = (id) => {
    const normalizedId = String(id);

    if (selectedIds.has(normalizedId)) {
      onChange?.(
        value.filter((selectedId) => String(selectedId) !== normalizedId)
      );
    } else {
      onChange?.([...value, normalizedId]);
    }
  };

  const removeProject = (id) => {
    onChange?.(
      value.filter((selectedId) => String(selectedId) !== String(id))
    );
  };

  return (
    <div className="projects-select" ref={wrapperRef}>
      <button
        type="button"
        className={`projects-select-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="projects-select-trigger-text">
          {selectedProjects.length > 0
            ? `${selectedProjects.length} project(s) selected`
            : placeholder}
        </span>

        <span className="projects-select-caret" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {selectedProjects.length > 0 && (
        <div className="projects-select-chips">
          {selectedProjects.map((project) => {
            const id = getId(project);

            return (
              <span className="projects-select-chip" key={id}>
                <span className="projects-select-chip-name">
                  {getName(project)}
                </span>

                <button
                  type="button"
                  className="projects-select-chip-remove"
                  aria-label={`Remove ${getName(project)}`}
                  onClick={() => removeProject(id)}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="projects-select-panel">
          <div className="projects-select-search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects..."
              aria-label="Search projects"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="projects-select-list" role="listbox" aria-multiselectable="true">
            {filteredProjects.length === 0 ? (
              <p className="projects-select-empty">
                {options.length === 0
                  ? "No projects available."
                  : "No projects match your search."}
              </p>
            ) : (
              filteredProjects.map((project) => {
                const id = getId(project);
                const checked = selectedIds.has(id);

                return (
                  <label
                    key={id}
                    className={`projects-select-option ${checked ? "is-selected" : ""
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProject(id)}
                    />

                    <span className="projects-select-checkbox">
                      {checked ? "✓" : ""}
                    </span>

                    <span className="projects-select-icon">
                      📁
                    </span>

                    <span className="projects-select-info">
                      <strong>{getName(project)}</strong>
                      {project.description && (
                        <small>{project.description}</small>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="projects-select-footer">
            <span>
              {selectedProjects.length} selected
            </span>

            {value.length > 0 && (
              <button
                type="button"
                className="projects-select-clear"
                onClick={() => onChange?.([])}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsSelect;
