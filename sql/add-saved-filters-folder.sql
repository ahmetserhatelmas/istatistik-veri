-- Gruplama: kayıtlı filtreleri kullanıcı tanımlı başlıklar altında toplar.
-- Boş string = grupsuz liste.

ALTER TABLE public.saved_filters
  ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.saved_filters.folder IS
  'Filtre grubu / klasör adı (örn. Haftalık). Boş = grupsuz.';

CREATE INDEX IF NOT EXISTS saved_filters_user_folder_idx
  ON public.saved_filters (user_id, folder, updated_at DESC);
