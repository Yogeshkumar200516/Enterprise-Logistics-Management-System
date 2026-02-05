const express = require("express");
const router = express.Router();
const pool = require("../config/config");
const bcrypt = require("bcrypt");

/*
===================================================
GET – List Users
===================================================
*/
router.get("/", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const loggedInUser = req.user;

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
        is_external_driver,
        license_number,
        vehicle_type,
        vehicle_number,
        status,
        created_at
      FROM users
    `;

    const params = [];

    if (loggedInUser.role !== "superadmin") {
      query += " WHERE tenant_id = ?";
      params.push(loggedInUser.tenant_id);
    }

    query += " ORDER BY user_id DESC";

    const [rows] = await pool.execute(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/*
===================================================
POST – Add User
===================================================
*/
router.post("/add", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const loggedInUser = req.user;

  const {
    tenant_id,
    role,
    username,
    full_name,
    email,
    phone_number,
    password,
    is_external_driver,
    license_number,
    vehicle_type,
    vehicle_number,
  } = req.body;

  try {
    /* ===============================
       ROLE & PERMISSION RULES
    ================================ */

    // ❌ Supervisors cannot create users
    if (loggedInUser.role === "supervisor") {
      return res
        .status(403)
        .json({ message: "Supervisors cannot add users" });
    }

    // ✅ SUPERADMIN LOGIC
    if (loggedInUser.role === "superadmin") {
      // Superadmin creating superadmin OR admin
      if (!["superadmin", "admin"].includes(role)) {
        return res.status(403).json({
          message: "Super Admin can only create Super Admin or Admin users",
        });
      }

      // Admin MUST have tenant
      if (role === "admin" && !tenant_id) {
        return res.status(400).json({ message: "Tenant ID required for Admin" });
      }

      // Superadmin must NOT have tenant
      if (role === "superadmin" && tenant_id) {
        return res.status(400).json({
          message: "Super Admin must not be assigned to a tenant",
        });
      }
    }

    // ✅ ADMIN LOGIC
    if (loggedInUser.role === "admin") {
      if (!["admin", "supervisor", "user"].includes(role)) {
        return res
          .status(403)
          .json({ message: "Invalid role assignment" });
      }
    }

    /* ===============================
       PASSWORD
    ================================ */
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    /* ===============================
       FINAL TENANT DECISION
    ================================ */
    let finalTenantId = null;

    if (role === "superadmin") {
      finalTenantId = null;
    } else if (loggedInUser.role === "superadmin") {
      finalTenantId = tenant_id;
    } else {
      finalTenantId = loggedInUser.tenant_id;
    }

    /* ===============================
       INSERT USER
    ================================ */
    const query = `
      INSERT INTO users (
        tenant_id,
        role,
        username,
        full_name,
        email,
        phone_number,
        password,
        is_external_driver,
        license_number,
        vehicle_type,
        vehicle_number,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      finalTenantId,
      role,
      username,
      full_name,
      email,
      phone_number,
      hashedPassword,
      is_external_driver || false,
      license_number || null,
      vehicle_type || null,
      vehicle_number || null,
      loggedInUser.user_id,
    ]);

    res.status(201).json({ message: "User added successfully" });
  } catch (error) {
    console.error("Add User Error:", error);
    res.status(500).json({ message: "Failed to add user" });
  }
});


/*
===================================================
PUT – Update User
===================================================
*/
router.put("/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const loggedInUser = req.user;

  const {
    role,
    full_name,
    email,
    phone_number,
    is_external_driver,
    license_number,
    vehicle_type,
    vehicle_number,
    password,
    // ❌ tenant_id intentionally ignored
  } = req.body;

  try {
    /* ===============================
       FETCH EXISTING USER
    ================================ */
    const [existing] = await pool.execute(
      "SELECT tenant_id, role FROM users WHERE user_id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingUser = existing[0];

    /* ===============================
       TENANT ACCESS CHECK
    ================================ */
    if (
      loggedInUser.role !== "superadmin" &&
      existingUser.tenant_id !== loggedInUser.tenant_id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    /* ===============================
       ROLE PERMISSIONS
    ================================ */
    if (loggedInUser.role === "supervisor") {
      return res
        .status(403)
        .json({ message: "Supervisors cannot update users" });
    }

    if (loggedInUser.role === "admin") {
      if (!["admin", "supervisor", "user"].includes(role)) {
        return res
          .status(403)
          .json({ message: "Invalid role assignment" });
      }
    }

    if (loggedInUser.role === "superadmin") {
      if (!["superadmin", "admin"].includes(role)) {
        return res.status(403).json({
          message: "Super Admin can only assign Super Admin or Admin roles",
        });
      }
    }

    /* ===============================
       TENANT NORMALIZATION
    ================================ */
    let tenantUpdateClause = "";
    let params = [
      role,
      full_name,
      email,
      phone_number,
      is_external_driver || false,
      license_number || null,
      vehicle_type || null,
      vehicle_number || null,
    ];

    // 🔒 If role is changed to superadmin → force tenant_id = NULL
    if (role === "superadmin" && existingUser.tenant_id !== null) {
      tenantUpdateClause = ", tenant_id = NULL";
    }

    /* ===============================
       PASSWORD (OPTIONAL)
    ================================ */
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      tenantUpdateClause += ", password = ?";
      params.push(hashedPassword);
    }

    /* ===============================
       FINAL QUERY
    ================================ */
    const query = `
      UPDATE users SET
        role = ?,
        full_name = ?,
        email = ?,
        phone_number = ?,
        is_external_driver = ?,
        license_number = ?,
        vehicle_type = ?,
        vehicle_number = ?
        ${tenantUpdateClause}
      WHERE user_id = ?
    `;

    params.push(id);

    await pool.execute(query, params);

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});


/*
===================================================
DELETE – Delete User
===================================================
*/
router.delete("/:id", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.params;
  const loggedInUser = req.user;

  try {
    const [existing] = await pool.execute(
      "SELECT tenant_id FROM users WHERE user_id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      loggedInUser.role !== "superadmin" &&
      existing[0].tenant_id !== loggedInUser.tenant_id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (loggedInUser.role === "supervisor") {
      return res.status(403).json({
        message: "Supervisors cannot delete users",
      });
    }

    await pool.execute("DELETE FROM users WHERE user_id = ?", [id]);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;
