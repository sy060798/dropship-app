const express = require('express');
const barangHandler = require('./barang');
const penjualanHandler = require('./penjualan');
const modalHandler = require('./modal');

const app = express();
app.use(express.json());

// Routing API
app.all('/api/barang', barangHandler);
app.all('/api/penjualan', penjualanHandler);
app.all('/api/modal', modalHandler);

module.exports = app;
