const express = require("express");
const router = express.Router();
const pool = require("../config/config.js"); // adjust path if needed
const authenticateToken = require("../middleware/authMiddleware");

/* ======================================================
   HELPER: ROLE PERMISSION CHECK
====================================================== */
const canCreateRole = (creatorRole, targetRole) => {
  if (creatorRole === "superadmin") return true;
  if (creatorRole === "admin") {
    return ["admin", "supervisor", "user"].includes(targetRole);
  }
  return false;
};

/* ======================================================
   ADD USER
   POST /api/users/add
====================================================== */
router.post("/add", authenticateToken, async (req, res) => {
  const creator = req.user;
  const {
    role,
    username,
    full_name,
    email,
    phone_number,
    password,
    tenant_id,
    is_external_driver,
    license_number,
    vehicle_type,
    vehicle_number,
  } = req.body;

  if (!role || !username || !full_name || !email || !phone_number || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  if (!canCreateRole(creator.role, role)) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to create this role",
    });
  }

  let finalTenantId = null;

  // Tenant rules
  if (creator.role === "superadmin") {
    if (role !== "superadmin") {
      if (!tenant_id) {
        return res.status(400).json({
          success: false,
          message: "Tenant ID is required",
        });
      }
      finalTenantId = tenant_id;
    }
  } else {
    finalTenantId = creator.tenant_id;
  }

  // Driver fields only for user
  const driverData =
    role === "user"
      ? {
          is_external_driver: !!is_external_driver,
          license_number: license_number || null,
          vehicle_type: vehicle_type || null,
          vehicle_number: vehicle_number || null,
        }
      : {
          is_external_driver: false,
          license_number: null,
          vehicle_type: null,
          vehicle_number: null,
        };

  try {
    const sql = `
      INSERT INTO users (
        tenant_id, role, username, full_name, email,
        phone_number, password, status,
        is_external_driver, license_number, vehicle_type, vehicle_number,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
    `;

    await pool.execute(sql, [
      finalTenantId,
      role,
      username,
      full_name,
      email,
      phone_number,
      password, // 🔐 hash in production
      driverData.is_external_driver,
      driverData.license_number,
      driverData.vehicle_type,
      driverData.vehicle_number,
      creator.user_id,
    ]);

    res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    console.error("Add user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
});

/* ======================================================
   GET USERS (TENANT-AWARE)
   GET /api/users
====================================================== */
router.get("/", authenticateToken, async (req, res) => {
  const user = req.user;

  try {
    let sql = `SELECT * FROM users`;
    let params = [];

    if (user.role !== "superadmin") {
      sql += ` WHERE tenant_id = ?`;
      params.push(user.tenant_id);
    }

    const [rows] = await pool.execute(sql, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

/* ======================================================
   UPDATE USER
   PUT /api/users/:id
====================================================== */
router.put("/:id", authenticateToken, async (req, res) => {
  const editor = req.user;
  const userId = req.params.id;

  const {
    role,
    full_name,
    email,
    phone_number,
    password,
    is_external_driver,
    license_number,
    vehicle_type,
    vehicle_number,
    status,
  } = req.body;

  try {
    // Fetch target user
    const [existing] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [userId]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const target = existing[0];

    // Tenant protection
    if (
      editor.role !== "superadmin" &&
      target.tenant_id !== editor.tenant_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Tenant access denied",
      });
    }

    if (role && !canCreateRole(editor.role, role)) {
      return res.status(403).json({
        success: false,
        message: "Invalid role update",
      });
    }

    const driverData =
      role === "user"
        ? {
            is_external_driver: !!is_external_driver,
            license_number: license_number || null,
            vehicle_type: vehicle_type || null,
            vehicle_number: vehicle_number || null,
          }
        : {
            is_external_driver: false,
            license_number: null,
            vehicle_type: null,
            vehicle_number: null,
          };

    const sql = `
      UPDATE users SET
        role = ?,
        full_name = ?,
        email = ?,
        phone_number = ?,
        password = COALESCE(?, password),
        status = ?,
        is_external_driver = ?,
        license_number = ?,
        vehicle_type = ?,
        vehicle_number = ?
      WHERE user_id = ?
    `;

    await pool.execute(sql, [
      role || target.role,
      full_name || target.full_name,
      email || target.email,
      phone_number || target.phone_number,
      password || null,
      status || target.status,
      driverData.is_external_driver,
      driverData.license_number,
      driverData.vehicle_type,
      driverData.vehicle_number,
      userId,
    ]);

    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
});

/* ======================================================
   DELETE USER
   DELETE /api/users/:id
====================================================== */
router.delete("/:id", authenticateToken, async (req, res) => {
  const deleter = req.user;
  const userId = req.params.id;

  try {
    const [existing] = await pool.execute(
      `SELECT * FROM users WHERE user_id = ?`,
      [userId]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const target = existing[0];

    if (
      deleter.role !== "superadmin" &&
      target.tenant_id !== deleter.tenant_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Tenant access denied",
      });
    }

    await pool.execute(`DELETE FROM users WHERE user_id = ?`, [userId]);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

module.exports = router;
