-- Oranexcel — İddaa veri platformu (Supabase şeması)
-- ~997 alan JSONB + sık filtrelenen alanlar ayrı sütun

CREATE TABLE IF NOT EXISTS matches (
  id BIGINT PRIMARY KEY,                -- API "ID" (maç kodu)
  tarih DATE NOT NULL,
  saat TIME,
  tarih_tr_gunlu TEXT,
  lig_kodu TEXT,
  lig_adi TEXT,
  lig_id INT,
  alt_lig_adi TEXT,
  alt_lig_id INT,
  sezon_adi TEXT,
  sezon_id INT,
  t1 TEXT,                              -- Ev sahibi
  t2 TEXT,                              -- Deplasman
  t1i INT,                              -- Ev sahibi ID
  t2i INT,                              -- Deplasman ID
  hakem TEXT,
  t1_antrenor TEXT,
  t2_antrenor TEXT,
  sonuc_iy TEXT,                         -- "2-2" gibi
  sonuc_ms TEXT,                         -- "1-3" gibi
  ft1 INT, ft2 INT,                      -- MS gol
  ht1 INT, ht2 INT,                      -- IY gol
  ms1 TEXT, msx TEXT, ms2 TEXT,           -- MS oranları
  iy1 TEXT, iyx TEXT, iy2 TEXT,           -- IY oranları
  a TEXT, u TEXT,                         -- 2.5 AU
  kg_var TEXT, kg_yok TEXT,
  kod_ms INT,
  kod_cs INT,
  kod_iy INT,
  kod_au INT,
  mac_suffix4 TEXT,
  mac_suffix3 TEXT,
  mac_suffix2 TEXT,
  sport_turu TEXT DEFAULT 'FUTBOL',
  bookmaker_id INT DEFAULT 0,
  raw_data JSONB,                        -- Tüm ~997 alan
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_tarih ON matches (tarih DESC);
CREATE INDEX IF NOT EXISTS idx_matches_lig ON matches (lig_adi);
CREATE INDEX IF NOT EXISTS idx_matches_sonuc_iy ON matches (sonuc_iy);
CREATE INDEX IF NOT EXISTS idx_matches_sonuc_ms ON matches (sonuc_ms);
CREATE INDEX IF NOT EXISTS idx_matches_suffix4 ON matches (mac_suffix4);
CREATE INDEX IF NOT EXISTS idx_matches_suffix3 ON matches (mac_suffix3);
CREATE INDEX IF NOT EXISTS idx_matches_hakem ON matches (hakem);
CREATE INDEX IF NOT EXISTS idx_matches_t1 ON matches (t1);
CREATE INDEX IF NOT EXISTS idx_matches_t2 ON matches (t2);
CREATE INDEX IF NOT EXISTS idx_matches_lig_alt ON matches (alt_lig_adi);

CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  date_from DATE,
  date_to DATE,
  matches_fetched INT DEFAULT 0,
  matches_inserted INT DEFAULT 0,
  status TEXT DEFAULT 'running',
  error TEXT
);
