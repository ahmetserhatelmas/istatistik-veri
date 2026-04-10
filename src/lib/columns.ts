/**
 * Sayfa2 Excel sütun tanımları → raw_data key eşlemesi.
 * label: sitede gösterilecek başlık
 * key: raw_data (JSONB) içindeki alan adı; yoksa DB sütunu
 * dbCol: true → raw_data yerine doğrudan matches sütununda
 * group: grup başlığı (renk/gruplama için)
 */
export interface ColDef {
  id: string;
  label: string;
  key: string;
  dbCol?: boolean;
  group: string;
  width?: number; // px — varsayılan 60
}

export const ALL_COLS: ColDef[] = [
  // ── Temel ──────────────────────────────────────────────────────────────────
  { id: "id",       label: "Maç Kodu", key: "id",        dbCol: true, group: "Temel", width: 90 },
  { id: "tarih",    label: "Tarih",    key: "tarih",      dbCol: true, group: "Temel", width: 96 },
  { id: "gun",      label: "Gün",      key: "TARIH_TR_GUNLU", group: "Temel", width: 72 },
  { id: "saat",     label: "Saat",     key: "saat",       dbCol: true, group: "Temel", width: 56 },
  { id: "lig_kodu", label: "Lig Kodu", key: "lig_kodu",   dbCol: true, group: "Temel", width: 80 },
  { id: "lig_adi",  label: "Lig Adı",  key: "lig_adi",    dbCol: true, group: "Temel", width: 150 },
  { id: "alt_lig",  label: "Alt Lig",  key: "alt_lig_adi",dbCol: true, group: "Temel", width: 130 },
  { id: "sezon",    label: "Sezon",    key: "sezon_adi",  dbCol: true, group: "Temel", width: 90 },
  { id: "mbs",      label: "MBS",      key: "mac_suffix4",dbCol: true, group: "Temel", width: 60 },
  { id: "t1",       label: "Ev Sahibi",key: "t1",         dbCol: true, group: "Temel", width: 150 },
  { id: "t2",       label: "Deplasman",key: "t2",         dbCol: true, group: "Temel", width: 150 },
  { id: "kod_ms",   label: "MS Kod",   key: "kod_ms",     dbCol: true, group: "Temel", width: 72 },

  // ── Maç Skoru ──────────────────────────────────────────────────────────────
  { id: "sonuc_iy", label: "IY",  key: "sonuc_iy", dbCol: true, group: "Skor", width: 60 },
  { id: "sonuc_ms", label: "MS",  key: "sonuc_ms", dbCol: true, group: "Skor", width: 60 },

  // ── Maç Sonucu ─────────────────────────────────────────────────────────────
  { id: "ms1", label: "MS1", key: "MS1", group: "Maç Sonucu", width: 60 },
  { id: "msx", label: "MSX", key: "MSX", group: "Maç Sonucu", width: 60 },
  { id: "ms2", label: "MS2", key: "MS2", group: "Maç Sonucu", width: 60 },

  // ── Yarı Sonucu ────────────────────────────────────────────────────────────
  { id: "iy1", label: "IY1", key: "IY1", group: "OKBT", width: 60 },
  { id: "iyx", label: "IYX", key: "IYX", group: "OKBT", width: 60 },
  { id: "iy2", label: "IY2", key: "IY2", group: "OKBT", width: 60 },

  // ── İlk Yarı Maç Sonucu ────────────────────────────────────────────────────
  { id: "iyms11", label: "1/1", key: "IYMS11", group: "Durumlar", width: 56 },
  { id: "iyms1x", label: "1/X", key: "IYMS1X", group: "Durumlar", width: 56 },
  { id: "iyms12", label: "1/2", key: "IYMS12", group: "Durumlar", width: 56 },
  { id: "iymsx1", label: "X/1", key: "IYMSX1", group: "Durumlar", width: 56 },
  { id: "iymsxx", label: "X/X", key: "IYMSXX", group: "Durumlar", width: 56 },
  { id: "iymsx2", label: "X/2", key: "IYMSX2", group: "Durumlar", width: 56 },
  { id: "iyms21", label: "2/1", key: "IYMS21", group: "Durumlar", width: 56 },
  { id: "iyms2x", label: "2/X", key: "IYMS2X", group: "Durumlar", width: 56 },
  { id: "iyms22", label: "2/2", key: "IYMS22", group: "Durumlar", width: 56 },

  // ── Karşılıklı Gol ─────────────────────────────────────────────────────────
  { id: "kg_var", label: "KG V", key: "KGVAR", group: "KG", width: 60 },
  { id: "kg_yok", label: "KG Y", key: "KGYOK", group: "KG", width: 60 },

  // ── Tek / Çift ─────────────────────────────────────────────────────────────
  { id: "tek",  label: "TEK",  key: "KTCT", group: "Tek/Çift", width: 60 },
  { id: "cift", label: "ÇİFT", key: "KTCC", group: "Tek/Çift", width: 60 },

  // ── Toplam Gol Sayısı ──────────────────────────────────────────────────────
  { id: "tg01", label: "0-1", key: "TG01", group: "Top.Gol", width: 56 },
  { id: "tg23", label: "2-3", key: "TG23", group: "Top.Gol", width: 56 },
  { id: "tg45", label: "4-5", key: "TG45", group: "Top.Gol", width: 56 },
  { id: "tg6",  label: "6+",  key: "TG6",  group: "Top.Gol", width: 56 },

  // ── Alt Üst ────────────────────────────────────────────────────────────────
  { id: "a05", label: "0.5A", key: "A05", group: "Alt/Üst", width: 56 },
  { id: "u05", label: "0.5Ü", key: "U05", group: "Alt/Üst", width: 56 },
  { id: "a15", label: "1.5A", key: "A15", group: "Alt/Üst", width: 56 },
  { id: "u15", label: "1.5Ü", key: "U15", group: "Alt/Üst", width: 56 },
  { id: "a25", label: "2.5A", key: "A",   group: "Alt/Üst", width: 56 },
  { id: "u25", label: "2.5Ü", key: "U",   group: "Alt/Üst", width: 56 },
  { id: "a35", label: "3.5A", key: "A35", group: "Alt/Üst", width: 56 },
  { id: "u35", label: "3.5Ü", key: "U35", group: "Alt/Üst", width: 56 },
  { id: "a45", label: "4.5A", key: "A45", group: "Alt/Üst", width: 56 },
  { id: "u45", label: "4.5Ü", key: "U45", group: "Alt/Üst", width: 56 },
  { id: "a55", label: "5.5A", key: "A55", group: "Alt/Üst", width: 56 },
  { id: "u55", label: "5.5Ü", key: "U55", group: "Alt/Üst", width: 56 },

  // ── IY Alt Üst ─────────────────────────────────────────────────────────────
  { id: "iya05", label: "IY 0.5A", key: "IYA05", group: "IY A/Ü", width: 64 },
  { id: "iyu05", label: "IY 0.5Ü", key: "IYU05", group: "IY A/Ü", width: 64 },
  { id: "iya15", label: "IY 1.5A", key: "IYA15", group: "IY A/Ü", width: 64 },
  { id: "iyu15", label: "IY 1.5Ü", key: "IYU15", group: "IY A/Ü", width: 64 },
  { id: "iya25", label: "IY 2.5A", key: "IYA25", group: "IY A/Ü", width: 64 },
  { id: "iyu25", label: "IY 2.5Ü", key: "IYU25", group: "IY A/Ü", width: 64 },

  // ── Ev Alt Üst ─────────────────────────────────────────────────────────────
  { id: "eaua05", label: "E 0.5A", key: "EAUA05", group: "Ev A/Ü", width: 60 },
  { id: "eauu05", label: "E 0.5Ü", key: "EAUU05", group: "Ev A/Ü", width: 60 },
  { id: "eaua15", label: "E 1.5A", key: "EAUA15", group: "Ev A/Ü", width: 60 },
  { id: "eauu15", label: "E 1.5Ü", key: "EAUU15", group: "Ev A/Ü", width: 60 },
  { id: "eaua25", label: "E 2.5A", key: "EAUA25", group: "Ev A/Ü", width: 60 },
  { id: "eauu25", label: "E 2.5Ü", key: "EAUU25", group: "Ev A/Ü", width: 60 },

  // ── Deplasman Alt Üst ──────────────────────────────────────────────────────
  { id: "daua05", label: "D 0.5A", key: "DAUA05", group: "Dep A/Ü", width: 60 },
  { id: "dauu05", label: "D 0.5Ü", key: "DAUU05", group: "Dep A/Ü", width: 60 },
  { id: "daua15", label: "D 1.5A", key: "DAUA15", group: "Dep A/Ü", width: 60 },
  { id: "dauu15", label: "D 1.5Ü", key: "DAUU15", group: "Dep A/Ü", width: 60 },
  { id: "daua25", label: "D 2.5A", key: "DAUA25", group: "Dep A/Ü", width: 60 },
  { id: "dauu25", label: "D 2.5Ü", key: "DAUU25", group: "Dep A/Ü", width: 60 },

  // ── MS + Alt Üst ───────────────────────────────────────────────────────────
  { id: "msau15_1a", label: "MS1&1.5A", key: "MSAU15_1A", group: "MS A/Ü", width: 68 },
  { id: "msau15_1u", label: "MS1&1.5Ü", key: "MSAU15_1U", group: "MS A/Ü", width: 68 },
  { id: "msau15_xa", label: "MSX&1.5A", key: "MSAU15_XA", group: "MS A/Ü", width: 68 },
  { id: "msau15_xu", label: "MSX&1.5Ü", key: "MSAU15_XU", group: "MS A/Ü", width: 68 },
  { id: "msau15_2a", label: "MS2&1.5A", key: "MSAU15_2A", group: "MS A/Ü", width: 68 },
  { id: "msau15_2u", label: "MS2&1.5Ü", key: "MSAU15_2U", group: "MS A/Ü", width: 68 },
  { id: "msau25_1a", label: "MS1&2.5A", key: "MSAU25_1A", group: "MS A/Ü", width: 68 },
  { id: "msau25_1u", label: "MS1&2.5Ü", key: "MSAU25_1U", group: "MS A/Ü", width: 68 },
  { id: "msau25_xa", label: "MSX&2.5A", key: "MSAU25_XA", group: "MS A/Ü", width: 68 },
  { id: "msau25_xu", label: "MSX&2.5Ü", key: "MSAU25_XU", group: "MS A/Ü", width: 68 },
  { id: "msau25_2a", label: "MS2&2.5A", key: "MSAU25_2A", group: "MS A/Ü", width: 68 },
  { id: "msau25_2u", label: "MS2&2.5Ü", key: "MSAU25_2U", group: "MS A/Ü", width: 68 },
  { id: "msau35_1a", label: "MS1&3.5A", key: "MSAU35_1A", group: "MS A/Ü", width: 68 },
  { id: "msau35_1u", label: "MS1&3.5Ü", key: "MSAU35_1U", group: "MS A/Ü", width: 68 },
  { id: "msau35_xa", label: "MSX&3.5A", key: "MSAU35_XA", group: "MS A/Ü", width: 68 },
  { id: "msau35_xu", label: "MSX&3.5Ü", key: "MSAU35_XU", group: "MS A/Ü", width: 68 },
  { id: "msau35_2a", label: "MS2&3.5A", key: "MSAU35_2A", group: "MS A/Ü", width: 68 },
  { id: "msau35_2u", label: "MS2&3.5Ü", key: "MSAU35_2U", group: "MS A/Ü", width: 68 },
  { id: "msau45_1a", label: "MS1&4.5A", key: "MSAU45_1A", group: "MS A/Ü", width: 68 },
  { id: "msau45_1u", label: "MS1&4.5Ü", key: "MSAU45_1U", group: "MS A/Ü", width: 68 },
  { id: "msau45_xa", label: "MSX&4.5A", key: "MSAU45_XA", group: "MS A/Ü", width: 68 },
  { id: "msau45_xu", label: "MSX&4.5Ü", key: "MSAU45_XU", group: "MS A/Ü", width: 68 },
  { id: "msau45_2a", label: "MS2&4.5A", key: "MSAU45_2A", group: "MS A/Ü", width: 68 },
  { id: "msau45_2u", label: "MS2&4.5Ü", key: "MSAU45_2U", group: "MS A/Ü", width: 68 },

  // ── Çift Şans ──────────────────────────────────────────────────────────────
  { id: "iy_cs1",  label: "İYÇŞ1", key: "ECK1Y1",  group: "Çift Şans", width: 60 },
  { id: "iy_csx",  label: "İYÇŞX", key: "ECK1YX",  group: "Çift Şans", width: 60 },
  { id: "iy_cs2",  label: "İYÇŞ2", key: "ECK1Y2",  group: "Çift Şans", width: 60 },
  { id: "ms_cs1x", label: "MSÇŞ1", key: "CS1X",    group: "Çift Şans", width: 60 },
  { id: "ms_cs12", label: "MSÇŞX", key: "CS12",    group: "Çift Şans", width: 60 },
  { id: "ms_csx2", label: "MSÇŞ2", key: "CSX2",    group: "Çift Şans", width: 60 },

  // ── İlk Gol ────────────────────────────────────────────────────────────────
  { id: "ig1", label: "İlk G.1", key: "IG1", group: "İlk Gol", width: 64 },
  { id: "igo", label: "İlk G.Y", key: "IGO", group: "İlk Gol", width: 64 },
  { id: "ig2", label: "İlk G.2", key: "IG2", group: "İlk Gol", width: 64 },

  // ── Daha Çok Gol - Yarı ────────────────────────────────────────────────────
  { id: "ikiys1", label: "DGY-1", key: "IKIYS1", group: "Daha Çok Gol Y.", width: 60 },
  { id: "ikiysx", label: "DGY-E", key: "IKIYSX", group: "Daha Çok Gol Y.", width: 60 },
  { id: "ikiys2", label: "DGY-2", key: "IKIYS2", group: "Daha Çok Gol Y.", width: 60 },

  // ── Maç Skoru (sonuçlar) ───────────────────────────────────────────────────
  { id: "sk00", label: "0-0", key: "SK00", group: "Maç Skoru", width: 56 },
  { id: "sk01", label: "0-1", key: "SK01", group: "Maç Skoru", width: 56 },
  { id: "sk02", label: "0-2", key: "SK02", group: "Maç Skoru", width: 56 },
  { id: "sk03", label: "0-3", key: "SK03", group: "Maç Skoru", width: 56 },
  { id: "sk10", label: "1-0", key: "SK10", group: "Maç Skoru", width: 56 },
  { id: "sk11", label: "1-1", key: "SK11", group: "Maç Skoru", width: 56 },
  { id: "sk12", label: "1-2", key: "SK12", group: "Maç Skoru", width: 56 },
  { id: "sk13", label: "1-3", key: "SK13", group: "Maç Skoru", width: 56 },
  { id: "sk20", label: "2-0", key: "SK20", group: "Maç Skoru", width: 56 },
  { id: "sk21", label: "2-1", key: "SK21", group: "Maç Skoru", width: 56 },
  { id: "sk22", label: "2-2", key: "SK22", group: "Maç Skoru", width: 56 },
  { id: "sk23", label: "2-3", key: "SK23", group: "Maç Skoru", width: 56 },
  { id: "sk30", label: "3-0", key: "SK30", group: "Maç Skoru", width: 56 },
  { id: "sk31", label: "3-1", key: "SK31", group: "Maç Skoru", width: 56 },
  { id: "sk32", label: "3-2", key: "SK32", group: "Maç Skoru", width: 56 },
  { id: "sk33", label: "3-3", key: "SK33", group: "Maç Skoru", width: 56 },
  { id: "sk40", label: "4-0", key: "SK40", group: "Maç Skoru", width: 56 },
  { id: "sk41", label: "4-1", key: "SK41", group: "Maç Skoru", width: 56 },
  { id: "sk42", label: "4-2", key: "SK42", group: "Maç Skoru", width: 56 },
  { id: "sk50", label: "5-0", key: "SK50", group: "Maç Skoru", width: 56 },
  { id: "sk51", label: "5-1", key: "SK51", group: "Maç Skoru", width: 56 },
  { id: "sk60", label: "6-0", key: "SK60", group: "Maç Skoru", width: 56 },
  { id: "skdig", label: "Diğer", key: "SKDIGER", group: "Maç Skoru", width: 56 },

  // ── İlk Yarı Skoru ─────────────────────────────────────────────────────────
  { id: "h1ys_00", label: "IY 0-0", key: "H1YS_1_1",  group: "IY Skoru", width: 60 },
  { id: "h1ys_01", label: "IY 0-1", key: "H1YS_2_1",  group: "IY Skoru", width: 60 },
  { id: "h1ys_10", label: "IY 1-0", key: "H1YS_1_2",  group: "IY Skoru", width: 60 },
  { id: "h1ys_11", label: "IY 1-1", key: "H1YS_1_3",  group: "IY Skoru", width: 60 },
  { id: "h1ys_12", label: "IY 1-2", key: "H1YS_2_2",  group: "IY Skoru", width: 60 },
  { id: "h1ys_20", label: "IY 2-0", key: "H1YS_1_4",  group: "IY Skoru", width: 60 },
  { id: "h1ys_21", label: "IY 2-1", key: "H1YS_1_5",  group: "IY Skoru", width: 60 },
  { id: "h1ys_22", label: "IY 2-2", key: "H1YS_2_3",  group: "IY Skoru", width: 60 },
  { id: "h1ys_dg", label: "IY Diğ", key: "H1YS_1_13", group: "IY Skoru", width: 60 },

  // ── Hakem / Diğer ──────────────────────────────────────────────────────────
  { id: "hakem",   label: "Hakem",  key: "hakem",  dbCol: true, group: "Diğer", width: 130 },
  { id: "suffix4", label: "S4",     key: "mac_suffix4", dbCol: true, group: "Diğer", width: 52 },
  { id: "suffix3", label: "S3",     key: "mac_suffix3", dbCol: true, group: "Diğer", width: 52 },
];

/** Grup ismine göre renk */
export const GROUP_COLORS: Record<string, string> = {
  "Temel":            "bg-slate-800",
  "Skor":             "bg-yellow-900/70",
  "Maç Sonucu":       "bg-blue-900/70",
  "Yarı Son.":        "bg-indigo-900/70",
  "OKBT":             "bg-indigo-900/70",
  "IY MS":            "bg-violet-900/70",
  "Durumlar":         "bg-violet-900/70",
  "KG":               "bg-pink-900/70",
  "Tek/Çift":         "bg-rose-900/70",
  "Top.Gol":          "bg-orange-900/70",
  "Alt/Üst":          "bg-green-900/70",
  "IY A/Ü":           "bg-teal-900/70",
  "Ev A/Ü":           "bg-cyan-900/70",
  "Dep A/Ü":          "bg-sky-900/70",
  "MS A/Ü":           "bg-lime-900/70",
  "Çift Şans":        "bg-emerald-900/70",
  "İlk Gol":          "bg-amber-900/70",
  "Daha Çok Gol Y.":  "bg-red-900/70",
  "Maç Skoru":        "bg-fuchsia-900/70",
  "IY Skoru":         "bg-purple-900/70",
  "Diğer":            "bg-slate-700",
};

/** Varsayılan görünür sütunlar (sayfa ilk açılışında) */
export const DEFAULT_VISIBLE = new Set<string>([
  "id","tarih","gun","saat","lig_adi","t1","t2",
  "sonuc_iy","sonuc_ms",
  "ms1","msx","ms2",
  "iy1","iyx","iy2",
  "kg_var","kg_yok",
  "a25","u25",
  "hakem","suffix4",
]);
