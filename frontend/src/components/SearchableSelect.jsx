import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/SearchableSelect.css";

const SearchableSelect = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  labelKey = "name",
  valueKey = "_id",
  secondaryKey = "",
  disabled = false,
  clearable = true,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const searchRef = useRef(null);

  const optionValue = (option) => String(option?.[valueKey] ?? "");

  const selectedOption = useMemo(
    () => (value ? options.find((option) => String(option[valueKey]) === String(value)) : undefined),
    [options, value, valueKey]
  );

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return options;

    return options.filter((option) => {
      const label = String(option[labelKey] ?? "").toLowerCase();
      const secondary = String(secondaryKey ? option[secondaryKey] ?? "" : "").toLowerCase();
      return label.includes(search) || secondary.includes(search);
    });
  }, [options, query, labelKey, secondaryKey]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    const timer = setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const toggleOpen = () => {
    setQuery("");
    setOpen((prev) => !prev);
  };

  const handleSelect = (option) => {
    onChange?.(optionValue(option));
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <button
        type="button"
        className={`searchable-select-trigger ${open ? "is-open" : ""}`}
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedOption ? "searchable-select-value" : "searchable-select-placeholder"}>
          {selectedOption ? selectedOption[labelKey] : placeholder}
        </span>

        {clearable && value && !disabled && (
          <span
            className="searchable-select-clear"
            role="button"
            aria-label="Clear selection"
            onClick={(event) => {
              event.stopPropagation();
              onChange?.("");
            }}
          >
            ×
          </span>
        )}

        <span className="searchable-select-caret">▾</span>
      </button>

      {open && (
        <div className="searchable-select-panel">
          <div className="searchable-select-search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>

          <div className="searchable-select-list" role="listbox">
            {filteredOptions.length === 0 ? (
              <p className="searchable-select-empty">No matching options found.</p>
            ) : (
              filteredOptions.map((option) => {
                const selected = optionValue(option) === String(value);

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    key={optionValue(option)}
                    className={`searchable-select-option ${selected ? "is-selected" : ""}`}
                    onClick={() => handleSelect(option)}
                  >
                    <span>{option[labelKey]}</span>
                    {secondaryKey && option[secondaryKey] && <small>{option[secondaryKey]}</small>}
                    {selected && <span className="searchable-select-check">✓</span>}
                  </button>
                );
              })
            )}
          </div>

          <div className="searchable-select-footer">
            {filteredOptions.length} option{filteredOptions.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
