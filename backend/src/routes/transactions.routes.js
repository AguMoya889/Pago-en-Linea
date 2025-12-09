// backend/src/routes/transactions.routes.js
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth'); // lo seguimos usando para /history

const router = express.Router();

/**
 * POST /api/transactions/transfer
 * Guarda la transferencia en la tabla `transactions`
 * Ahora NO depende del token, usamos los correos.
 */
router.post('/transfer', async (req, res) => {
  const { fromEmail, toEmail, amount, description } = req.body;

  console.log('📩 BODY /api/transactions/transfer =>', req.body);

  const numericAmount = Number(amount);

  if (!fromEmail || !toEmail || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: 'Datos de transferencia inválidos' });
  }

  if (fromEmail === toEmail) {
    return res.status(400).json({ message: 'No puedes transferirte a ti mismo' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Usuario origen por correo
    const [fromUserRows] = await conn.query(
      'SELECT id FROM users WHERE email = ?',
      [fromEmail]
    );

    if (fromUserRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Usuario origen no encontrado' });
    }

    const fromUserId = fromUserRows[0].id;

    // 2) Usuario destino por correo
    const [toUserRows] = await conn.query(
      'SELECT id FROM users WHERE email = ?',
      [toEmail]
    );

    if (toUserRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Usuario destino no encontrado' });
    }

    const toUserId = toUserRows[0].id;

    // 3) Cuenta de origen
    const [fromAccRows] = await conn.query(
      'SELECT * FROM accounts WHERE user_id = ?',
      [fromUserId]
    );

    if (fromAccRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Cuenta de origen no encontrada' });
    }

    const fromAcc = fromAccRows[0];

    // 4) Cuenta destino
    const [toAccRows] = await conn.query(
      'SELECT * FROM accounts WHERE user_id = ?',
      [toUserId]
    );

    if (toAccRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Cuenta destino no encontrada' });
    }

    const toAcc = toAccRows[0];

    // 5) Validar saldo
    if (fromAcc.balance < numericAmount) {
      await conn.rollback();
      return res.status(400).json({ message: 'Fondos insuficientes' });
    }

    // 6) Actualizar saldos
    await conn.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [numericAmount, fromAcc.id]
    );

    await conn.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [numericAmount, toAcc.id]
    );

    // 7) Insertar transacción
    const [resultTx] = await conn.query(
      `INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
       VALUES (?, ?, ?, 'TRANSFER', ?)`,
      [
        fromAcc.id,
        toAcc.id,
        numericAmount,
        description || `Transferencia de ${fromEmail} a ${toEmail}`,
      ]
    );

    await conn.commit();

    console.log('✅ TRANSACCIÓN GUARDADA EN BD, ID =', resultTx.insertId);

    return res.status(201).json({
      message: 'Transferencia registrada en BD',
      transactionId: resultTx.insertId,
    });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error en /transactions/transfer:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/transactions/history
 * (la dejamos igual, usando el token si más adelante lo quieres usar)
 */
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const [accRows] = await pool.query(
      'SELECT id FROM accounts WHERE user_id = ?',
      [userId]
    );

    if (accRows.length === 0) {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }

    const accountId = accRows[0].id;

    const [rows] = await pool.query(
      `SELECT t.id,
              t.amount,
              t.type,
              t.description,
              t.created_at,
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
    console.error('❌ Error en /transactions/history:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
