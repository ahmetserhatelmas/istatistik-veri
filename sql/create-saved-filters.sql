-- ============================================================================
-- saved_filters: Kullanıcıya özel kayıtlı filtre çekmeceleri
--
-- Adam: "Kaydedilen herşey serverde sitenin diğer verileriyle beraber her
-- kullanıcı için oluşturulacak çekmecelerde dursun" (15:29).
--
-- Her kullanıcı kendi filtrelerini kaydeder, listeler, siler. RLS ile
-- başkasının kaydına erişilemez.
--
-- payload (jsonb): istemci tarafında serialize edilmiş durum — tipik olarak:
--   {
--     "colFilters": { "kod_ms": "*575", "saat": "20:*", ... },
--     "colClickPos": { "kod_ms": [1,2] },
--     "colDigitMode": { "kod_ms": "positional" },
--     "kodSuffixActive": { "n": 3, "digits": "575", "refKey": "kod_ms" } | null,
--     "bidirFilters": {...},
--     "dateRange": { "from": "2024-01-01", "to": "2024-12-31" },
--     "scope": "full" | "column-only"
--   }
-- Şema esnek — yeni alanlar eklendiğinde eski kayıtları bozmasın diye
-- doğrulama client tarafında. Sunucu sadece saklar.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_filters (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  payload     jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Aynı kullanıcıda aynı isim iki kez olmasın
  CONSTRAINT saved_filters_user_name_unique UNIQUE (user_id, name)
);

-- Hızlı listeleme: kullanıcıya göre + son güncellemeye göre sırala
CREATE INDEX IF NOT EXISTS saved_filters_user_updated_idx
  ON public.saved_filters (user_id, updated_at DESC);

-- updated_at'ı otomatik güncelle
CREATE OR REPLACE FUNCTION public.set_saved_filters_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saved_filters_updated_at ON public.saved_filters;
CREATE TRIGGER trg_saved_filters_updated_at
  BEFORE UPDATE ON public.saved_filters
  FOR EACH ROW EXECUTE FUNCTION public.set_saved_filters_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- Her kullanıcı yalnızca kendi kayıtlarını görür, değiştirir, siler.
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_filters_select_own ON public.saved_filters;
CREATE POLICY saved_filters_select_own ON public.saved_filters
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_filters_insert_own ON public.saved_filters;
CREATE POLICY saved_filters_insert_own ON public.saved_filters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_filters_update_own ON public.saved_filters;
CREATE POLICY saved_filters_update_own ON public.saved_filters
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_filters_delete_own ON public.saved_filters;
CREATE POLICY saved_filters_delete_own ON public.saved_filters
  FOR DELETE USING (auth.uid() = user_id);

-- Yetki: authenticated rolü tam CRUD, anon erişemez
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_filters TO authenticated;
REVOKE ALL ON public.saved_filters FROM anon;

COMMENT ON TABLE public.saved_filters IS
  'Kullanıcıya özel kayıtlı filtre çekmeceleri. RLS: yalnızca sahibi erişir.';
