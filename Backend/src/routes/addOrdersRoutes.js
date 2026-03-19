// src/routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../config/config.js");
const multer = require("multer");
const readXlsxFile = require("read-excel-file/node");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

// Multer setup for excel uploads
const upload = multer({ dest: "uploads/excel/" });

// ─────────────────────────────────────────────
// GET /api/orders  — list all orders for tenant
// ─────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { search, status } = req.query;

    let query = `
      SELECT 
        o.order_id,
        o.order_reference,
        o.customer_name,
        o.customer_address,
        o.pincode,
        o.delivery_status,
        o.created_at,
        o.delivered_at,
        COUNT(oi.item_id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.tenant_id = ?
    `;
    const params = [tenantId];

    if (status && status !== "ALL") {
      query += " AND o.delivery_status = ?";
      params.push(status);
    }

    if (search) {
      query += " AND (o.order_reference LIKE ? OR o.customer_name LIKE ? OR o.pincode LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += " GROUP BY o.order_id ORDER BY o.created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/orders/:id  — single order with items
// ─────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const [[order]] = await pool.query(
      "SELECT * FROM orders WHERE order_id = ? AND tenant_id = ?",
      [id, tenantId]
    );

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const [items] = await pool.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [id]
    );

    res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/orders  — create order with items
// ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const tenantId = req.user.tenant_id;
    const { order_reference, customer_name, customer_address, pincode, items } = req.body;

    if (!customer_name || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Customer name and at least one item are required" });
    }

    const [orderResult] = await conn.query(
      `INSERT INTO orders (tenant_id, order_reference, customer_name, customer_address, pincode)
       VALUES (?, ?, ?, ?, ?)`,
      [tenantId, order_reference || null, customer_name, customer_address, pincode]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_name, quantity, is_fragile) VALUES (?, ?, ?, ?)`,
        [orderId, item.product_name, item.quantity || 1, item.is_fragile ? 1 : 0]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: "Order created", order_id: orderId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────
// PUT /api/orders/:id  — update order
// ─────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { order_reference, customer_name, customer_address, pincode, items } = req.body;

    const [[existing]] = await conn.query(
      "SELECT * FROM orders WHERE order_id = ? AND tenant_id = ?",
      [id, tenantId]
    );
    if (!existing) return res.status(404).json({ success: false, message: "Order not found" });

    await conn.query(
      `UPDATE orders SET order_reference=?, customer_name=?, customer_address=?, pincode=? WHERE order_id=?`,
      [order_reference, customer_name, customer_address, pincode, id]
    );

    if (items && items.length > 0) {
      await conn.query("DELETE FROM order_items WHERE order_id = ?", [id]);
      for (const item of items) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_name, quantity, is_fragile) VALUES (?, ?, ?, ?)`,
          [id, item.product_name, item.quantity || 1, item.is_fragile ? 1 : 0]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Order updated" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────
// DELETE /api/orders/:id  — only NOT_ASSIGNED
// ─────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const [[order]] = await pool.query(
      "SELECT * FROM orders WHERE order_id = ? AND tenant_id = ?",
      [id, tenantId]
    );

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.delivery_status !== "NOT_ASSIGNED") {
      return res.status(400).json({ success: false, message: "Only NOT_ASSIGNED orders can be deleted" });
    }

    await pool.query("DELETE FROM orders WHERE order_id = ?", [id]);
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/orders/template/download  — Excel template
// ─────────────────────────────────────────────
router.get("/template/download", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders");

    sheet.columns = [
      { header: "order_reference", key: "order_reference", width: 20 },
      { header: "customer_name", key: "customer_name", width: 25 },
      { header: "customer_address", key: "customer_address", width: 35 },
      { header: "pincode", key: "pincode", width: 12 },
      { header: "product_name", key: "product_name", width: 25 },
      { header: "quantity", key: "quantity", width: 12 },
      { header: "is_fragile", key: "is_fragile", width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF024990" },
    };

    // Sample rows
    sheet.addRow({
      order_reference: "ORD-001",
      customer_name: "John Doe",
      customer_address: "123 Main St, City",
      pincode: "600001",
      product_name: "Product A",
      quantity: 2,
      is_fragile: "FALSE",
    });
    sheet.addRow({
      order_reference: "ORD-001",
      customer_name: "John Doe",
      customer_address: "123 Main St, City",
      pincode: "600001",
      product_name: "Product B",
      quantity: 1,
      is_fragile: "TRUE",
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=orders_template.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/orders/bulk/upload  — Upload Excel
// ─────────────────────────────────────────────
router.post("/bulk/upload", upload.single("file"), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const tenantId = req.user.tenant_id;
    const rows = await readXlsxFile(req.file.path);

    // Remove header row
    const [headers, ...dataRows] = rows;

    if (!dataRows.length) {
      return res.status(400).json({ success: false, message: "No data rows found in Excel" });
    }

    // Group rows by order_reference (or by row order if no reference)
    const ordersMap = new Map();
    for (const row of dataRows) {
      const [order_reference, customer_name, customer_address, pincode, product_name, quantity, is_fragile] = row;
      const key = order_reference || `__ROW__${Math.random()}`;

      if (!ordersMap.has(key)) {
        ordersMap.set(key, {
          order_reference: order_reference || null,
          customer_name,
          customer_address,
          pincode: pincode ? String(pincode) : null,
          items: [],
        });
      }
      ordersMap.get(key).items.push({
        product_name,
        quantity: Number(quantity) || 1,
        is_fragile: String(is_fragile).toUpperCase() === "TRUE" ? 1 : 0,
      });
    }

    await conn.beginTransaction();
    let createdCount = 0;

    for (const [, orderData] of ordersMap) {
      const [result] = await conn.query(
        `INSERT INTO orders (tenant_id, order_reference, customer_name, customer_address, pincode)
         VALUES (?, ?, ?, ?, ?)`,
        [tenantId, orderData.order_reference, orderData.customer_name, orderData.customer_address, orderData.pincode]
      );
      const orderId = result.insertId;

      for (const item of orderData.items) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_name, quantity, is_fragile) VALUES (?, ?, ?, ?)`,
          [orderId, item.product_name, item.quantity, item.is_fragile]
        );
      }
      createdCount++;
    }

    await conn.commit();

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: `${createdCount} order(s) created successfully` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;