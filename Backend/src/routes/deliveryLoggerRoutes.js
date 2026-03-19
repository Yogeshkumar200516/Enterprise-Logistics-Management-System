// src/routes/deliveryLoggerRoutes.js
const express = require("express");
const router  = express.Router();
const pool    = require("../config/config");

// ============================================================
// REGISTRATION in app.js / server.js:
//   const deliveryLoggerRoutes = require('./routes/deliveryLoggerRoutes');
//   app.use('/api/delivery-logger', deliveryLoggerRoutes);
// ============================================================

// ─── 1. AVAILABLE VEHICLES ─────────────────────────────────────
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

// ─── 2. AVAILABLE DRIVERS ──────────────────────────────────────
router.get("/available-drivers", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [drivers] = await pool.query(
      `SELECT user_id, full_name, username, phone_number, license_number,
              vehicle_type, driver_status, is_external_driver
       FROM users
       WHERE tenant_id = ? AND role = 'user' AND status = 'ACTIVE' AND driver_status = 'AVAILABLE'
       ORDER BY is_external_driver ASC, full_name ASC`,
      [tenant_id]
    );
    res.json({ success: true, drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch available drivers", error: error.message });
  }
});

// ─── 3. UNASSIGNED ORDERS ──────────────────────────────────────
router.get("/unassigned-orders", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [orders] = await pool.query(
      `SELECT
         o.order_id, o.order_reference, o.customer_name,
         o.customer_address, o.pincode, o.created_at,
         COUNT(oi.item_id) AS total_items
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.tenant_id = ? AND o.delivery_status = 'NOT_ASSIGNED'
       GROUP BY
         o.order_id, o.order_reference, o.customer_name,
         o.customer_address, o.pincode, o.created_at
       ORDER BY o.created_at DESC`,
      [tenant_id]
    );
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch unassigned orders", error: error.message });
  }
});

// ─── 4. ORDER ITEMS BY ORDER ID ────────────────────────────────
router.get("/order-items/:orderId", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    const { orderId } = req.params;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [orderCheck] = await pool.query(
      "SELECT order_id FROM orders WHERE order_id = ? AND tenant_id = ?",
      [orderId, tenant_id]
    );
    if (!orderCheck.length)
      return res.status(404).json({ success: false, message: "Order not found or access denied" });

    const [items] = await pool.query(
      "SELECT item_id, product_name, quantity, is_fragile FROM order_items WHERE order_id = ?",
      [orderId]
    );
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch order items", error: error.message });
  }
});

// ─── 5. CREATE ASSIGNMENT ──────────────────────────────────────
router.post("/create-assignment", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tenant_id, user_id: supervisor_id, role } = req.user;
    const { vehicle_id, driver_id, order_ids } = req.body;

    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    if (!vehicle_id || !driver_id || !order_ids?.length)
      return res.status(400).json({ success: false, message: "Vehicle, driver, and at least one order are required" });

    await connection.beginTransaction();

    // Verify vehicle is AVAILABLE
    const [vc] = await connection.query(
      "SELECT status FROM vehicles WHERE vehicle_id = ? AND tenant_id = ?",
      [vehicle_id, tenant_id]
    );
    if (!vc.length || vc[0].status !== "AVAILABLE") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Vehicle is not available" });
    }

    // Verify driver is AVAILABLE
    const [dc] = await connection.query(
      "SELECT driver_status FROM users WHERE user_id = ? AND tenant_id = ? AND role = 'user'",
      [driver_id, tenant_id]
    );
    if (!dc.length || dc[0].driver_status !== "AVAILABLE") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Driver is not available" });
    }

    // Verify all orders are NOT_ASSIGNED and belong to tenant
    const [oc] = await connection.query(
      "SELECT order_id FROM orders WHERE order_id IN (?) AND tenant_id = ? AND delivery_status = 'NOT_ASSIGNED'",
      [order_ids, tenant_id]
    );
    if (oc.length !== order_ids.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "One or more orders are not available for assignment" });
    }

    // Create assignment
    const [dr] = await connection.query(
      `INSERT INTO delivery_assignments (tenant_id, vehicle_id, driver_id, supervisor_id, status, assigned_at)
       VALUES (?, ?, ?, ?, 'ASSIGNED', NOW())`,
      [tenant_id, vehicle_id, driver_id, supervisor_id]
    );
    const delivery_id = dr.insertId;

    // Get all items from selected orders
    const [orderItems] = await connection.query(
      "SELECT item_id, order_id FROM order_items WHERE order_id IN (?)",
      [order_ids]
    );
    if (!orderItems.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "No items found in selected orders" });
    }

    // Batch insert delivery_items
    const diValues = orderItems.map(item => [delivery_id, item.item_id, "PENDING"]);
    await connection.query(
      "INSERT INTO delivery_items (delivery_id, item_id, delivery_status) VALUES ?",
      [diValues]
    );

    // Mark orders as IN_PROGRESS
    await connection.query(
      "UPDATE orders SET delivery_status = 'IN_PROGRESS' WHERE order_id IN (?)",
      [order_ids]
    );

    // Mark vehicle as IN_USE
    await connection.query(
      "UPDATE vehicles SET status = 'IN_USE' WHERE vehicle_id = ?",
      [vehicle_id]
    );

    // Mark driver as IN_DELIVERY
    await connection.query(
      "UPDATE users SET driver_status = 'IN_DELIVERY' WHERE user_id = ?",
      [driver_id]
    );

    // Audit
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, supervisor_id, "CREATE_DELIVERY_ASSIGNMENT", "delivery_assignments", delivery_id]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: "Delivery assignment created successfully",
      delivery_id,
      assigned_orders: order_ids.length,
      total_items: orderItems.length,
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to create delivery assignment", error: error.message });
  } finally {
    connection.release();
  }
});

// ─── 6. ALL ASSIGNMENTS LIST ──────────────────────────────────
router.get("/assignments", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [assignments] = await pool.query(
      `SELECT
         da.delivery_id, da.status, da.assigned_at,
         v.vehicle_id, v.vehicle_number, v.vehicle_type,
         u.user_id AS driver_id, u.full_name AS driver_name, u.phone_number AS driver_phone,
         s.full_name AS supervisor_name,
         COUNT(DISTINCT o.order_id)  AS total_orders,
         COUNT(di.delivery_item_id)  AS total_items,
         SUM(CASE WHEN di.delivery_status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_items,
         SUM(CASE WHEN di.delivery_status = 'DAMAGED'   THEN 1 ELSE 0 END) AS damaged_items
       FROM delivery_assignments da
       JOIN vehicles v   ON da.vehicle_id    = v.vehicle_id
       JOIN users u      ON da.driver_id     = u.user_id
       JOIN users s      ON da.supervisor_id = s.user_id
       LEFT JOIN delivery_items di ON da.delivery_id = di.delivery_id
       LEFT JOIN order_items oi    ON di.item_id      = oi.item_id
       LEFT JOIN orders o          ON oi.order_id     = o.order_id
       WHERE da.tenant_id = ?
       GROUP BY
         da.delivery_id, da.status, da.assigned_at,
         v.vehicle_id, v.vehicle_number, v.vehicle_type,
         u.user_id, u.full_name, u.phone_number, s.full_name
       ORDER BY da.assigned_at DESC`,
      [tenant_id]
    );
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch assignments", error: error.message });
  }
});

// ─── 7. ASSIGNMENT STATS ──────────────────────────────────────
router.get("/assignment-stats", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const [rows] = await pool.query(
      `SELECT
         COUNT(*)                                                          AS total,
         SUM(CASE WHEN status = 'ASSIGNED'             THEN 1 ELSE 0 END) AS assigned,
         SUM(CASE WHEN status = 'IN_TRANSIT'           THEN 1 ELSE 0 END) AS in_transit,
         SUM(CASE WHEN status = 'DELIVERED'            THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN status = 'PARTIALLY_DELIVERED'  THEN 1 ELSE 0 END) AS partially_delivered
       FROM delivery_assignments
       WHERE tenant_id = ?`,
      [tenant_id]
    );
    res.json({ success: true, stats: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
  }
});

// ─── 8. ALL VEHICLES (for filter dropdown) ────────────────────
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

// ─── 9. ALL DRIVERS (for filter dropdown) ─────────────────────
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

// ─── 10. ASSIGNMENT DETAIL (for DeliveryDetailsModal) ─────────
router.get("/assignment/:deliveryId", async (req, res) => {
  try {
    const { tenant_id, role } = req.user;
    const { deliveryId } = req.params;
    if (!["admin", "supervisor", "user"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    // Assignment header
    const [assignment] = await pool.query(
      `SELECT
         da.delivery_id, da.status, da.assigned_at,
         v.vehicle_number, v.vehicle_type, v.capacity,
         u.full_name AS driver_name, u.phone_number AS driver_phone, u.email AS driver_email,
         s.full_name AS supervisor_name, s.phone_number AS supervisor_phone
       FROM delivery_assignments da
       JOIN vehicles v ON da.vehicle_id    = v.vehicle_id
       JOIN users u    ON da.driver_id     = u.user_id
       JOIN users s    ON da.supervisor_id = s.user_id
       WHERE da.delivery_id = ? AND da.tenant_id = ?`,
      [deliveryId, tenant_id]
    );
    if (!assignment.length)
      return res.status(404).json({ success: false, message: "Delivery assignment not found" });

    // All delivery items with full order context
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
         o.pincode
       FROM delivery_items di
       JOIN order_items oi ON di.item_id  = oi.item_id
       JOIN orders o       ON oi.order_id = o.order_id
       WHERE di.delivery_id = ?
       ORDER BY o.order_reference, oi.product_name`,
      [deliveryId]
    );

    res.json({ success: true, assignment: assignment[0], items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch delivery details", error: error.message });
  }
});

// ─── 11. UPDATE SINGLE ITEM STATUS ───────────────────────────
//         (PENDING → DELIVERED | DAMAGED)
//         Called per item from DeliveryDetailsModal
router.patch("/update-item-status/:deliveryItemId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tenant_id, role, user_id } = req.user;
    const { deliveryItemId } = req.params;
    const { status } = req.body;

    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const validStatuses = ["PENDING", "DELIVERED", "DAMAGED"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: "Invalid item status" });

    await connection.beginTransaction();

    // Verify item belongs to a delivery under this tenant
    const [itemCheck] = await connection.query(
      `SELECT di.delivery_item_id, di.delivery_status, da.delivery_id,
              da.tenant_id, da.status AS delivery_status
       FROM delivery_items di
       JOIN delivery_assignments da ON di.delivery_id = da.delivery_id
       WHERE di.delivery_item_id = ? AND da.tenant_id = ?`,
      [deliveryItemId, tenant_id]
    );

    if (!itemCheck.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Item not found or access denied" });
    }

    const item = itemCheck[0];

    // Do not allow changes if delivery is already finalized
    if (["DELIVERED", "PARTIALLY_DELIVERED"].includes(item.delivery_status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Cannot update items on a finalized delivery" });
    }

    // Update item status
    const deliveredAt = status === "DELIVERED" ? new Date() : null;
    await connection.query(
      "UPDATE delivery_items SET delivery_status = ?, delivered_at = ? WHERE delivery_item_id = ?",
      [status, deliveredAt, deliveryItemId]
    );

    // If item is damaged → create or update damage report stub
    if (status === "DAMAGED") {
      // Check if a damage report already exists for this item
      const [existingReport] = await connection.query(
        "SELECT damage_id FROM damage_reports WHERE delivery_item_id = ?",
        [deliveryItemId]
      );
      if (!existingReport.length) {
        await connection.query(
          `INSERT INTO damage_reports (delivery_item_id, reported_by, description, reported_at)
           VALUES (?, ?, 'Marked as damaged during delivery', NOW())`,
          [deliveryItemId, user_id]
        );
      }
    }

    // Audit
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, `UPDATE_ITEM_STATUS_TO_${status}`, "delivery_items", deliveryItemId]
    );

    await connection.commit();
    res.json({ success: true, message: `Item status updated to ${status}` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to update item status", error: error.message });
  } finally {
    connection.release();
  }
});

// ─── 12. UPDATE OVERALL DELIVERY STATUS ──────────────────────
//         Handles ASSIGNED → IN_TRANSIT → DELIVERED / PARTIALLY_DELIVERED
//         Also frees vehicle + driver when delivery is completed
router.patch("/update-status/:deliveryId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { tenant_id, role, user_id } = req.user;
    const { deliveryId } = req.params;
    const { status }     = req.body;

    if (!["admin", "supervisor"].includes(role))
      return res.status(403).json({ success: false, message: "Access denied" });

    const validStatuses = ["ASSIGNED", "IN_TRANSIT", "DELIVERED", "PARTIALLY_DELIVERED"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    await connection.beginTransaction();

    // Fetch current assignment
    const [ac] = await connection.query(
      `SELECT da.delivery_id, da.vehicle_id, da.driver_id, da.status AS current_status
       FROM delivery_assignments da
       WHERE da.delivery_id = ? AND da.tenant_id = ?`,
      [deliveryId, tenant_id]
    );
    if (!ac.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Delivery assignment not found" });
    }

    const { vehicle_id, driver_id, current_status } = ac[0];

    // Prevent re-finalizing an already final delivery
    if (["DELIVERED", "PARTIALLY_DELIVERED"].includes(current_status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "This delivery is already finalized" });
    }

    // Update delivery assignment status
    await connection.query(
      "UPDATE delivery_assignments SET status = ? WHERE delivery_id = ? AND tenant_id = ?",
      [status, deliveryId, tenant_id]
    );

    // ─── Completion logic ─────────────────────────────────────────
    if (status === "DELIVERED" || status === "PARTIALLY_DELIVERED") {
      // 1. Free vehicle → AVAILABLE
      await connection.query(
        "UPDATE vehicles SET status = 'AVAILABLE' WHERE vehicle_id = ?",
        [vehicle_id]
      );

      // 2. Free driver → AVAILABLE
      await connection.query(
        "UPDATE users SET driver_status = 'AVAILABLE' WHERE user_id = ?",
        [driver_id]
      );

      if (status === "DELIVERED") {
        // 3a. Mark ALL remaining PENDING delivery items as DELIVERED
        await connection.query(
          `UPDATE delivery_items
           SET delivery_status = 'DELIVERED', delivered_at = NOW()
           WHERE delivery_id = ? AND delivery_status = 'PENDING'`,
          [deliveryId]
        );

        // 3b. Mark ALL linked orders as DELIVERED
        await connection.query(
          `UPDATE orders o
           JOIN order_items oi  ON o.order_id  = oi.order_id
           JOIN delivery_items di ON oi.item_id = di.item_id
           SET o.delivery_status = 'DELIVERED', o.delivered_at = NOW()
           WHERE di.delivery_id = ?`,
          [deliveryId]
        );
      } else {
        // PARTIALLY_DELIVERED:
        // Orders that have ALL items delivered → mark as DELIVERED
        // Orders that still have PENDING/DAMAGED items → keep IN_PROGRESS (can be re-dispatched)
        await connection.query(
          `UPDATE orders o
           SET o.delivery_status = 'DELIVERED', o.delivered_at = NOW()
           WHERE o.order_id IN (
             SELECT DISTINCT sub.order_id FROM (
               SELECT oi.order_id,
                 COUNT(*) AS total_items,
                 SUM(CASE WHEN di.delivery_status = 'DELIVERED' THEN 1 ELSE 0 END) AS del_items
               FROM order_items oi
               JOIN delivery_items di ON oi.item_id = di.item_id
               WHERE di.delivery_id = ?
               GROUP BY oi.order_id
               HAVING del_items = total_items
             ) sub
           )`,
          [deliveryId]
        );
      }
    }

    // Audit
    await connection.query(
      "INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      [tenant_id, user_id, `UPDATE_DELIVERY_STATUS_TO_${status}`, "delivery_assignments", deliveryId]
    );

    await connection.commit();
    res.json({ success: true, message: `Delivery status updated to ${status}` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: "Failed to update delivery status", error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
