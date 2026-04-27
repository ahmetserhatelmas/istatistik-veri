/**
 * "Tarih ardışık" tablosu — iddaa çeşitli kombinasyonlar Excel'deki "tarih" sayfası ile aynı mantık.
 * 31 satır × 12 sütun (Ocak–Aralık). Hücre (satır r, ay m): gün = ((r-1)+(m-1)) mod 31 + 1, ay = m.
 * Her satır bir filtre: `cf_tarih` içinde 12 parça VEYA (tarih_arama ILIKE).
 *
 * Excel'deki * soneki: yıl jokeri — burada `DD.MM*` glob olarak (→ % yılı kaplar).
 */

export const TARIH_ARDISIK_ROW_COUNT = 31;
export const TARIH_ARDISIK_COL_COUNT = 12;

/** 1-based satır (1..31), 1-based ay (1..12) → gün (1..31) */
export function ardisikGunSatirAy(satir1: number, ay1: number): number {
  return ((satir1 - 1 + (ay1 - 1)) % 31) + 1;
}

/** Takvimde olmayan (ör. 31.02, 31.04) — kırmızı gösterim için */
export function ardisikGunAyGecersizMi(gun: number, ay: number): boolean {
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return true;
  const son = new Date(2001, ay, 0).getDate();
  return gun > son;
}

export function ardisikHucreEtiket(gun: number, ay: number): string {
  return `${String(gun).padStart(2, "0")}.${String(ay).padStart(2, "0")}*`;
}

/** Tek satır için cf_tarih değeri (12 parça + ile OR) */
export function ardisikSatirCfTarihDegeri(satir1: number): string {
  const parts: string[] = [];
  for (let ay = 1; ay <= TARIH_ARDISIK_COL_COUNT; ay++) {
    const g = ardisikGunSatirAy(satir1, ay);
    parts.push(ardisikHucreEtiket(g, ay));
  }
  return parts.join("+");
}

/** Önizleme: bir satırdaki 12 etiket */
export function ardisikSatirHucreleri(satir1: number): { gun: number; ay: number; label: string; invalid: boolean }[] {
  const out: { gun: number; ay: number; label: string; invalid: boolean }[] = [];
  for (let ay = 1; ay <= TARIH_ARDISIK_COL_COUNT; ay++) {
    const gun = ardisikGunSatirAy(satir1, ay);
    const invalid = ardisikGunAyGecersizMi(gun, ay);
    out.push({ gun, ay, label: ardisikHucreEtiket(gun, ay), invalid });
  }
  return out;
}
