const express = require('express');
const barangHandler = require('./barang');
const penjualanHandler = require('./penjualan');
const modalHandler = require('./modal');

const app = express();

// Middleware untuk membaca format data JSON dari request body
app.use(express.json());

// Middleware CORS untuk mengizinkan akses request dari frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Routing ke masing-masing handler API
app.all('/api/barang', (req, res) => barangHandler(req, res));
app.all('/api/penjualan', (req, res) => penjualanHandler(req, res));
app.all('/api/modal', (req, res) => modalHandler(req, res));

// Fallback route untuk mengecek apakah API aktif
app.get('/api', (req, res) => {
  res.json({ status: 'API Dropship Online', timestamp: new Date() });
});

module.exports = app;
