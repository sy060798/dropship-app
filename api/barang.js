import db from './db.js';

export default async function handler(req, res) {
  // Atur header agar mendukung CORS jika diperlukan
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. GET: Ambil semua data barang (mendukung pencarian query ?search=...)
    if (req.method === 'GET') {
      const { search } = req.query;
      let query = "SELECT * FROM barang";
      let params = [];

      if (search) {
        query += " WHERE nama LIKE ?";
        params.push(`%${search}%`);
      }

      query += " ORDER BY id DESC";
      
      const result = await db.execute({ sql: query, args: params });
      return res.status(200).json(result.rows);
    }

    // 2. POST: Tambah barang baru
    if (req.method === 'POST') {
      const { nama, harga_modal, harga_jual } = req.body;

      if (!nama || harga_modal === undefined || harga_jual === undefined) {
        return res.status(400).json({ error: "Nama, harga modal, dan harga jual wajib diisi!" });
      }

      await db.execute({
        sql: "INSERT INTO barang (nama, harga_modal, harga_jual) VALUES (?, ?, ?)",
        args: [nama, Number(harga_modal), Number(harga_jual)]
      });

      return res.status(201).json({ message: "Barang berhasil ditambahkan" });
    }

    // 3. PUT: Edit / Perbarui data barang berdasarkan ID
    if (req.method === 'PUT') {
      const { id, nama, harga_modal, harga_jual } = req.body;

      if (!id || !nama || harga_modal === undefined || harga_jual === undefined) {
        return res.status(400).json({ error: "ID, nama, harga modal, dan harga jual diperlukan!" });
      }

      await db.execute({
        sql: "UPDATE barang SET nama = ?, harga_modal = ?, harga_jual = ? WHERE id = ?",
        args: [nama, Number(harga_modal), Number(harga_jual), Number(id)]
      });

      return res.status(200).json({ message: "Barang berhasil diperbarui" });
    }

    // 4. DELETE: Hapus data barang berdasarkan ID (bisa via body atau query parameter ?id=...)
    if (req.method === 'DELETE') {
      const id = req.body.id || req.query.id;

      if (!id) {
        return res.status(400).json({ error: "ID barang tidak ditemukan untuk dihapus!" });
      }

      await db.execute({
        sql: "DELETE FROM barang WHERE id = ?",
        args: [Number(id)]
      });

      return res.status(200).json({ message: "Barang berhasil dihapus" });
    }

    // Jika method selain di atas
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
