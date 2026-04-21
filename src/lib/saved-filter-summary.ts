/**
 * Kayıtlı filtre payload'undan (Filtrelerim çekmecesi) kısa insan-okur özet satırları üretir.
 * MatchTable `captureFilterSnapshot` ile uyumlu alanlar: topFilters, colFilters, bidirFilters, …
 */
import { ALL_COLS, type ColDef } from "@/lib/columns";

const COL_LABEL = new Map<string, string>(
  ALL_COLS.map((c: ColDef) => [c.id, c.label]),
);

function colLabel(id: string): string {
  return COL_LABEL.get(id) ?? id;
}

function trimStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function laneCommitted(v: unknown): string {
  if (!v || typeof v !== "object") return "";
  const o = v as { committed?: unknown };
  return trimStr(o.committed);
}

/** Üst şerit (kaydedilen `topFilters` = MatchTable `filters` anlık görünümü). */
const TOP_KEYS_ORDER: { k: string; label: string }[] = [
  { k: "tarih_from", label: "Tarih ≥" },
  { k: "tarih_to", label: "Tarih ≤" },
  { k: "tarih_gun", label: "Gün" },
  { k: "tarih_ay", label: "Ay" },
  { k: "tarih_yil", label: "Yıl" },
  { k: "lig", label: "Üst lig" },
  { k: "takim", label: "Üst takım" },
  { k: "sonuc_iy", label: "Üst İY" },
  { k: "sonuc_ms", label: "Üst MS" },
  { k: "hakem", label: "Üst hakem" },
  { k: "suffix4", label: "MBS (üst)" },
  { k: "suffix3", label: "MsMKT (üst)" },
];

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Kayıtlı filtre `payload` için özet satırları döner (boş dizi = “ayar yok” gibi).
 */
export function summarizeSavedFilterPayload(
  payload: Record<string, unknown> | null | undefined,
  opts?: { maxColEntries?: number; maxLineChars?: number },
): string[] {
  const maxCol = opts?.maxColEntries ?? 24;
  const maxCh = opts?.maxLineChars ?? 72;
  const p = payload ?? {};
  const lines: string[] = [];

  const top =
    p.topFilters && typeof p.topFilters === "object"
      ? (p.topFilters as Record<string, unknown>)
      : null;
  if (top) {
    for (const { k, label } of TOP_KEYS_ORDER) {
      const v = trimStr(top[k]);
      if (!v) continue;
      lines.push(truncate(`${label}: ${v}`, maxCh));
    }
  }

  const tp = p.tarihPick;
  if (tp && typeof tp === "object") {
    const o = tp as { d?: unknown; m?: unknown };
    const d = trimStr(o.d);
    const m = trimStr(o.m);
    if (d || m) {
      const bits = [d && `gün ${d}`, m && `ay ${m}`].filter(Boolean).join(", ");
      lines.push(truncate(`Tarih seçici (⊞): ${bits}`, maxCh));
    }
  }

  const cf =
    p.colFilters && typeof p.colFilters === "object"
      ? (p.colFilters as Record<string, string>)
      : null;
  if (cf) {
    const entries = Object.entries(cf)
      .map(([id, raw]) => ({ id, v: trimStr(raw) }))
      .filter((x) => x.v.length > 0)
      .sort((a, b) => colLabel(a.id).localeCompare(colLabel(b.id), "tr"));
    for (let i = 0; i < Math.min(entries.length, maxCol); i++) {
      const { id, v } = entries[i]!;
      lines.push(truncate(`${colLabel(id)}: ${v}`, maxCh));
    }
    if (entries.length > maxCol) {
      lines.push(`… +${entries.length - maxCol} sütun daha`);
    }
  }

  const bidir = p.bidirFilters;
  if (bidir && typeof bidir === "object") {
    const b = bidir as Record<string, unknown>;
    const te = laneCommitted((b.takim as Record<string, unknown>)?.ev);
    const td = laneCommitted((b.takim as Record<string, unknown>)?.dep);
    if (te || td) {
      const parts = [te && `ev ${te}`, td && `dep ${td}`].filter(Boolean).join(" · ");
      lines.push(truncate(`⇄ Takım: ${parts}`, maxCh));
    }
    const tie = laneCommitted((b.takimid as Record<string, unknown>)?.ev);
    const tid = laneCommitted((b.takimid as Record<string, unknown>)?.dep);
    if (tie || tid) {
      const parts = [tie && `ev ${tie}`, tid && `dep ${tid}`].filter(Boolean).join(" · ");
      lines.push(truncate(`⇄ T-ID: ${parts}`, maxCh));
    }
    const per = b.personel as Record<string, unknown> | undefined;
    if (per) {
      const hk = laneCommitted(per.hakem);
      const aEv = laneCommitted(per.antEv);
      const aDep = laneCommitted(per.antDep);
      const aHer = laneCommitted(per.antHer);
      if (hk) lines.push(truncate(`⇄ Hakem: ${hk}`, maxCh));
      if (aEv || aDep || aHer) {
        const parts = [
          aEv && `ev TD ${aEv}`,
          aDep && `dep TD ${aDep}`,
          aHer && `TD ${aHer}`,
        ].filter(Boolean).join(" · ");
        lines.push(truncate(`⇄ TD: ${parts}`, maxCh));
      }
    }
  }

  const any = p.anyKodSuffix;
  if (any && typeof any === "object") {
    const o = any as { digits?: unknown; n?: unknown };
    const dig = trimStr(o.digits);
    const n = trimStr(o.n);
    if (dig) {
      const bit = n ? `KOD* son ${n} = ${dig}` : `KOD*: ${dig}`;
      lines.push(truncate(`◉ ${bit}`, maxCh));
    }
  }

  const dpm = trimStr(p.digitPosMode);
  if (dpm === "positional") {
    lines.push("Hane: tam pozisyon (=)");
  }

  const cdm = p.colDigitMode;
  if (cdm && typeof cdm === "object") {
    const o = cdm as Record<string, string>;
    const ids = Object.keys(o).filter((id) => o[id] === "contains" || o[id] === "positional");
    if (ids.length > 0) {
      const show = ids.slice(0, 4).map((id) => `${colLabel(id)}=${o[id]}`).join(", ");
      const tail = ids.length > 4 ? ` …+${ids.length - 4}` : "";
      lines.push(truncate(`Sütun H/A: ${show}${tail}`, maxCh));
    }
  }

  const ccp = p.colClickPos;
  if (ccp && typeof ccp === "object") {
    const o = ccp as Record<string, unknown>;
    const bits: string[] = [];
    for (const [id, raw] of Object.entries(o)) {
      if (!Array.isArray(raw) || raw.length === 0) continue;
      bits.push(`${colLabel(id)}[${raw.join(",")}]`);
      if (bits.length >= 4) break;
    }
    if (bits.length) {
      lines.push(truncate(`⊞ Hane seçimi: ${bits.join(" · ")}`, maxCh));
    }
  }

  if (lines.length === 0) {
    return ["(Boş kayıt — yalnızca varsayılan görünüm)"];
  }
  return lines;
}
