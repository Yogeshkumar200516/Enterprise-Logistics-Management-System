// src/routes/scrapDriverRoutes.js
//
// REGISTRATION in server.js:
//   const driverScrapRoutes = require('./src/routes/scrapDriverRoutes');
//   app.use('/api/driver-scrap', authenticateToken, driverScrapRoutes);
//
// ROLE ACCESS:
//   role = 'user'  (driver)      — sees only their own runs
//   role = 'admin'|'supervisor'  — can view any run for the tenant
//
// DRIVER WORKFLOW:
//   1. View assigned scrap runs           GET  /my-assignments
//   2. View stats summary cards           GET  /my-stats
//   3. View run detail + items            GET  /assignment/:scrapId
//   4. Start the run (ASSIGNED→IN_TRANSIT)PATCH /start/:scrapId
//   5. Update each item status + proof    PATCH /update-item/:scrapItemId
//   6. Request approval (all items done)  PATCH /request-approval/:scrapId

const express = require("express");
const router  = express.Router();
const pool    = require("../config/config");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

// ─── Multer config for scrap proof uploads ────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/scrap-proofs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `scrap_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
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

// ─────────────────────────────────────────────────────────────
// 1. GET MY SCRAP ASSIGNMENTS (driver's run list)
//    GET /api/driver-scrap/my-assignments
// ─────────────────────────────────────────────────────────────
router.get("/my-assignments", async (req, res) => {
  try {
    const { user_id, tenant_id, role } = req.user;

    if (!["user", "admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const driverFilter = role === "user" ? "AND sl.driver_id = ?" : "";
    const params       = role === "user" ? [tenant_id, user_id] : [tenant_id];

    const [assignments] = await pool.query(
      `SELECT
         sl.scrap_id,
         sl.scrap_type,
         sl.quantity         AS total_quantity,
         sl.source,
         sl.status,
         sl.created_at,
         sl.departure_time,
         sl.completed_at,
         sl.pickup_address,
         sl.pickup_pincode,
         sl.collection_notes,
         v.vehicle_id,
         v.vehicle_number,
         v.vehicle_type,
         v.capacity,
         u_sup.full_name     AS supervisor_name,
         u_sup.phone_number  AS supervisor_phone,
         COUNT(si.scrap_item_id)                                               AS total_items,
         SUM(CASE WHEN si.collection_status = 'COLLECTED' THEN 1 ELSE 0 END)  AS collected_items,
         SUM(CASE WHEN si.collection_status = 'DAMAGED'   THEN 1 ELSE 0 END)  AS damaged_items,
         SUM(CASE WHEN si.collection_status = 'PENDING'   THEN 1 ELSE 0 END)  AS pending_items
       FROM scrap_logs sl
       JOIN vehicles v      ON sl.vehicle_id    = v.vehicle_id
       JOIN users u_sup     ON sl.supervisor_id = u_sup.user_id
       LEFT JOIN scrap_items si ON sl.scrap_id  = si.scrap_id
       WHERE sl.tenant_id = ? ${driverFilter}
       GROUP BY
         sl.scrap_id, sl.scrap_type, sl.quantity, sl.source, sl.status,
         sl.created_at, sl.departure_time, sl.completed_at,
         sl.pickup_address, sl.pickup_pincode, sl.collection_notes,
         v.vehicle_id, v.vehicle_number, v.vehicle_type, v.capacity,
         u_sup.full_name, u_sup.phone_number
       ORDER BY sl.created_at DESC`,
      params
    );

    res.json({ success: true, assignments });
  } catch (error) {
    console.error("driver-scrap my-assignments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch scrap assignments", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. GET MY SCRAP STATS
//    GET /api/driver-scrap/my-stats
// ─────────────────────────────────────────────────────────────
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
         SUM(CASE WHEN status = 'ASSIGNED'   THEN 1 ELSE 0 END)           AS assigned,
         SUM(CASE WHEN status = 'IN_TRANSIT' THEN 1 ELSE 0 END)           AS in_transit,
         SUM(CASE WHEN status = 'COMPLETED'  THEN 1 ELSE 0 END)           AS completed,
         SUM(CASE WHEN status = 'APPROVED'   THEN 1 ELSE 0 END)           AS approved,
         SUM(CASE WHEN status = 'REJECTED'   THEN 1 ELSE 0 END)           AS rejected,
         SUM(CASE WHEN source  = 'INTERNAL'  THEN 1 ELSE 0 END)           AS internal_count,
         SUM(CASE WHEN source  = 'CUSTOMER'  THEN 1 ELSE 0 END)           AS customer_count
       FROM scrap_logs
       WHERE tenant_id = ? ${driverFilter}`,
      params
    );

    res.json({ success: true, stats: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. GET SCRAP ASSIGNMENT DETAIL
//    GET /api/driver-scrap/assignment/:scrapId
// ─────────────────────────────────────────────────────────────
router.get("/assignment/:scrapId", async (req, res) => {
  try {
    const { user_id, tenant_id, role } = req.user;
    const { scrapId } = req.params;

    if (!["user", "admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const driverFilter = role === "user" ? "AND sl.driver_id = ?" : "";
    const hParams      = role === "user"
      ? [scrapId, tenant_id, user_id]
      : [scrapId, tenant_id];

    // ── Header ──────────────────────────────────────────────
    const [runs] = await pool.query(
      `SELECT
         sl.scrap_id, sl.scrap_type, sl.quantity, sl.source, sl.status,
         sl.pickup_address, sl.pickup_pincode, sl.collection_notes,
         sl.departure_time, sl.completed_at, sl.created_at,
         v.vehicle_id, v.vehicle_number, v.vehicle_type, v.capacity, v.is_temporary,
         u_drv.user_id      AS driver_id,
         u_drv.full_name    AS driver_name,
         u_drv.phone_number AS driver_phone,
         u_sup.full_name    AS supervisor_name,
         u_sup.phone_number AS supervisor_phone,
         u_sup.email        AS supervisor_email
       FROM scrap_logs sl
       JOIN vehicles v   ON sl.vehicle_id    = v.vehicle_id
       JOIN users u_drv  ON sl.driver_id     = u_drv.user_id
       JOIN users u_sup  ON sl.supervisor_id = u_sup.user_id
       WHERE sl.scrap_id = ? AND sl.tenant_id = ? ${driverFilter}`,
      hParams
    );

    if (!runs.length)
      return res.status(404).json({ success: false, message: "Scrap assignment not found or access denied" });

    // ── Items with full delivery context if CUSTOMER ────────
    const [items] = await pool.query(
      `SELECT
         si.scrap_item_id,
         si.item_description,
         si.quantity,
         si.collection_status,
         si.proof_url,
         si.collected_at,
         si.notes,
         si.delivery_item_id,
         di.delivery_status  AS linked_delivery_status,
         oi.product_name     AS linked_product_name,
         o.order_id,
         o.order_reference,
         o.customer_name,
         o.customer_address,
         o.pincode
       FROM scrap_items si
       LEFT JOIN delivery_items di ON si.delivery_item_id = di.delivery_item_id
       LEFT JOIN order_items oi    ON di.item_id          = oi.item_id
       LEFT JOIN orders o          ON oi.order_id         = o.order_id
       WHERE si.scrap_id = ?
       ORDER BY si.scrap_item_id ASC`,
      [scrapId]
    );

    res.json({ success: true, run: runs[0], items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch scrap assignment details", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. START SCRAP RUN  (ASSIGNED → IN_TRANSIT)
//    PATCH /api/driver-scrap/start/:scrapId
//    Body: { departure_time }  — ISO datetime string from driver's device
// ─────────────────────────────────────────────────────────────
router.patch("/start/:scrapId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { user_id, tenant_id, role } = req.user;
    const { scrapId }      = req.params;
    const { departure_time } = req.body;

    if (role !== "user")
      return res.status(403).json({ success: false, message: "Only drivers can start a scrap run" });

    await connection.beginTransaction();

    const [check] = await connection.query(
      `SELECT scrap_id, status, vehicle_id, driver_id
       FROM scrap_logs
       WHERE scrap_id = ? AND tenant_id = ? AND driver_id = ?`,
      [scrapId, tenant_id, user_id]
    );

    if (!check.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Scrap run not found or not assigned to you" });
    }

    if (check[0].status !== "ASSIGNED") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot start a scrap run that is already ${check[0].status}`,
      });
    }

    // Parse departure time (use NOW() as fallback)
    const depTime = departure_time ? new Date(departure_time) : new Date();

    await connection.query(
      "UPDATE scrap_logs SET status = 'IN_TRANSIT', departure_time = ? WHERE scrap_id = ?",
      [depTime, scrapId]
    );

    // Ensure vehicle + driver statuses are correct
    await connection.query(
      "UPDATE vehicles SET status = 'IN_USE' WHERE vehicle_id = ?",
      [check[0].vehicle_id]
    );
    await connection.query(
      "UPDATE users SET driver_status = 'IN_DELIVERY' WHERE user_id = ?",
      [user_id]
    );

    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, "DRIVER_STARTED_SCRAP_RUN", "scrap_logs", scrapId]
    );

    await connection.commit();
    res.json({ success: true, message: "Scrap run started! Status changed to In Transit." });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to start scrap run", error: error.message });
  } finally {
    connection.release();
  }
});

// ─────────────────────────────────────────────────────────────
// 5. UPDATE SINGLE SCRAP ITEM STATUS + PROOF UPLOAD
//    PATCH /api/driver-scrap/update-item/:scrapItemId
//    multipart/form-data: { collection_status, notes?, proof? }
//    collection_status: PENDING | COLLECTED | DAMAGED
// ─────────────────────────────────────────────────────────────
router.patch(
  "/update-item/:scrapItemId",
  upload.single("proof"),
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { user_id, tenant_id, role } = req.user;
      const { scrapItemId }   = req.params;
      const { collection_status, notes } = req.body;

      if (!["user", "admin", "supervisor"].includes(role))
        return res.status(403).json({ success: false, message: "Access denied" });

      const validStatuses = ["PENDING", "COLLECTED", "DAMAGED"];
      if (!validStatuses.includes(collection_status))
        return res.status(400).json({
          success: false,
          message: "Invalid collection_status. Must be PENDING, COLLECTED, or DAMAGED",
        });

      await connection.beginTransaction();

      // Verify item belongs to this driver's scrap run under this tenant
      const driverFilter = role === "user" ? "AND sl.driver_id = ?" : "";
      const verifyParams = role === "user"
        ? [scrapItemId, tenant_id, user_id]
        : [scrapItemId, tenant_id];

      const [itemCheck] = await connection.query(
        `SELECT si.scrap_item_id, si.collection_status AS item_status,
                sl.scrap_id, sl.status AS run_status, sl.tenant_id
         FROM scrap_items si
         JOIN scrap_logs sl ON si.scrap_id = sl.scrap_id
         WHERE si.scrap_item_id = ? AND sl.tenant_id = ? ${driverFilter}`,
        verifyParams
      );

      if (!itemCheck.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: "Scrap item not found or access denied" });
      }

      const item = itemCheck[0];

      // Cannot update items on a finalized run
      if (["APPROVED", "REJECTED"].includes(item.run_status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Cannot update items on a finalized scrap run" });
      }

      // Must be IN_TRANSIT to update items
      if (item.run_status === "ASSIGNED") {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Please start the scrap run before updating items" });
      }

      // Build proof URL if file was uploaded
      let proofUrl = null;
      if (req.file) {
        proofUrl = `/uploads/scrap-proofs/${req.file.filename}`;
      }

      const collectedAt = collection_status === "COLLECTED" ? new Date() : null;

      // Build update query dynamically based on what changed
      if (proofUrl) {
        await connection.query(
          `UPDATE scrap_items
           SET collection_status = ?, proof_url = ?, collected_at = ?, notes = COALESCE(?, notes)
           WHERE scrap_item_id = ?`,
          [collection_status, proofUrl, collectedAt, notes || null, scrapItemId]
        );
      } else {
        await connection.query(
          `UPDATE scrap_items
           SET collection_status = ?, collected_at = ?, notes = COALESCE(?, notes)
           WHERE scrap_item_id = ?`,
          [collection_status, collectedAt, notes || null, scrapItemId]
        );
      }

      await connection.query(
        "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
        [tenant_id, user_id, `DRIVER_SCRAP_ITEM_${collection_status}`, "scrap_items", scrapItemId]
      );

      await connection.commit();
      res.json({
        success: true,
        message: `Scrap item marked as ${collection_status}`,
        proof_url: proofUrl,
        collected_at: collectedAt,
      });
    } catch (error) {
      await connection.rollback();
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ success: false, message: "Failed to update scrap item status", error: error.message });
    } finally {
      connection.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 6. REQUEST APPROVAL  (all items done → IN_TRANSIT to COMPLETED)
//    PATCH /api/driver-scrap/request-approval/:scrapId
//    Called by driver when all scrap items are COLLECTED or DAMAGED.
//    Supervisor then calls /finalize to APPROVE or REJECT.
// ─────────────────────────────────────────────────────────────
router.patch("/request-approval/:scrapId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { user_id, tenant_id, role } = req.user;
    const { scrapId } = req.params;

    if (role !== "user")
      return res.status(403).json({ success: false, message: "Only drivers can request scrap run approval" });

    await connection.beginTransaction();

    const [check] = await connection.query(
      `SELECT scrap_id, status
       FROM scrap_logs
       WHERE scrap_id = ? AND tenant_id = ? AND driver_id = ?`,
      [scrapId, tenant_id, user_id]
    );

    if (!check.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Scrap run not found" });
    }

    if (check[0].status !== "IN_TRANSIT") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Scrap run must be IN_TRANSIT to request approval",
      });
    }

    // Check all scrap items are resolved (no PENDING left)
    const [pendingCheck] = await connection.query(
      `SELECT COUNT(*) AS pending_count
       FROM scrap_items
       WHERE scrap_id = ? AND collection_status = 'PENDING'`,
      [scrapId]
    );

    if (pendingCheck[0].pending_count > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `${pendingCheck[0].pending_count} item(s) still pending. Mark all items before requesting approval.`,
      });
    }

    // Move run to COMPLETED
    await connection.query(
      "UPDATE scrap_logs SET status = 'COMPLETED', completed_at = NOW() WHERE scrap_id = ?",
      [scrapId]
    );

    // Audit — supervisor will see this and finalize
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, "DRIVER_REQUEST_SCRAP_APPROVAL", "scrap_logs", scrapId]
    );

    await connection.commit();
    res.json({
      success: true,
      message: "Approval request sent to supervisor. They will verify and finalize the scrap run.",
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to send approval request", error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;