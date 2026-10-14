import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/MembersSelect.css";

/**
 * MembersSelect
 * Searchable multi-select for picking users.
 *
 * Props:
 *  - options:  [{ _id, name, role?, email? }]
 *  - value:    array of selected _ids
 *  - onChange: (nextIds: string[]) => void
 *  - placeholder
 *  - maxSelected (optional) — soft limit
 */
const MembersSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = "Search and select members...",
  maxSelected,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click / Escape
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

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Autofocus the search box when the panel opens
  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Only show options that match the query.
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

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedOptions = useMemo(
    () => options.filter((u) => selectedSet.has(u._id)),
    [options, selectedSet]
  );

  const toggle = (id) => {
    if (selectedSet.has(id)) {
      onChange?.(value.filter((v) => v !== id));
    } else {
      if (maxSelected && value.length >= maxSelected) return;
      onChange?.([...value, id]);
    }
  };

  const removeOne = (id) => {
    onChange?.(value.filter((v) => v !== id));
  };

  return (
    <div className="members-select" ref={wrapperRef}>
      {/* Trigger */}
      <button
        type="button"
        className={`members-select-trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="members-select-value">
          {selectedOptions.length === 0 ? (
            <span className="members-select-placeholder">{placeholder}</span>
          ) : (
            <span className="members-select-count">
              {selectedOptions.length} selected
            </span>
          )}
        </span>
        <span className="members-select-caret" aria-hidden="true">▾</span>
      </button>

      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="members-select-chips">
          {selectedOptions.map((u) => (
            <span className="members-chip" key={u._id}>
              <span className="members-chip-name">{u.name}</span>
              <button
                type="button"
                className="members-chip-remove"
                aria-label={`Remove ${u.name}`}
                onClick={() => removeOne(u._id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown panel */}
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
              <button
                type="button"
                className="members-select-clear"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="members-select-list">
            {filtered.length === 0 ? (
              <p className="members-select-empty">No members match "{query}".</p>
            ) : (
              filtered.map((u) => {
                const checked = selectedSet.has(u._id);
                return (
                  <label
                    key={u._id}
                    className={`members-select-option ${checked ? "is-checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(u._id)}
                    />
                    <span className="members-select-avatar">
                      {u.name?.charAt(0).toUpperCase()}
                    </span>
                    <span className="members-select-info">
                      <strong>{u.name}</strong>
                      {u.email && <small>{u.email}</small>}
                    </span>
                    {u.role && (
                      <span className={`members-select-role role-${u.role}`}>
                        {u.role}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <div className="members-select-footer">
            <span>{value.length} selected</span>
            {value.length > 0 && (
              <button
                type="button"
                className="members-select-clearall"
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

export default MembersSelect;