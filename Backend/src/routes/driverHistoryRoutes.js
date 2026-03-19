// src/routes/driverHistoryRoutes.js
const express = require("express");
const router  = express.Router();
const pool    = require("../config/config.js");

// ─── Helper ───────────────────────────────────────────────────────────────────
// col MUST include the table alias (e.g. "sl.created_at") when the query has JOINs
function buildDateFilter(period, startDate, endDate, col) {
  if (startDate && endDate) {
    return { clause: `AND DATE(${col}) BETWEEN ? AND ?`, params: [startDate, endDate] };
  }
  switch (period) {
    case "today": return { clause: `AND DATE(${col}) = CURDATE()`,                              params: [] };
    case "week":  return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,   params: [] };
    case "month": return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,  params: [] };
    case "year":  return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 365 DAY)`, params: [] };
    default:      return { clause: "", params: [] }; // "all"
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/driver-history/deliveries
// ─────────────────────────────────────────────────────────────────────────────
router.get("/deliveries", async (req, res) => {
  try {
    const driverId = req.user.user_id;
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate, status, page = 1, limit = 15 } = req.query;

    // Use fully-qualified alias — da.assigned_at is unambiguous
    const df     = buildDateFilter(period, startDate, endDate, "da.assigned_at");
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let extraWhere = "";
    const extraParams = [];
    if (status) { extraWhere += " AND da.status = ?"; extraParams.push(status); }

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM delivery_assignments da
      WHERE da.driver_id = ? AND da.tenant_id = ? ${df.clause} ${extraWhere}
    `, [driverId, tenantId, ...df.params, ...extraParams]);

    const [rows] = await pool.query(`
      SELECT
        da.delivery_id,
        da.status,
        da.assigned_at,
        sv.full_name                                        AS supervisor_name,
        v.vehicle_number,
        v.vehicle_type,
        COUNT(DISTINCT di.delivery_item_id)                 AS total_items,
        COALESCE(SUM(di.delivery_status = 'DELIVERED'), 0)  AS delivered_items,
        COALESCE(SUM(di.delivery_status = 'DAMAGED'),   0)  AS damaged_items,
        COALESCE(SUM(di.delivery_status = 'PENDING'),   0)  AS pending_items,
        COUNT(DISTINCT oi.order_id)                         AS total_orders
      FROM delivery_assignments da
      JOIN users    sv ON sv.user_id   = da.supervisor_id
      JOIN vehicles v  ON v.vehicle_id = da.vehicle_id
      LEFT JOIN delivery_items di ON di.delivery_id = da.delivery_id
      LEFT JOIN order_items    oi ON oi.item_id     = di.item_id
      WHERE da.driver_id = ? AND da.tenant_id = ? ${df.clause} ${extraWhere}
      GROUP BY
        da.delivery_id, da.status, da.assigned_at,
        sv.full_name, v.vehicle_number, v.vehicle_type
      ORDER BY da.assigned_at DESC
      LIMIT ? OFFSET ?
    `, [driverId, tenantId, ...df.params, ...extraParams, parseInt(limit), offset]);

    res.json({ success: true, data: rows, total: Number(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("[driver-history/deliveries]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/driver-history/scraps
// FIX: pass "sl.created_at" — plain "created_at" is ambiguous because
//      scrap_items also has a created_at-like column and we LEFT JOIN it.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/scraps", async (req, res) => {
  try {
    const driverId = req.user.user_id;
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate, status, source, page = 1, limit = 15 } = req.query;

    // ✅ Fully-qualified alias — resolves "Column 'created_at' is ambiguous"
    const df     = buildDateFilter(period, startDate, endDate, "sl.created_at");
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let extraWhere = "";
    const extraParams = [];
    if (status) { extraWhere += " AND sl.status = ?"; extraParams.push(status); }
    if (source) { extraWhere += " AND sl.source = ?"; extraParams.push(source); }

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM scrap_logs sl
      WHERE sl.driver_id = ? AND sl.tenant_id = ? ${df.clause} ${extraWhere}
    `, [driverId, tenantId, ...df.params, ...extraParams]);

    const [rows] = await pool.query(`
      SELECT
        sl.scrap_id,
        sl.status,
        sl.scrap_type,
        sl.source,
        sl.pickup_address,
        sl.pickup_pincode,
        sl.collection_notes,
        sl.departure_time,
        sl.completed_at,
        sl.created_at,
        sv.full_name     AS supervisor_name,
        v.vehicle_number,
        v.vehicle_type,
        COUNT(si.scrap_item_id)                              AS total_items,
        COALESCE(SUM(si.collection_status = 'COLLECTED'), 0) AS collected_items,
        COALESCE(SUM(si.collection_status = 'DAMAGED'),   0) AS damaged_items
      FROM scrap_logs sl
      JOIN users    sv ON sv.user_id   = sl.supervisor_id
      JOIN vehicles v  ON v.vehicle_id = sl.vehicle_id
      LEFT JOIN scrap_items si ON si.scrap_id = sl.scrap_id
      WHERE sl.driver_id = ? AND sl.tenant_id = ? ${df.clause} ${extraWhere}
      GROUP BY
        sl.scrap_id, sl.status, sl.scrap_type, sl.source,
        sl.pickup_address, sl.pickup_pincode, sl.collection_notes,
        sl.departure_time, sl.completed_at, sl.created_at,
        sv.full_name, v.vehicle_number, v.vehicle_type
      ORDER BY sl.created_at DESC
      LIMIT ? OFFSET ?
    `, [driverId, tenantId, ...df.params, ...extraParams, parseInt(limit), offset]);

    res.json({ success: true, data: rows, total: Number(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("[driver-history/scraps]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/driver-history/delivery/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/delivery/:id", async (req, res) => {
  try {
    const driverId   = req.user.user_id;
    const tenantId   = req.user.tenant_id;
    const deliveryId = req.params.id;

    const [[delivery]] = await pool.query(`
      SELECT
        da.delivery_id, da.status, da.assigned_at,
        sv.full_name AS supervisor_name, sv.phone_number AS supervisor_phone,
        v.vehicle_number, v.vehicle_type
      FROM delivery_assignments da
      JOIN users    sv ON sv.user_id   = da.supervisor_id
      JOIN vehicles v  ON v.vehicle_id = da.vehicle_id
      WHERE da.delivery_id = ? AND da.driver_id = ? AND da.tenant_id = ?
    `, [deliveryId, driverId, tenantId]);

    if (!delivery) return res.status(404).json({ success: false, message: "Not found" });

    const [items] = await pool.query(`
      SELECT
        di.delivery_item_id, di.delivery_status, di.delivered_at, di.proof_url,
        oi.product_name, oi.quantity, oi.is_fragile,
        o.order_reference, o.customer_name, o.customer_address, o.pincode
      FROM delivery_items di
      JOIN order_items oi ON oi.item_id = di.item_id
      JOIN orders      o  ON o.order_id = oi.order_id
      WHERE di.delivery_id = ?
      ORDER BY o.order_reference, oi.product_name
    `, [deliveryId]);

    res.json({ success: true, data: { ...delivery, items } });
  } catch (err) {
    console.error("[driver-history/delivery/:id]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/driver-history/scrap/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/scrap/:id", async (req, res) => {
  try {
    const driverId = req.user.user_id;
    const tenantId = req.user.tenant_id;
    const scrapId  = req.params.id;

    const [[scrap]] = await pool.query(`
      SELECT
        sl.scrap_id, sl.status, sl.scrap_type, sl.source,
        sl.pickup_address, sl.pickup_pincode, sl.collection_notes,
        sl.departure_time, sl.completed_at, sl.created_at,
        sv.full_name AS supervisor_name, sv.phone_number AS supervisor_phone,
        v.vehicle_number, v.vehicle_type
      FROM scrap_logs sl
      JOIN users    sv ON sv.user_id   = sl.supervisor_id
      JOIN vehicles v  ON v.vehicle_id = sl.vehicle_id
      WHERE sl.scrap_id = ? AND sl.driver_id = ? AND sl.tenant_id = ?
    `, [scrapId, driverId, tenantId]);

    if (!scrap) return res.status(404).json({ success: false, message: "Not found" });

    const [items] = await pool.query(`
      SELECT scrap_item_id, item_description, quantity, collection_status, proof_url, collected_at, notes
      FROM scrap_items WHERE scrap_id = ?
      ORDER BY scrap_item_id
    `, [scrapId]);

    res.json({ success: true, data: { ...scrap, items } });
  } catch (err) {
    console.error("[driver-history/scrap/:id]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/driver-history/stats
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const driverId = req.user.user_id;
    const tenantId = req.user.tenant_id;

    const [[deliveryStats]] = await pool.query(`
      SELECT
        COUNT(*)                            AS total_assignments,
        SUM(status = 'DELIVERED')           AS completed,
        SUM(status = 'IN_TRANSIT')          AS in_transit,
        SUM(status = 'ASSIGNED')            AS pending,
        SUM(status = 'PARTIALLY_DELIVERED') AS partial
      FROM delivery_assignments
      WHERE driver_id = ? AND tenant_id = ?
    `, [driverId, tenantId]);

    const [[itemStats]] = await pool.query(`
      SELECT
        COUNT(di.delivery_item_id)            AS total_items,
        SUM(di.delivery_status = 'DELIVERED') AS delivered_items,
        SUM(di.delivery_status = 'DAMAGED')   AS damaged_items
      FROM delivery_assignments da
      JOIN delivery_items di ON di.delivery_id = da.delivery_id
      WHERE da.driver_id = ? AND da.tenant_id = ?
    `, [driverId, tenantId]);

    const [[scrapStats]] = await pool.query(`
      SELECT
        COUNT(*)                  AS total_scraps,
        SUM(status = 'COMPLETED') AS completed,
        SUM(status = 'APPROVED')  AS approved,
        SUM(status = 'REJECTED')  AS rejected
      FROM scrap_logs
      WHERE driver_id = ? AND tenant_id = ?
    `, [driverId, tenantId]);

    res.json({ success: true, data: { deliveryStats, itemStats, scrapStats } });
  } catch (err) {
    console.error("[driver-history/stats]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;