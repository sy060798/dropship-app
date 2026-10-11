const express = require('express');
const cors = require('cors');
const { createClient } = require("@libsql/client");

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi Database Turso Terpusat
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://projek-1-sy060798.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3MDc5MTMsImlkIjoiMDFhMTI2ZGQtZDcwMS03NmRkLWFjMmQtMDM0MmRhYjk1ZDU5Iiwia2lkIjoiTW9HX2plcnRabXRLY3FZTFlNdmRubm8tNnEyMzFudlZuZ1J2T0ZtM0pfdyIsInJpZCI6Ijk2Mzg2YmI4LTA4NTUtNDk0Ny04YjNhLWUzMDc0N2FjOWMzMiJ9.QdjEu8V4UnWS5Z_lPBwe2aqTlTMXv7ucB_3enz0-6oaW0ugNBXsBUkzmyjlLqa5GU_Y1oQD65FuS2eJB8DtYBw"
});

// --- ROUTE BARANG ---
app.get('/api/barang', async (req, res) => {
  try {
    const rs = await db.execute("SELECT * FROM barang ORDER BY id DESC");
    return res.json(rs.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/barang', async (req, res) => {
  try {
    const { sku, nama_barang, harga_beli, margin, harga_jual } = req.body || {};
    await db.execute({
      sql: "INSERT INTO barang (sku, nama_barang, harga_beli, margin, harga_jual) VALUES (?, ?, ?, ?, ?)",
      args: [sku || '', nama_barang || '', harga_beli || 0, margin || 0, harga_jual || 0]
    });
    return res.status(201).json({ message: "Barang berhasil ditambahkan" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/barang', async (req, res) => {
  try {
    const { id } = req.query;
    await db.execute({ sql: "DELETE FROM barang WHERE id = ?", args: [id] });
    return res.json({ message: "Barang berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- ROUTE MODAL ---
app.get('/api/modal', async (req, res) => {
  try {
    const rs = await db.execute("SELECT * FROM modal ORDER BY id DESC");
    return res.json(rs.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/modal', async (req, res) => {
  try {
    const { jumlah_modal, keterangan } = req.body || {};
    await db.execute({
      sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
      args: [jumlah_modal || 0, keterangan || 'Setoran Saldo Modal']
    });
    return res.status(201).json({ message: "Modal berhasil ditambahkan" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/modal', async (req, res) => {
  try {
    const { id } = req.query;
    await db.execute({ sql: "DELETE FROM modal WHERE id = ?", args: [id] });
    return res.json({ message: "Modal berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- ROUTE PENJUALAN ---
app.get('/api/penjualan', async (req, res) => {
  try {
    const rs = await db.execute(`
      SELECT penjualan.*, barang.nama_barang 
      FROM penjualan 
      LEFT JOIN barang ON penjualan.barang_id = barang.id
      ORDER BY penjualan.id DESC
    `);
    return res.json(rs.rows || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/penjualan', async (req, res) => {
  try {
    const { barang_id, jumlah, harga_satuan, pengeluaran_lain } = req.body || {};
    const total_harga = (jumlah || 0) * (harga_satuan || 0);
    const p_lain = pengeluaran_lain || 0;

    const cekBarang = await db.execute({
      sql: "SELECT harga_beli FROM barang WHERE id = ?",
      args: [barang_id]
    });

    if (cekBarang.rows.length === 0) {
      return res.status(404).json({ error: "Barang tidak ditemukan" });
    }

    const totalModalBarang = cekBarang.rows[0].harga_beli * (jumlah || 0);
    const keuntunganBersih = total_harga - (totalModalBarang + p_lain);

    await db.execute({
      sql: `INSERT INTO penjualan (barang_id, jumlah, harga_satuan, total_harga, total_modal, keuntungan, pengeluaran_lain) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [barang_id, jumlah, harga_satuan, total_harga, totalModalBarang, keuntunganBersih, p_lain]
    });

    await db.execute({
      sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
      args: [-totalModalBarang, `Belanja Dropship (Barang ID #${barang_id})`]
    });

    return res.status(201).json({ message: "Penjualan berhasil dicatat" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/penjualan', async (req, res) => {
  try {
    const { id } = req.query;
    const getPenjualan = await db.execute({
      sql: "SELECT total_modal FROM penjualan WHERE id = ?",
      args: [id]
    });

    if (getPenjualan.rows.length > 0) {
      const modalKembali = getPenjualan.rows[0].total_modal;
      await db.execute({
        sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
        args: [modalKembali, `Refund Penjualan Transaksi #${id}`]
      });
    }

    await db.execute({ sql: "DELETE FROM penjualan WHERE id = ?", args: [id] });
    return res.json({ message: "Penjualan dihapus & modal dikembalikan" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = app;
