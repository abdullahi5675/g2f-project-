const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// Verify and redeem a voucher (used by distribution agent)
router.post('/verify', async (req, res) => {
  const { voucher_code, agent_name, bags_to_collect, actor_name, actor_role } = req.body;

  if (!voucher_code) {
    return res.status(400).json({ error: 'Voucher code is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT v.*, f.full_name, f.nin, f.phone_number, f.village
       FROM vouchers v
       JOIN farmers f ON f.id = v.farmer_id
       WHERE v.voucher_code = $1`,
      [voucher_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid voucher code. No record found.' });
    }

    const voucher = result.rows[0];

    if (voucher.status === 'redeemed') {
      await pool.query(
        'INSERT INTO fraud_alerts (alert_type, description, voucher_code, farmer_name) VALUES ($1, $2, $3, $4)',
        ['Duplicate Redemption Attempt', `Agent ${agent_name || 'Unknown'} attempted to redeem an already fully redeemed voucher.`, voucher_code, voucher.full_name]
      );
      return res.status(409).json({
        error: 'FRAUD ALERT: This voucher has already been fully redeemed.',
        farmer: voucher.full_name,
        redeemed_bags: voucher.bags_redeemed
      });
    }

    // If just verifying (no bags_to_collect), return farmer info
    if (!bags_to_collect) {
      return res.json({ verified: true, voucher });
    }

    const bags = parseInt(bags_to_collect);
    const remaining = voucher.bags_allocated - voucher.bags_redeemed;

    if (bags > remaining) {
      return res.status(400).json({
        error: `Only ${remaining} bag(s) remaining for this farmer.`
      });
    }

    const newRedeemed = voucher.bags_redeemed + bags;
    const newStatus   = newRedeemed >= voucher.bags_allocated ? 'redeemed' : 'partial';

    await pool.query(
      'UPDATE vouchers SET bags_redeemed=$1, status=$2 WHERE id=$3',
      [newRedeemed, newStatus, voucher.id]
    );

    await pool.query(
      `INSERT INTO distribution_events (voucher_id, agent_name, bags_collected, distribution_point)
       VALUES ($1,$2,$3,$4)`,
      [voucher.id, agent_name || 'Agent', bags, voucher.distribution_point]
    );

    await pool.query(
      'INSERT INTO audit_log (actor_name, actor_role, action_type, description) VALUES ($1, $2, $3, $4)',
      [actor_name || 'Agent', actor_role || 'agent', 'Redemption', `Disbursed ${bags} bag(s) to ${voucher.full_name} for voucher ${voucher_code}`]
    );

    res.json({
      success: true,
      message: `✅ Confirmed. ${bags} bag(s) disbursed to ${voucher.full_name}.`,
      voucher_code,
      farmer: voucher.full_name,
      bags_collected: bags,
      bags_remaining: voucher.bags_allocated - newRedeemed
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get all vouchers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, f.full_name, f.village, f.ward
       FROM vouchers v JOIN farmers f ON f.id = v.farmer_id
       ORDER BY v.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
