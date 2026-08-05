const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

router.get('/stats', async (req, res) => {
  try {
    const farmers   = await pool.query('SELECT COUNT(*) FROM farmers');
    const vouchers  = await pool.query('SELECT COUNT(*) FROM vouchers');
    const redeemed  = await pool.query("SELECT COUNT(*) FROM vouchers WHERE status='redeemed'");
    const partial   = await pool.query("SELECT COUNT(*) FROM vouchers WHERE status='partial'");
    const pending   = await pool.query("SELECT COUNT(*) FROM vouchers WHERE status='pending'");
    const bags      = await pool.query('SELECT SUM(bags_allocated) as total, SUM(bags_redeemed) as given FROM vouchers');
    const events    = await pool.query('SELECT * FROM distribution_events ORDER BY collected_at DESC LIMIT 10');
    const fraud     = await pool.query('SELECT * FROM fraud_alerts ORDER BY detected_at DESC');
    const audit     = await pool.query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100');
    const byWard    = await pool.query(
      `SELECT f.ward, COUNT(f.id) as farmers, SUM(v.bags_allocated) as bags
       FROM farmers f JOIN vouchers v ON v.farmer_id = f.id
       GROUP BY f.ward ORDER BY farmers DESC`
    );

    res.json({
      total_farmers:    parseInt(farmers.rows[0].count),
      total_vouchers:   parseInt(vouchers.rows[0].count),
      redeemed:         parseInt(redeemed.rows[0].count),
      partial:          parseInt(partial.rows[0].count),
      pending:          parseInt(pending.rows[0].count),
      bags_allocated:   parseInt(bags.rows[0].total) || 0,
      bags_distributed: parseInt(bags.rows[0].given) || 0,
      recent_events:    events.rows,
      fraud_alerts:     fraud.rows,
      audit_log:        audit.rows,
      by_ward:          byWard.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
