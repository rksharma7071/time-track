import User from "../models/user.model.js";
import BlacklistedToken from "../models/blacklistedToken.model.js";
import bcrypt from "bcrypt";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { name, email, password, role = "employee" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    const existUser = await User.findOne({ email });

    if (existUser) {
      return res.status(400).json({ message: "Email id already registered." });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashPassword,
      role
    })

    return res.status(201).json({ message: "User created Successfully." })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email id already registered." });
    }
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Email id is not registered." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Password is incorrect." });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    )

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    })


    return res.status(200).json({
      message: "Login successful.",
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Internal server error.", error: error });
  }
}

export const logout = async (req, res) => {
  const token = req.cookies?.token;

  const clearCookie = () => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  };
  console.log("Step-01");

  try {
    if (token) {
      try {
        console.log("Step-02");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const tokenHash = createHash("sha256")
          .update(token)
          .digest("hex");
        console.log("Step-03");
        if (decoded.exp) {
          await BlacklistedToken.updateOne(
            { tokenHash },
            {
              $setOnInsert: {
                tokenHash,
                expiresAt: new Date(decoded.exp * 1000),
              },
            },
            { upsert: true }
          );
        }

        console.log("Step-04");
      } catch (error) {
        if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError" && error.name !== "NotBeforeError") {
          throw error;
        }
      }
    }

    console.log("Step-05");
    clearCookie();

    console.log("Step-06");
    return res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    console.error("Logout error:", error.message);
    clearCookie();
    return res.status(500).json({ message: "Unable to complete logout. Please try again." });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      message: "User authenticated successfully.",
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error.message);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};