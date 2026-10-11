const { createClient } = require("@libsql/client");

const db = createClient({
  url: "https://app.turso.tech/sy060798?group=default",
  authToken: "KODE_AUTH_TOKEN_TURSO_ANDA" // Ganti dengan token Turso Anda
});

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const method = req.method;

  try {
    if (method === 'GET') {
      const rs = await db.execute("SELECT * FROM barang ORDER BY id DESC");
      return res.status(200).json(rs.rows);
    } 
    else if (method === 'POST') {
      const { sku, nama_barang, harga_beli, margin, harga_jual, stok } = req.body;
      await db.execute({
        sql: "INSERT INTO barang (sku, nama_barang, harga_beli, margin, harga_jual, stok) VALUES (?, ?, ?, ?, ?, ?)",
        args: [sku, nama_barang, harga_beli, margin, harga_jual, stok]
      });
      return res.status(201).json({ message: "Barang berhasil ditambahkan" });
    }
    else if (method === 'PUT') {
      const { id, sku, nama_barang, harga_beli, margin, harga_jual, stok } = req.body;
      await db.execute({
        sql: "UPDATE barang SET sku = ?, nama_barang = ?, harga_beli = ?, margin = ?, harga_jual = ?, stok = ? WHERE id = ?",
        args: [sku, nama_barang, harga_beli, margin, harga_jual, stok, id]
      });
      return res.status(200).json({ message: "Barang berhasil diubah" });
    }
    else if (method === 'DELETE') {
      const { id } = req.query;
      await db.execute({
        sql: "DELETE FROM barang WHERE id = ?",
        args: [id]
      });
      return res.status(200).json({ message: "Barang berhasil dihapus" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
