const express = require("express");
const router = express.Router();
const pool = require("../config/config");
const authenticateToken = require("../middleware/authMiddleware");

/*
---------------------------------------------------
ALL ROUTES BELOW REQUIRE AUTH
---------------------------------------------------
*/
router.use(authenticateToken);

/*
---------------------------------------------------
GET /api/companies
ROLE: super_admin
---------------------------------------------------
*/
router.get("/", async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  try {
    const [companies] = await pool.query(
      `SELECT tenant_id, company_name, company_code, status, created_at
       FROM tenants
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("Get Companies Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch companies",
    });
  }
});

/*
---------------------------------------------------
POST /api/companies/add
---------------------------------------------------
*/
router.post("/add", async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  const { company_name, company_code, status } = req.body;

  if (!company_name || !company_code) {
    return res.status(400).json({
      success: false,
      message: "Company name and code are required",
    });
  }

  try {
    const [existing] = await pool.query(
      "SELECT tenant_id FROM tenants WHERE company_code = ?",
      [company_code]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Company code already exists",
      });
    }

    await pool.query(
      `INSERT INTO tenants (company_name, company_code, status)
       VALUES (?, ?, ?)`,
      [company_name, company_code, status || "ACTIVE"]
    );

    res.status(201).json({
      success: true,
      message: "Company added successfully",
    });
  } catch (err) {
    console.error("Add Company Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/*
---------------------------------------------------
DELETE /api/companies/:id
---------------------------------------------------
*/
router.delete("/:id", async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  try {
    await pool.query("DELETE FROM tenants WHERE tenant_id = ?", [
      req.params.id,
    ]);

    res.status(200).json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (err) {
    console.error("Delete Company Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete company",
    });
  }
});

/*
---------------------------------------------------
PUT /api/companies/:id
ROLE: superadmin
DESCRIPTION: Update company details
---------------------------------------------------
*/
router.put("/:id", async (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  const { company_name, company_code, status } = req.body;

  if (!company_name || !company_code) {
    return res.status(400).json({
      success: false,
      message: "Company name and code are required",
    });
  }

  try {
    // check if company exists
    const [existing] = await pool.query(
      "SELECT tenant_id FROM tenants WHERE tenant_id = ?",
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // check duplicate company code (except current company)
    const [duplicate] = await pool.query(
      `SELECT tenant_id FROM tenants 
       WHERE company_code = ? AND tenant_id != ?`,
      [company_code, req.params.id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Company code already exists",
      });
    }

    // update company
    await pool.query(
      `UPDATE tenants 
       SET company_name = ?, company_code = ?, status = ?
       WHERE tenant_id = ?`,
      [company_name, company_code, status || "ACTIVE", req.params.id]
    );

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
    });
  } catch (err) {
    console.error("Update Company Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update company",
    });
  }
});


module.exports = router;
