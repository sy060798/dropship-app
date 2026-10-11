CREATE TABLE IF NOT EXISTS barang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    nama_barang TEXT NOT NULL,
    harga_beli REAL NOT NULL,
    margin REAL NOT NULL,
    harga_jual REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS penjualan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barang_id INTEGER,
    jumlah INTEGER NOT NULL,
    harga_satuan REAL NOT NULL,
    total_harga REAL NOT NULL,
    total_modal REAL NOT NULL,
    keuntungan REAL NOT NULL,
    pengeluaran_lain REAL DEFAULT 0,
    tanggal TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barang_id) REFERENCES barang(id)
);

CREATE TABLE IF NOT EXISTS modal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jumlah_modal REAL NOT NULL,
    keterangan TEXT,
    tanggal TEXT DEFAULT CURRENT_TIMESTAMP
);
