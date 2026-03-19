const express = require("express");
const router = express.Router();
const pool = require("../config/config");

// ===============================
// HELPER: ADMIN + ACTIVE CHECK
// ===============================
const checkAdminAccess = async (req, res, next) => {
  try {
    const { user_id, role, tenant_id } = req.user;

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    const [userRows] = await pool.query(
      `SELECT status FROM users WHERE user_id = ?`,
      [user_id]
    );

    if (!userRows.length || userRows[0].status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User is not active",
      });
    }

    const [tenantRows] = await pool.query(
      `SELECT status FROM tenants WHERE tenant_id = ?`,
      [tenant_id]
    );

    if (!tenantRows.length || tenantRows[0].status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Tenant is not active",
      });
    }

    next();
  } catch (error) {
    console.error("Access check error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization validation failed",
    });
  }
};

// ===============================
// ➕ ADD VEHICLE
// ===============================
router.post("/vehicles", checkAdminAccess, async (req, res) => {
  try {
    const { vehicle_type, vehicle_number, capacity, is_temporary } = req.body;
    const { tenant_id } = req.user;

    const [result] = await pool.query(
      `
      INSERT INTO vehicles
      (tenant_id, vehicle_type, vehicle_number, capacity, is_temporary)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        tenant_id,
        vehicle_type,
        vehicle_number,
        capacity,
        Number(is_temporary) || 0, // force 0 / 1
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle_id: result.insertId,
    });
  } catch (error) {
    console.error("Add vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add vehicle",
    });
  }
});

// ===============================
// ✏️ UPDATE VEHICLE (FIXED)
// ===============================
router.put("/vehicles/:vehicle_id", checkAdminAccess, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const {
      vehicle_type,
      vehicle_number,
      capacity,
      status,
      is_temporary, // 🔥 REQUIRED
    } = req.body;

    const { tenant_id } = req.user;

    const [result] = await pool.query(
      `
      UPDATE vehicles
      SET
        vehicle_type = ?,
        vehicle_number = ?,
        capacity = ?,
        status = ?,
        is_temporary = ?   -- 🔥 FIX
      WHERE vehicle_id = ? AND tenant_id = ?
      `,
      [
        vehicle_type,
        vehicle_number,
        capacity,
        status,
        Number(is_temporary), // force boolean
        vehicle_id,
        tenant_id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      message: "Vehicle updated successfully",
    });
  } catch (error) {
    console.error("Update vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update vehicle",
    });
  }
});

// ===============================
// 📄 GET ALL VEHICLES (TENANT)
// ===============================
router.get("/vehicles", checkAdminAccess, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const [vehicles] = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      `,
      [tenant_id]
    );

    res.json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    console.error("Get vehicles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vehicles",
    });
  }
});

// ===============================
// 🗑️ DELETE VEHICLE
// ===============================
router.delete("/vehicles/:vehicle_id", checkAdminAccess, async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    const { tenant_id } = req.user;

    const [result] = await pool.query(
      `
      DELETE FROM vehicles
      WHERE vehicle_id = ? AND tenant_id = ?
      `,
      [vehicle_id, tenant_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete vehicle",
    });
  }
});

module.exports = router;
