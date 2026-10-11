const { createClient } = require("@libsql/client");

const db = createClient({
  url: "https://app.turso.tech/sy060798?group=default",
  authToken: "KODE_AUTH_TOKEN_TURSO_ANDA"
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
      const { sku, nama_barang, harga_beli, margin, harga_jual } = req.body;
      await db.execute({
        sql: "INSERT INTO barang (sku, nama_barang, harga_beli, margin, harga_jual) VALUES (?, ?, ?, ?, ?)",
        args: [sku, nama_barang, harga_beli, margin, harga_jual]
      });
      return res.status(201).json({ message: "Barang berhasil ditambahkan ke katalog" });
    }
    else if (method === 'PUT') {
      const { id, sku, nama_barang, harga_beli, margin, harga_jual } = req.body;
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
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
