const express = require('express');
const barangHandler = require('./barang');
const penjualanHandler = require('./penjualan');
const modalHandler = require('./modal');

const app = express();

app.use(express.json());

// Middleware CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Mapping rute API
app.use('/api/barang', barangHandler);
app.use('/api/penjualan', penjualanHandler);
app.use('/api/modal', modalHandler);

module.exports = app;
