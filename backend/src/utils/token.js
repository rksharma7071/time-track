import { createHash } from "crypto";
import BlacklistedToken from "../models/blacklistedToken.model.js";

export const JWT_ERRORS = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"];

export const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export const blacklistToken = async (token, exp) => {
  if (!token || !exp) return;
  const tokenHash = hashToken(token);

  await BlacklistedToken.updateOne(
    { tokenHash },
    { $setOnInsert: { tokenHash, expiresAt: new Date(exp * 1000) } },
    { upsert: true }
  );
};
