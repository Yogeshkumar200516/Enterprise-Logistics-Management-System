const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const pool = require("../config/config");

/*
---------------------------------------------------
HELPER: ROLE CHECK
---------------------------------------------------
*/
const isSuperAdmin = (user) => user.role === "superadmin";
const isAdmin = (user) => user.role === "admin";

/*
---------------------------------------------------
GET /api/users
ROLE:
- superadmin → all users
- admin → users from own tenant only
---------------------------------------------------
*/
router.get("/", async (req, res) => {
  try {
    let query = `
      SELECT 
        user_id,
        tenant_id,
        role,
        username,
        full_name,
        email,
        phone_number,
        status,
        is_external_driver,
        license_number,
        vehicle_type,
        vehicle_number,
        created_at
      FROM users
    `;

    let params = [];

    if (isAdmin(req.user)) {
      query += " WHERE tenant_id = ?";
      params.push(req.user.tenant_id);
    } else if (!isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const [users] = await pool.query(query, params);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

/*
---------------------------------------------------
POST /api/users
ROLE:
- superadmin → create any user
- admin → create users for own tenant only
---------------------------------------------------
*/
router.post("/", async (req, res) => {
  const {
    tenant_id,
    role,
    username,
    full_name,
    email,
    phone_number,
    password,
    status,
    is_external_driver,
    license_number,
    vehicle_type,
    vehicle_number,
  } = req.body;

  if (!username || !full_name || !email || !phone_number || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Required fields missing",
    });
  }

  try {
    let finalTenantId = null;

    // 🔐 ROLE LOGIC
    if (isSuperAdmin(req.user)) {
      finalTenantId = role === "superadmin" ? null : tenant_id;
    } else if (isAdmin(req.user)) {
      finalTenantId = req.user.tenant_id;

      if (role === "superadmin") {
        return res.status(403).json({
          success: false,
          message: "Admin cannot create superadmin",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 🚗 DRIVER FIELD CONTROL
    const isDriver = role === "user";

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (
        tenant_id,
        role,
        username,
        full_name,
        email,
        phone_number,
        password,
        status,
        is_external_driver,
        license_number,
        vehicle_type,
        vehicle_number,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalTenantId,
        role,
        username,
        full_name,
        email,
        phone_number,
        hashedPassword,
        status || "ACTIVE",
        isDriver ? is_external_driver || false : false,
        isDriver ? license_number || null : null,
        isDriver ? vehicle_type || null : null,
        isDriver ? vehicle_number || null : null,
        req.user.user_id,
      ]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
});

/*
---------------------------------------------------
PUT /api/users/:id
ROLE:
- superadmin → update any user
- admin → update users from own tenant only
---------------------------------------------------
*/
router.put("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const [existing] = await pool.query(
      "SELECT tenant_id, role FROM users WHERE user_id = ?",
      [userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const targetUser = existing[0];

    if (isAdmin(req.user) && targetUser.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const {
      role,
      full_name,
      phone_number,
      status,
      is_external_driver,
      license_number,
      vehicle_type,
      vehicle_number,
    } = req.body;

    const isDriver = role === "user";

    await pool.query(
      `UPDATE users SET
        role = ?,
        full_name = ?,
        phone_number = ?,
        status = ?,
        is_external_driver = ?,
        license_number = ?,
        vehicle_type = ?,
        vehicle_number = ?
      WHERE user_id = ?`,
      [
        role,
        full_name,
        phone_number,
        status,
        isDriver ? is_external_driver || false : false,
        isDriver ? license_number || null : null,
        isDriver ? vehicle_type || null : null,
        isDriver ? vehicle_number || null : null,
        userId,
      ]
    );

    res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
});

/*
---------------------------------------------------
DELETE /api/users/:id
ROLE:
- superadmin → delete any user
- admin → delete users from own tenant only
---------------------------------------------------
*/
router.delete("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const [existing] = await pool.query(
      "SELECT tenant_id FROM users WHERE user_id = ?",
      [userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (isAdmin(req.user) && existing[0].tenant_id !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await pool.query("DELETE FROM users WHERE user_id = ?", [userId]);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

module.exports = router;
