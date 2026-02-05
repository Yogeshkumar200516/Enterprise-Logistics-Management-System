// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../config/config");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "mydefaultsecret";

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // 1. Validate input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  try {
    // 2. Get user
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const user = rows[0];

    // 3. Status check
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive or suspended",
      });
    }

    // 4. Password check (plain text)
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // 5. JWT (MATCHES authMiddleware)
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
        tenant_id: user.tenant_id || null,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6. Update login time
    await db.query(
      "UPDATE users SET last_login = NOW() WHERE user_id = ?",
      [user.user_id]
    );

    // 7. Response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
