const mysql = require("mysql2/promise");
require("dotenv").config();

let pool;

if (process.env.MYSQL_URL) {
  // ✅ Production (Railway)
  pool = mysql.createPool(process.env.MYSQL_URL);
} else {
  // ✅ Local Development
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "logistic_app3",
    port: process.env.DB_PORT || 3306,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

// ✅ Test connection (safe)
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL Connected Successfully");
    conn.release();
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
  }
})();

module.exports = pool;