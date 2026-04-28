/**
 * Sayfa2 Excel sütun tanımları → raw_data key eşlemesi.
 * label: sitede gösterilecek başlık
 * key: raw_data (JSONB) içindeki alan adı; yoksa DB sütunu
 * dbCol: true → raw_data yerine doğrudan matches sütununda
 * group: grup başlığı (renk/gruplama için)
 */
import { OKBT_BASAMAK_LABELS, OKBT_7_BASAMAK_LABELS, OKBT_7_IDX_COUNT } from "./okbt-basamak-toplamlari";

/** Çok kaynaklı OKBT: her kod sütunu için bağımsız OKBT set. */
export interface OkbtMultiSource {
  /** col id öneki (ör. "kodms") ve PostgREST computed fn öneki */
  id: string;
  /** DB tablo kolonu (ör. "kod_ms") */
  dbCol: string;
  /** API satırında veriyi okumak için anahtar (genelde dbCol ile aynı) */
  rowKey: string;
  /** Sütun paneli grup etiketi */
  group: string;
  /** OKBT formül indeksleri (0-14); skor kodu gibi özel durumlar için [14] */
  indices: readonly number[];
}

const ALL_15_IDX = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14] as const;
const ALL_26_IDX = Array.from({ length: 26 }, (_, i) => i) as unknown as readonly number[];
// macid7: 119 kombinasyon (2-6'lı, itertools sırası) — tamamen client-side hesaplama
const ALL_119_IDX = Array.from({ length: OKBT_7_IDX_COUNT }, (_, i) => i) as unknown as readonly number[];

export const OKBT_MULTI_SOURCES: OkbtMultiSource[] = [
  { id: "macid",  dbCol: "id",     rowKey: "id",     group: "Maç ID · OKBT",  indices: ALL_119_IDX },
  { id: "t1i",    dbCol: "t1i",    rowKey: "t1i",    group: "T1 ID · OKBT",   indices: ALL_26_IDX },
  { id: "t2i",    dbCol: "t2i",    rowKey: "t2i",    group: "T2 ID · OKBT",   indices: ALL_26_IDX },
  { id: "kodms",  dbCol: "kod_ms", rowKey: "kod_ms", group: "MS Kod · OKBT",  indices: ALL_26_IDX },
  { id: "kodiy",  dbCol: "kod_iy", rowKey: "kod_iy", group: "İY Kod · OKBT",  indices: ALL_26_IDX },
  { id: "kodcs",  dbCol: "kod_cs", rowKey: "kod_cs", group: "ÇŞ Kod · OKBT",  indices: ALL_26_IDX },
  { id: "kodau",  dbCol: "kod_au", rowKey: "kod_au", group: "A/Ü Kod · OKBT", indices: ALL_26_IDX },
  // Ham veri (raw_data) OKBT kaynakları — rowKey "__raw_KEY" → row.raw_data['KEY'] fallback
  { id: "kodig",     dbCol: "raw_data", rowKey: "__raw_KODIG",     group: "KODIG · OKBT",     indices: ALL_26_IDX },
  { id: "kodikys",   dbCol: "raw_data", rowKey: "__raw_KODIKYS",   group: "KODIKYS · OKBT",   indices: ALL_26_IDX },
  { id: "kodiyau05", dbCol: "raw_data", rowKey: "__raw_KODIYAU05", group: "KODIYAU05 · OKBT", indices: ALL_26_IDX },
  { id: "kodiyau15", dbCol: "raw_data", rowKey: "__raw_KODIYAU15", group: "KODIYAU15 · OKBT", indices: ALL_26_IDX },
  { id: "kodiyau25", dbCol: "raw_data", rowKey: "__raw_KODIYAU25", group: "KODIYAU25 · OKBT", indices: ALL_26_IDX },
  { id: "kodiyms",   dbCol: "raw_data", rowKey: "__raw_KODIYMS",   group: "KODIYMS · OKBT",   indices: ALL_26_IDX },
  { id: "kodkg",     dbCol: "raw_data", rowKey: "__raw_KODKG",     group: "KODKG · OKBT",     indices: ALL_26_IDX },
  { id: "kodmsau15", dbCol: "raw_data", rowKey: "__raw_KODMSAU15", group: "KODMSAU15 · OKBT", indices: ALL_26_IDX },
  { id: "kodmsau25", dbCol: "raw_data", rowKey: "__raw_KODMSAU25", group: "KODMSAU25 · OKBT", indices: ALL_26_IDX },
  { id: "kodmsau35", dbCol: "raw_data", rowKey: "__raw_KODMSAU35", group: "KODMSAU35 · OKBT", indices: ALL_26_IDX },
  { id: "kodmsau45", dbCol: "raw_data", rowKey: "__raw_KODMSAU45", group: "KODMSAU45 · OKBT", indices: ALL_26_IDX },
  { id: "kodsk",     dbCol: "raw_data", rowKey: "__raw_KODSK",     group: "KODSK · OKBT",     indices: ALL_26_IDX },
  { id: "kodtc",     dbCol: "raw_data", rowKey: "__raw_KODTC",     group: "KODTC · OKBT",     indices: ALL_26_IDX },
  { id: "kodtg",     dbCol: "raw_data", rowKey: "__raw_KODTG",     group: "KODTG · OKBT",     indices: ALL_26_IDX },
  { id: "koddau05",  dbCol: "raw_data", rowKey: "__raw_KODDAU05",  group: "KODDAU05 · OKBT",  indices: ALL_26_IDX },
  { id: "koddau15",  dbCol: "raw_data", rowKey: "__raw_KODDAU15",  group: "KODDAU15 · OKBT",  indices: ALL_26_IDX },
  { id: "koddau25",  dbCol: "raw_data", rowKey: "__raw_KODDAU25",  group: "KODDAU25 · OKBT",  indices: ALL_26_IDX },
  { id: "koddau35",  dbCol: "raw_data", rowKey: "__raw_KODDAU35",  group: "KODDAU35 · OKBT",  indices: ALL_26_IDX },
  { id: "koddcgoy",  dbCol: "raw_data", rowKey: "__raw_KODDCGOY",  group: "KODDCGOY · OKBT",  indices: ALL_26_IDX },
  { id: "kodeau05",  dbCol: "raw_data", rowKey: "__raw_KODEAU05",  group: "KODEAU05 · OKBT",  indices: ALL_26_IDX },
  { id: "kodeau15",  dbCol: "raw_data", rowKey: "__raw_KODEAU15",  group: "KODEAU15 · OKBT",  indices: ALL_26_IDX },
  { id: "kodeau25",  dbCol: "raw_data", rowKey: "__raw_KODEAU25",  group: "KODEAU25 · OKBT",  indices: ALL_26_IDX },
  { id: "kodeau35",  dbCol: "raw_data", rowKey: "__raw_KODEAU35",  group: "KODEAU35 · OKBT",  indices: ALL_26_IDX },
  { id: "kodhms11",  dbCol: "raw_data", rowKey: "__raw_KODHMS11",  group: "KODHMS11 · OKBT",  indices: ALL_26_IDX },
  { id: "kodhms12",  dbCol: "raw_data", rowKey: "__raw_KODHMS12",  group: "KODHMS12 · OKBT",  indices: ALL_26_IDX },
  { id: "kodhms21",  dbCol: "raw_data", rowKey: "__raw_KODHMS21",  group: "KODHMS21 · OKBT",  indices: ALL_26_IDX },
  { id: "kodhms22",  dbCol: "raw_data", rowKey: "__raw_KODHMS22",  group: "KODHMS22 · OKBT",  indices: ALL_26_IDX },
];

export const OKBT_MULTI_SOURCE_MAP: Record<string, OkbtMultiSource> =
  Object.fromEntries(OKBT_MULTI_SOURCES.map((s) => [s.id, s]));

function buildOkbtMultiColsForSources(sourceIds: readonly string[]): ColDef[] {
  const cols: ColDef[] = [];
  const idSet = new Set(sourceIds);
  for (const src of OKBT_MULTI_SOURCES) {
    if (!idSet.has(src.id)) continue;
    const is7 = src.id === "macid";
    for (const idx of src.indices) {
      const label = is7
        ? (OKBT_7_BASAMAK_LABELS[idx as number] ?? String(idx))
        : (OKBT_BASAMAK_LABELS[idx as number] ?? String(idx));
      cols.push({
        id: `${src.id}_obktb_${idx}`,
        label,
        key: `__okbtm_${src.id}_${idx}`,
        group: src.group,
        width: 60,
      });
    }
  }
  return cols;
}

export interface ColDef {
  id: string;
  label: string;
  key: string;
  dbCol?: boolean;
  group: string;
  width?: number; // px — varsayılan 60
}

export const ALL_COLS: ColDef[] = [
  // ── Tarih ──────────────────────────────────────────────────────────────────
  { id: "tarih",    label: "Tarih",    key: "tarih",       dbCol: true, group: "Tarih", width: 96 },
  { id: "gun",      label: "Gün",      key: "tarih_tr_gunlu", dbCol: true, group: "Tarih", width: 88 },
  { id: "saat",     label: "Saat",     key: "saat",        dbCol: true, group: "Tarih", width: 56 },

  // ── Lig Bilgisi ────────────────────────────────────────────────────────────
  { id: "lig_kodu", label: "Lig Kodu", key: "lig_kodu",    dbCol: true, group: "Lig Bilgisi", width: 80 },
  { id: "lig_adi",  label: "Lig Adı",  key: "lig_adi",     dbCol: true, group: "Lig Bilgisi", width: 150 },
  { id: "lig_id",   label: "Lig ID",   key: "lig_id",      dbCol: true, group: "Lig Bilgisi", width: 60 },
  { id: "alt_lig",  label: "Alt Lig",  key: "alt_lig_adi", dbCol: true, group: "Lig Bilgisi", width: 130 },
  { id: "alt_lig_id", label: "Alt Lig ID", key: "alt_lig_id", dbCol: true, group: "Lig Bilgisi", width: 72 },
  { id: "sezon",    label: "Sezon Adı",key: "sezon_adi",   dbCol: true, group: "Lig Bilgisi", width: 90 },
  { id: "sezon_id", label: "Sezon ID", key: "sezon_id",    dbCol: true, group: "Lig Bilgisi", width: 60 },

  // ── Maç Kodu ve MS Kodu ────────────────────────────────────────────────────
  { id: "id",       label: "Maç Kodu",  key: "id",         dbCol: true, group: "Maç Kodu ve MS Kodu", width: 90 },
  { id: "mbs",      label: "MKT",       key: "mkt_display", dbCol: true, group: "Maç Kodu ve MS Kodu", width: 60 },
  { id: "kod_ms",   label: "MS Kodu",   key: "kod_ms",     dbCol: true, group: "Maç Kodu ve MS Kodu", width: 72 },
  { id: "suffix3",  label: "MsMKT",     key: "msmkt_display", dbCol: true, group: "Maç Kodu ve MS Kodu", width: 60 },

  // ── MBS ────────────────────────────────────────────────────────────────────
  { id: "suffix4",  label: "MBS",       key: "mac_suffix4",dbCol: true, group: "MBS", width: 56 },

  // ── Takımlar ───────────────────────────────────────────────────────────────
  { id: "t1",  label: "Ev Sahibi", key: "t1",  dbCol: true, group: "Takımlar", width: 150 },
  { id: "t1i", label: "T1 ID",     key: "t1i", dbCol: true, group: "Takımlar", width: 60 },
  { id: "t2",  label: "Deplasman", key: "t2",  dbCol: true, group: "Takımlar", width: 150 },
  { id: "t2i", label: "T2 ID",     key: "t2i", dbCol: true, group: "Takımlar", width: 60 },

  // ── Skor ───────────────────────────────────────────────────────────────────
  { id: "sonuc_iy", label: "IY",  key: "sonuc_iy", dbCol: true, group: "Skor", width: 60 },
  { id: "sonuc_ms", label: "MS",  key: "sonuc_ms", dbCol: true, group: "Skor", width: 60 },

  // ── Maç Sonucu ─────────────────────────────────────────────────────────────
  { id: "ms1", label: "1",   key: "ms1", dbCol: true, group: "Maç Sonucu", width: 60 },
  { id: "msx", label: "X",   key: "msx", dbCol: true, group: "Maç Sonucu", width: 60 },
  { id: "ms2", label: "2",   key: "ms2", dbCol: true, group: "Maç Sonucu", width: 60 },

  // ── OKBT (IY Sonucu) ───────────────────────────────────────────────────────
  { id: "iy1", label: "IY1", key: "iy1", dbCol: true, group: "İlk Yarı", width: 60 },
  { id: "iyx", label: "IYX", key: "iyx", dbCol: true, group: "İlk Yarı", width: 60 },
  { id: "iy2", label: "IY2", key: "iy2", dbCol: true, group: "İlk Yarı", width: 60 },

  // ── 2. yarı maç sonucu (oranlar: raw_data IKIYS1 / IKIYSX / IKIYS2) ──────────
  { id: "ikiys1", label: "2Y1", key: "IKIYS1", group: "2. Yarı MS", width: 60 },
  { id: "ikiysx", label: "2YX", key: "IKIYSX", group: "2. Yarı MS", width: 60 },
  { id: "ikiys2", label: "2Y2", key: "IKIYS2", group: "2. Yarı MS", width: 60 },

  // ── İYMS (İY / MS kombinasyonu) ─────────────────────────────────────────────
  { id: "iyms11", label: "1/1", key: "IYMS11", group: "İYMS", width: 56 },
  { id: "iyms1x", label: "1/X", key: "IYMS1X", group: "İYMS", width: 56 },
  { id: "iyms12", label: "1/2", key: "IYMS12", group: "İYMS", width: 56 },
  { id: "iymsx1", label: "X/1", key: "IYMSX1", group: "İYMS", width: 56 },
  { id: "iymsxx", label: "X/X", key: "IYMSXX", group: "İYMS", width: 56 },
  { id: "iymsx2", label: "X/2", key: "IYMSX2", group: "İYMS", width: 56 },
  { id: "iyms21", label: "2/1", key: "IYMS21", group: "İYMS", width: 56 },
  { id: "iyms2x", label: "2/X", key: "IYMS2X", group: "İYMS", width: 56 },
  { id: "iyms22", label: "2/2", key: "IYMS22", group: "İYMS", width: 56 },

  // ── Karşılıklı Gol ─────────────────────────────────────────────────────────
  { id: "kg_var", label: "KG V", key: "kg_var", dbCol: true, group: "KG", width: 60 },
  { id: "kg_yok", label: "KG Y", key: "kg_yok", dbCol: true, group: "KG", width: 60 },

  // ── Tek / Çift ─────────────────────────────────────────────────────────────
  { id: "tek",  label: "TEK",  key: "KTCT", group: "Tek/Çift", width: 60 },
  { id: "cift", label: "ÇİFT", key: "KTCC", group: "Tek/Çift", width: 60 },

  // ── Toplam Gol ────────────────────────────────────────────────────────────
  { id: "tg01", label: "0-1", key: "TG01", group: "Top.Gol", width: 56 },
  { id: "tg23", label: "2-3", key: "TG23", group: "Top.Gol", width: 56 },
  { id: "tg45", label: "4-5", key: "TG45", group: "Top.Gol", width: 56 },
  { id: "tg6",  label: "6+",  key: "TG6",  group: "Top.Gol", width: 56 },

  // ── Alt/Üst ───────────────────────────────────────────────────────────────
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

  // ── IY Alt/Üst ────────────────────────────────────────────────────────────
  { id: "iya05", label: "IY 0.5A", key: "IYA05", group: "IY A/Ü", width: 64 },
  { id: "iyu05", label: "IY 0.5Ü", key: "IYU05", group: "IY A/Ü", width: 64 },
  { id: "iya15", label: "IY 1.5A", key: "IYA15", group: "IY A/Ü", width: 64 },
  { id: "iyu15", label: "IY 1.5Ü", key: "IYU15", group: "IY A/Ü", width: 64 },
  { id: "iya25", label: "IY 2.5A", key: "IYA25", group: "IY A/Ü", width: 64 },
  { id: "iyu25", label: "IY 2.5Ü", key: "IYU25", group: "IY A/Ü", width: 64 },

  // ── Ev Alt/Üst ────────────────────────────────────────────────────────────
  { id: "eaua05", label: "E 0.5A", key: "EAUA05", group: "Ev A/Ü", width: 60 },
  { id: "eauu05", label: "E 0.5Ü", key: "EAUU05", group: "Ev A/Ü", width: 60 },
  { id: "eaua15", label: "E 1.5A", key: "EAUA15", group: "Ev A/Ü", width: 60 },
  { id: "eauu15", label: "E 1.5Ü", key: "EAUU15", group: "Ev A/Ü", width: 60 },
  { id: "eaua25", label: "E 2.5A", key: "EAUA25", group: "Ev A/Ü", width: 60 },
  { id: "eauu25", label: "E 2.5Ü", key: "EAUU25", group: "Ev A/Ü", width: 60 },

  // ── Dep Alt/Üst ───────────────────────────────────────────────────────────
  { id: "daua05", label: "D 0.5A", key: "DAUA05", group: "Dep A/Ü", width: 60 },
  { id: "dauu05", label: "D 0.5Ü", key: "DAUU05", group: "Dep A/Ü", width: 60 },
  { id: "daua15", label: "D 1.5A", key: "DAUA15", group: "Dep A/Ü", width: 60 },
  { id: "dauu15", label: "D 1.5Ü", key: "DAUU15", group: "Dep A/Ü", width: 60 },
  { id: "daua25", label: "D 2.5A", key: "DAUA25", group: "Dep A/Ü", width: 60 },
  { id: "dauu25", label: "D 2.5Ü", key: "DAUU25", group: "Dep A/Ü", width: 60 },

  // ── MS + Alt/Üst ──────────────────────────────────────────────────────────
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

  // ── Çift Şans ─────────────────────────────────────────────────────────────
  { id: "iy_cs1",  label: "İYÇŞ1", key: "ECK1Y1", group: "Çift Şans", width: 60 },
  { id: "iy_csx",  label: "İYÇŞX", key: "ECK1YX", group: "Çift Şans", width: 60 },
  { id: "iy_cs2",  label: "İYÇŞ2", key: "ECK1Y2", group: "Çift Şans", width: 60 },
  { id: "ms_cs1x", label: "MSÇŞ1", key: "CS1X",   group: "Çift Şans", width: 60 },
  { id: "ms_cs12", label: "MSÇŞX", key: "CS12",   group: "Çift Şans", width: 60 },
  { id: "ms_csx2", label: "MSÇŞ2", key: "CSX2",   group: "Çift Şans", width: 60 },

  // ── İlk Gol ───────────────────────────────────────────────────────────────
  { id: "ig1", label: "İlk G.1", key: "IG1", group: "İlk Gol", width: 64 },
  { id: "igo", label: "İlk G.Y", key: "IGO", group: "İlk Gol", width: 64 },
  { id: "ig2", label: "İlk G.2", key: "IG2", group: "İlk Gol", width: 64 },

  // ── IY Skoru ──────────────────────────────────────────────────────────────
  { id: "h1ys_00", label: "IY 0-0", key: "H1YS_1_1",  group: "IY Skoru", width: 60 },
  { id: "h1ys_01", label: "IY 0-1", key: "H1YS_2_1",  group: "IY Skoru", width: 60 },
  { id: "h1ys_10", label: "IY 1-0", key: "H1YS_1_2",  group: "IY Skoru", width: 60 },
  { id: "h1ys_11", label: "IY 1-1", key: "H1YS_1_3",  group: "IY Skoru", width: 60 },
  { id: "h1ys_12", label: "IY 1-2", key: "H1YS_2_2",  group: "IY Skoru", width: 60 },
  { id: "h1ys_20", label: "IY 2-0", key: "H1YS_1_4",  group: "IY Skoru", width: 60 },
  { id: "h1ys_21", label: "IY 2-1", key: "H1YS_1_5",  group: "IY Skoru", width: 60 },
  { id: "h1ys_22", label: "IY 2-2", key: "H1YS_2_3",  group: "IY Skoru", width: 60 },
  { id: "h1ys_dg", label: "IY Diğ", key: "H1YS_1_13", group: "IY Skoru", width: 60 },

  // ── Diğer ─────────────────────────────────────────────────────────────────
  { id: "hakem",       label: "Hakem",               key: "hakem",       dbCol: true, group: "Diğer", width: 130 },
  { id: "t1_antrenor", label: "Ev teknik direktör",  key: "t1_antrenor", dbCol: true, group: "Diğer", width: 140 },
  { id: "t2_antrenor", label: "Dep teknik direktör", key: "t2_antrenor", dbCol: true, group: "Diğer", width: 140 },
  { id: "kod_cs",  label: "ÇŞ Kod",  key: "kod_cs",  dbCol: true, group: "Diğer", width: 72 },
  { id: "kod_iy",  label: "IY Kod",  key: "kod_iy",  dbCol: true, group: "Diğer", width: 72 },
  { id: "kod_au",  label: "A/Ü Kod", key: "kod_au",  dbCol: true, group: "Diğer", width: 72 },

  // ── Çok kaynaklı OKBT (tüm kaynaklar; macid 7 hane A–G) ─────────────────────
  ...buildOkbtMultiColsForSources([
    "macid", "t1i", "t2i", "kodms", "kodiy", "kodcs", "kodau",
    // Ham veri (raw_data) OKBT kaynakları
    "kodig", "kodikys", "kodiyau05", "kodiyau15", "kodiyau25", "kodiyms", "kodkg",
    "kodmsau15", "kodmsau25", "kodmsau35", "kodmsau45", "kodsk", "kodtc", "kodtg",
    "koddau05", "koddau15", "koddau25", "koddau35", "koddcgoy",
    "kodeau05", "kodeau15", "kodeau25", "kodeau35",
    "kodhms11", "kodhms12", "kodhms21", "kodhms22",
  ]),
];

/** API / DB alan adlarını karşılaştırmak (T1ANTRENOR ↔ t1_antrenor) */
function normFieldKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** ALL_COLS'ta zaten karşılığı varsa ham raw_data sütunu ekleme */
export function isRawKeyCoveredByKnownCol(rawKey: string): boolean {
  const n = normFieldKey(rawKey);
  return ALL_COLS.some(
    (c) => c.key === rawKey || normFieldKey(c.key) === n
  );
}

/**
 * Ham veri (raw_data) anahtarları — sütun panelinde ve tabloda gösterilmez.
 *
 * POLİTİKA: Yalnızca kullanıcının resimlerde gösterdiği tam kodlar veya
 * çok kesin seri kalıpları. Geniş prefix (startsWith) kullanılmaz; fazla
 * silmesin.
 */

/** Tam eşleşmeyle gizlenecek ham veri anahtarları (büyük/küçük harf yok sayılır). */
const RAW_KEY_EXACT_EXCLUDE = new Set<string>([
  // ─── 1. resim ───────────────────────────────────────────────────────────
  "A65", "A75", "A85",
  "AGG1", "AGG2",
  // ─── 2. resim ───────────────────────────────────────────────────────────
  "DCSOP1P", "DCSOP2P", "DCSOP3P", "DCSOP4P", "DCSOPE",
  "DGYE", "DGYH", "DGYKOLMAZ", "DGYKOLUR",
  "DIYDGATAMAZ", "DIYDGATAR",
  // ─── 3. resim ───────────────────────────────────────────────────────────
  // DURUMH: sadece bu ikisi; DURUMHMS* vs. durmalı
  "DURUMH1YS_1", "DURUMH1YS_1X",
  // DURUMHMS: yalnızca 15/16/17/25/26/27 ve _1x
  "DURUMHMS15", "DURUMHMS16", "DURUMHMS17",
  "DURUMHMS25", "DURUMHMS26", "DURUMHMS27",
  "DURUMHMS_1X",
  // FT/HT tek tek
  "FT1", "FT2", "FTH1", "FTH2",
  "HT1", "HT2",
  "HTFT11", "HTFT12", "HTFT21", "HTFT22",
  "HTH1", "HTH2",
  "HMSX", "HMSH1", "HMSH2",
  // ─── diğer ──────────────────────────────────────────────────────────────
  "METOD2",
  // KODAU tam eşleşmeler — sadece bunlar, KODAU35/45/55 ve KODAUD_* durmalı
  "KODAU65", "KODAU75", "KODAU85",
  // KODHMS (underscore'suz, tam sayı) — sadece 15-17 ve 25-27
  "KODHMS15", "KODHMS16", "KODHMS17",
  "KODHMS25", "KODHMS26", "KODHMS27",
  // Yeni (resim 6)
  "P4_1", "P4_2",
  "U65", "U75", "U85",
  "UFT1", "UFT2",
  "UOE", "UOH",
]);

export function isRawKeyExcludedFromColumns(rawKey: string): boolean {
  const U = rawKey.trim().toUpperCase();
  if (!U) return true;
  if (RAW_KEY_EXACT_EXCLUDE.has(U)) return true;

  // ── H1YSH_* ve H1YS_[12]_* ──────────────────────────────────────────────
  if (U.startsWith("H1YSH_")) return true;
  if (/^H1YS_[12]_\d+$/.test(U)) return true;

  // ── HMS seri kalıpları ───────────────────────────────────────────────────
  if (/^HMS(15|16|17|25|26|27)_/.test(U)) return true;
  if (/^HMSH_[12]_\d+$/.test(U)) return true;
  if (/^HMS_[12]_\d+$/.test(U)) return true;

  // ── KODHMS_ (underscore'lu): 3-9 ve 15-19 mavi; 1-2, 10-14, 21+ beyaz ──
  {
    const m = U.match(/^KODHMS_(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if ((n >= 3 && n <= 9) || (n >= 15 && n <= 19)) return true;
    }
  }

  // ── KODAU1Y_: 4-13 mavi; 1-3 beyaz ─────────────────────────────────────
  {
    const m = U.match(/^KODAU1Y_(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 4 && n <= 13) return true;
    }
  }

  // ── KODAUE_: 5-13 mavi; 1-4 beyaz ──────────────────────────────────────
  {
    const m = U.match(/^KODAUE_(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 5 && n <= 13) return true;
    }
  }

  // ── KODAU_: 5-19 mavi; 1-4 ve 20 beyaz ─────────────────────────────────
  {
    const m = U.match(/^KODAU_(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 5 && n <= 19) return true;
    }
  }

  // ── AU serileri (KOD'suz) — tümü mavi ───────────────────────────────────
  if (/^AU1Y_[AU]_\d+$/.test(U)) return true;
  if (/^AUD_[AU]_\d+$/.test(U)) return true;
  if (/^AUE_[AU]_\d+$/.test(U)) return true;
  if (/^AU_[AU]_\d+$/.test(U)) return true;

  // ── LIMIT_* — tümü mavi ─────────────────────────────────────────────────
  if (U.startsWith("LIMIT_")) return true;

  return false;
}

/** Oran API alan adı → daha okunaklı başlık (Ham veri grubu) */
export const RAW_FRIENDLY_LABELS: Record<string, string> = {
  T1ANTRENOR: "Ev teknik direktör",
  T2ANTRENOR: "Dep teknik direktör",
  T1I: "Ev takım ID",
  T2I: "Dep takım ID",
  LIGKODU: "Lig kodu (API)",
  LIGADI: "Lig adı (API)",
  LIGID: "Lig ID",
  ALTLIGADI: "Alt lig (API)",
  ALTLIGID: "Alt lig ID",
  SEZONADI: "Sezon (API)",
  SEZONID: "Sezon ID",
  KODMS: "Kod MS (API)",
  KODCS: "Kod ÇŞ (API)",
  KODIY: "Kod IY (API)",
  KODAU: "Kod A/Ü (API)",
  HAKEM: "Hakem (API)",
  SONUCIY: "Sonuç IY (API)",
  SONUCMS: "Sonuç MS (API)",
};

const RAW_GROUP = "Ham veri (API)";

function rawKeyToColId(k: string): string {
  const safe = k.replace(/[^a-zA-Z0-9_]/g, "_");
  return `raw_${safe}`;
}

/** raw_data'da olup ALL_COLS'ta olmayan her alan için sütun tanımı */
export function extraRawColDefs(rawKeys: string[]): ColDef[] {
  const out: ColDef[] = [];
  const seen = new Set<string>();
  for (const k of rawKeys) {
    if (!k || isRawKeyCoveredByKnownCol(k) || isRawKeyExcludedFromColumns(k)) continue;
    const id = rawKeyToColId(k);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: RAW_FRIENDLY_LABELS[k] ?? k,
      key: k,
      group: RAW_GROUP,
      width: 72,
    });
  }
  return out;
}

export function mergeAllCols(rawKeysFromDb: string[]): ColDef[] {
  return [...ALL_COLS, ...extraRawColDefs(rawKeysFromDb)];
}

/** Sunucu cf_*: ALL_COLS’ta dbCol olmayan, raw_data JSON anahtarı olan sütunlar (id → key). */
export function staticCfRawJsonKeyByColId(): Record<string, string> {
  const m: Record<string, string> = {};
  for (const c of ALL_COLS) {
    if (c.dbCol) continue;
    if (!c.key || c.key.startsWith("__")) continue;
    m[c.id] = c.key;
  }
  return m;
}

/** Ham veri raw_* sütunları: raw-keys örnekleminden (id → JSON anahtarı). */
export function dynamicRawColIdToJsonKey(rawKeys: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const d of extraRawColDefs(rawKeys)) {
    m[d.id] = d.key;
  }
  return m;
}

/**
 * cf_* yalnızca tarayıcıda süzülecek sütunlar.
 * "__" prefix'li key'e sahip ama server-side filtrelenen (PostgREST computed fn) sütunlar hariç:
 * - `__okbtm_*` → OKBT multi-kod: server'da `{srcId}_obktb_{idx}(matches)` fn ile filtreler
 */
export const CF_CLIENT_ONLY_COL_IDS: Set<string> = new Set(
  ALL_COLS.filter((c) => c.key.startsWith("__") && !c.key.startsWith("__okbtm_")).map((c) => c.id)
);

/** Grup ismine göre renk */
export const GROUP_COLORS: Record<string, string> = {
  "Tarih":                  "bg-slate-300",
  "Lig Bilgisi":            "bg-yellow-200",
  "Maç Kodu ve MS Kodu":    "bg-blue-200",
  "MBS":                    "bg-indigo-200",
  "Takımlar":               "bg-orange-200",
  "Skor":                   "bg-green-200",
  "Maç Sonucu":             "bg-fuchsia-200",
  "İlk Yarı":               "bg-indigo-200",
  "Maç ID · OKBT":          "bg-purple-100",
  "T1 ID · OKBT":           "bg-orange-100",
  "T2 ID · OKBT":           "bg-amber-100",
  "MS Kod · OKBT":          "bg-blue-100",
  "İY Kod · OKBT":          "bg-indigo-100",
  "ÇŞ Kod · OKBT":          "bg-teal-100",
  "A/Ü Kod · OKBT":         "bg-green-100",
  "İYMS":                   "bg-violet-200",
  "KG":                     "bg-pink-200",
  "Tek/Çift":               "bg-rose-200",
  "Top.Gol":                "bg-orange-200",
  "Alt/Üst":                "bg-green-200",
  "IY A/Ü":                 "bg-teal-200",
  "Ev A/Ü":                 "bg-cyan-200",
  "Dep A/Ü":                "bg-sky-200",
  "MS A/Ü":                 "bg-lime-200",
  "Çift Şans":              "bg-emerald-200",
  "İlk Gol":                "bg-amber-200",
  "2. Yarı MS":             "bg-indigo-100",
  "IY Skoru":               "bg-purple-200",
  "Diğer":                  "bg-slate-200",
  [RAW_GROUP]:              "bg-zinc-200",
};

/** Varsayılan görünür sütunlar (sayfa ilk açılışında) */
export const DEFAULT_VISIBLE = new Set<string>([
  "tarih","gun","saat",
  "lig_kodu","lig_adi","lig_id","alt_lig","alt_lig_id","sezon","sezon_id",
  "id","mbs","kod_ms","suffix3",
  "suffix4",
  "t1","t1i","t2","t2i",
  "sonuc_iy","sonuc_ms",
  "ms1","msx","ms2",
]);
