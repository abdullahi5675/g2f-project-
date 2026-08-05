const express = require('express');
const router  = express.Router();
const QRCode  = require('qrcode');
const { pool } = require('../db');

// ─── Helper: generate voucher for a verified farmer ───
async function generateVoucherForFarmer(farmer) {
  // Compute bags (2 bags per hectare, minimum 1)
  const bags = Math.max(1, Math.round((parseFloat(farmer.acreage_ha) || 1) * 2));

  // Generate unique voucher code
  const voucherCode = 'GF-' + Date.now().toString().slice(-8) + '-' + farmer.id;

  // Collection window: starts in 7 days, ends in 21 days
  const start = new Date(); start.setDate(start.getDate() + 7);
  const end   = new Date(); end.setDate(end.getDate() + 21);

  // Find assigned distribution point
  const dpQuery = await pool.query('SELECT name FROM distribution_points WHERE ward = $1', [farmer.ward]);
  const distPoint = dpQuery.rows.length > 0
    ? dpQuery.rows[0].name
    : (farmer.ward ? farmer.ward + ' Distribution Centre' : 'Gwaram LGA Distribution Centre');

  const vResult = await pool.query(
    `INSERT INTO vouchers (farmer_id, voucher_code, bags_allocated, distribution_point, collection_start, collection_end)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [farmer.id, voucherCode, bags, distPoint, start, end]
  );
  const voucher = vResult.rows[0];

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(
    JSON.stringify({ code: voucherCode, nin: farmer.nin, name: farmer.full_name, bags })
  );

  return { voucher, qrCode };
}


// ─── Register a new farmer ───
router.post('/register', async (req, res) => {
  const { nin, full_name, phone_number, ward, village, crop_type, acreage_ha, is_pending, actor_name, actor_role } = req.body;

  if (!nin || !full_name || !phone_number) {
    return res.status(400).json({ error: 'NIN, full name, and phone number are required.' });
  }
  if (nin.length !== 11) {
    return res.status(400).json({ error: 'NIN must be exactly 11 digits.' });
  }

  try {
    // Check for duplicate NIN
    const existing = await pool.query('SELECT id FROM farmers WHERE nin = $1', [nin]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A farmer with this NIN is already registered.' });
    }

    // Save farmer with appropriate verification status
    const v_status = is_pending ? 'pending' : 'verified';
    const result = await pool.query(
      `INSERT INTO farmers (nin, full_name, phone_number, ward, village, crop_type, acreage_ha, verification_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nin, full_name, phone_number, ward, village, crop_type, acreage_ha, v_status]
    );
    const farmer = result.rows[0];

    // ── PENDING: save farmer only, NO voucher ──
    if (is_pending) {
      await pool.query(
        'INSERT INTO audit_log (actor_name, actor_role, action_type, description) VALUES ($1, $2, $3, $4)',
        [actor_name || 'Unknown', actor_role || 'officer', 'Registration (Pending)',
         `Registered farmer ${full_name} (NIN: ${nin}) as PENDING — no voucher issued until approved`]
      );
      return res.json({ success: true, farmer, pending: true });
    }

    // ── VERIFIED: generate voucher + QR code ──
    const { voucher, qrCode } = await generateVoucherForFarmer(farmer);

    await pool.query(
      'INSERT INTO audit_log (actor_name, actor_role, action_type, description) VALUES ($1, $2, $3, $4)',
      [actor_name || 'Unknown', actor_role || 'officer', 'Registration',
       `Registered farmer ${full_name} (NIN: ${nin}) with voucher ${voucher.voucher_code}`]
    );

    res.json({ success: true, farmer, voucher, qrCode });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});


// ─── Get all farmers ───
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM farmers ORDER BY registered_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});


// ─── Update verification status (Supervisor approves/rejects pending farmers) ───
router.post('/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { status, actor_name, actor_role } = req.body;

  try {
    await pool.query('UPDATE farmers SET verification_status=$1 WHERE id=$2', [status, id]);

    let voucher = null;
    let qrCode  = null;

    // If APPROVED → generate voucher now (only if one doesn't already exist)
    if (status === 'verified') {
      const existingVoucher = await pool.query('SELECT id FROM vouchers WHERE farmer_id = $1', [id]);
      if (existingVoucher.rows.length === 0) {
        const farmerRes = await pool.query('SELECT * FROM farmers WHERE id = $1', [id]);
        if (farmerRes.rows.length > 0) {
          const result = await generateVoucherForFarmer(farmerRes.rows[0]);
          voucher = result.voucher;
          qrCode  = result.qrCode;
        }
      }
    }

    await pool.query(
      'INSERT INTO audit_log (actor_name, actor_role, action_type, description) VALUES ($1, $2, $3, $4)',
      [actor_name || 'Supervisor', actor_role || 'supervisor', 'Verification Update',
       `Marked farmer ID ${id} as ${status}${voucher ? ' — voucher ' + voucher.voucher_code + ' generated' : ''}`]
    );

    res.json({ success: true, voucher, qrCode });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
