const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'g2f_super_secret_jwt_key_2026';

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid username or password' });
    
    const user = rows[0];
    if (password !== user.password) return res.status(400).json({ error: 'Invalid username or password' });
    
    // Generate JWT token (no expiration)
    const userData = { id: user.id, username: user.username, role: user.role, full_name: user.full_name };
    const token = jwt.sign(userData, JWT_SECRET);

    // Log action
    await pool.query(
      'INSERT INTO audit_log (actor_name, actor_role, action_type, description) VALUES ($1, $2, $3, $4)',
      [user.full_name, user.role, 'Login', 'User logged into the system']
    );

    res.json({ message: 'Success', token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  const { full_name, role, username, password } = req.body;
  try {
    const { rowCount } = await pool.query(
      'INSERT INTO users (username, password, role, full_name) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [username, password, role, full_name]
    );
    if (rowCount === 0) return res.status(400).json({ error: 'Username already exists' });
    
    // Log action
    await pool.query(
      'INSERT INTO audit_log (actor_name, actor_role, action_type, description) VALUES ($1, $2, $3, $4)',
      [full_name, role, 'Signup', 'New user registered via signup page']
    );

    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout — stateless token clearance on client
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
