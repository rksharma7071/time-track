import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import BlacklistedToken from "../models/blacklistedToken.model.js";
import { hashToken, JWT_ERRORS } from "../utils/token.js";

export const verifyToken = (allowedRoles = []) => {
  return async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (JWT_ERRORS.includes(error.name)) {
        return res.status(401).json({ message: "Invalid or expired token. Please login again." });
      }
      throw error;
    }

    const [isBlacklisted, user] = await Promise.all([
      BlacklistedToken.exists({ tokenHash: hashToken(token) }),
      User.findById(decoded._id).select("name email role isActive passwordChangedAt").lean(),
    ]);

    if (isBlacklisted) {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Your account is inactive or no longer exists." });
    }

    if (
      user.passwordChangedAt &&
      decoded.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
    ) {
      return res.status(401).json({ message: "Your password was changed. Please login again." });
    }

    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    };
    req.token = token;
    req.tokenExp = decoded.exp;

    return next();
  };
};
