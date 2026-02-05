const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./src/config/config.js');
const authRoutes = require('./src/routes/authRoutes.js');
const authenticateToken = require('./src/middleware/authMiddleware.js');
const addCompanyRoutes = require('./src/routes/addCompanyRoutes.js');
const userRoutes = require('./src/routes/addUserRoutes.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================
// Global Middleware
// ==========================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================
// PUBLIC ROUTES
// ==========================
app.use('/api/auth', authenticateToken, authRoutes);

// ==========================
// PROTECTED ROUTES
// ==========================
app.use("/api/companies", authenticateToken, addCompanyRoutes);
app.use("/api/users", authenticateToken, userRoutes);

// ==========================
// Test Routes
// ==========================
app.get('/', (req, res) => {
  res.send('Logistics App Backend is Running ✅');
});

app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS current_time');
    res.json({ message: 'DB connected ✅', time: rows[0].current_time });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Protected route accessed',
    user: req.user,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
