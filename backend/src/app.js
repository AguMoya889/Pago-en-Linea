const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db'); // conexión a MySQL

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const accountsRoutes = require('./routes/accounts.routes');
const transactionsRoutes = require('./routes/transactions.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/transactions', transactionsRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 🔍 Log para ver si carga este archivo
console.log('✅ app.js (con /api/test-db) cargado');

// Test DB
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, result: rows[0].ok });
  } catch (err) {
    console.error('❌ Error en conexión MySQL:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
