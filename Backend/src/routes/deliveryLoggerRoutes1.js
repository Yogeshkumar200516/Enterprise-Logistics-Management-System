const express = require("express");
const router = express.Router();
const pool = require("../config/config");

/* =====================================================
   ROLE CHECK – SUPERVISOR ONLY
===================================================== */
const onlySupervisor = (req, res, next) => {
  if (req.user.role !== "supervisor") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Supervisor only.",
    });
  }
  next();
};

/* =====================================================
   1. GET DELIVERY LOGS (DeliveryLogger.jsx)
   Filters:
   - status
   - vehicle_id
   - driver_id
   - search (order reference / driver / vehicle)
===================================================== */
router.get("/delivery/logs", onlySupervisor, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { status, vehicle_id, driver_id, search } = req.query;

    let sql = `
      SELECT
        da.delivery_id,
        da.status,
        da.assigned_at,

        v.vehicle_number,
        v.vehicle_type,

        u.full_name AS driver_name,
        u.phone_number,

        COUNT(di.delivery_item_id) AS total_items
      FROM delivery_assignments da
      JOIN vehicles v ON v.vehicle_id = da.vehicle_id
      JOIN users u ON u.user_id = da.driver_id
      LEFT JOIN delivery_items di ON di.delivery_id = da.delivery_id
      WHERE da.tenant_id = ?
    `;

    const params = [tenant_id];

    if (status) {
      sql += ` AND da.status = ?`;
      params.push(status);
    }

    if (vehicle_id) {
      sql += ` AND da.vehicle_id = ?`;
      params.push(vehicle_id);
    }

    if (driver_id) {
      sql += ` AND da.driver_id = ?`;
      params.push(driver_id);
    }

    if (search) {
      sql += `
        AND (
          v.vehicle_number LIKE ?
          OR u.full_name LIKE ?
        )
      `;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += `
      GROUP BY da.delivery_id
      ORDER BY da.assigned_at DESC
    `;

    const [rows] = await pool.query(sql, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =====================================================
   2. GET AVAILABLE VEHICLES (CreateLogger.jsx)
===================================================== */
router.get("/delivery/vehicles", onlySupervisor, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const [vehicles] = await pool.query(
      `
      SELECT vehicle_id, vehicle_number, vehicle_type, capacity
      FROM vehicles
      WHERE tenant_id = ?
        AND status = 'AVAILABLE'
      `,
      [tenant_id]
    );

    res.json({ success: true, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =====================================================
   3. GET AVAILABLE DRIVERS (CreateLogger.jsx)
===================================================== */
router.get("/delivery/drivers", onlySupervisor, async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const [drivers] = await pool.query(
      `
      SELECT user_id, full_name, phone_number
      FROM users
      WHERE tenant_id = ?
        AND role = 'user'
        AND status = 'ACTIVE'
        AND driver_status = 'AVAILABLE'
      `,
      [tenant_id]
    );

    res.json({ success: true, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =====================================================
   4. GET NOT ASSIGNED ORDERS (SelectOrders.jsx)
===================================================== */
router.get("/delivery/orders", onlySupervisor, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { search } = req.query;

    let sql = `
      SELECT
        o.order_id,
        o.order_reference,
        o.customer_name,
        o.customer_address,
        o.pincode,
        COUNT(oi.item_id) AS total_items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.order_id
      WHERE o.tenant_id = ?
        AND o.delivery_status = 'NOT_ASSIGNED'
    `;

    const params = [tenant_id];

    if (search) {
      sql += `
        AND (
          o.order_reference LIKE ?
          OR o.customer_name LIKE ?
        )
      `;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` GROUP BY o.order_id ORDER BY o.created_at DESC`;

    const [orders] = await pool.query(sql, params);

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =====================================================
   5. CREATE DELIVERY LOGGER (CreateLogger.jsx)
===================================================== */
router.post("/delivery", onlySupervisor, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { tenant_id, user_id: supervisor_id } = req.user;
    const { vehicle_id, driver_id, order_ids } = req.body;

    if (!vehicle_id || !driver_id || !order_ids?.length) {
      return res.status(400).json({
        success: false,
        message: "Vehicle, driver and orders are required",
      });
    }

    await connection.beginTransaction();

    /* VEHICLE CHECK */
    const [[vehicle]] = await connection.query(
      `SELECT status FROM vehicles WHERE vehicle_id = ? AND tenant_id = ?`,
      [vehicle_id, tenant_id]
    );
    if (!vehicle || vehicle.status !== "AVAILABLE") {
      throw new Error("Vehicle not available");
    }

    /* DRIVER CHECK */
    const [[driver]] = await connection.query(
      `
      SELECT driver_status
      FROM users
      WHERE user_id = ?
        AND tenant_id = ?
        AND role = 'user'
      `,
      [driver_id, tenant_id]
    );
    if (!driver || driver.driver_status !== "AVAILABLE") {
      throw new Error("Driver not available");
    }

    /* CREATE DELIVERY */
    const [delivery] = await connection.query(
      `
      INSERT INTO delivery_assignments
      (tenant_id, vehicle_id, driver_id, supervisor_id)
      VALUES (?, ?, ?, ?)
      `,
      [tenant_id, vehicle_id, driver_id, supervisor_id]
    );

    const delivery_id = delivery.insertId;

    /* MAP ORDER ITEMS */
    const [items] = await connection.query(
      `
      SELECT item_id
      FROM order_items
      WHERE order_id IN (?)
      `,
      [order_ids]
    );

    for (const item of items) {
      await connection.query(
        `
        INSERT INTO delivery_items (delivery_id, item_id)
        VALUES (?, ?)
        `,
        [delivery_id, item.item_id]
      );
    }

    /* UPDATE ORDERS */
    await connection.query(
      `
      UPDATE orders
      SET delivery_status = 'IN_PROGRESS'
      WHERE order_id IN (?)
      `,
      [order_ids]
    );

    /* UPDATE VEHICLE */
    await connection.query(
      `UPDATE vehicles SET status = 'IN_USE' WHERE vehicle_id = ?`,
      [vehicle_id]
    );

    /* UPDATE DRIVER */
    await connection.query(
      `
      UPDATE users
      SET driver_status = 'IN_DELIVERY'
      WHERE user_id = ?
      `,
      [driver_id]
    );

    /* AUDIT */
    await connection.query(
      `
      INSERT INTO audit_logs
      (tenant_id, user_id, action, entity_type, entity_id)
      VALUES (?, ?, 'DELIVERY_CREATED', 'DELIVERY', ?)
      `,
      [tenant_id, supervisor_id, delivery_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Delivery logger created successfully",
      delivery_id,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
