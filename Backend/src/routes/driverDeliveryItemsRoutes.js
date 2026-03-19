// src/routes/driverDeliveryRoutes.js
//
// REGISTRATION in app.js / server.js:
//   const driverDeliveryRoutes = require('./routes/driverDeliveryRoutes');
//   app.use('/api/driver-delivery', driverDeliveryRoutes);
//
// These routes serve the DRIVER (role: 'user') delivery status page.
// Supervisors/Admins can also view for oversight.

const express  = require("express");
const router   = express.Router();
const pool     = require("../config/config");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");

// ─── Multer config for proof uploads ──────────────────────────
// Files are saved to /uploads/delivery-proofs/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/delivery-proofs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `proof_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/i;
    if (allowed.test(path.extname(file.originalname)) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, PNG, WEBP) and PDFs are allowed"));
    }
  },
});

// ─── 1. GET MY ASSIGNMENTS (driver's own list) ─────────────────
//        GET /api/driver-delivery/my-assignments
router.get("/my-assignments", async (req, res) => {
  try {
    const { user_id, tenant_id, role } = req.user;

    // Only drivers (role=user) or supervisors/admins viewing
    if (!["user", "admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    // Driver sees only their own; admin/supervisor see all for tenant
    const driverFilter = role === "user" ? "AND da.driver_id = ?" : "";
    const params       = role === "user" ? [tenant_id, user_id] : [tenant_id];

    const [assignments] = await pool.query(
      `SELECT
         da.delivery_id,
         da.status,
         da.assigned_at,
         v.vehicle_id,
         v.vehicle_number,
         v.vehicle_type,
         v.capacity,
         u_sup.full_name  AS supervisor_name,
         u_sup.phone_number AS supervisor_phone,
         COUNT(DISTINCT o.order_id)   AS total_orders,
         COUNT(di.delivery_item_id)   AS total_items,
         SUM(CASE WHEN di.delivery_status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_items,
         SUM(CASE WHEN di.delivery_status = 'DAMAGED'   THEN 1 ELSE 0 END) AS damaged_items,
         SUM(CASE WHEN di.delivery_status = 'PENDING'   THEN 1 ELSE 0 END) AS pending_items
       FROM delivery_assignments da
       JOIN vehicles v       ON da.vehicle_id    = v.vehicle_id
       JOIN users u_sup      ON da.supervisor_id = u_sup.user_id
       LEFT JOIN delivery_items di ON da.delivery_id = di.delivery_id
       LEFT JOIN order_items oi    ON di.item_id     = oi.item_id
       LEFT JOIN orders o          ON oi.order_id    = o.order_id
       WHERE da.tenant_id = ? ${driverFilter}
       GROUP BY
         da.delivery_id, da.status, da.assigned_at,
         v.vehicle_id, v.vehicle_number, v.vehicle_type, v.capacity,
         u_sup.full_name, u_sup.phone_number
       ORDER BY da.assigned_at DESC`,
      params
    );

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("my-assignments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch assignments", error: error.message });
  }
});

// ─── 2. GET MY ASSIGNMENT STATS (summary cards) ────────────────
//        GET /api/driver-delivery/my-stats
router.get("/my-stats", async (req, res) => {
  try {
    const { user_id, tenant_id, role } = req.user;
    if (!["user", "admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const driverFilter = role === "user" ? "AND driver_id = ?" : "";
    const params       = role === "user" ? [tenant_id, user_id] : [tenant_id];

    const [rows] = await pool.query(
      `SELECT
         COUNT(*)                                                          AS total,
         SUM(CASE WHEN status = 'ASSIGNED'             THEN 1 ELSE 0 END) AS assigned,
         SUM(CASE WHEN status = 'IN_TRANSIT'           THEN 1 ELSE 0 END) AS in_transit,
         SUM(CASE WHEN status = 'DELIVERED'            THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN status = 'PARTIALLY_DELIVERED'  THEN 1 ELSE 0 END) AS partially_delivered
       FROM delivery_assignments
       WHERE tenant_id = ? ${driverFilter}`,
      params
    );

    res.json({ success: true, stats: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
  }
});

// ─── 3. GET ASSIGNMENT DETAIL ──────────────────────────────────
//        GET /api/driver-delivery/assignment/:deliveryId
router.get("/assignment/:deliveryId", async (req, res) => {
  try {
    const { user_id, tenant_id, role } = req.user;
    const { deliveryId } = req.params;

    if (!["user", "admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    // Driver can only see their own delivery
    const driverFilter = role === "user" ? "AND da.driver_id = ?" : "";
    const hParams      = role === "user"
      ? [deliveryId, tenant_id, user_id]
      : [deliveryId, tenant_id];

    const [assignment] = await pool.query(
      `SELECT
         da.delivery_id, da.status, da.assigned_at,
         v.vehicle_id, v.vehicle_number, v.vehicle_type, v.capacity, v.is_temporary,
         u_drv.user_id   AS driver_id,
         u_drv.full_name AS driver_name,
         u_drv.phone_number AS driver_phone,
         u_sup.full_name    AS supervisor_name,
         u_sup.phone_number AS supervisor_phone,
         u_sup.email        AS supervisor_email
       FROM delivery_assignments da
       JOIN vehicles v   ON da.vehicle_id    = v.vehicle_id
       JOIN users u_drv  ON da.driver_id     = u_drv.user_id
       JOIN users u_sup  ON da.supervisor_id = u_sup.user_id
       WHERE da.delivery_id = ? AND da.tenant_id = ? ${driverFilter}`,
      hParams
    );

    if (!assignment.length)
      return res.status(404).json({ success: false, message: "Delivery not found or access denied" });

    // All items with full order context + damage reports
    const [items] = await pool.query(
      `SELECT
         di.delivery_item_id,
         di.delivery_status,
         di.proof_url,
         di.delivered_at,
         oi.item_id,
         oi.product_name,
         oi.quantity,
         oi.is_fragile,
         o.order_id,
         o.order_reference,
         o.customer_name,
         o.customer_address,
         o.pincode,
         dr.damage_id,
         dr.description  AS damage_description,
         dr.evidence_url AS damage_evidence_url,
         dr.reported_at  AS damage_reported_at
       FROM delivery_items di
       JOIN order_items oi ON di.item_id  = oi.item_id
       JOIN orders o       ON oi.order_id = o.order_id
       LEFT JOIN damage_reports dr ON dr.delivery_item_id = di.delivery_item_id
       WHERE di.delivery_id = ?
       ORDER BY o.order_reference, oi.product_name`,
      [deliveryId]
    );

    res.json({ success: true, assignment: assignment[0], items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch assignment details", error: error.message });
  }
});

// ─── 4. START DELIVERY (ASSIGNED → IN_TRANSIT) ─────────────────
//        PATCH /api/driver-delivery/start/:deliveryId
//        Body: { departure_time }  (ISO string from driver)
router.patch("/start/:deliveryId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { user_id, tenant_id, role } = req.user;
    const { deliveryId }   = req.params;
    const { departure_time } = req.body;

    if (role !== "user")
      return res.status(403).json({ success: false, message: "Only drivers can start a delivery" });

    await connection.beginTransaction();

    // Verify it's theirs and currently ASSIGNED
    const [check] = await connection.query(
      `SELECT da.delivery_id, da.status, da.vehicle_id, da.driver_id
       FROM delivery_assignments da
       WHERE da.delivery_id = ? AND da.tenant_id = ? AND da.driver_id = ?`,
      [deliveryId, tenant_id, user_id]
    );

    if (!check.length)
      return res.status(404).json({ success: false, message: "Delivery not found or not assigned to you" });

    if (check[0].status !== "ASSIGNED") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Cannot start a delivery that is already ${check[0].status}` });
    }

    // Update delivery status → IN_TRANSIT
    await connection.query(
      "UPDATE delivery_assignments SET status = 'IN_TRANSIT' WHERE delivery_id = ?",
      [deliveryId]
    );

    // Ensure vehicle and driver statuses are correct
    await connection.query(
      "UPDATE vehicles SET status = 'IN_USE' WHERE vehicle_id = ?",
      [check[0].vehicle_id]
    );
    await connection.query(
      "UPDATE users SET driver_status = 'IN_DELIVERY' WHERE user_id = ?",
      [user_id]
    );

    // Audit log with departure time note
    const note = departure_time
      ? `STARTED_DELIVERY departure=${departure_time}`
      : "STARTED_DELIVERY";
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, note, "delivery_assignments", deliveryId]
    );

    await connection.commit();
    res.json({ success: true, message: "Delivery started! Status changed to In Transit." });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to start delivery", error: error.message });
  } finally {
    connection.release();
  }
});

// ─── 5. UPDATE SINGLE ITEM STATUS + PROOF UPLOAD ───────────────
//        PATCH /api/driver-delivery/update-item/:deliveryItemId
//        multipart/form-data: { status, proof } (proof = image/pdf file)
router.patch(
  "/update-item/:deliveryItemId",
  upload.single("proof"),
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { user_id, tenant_id, role } = req.user;
      const { deliveryItemId } = req.params;
      const { status }         = req.body;

      if (!["user", "admin", "supervisor"].includes(role))
        return res.status(403).json({ success: false, message: "Access denied" });

      const validStatuses = ["PENDING", "DELIVERED", "DAMAGED"];
      if (!validStatuses.includes(status))
        return res.status(400).json({ success: false, message: "Invalid status. Must be PENDING, DELIVERED, or DAMAGED" });

      await connection.beginTransaction();

      // Verify item belongs to this driver's delivery under this tenant
      const driverFilter = role === "user" ? "AND da.driver_id = ?" : "";
      const verifyParams = role === "user"
        ? [deliveryItemId, tenant_id, user_id]
        : [deliveryItemId, tenant_id];

      const [itemCheck] = await connection.query(
        `SELECT di.delivery_item_id, di.delivery_status AS item_status,
                da.delivery_id, da.status AS delivery_status, da.tenant_id
         FROM delivery_items di
         JOIN delivery_assignments da ON di.delivery_id = da.delivery_id
         WHERE di.delivery_item_id = ? AND da.tenant_id = ? ${driverFilter}`,
        verifyParams
      );

      if (!itemCheck.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: "Item not found or access denied" });
      }

      const item = itemCheck[0];

      // Cannot update items on a finalized delivery
      if (["DELIVERED", "PARTIALLY_DELIVERED"].includes(item.delivery_status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Cannot update items on a finalized delivery" });
      }

      // Build proof URL if file was uploaded
      let proofUrl = null;
      if (req.file) {
        proofUrl = `/uploads/delivery-proofs/${req.file.filename}`;
      }

      const deliveredAt = status === "DELIVERED" ? new Date() : null;

      // Update delivery_items
      if (proofUrl) {
        await connection.query(
          "UPDATE delivery_items SET delivery_status = ?, proof_url = ?, delivered_at = ? WHERE delivery_item_id = ?",
          [status, proofUrl, deliveredAt, deliveryItemId]
        );
      } else {
        await connection.query(
          "UPDATE delivery_items SET delivery_status = ?, delivered_at = ? WHERE delivery_item_id = ?",
          [status, deliveredAt, deliveryItemId]
        );
      }

      // Audit
      await connection.query(
        "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
        [tenant_id, user_id, `DRIVER_UPDATE_ITEM_TO_${status}`, "delivery_items", deliveryItemId]
      );

      await connection.commit();
      res.json({
        success: true,
        message: `Item marked as ${status}`,
        proof_url: proofUrl,
        delivered_at: deliveredAt,
      });
    } catch (error) {
      await connection.rollback();
      // Delete uploaded file if DB operation failed
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      res.status(500).json({ success: false, message: "Failed to update item status", error: error.message });
    } finally {
      connection.release();
    }
  }
);

// ─── 6. REPORT DAMAGE ──────────────────────────────────────────
//        POST /api/driver-delivery/report-damage/:deliveryItemId
//        multipart/form-data: { description, evidence } (evidence = image/pdf)
router.post(
  "/report-damage/:deliveryItemId",
  upload.single("evidence"),
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { user_id, tenant_id, role } = req.user;
      const { deliveryItemId } = req.params;
      const { description }    = req.body;

      if (!["user", "admin", "supervisor"].includes(role))
        return res.status(403).json({ success: false, message: "Access denied" });

      if (!description?.trim())
        return res.status(400).json({ success: false, message: "Damage description is required" });

      await connection.beginTransaction();

      // Verify item belongs to this driver under tenant
      const driverFilter = role === "user" ? "AND da.driver_id = ?" : "";
      const verifyParams = role === "user"
        ? [deliveryItemId, tenant_id, user_id]
        : [deliveryItemId, tenant_id];

      const [itemCheck] = await connection.query(
        `SELECT di.delivery_item_id, di.delivery_status AS item_status,
                da.delivery_id, da.status AS delivery_status
         FROM delivery_items di
         JOIN delivery_assignments da ON di.delivery_id = da.delivery_id
         WHERE di.delivery_item_id = ? AND da.tenant_id = ? ${driverFilter}`,
        verifyParams
      );

      if (!itemCheck.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: "Item not found or access denied" });
      }

      if (["DELIVERED", "PARTIALLY_DELIVERED"].includes(itemCheck[0].delivery_status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Cannot report damage on a finalized delivery" });
      }

      // Build evidence URL
      let evidenceUrl = null;
      if (req.file) {
        evidenceUrl = `/uploads/delivery-proofs/${req.file.filename}`;
      }

      // Check if damage report already exists for this item
      const [existing] = await connection.query(
        "SELECT damage_id FROM damage_reports WHERE delivery_item_id = ?",
        [deliveryItemId]
      );

      if (existing.length) {
        // Update existing report
        await connection.query(
          `UPDATE damage_reports
           SET description = ?, evidence_url = COALESCE(?, evidence_url), reported_at = NOW(), reported_by = ?
           WHERE delivery_item_id = ?`,
          [description.trim(), evidenceUrl, user_id, deliveryItemId]
        );
      } else {
        // Create new damage report
        await connection.query(
          `INSERT INTO damage_reports (delivery_item_id, reported_by, description, evidence_url, reported_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [deliveryItemId, user_id, description.trim(), evidenceUrl]
        );
      }

      // Auto-mark item as DAMAGED in delivery_items
      await connection.query(
        "UPDATE delivery_items SET delivery_status = 'DAMAGED' WHERE delivery_item_id = ?",
        [deliveryItemId]
      );

      // Audit
      await connection.query(
        "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
        [tenant_id, user_id, "DRIVER_REPORT_DAMAGE", "delivery_items", deliveryItemId]
      );

      await connection.commit();
      res.json({
        success: true,
        message: "Damage reported successfully. Item marked as Damaged.",
        evidence_url: evidenceUrl,
      });
    } catch (error) {
      await connection.rollback();
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ success: false, message: "Failed to report damage", error: error.message });
    } finally {
      connection.release();
    }
  }
);

// ─── 7. REQUEST DELIVERY APPROVAL (driver → supervisor) ────────
//        PATCH /api/driver-delivery/request-approval/:deliveryId
//        This marks all items as updated and notifies (via audit) that
//        supervisor review is needed. Actual final status is set by supervisor.
router.patch("/request-approval/:deliveryId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { user_id, tenant_id, role } = req.user;
    const { deliveryId } = req.params;

    if (role !== "user")
      return res.status(403).json({ success: false, message: "Only drivers can request delivery approval" });

    await connection.beginTransaction();

    // Verify ownership and status
    const [check] = await connection.query(
      `SELECT da.delivery_id, da.status
       FROM delivery_assignments da
       WHERE da.delivery_id = ? AND da.tenant_id = ? AND da.driver_id = ?`,
      [deliveryId, tenant_id, user_id]
    );

    if (!check.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    if (!["IN_TRANSIT"].includes(check[0].status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Delivery must be IN_TRANSIT to request approval" });
    }

    // Check all items are resolved (none PENDING)
    const [pendingCheck] = await connection.query(
      `SELECT COUNT(*) AS pending_count
       FROM delivery_items
       WHERE delivery_id = ? AND delivery_status = 'PENDING'`,
      [deliveryId]
    );

    if (pendingCheck[0].pending_count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `${pendingCheck[0].pending_count} item(s) still pending. Update all items before requesting approval.`,
      });
    }

    // Audit log — supervisor will see this and take action
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, "DRIVER_REQUEST_DELIVERY_APPROVAL", "delivery_assignments", deliveryId]
    );

    await connection.commit();
    res.json({
      success: true,
      message: "Approval request sent to supervisor. They will verify and finalize the delivery.",
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to send approval request", error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;