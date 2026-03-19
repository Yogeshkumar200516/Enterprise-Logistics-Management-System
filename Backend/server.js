// =======================================================
// Logistics App - Main Server File
// =======================================================

const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
const path    = require("path");

const pool = require("./src/config/config.js");

// ==========================
// ROUTE IMPORTS
// ==========================
const authRoutes               = require("./src/routes/authRoutes.js");
const addCompanyRoutes         = require("./src/routes/addCompanyRoutes.js");
const userRoutes               = require("./src/routes/addUserRoutes.js");
const resourceRoutes           = require("./src/routes/addResourcesRoutes");
const temporaryResourcesRoutes = require("./src/routes/temporaryResourcesRoutes");

const deliveryLoggerRoutes     = require("./src/routes/deliveryLoggerRoutes");
const driverDeliveryRoutes     = require("./src/routes/driverDeliveryItemsRoutes");

const scrapLogRoutes           = require("./src/routes/scrapLogStatusRoutes");
const driverScrapRoutes        = require("./src/routes/scrapDriverRoutes");

const orderRoutes              = require("./src/routes/addOrdersRoutes");

// ── Dashboard routes ───────────────────────────────────────────────
const adminDashRoutes          = require("./src/routes/adminDashRoutes");
const supervisorDashRoutes     = require("./src/routes/supervisorDashRoutes");

// ── History routes ─────────────────────────────────────────────────
const adminHistoryRoutes       = require("./src/routes/adminHistoryRoutes");
const supervisorHistoryRoutes  = require("./src/routes/supervisorHistoryRoutes");
const driverHistoryRoutes      = require("./src/routes/driverHistoryRoutes");

// ── Notification routes ────────────────────────────────────────────
const notificationRoutes       = require("./src/routes/notificationRoutes");

// ==========================
// MIDDLEWARE IMPORT
// ==========================
const authenticateToken = require("./src/middleware/authMiddleware.js");

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// =======================================================
// GLOBAL MIDDLEWARE
// =======================================================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================================================
// STATIC FILE SERVING
// =======================================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================================================
// PUBLIC ROUTES
// =======================================================
app.use("/api/auth", authRoutes);

// =======================================================
// PROTECTED ROUTES
// =======================================================

app.use("/api/companies",           authenticateToken, addCompanyRoutes);
app.use("/api/users",               authenticateToken, userRoutes);
app.use("/api/resources",           authenticateToken, resourceRoutes);
app.use("/api/supervisor",          authenticateToken, temporaryResourcesRoutes);
app.use("/api/delivery-logger",     authenticateToken, deliveryLoggerRoutes);
app.use("/api/driver-delivery",     authenticateToken, driverDeliveryRoutes);
app.use("/api/scrap-log",           authenticateToken, scrapLogRoutes);
app.use("/api/driver-scrap",        authenticateToken, driverScrapRoutes);
app.use("/api/orders",              authenticateToken, orderRoutes);

// ── Dashboard routes ───────────────────────────────────────────────
//    Admin:
//      GET /api/admin-dashboard/summary
//      GET /api/admin-dashboard/orders-trend
//      GET /api/admin-dashboard/delivery-status-dist
//      GET /api/admin-dashboard/order-status-pie
//      GET /api/admin-dashboard/supervisor-performance
//      GET /api/admin-dashboard/driver-performance
//      GET /api/admin-dashboard/recent-activities
app.use("/api/admin-dashboard",      authenticateToken, adminDashRoutes);

//    Supervisor:
//      GET /api/supervisor-dashboard/summary
//      GET /api/supervisor-dashboard/delivery-trend
//      GET /api/supervisor-dashboard/delivery-status-pie
//      GET /api/supervisor-dashboard/scrap-status-pie
//      GET /api/supervisor-dashboard/driver-workload
//      GET /api/supervisor-dashboard/recent-deliveries
//      GET /api/supervisor-dashboard/recent-scraps
app.use("/api/supervisor-dashboard", authenticateToken, supervisorDashRoutes);

// ── History routes ─────────────────────────────────────────────────
//    Admin History:
//      GET /api/admin-history/deliveries          ?period&status&supervisor_id&driver_id&page&limit
//      GET /api/admin-history/scraps              ?period&status&source&supervisor_id&driver_id&page&limit
//      GET /api/admin-history/orders              ?period&status&page&limit
//      GET /api/admin-history/filters             (supervisors + drivers dropdown data)
//      GET /api/admin-history/delivery/:id        (full delivery detail with items)
//      GET /api/admin-history/scrap/:id           (full scrap detail with items)
app.use("/api/admin-history",        authenticateToken, adminHistoryRoutes);

//    Supervisor History:
//      GET /api/supervisor-history/deliveries     ?period&status&driver_id&page&limit
//      GET /api/supervisor-history/scraps         ?period&status&source&driver_id&page&limit
//      GET /api/supervisor-history/orders         ?period&status&page&limit
//      GET /api/supervisor-history/filters        (drivers dropdown data)
//      GET /api/supervisor-history/delivery/:id   (full delivery detail with items)
//      GET /api/supervisor-history/scrap/:id      (full scrap detail with items)
app.use("/api/supervisor-history",   authenticateToken, supervisorHistoryRoutes);

//    Driver History:
//      GET /api/driver-history/deliveries         ?period&status&page&limit
//      GET /api/driver-history/scraps             ?period&status&source&page&limit
//      GET /api/driver-history/stats              (personal performance summary)
//      GET /api/driver-history/delivery/:id       (full delivery detail with items)
//      GET /api/driver-history/scrap/:id          (full scrap detail with items)
app.use("/api/driver-history",       authenticateToken, driverHistoryRoutes);

// ── Notification routes ────────────────────────────────────────────
//      GET /api/notifications          → role-aware notification list
//      GET /api/notifications/count    → lightweight badge count
app.use("/api/notifications",        authenticateToken, notificationRoutes);

// =======================================================
// TEST ROUTES
// =======================================================
app.get("/", (req, res) => res.send("Logistics App Backend is Running ✅"));

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS current_time");
    res.json({ message: "DB connected ✅", time: rows[0].current_time });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed", details: error.message });
  }
});

app.get("/api/protected", authenticateToken, (req, res) => {
  res.json({ message: "Protected route accessed", user: req.user });
});

// =======================================================
// GLOBAL ERROR HANDLER
// =======================================================
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);
  if (err.name === "MulterError") {
    return res.status(400).json({ success: false, message: "File upload error", error: err.message });
  }
  res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

// =======================================================
// START SERVER
// =======================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});