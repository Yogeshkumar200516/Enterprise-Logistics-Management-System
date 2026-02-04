// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./src/config/config.js'); // MySQL connection
const authRoutes = require('./src/routes/authRoutes.js');
const authenticateToken = require('./src/middleware/authMiddleware.js'); // JWT middleware
const addMembers = require('./src/routes/addMembers.js');

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================
// Global Middleware
// ==========================
app.use(cors());                              // Enable CORS
app.use(express.json());                      // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// ==========================
// Auth Routes
// ==========================
app.use('/api/members', addMembers);
app.use('/api/auth', authRoutes);

// ==========================
// Public Test Route
// ==========================
app.get('/', (req, res) => {
  res.send('🏋️‍♂️ Gym Management Backend is Running ✅');
});

// ==========================
// DB Connection Test Route
// ==========================
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS current_time');
    res.json({ message: 'DB connected ✅', time: rows[0].current_time });
  } catch (error) {
    console.error('DB connection failed ❌', error.message);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ==========================
// Protected Route Example
// ==========================
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    message: `Hello ${req.user.username}, you accessed protected data! 🔐`,
    user: req.user
  });
});

// ==========================
// Placeholder for Other Routes
// ==========================
// Example:
// const memberRoutes = require('./src/routes/memberRoutes.js');
// app.use('/api/members', authenticateToken, memberRoutes);

// ==========================
// Start Server
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
