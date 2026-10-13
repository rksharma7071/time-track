import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import BlacklistedToken from "../models/blacklistedToken.model.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const isBlacklisted = await BlacklistedToken.exists({
      tokenHash,
    });

    if (isBlacklisted) {
      return res.status(401).json({
        message: "Session expired. Please login again.",
      });
    }

    req.user = {
      id: decoded._id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token. Please login again.",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
