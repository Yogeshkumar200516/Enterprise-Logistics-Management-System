// src/routes/adminHistoryRoutes.js
const express = require("express");
const router  = express.Router();
const pool    = require("../config/config.js");

// ─── Helper ───────────────────────────────────────────────────────────────────
function buildDateFilter(period, startDate, endDate, col = "created_at") {
  if (startDate && endDate) {
    return { clause: `AND DATE(${col}) BETWEEN ? AND ?`, params: [startDate, endDate] };
  }
  switch (period) {
    case "today": return { clause: `AND DATE(${col}) = CURDATE()`, params: [] };
    case "week":  return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,   params: [] };
    case "month": return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,  params: [] };
    case "year":  return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 365 DAY)`, params: [] };
    default:      return { clause: "", params: [] }; // "all"
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-history/deliveries
// Full delivery assignment history for the tenant
// ─────────────────────────────────────────────────────────────────────────────
router.get("/deliveries", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate, status, supervisor_id, driver_id, page = 1, limit = 15 } = req.query;
    const df     = buildDateFilter(period, startDate, endDate, "da.assigned_at");
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let extraWhere = "";
    const extraParams = [];
    if (status)        { extraWhere += " AND da.status = ?";        extraParams.push(status); }
    if (supervisor_id) { extraWhere += " AND da.supervisor_id = ?"; extraParams.push(supervisor_id); }
    if (driver_id)     { extraWhere += " AND da.driver_id = ?";     extraParams.push(driver_id); }

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM delivery_assignments da
      WHERE da.tenant_id = ? ${df.clause} ${extraWhere}
    `, [tenantId, ...df.params, ...extraParams]);

    const [rows] = await pool.query(`
      SELECT
        da.delivery_id,
        da.status,
        da.assigned_at,
        dr.full_name                                        AS driver_name,
        dr.driver_status,
        sv.full_name                                        AS supervisor_name,
        v.vehicle_number,
        v.vehicle_type,
        COUNT(DISTINCT di.delivery_item_id)                 AS total_items,
        COALESCE(SUM(di.delivery_status = 'DELIVERED'), 0)  AS delivered_items,
        COALESCE(SUM(di.delivery_status = 'DAMAGED'),   0)  AS damaged_items,
        COALESCE(SUM(di.delivery_status = 'PENDING'),   0)  AS pending_items,
        COUNT(DISTINCT oi.order_id)                         AS total_orders
      FROM delivery_assignments da
      JOIN users    dr ON dr.user_id   = da.driver_id
      JOIN users    sv ON sv.user_id   = da.supervisor_id
      JOIN vehicles v  ON v.vehicle_id = da.vehicle_id
      LEFT JOIN delivery_items di ON di.delivery_id = da.delivery_id
      LEFT JOIN order_items    oi ON oi.item_id     = di.item_id
      WHERE da.tenant_id = ? ${df.clause} ${extraWhere}
      GROUP BY
        da.delivery_id, da.status, da.assigned_at,
        dr.full_name, dr.driver_status,
        sv.full_name, v.vehicle_number, v.vehicle_type
      ORDER BY da.assigned_at DESC
      LIMIT ? OFFSET ?
    `, [tenantId, ...df.params, ...extraParams, parseInt(limit), offset]);

    res.json({ success: true, data: rows, total: Number(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("[admin-history/deliveries]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-history/scraps
// Full scrap log history for the tenant
// ─────────────────────────────────────────────────────────────────────────────
router.get("/scraps", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate, status, source, supervisor_id, driver_id, page = 1, limit = 15 } = req.query;
    const df     = buildDateFilter(period, startDate, endDate, "sl.created_at");
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let extraWhere = "";
    const extraParams = [];
    if (status)        { extraWhere += " AND sl.status = ?";        extraParams.push(status); }
    if (source)        { extraWhere += " AND sl.source = ?";        extraParams.push(source); }
    if (supervisor_id) { extraWhere += " AND sl.supervisor_id = ?"; extraParams.push(supervisor_id); }
    if (driver_id)     { extraWhere += " AND sl.driver_id = ?";     extraParams.push(driver_id); }

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM scrap_logs sl
      WHERE sl.tenant_id = ? ${df.clause} ${extraWhere}
    `, [tenantId, ...df.params, ...extraParams]);

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
        dr.full_name     AS driver_name,
        sv.full_name     AS supervisor_name,
        cb.full_name     AS collected_by_name,
        v.vehicle_number,
        v.vehicle_type,
        COUNT(si.scrap_item_id)                                AS total_items,
        COALESCE(SUM(si.collection_status = 'COLLECTED'), 0)   AS collected_items,
        COALESCE(SUM(si.collection_status = 'DAMAGED'),   0)   AS damaged_items
      FROM scrap_logs sl
      JOIN users    dr ON dr.user_id   = sl.driver_id
      JOIN users    sv ON sv.user_id   = sl.supervisor_id
      JOIN users    cb ON cb.user_id   = sl.collected_by
      JOIN vehicles v  ON v.vehicle_id = sl.vehicle_id
      LEFT JOIN scrap_items si ON si.scrap_id = sl.scrap_id
      WHERE sl.tenant_id = ? ${df.clause} ${extraWhere}
      GROUP BY
        sl.scrap_id, sl.status, sl.scrap_type, sl.source,
        sl.pickup_address, sl.pickup_pincode, sl.collection_notes,
        sl.departure_time, sl.completed_at, sl.created_at,
        dr.full_name, sv.full_name, cb.full_name,
        v.vehicle_number, v.vehicle_type
      ORDER BY sl.created_at DESC
      LIMIT ? OFFSET ?
    `, [tenantId, ...df.params, ...extraParams, parseInt(limit), offset]);

    res.json({ success: true, data: rows, total: Number(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("[admin-history/scraps]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-history/orders
// Full order history for the tenant
// ─────────────────────────────────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate, status, page = 1, limit = 15 } = req.query;
    const df     = buildDateFilter(period, startDate, endDate, "o.created_at");
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let extraWhere = "";
    const extraParams = [];
    if (status) { extraWhere += " AND o.delivery_status = ?"; extraParams.push(status); }

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM orders o
      WHERE o.tenant_id = ? ${df.clause} ${extraWhere}
    `, [tenantId, ...df.params, ...extraParams]);

    const [rows] = await pool.query(`
      SELECT
        o.order_id,
        o.order_reference,
        o.customer_name,
        o.customer_address,
        o.pincode,
        o.delivery_status,
        o.created_at,
        o.delivered_at,
        COUNT(oi.item_id)       AS total_items,
        SUM(oi.quantity)        AS total_quantity,
        SUM(oi.is_fragile)      AS fragile_items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.order_id
      WHERE o.tenant_id = ? ${df.clause} ${extraWhere}
      GROUP BY
        o.order_id, o.order_reference, o.customer_name,
        o.customer_address, o.pincode, o.delivery_status,
        o.created_at, o.delivered_at
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [tenantId, ...df.params, ...extraParams, parseInt(limit), offset]);

    res.json({ success: true, data: rows, total: Number(total), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("[admin-history/orders]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-history/filters
// Returns supervisors and drivers for filter dropdowns
// ─────────────────────────────────────────────────────────────────────────────
router.get("/filters", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const [supervisors] = await pool.query(`
      SELECT user_id, full_name FROM users
      WHERE tenant_id = ? AND role = 'supervisor' AND status = 'ACTIVE'
      ORDER BY full_name
    `, [tenantId]);

    const [drivers] = await pool.query(`
      SELECT user_id, full_name FROM users
      WHERE tenant_id = ? AND role = 'user' AND status = 'ACTIVE'
      ORDER BY full_name
    `, [tenantId]);

    res.json({ success: true, data: { supervisors, drivers } });
  } catch (err) {
    console.error("[admin-history/filters]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-history/delivery/:id
// Single delivery detail with all items
// ─────────────────────────────────────────────────────────────────────────────
router.get("/delivery/:id", async (req, res) => {
  try {
    const tenantId   = req.user.tenant_id;
    const deliveryId = req.params.id;

    const [[delivery]] = await pool.query(`
      SELECT
        da.delivery_id, da.status, da.assigned_at,
        dr.full_name AS driver_name, dr.phone_number AS driver_phone,
        sv.full_name AS supervisor_name,
        v.vehicle_number, v.vehicle_type
      FROM delivery_assignments da
      JOIN users    dr ON dr.user_id   = da.driver_id
      JOIN users    sv ON sv.user_id   = da.supervisor_id
      JOIN vehicles v  ON v.vehicle_id = da.vehicle_id
      WHERE da.delivery_id = ? AND da.tenant_id = ?
    `, [deliveryId, tenantId]);

    if (!delivery) return res.status(404).json({ success: false, message: "Not found" });

    const [items] = await pool.query(`
      SELECT
        di.delivery_item_id,
        di.delivery_status,
        di.delivered_at,
        di.proof_url,
        oi.product_name,
        oi.quantity,
        oi.is_fragile,
        o.order_reference,
        o.customer_name,
        o.customer_address,
        o.pincode
      FROM delivery_items di
      JOIN order_items oi ON oi.item_id = di.item_id
      JOIN orders      o  ON o.order_id = oi.order_id
      WHERE di.delivery_id = ?
      ORDER BY o.order_reference, oi.product_name
    `, [deliveryId]);

    res.json({ success: true, data: { ...delivery, items } });
  } catch (err) {
    console.error("[admin-history/delivery/:id]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-history/scrap/:id
// Single scrap detail with all items
// ─────────────────────────────────────────────────────────────────────────────
router.get("/scrap/:id", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const scrapId  = req.params.id;

    const [[scrap]] = await pool.query(`
      SELECT
        sl.scrap_id, sl.status, sl.scrap_type, sl.source,
        sl.pickup_address, sl.pickup_pincode, sl.collection_notes,
        sl.departure_time, sl.completed_at, sl.created_at,
        dr.full_name AS driver_name, dr.phone_number AS driver_phone,
        sv.full_name AS supervisor_name,
        cb.full_name AS collected_by_name,
        v.vehicle_number, v.vehicle_type
      FROM scrap_logs sl
      JOIN users    dr ON dr.user_id   = sl.driver_id
      JOIN users    sv ON sv.user_id   = sl.supervisor_id
      JOIN users    cb ON cb.user_id   = sl.collected_by
      JOIN vehicles v  ON v.vehicle_id = sl.vehicle_id
      WHERE sl.scrap_id = ? AND sl.tenant_id = ?
    `, [scrapId, tenantId]);

    if (!scrap) return res.status(404).json({ success: false, message: "Not found" });

    const [items] = await pool.query(`
      SELECT scrap_item_id, item_description, quantity, collection_status, proof_url, collected_at, notes
      FROM scrap_items WHERE scrap_id = ?
      ORDER BY scrap_item_id
    `, [scrapId]);

    res.json({ success: true, data: { ...scrap, items } });
  } catch (err) {
    console.error("[admin-history/scrap/:id]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;