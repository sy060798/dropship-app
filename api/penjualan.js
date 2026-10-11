import db from './db.js';

export default async function handler(req, res) {
  // Atur header CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. GET: Ambil semua data penjualan beserta detail barangnya (bergabung dengan tabel barang)
    if (req.method === 'GET') {
      const { search } = req.query;
      let query = `
        SELECT penjualan.*, barang.nama as nama_barang, barang.harga_modal 
        FROM penjualan 
        LEFT JOIN barang ON penjualan.barang_id = barang.id
      `;
      let params = [];

      if (search) {
        query += " WHERE barang.nama LIKE ?";
        params.push(`%${search}%`);
      }

      query += " ORDER BY penjualan.tanggal DESC, penjualan.id DESC";

      const result = await db.execute({ sql: query, args: params });
      return res.status(200).json(result.rows);
    }

    // 2. POST: Catat penjualan baru
    if (req.method === 'POST') {
      const { tanggal, barang_id, jumlah, harga_jual } = req.body;

      if (!tanggal || !barang_id || !jumlah || harga_jual === undefined) {
        return res.status(400).json({ error: "Tanggal, barang, jumlah, dan harga jual wajib diisi!" });
      }

      // Ambil data barang untuk mendapatkan harga modal
      const barangRes = await db.execute({
        sql: "SELECT harga_modal FROM barang WHERE id = ?",
        args: [Number(barang_id)]
      });

      if (barangRes.rows.length === 0) {
        return res.status(404).json({ error: "Barang tidak ditemukan!" });
      }

      const harga_modal = barangRes.rows[0].harga_modal;
      const total_modal = Number(harga_modal) * Number(jumlah);
      const total_penjualan = Number(harga_jual) * Number(jumlah);
      const keuntungan = total_penjualan - total_modal;

      await db.execute({
        sql: `
          INSERT INTO penjualan (tanggal, barang_id, jumlah, harga_jual, total_modal, total_penjualan, keuntungan) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          tanggal,
          Number(barang_id),
          Number(jumlah),
          Number(harga_jual),
          total_modal,
          total_penjualan,
          keuntungan
        ]
      });

      return res.status(201).json({ message: "Penjualan berhasil dicatat" });
    }

    // 3. PUT: Perbarui data penjualan berdasarkan ID
    if (req.method === 'PUT') {
      const { id, tanggal, barang_id, jumlah, harga_jual } = req.body;

      if (!id || !tanggal || !barang_id || !jumlah || harga_jual === undefined) {
        return res.status(400).json({ error: "ID, tanggal, barang, jumlah, dan harga jual diperlukan!" });
      }

      // Ambil harga modal terbaru dari barang
      const barangRes = await db.execute({
        sql: "SELECT harga_modal FROM barang WHERE id = ?",
        args: [Number(barang_id)]
      });

      if (barangRes.rows.length === 0) {
        return res.status(404).json({ error: "Barang tidak ditemukan!" });
      }

      const harga_modal = barangRes.rows[0].harga_modal;
      const total_modal = Number(harga_modal) * Number(jumlah);
      const total_penjualan = Number(harga_jual) * Number(jumlah);
      const keuntungan = total_penjualan - total_modal;

      await db.execute({
        sql: `
          UPDATE penjualan 
          SET tanggal = ?, barang_id = ?, jumlah = ?, harga_jual = ?, total_modal = ?, total_penjualan = ?, keuntungan = ? 
          WHERE id = ?
        `,
        args: [
          tanggal,
          Number(barang_id),
          Number(jumlah),
          Number(harga_jual),
          total_modal,
          total_penjualan,
          keuntungan,
          Number(id)
        ]
      });

      return res.status(200).json({ message: "Penjualan berhasil diperbarui" });
    }

    // 4. DELETE: Hapus data penjualan berdasarkan ID
    if (req.method === 'DELETE') {
      const id = req.body.id || req.query.id;

      if (!id) {
        return res.status(400).json({ error: "ID penjualan tidak ditemukan untuk dihapus!" });
      }

      await db.execute({
        sql: "DELETE FROM penjualan WHERE id = ?",
        args: [Number(id)]
      });

      return res.status(200).json({ message: "Penjualan berhasil dihapus" });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
