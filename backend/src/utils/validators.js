import mongoose from "mongoose";

export const isId = (value) => value != null && mongoose.isObjectIdOrHexString(value);

export const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

export const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (password.length > 72) {
    return "Password must be at most 72 characters long.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
};

export const isValidHours = (hours) =>
  Number.isFinite(hours) && hours >= 0.25 && hours <= 24 && Number.isInteger(hours * 4);

export const toUtcDay = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parsePagination = (query, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const buildPagination = (totalKey, total, page, limit) => ({
  [totalKey]: total,
  currentPage: page,
  limit,
  totalPage: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});
