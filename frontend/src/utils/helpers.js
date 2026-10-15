import { MAX_PAGE_LIMIT } from "./constants.js";

/**
 * Users come back from the API as `id` (toPublicUser), projects and populated
 * refs as `_id`, tasks as both. This normalises any of them to a string id.
 */
export const getId = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return String(value._id ?? value.id ?? "");
  return String(value);
};

export const sameId = (a, b) => {
  const x = getId(a);
  return Boolean(x) && x === getId(b);
};

/** Today's date in the user's local timezone as YYYY-MM-DD. */
export const todayLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

/** Backend stores dates as UTC midnight, so the first 10 chars are the calendar day. */
export const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

export const labelize = (value = "") => String(value).replace(/-/g, " ");

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same rules as backend utils/validators.js validatePassword. */
export const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (password.length > 72) return "Password must be at most 72 characters long.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
};

/** Same rules as backend isValidHours. */
export const isValidHours = (hours) =>
  Number.isFinite(hours) && hours >= 0.25 && hours <= 24 && Number.isInteger(hours * 4);

/** Closes the <details> row menu that contains the clicked button. */
export const closeRowMenu = (event) => {
  event.currentTarget.closest("details")?.removeAttribute("open");
};

/** Reads page/limit and the given filter keys from a loader request URL. */
export const readListParams = (request, filterKeys = []) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(searchParams.get("limit"), 10) || 10));
  const params = { page, limit };

  filterKeys.forEach((key) => {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  });

  return params;
};
