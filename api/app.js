const express = require('express');
const cors = require('cors');
const { createClient } = require("@libsql/client");

const app = express();
app.use(cors());
app.use(express.json());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://projek-1-sy060798.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3MDc5MTMsImlkIjoiMDFhMTI2ZGQtZDcwMS03NmRkLWFjMmQtMDM0MmRhYjk1ZDU5Iiwia2lkIjoiTW9HX2plcnRabXRLY3FZTFlNdmRubm8tNnEyMzFudlZuZ1J2T0ZtM0pfdyIsInJpZCI6Ijk2Mzg2YmI4LTA4NTUtNDk0Ny04YjNhLWUzMDc0N2FjOWMzMiJ9.QdjEu8V4UnWS5Z_lPBwe2aqTlTMXv7ucB_3enz0-6oaW0ugNBXsBUkzmyjlLqa5GU_Y1oQD65FuS2eJB8DtYBw"
});

// Middleware helper untuk parsing body aman
const parseBody = (req) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  return body || {};
};

// ==================== BARANG ====================
app.all('/api/barang', async (req, res) => {
  const method = req.method;
  const body = parseBody(req);

  try {
    if (method === 'GET') {
      const rs = await db.execute("SELECT * FROM barang ORDER BY id DESC");
      return res.status(200).json(rs.rows);
    } 
    else if (method === 'POST') {
      const { sku, nama_barang, harga_beli, margin, harga_jual } = body;
      await db.execute({
        sql: "INSERT INTO barang (sku, nama_barang, harga_beli, margin, harga_jual) VALUES (?, ?, ?, ?, ?)",
        args: [sku, nama_barang, harga_beli, margin, harga_jual]
      });
      return res.status(201).json({ message: "Barang berhasil ditambahkan ke katalog" });
    }
    else if (method === 'PUT') {
      const { id, sku, nama_barang, harga_beli, margin, harga_jual } = body;
      await db.execute({
        sql: "UPDATE barang SET sku = ?, nama_barang = ?, harga_beli = ?, margin = ?, harga_jual = ? WHERE id = ?",
        args: [sku, nama_barang, harga_beli, margin, harga_jual, id]
      });
      return res.status(200).json({ message: "Barang berhasil diperbarui" });
    }
    else if (method === 'DELETE') {
      const { id } = req.query;
      await db.execute({
        sql: "DELETE FROM barang WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ message: "Barang berhasil dihapus dari katalog" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ==================== MODAL ====================
app.all('/api/modal', async (req, res) => {
  const method = req.method;
  const body = parseBody(req);

  try {
    if (method === 'GET') {
      const rs = await db.execute("SELECT * FROM modal ORDER BY id DESC");
      return res.status(200).json(rs.rows);
    } 
    else if (method === 'POST') {
      const { jumlah_modal, keterangan } = body;
      await db.execute({
        sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
        args: [jumlah_modal, keterangan || 'Setoran Saldo Modal']
      });
      return res.status(201).json({ message: "Modal berhasil ditambahkan" });
    }
    else if (method === 'DELETE') {
      const { id } = req.query;
      await db.execute({
        sql: "DELETE FROM modal WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ message: "Catatan modal berhasil dihapus" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ==================== PENJUALAN ====================
app.all('/api/penjualan', async (req, res) => {
  const method = req.method;
  const body = parseBody(req);

  try {
    if (method === 'GET') {
      const rs = await db.execute(`
        SELECT penjualan.*, barang.nama_barang 
        FROM penjualan 
        LEFT JOIN barang ON penjualan.barang_id = barang.id
        ORDER BY penjualan.id DESC
      `);
      return res.status(200).json(rs.rows);
    } 
    else if (method === 'POST') {
      const { barang_id, jumlah, harga_satuan, pengeluaran_lain } = body;
      const total_harga = jumlah * harga_satuan;
      const p_lain = pengeluaran_lain || 0;

      const cekBarang = await db.execute({
        sql: "SELECT harga_beli FROM barang WHERE id = ?",
        args: [barang_id]
      });

      if (cekBarang.rows.length === 0) {
        return res.status(404).json({ error: "Barang tidak ditemukan di katalog" });
      }

      const hargaBeliSatuan = cekBarang.rows[0].harga_beli;
      const totalModalBarang = hargaBeliSatuan * jumlah;
      const keuntunganBersih = total_harga - (totalModalBarang + p_lain);

      await db.execute({
        sql: `INSERT INTO penjualan (barang_id, jumlah, harga_satuan, total_harga, total_modal, keuntungan, pengeluaran_lain) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [barang_id, jumlah, harga_satuan, total_harga, totalModalBarang, keuntunganBersih, p_lain]
      });

      await db.execute({
        sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
        args: [-totalModalBarang, `Belanja Dropship: (Barang ID #${barang_id} x ${jumlah} pcs)`]
      });

      return res.status(201).json({ message: "Penjualan dicatat & saldo modal terpotong otomatis" });
    }
    else if (method === 'DELETE') {
      const { id } = req.query;

      const getPenjualan = await db.execute({
        sql: "SELECT total_modal FROM penjualan WHERE id = ?",
        args: [id]
      });

      if (getPenjualan.rows.length > 0) {
        const modalKembali = getPenjualan.rows[0].total_modal;
        await db.execute({
          sql: "INSERT INTO modal (jumlah_modal, keterangan) VALUES (?, ?)",
          args: [modalKembali, `Refund/Pembatalan Penjualan Transaksi #${id}`]
        });
      }

      await db.execute({
        sql: "DELETE FROM penjualan WHERE id = ?",
        args: [id]
      });

      return res.status(200).json({ message: "Penjualan dihapus & saldo modal dikembalikan" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = app;
