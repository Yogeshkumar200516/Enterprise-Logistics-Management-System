// =======================================================
// Notification Routes - All Roles
// =======================================================
const express = require("express");
const router = express.Router();
const pool = require("../config/config.js");

// ─────────────────────────────────────────────────────
// Helper: mark notifications as read (generic approach
// using audit_log pattern – we'll use a lightweight
// in-query "last_seen" approach via query param)
// ─────────────────────────────────────────────────────

// ════════════════════════════════════════════════════
// GET /api/notifications
// Returns role-aware notifications for the logged-in user
// ════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  const { user_id, role, tenant_id } = req.user;

  try {
    let notifications = [];

    // ────────────────────────────────────────────────
    // ROLE: user (driver)
    // ────────────────────────────────────────────────
    if (role === "user") {
      // 1. Delivery assignments assigned to this driver
      const [deliveries] = await pool.query(
        `SELECT
            da.delivery_id,
            da.status,
            da.assigned_at,
            v.vehicle_number,
            u_sup.full_name AS supervisor_name,
            COUNT(di.delivery_item_id) AS total_items
         FROM delivery_assignments da
         JOIN vehicles v ON da.vehicle_id = v.vehicle_id
         JOIN users u_sup ON da.supervisor_id = u_sup.user_id
         LEFT JOIN delivery_items di ON di.delivery_id = da.delivery_id
         WHERE da.driver_id = ? AND da.tenant_id = ?
         GROUP BY da.delivery_id
         ORDER BY da.assigned_at DESC
         LIMIT 20`,
        [user_id, tenant_id]
      );

      deliveries.forEach((d) => {
        let type = "delivery_assigned";
        let message = `New delivery assigned by ${d.supervisor_name} — Vehicle: ${d.vehicle_number}, ${d.total_items} item(s)`;
        let priority = "info";

        if (d.status === "IN_TRANSIT") {
          type = "delivery_in_transit";
          message = `Your delivery #${d.delivery_id} is in transit — ${d.total_items} item(s)`;
          priority = "warning";
        } else if (d.status === "DELIVERED") {
          type = "delivery_completed";
          message = `Delivery #${d.delivery_id} marked as delivered ✓`;
          priority = "success";
        } else if (d.status === "PARTIALLY_DELIVERED") {
          type = "delivery_partial";
          message = `Delivery #${d.delivery_id} partially delivered — action may be needed`;
          priority = "warning";
        }

        notifications.push({
          id: `del_${d.delivery_id}`,
          type,
          title: "Delivery Assignment",
          message,
          priority,
          timestamp: d.assigned_at,
          meta: { delivery_id: d.delivery_id, status: d.status },
        });
      });

      // 2. Scrap assignments for this driver
      const [scraps] = await pool.query(
        `SELECT
            sl.scrap_id,
            sl.status,
            sl.scrap_type,
            sl.source,
            sl.created_at,
            v.vehicle_number,
            u_sup.full_name AS supervisor_name
         FROM scrap_logs sl
         JOIN vehicles v ON sl.vehicle_id = v.vehicle_id
         JOIN users u_sup ON sl.supervisor_id = u_sup.user_id
         WHERE sl.driver_id = ? AND sl.tenant_id = ?
         ORDER BY sl.created_at DESC
         LIMIT 20`,
        [user_id, tenant_id]
      );

      scraps.forEach((s) => {
        let type = "scrap_assigned";
        let message = `Scrap pickup assigned by ${s.supervisor_name} — Type: ${s.scrap_type || "General"}, Source: ${s.source}`;
        let priority = "info";

        if (s.status === "IN_TRANSIT") {
          type = "scrap_in_transit";
          message = `Scrap #${s.scrap_id} pickup in transit — ${s.scrap_type || "General"}`;
          priority = "warning";
        } else if (s.status === "COMPLETED") {
          type = "scrap_completed";
          message = `Scrap #${s.scrap_id} collection completed ✓`;
          priority = "success";
        } else if (s.status === "APPROVED") {
          type = "scrap_approved";
          message = `Scrap #${s.scrap_id} has been approved ✓`;
          priority = "success";
        } else if (s.status === "REJECTED") {
          type = "scrap_rejected";
          message = `Scrap #${s.scrap_id} was rejected — please check details`;
          priority = "error";
        }

        notifications.push({
          id: `scrap_${s.scrap_id}`,
          type,
          title: "Scrap Assignment",
          message,
          priority,
          timestamp: s.created_at,
          meta: { scrap_id: s.scrap_id, status: s.status },
        });
      });
    }

    // ────────────────────────────────────────────────
    // ROLE: supervisor
    // ────────────────────────────────────────────────
    else if (role === "supervisor") {
      // 1. Deliveries needing attention (PARTIALLY_DELIVERED / IN_TRANSIT stale)
      const [deliveries] = await pool.query(
        `SELECT
            da.delivery_id,
            da.status,
            da.assigned_at,
            u_drv.full_name AS driver_name,
            v.vehicle_number,
            COUNT(di.delivery_item_id) AS total_items,
            SUM(di.delivery_status = 'DELIVERED') AS delivered_count,
            SUM(di.delivery_status = 'DAMAGED') AS damaged_count
         FROM delivery_assignments da
         JOIN users u_drv ON da.driver_id = u_drv.user_id
         JOIN vehicles v ON da.vehicle_id = v.vehicle_id
         LEFT JOIN delivery_items di ON di.delivery_id = da.delivery_id
         WHERE da.supervisor_id = ? AND da.tenant_id = ?
         GROUP BY da.delivery_id
         ORDER BY da.assigned_at DESC
         LIMIT 20`,
        [user_id, tenant_id]
      );

      deliveries.forEach((d) => {
        let type = "delivery_update";
        let priority = "info";
        let message = `Delivery #${d.delivery_id} by ${d.driver_name} — Status: ${d.status}`;

        if (d.status === "PARTIALLY_DELIVERED") {
          type = "delivery_action_needed";
          message = `⚠ Delivery #${d.delivery_id} partially delivered by ${d.driver_name} — ${d.delivered_count}/${d.total_items} items done`;
          priority = "warning";
        } else if (d.damaged_count > 0) {
          type = "delivery_damage";
          message = `⚠ ${d.damaged_count} damaged item(s) in Delivery #${d.delivery_id} by ${d.driver_name}`;
          priority = "error";
        } else if (d.status === "DELIVERED") {
          type = "delivery_completed";
          message = `✓ Delivery #${d.delivery_id} completed by ${d.driver_name} — All ${d.total_items} items delivered`;
          priority = "success";
        } else if (d.status === "IN_TRANSIT") {
          type = "delivery_in_transit";
          message = `${d.driver_name} is in transit for Delivery #${d.delivery_id}`;
          priority = "info";
        }

        notifications.push({
          id: `sup_del_${d.delivery_id}`,
          type,
          title: "Delivery Status",
          message,
          priority,
          timestamp: d.assigned_at,
          meta: { delivery_id: d.delivery_id, status: d.status },
        });
      });

      // 2. Scrap logs needing approval
      const [scraps] = await pool.query(
        `SELECT
            sl.scrap_id,
            sl.status,
            sl.scrap_type,
            sl.source,
            sl.created_at,
            sl.completed_at,
            u_drv.full_name AS driver_name
         FROM scrap_logs sl
         JOIN users u_drv ON sl.driver_id = u_drv.user_id
         WHERE sl.supervisor_id = ? AND sl.tenant_id = ?
         ORDER BY sl.created_at DESC
         LIMIT 20`,
        [user_id, tenant_id]
      );

      scraps.forEach((s) => {
        let type = "scrap_update";
        let priority = "info";
        let message = `Scrap #${s.scrap_id} — ${s.scrap_type || "General"} by ${s.driver_name}`;

        if (s.status === "COMPLETED") {
          type = "scrap_needs_approval";
          message = `✋ Scrap #${s.scrap_id} completed by ${s.driver_name} — Awaiting your approval`;
          priority = "warning";
        } else if (s.status === "APPROVED") {
          type = "scrap_approved";
          message = `✓ Scrap #${s.scrap_id} approved — ${s.scrap_type || "General"}`;
          priority = "success";
        } else if (s.status === "REJECTED") {
          type = "scrap_rejected";
          message = `✗ Scrap #${s.scrap_id} rejected — ${s.driver_name}`;
          priority = "error";
        } else if (s.status === "IN_TRANSIT") {
          type = "scrap_in_transit";
          message = `${s.driver_name} is collecting Scrap #${s.scrap_id}`;
          priority = "info";
        }

        notifications.push({
          id: `sup_scrap_${s.scrap_id}`,
          type,
          title: "Scrap Status",
          message,
          priority,
          timestamp: s.created_at,
          meta: { scrap_id: s.scrap_id, status: s.status },
        });
      });
    }

    // ────────────────────────────────────────────────
    // ROLE: admin
    // ────────────────────────────────────────────────
    else if (role === "admin") {
      // 1. Overview: Pending deliveries needing action
      const [[deliverySummary]] = await pool.query(
        `SELECT
            COUNT(*) AS total,
            SUM(status = 'ASSIGNED') AS pending,
            SUM(status = 'IN_TRANSIT') AS in_transit,
            SUM(status = 'PARTIALLY_DELIVERED') AS partial,
            SUM(status = 'DELIVERED') AS delivered
         FROM delivery_assignments
         WHERE tenant_id = ?`,
        [tenant_id]
      );

      if (deliverySummary.partial > 0) {
        notifications.push({
          id: "admin_del_partial",
          type: "admin_action",
          title: "Deliveries Need Attention",
          message: `⚠ ${deliverySummary.partial} delivery(ies) are partially delivered and need supervisor review`,
          priority: "warning",
          timestamp: new Date(),
          meta: { count: deliverySummary.partial, action: "review_partial_deliveries" },
        });
      }

      if (deliverySummary.in_transit > 0) {
        notifications.push({
          id: "admin_del_transit",
          type: "admin_overview",
          title: "Active Deliveries",
          message: `🚚 ${deliverySummary.in_transit} delivery(ies) currently in transit across your fleet`,
          priority: "info",
          timestamp: new Date(),
          meta: { count: deliverySummary.in_transit, action: "view_deliveries" },
        });
      }

      // 2. Damaged items overview
      const [[damageSummary]] = await pool.query(
        `SELECT COUNT(*) AS damaged_count
         FROM delivery_items di
         JOIN delivery_assignments da ON di.delivery_id = da.delivery_id
         WHERE da.tenant_id = ? AND di.delivery_status = 'DAMAGED'`,
        [tenant_id]
      );

      if (damageSummary.damaged_count > 0) {
        notifications.push({
          id: "admin_damage",
          type: "admin_action",
          title: "Damaged Items Reported",
          message: `⚠ ${damageSummary.damaged_count} item(s) reported as damaged — review damage reports`,
          priority: "error",
          timestamp: new Date(),
          meta: { count: damageSummary.damaged_count, action: "view_damage_reports" },
        });
      }

      // 3. Scrap approvals pending
      const [[scrapPending]] = await pool.query(
        `SELECT COUNT(*) AS pending_approval
         FROM scrap_logs
         WHERE tenant_id = ? AND status = 'COMPLETED'`,
        [tenant_id]
      );

      if (scrapPending.pending_approval > 0) {
        notifications.push({
          id: "admin_scrap_pending",
          type: "admin_action",
          title: "Scrap Approvals Pending",
          message: `✋ ${scrapPending.pending_approval} scrap log(s) completed and awaiting supervisor approval`,
          priority: "warning",
          timestamp: new Date(),
          meta: { count: scrapPending.pending_approval, action: "view_scraps" },
        });
      }

      // 4. Drivers off duty / unavailable
      const [[driverStatus]] = await pool.query(
        `SELECT
            SUM(driver_status = 'AVAILABLE') AS available,
            SUM(driver_status = 'IN_DELIVERY') AS in_delivery,
            SUM(driver_status = 'OFF_DUTY') AS off_duty
         FROM users
         WHERE tenant_id = ? AND role = 'user'`,
        [tenant_id]
      );

      notifications.push({
        id: "admin_driver_overview",
        type: "admin_overview",
        title: "Driver Fleet Status",
        message: `👥 ${driverStatus.available || 0} available · ${driverStatus.in_delivery || 0} in delivery · ${driverStatus.off_duty || 0} off duty`,
        priority: "info",
        timestamp: new Date(),
        meta: { action: "view_drivers" },
      });

      // 5. Recent supervisor activity (latest 5 deliveries across all supervisors)
      const [recentActivity] = await pool.query(
        `SELECT
            da.delivery_id,
            da.status,
            da.assigned_at,
            u_sup.full_name AS supervisor_name,
            u_drv.full_name AS driver_name
         FROM delivery_assignments da
         JOIN users u_sup ON da.supervisor_id = u_sup.user_id
         JOIN users u_drv ON da.driver_id = u_drv.user_id
         WHERE da.tenant_id = ?
         ORDER BY da.assigned_at DESC
         LIMIT 5`,
        [tenant_id]
      );

      recentActivity.forEach((a) => {
        notifications.push({
          id: `admin_recent_${a.delivery_id}`,
          type: "admin_recent",
          title: "Recent Delivery",
          message: `${a.supervisor_name} assigned Delivery #${a.delivery_id} to ${a.driver_name} — ${a.status}`,
          priority: a.status === "PARTIALLY_DELIVERED" ? "warning" : "info",
          timestamp: a.assigned_at,
          meta: { delivery_id: a.delivery_id, status: a.status },
        });
      });
    }

    // Sort all notifications by timestamp DESC
    notifications.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Count unread (action required) items
    const actionCount = notifications.filter(
      (n) => n.priority === "error" || n.priority === "warning"
    ).length;

    res.json({
      success: true,
      count: notifications.length,
      action_required: actionCount,
      notifications,
    });
  } catch (error) {
    console.error("Notification fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

// ════════════════════════════════════════════════════
// GET /api/notifications/count
// Lightweight badge count endpoint
// ════════════════════════════════════════════════════
router.get("/count", async (req, res) => {
  const { user_id, role, tenant_id } = req.user;

  try {
    let count = 0;

    if (role === "user") {
      const [[da]] = await pool.query(
        `SELECT COUNT(*) AS c FROM delivery_assignments WHERE driver_id = ? AND tenant_id = ? AND status IN ('ASSIGNED','IN_TRANSIT','PARTIALLY_DELIVERED')`,
        [user_id, tenant_id]
      );
      const [[sa]] = await pool.query(
        `SELECT COUNT(*) AS c FROM scrap_logs WHERE driver_id = ? AND tenant_id = ? AND status IN ('ASSIGNED','IN_TRANSIT')`,
        [user_id, tenant_id]
      );
      count = (da.c || 0) + (sa.c || 0);
    } else if (role === "supervisor") {
      const [[da]] = await pool.query(
        `SELECT COUNT(*) AS c FROM delivery_assignments WHERE supervisor_id = ? AND tenant_id = ? AND status IN ('PARTIALLY_DELIVERED','IN_TRANSIT')`,
        [user_id, tenant_id]
      );
      const [[sa]] = await pool.query(
        `SELECT COUNT(*) AS c FROM scrap_logs WHERE supervisor_id = ? AND tenant_id = ? AND status = 'COMPLETED'`,
        [user_id, tenant_id]
      );
      count = (da.c || 0) + (sa.c || 0);
    } else if (role === "admin") {
      const [[partial]] = await pool.query(
        `SELECT COUNT(*) AS c FROM delivery_assignments WHERE tenant_id = ? AND status = 'PARTIALLY_DELIVERED'`,
        [tenant_id]
      );
      const [[damaged]] = await pool.query(
        `SELECT COUNT(*) AS c FROM delivery_items di JOIN delivery_assignments da ON di.delivery_id = da.delivery_id WHERE da.tenant_id = ? AND di.delivery_status = 'DAMAGED'`,
        [tenant_id]
      );
      const [[scrapPending]] = await pool.query(
        `SELECT COUNT(*) AS c FROM scrap_logs WHERE tenant_id = ? AND status = 'COMPLETED'`,
        [tenant_id]
      );
      count = (partial.c || 0) + (damaged.c || 0) + (scrapPending.c || 0);
    }

    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, count: 0 });
  }
});

module.exports = router;