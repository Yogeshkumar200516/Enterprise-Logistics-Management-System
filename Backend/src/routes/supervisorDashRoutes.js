// src/routes/supervisorDashRoutes.js
const express = require("express");
const router  = express.Router();
const pool    = require("../config/config.js");

// ─── Helper ───────────────────────────────────────────────────────────────────
// Returns { clause, params } — always uses ? placeholders, never raw interpolation
// IMPORTANT: col must be a plain column name (no alias prefix) when used inside subqueries
function buildDateFilter(period, startDate, endDate, col = "created_at") {
  if (startDate && endDate) {
    return { clause: `AND DATE(${col}) BETWEEN ? AND ?`, params: [startDate, endDate] };
  }
  switch (period) {
    case "week":  return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,   params: [] };
    case "month": return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,  params: [] };
    case "year":  return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 365 DAY)`, params: [] };
    default:      return { clause: `AND ${col} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,  params: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supervisor-dashboard/summary
// ─────────────────────────────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const supervisorId = req.user.user_id;
    const tenantId     = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;

    // Use plain column names (no alias) — these run in simple WHERE clauses
    const dadf = buildDateFilter(period, startDate, endDate, "assigned_at");
    const sldf = buildDateFilter(period, startDate, endDate, "created_at");
    const odf  = buildDateFilter(period, startDate, endDate, "created_at");

    const [[daStats]] = await pool.query(`
      SELECT
        COUNT(*)                               AS total_assignments,
        SUM(status = 'ASSIGNED')               AS assigned,
        SUM(status = 'IN_TRANSIT')             AS in_transit,
        SUM(status = 'DELIVERED')              AS delivered,
        SUM(status = 'PARTIALLY_DELIVERED')    AS partially_delivered
      FROM delivery_assignments
      WHERE supervisor_id = ? AND tenant_id = ? ${dadf.clause}
    `, [supervisorId, tenantId, ...dadf.params]);

    const [[itemStats]] = await pool.query(`
      SELECT
        COUNT(di.delivery_item_id)            AS total_items,
        SUM(di.delivery_status = 'DELIVERED') AS items_delivered,
        SUM(di.delivery_status = 'DAMAGED')   AS items_damaged,
        SUM(di.delivery_status = 'PENDING')   AS items_pending
      FROM delivery_assignments da
      JOIN delivery_items di ON di.delivery_id = da.delivery_id
      WHERE da.supervisor_id = ? AND da.tenant_id = ? ${dadf.clause}
    `, [supervisorId, tenantId, ...dadf.params]);

    const [[scrapStats]] = await pool.query(`
      SELECT
        COUNT(*)                      AS total_scrap,
        SUM(status = 'ASSIGNED')      AS assigned,
        SUM(status = 'IN_TRANSIT')    AS in_transit,
        SUM(status = 'COMPLETED')     AS completed,
        SUM(status = 'APPROVED')      AS approved,
        SUM(status = 'REJECTED')      AS rejected
      FROM scrap_logs
      WHERE supervisor_id = ? AND tenant_id = ? ${sldf.clause}
    `, [supervisorId, tenantId, ...sldf.params]);

    const [[orderStats]] = await pool.query(`
      SELECT
        COUNT(*)                                AS total_orders,
        SUM(delivery_status = 'NOT_ASSIGNED')   AS not_assigned,
        SUM(delivery_status = 'IN_PROGRESS')    AS in_progress,
        SUM(delivery_status = 'DELIVERED')      AS delivered
      FROM orders
      WHERE tenant_id = ? ${odf.clause}
    `, [tenantId, ...odf.params]);

    const [[vehicleStats]] = await pool.query(`
      SELECT
        COUNT(*)                  AS total_vehicles,
        SUM(status = 'AVAILABLE') AS available,
        SUM(status = 'IN_USE')    AS in_use
      FROM vehicles WHERE tenant_id = ?
    `, [tenantId]);

    const [[driverStats]] = await pool.query(`
      SELECT
        COUNT(*)                           AS total_drivers,
        SUM(driver_status = 'AVAILABLE')   AS available,
        SUM(driver_status = 'IN_DELIVERY') AS in_delivery
      FROM users WHERE tenant_id = ? AND role = 'user'
    `, [tenantId]);

    res.json({ success: true, data: { daStats, itemStats, scrapStats, orderStats, vehicleStats, driverStats } });
  } catch (err) {
    console.error("[supervisor-dashboard/summary]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supervisor-dashboard/delivery-trend
//
// FIX 1: Use plain column name "assigned_at" (no alias prefix) in WHERE
// FIX 2: Wrap DATE_FORMAT in MIN() so it satisfies only_full_group_by —
//         all rows in the same date group share the same date, so MIN() is safe
// ─────────────────────────────────────────────────────────────────────────────
router.get("/delivery-trend", async (req, res) => {
  try {
    const supervisorId = req.user.user_id;
    const tenantId     = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;

    // Plain column name — no alias prefix inside WHERE
    const df = buildDateFilter(period, startDate, endDate, "assigned_at");

    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(MIN(assigned_at), '%d %b') AS date,
        DATE(MIN(assigned_at))                  AS raw_date,
        COUNT(*)                                AS total,
        SUM(status = 'DELIVERED')               AS delivered,
        SUM(status = 'IN_TRANSIT')              AS in_transit,
        SUM(status = 'PARTIALLY_DELIVERED')     AS partial
      FROM delivery_assignments
      WHERE supervisor_id = ? AND tenant_id = ? ${df.clause}
      GROUP BY DATE(assigned_at)
      ORDER BY raw_date ASC
    `, [supervisorId, tenantId, ...df.params]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[supervisor-dashboard/delivery-trend]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supervisor-dashboard/delivery-status-pie
// ─────────────────────────────────────────────────────────────────────────────
router.get("/delivery-status-pie", async (req, res) => {
  try {
    const supervisorId = req.user.user_id;
    const tenantId     = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;
    const df = buildDateFilter(period, startDate, endDate, "assigned_at");

    const [rows] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM delivery_assignments
      WHERE supervisor_id = ? AND tenant_id = ? ${df.clause}
      GROUP BY status
    `, [supervisorId, tenantId, ...df.params]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[supervisor-dashboard/delivery-status-pie]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supervisor-dashboard/scrap-status-pie
// ─────────────────────────────────────────────────────────────────────────────
router.get("/scrap-status-pie", async (req, res) => {
  try {
    const supervisorId = req.user.user_id;
    const tenantId     = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;
    const df = buildDateFilter(period, startDate, endDate, "created_at");

    const [rows] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM scrap_logs
      WHERE supervisor_id = ? AND tenant_id = ? ${df.clause}
      GROUP BY status
    `, [supervisorId, tenantId, ...df.params]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[supervisor-dashboard/scrap-status-pie]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supervisor-dashboard/driver-workload
//
// FIX: Inside a subquery the outer alias "da" does not exist yet.
//      Use plain column names inside the subquery WHERE clause.
//      Also explicitly GROUP BY all non-aggregated columns to satisfy only_full_group_by.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/driver-workload", async (req, res) => {
  try {
    const supervisorId = req.user.user_id;
    const tenantId     = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;

    // Plain column name — no alias prefix inside the subquery WHERE
    const df = buildDateFilter(period, startDate, endDate, "assigned_at");

    const [rows] = await pool.query(`
      SELECT
        u.user_id,
        u.full_name,
        u.driver_status,
        COUNT(da.delivery_id)         AS total,
        SUM(da.status = 'DELIVERED')  AS delivered,
        SUM(da.status = 'IN_TRANSIT') AS in_transit,
        SUM(da.status = 'ASSIGNED')   AS pending
      FROM users u
      LEFT JOIN (
        SELECT delivery_id, driver_id, status
        FROM delivery_assignments
        WHERE supervisor_id = ? AND tenant_id = ? ${df.clause}
      ) da ON da.driver_id = u.user_id
      WHERE u.tenant_id = ? AND u.role = 'user'
      GROUP BY u.user_id, u.full_name, u.driver_status
      ORDER BY total DESC
      LIMIT 8
    `, [supervisorId, tenantId, ...df.params, tenantId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[supervisor-dashboard/driver-workload]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supervisor-dashboard/recent-deliveries
// FIX: Explicitly list every non-aggregated column in GROUP BY
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recent-deliveries", async (req, res) => {
  try {
    const supervisorId = req.user.user_id;
    const tenantId     = req.user.tenant_id;

    const [rows] = await pool.query(`
      SELECT
        da.delivery_id,
        da.status,
        da.assigned_at,
        dr.full_name                                       AS driver_name,
        dr.driver_status,
        v.vehicle_number,
        v.vehicle_type,
        COUNT(di.delivery_item_id)                         AS total_items,
        COALESCE(SUM(di.delivery_status = 'DELIVERED'), 0) AS delivered_items,
        COALESCE(SUM(di.delivery_status = 'DAMAGED'),   0) AS damaged_items
      FROM delivery_assignments da
      JOIN users    dr ON dr.user_id   = da.driver_id
      JOIN vehicles v  ON v.vehicle_id = da.vehicle_id
      LEFT JOIN delivery_items di ON di.delivery_id = da.delivery_id
      WHERE da.supervisor_id = ? AND da.tenant_id = ?
      GROUP BY
        da.delivery_id, da.status, da.assigned_at,
        dr.full_name, dr.driver_status,
        v.vehicle_number, v.vehicle_type
      ORDER BY da.assigned_at DESC
      LIMIT 8
    `, [supervisorId, tenantId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[supervisor-dashboard/recent-deliveries]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supervisor-dashboard/recent-scraps
// FIX: Explicitly list every non-aggregated column in GROUP BY
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recent-scraps", async (req, res) => {
  try {
    const supervisorId = req.user.user_id;
    const tenantId     = req.user.tenant_id;

    const [rows] = await pool.query(`
      SELECT
        sl.scrap_id,
        sl.status,
        sl.scrap_type,
        sl.source,
        sl.created_at,
        dr.full_name     AS driver_name,
        v.vehicle_number,
        COUNT(si.scrap_item_id) AS total_items
      FROM scrap_logs sl
      JOIN users    dr ON dr.user_id   = sl.driver_id
      JOIN vehicles v  ON v.vehicle_id = sl.vehicle_id
      LEFT JOIN scrap_items si ON si.scrap_id = sl.scrap_id
      WHERE sl.supervisor_id = ? AND sl.tenant_id = ?
      GROUP BY
        sl.scrap_id, sl.status, sl.scrap_type,
        sl.source, sl.created_at,
        dr.full_name, v.vehicle_number
      ORDER BY sl.created_at DESC
      LIMIT 6
    `, [supervisorId, tenantId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[supervisor-dashboard/recent-scraps]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;