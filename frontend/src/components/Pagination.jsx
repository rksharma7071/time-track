import { useSearchParams } from "react-router-dom";
import { PAGE_SIZE_OPTIONS } from "../utils/constants.js";

/** Pagination bound to ?page & ?limit, driven by the backend `pagination` object. */
const Pagination = ({ pagination = {}, id = "rows-per-page" }) => {
  const [, setSearchParams] = useSearchParams();

  const page = pagination.currentPage ?? 1;
  const limit = pagination.limit ?? 10;
  const totalPages = Math.max(1, pagination.totalPage ?? 1);

  const update = (changes) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([key, value]) => next.set(key, String(value)));
      return next;
    });

  return (
    <div className="pagination-controls">
      <label htmlFor={id}>Rows per page:</label>
      <select id={id} value={limit} onChange={(e) => update({ page: 1, limit: e.target.value })}>
        {PAGE_SIZE_OPTIONS.map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>

      <button type="button" disabled={!pagination.hasPrevPage} onClick={() => update({ page: page - 1 })}>
        Previous
      </button>

      <span>Page {Math.min(page, totalPages)} of {totalPages}</span>

      <button type="button" disabled={!pagination.hasNextPage} onClick={() => update({ page: page + 1 })}>
        Next
      </button>
    </div>
  );
};

export default Pagination;
