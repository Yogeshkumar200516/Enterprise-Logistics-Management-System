const express = require('express');
const router = express.Router();
const db = require('../config/config');  // MySQL db connection

// POST route to add a member
router.post('/', async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      address,
      date_of_birth,
      gender,
      join_date,
      status,
      emergency_contact,
      membership_type,
      password, // ✅ Get password from frontend form
    } = req.body;

    // ✅ Insert into users table (no hashing now)
    const [userResult] = await db.query(
      `INSERT INTO users (username, password, role, email)
       VALUES (?, ?, 'member', ?)`,
      [full_name, password, email]
    );

    const user_id = userResult.insertId;

    // ✅ Insert into members table
    await db.query(
      `INSERT INTO members (
        user_id, full_name, email, phone, address,
        date_of_birth, gender, join_date, status,
        emergency_contact, membership_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        full_name,
        email,
        phone,
        address,
        date_of_birth,
        gender,
        join_date,
        status,
        emergency_contact,
        membership_type,
      ]
    );

    res.status(201).json({ message: '✅ Member created successfully' });
  } catch (error) {
    console.error('❌ Error creating member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// routes/members.js

router.put('/:id', async (req, res) => {
    try {
      const memberId = req.params.id;
      const {
        full_name,
        email,
        phone,
        address,
        date_of_birth,
        gender,
        join_date,
        status,
        emergency_contact,
        membership_type
      } = req.body;
  
      // Update members table
      await db.query(
        `UPDATE members SET
          full_name=?, email=?, phone=?, address=?, date_of_birth=?,
          gender=?, join_date=?, status=?, emergency_contact=?, membership_type=?
        WHERE id=?`,
        [
          full_name, email, phone, address, date_of_birth,
          gender, join_date, status, emergency_contact, membership_type, memberId
        ]
      );
  
      res.json({ message: '✅ Member updated successfully' });
    } catch (error) {
      console.error('❌ Error updating member:', error);
      res.status(500).json({ error: 'Failed to update member' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const memberId = req.params.id;
  
      // First get user_id from members
      const [rows] = await db.query(`SELECT user_id FROM members WHERE id = ?`, [memberId]);
      const userId = rows[0]?.user_id;
  
      // Delete member
      await db.query(`DELETE FROM members WHERE id = ?`, [memberId]);
  
      // Delete user from users table
      if (userId) {
        await db.query(`DELETE FROM users WHERE id = ?`, [userId]);
      }
  
      res.json({ message: '🗑️ Member deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting member:', error);
      res.status(500).json({ error: 'Failed to delete member' });
    }
  });

  router.get('/all', async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM members');
      res.json(rows);
    } catch (err) {
      console.error('❌ Failed to fetch members:', err);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });
  

module.exports = router;
