// config.js or db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a promise-based connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Yogesh@200516',
    database: process.env.DB_NAME || 'logistics_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database!');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
}

testConnection();

module.exports = pool;
