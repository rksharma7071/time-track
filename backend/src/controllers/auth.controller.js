import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { EMAIL_REGEX, normalizeEmail, validatePassword } from "../utils/validators.js";
import { blacklistToken, JWT_ERRORS } from "../utils/token.js";
import { toPublicUser } from "../utils/serializers.js";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy-password", 10);

export const register = async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  if (await User.exists({ email })) {
    return res.status(409).json({ message: "Email id already registered." });
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role: "employee",
  });

  return res.status(201).json({ message: "User created successfully.", user: toPublicUser(user) });
};

export const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!email || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email });
  const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (user.isActive === false) {
    return res.status(403).json({ message: "Your account has been deactivated. Please contact an administrator." });
  }

  const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, { ...cookieOptions(), maxAge: TOKEN_TTL_MS });

  return res.status(200).json({ message: "Login successful.", user: toPublicUser(user) });
};

export const logout = async (req, res) => {
  const token = req.cookies?.token;

  res.clearCookie("token", cookieOptions());

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await blacklistToken(token, decoded.exp);
    } catch (error) {
      if (!JWT_ERRORS.includes(error.name)) throw error;
    }
  }

  return res.status(200).json({ message: "Logout successful." });
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password").lean();

  return res.status(200).json({
    message: "User authenticated successfully.",
    user: toPublicUser(user),
  });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different from the current password." });
  }

  const user = await User.findById(req.user.id);

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  await user.save();

  await blacklistToken(req.token, req.tokenExp);
  res.clearCookie("token", cookieOptions());

  return res.status(200).json({ message: "Password changed successfully. Please login again." });
};
