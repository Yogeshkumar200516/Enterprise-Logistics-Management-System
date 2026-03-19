// src/routes/scrapLogStatusRoutes.js
//
// REGISTRATION in server.js:
//   const scrapLogRoutes = require('./src/routes/scrapLogStatusRoutes');
//   app.use('/api/scrap-log', authenticateToken, scrapLogRoutes);
//
// ROLE ACCESS: admin + supervisor
//
// WORKFLOW:
//   Supervisor creates scrap run (ASSIGNED) →
//   Driver starts run (IN_TRANSIT) →
//   Driver updates per-item statuses →
//   Driver requests approval (COMPLETED) →
//   Supervisor approves/rejects (APPROVED | REJECTED)
//
// SCRAP TYPES:
//   INTERNAL — standalone pickup; needs pickup_address / pickup_pincode
//   CUSTOMER — exchange at customer site after delivery; needs delivery_item_id(s)

const express    = require("express");
const router     = express.Router();
const pool       = require("../config/config");

// ─────────────────────────────────────────────────────────────
// 1. GET AVAILABLE VEHICLES
//    GET /api/scrap-log/available-vehicles
// ─────────────────────────────────────────────────────────────
router.get("/available-vehicles", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [vehicles] = await pool.query(
      `SELECT vehicle_id, vehicle_type, vehicle_number, capacity, is_temporary, status
       FROM vehicles
       WHERE tenant_id = ? AND status = 'AVAILABLE'
       ORDER BY is_temporary ASC, vehicle_number ASC`,
      [tenant_id]
    );
    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch available vehicles", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. GET AVAILABLE DRIVERS
//    GET /api/scrap-log/available-drivers
// ─────────────────────────────────────────────────────────────
router.get("/available-drivers", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [drivers] = await pool.query(
      `SELECT user_id, full_name, username, phone_number,
              license_number, vehicle_type, driver_status, is_external_driver
       FROM users
       WHERE tenant_id = ?
         AND role = 'user'
         AND status = 'ACTIVE'
         AND driver_status = 'AVAILABLE'
       ORDER BY is_external_driver ASC, full_name ASC`,
      [tenant_id]
    );
    res.json({ success: true, drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch available drivers", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. GET DELIVERED ITEMS ELIGIBLE FOR CUSTOMER-EXCHANGE SCRAP
//    GET /api/scrap-log/customer-exchange-items
//    Returns delivery items that are DELIVERED or IN_TRANSIT so
//    supervisor can tag them as exchange scrap.
// ─────────────────────────────────────────────────────────────
router.get("/customer-exchange-items", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [items] = await pool.query(
      `SELECT
         di.delivery_item_id,
         di.delivery_status,
         oi.item_id,
         oi.product_name,
         oi.quantity,
         o.order_id,
         o.order_reference,
         o.customer_name,
         o.customer_address,
         o.pincode,
         da.delivery_id,
         u.full_name AS driver_name
       FROM delivery_items di
       JOIN order_items oi ON di.item_id      = oi.item_id
       JOIN orders o       ON oi.order_id     = o.order_id
       JOIN delivery_assignments da ON di.delivery_id = da.delivery_id
       JOIN users u        ON da.driver_id    = u.user_id
       WHERE da.tenant_id = ?
         AND di.delivery_status IN ('PENDING')
         AND da.status IN ('ASSIGNED','IN_TRANSIT','DELIVERED','PARTIALLY_DELIVERED')
       ORDER BY o.order_reference DESC`,
      [tenant_id]
    );
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch customer exchange items", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. CREATE SCRAP RUN (supervisor assigns driver + vehicle)
//    POST /api/scrap-log/create-run
//
//  Body for INTERNAL scrap:
//    { vehicle_id, driver_id, source: "INTERNAL",
//      pickup_address, pickup_pincode, collection_notes,
//      scrap_items: [{ item_description, quantity }] }
//
//  Body for CUSTOMER-exchange scrap:
//    { vehicle_id, driver_id, source: "CUSTOMER",
//      scrap_items: [{ item_description, quantity, delivery_item_id }] }
//
//  scrap_type is derived from the first item description or passed explicitly.
// ─────────────────────────────────────────────────────────────
router.post("/create-run", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tenant_id, user_id: supervisor_id, role } = req.user;
    const {
      vehicle_id,
      driver_id,
      source,
      scrap_type,
      pickup_address,
      pickup_pincode,
      collection_notes,
      scrap_items,       // Array: [{ item_description, quantity, delivery_item_id? }]
    } = req.body;

    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    // ── Validate required fields ──────────────────────────────
    if (!vehicle_id || !driver_id || !source)
      return res.status(400).json({ success: false, message: "vehicle_id, driver_id, and source are required" });

    if (!["INTERNAL", "CUSTOMER"].includes(source))
      return res.status(400).json({ success: false, message: "source must be INTERNAL or CUSTOMER" });

    if (source === "INTERNAL" && !pickup_address)
      return res.status(400).json({ success: false, message: "pickup_address is required for INTERNAL scrap" });

    if (!Array.isArray(scrap_items) || scrap_items.length === 0)
      return res.status(400).json({ success: false, message: "At least one scrap item is required" });

    if (source === "CUSTOMER") {
      const missingLink = scrap_items.some(i => !i.delivery_item_id);
      if (missingLink)
        return res.status(400).json({ success: false, message: "Each CUSTOMER scrap item must have a delivery_item_id" });
    }

    await connection.beginTransaction();

    // ── Verify vehicle is AVAILABLE ───────────────────────────
    const [vc] = await connection.query(
      "SELECT status FROM vehicles WHERE vehicle_id = ? AND tenant_id = ?",
      [vehicle_id, tenant_id]
    );
    if (!vc.length || vc[0].status !== "AVAILABLE") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Vehicle is not available" });
    }

    // ── Verify driver is AVAILABLE ────────────────────────────
    const [dc] = await connection.query(
      "SELECT driver_status FROM users WHERE user_id = ? AND tenant_id = ? AND role = 'user'",
      [driver_id, tenant_id]
    );
    if (!dc.length || dc[0].driver_status !== "AVAILABLE") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Driver is not available" });
    }

    // ── Verify delivery_item_ids for CUSTOMER scraps ──────────
    if (source === "CUSTOMER") {
      const deliveryItemIds = scrap_items.map(i => i.delivery_item_id);
      const [diCheck] = await connection.query(
        `SELECT di.delivery_item_id
         FROM delivery_items di
         JOIN delivery_assignments da ON di.delivery_id = da.delivery_id
         WHERE di.delivery_item_id IN (?)
           AND da.tenant_id = ?`,
        [deliveryItemIds, tenant_id]
      );
      if (diCheck.length !== deliveryItemIds.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: "One or more delivery items not found or access denied" });
      }
    }

    // ── Compute total quantity ────────────────────────────────
    const totalQty = scrap_items.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0);

    // ── Insert scrap_logs header row ──────────────────────────
    const [scrapResult] = await connection.query(
      `INSERT INTO scrap_logs
         (tenant_id, vehicle_id, driver_id, supervisor_id, collected_by,
          scrap_type, quantity, source,
          pickup_address, pickup_pincode, collection_notes,
          delivery_item_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', NOW())`,
      [
        tenant_id,
        vehicle_id,
        driver_id,
        supervisor_id,
        driver_id,                              // collected_by = driver_id (kept for compat)
        scrap_type || scrap_items[0].item_description,
        totalQty,
        source,
        source === "INTERNAL" ? pickup_address  : null,
        source === "INTERNAL" ? pickup_pincode  : null,
        source === "INTERNAL" ? collection_notes : null,
        source === "CUSTOMER" ? scrap_items[0].delivery_item_id : null, // header-level for compat
      ]
    );
    const scrap_id = scrapResult.insertId;

    // ── Insert scrap_items (per-item tracking) ────────────────
    const itemValues = scrap_items.map(item => [
      scrap_id,
      item.item_description,
      parseInt(item.quantity) || 1,
      item.delivery_item_id || null,
      "PENDING",
    ]);
    await connection.query(
      `INSERT INTO scrap_items
         (scrap_id, item_description, quantity, delivery_item_id, collection_status)
       VALUES ?`,
      [itemValues]
    );

    // ── Mark vehicle IN_USE and driver IN_DELIVERY ────────────
    await connection.query("UPDATE vehicles SET status = 'IN_USE' WHERE vehicle_id = ?", [vehicle_id]);
    await connection.query("UPDATE users SET driver_status = 'IN_DELIVERY' WHERE user_id = ?", [driver_id]);

    // ── Audit ─────────────────────────────────────────────────
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, supervisor_id, "CREATE_SCRAP_RUN", "scrap_logs", scrap_id]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: "Scrap run created successfully",
      scrap_id,
      total_items: scrap_items.length,
      total_quantity: totalQty,
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to create scrap run", error: error.message });
  } finally {
    connection.release();
  }
});

// ─────────────────────────────────────────────────────────────
// 5. GET ALL SCRAP RUNS (supervisor dashboard list)
//    GET /api/scrap-log/runs
// ─────────────────────────────────────────────────────────────
router.get("/runs", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [runs] = await pool.query(
      `SELECT
         sl.scrap_id,
         sl.scrap_type,
         sl.quantity       AS total_quantity,
         sl.source,
         sl.status,
         sl.created_at,
         sl.pickup_address,
         sl.pickup_pincode,
         sl.departure_time,
         sl.completed_at,
         v.vehicle_id,
         v.vehicle_number,
         v.vehicle_type,
         u_drv.user_id    AS driver_id,
         u_drv.full_name  AS driver_name,
         u_drv.phone_number AS driver_phone,
         u_sup.full_name  AS supervisor_name,
         COUNT(si.scrap_item_id)                                                 AS total_items,
         SUM(CASE WHEN si.collection_status = 'COLLECTED' THEN 1 ELSE 0 END)     AS collected_items,
         SUM(CASE WHEN si.collection_status = 'DAMAGED'   THEN 1 ELSE 0 END)     AS damaged_items,
         SUM(CASE WHEN si.collection_status = 'PENDING'   THEN 1 ELSE 0 END)     AS pending_items
       FROM scrap_logs sl
       JOIN vehicles v      ON sl.vehicle_id    = v.vehicle_id
       JOIN users u_drv     ON sl.driver_id     = u_drv.user_id
       JOIN users u_sup     ON sl.supervisor_id = u_sup.user_id
       LEFT JOIN scrap_items si ON sl.scrap_id  = si.scrap_id
       WHERE sl.tenant_id = ?
       GROUP BY
         sl.scrap_id, sl.scrap_type, sl.quantity, sl.source, sl.status,
         sl.created_at, sl.pickup_address, sl.pickup_pincode,
         sl.departure_time, sl.completed_at,
         v.vehicle_id, v.vehicle_number, v.vehicle_type,
         u_drv.user_id, u_drv.full_name, u_drv.phone_number, u_sup.full_name
       ORDER BY sl.created_at DESC`,
      [tenant_id]
    );
    res.json({ success: true, runs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch scrap runs", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. GET SCRAP RUN STATS
//    GET /api/scrap-log/stats
// ─────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [rows] = await pool.query(
      `SELECT
         COUNT(*)                                                          AS total,
         SUM(CASE WHEN status = 'ASSIGNED'   THEN 1 ELSE 0 END)           AS assigned,
         SUM(CASE WHEN status = 'IN_TRANSIT' THEN 1 ELSE 0 END)           AS in_transit,
         SUM(CASE WHEN status = 'COMPLETED'  THEN 1 ELSE 0 END)           AS completed,
         SUM(CASE WHEN status = 'APPROVED'   THEN 1 ELSE 0 END)           AS approved,
         SUM(CASE WHEN status = 'REJECTED'   THEN 1 ELSE 0 END)           AS rejected,
         SUM(CASE WHEN source  = 'INTERNAL'  THEN 1 ELSE 0 END)           AS internal_runs,
         SUM(CASE WHEN source  = 'CUSTOMER'  THEN 1 ELSE 0 END)           AS customer_runs
       FROM scrap_logs
       WHERE tenant_id = ?`,
      [tenant_id]
    );
    res.json({ success: true, stats: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. GET SCRAP RUN DETAIL (for modal)
//    GET /api/scrap-log/run/:scrapId
// ─────────────────────────────────────────────────────────────
router.get("/run/:scrapId", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    const { scrapId } = req.params;
    if (!["admin", "supervisor", "user"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    // Header
    const [runs] = await pool.query(
      `SELECT
         sl.scrap_id, sl.scrap_type, sl.quantity, sl.source, sl.status,
         sl.pickup_address, sl.pickup_pincode, sl.collection_notes,
         sl.departure_time, sl.completed_at, sl.created_at,
         v.vehicle_id, v.vehicle_number, v.vehicle_type, v.capacity, v.is_temporary,
         u_drv.user_id      AS driver_id,
         u_drv.full_name    AS driver_name,
         u_drv.phone_number AS driver_phone,
         u_drv.email        AS driver_email,
         u_sup.full_name    AS supervisor_name,
         u_sup.phone_number AS supervisor_phone,
         u_sup.email        AS supervisor_email
       FROM scrap_logs sl
       JOIN vehicles v   ON sl.vehicle_id    = v.vehicle_id
       JOIN users u_drv  ON sl.driver_id     = u_drv.user_id
       JOIN users u_sup  ON sl.supervisor_id = u_sup.user_id
       WHERE sl.scrap_id = ? AND sl.tenant_id = ?`,
      [scrapId, tenant_id]
    );
    if (!runs.length)
      return res.status(404).json({ success: false, message: "Scrap run not found" });

    // All scrap items with optional delivery context
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
    res.status(500).json({ success: false, message: "Failed to fetch scrap run details", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. APPROVE OR REJECT A SCRAP RUN (COMPLETED → APPROVED | REJECTED)
//    PATCH /api/scrap-log/finalize/:scrapId
//    Body: { status: "APPROVED" | "REJECTED" }
// ─────────────────────────────────────────────────────────────
router.patch("/finalize/:scrapId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tenant_id, user_id, role } = req.user;
    const { scrapId } = req.params;
    const { status }  = req.body;

    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    if (!["APPROVED", "REJECTED"].includes(status))
      return res.status(400).json({ success: false, message: "status must be APPROVED or REJECTED" });

    await connection.beginTransaction();

    const [sc] = await connection.query(
      "SELECT scrap_id, vehicle_id, driver_id, status AS current_status FROM scrap_logs WHERE scrap_id = ? AND tenant_id = ?",
      [scrapId, tenant_id]
    );
    if (!sc.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Scrap run not found" });
    }

    if (sc[0].current_status !== "COMPLETED") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Only COMPLETED scrap runs can be approved or rejected" });
    }

    // Update scrap run status
    await connection.query(
      "UPDATE scrap_logs SET status = ? WHERE scrap_id = ?",
      [status, scrapId]
    );

    // Free vehicle and driver regardless of approve/reject
    await connection.query("UPDATE vehicles SET status = 'AVAILABLE' WHERE vehicle_id = ?", [sc[0].vehicle_id]);
    await connection.query("UPDATE users SET driver_status = 'AVAILABLE' WHERE user_id = ?", [sc[0].driver_id]);

    // Audit
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, `SCRAP_RUN_${status}`, "scrap_logs", scrapId]
    );

    await connection.commit();
    res.json({ success: true, message: `Scrap run ${status.toLowerCase()} successfully` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to finalize scrap run", error: error.message });
  } finally {
    connection.release();
  }
});

// ─────────────────────────────────────────────────────────────
// 9. UPDATE SCRAP ITEM STATUS (supervisor override if needed)
//    PATCH /api/scrap-log/item/:scrapItemId
//    Body: { collection_status: "PENDING" | "COLLECTED" | "DAMAGED" }
// ─────────────────────────────────────────────────────────────
router.patch("/item/:scrapItemId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tenant_id, user_id, role } = req.user;
    const { scrapItemId } = req.params;
    const { collection_status } = req.body;

    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const valid = ["PENDING", "COLLECTED", "DAMAGED"];
    if (!valid.includes(collection_status))
      return res.status(400).json({ success: false, message: "Invalid collection_status" });

    await connection.beginTransaction();

    // Verify item belongs to a scrap run under this tenant
    const [check] = await connection.query(
      `SELECT si.scrap_item_id, sl.scrap_id, sl.status AS run_status
       FROM scrap_items si
       JOIN scrap_logs sl ON si.scrap_id = sl.scrap_id
       WHERE si.scrap_item_id = ? AND sl.tenant_id = ?`,
      [scrapItemId, tenant_id]
    );
    if (!check.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Scrap item not found" });
    }

    if (["APPROVED", "REJECTED"].includes(check[0].run_status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Cannot modify items on a finalized scrap run" });
    }

    const collectedAt = collection_status === "COLLECTED" ? new Date() : null;
    await connection.query(
      "UPDATE scrap_items SET collection_status = ?, collected_at = ? WHERE scrap_item_id = ?",
      [collection_status, collectedAt, scrapItemId]
    );

    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, `SUPERVISOR_UPDATE_SCRAP_ITEM_TO_${collection_status}`, "scrap_items", scrapItemId]
    );

    await connection.commit();
    res.json({ success: true, message: `Scrap item status updated to ${collection_status}` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to update scrap item", error: error.message });
  } finally {
    connection.release();
  }
});

// ─────────────────────────────────────────────────────────────
// 10. DELETE SCRAP RUN (only if still ASSIGNED — not started)
//     DELETE /api/scrap-log/run/:scrapId
// ─────────────────────────────────────────────────────────────
router.delete("/run/:scrapId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tenant_id, user_id, role } = req.user;
    const { scrapId } = req.params;

    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    await connection.beginTransaction();

    const [sc] = await connection.query(
      "SELECT scrap_id, vehicle_id, driver_id, status FROM scrap_logs WHERE scrap_id = ? AND tenant_id = ?",
      [scrapId, tenant_id]
    );
    if (!sc.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Scrap run not found" });
    }

    if (sc[0].status !== "ASSIGNED") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Only ASSIGNED (not yet started) scrap runs can be deleted" });
    }

    // Free vehicle and driver
    await connection.query("UPDATE vehicles SET status = 'AVAILABLE' WHERE vehicle_id = ?", [sc[0].vehicle_id]);
    await connection.query("UPDATE users SET driver_status = 'AVAILABLE' WHERE user_id = ?", [sc[0].driver_id]);

    // scrap_items cascade-delete via FK
    await connection.query("DELETE FROM scrap_logs WHERE scrap_id = ?", [scrapId]);

    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, "DELETE_SCRAP_RUN", "scrap_logs", scrapId]
    );

    await connection.commit();
    res.json({ success: true, message: "Scrap run deleted successfully" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to delete scrap run", error: error.message });
  } finally {
    connection.release();
  }
});

// ─────────────────────────────────────────────────────────────
// 11. ALL VEHICLES for filter dropdown
//     GET /api/scrap-log/all-vehicles
// ─────────────────────────────────────────────────────────────
router.get("/all-vehicles", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [vehicles] = await pool.query(
      "SELECT vehicle_id, vehicle_number, vehicle_type FROM vehicles WHERE tenant_id = ? ORDER BY vehicle_number ASC",
      [tenant_id]
    );
    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch vehicles", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 12. ALL DRIVERS for filter dropdown
//     GET /api/scrap-log/all-drivers
// ─────────────────────────────────────────────────────────────
router.get("/all-drivers", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [drivers] = await pool.query(
      `SELECT user_id, full_name, phone_number
       FROM users
       WHERE tenant_id = ? AND role = 'user' AND status = 'ACTIVE'
       ORDER BY full_name ASC`,
      [tenant_id]
    );
    res.json({ success: true, drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch drivers", error: error.message });
  }
});

module.exports = router;