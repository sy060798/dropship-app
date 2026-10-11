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
      const rs = await db.execute("SELECT * FROM modal ORDER BY id DESC");
      return res.status(200).json(rs.rows);
    } 
    else if (method === 'POST') {
      const { jumlah_modal, keterangan } = req.body;
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
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
