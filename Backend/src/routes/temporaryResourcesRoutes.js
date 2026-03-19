const express = require("express");
const router = express.Router();
const pool = require("../config/config");

// ===============================
// SUPERVISOR ACCESS CHECK
// ===============================
const checkSupervisorAccess = async (req, res, next) => {
  try {
    const { user_id, role, tenant_id } = req.user;

    if (role !== "supervisor") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Supervisors only.",
      });
    }

    const [[user]] = await pool.query(
      `SELECT status FROM users WHERE user_id = ?`,
      [user_id]
    );

    const [[tenant]] = await pool.query(
      `SELECT status FROM tenants WHERE tenant_id = ?`,
      [tenant_id]
    );

    if (!user || user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "User inactive" });
    }

    if (!tenant || tenant.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Tenant inactive" });
    }

    next();
  } catch (err) {
    console.error("Supervisor access error:", err);
    res.status(500).json({ success: false, message: "Auth failed" });
  }
};

// ➕ ADD TEMPORARY USER (EXTERNAL DRIVER)
router.post("/temporary-users", checkSupervisorAccess, async (req, res) => {
  try {
    const {
      full_name,
      username,
      phone_number,
      password,
      status,
      license_number,
      vehicle_type,
      vehicle_number,
    } = req.body;

    const { tenant_id, user_id: supervisor_id } = req.user;

    if (!full_name || !username || !phone_number || !password) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing: full_name, username, phone_number, password",
      });
    }

    const email = `${username}_${Date.now()}@temp.local`;

    const [result] = await pool.query(
      `INSERT INTO users (
        tenant_id, role, username, full_name, email, phone_number,
        password, status, is_external_driver, license_number,
        vehicle_type, vehicle_number, created_by
      ) VALUES (?, 'user', ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        tenant_id,
        username,
        full_name,
        email,
        phone_number,
        password,
        status || "ACTIVE",
        license_number || null,
        vehicle_type || null,
        vehicle_number || null,
        supervisor_id,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Temporary user added successfully",
      user_id: result.insertId,
    });
  } catch (err) {
    console.error("Add temporary user error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to add temporary user",
    });
  }
});

// ✏️ UPDATE TEMPORARY USER  ← username editing enabled
router.put("/temporary-users/:user_id", checkSupervisorAccess, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { tenant_id } = req.user;
    const {
      full_name,
      username,       // ← now accepted and updated
      phone_number,
      status,
      license_number,
      vehicle_type,
      vehicle_number,
    } = req.body;

    // Check if the new username is already taken by a DIFFERENT user
    if (username) {
      const [[existing]] = await pool.query(
        `SELECT user_id FROM users WHERE username = ? AND user_id != ?`,
        [username, user_id]
      );
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Username already taken by another user",
        });
      }
    }

    const [result] = await pool.query(
      `UPDATE users
       SET
         full_name      = ?,
         username       = ?,
         phone_number   = ?,
         status         = ?,
         license_number = ?,
         vehicle_type   = ?,
         vehicle_number = ?
       WHERE user_id          = ?
         AND tenant_id        = ?
         AND role             = 'user'
         AND is_external_driver = 1`,
      [
        full_name,
        username,
        phone_number,
        status,
        license_number || null,
        vehicle_type   || null,
        vehicle_number || null,
        user_id,
        tenant_id,
      ]
    );

    if (!result.affectedRows) {
      return res.status(403).json({
        success: false,
        message: "User not found or not allowed",
      });
    }

    res.json({
      success: true,
      message: "Temporary user updated successfully",
    });
  } catch (err) {
    console.error("Update temporary user error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update temporary user",
    });
  }
});

// 📄 GET TEMPORARY USERS
router.get("/temporary-users", checkSupervisorAccess, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const [users] = await pool.query(
      `SELECT
         user_id, full_name, username, phone_number, status,
         license_number, vehicle_type, vehicle_number,
         driver_status, created_at
       FROM users
       WHERE tenant_id = ?
         AND role = 'user'
         AND is_external_driver = 1
       ORDER BY created_at DESC`,
      [tenant_id]
    );

    res.json({ success: true, data: users });
  } catch (err) {
    console.error("Fetch temporary users error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch temporary users",
    });
  }
});

// 🗑️ DELETE TEMPORARY USER
router.delete("/temporary-users/:user_id", checkSupervisorAccess, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { tenant_id } = req.user;

    const [result] = await pool.query(
      `DELETE FROM users
       WHERE user_id = ?
         AND tenant_id = ?
         AND role = 'user'
         AND is_external_driver = 1`,
      [user_id, tenant_id]
    );

    if (!result.affectedRows) {
      return res.status(403).json({
        success: false,
        message: "User not found or not allowed",
      });
    }

    res.json({ success: true, message: "Temporary user deleted successfully" });
  } catch (err) {
    console.error("Delete temporary user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete temporary user",
    });
  }
});

// ➕ ADD TEMPORARY VEHICLE
router.post("/temporary-vehicles", checkSupervisorAccess, async (req, res) => {
  try {
    const { vehicle_type, vehicle_number, capacity, status } = req.body;
    const { tenant_id } = req.user;

    if (!vehicle_type || !vehicle_number || !capacity) {
      return res.status(400).json({
        success: false,
        message: "vehicle_type, vehicle_number and capacity are required",
      });
    }

    const allowedStatus = ["AVAILABLE", "IN_USE", "MAINTENANCE"];
    const finalStatus = allowedStatus.includes(status) ? status : "AVAILABLE";

    const [result] = await pool.query(
      `INSERT INTO vehicles (tenant_id, vehicle_type, vehicle_number, capacity, is_temporary, status)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [tenant_id, vehicle_type, vehicle_number, capacity, finalStatus]
    );

    res.status(201).json({
      success: true,
      message: "Temporary vehicle added successfully",
      vehicle_id: result.insertId,
    });
  } catch (err) {
    console.error("Add temporary vehicle error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Vehicle number already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to add temporary vehicle",
    });
  }
});

// ✏️ UPDATE TEMPORARY VEHICLE
router.put("/temporary-vehicles/:vehicle_id", checkSupervisorAccess, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { vehicle_type, vehicle_number, capacity, status } = req.body;
    const { tenant_id } = req.user;

    const allowedStatus = ["AVAILABLE", "IN_USE", "MAINTENANCE"];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle status",
      });
    }

    const [result] = await pool.query(
      `UPDATE vehicles
       SET vehicle_type = ?, vehicle_number = ?, capacity = ?, status = ?
       WHERE vehicle_id = ? AND tenant_id = ? AND is_temporary = 1`,
      [vehicle_type, vehicle_number, capacity, status, vehicle_id, tenant_id]
    );

    if (!result.affectedRows) {
      return res.status(403).json({
        success: false,
        message: "Vehicle not found or not allowed",
      });
    }

    res.json({ success: true, message: "Temporary vehicle updated successfully" });
  } catch (err) {
    console.error("Update temporary vehicle error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Vehicle number already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update temporary vehicle",
    });
  }
});

// 📄 GET TEMPORARY VEHICLES
router.get("/temporary-vehicles", checkSupervisorAccess, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const [vehicles] = await pool.query(
      `SELECT * FROM vehicles
       WHERE tenant_id = ? AND is_temporary = 1
       ORDER BY created_at DESC`,
      [tenant_id]
    );

    res.json({ success: true, data: vehicles });
  } catch (err) {
    console.error("Get temp vehicles error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicles",
    });
  }
});

// 🗑️ DELETE TEMPORARY VEHICLE
router.delete("/temporary-vehicles/:vehicle_id", checkSupervisorAccess, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { tenant_id } = req.user;

    const [result] = await pool.query(
      `DELETE FROM vehicles
       WHERE vehicle_id = ? AND tenant_id = ? AND is_temporary = 1`,
      [vehicle_id, tenant_id]
    );

    if (!result.affectedRows) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    res.json({ success: true, message: "Temporary vehicle deleted" });
  } catch (err) {
    console.error("Delete temp vehicle error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete vehicle",
    });
  }
});

module.exports = router;