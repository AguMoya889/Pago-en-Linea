const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/transactions/transfer
router.post('/transfer', auth, async (req, res) => {
  const { toAccountNumber, amount, description } = req.body;
  const numericAmount = parseFloat(amount);

  if (!toAccountNumber || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Datos de transferencia inválidos' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [fromRows] = await conn.query(
      'SELECT * FROM accounts WHERE user_id = ?',
      [req.user.id]
    );
    if (fromRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Cuenta de origen no encontrada' });
    }
    const fromAcc = fromRows[0];

    const [toRows] = await conn.query(
      'SELECT * FROM accounts WHERE account_number = ?',
      [toAccountNumber]
    );
    if (toRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Cuenta destino no encontrada' });
    }
    const toAcc = toRows[0];

    if (fromAcc.balance < numericAmount) {
      await conn.rollback();
      return res.status(400).json({ message: 'Fondos insuficientes' });
    }

    await conn.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [numericAmount, fromAcc.id]
    );
    await conn.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [numericAmount, toAcc.id]
    );

    const [resultTx] = await conn.query(
      `INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
       VALUES (?, ?, ?, 'TRANSFER', ?)`,
      [fromAcc.id, toAcc.id, numericAmount, description || null]
    );

    await conn.commit();

    return res.status(201).json({
      message: 'Transferencia realizada',
      transactionId: resultTx.insertId,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
});

// GET /api/transactions/history
router.get('/history', auth, async (req, res) => {
  try {
    const [accRows] = await pool.query(
      'SELECT id FROM accounts WHERE user_id = ?',
      [req.user.id]
    );
    if (accRows.length === 0) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }
    const accountId = accRows[0].id;

    const [rows] = await pool.query(
      `SELECT t.id, t.amount, t.type, t.description, t.created_at,
              fa.account_number AS from_account,
              ta.account_number AS to_account
       FROM transactions t
       LEFT JOIN accounts fa ON fa.id = t.from_account_id
       LEFT JOIN accounts ta ON ta.id = t.to_account_id
       WHERE t.from_account_id = ? OR t.to_account_id = ?
       ORDER BY t.created_at DESC`,
      [accountId, accountId]
    );

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
