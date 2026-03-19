// src/routes/adminDashRoutes.js
const express = require("express");
const router  = express.Router();
const pool    = require("../config/config.js");

// ─── Helper ───────────────────────────────────────────────────────────────────
// Returns { clause, params } — always uses ? placeholders
// IMPORTANT: pass plain column names (no alias prefix) when used inside subqueries
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
// GET /api/admin-dashboard/summary
// ─────────────────────────────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;

    // Plain column names — no alias prefix in simple WHERE clauses
    const odf  = buildDateFilter(period, startDate, endDate, "created_at");
    const dadf = buildDateFilter(period, startDate, endDate, "assigned_at");
    const sldf = buildDateFilter(period, startDate, endDate, "created_at");

    const [[orderStats]] = await pool.query(`
      SELECT
        COUNT(*)                              AS total_orders,
        SUM(delivery_status = 'NOT_ASSIGNED') AS not_assigned,
        SUM(delivery_status = 'IN_PROGRESS')  AS in_progress,
        SUM(delivery_status = 'DELIVERED')    AS delivered
      FROM orders
      WHERE tenant_id = ? ${odf.clause}
    `, [tenantId, ...odf.params]);

    const [[daStats]] = await pool.query(`
      SELECT
        COUNT(*)                               AS total_assignments,
        SUM(status = 'ASSIGNED')               AS assigned,
        SUM(status = 'IN_TRANSIT')             AS in_transit,
        SUM(status = 'DELIVERED')              AS delivered,
        SUM(status = 'PARTIALLY_DELIVERED')    AS partially_delivered
      FROM delivery_assignments
      WHERE tenant_id = ? ${dadf.clause}
    `, [tenantId, ...dadf.params]);

    const [[userStats]] = await pool.query(`
      SELECT
        COUNT(*)                 AS total_users,
        SUM(role = 'supervisor') AS supervisors,
        SUM(role = 'user')       AS drivers,
        SUM(status = 'ACTIVE')   AS active_users
      FROM users WHERE tenant_id = ?
    `, [tenantId]);

    const [[vehicleStats]] = await pool.query(`
      SELECT
        COUNT(*)                    AS total_vehicles,
        SUM(status = 'AVAILABLE')   AS available,
        SUM(status = 'IN_USE')      AS in_use,
        SUM(status = 'MAINTENANCE') AS maintenance
      FROM vehicles WHERE tenant_id = ?
    `, [tenantId]);

    const [[scrapStats]] = await pool.query(`
      SELECT
        COUNT(*)                    AS total_scrap_runs,
        SUM(status = 'COMPLETED')   AS completed,
        SUM(status = 'APPROVED')    AS approved,
        SUM(status = 'REJECTED')    AS rejected
      FROM scrap_logs
      WHERE tenant_id = ? ${sldf.clause}
    `, [tenantId, ...sldf.params]);

    res.json({ success: true, data: { orderStats, daStats, userStats, vehicleStats, scrapStats } });
  } catch (err) {
    console.error("[admin-dashboard/summary]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-dashboard/orders-trend
//
// FIX: Wrap DATE_FORMAT in MIN() so every SELECT expression is either
//      aggregated or in GROUP BY — required by only_full_group_by mode
// ─────────────────────────────────────────────────────────────────────────────
router.get("/orders-trend", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;
    const df = buildDateFilter(period, startDate, endDate, "created_at");

    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(MIN(created_at), '%d %b') AS date,
        DATE(MIN(created_at))                  AS raw_date,
        COUNT(*)                               AS total,
        SUM(delivery_status = 'DELIVERED')     AS delivered,
        SUM(delivery_status = 'IN_PROGRESS')   AS in_progress,
        SUM(delivery_status = 'NOT_ASSIGNED')  AS not_assigned
      FROM orders
      WHERE tenant_id = ? ${df.clause}
      GROUP BY DATE(created_at)
      ORDER BY raw_date ASC
    `, [tenantId, ...df.params]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin-dashboard/orders-trend]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-dashboard/delivery-status-dist
// ─────────────────────────────────────────────────────────────────────────────
router.get("/delivery-status-dist", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;
    const df = buildDateFilter(period, startDate, endDate, "assigned_at");

    const [rows] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM delivery_assignments
      WHERE tenant_id = ? ${df.clause}
      GROUP BY status
    `, [tenantId, ...df.params]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin-dashboard/delivery-status-dist]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-dashboard/order-status-pie
// ─────────────────────────────────────────────────────────────────────────────
router.get("/order-status-pie", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;
    const df = buildDateFilter(period, startDate, endDate, "created_at");

    const [rows] = await pool.query(`
      SELECT delivery_status AS status, COUNT(*) AS count
      FROM orders
      WHERE tenant_id = ? ${df.clause}
      GROUP BY delivery_status
    `, [tenantId, ...df.params]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin-dashboard/order-status-pie]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-dashboard/supervisor-performance
//
// FIX 1: Subquery uses plain column name "assigned_at" (no alias prefix)
// FIX 2: Only select columns that are aggregated or in GROUP BY
// ─────────────────────────────────────────────────────────────────────────────
router.get("/supervisor-performance", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;

    // Plain "assigned_at" — no alias prefix inside the subquery WHERE
    const df = buildDateFilter(period, startDate, endDate, "assigned_at");

    const [rows] = await pool.query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        COUNT(da.delivery_id)                 AS total_assignments,
        SUM(da.status = 'DELIVERED')          AS delivered,
        SUM(da.status = 'IN_TRANSIT')         AS in_transit,
        SUM(da.status = 'PARTIALLY_DELIVERED') AS partial,
        SUM(da.status = 'ASSIGNED')           AS pending
      FROM users u
      LEFT JOIN (
        SELECT delivery_id, supervisor_id, status
        FROM delivery_assignments
        WHERE tenant_id = ? ${df.clause}
      ) da ON da.supervisor_id = u.user_id
      WHERE u.tenant_id = ? AND u.role = 'supervisor'
      GROUP BY u.user_id, u.full_name, u.email
      ORDER BY total_assignments DESC
    `, [tenantId, ...df.params, tenantId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin-dashboard/supervisor-performance]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-dashboard/driver-performance
//
// FIX 1: Subquery uses plain column name "assigned_at" (no alias prefix)
// FIX 2: GROUP BY all non-aggregated columns
// ─────────────────────────────────────────────────────────────────────────────
router.get("/driver-performance", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { period, startDate, endDate } = req.query;

    // Plain "assigned_at" — no alias prefix inside the subquery WHERE
    const df = buildDateFilter(period, startDate, endDate, "assigned_at");

    const [rows] = await pool.query(`
      SELECT
        u.user_id,
        u.full_name,
        u.driver_status,
        COUNT(da.delivery_id)        AS total_deliveries,
        SUM(da.status = 'DELIVERED') AS completed,
        SUM(da.status = 'IN_TRANSIT') AS in_transit
      FROM users u
      LEFT JOIN (
        SELECT delivery_id, driver_id, status
        FROM delivery_assignments
        WHERE tenant_id = ? ${df.clause}
      ) da ON da.driver_id = u.user_id
      WHERE u.tenant_id = ? AND u.role = 'user'
      GROUP BY u.user_id, u.full_name, u.driver_status
      ORDER BY total_deliveries DESC
      LIMIT 10
    `, [tenantId, ...df.params, tenantId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin-dashboard/driver-performance]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin-dashboard/recent-activities
// FIX: Explicitly list every non-aggregated column in GROUP BY
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recent-activities", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const [rows] = await pool.query(`
      SELECT
        da.delivery_id,
        da.status,
        da.assigned_at,
        dr.full_name                                       AS driver_name,
        sv.full_name                                       AS supervisor_name,
        v.vehicle_number,
        COUNT(di.delivery_item_id)                         AS total_items,
        COALESCE(SUM(di.delivery_status = 'DELIVERED'), 0) AS delivered_items
      FROM delivery_assignments da
      JOIN users    dr ON dr.user_id   = da.driver_id
      JOIN users    sv ON sv.user_id   = da.supervisor_id
      JOIN vehicles v  ON v.vehicle_id = da.vehicle_id
      LEFT JOIN delivery_items di ON di.delivery_id = da.delivery_id
      WHERE da.tenant_id = ?
      GROUP BY
        da.delivery_id, da.status, da.assigned_at,
        dr.full_name, sv.full_name, v.vehicle_number
      ORDER BY da.assigned_at DESC
      LIMIT 8
    `, [tenantId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin-dashboard/recent-activities]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;