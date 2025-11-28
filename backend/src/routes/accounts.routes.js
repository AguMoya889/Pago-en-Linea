const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/accounts/me
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id as user_id, u.name, u.email, a.id as account_id,
              a.account_number, a.balance
       FROM users u
       JOIN accounts a ON a.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
