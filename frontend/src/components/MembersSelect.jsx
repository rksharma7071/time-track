import { useEffect, useMemo, useRef, useState } from "react";
import { getId } from "../utils/helpers.js";
import "../styles/MembersSelect.css";


const MembersSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = "Search and select members...",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const timer = setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(value.map(String)), [value]);
  const selectedOptions = useMemo(
    () => options.filter((u) => selectedSet.has(getId(u))),
    [options, selectedSet]
  );

  const toggle = (id) => {
    if (selectedSet.has(id)) onChange?.(value.filter((v) => String(v) !== id));
    else onChange?.([...value, id]);
  };

  const toggleOpen = () => {
    setQuery("");
    setOpen((v) => !v);
  };

  return (
    <div className="members-select" ref={wrapperRef}>
      <button
        type="button"
        className={`members-select-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        disabled={disabled}
      >
        <span className="members-select-value">
          {selectedOptions.length === 0 ? (
            <span className="members-select-placeholder">{placeholder}</span>
          ) : (
            <span className="members-select-count">{selectedOptions.length} selected</span>
          )}
        </span>
        <span className="members-select-caret" aria-hidden="true">▾</span>
      </button>

      {selectedOptions.length > 0 && (
        <div className="members-select-chips">
          {selectedOptions.map((u) => (
            <span className="members-chip" key={getId(u)}>
              <span className="members-chip-name">{u.name}</span>
              {!disabled && (
                <button
                  type="button"
                  className="members-chip-remove"
                  aria-label={`Remove ${u.name}`}
                  onClick={() => toggle(getId(u))}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="members-select-panel" role="listbox">
          <div className="members-select-search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or role..."
              aria-label="Search members"
            />
            {query && (
              <button type="button" className="members-select-clear" aria-label="Clear search" onClick={() => setQuery("")}>
                ×
              </button>
            )}
          </div>

          <div className="members-select-list">
            {filtered.length === 0 ? (
              <p className="members-select-empty">
                {options.length === 0 ? "No users available." : `No members match "${query}".`}
              </p>
            ) : (
              filtered.map((u) => {
                const id = getId(u);
                const checked = selectedSet.has(id);
                return (
                  <label key={id} className={`members-select-option ${checked ? "is-checked" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(id)} />
                    <span className="members-select-avatar">{u.name?.charAt(0).toUpperCase()}</span>
                    <span className="members-select-info">
                      <strong>{u.name}</strong>
                      {u.email && <small>{u.email}</small>}
                    </span>
                    {u.role && <span className={`members-select-role role-${u.role}`}>{u.role}</span>}
                  </label>
                );
              })
            )}
          </div>

          <div className="members-select-footer">
            <span>{value.length} selected</span>
            {value.length > 0 && (
              <button type="button" className="members-select-clearall" onClick={() => onChange?.([])}>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersSelect;
