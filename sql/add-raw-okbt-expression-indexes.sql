-- Raw OKBT expression indexes: 27 kaynak x 26 idx = 702 index
-- Her biri CONCURRENTLY - tablo kilitlenmez.
-- psql ile calistirilmali (Supabase SQL Editor degil).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 0)));
\echo 'Created idx_m_raw_okbt_kodig_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 1)));
\echo 'Created idx_m_raw_okbt_kodig_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 2)));
\echo 'Created idx_m_raw_okbt_kodig_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 3)));
\echo 'Created idx_m_raw_okbt_kodig_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 4)));
\echo 'Created idx_m_raw_okbt_kodig_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 5)));
\echo 'Created idx_m_raw_okbt_kodig_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 6)));
\echo 'Created idx_m_raw_okbt_kodig_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 7)));
\echo 'Created idx_m_raw_okbt_kodig_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 8)));
\echo 'Created idx_m_raw_okbt_kodig_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 9)));
\echo 'Created idx_m_raw_okbt_kodig_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 10)));
\echo 'Created idx_m_raw_okbt_kodig_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 11)));
\echo 'Created idx_m_raw_okbt_kodig_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 12)));
\echo 'Created idx_m_raw_okbt_kodig_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 13)));
\echo 'Created idx_m_raw_okbt_kodig_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 14)));
\echo 'Created idx_m_raw_okbt_kodig_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 15)));
\echo 'Created idx_m_raw_okbt_kodig_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 16)));
\echo 'Created idx_m_raw_okbt_kodig_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 17)));
\echo 'Created idx_m_raw_okbt_kodig_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 18)));
\echo 'Created idx_m_raw_okbt_kodig_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 19)));
\echo 'Created idx_m_raw_okbt_kodig_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 20)));
\echo 'Created idx_m_raw_okbt_kodig_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 21)));
\echo 'Created idx_m_raw_okbt_kodig_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 22)));
\echo 'Created idx_m_raw_okbt_kodig_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 23)));
\echo 'Created idx_m_raw_okbt_kodig_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 24)));
\echo 'Created idx_m_raw_okbt_kodig_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodig_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIG', 25)));
\echo 'Created idx_m_raw_okbt_kodig_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 0)));
\echo 'Created idx_m_raw_okbt_kodikys_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 1)));
\echo 'Created idx_m_raw_okbt_kodikys_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 2)));
\echo 'Created idx_m_raw_okbt_kodikys_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 3)));
\echo 'Created idx_m_raw_okbt_kodikys_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 4)));
\echo 'Created idx_m_raw_okbt_kodikys_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 5)));
\echo 'Created idx_m_raw_okbt_kodikys_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 6)));
\echo 'Created idx_m_raw_okbt_kodikys_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 7)));
\echo 'Created idx_m_raw_okbt_kodikys_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 8)));
\echo 'Created idx_m_raw_okbt_kodikys_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 9)));
\echo 'Created idx_m_raw_okbt_kodikys_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 10)));
\echo 'Created idx_m_raw_okbt_kodikys_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 11)));
\echo 'Created idx_m_raw_okbt_kodikys_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 12)));
\echo 'Created idx_m_raw_okbt_kodikys_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 13)));
\echo 'Created idx_m_raw_okbt_kodikys_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 14)));
\echo 'Created idx_m_raw_okbt_kodikys_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 15)));
\echo 'Created idx_m_raw_okbt_kodikys_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 16)));
\echo 'Created idx_m_raw_okbt_kodikys_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 17)));
\echo 'Created idx_m_raw_okbt_kodikys_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 18)));
\echo 'Created idx_m_raw_okbt_kodikys_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 19)));
\echo 'Created idx_m_raw_okbt_kodikys_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 20)));
\echo 'Created idx_m_raw_okbt_kodikys_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 21)));
\echo 'Created idx_m_raw_okbt_kodikys_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 22)));
\echo 'Created idx_m_raw_okbt_kodikys_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 23)));
\echo 'Created idx_m_raw_okbt_kodikys_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 24)));
\echo 'Created idx_m_raw_okbt_kodikys_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodikys_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIKYS', 25)));
\echo 'Created idx_m_raw_okbt_kodikys_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 0)));
\echo 'Created idx_m_raw_okbt_kodiyau05_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 1)));
\echo 'Created idx_m_raw_okbt_kodiyau05_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 2)));
\echo 'Created idx_m_raw_okbt_kodiyau05_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 3)));
\echo 'Created idx_m_raw_okbt_kodiyau05_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 4)));
\echo 'Created idx_m_raw_okbt_kodiyau05_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 5)));
\echo 'Created idx_m_raw_okbt_kodiyau05_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 6)));
\echo 'Created idx_m_raw_okbt_kodiyau05_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 7)));
\echo 'Created idx_m_raw_okbt_kodiyau05_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 8)));
\echo 'Created idx_m_raw_okbt_kodiyau05_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 9)));
\echo 'Created idx_m_raw_okbt_kodiyau05_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 10)));
\echo 'Created idx_m_raw_okbt_kodiyau05_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 11)));
\echo 'Created idx_m_raw_okbt_kodiyau05_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 12)));
\echo 'Created idx_m_raw_okbt_kodiyau05_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 13)));
\echo 'Created idx_m_raw_okbt_kodiyau05_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 14)));
\echo 'Created idx_m_raw_okbt_kodiyau05_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 15)));
\echo 'Created idx_m_raw_okbt_kodiyau05_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 16)));
\echo 'Created idx_m_raw_okbt_kodiyau05_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 17)));
\echo 'Created idx_m_raw_okbt_kodiyau05_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 18)));
\echo 'Created idx_m_raw_okbt_kodiyau05_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 19)));
\echo 'Created idx_m_raw_okbt_kodiyau05_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 20)));
\echo 'Created idx_m_raw_okbt_kodiyau05_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 21)));
\echo 'Created idx_m_raw_okbt_kodiyau05_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 22)));
\echo 'Created idx_m_raw_okbt_kodiyau05_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 23)));
\echo 'Created idx_m_raw_okbt_kodiyau05_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 24)));
\echo 'Created idx_m_raw_okbt_kodiyau05_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau05_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU05', 25)));
\echo 'Created idx_m_raw_okbt_kodiyau05_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 0)));
\echo 'Created idx_m_raw_okbt_kodiyau15_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 1)));
\echo 'Created idx_m_raw_okbt_kodiyau15_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 2)));
\echo 'Created idx_m_raw_okbt_kodiyau15_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 3)));
\echo 'Created idx_m_raw_okbt_kodiyau15_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 4)));
\echo 'Created idx_m_raw_okbt_kodiyau15_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 5)));
\echo 'Created idx_m_raw_okbt_kodiyau15_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 6)));
\echo 'Created idx_m_raw_okbt_kodiyau15_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 7)));
\echo 'Created idx_m_raw_okbt_kodiyau15_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 8)));
\echo 'Created idx_m_raw_okbt_kodiyau15_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 9)));
\echo 'Created idx_m_raw_okbt_kodiyau15_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 10)));
\echo 'Created idx_m_raw_okbt_kodiyau15_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 11)));
\echo 'Created idx_m_raw_okbt_kodiyau15_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 12)));
\echo 'Created idx_m_raw_okbt_kodiyau15_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 13)));
\echo 'Created idx_m_raw_okbt_kodiyau15_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 14)));
\echo 'Created idx_m_raw_okbt_kodiyau15_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 15)));
\echo 'Created idx_m_raw_okbt_kodiyau15_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 16)));
\echo 'Created idx_m_raw_okbt_kodiyau15_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 17)));
\echo 'Created idx_m_raw_okbt_kodiyau15_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 18)));
\echo 'Created idx_m_raw_okbt_kodiyau15_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 19)));
\echo 'Created idx_m_raw_okbt_kodiyau15_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 20)));
\echo 'Created idx_m_raw_okbt_kodiyau15_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 21)));
\echo 'Created idx_m_raw_okbt_kodiyau15_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 22)));
\echo 'Created idx_m_raw_okbt_kodiyau15_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 23)));
\echo 'Created idx_m_raw_okbt_kodiyau15_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 24)));
\echo 'Created idx_m_raw_okbt_kodiyau15_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau15_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU15', 25)));
\echo 'Created idx_m_raw_okbt_kodiyau15_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 0)));
\echo 'Created idx_m_raw_okbt_kodiyau25_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 1)));
\echo 'Created idx_m_raw_okbt_kodiyau25_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 2)));
\echo 'Created idx_m_raw_okbt_kodiyau25_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 3)));
\echo 'Created idx_m_raw_okbt_kodiyau25_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 4)));
\echo 'Created idx_m_raw_okbt_kodiyau25_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 5)));
\echo 'Created idx_m_raw_okbt_kodiyau25_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 6)));
\echo 'Created idx_m_raw_okbt_kodiyau25_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 7)));
\echo 'Created idx_m_raw_okbt_kodiyau25_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 8)));
\echo 'Created idx_m_raw_okbt_kodiyau25_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 9)));
\echo 'Created idx_m_raw_okbt_kodiyau25_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 10)));
\echo 'Created idx_m_raw_okbt_kodiyau25_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 11)));
\echo 'Created idx_m_raw_okbt_kodiyau25_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 12)));
\echo 'Created idx_m_raw_okbt_kodiyau25_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 13)));
\echo 'Created idx_m_raw_okbt_kodiyau25_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 14)));
\echo 'Created idx_m_raw_okbt_kodiyau25_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 15)));
\echo 'Created idx_m_raw_okbt_kodiyau25_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 16)));
\echo 'Created idx_m_raw_okbt_kodiyau25_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 17)));
\echo 'Created idx_m_raw_okbt_kodiyau25_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 18)));
\echo 'Created idx_m_raw_okbt_kodiyau25_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 19)));
\echo 'Created idx_m_raw_okbt_kodiyau25_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 20)));
\echo 'Created idx_m_raw_okbt_kodiyau25_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 21)));
\echo 'Created idx_m_raw_okbt_kodiyau25_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 22)));
\echo 'Created idx_m_raw_okbt_kodiyau25_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 23)));
\echo 'Created idx_m_raw_okbt_kodiyau25_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 24)));
\echo 'Created idx_m_raw_okbt_kodiyau25_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyau25_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYAU25', 25)));
\echo 'Created idx_m_raw_okbt_kodiyau25_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 0)));
\echo 'Created idx_m_raw_okbt_kodiyms_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 1)));
\echo 'Created idx_m_raw_okbt_kodiyms_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 2)));
\echo 'Created idx_m_raw_okbt_kodiyms_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 3)));
\echo 'Created idx_m_raw_okbt_kodiyms_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 4)));
\echo 'Created idx_m_raw_okbt_kodiyms_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 5)));
\echo 'Created idx_m_raw_okbt_kodiyms_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 6)));
\echo 'Created idx_m_raw_okbt_kodiyms_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 7)));
\echo 'Created idx_m_raw_okbt_kodiyms_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 8)));
\echo 'Created idx_m_raw_okbt_kodiyms_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 9)));
\echo 'Created idx_m_raw_okbt_kodiyms_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 10)));
\echo 'Created idx_m_raw_okbt_kodiyms_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 11)));
\echo 'Created idx_m_raw_okbt_kodiyms_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 12)));
\echo 'Created idx_m_raw_okbt_kodiyms_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 13)));
\echo 'Created idx_m_raw_okbt_kodiyms_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 14)));
\echo 'Created idx_m_raw_okbt_kodiyms_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 15)));
\echo 'Created idx_m_raw_okbt_kodiyms_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 16)));
\echo 'Created idx_m_raw_okbt_kodiyms_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 17)));
\echo 'Created idx_m_raw_okbt_kodiyms_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 18)));
\echo 'Created idx_m_raw_okbt_kodiyms_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 19)));
\echo 'Created idx_m_raw_okbt_kodiyms_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 20)));
\echo 'Created idx_m_raw_okbt_kodiyms_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 21)));
\echo 'Created idx_m_raw_okbt_kodiyms_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 22)));
\echo 'Created idx_m_raw_okbt_kodiyms_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 23)));
\echo 'Created idx_m_raw_okbt_kodiyms_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 24)));
\echo 'Created idx_m_raw_okbt_kodiyms_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodiyms_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODIYMS', 25)));
\echo 'Created idx_m_raw_okbt_kodiyms_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 0)));
\echo 'Created idx_m_raw_okbt_kodkg_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 1)));
\echo 'Created idx_m_raw_okbt_kodkg_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 2)));
\echo 'Created idx_m_raw_okbt_kodkg_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 3)));
\echo 'Created idx_m_raw_okbt_kodkg_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 4)));
\echo 'Created idx_m_raw_okbt_kodkg_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 5)));
\echo 'Created idx_m_raw_okbt_kodkg_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 6)));
\echo 'Created idx_m_raw_okbt_kodkg_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 7)));
\echo 'Created idx_m_raw_okbt_kodkg_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 8)));
\echo 'Created idx_m_raw_okbt_kodkg_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 9)));
\echo 'Created idx_m_raw_okbt_kodkg_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 10)));
\echo 'Created idx_m_raw_okbt_kodkg_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 11)));
\echo 'Created idx_m_raw_okbt_kodkg_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 12)));
\echo 'Created idx_m_raw_okbt_kodkg_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 13)));
\echo 'Created idx_m_raw_okbt_kodkg_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 14)));
\echo 'Created idx_m_raw_okbt_kodkg_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 15)));
\echo 'Created idx_m_raw_okbt_kodkg_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 16)));
\echo 'Created idx_m_raw_okbt_kodkg_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 17)));
\echo 'Created idx_m_raw_okbt_kodkg_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 18)));
\echo 'Created idx_m_raw_okbt_kodkg_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 19)));
\echo 'Created idx_m_raw_okbt_kodkg_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 20)));
\echo 'Created idx_m_raw_okbt_kodkg_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 21)));
\echo 'Created idx_m_raw_okbt_kodkg_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 22)));
\echo 'Created idx_m_raw_okbt_kodkg_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 23)));
\echo 'Created idx_m_raw_okbt_kodkg_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 24)));
\echo 'Created idx_m_raw_okbt_kodkg_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodkg_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODKG', 25)));
\echo 'Created idx_m_raw_okbt_kodkg_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 0)));
\echo 'Created idx_m_raw_okbt_kodmsau15_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 1)));
\echo 'Created idx_m_raw_okbt_kodmsau15_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 2)));
\echo 'Created idx_m_raw_okbt_kodmsau15_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 3)));
\echo 'Created idx_m_raw_okbt_kodmsau15_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 4)));
\echo 'Created idx_m_raw_okbt_kodmsau15_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 5)));
\echo 'Created idx_m_raw_okbt_kodmsau15_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 6)));
\echo 'Created idx_m_raw_okbt_kodmsau15_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 7)));
\echo 'Created idx_m_raw_okbt_kodmsau15_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 8)));
\echo 'Created idx_m_raw_okbt_kodmsau15_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 9)));
\echo 'Created idx_m_raw_okbt_kodmsau15_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 10)));
\echo 'Created idx_m_raw_okbt_kodmsau15_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 11)));
\echo 'Created idx_m_raw_okbt_kodmsau15_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 12)));
\echo 'Created idx_m_raw_okbt_kodmsau15_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 13)));
\echo 'Created idx_m_raw_okbt_kodmsau15_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 14)));
\echo 'Created idx_m_raw_okbt_kodmsau15_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 15)));
\echo 'Created idx_m_raw_okbt_kodmsau15_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 16)));
\echo 'Created idx_m_raw_okbt_kodmsau15_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 17)));
\echo 'Created idx_m_raw_okbt_kodmsau15_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 18)));
\echo 'Created idx_m_raw_okbt_kodmsau15_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 19)));
\echo 'Created idx_m_raw_okbt_kodmsau15_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 20)));
\echo 'Created idx_m_raw_okbt_kodmsau15_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 21)));
\echo 'Created idx_m_raw_okbt_kodmsau15_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 22)));
\echo 'Created idx_m_raw_okbt_kodmsau15_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 23)));
\echo 'Created idx_m_raw_okbt_kodmsau15_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 24)));
\echo 'Created idx_m_raw_okbt_kodmsau15_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau15_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU15', 25)));
\echo 'Created idx_m_raw_okbt_kodmsau15_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 0)));
\echo 'Created idx_m_raw_okbt_kodmsau25_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 1)));
\echo 'Created idx_m_raw_okbt_kodmsau25_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 2)));
\echo 'Created idx_m_raw_okbt_kodmsau25_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 3)));
\echo 'Created idx_m_raw_okbt_kodmsau25_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 4)));
\echo 'Created idx_m_raw_okbt_kodmsau25_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 5)));
\echo 'Created idx_m_raw_okbt_kodmsau25_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 6)));
\echo 'Created idx_m_raw_okbt_kodmsau25_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 7)));
\echo 'Created idx_m_raw_okbt_kodmsau25_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 8)));
\echo 'Created idx_m_raw_okbt_kodmsau25_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 9)));
\echo 'Created idx_m_raw_okbt_kodmsau25_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 10)));
\echo 'Created idx_m_raw_okbt_kodmsau25_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 11)));
\echo 'Created idx_m_raw_okbt_kodmsau25_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 12)));
\echo 'Created idx_m_raw_okbt_kodmsau25_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 13)));
\echo 'Created idx_m_raw_okbt_kodmsau25_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 14)));
\echo 'Created idx_m_raw_okbt_kodmsau25_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 15)));
\echo 'Created idx_m_raw_okbt_kodmsau25_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 16)));
\echo 'Created idx_m_raw_okbt_kodmsau25_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 17)));
\echo 'Created idx_m_raw_okbt_kodmsau25_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 18)));
\echo 'Created idx_m_raw_okbt_kodmsau25_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 19)));
\echo 'Created idx_m_raw_okbt_kodmsau25_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 20)));
\echo 'Created idx_m_raw_okbt_kodmsau25_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 21)));
\echo 'Created idx_m_raw_okbt_kodmsau25_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 22)));
\echo 'Created idx_m_raw_okbt_kodmsau25_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 23)));
\echo 'Created idx_m_raw_okbt_kodmsau25_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 24)));
\echo 'Created idx_m_raw_okbt_kodmsau25_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau25_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU25', 25)));
\echo 'Created idx_m_raw_okbt_kodmsau25_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 0)));
\echo 'Created idx_m_raw_okbt_kodmsau35_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 1)));
\echo 'Created idx_m_raw_okbt_kodmsau35_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 2)));
\echo 'Created idx_m_raw_okbt_kodmsau35_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 3)));
\echo 'Created idx_m_raw_okbt_kodmsau35_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 4)));
\echo 'Created idx_m_raw_okbt_kodmsau35_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 5)));
\echo 'Created idx_m_raw_okbt_kodmsau35_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 6)));
\echo 'Created idx_m_raw_okbt_kodmsau35_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 7)));
\echo 'Created idx_m_raw_okbt_kodmsau35_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 8)));
\echo 'Created idx_m_raw_okbt_kodmsau35_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 9)));
\echo 'Created idx_m_raw_okbt_kodmsau35_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 10)));
\echo 'Created idx_m_raw_okbt_kodmsau35_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 11)));
\echo 'Created idx_m_raw_okbt_kodmsau35_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 12)));
\echo 'Created idx_m_raw_okbt_kodmsau35_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 13)));
\echo 'Created idx_m_raw_okbt_kodmsau35_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 14)));
\echo 'Created idx_m_raw_okbt_kodmsau35_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 15)));
\echo 'Created idx_m_raw_okbt_kodmsau35_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 16)));
\echo 'Created idx_m_raw_okbt_kodmsau35_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 17)));
\echo 'Created idx_m_raw_okbt_kodmsau35_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 18)));
\echo 'Created idx_m_raw_okbt_kodmsau35_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 19)));
\echo 'Created idx_m_raw_okbt_kodmsau35_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 20)));
\echo 'Created idx_m_raw_okbt_kodmsau35_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 21)));
\echo 'Created idx_m_raw_okbt_kodmsau35_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 22)));
\echo 'Created idx_m_raw_okbt_kodmsau35_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 23)));
\echo 'Created idx_m_raw_okbt_kodmsau35_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 24)));
\echo 'Created idx_m_raw_okbt_kodmsau35_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau35_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU35', 25)));
\echo 'Created idx_m_raw_okbt_kodmsau35_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 0)));
\echo 'Created idx_m_raw_okbt_kodmsau45_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 1)));
\echo 'Created idx_m_raw_okbt_kodmsau45_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 2)));
\echo 'Created idx_m_raw_okbt_kodmsau45_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 3)));
\echo 'Created idx_m_raw_okbt_kodmsau45_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 4)));
\echo 'Created idx_m_raw_okbt_kodmsau45_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 5)));
\echo 'Created idx_m_raw_okbt_kodmsau45_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 6)));
\echo 'Created idx_m_raw_okbt_kodmsau45_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 7)));
\echo 'Created idx_m_raw_okbt_kodmsau45_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 8)));
\echo 'Created idx_m_raw_okbt_kodmsau45_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 9)));
\echo 'Created idx_m_raw_okbt_kodmsau45_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 10)));
\echo 'Created idx_m_raw_okbt_kodmsau45_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 11)));
\echo 'Created idx_m_raw_okbt_kodmsau45_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 12)));
\echo 'Created idx_m_raw_okbt_kodmsau45_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 13)));
\echo 'Created idx_m_raw_okbt_kodmsau45_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 14)));
\echo 'Created idx_m_raw_okbt_kodmsau45_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 15)));
\echo 'Created idx_m_raw_okbt_kodmsau45_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 16)));
\echo 'Created idx_m_raw_okbt_kodmsau45_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 17)));
\echo 'Created idx_m_raw_okbt_kodmsau45_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 18)));
\echo 'Created idx_m_raw_okbt_kodmsau45_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 19)));
\echo 'Created idx_m_raw_okbt_kodmsau45_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 20)));
\echo 'Created idx_m_raw_okbt_kodmsau45_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 21)));
\echo 'Created idx_m_raw_okbt_kodmsau45_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 22)));
\echo 'Created idx_m_raw_okbt_kodmsau45_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 23)));
\echo 'Created idx_m_raw_okbt_kodmsau45_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 24)));
\echo 'Created idx_m_raw_okbt_kodmsau45_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodmsau45_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODMSAU45', 25)));
\echo 'Created idx_m_raw_okbt_kodmsau45_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 0)));
\echo 'Created idx_m_raw_okbt_kodsk_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 1)));
\echo 'Created idx_m_raw_okbt_kodsk_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 2)));
\echo 'Created idx_m_raw_okbt_kodsk_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 3)));
\echo 'Created idx_m_raw_okbt_kodsk_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 4)));
\echo 'Created idx_m_raw_okbt_kodsk_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 5)));
\echo 'Created idx_m_raw_okbt_kodsk_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 6)));
\echo 'Created idx_m_raw_okbt_kodsk_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 7)));
\echo 'Created idx_m_raw_okbt_kodsk_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 8)));
\echo 'Created idx_m_raw_okbt_kodsk_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 9)));
\echo 'Created idx_m_raw_okbt_kodsk_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 10)));
\echo 'Created idx_m_raw_okbt_kodsk_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 11)));
\echo 'Created idx_m_raw_okbt_kodsk_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 12)));
\echo 'Created idx_m_raw_okbt_kodsk_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 13)));
\echo 'Created idx_m_raw_okbt_kodsk_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 14)));
\echo 'Created idx_m_raw_okbt_kodsk_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 15)));
\echo 'Created idx_m_raw_okbt_kodsk_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 16)));
\echo 'Created idx_m_raw_okbt_kodsk_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 17)));
\echo 'Created idx_m_raw_okbt_kodsk_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 18)));
\echo 'Created idx_m_raw_okbt_kodsk_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 19)));
\echo 'Created idx_m_raw_okbt_kodsk_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 20)));
\echo 'Created idx_m_raw_okbt_kodsk_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 21)));
\echo 'Created idx_m_raw_okbt_kodsk_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 22)));
\echo 'Created idx_m_raw_okbt_kodsk_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 23)));
\echo 'Created idx_m_raw_okbt_kodsk_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 24)));
\echo 'Created idx_m_raw_okbt_kodsk_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodsk_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODSK', 25)));
\echo 'Created idx_m_raw_okbt_kodsk_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 0)));
\echo 'Created idx_m_raw_okbt_kodtc_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 1)));
\echo 'Created idx_m_raw_okbt_kodtc_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 2)));
\echo 'Created idx_m_raw_okbt_kodtc_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 3)));
\echo 'Created idx_m_raw_okbt_kodtc_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 4)));
\echo 'Created idx_m_raw_okbt_kodtc_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 5)));
\echo 'Created idx_m_raw_okbt_kodtc_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 6)));
\echo 'Created idx_m_raw_okbt_kodtc_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 7)));
\echo 'Created idx_m_raw_okbt_kodtc_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 8)));
\echo 'Created idx_m_raw_okbt_kodtc_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 9)));
\echo 'Created idx_m_raw_okbt_kodtc_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 10)));
\echo 'Created idx_m_raw_okbt_kodtc_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 11)));
\echo 'Created idx_m_raw_okbt_kodtc_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 12)));
\echo 'Created idx_m_raw_okbt_kodtc_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 13)));
\echo 'Created idx_m_raw_okbt_kodtc_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 14)));
\echo 'Created idx_m_raw_okbt_kodtc_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 15)));
\echo 'Created idx_m_raw_okbt_kodtc_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 16)));
\echo 'Created idx_m_raw_okbt_kodtc_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 17)));
\echo 'Created idx_m_raw_okbt_kodtc_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 18)));
\echo 'Created idx_m_raw_okbt_kodtc_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 19)));
\echo 'Created idx_m_raw_okbt_kodtc_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 20)));
\echo 'Created idx_m_raw_okbt_kodtc_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 21)));
\echo 'Created idx_m_raw_okbt_kodtc_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 22)));
\echo 'Created idx_m_raw_okbt_kodtc_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 23)));
\echo 'Created idx_m_raw_okbt_kodtc_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 24)));
\echo 'Created idx_m_raw_okbt_kodtc_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtc_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTC', 25)));
\echo 'Created idx_m_raw_okbt_kodtc_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 0)));
\echo 'Created idx_m_raw_okbt_kodtg_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 1)));
\echo 'Created idx_m_raw_okbt_kodtg_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 2)));
\echo 'Created idx_m_raw_okbt_kodtg_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 3)));
\echo 'Created idx_m_raw_okbt_kodtg_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 4)));
\echo 'Created idx_m_raw_okbt_kodtg_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 5)));
\echo 'Created idx_m_raw_okbt_kodtg_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 6)));
\echo 'Created idx_m_raw_okbt_kodtg_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 7)));
\echo 'Created idx_m_raw_okbt_kodtg_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 8)));
\echo 'Created idx_m_raw_okbt_kodtg_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 9)));
\echo 'Created idx_m_raw_okbt_kodtg_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 10)));
\echo 'Created idx_m_raw_okbt_kodtg_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 11)));
\echo 'Created idx_m_raw_okbt_kodtg_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 12)));
\echo 'Created idx_m_raw_okbt_kodtg_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 13)));
\echo 'Created idx_m_raw_okbt_kodtg_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 14)));
\echo 'Created idx_m_raw_okbt_kodtg_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 15)));
\echo 'Created idx_m_raw_okbt_kodtg_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 16)));
\echo 'Created idx_m_raw_okbt_kodtg_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 17)));
\echo 'Created idx_m_raw_okbt_kodtg_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 18)));
\echo 'Created idx_m_raw_okbt_kodtg_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 19)));
\echo 'Created idx_m_raw_okbt_kodtg_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 20)));
\echo 'Created idx_m_raw_okbt_kodtg_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 21)));
\echo 'Created idx_m_raw_okbt_kodtg_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 22)));
\echo 'Created idx_m_raw_okbt_kodtg_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 23)));
\echo 'Created idx_m_raw_okbt_kodtg_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 24)));
\echo 'Created idx_m_raw_okbt_kodtg_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodtg_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODTG', 25)));
\echo 'Created idx_m_raw_okbt_kodtg_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 0)));
\echo 'Created idx_m_raw_okbt_koddau05_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 1)));
\echo 'Created idx_m_raw_okbt_koddau05_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 2)));
\echo 'Created idx_m_raw_okbt_koddau05_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 3)));
\echo 'Created idx_m_raw_okbt_koddau05_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 4)));
\echo 'Created idx_m_raw_okbt_koddau05_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 5)));
\echo 'Created idx_m_raw_okbt_koddau05_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 6)));
\echo 'Created idx_m_raw_okbt_koddau05_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 7)));
\echo 'Created idx_m_raw_okbt_koddau05_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 8)));
\echo 'Created idx_m_raw_okbt_koddau05_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 9)));
\echo 'Created idx_m_raw_okbt_koddau05_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 10)));
\echo 'Created idx_m_raw_okbt_koddau05_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 11)));
\echo 'Created idx_m_raw_okbt_koddau05_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 12)));
\echo 'Created idx_m_raw_okbt_koddau05_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 13)));
\echo 'Created idx_m_raw_okbt_koddau05_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 14)));
\echo 'Created idx_m_raw_okbt_koddau05_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 15)));
\echo 'Created idx_m_raw_okbt_koddau05_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 16)));
\echo 'Created idx_m_raw_okbt_koddau05_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 17)));
\echo 'Created idx_m_raw_okbt_koddau05_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 18)));
\echo 'Created idx_m_raw_okbt_koddau05_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 19)));
\echo 'Created idx_m_raw_okbt_koddau05_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 20)));
\echo 'Created idx_m_raw_okbt_koddau05_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 21)));
\echo 'Created idx_m_raw_okbt_koddau05_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 22)));
\echo 'Created idx_m_raw_okbt_koddau05_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 23)));
\echo 'Created idx_m_raw_okbt_koddau05_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 24)));
\echo 'Created idx_m_raw_okbt_koddau05_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau05_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU05', 25)));
\echo 'Created idx_m_raw_okbt_koddau05_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 0)));
\echo 'Created idx_m_raw_okbt_koddau15_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 1)));
\echo 'Created idx_m_raw_okbt_koddau15_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 2)));
\echo 'Created idx_m_raw_okbt_koddau15_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 3)));
\echo 'Created idx_m_raw_okbt_koddau15_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 4)));
\echo 'Created idx_m_raw_okbt_koddau15_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 5)));
\echo 'Created idx_m_raw_okbt_koddau15_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 6)));
\echo 'Created idx_m_raw_okbt_koddau15_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 7)));
\echo 'Created idx_m_raw_okbt_koddau15_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 8)));
\echo 'Created idx_m_raw_okbt_koddau15_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 9)));
\echo 'Created idx_m_raw_okbt_koddau15_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 10)));
\echo 'Created idx_m_raw_okbt_koddau15_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 11)));
\echo 'Created idx_m_raw_okbt_koddau15_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 12)));
\echo 'Created idx_m_raw_okbt_koddau15_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 13)));
\echo 'Created idx_m_raw_okbt_koddau15_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 14)));
\echo 'Created idx_m_raw_okbt_koddau15_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 15)));
\echo 'Created idx_m_raw_okbt_koddau15_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 16)));
\echo 'Created idx_m_raw_okbt_koddau15_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 17)));
\echo 'Created idx_m_raw_okbt_koddau15_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 18)));
\echo 'Created idx_m_raw_okbt_koddau15_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 19)));
\echo 'Created idx_m_raw_okbt_koddau15_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 20)));
\echo 'Created idx_m_raw_okbt_koddau15_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 21)));
\echo 'Created idx_m_raw_okbt_koddau15_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 22)));
\echo 'Created idx_m_raw_okbt_koddau15_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 23)));
\echo 'Created idx_m_raw_okbt_koddau15_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 24)));
\echo 'Created idx_m_raw_okbt_koddau15_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau15_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU15', 25)));
\echo 'Created idx_m_raw_okbt_koddau15_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 0)));
\echo 'Created idx_m_raw_okbt_koddau25_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 1)));
\echo 'Created idx_m_raw_okbt_koddau25_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 2)));
\echo 'Created idx_m_raw_okbt_koddau25_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 3)));
\echo 'Created idx_m_raw_okbt_koddau25_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 4)));
\echo 'Created idx_m_raw_okbt_koddau25_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 5)));
\echo 'Created idx_m_raw_okbt_koddau25_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 6)));
\echo 'Created idx_m_raw_okbt_koddau25_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 7)));
\echo 'Created idx_m_raw_okbt_koddau25_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 8)));
\echo 'Created idx_m_raw_okbt_koddau25_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 9)));
\echo 'Created idx_m_raw_okbt_koddau25_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 10)));
\echo 'Created idx_m_raw_okbt_koddau25_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 11)));
\echo 'Created idx_m_raw_okbt_koddau25_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 12)));
\echo 'Created idx_m_raw_okbt_koddau25_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 13)));
\echo 'Created idx_m_raw_okbt_koddau25_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 14)));
\echo 'Created idx_m_raw_okbt_koddau25_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 15)));
\echo 'Created idx_m_raw_okbt_koddau25_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 16)));
\echo 'Created idx_m_raw_okbt_koddau25_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 17)));
\echo 'Created idx_m_raw_okbt_koddau25_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 18)));
\echo 'Created idx_m_raw_okbt_koddau25_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 19)));
\echo 'Created idx_m_raw_okbt_koddau25_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 20)));
\echo 'Created idx_m_raw_okbt_koddau25_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 21)));
\echo 'Created idx_m_raw_okbt_koddau25_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 22)));
\echo 'Created idx_m_raw_okbt_koddau25_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 23)));
\echo 'Created idx_m_raw_okbt_koddau25_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 24)));
\echo 'Created idx_m_raw_okbt_koddau25_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau25_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU25', 25)));
\echo 'Created idx_m_raw_okbt_koddau25_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 0)));
\echo 'Created idx_m_raw_okbt_koddau35_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 1)));
\echo 'Created idx_m_raw_okbt_koddau35_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 2)));
\echo 'Created idx_m_raw_okbt_koddau35_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 3)));
\echo 'Created idx_m_raw_okbt_koddau35_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 4)));
\echo 'Created idx_m_raw_okbt_koddau35_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 5)));
\echo 'Created idx_m_raw_okbt_koddau35_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 6)));
\echo 'Created idx_m_raw_okbt_koddau35_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 7)));
\echo 'Created idx_m_raw_okbt_koddau35_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 8)));
\echo 'Created idx_m_raw_okbt_koddau35_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 9)));
\echo 'Created idx_m_raw_okbt_koddau35_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 10)));
\echo 'Created idx_m_raw_okbt_koddau35_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 11)));
\echo 'Created idx_m_raw_okbt_koddau35_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 12)));
\echo 'Created idx_m_raw_okbt_koddau35_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 13)));
\echo 'Created idx_m_raw_okbt_koddau35_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 14)));
\echo 'Created idx_m_raw_okbt_koddau35_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 15)));
\echo 'Created idx_m_raw_okbt_koddau35_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 16)));
\echo 'Created idx_m_raw_okbt_koddau35_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 17)));
\echo 'Created idx_m_raw_okbt_koddau35_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 18)));
\echo 'Created idx_m_raw_okbt_koddau35_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 19)));
\echo 'Created idx_m_raw_okbt_koddau35_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 20)));
\echo 'Created idx_m_raw_okbt_koddau35_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 21)));
\echo 'Created idx_m_raw_okbt_koddau35_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 22)));
\echo 'Created idx_m_raw_okbt_koddau35_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 23)));
\echo 'Created idx_m_raw_okbt_koddau35_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 24)));
\echo 'Created idx_m_raw_okbt_koddau35_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddau35_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDAU35', 25)));
\echo 'Created idx_m_raw_okbt_koddau35_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 0)));
\echo 'Created idx_m_raw_okbt_koddcgoy_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 1)));
\echo 'Created idx_m_raw_okbt_koddcgoy_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 2)));
\echo 'Created idx_m_raw_okbt_koddcgoy_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 3)));
\echo 'Created idx_m_raw_okbt_koddcgoy_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 4)));
\echo 'Created idx_m_raw_okbt_koddcgoy_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 5)));
\echo 'Created idx_m_raw_okbt_koddcgoy_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 6)));
\echo 'Created idx_m_raw_okbt_koddcgoy_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 7)));
\echo 'Created idx_m_raw_okbt_koddcgoy_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 8)));
\echo 'Created idx_m_raw_okbt_koddcgoy_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 9)));
\echo 'Created idx_m_raw_okbt_koddcgoy_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 10)));
\echo 'Created idx_m_raw_okbt_koddcgoy_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 11)));
\echo 'Created idx_m_raw_okbt_koddcgoy_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 12)));
\echo 'Created idx_m_raw_okbt_koddcgoy_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 13)));
\echo 'Created idx_m_raw_okbt_koddcgoy_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 14)));
\echo 'Created idx_m_raw_okbt_koddcgoy_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 15)));
\echo 'Created idx_m_raw_okbt_koddcgoy_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 16)));
\echo 'Created idx_m_raw_okbt_koddcgoy_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 17)));
\echo 'Created idx_m_raw_okbt_koddcgoy_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 18)));
\echo 'Created idx_m_raw_okbt_koddcgoy_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 19)));
\echo 'Created idx_m_raw_okbt_koddcgoy_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 20)));
\echo 'Created idx_m_raw_okbt_koddcgoy_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 21)));
\echo 'Created idx_m_raw_okbt_koddcgoy_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 22)));
\echo 'Created idx_m_raw_okbt_koddcgoy_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 23)));
\echo 'Created idx_m_raw_okbt_koddcgoy_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 24)));
\echo 'Created idx_m_raw_okbt_koddcgoy_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_koddcgoy_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODDCGOY', 25)));
\echo 'Created idx_m_raw_okbt_koddcgoy_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 0)));
\echo 'Created idx_m_raw_okbt_kodeau05_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 1)));
\echo 'Created idx_m_raw_okbt_kodeau05_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 2)));
\echo 'Created idx_m_raw_okbt_kodeau05_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 3)));
\echo 'Created idx_m_raw_okbt_kodeau05_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 4)));
\echo 'Created idx_m_raw_okbt_kodeau05_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 5)));
\echo 'Created idx_m_raw_okbt_kodeau05_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 6)));
\echo 'Created idx_m_raw_okbt_kodeau05_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 7)));
\echo 'Created idx_m_raw_okbt_kodeau05_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 8)));
\echo 'Created idx_m_raw_okbt_kodeau05_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 9)));
\echo 'Created idx_m_raw_okbt_kodeau05_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 10)));
\echo 'Created idx_m_raw_okbt_kodeau05_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 11)));
\echo 'Created idx_m_raw_okbt_kodeau05_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 12)));
\echo 'Created idx_m_raw_okbt_kodeau05_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 13)));
\echo 'Created idx_m_raw_okbt_kodeau05_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 14)));
\echo 'Created idx_m_raw_okbt_kodeau05_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 15)));
\echo 'Created idx_m_raw_okbt_kodeau05_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 16)));
\echo 'Created idx_m_raw_okbt_kodeau05_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 17)));
\echo 'Created idx_m_raw_okbt_kodeau05_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 18)));
\echo 'Created idx_m_raw_okbt_kodeau05_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 19)));
\echo 'Created idx_m_raw_okbt_kodeau05_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 20)));
\echo 'Created idx_m_raw_okbt_kodeau05_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 21)));
\echo 'Created idx_m_raw_okbt_kodeau05_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 22)));
\echo 'Created idx_m_raw_okbt_kodeau05_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 23)));
\echo 'Created idx_m_raw_okbt_kodeau05_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 24)));
\echo 'Created idx_m_raw_okbt_kodeau05_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau05_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU05', 25)));
\echo 'Created idx_m_raw_okbt_kodeau05_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 0)));
\echo 'Created idx_m_raw_okbt_kodeau15_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 1)));
\echo 'Created idx_m_raw_okbt_kodeau15_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 2)));
\echo 'Created idx_m_raw_okbt_kodeau15_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 3)));
\echo 'Created idx_m_raw_okbt_kodeau15_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 4)));
\echo 'Created idx_m_raw_okbt_kodeau15_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 5)));
\echo 'Created idx_m_raw_okbt_kodeau15_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 6)));
\echo 'Created idx_m_raw_okbt_kodeau15_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 7)));
\echo 'Created idx_m_raw_okbt_kodeau15_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 8)));
\echo 'Created idx_m_raw_okbt_kodeau15_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 9)));
\echo 'Created idx_m_raw_okbt_kodeau15_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 10)));
\echo 'Created idx_m_raw_okbt_kodeau15_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 11)));
\echo 'Created idx_m_raw_okbt_kodeau15_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 12)));
\echo 'Created idx_m_raw_okbt_kodeau15_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 13)));
\echo 'Created idx_m_raw_okbt_kodeau15_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 14)));
\echo 'Created idx_m_raw_okbt_kodeau15_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 15)));
\echo 'Created idx_m_raw_okbt_kodeau15_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 16)));
\echo 'Created idx_m_raw_okbt_kodeau15_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 17)));
\echo 'Created idx_m_raw_okbt_kodeau15_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 18)));
\echo 'Created idx_m_raw_okbt_kodeau15_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 19)));
\echo 'Created idx_m_raw_okbt_kodeau15_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 20)));
\echo 'Created idx_m_raw_okbt_kodeau15_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 21)));
\echo 'Created idx_m_raw_okbt_kodeau15_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 22)));
\echo 'Created idx_m_raw_okbt_kodeau15_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 23)));
\echo 'Created idx_m_raw_okbt_kodeau15_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 24)));
\echo 'Created idx_m_raw_okbt_kodeau15_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau15_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU15', 25)));
\echo 'Created idx_m_raw_okbt_kodeau15_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 0)));
\echo 'Created idx_m_raw_okbt_kodeau25_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 1)));
\echo 'Created idx_m_raw_okbt_kodeau25_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 2)));
\echo 'Created idx_m_raw_okbt_kodeau25_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 3)));
\echo 'Created idx_m_raw_okbt_kodeau25_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 4)));
\echo 'Created idx_m_raw_okbt_kodeau25_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 5)));
\echo 'Created idx_m_raw_okbt_kodeau25_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 6)));
\echo 'Created idx_m_raw_okbt_kodeau25_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 7)));
\echo 'Created idx_m_raw_okbt_kodeau25_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 8)));
\echo 'Created idx_m_raw_okbt_kodeau25_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 9)));
\echo 'Created idx_m_raw_okbt_kodeau25_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 10)));
\echo 'Created idx_m_raw_okbt_kodeau25_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 11)));
\echo 'Created idx_m_raw_okbt_kodeau25_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 12)));
\echo 'Created idx_m_raw_okbt_kodeau25_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 13)));
\echo 'Created idx_m_raw_okbt_kodeau25_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 14)));
\echo 'Created idx_m_raw_okbt_kodeau25_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 15)));
\echo 'Created idx_m_raw_okbt_kodeau25_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 16)));
\echo 'Created idx_m_raw_okbt_kodeau25_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 17)));
\echo 'Created idx_m_raw_okbt_kodeau25_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 18)));
\echo 'Created idx_m_raw_okbt_kodeau25_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 19)));
\echo 'Created idx_m_raw_okbt_kodeau25_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 20)));
\echo 'Created idx_m_raw_okbt_kodeau25_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 21)));
\echo 'Created idx_m_raw_okbt_kodeau25_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 22)));
\echo 'Created idx_m_raw_okbt_kodeau25_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 23)));
\echo 'Created idx_m_raw_okbt_kodeau25_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 24)));
\echo 'Created idx_m_raw_okbt_kodeau25_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau25_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU25', 25)));
\echo 'Created idx_m_raw_okbt_kodeau25_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 0)));
\echo 'Created idx_m_raw_okbt_kodeau35_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 1)));
\echo 'Created idx_m_raw_okbt_kodeau35_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 2)));
\echo 'Created idx_m_raw_okbt_kodeau35_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 3)));
\echo 'Created idx_m_raw_okbt_kodeau35_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 4)));
\echo 'Created idx_m_raw_okbt_kodeau35_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 5)));
\echo 'Created idx_m_raw_okbt_kodeau35_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 6)));
\echo 'Created idx_m_raw_okbt_kodeau35_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 7)));
\echo 'Created idx_m_raw_okbt_kodeau35_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 8)));
\echo 'Created idx_m_raw_okbt_kodeau35_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 9)));
\echo 'Created idx_m_raw_okbt_kodeau35_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 10)));
\echo 'Created idx_m_raw_okbt_kodeau35_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 11)));
\echo 'Created idx_m_raw_okbt_kodeau35_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 12)));
\echo 'Created idx_m_raw_okbt_kodeau35_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 13)));
\echo 'Created idx_m_raw_okbt_kodeau35_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 14)));
\echo 'Created idx_m_raw_okbt_kodeau35_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 15)));
\echo 'Created idx_m_raw_okbt_kodeau35_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 16)));
\echo 'Created idx_m_raw_okbt_kodeau35_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 17)));
\echo 'Created idx_m_raw_okbt_kodeau35_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 18)));
\echo 'Created idx_m_raw_okbt_kodeau35_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 19)));
\echo 'Created idx_m_raw_okbt_kodeau35_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 20)));
\echo 'Created idx_m_raw_okbt_kodeau35_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 21)));
\echo 'Created idx_m_raw_okbt_kodeau35_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 22)));
\echo 'Created idx_m_raw_okbt_kodeau35_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 23)));
\echo 'Created idx_m_raw_okbt_kodeau35_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 24)));
\echo 'Created idx_m_raw_okbt_kodeau35_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodeau35_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODEAU35', 25)));
\echo 'Created idx_m_raw_okbt_kodeau35_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 0)));
\echo 'Created idx_m_raw_okbt_kodhms11_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 1)));
\echo 'Created idx_m_raw_okbt_kodhms11_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 2)));
\echo 'Created idx_m_raw_okbt_kodhms11_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 3)));
\echo 'Created idx_m_raw_okbt_kodhms11_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 4)));
\echo 'Created idx_m_raw_okbt_kodhms11_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 5)));
\echo 'Created idx_m_raw_okbt_kodhms11_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 6)));
\echo 'Created idx_m_raw_okbt_kodhms11_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 7)));
\echo 'Created idx_m_raw_okbt_kodhms11_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 8)));
\echo 'Created idx_m_raw_okbt_kodhms11_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 9)));
\echo 'Created idx_m_raw_okbt_kodhms11_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 10)));
\echo 'Created idx_m_raw_okbt_kodhms11_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 11)));
\echo 'Created idx_m_raw_okbt_kodhms11_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 12)));
\echo 'Created idx_m_raw_okbt_kodhms11_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 13)));
\echo 'Created idx_m_raw_okbt_kodhms11_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 14)));
\echo 'Created idx_m_raw_okbt_kodhms11_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 15)));
\echo 'Created idx_m_raw_okbt_kodhms11_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 16)));
\echo 'Created idx_m_raw_okbt_kodhms11_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 17)));
\echo 'Created idx_m_raw_okbt_kodhms11_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 18)));
\echo 'Created idx_m_raw_okbt_kodhms11_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 19)));
\echo 'Created idx_m_raw_okbt_kodhms11_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 20)));
\echo 'Created idx_m_raw_okbt_kodhms11_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 21)));
\echo 'Created idx_m_raw_okbt_kodhms11_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 22)));
\echo 'Created idx_m_raw_okbt_kodhms11_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 23)));
\echo 'Created idx_m_raw_okbt_kodhms11_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 24)));
\echo 'Created idx_m_raw_okbt_kodhms11_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms11_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS11', 25)));
\echo 'Created idx_m_raw_okbt_kodhms11_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 0)));
\echo 'Created idx_m_raw_okbt_kodhms12_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 1)));
\echo 'Created idx_m_raw_okbt_kodhms12_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 2)));
\echo 'Created idx_m_raw_okbt_kodhms12_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 3)));
\echo 'Created idx_m_raw_okbt_kodhms12_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 4)));
\echo 'Created idx_m_raw_okbt_kodhms12_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 5)));
\echo 'Created idx_m_raw_okbt_kodhms12_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 6)));
\echo 'Created idx_m_raw_okbt_kodhms12_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 7)));
\echo 'Created idx_m_raw_okbt_kodhms12_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 8)));
\echo 'Created idx_m_raw_okbt_kodhms12_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 9)));
\echo 'Created idx_m_raw_okbt_kodhms12_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 10)));
\echo 'Created idx_m_raw_okbt_kodhms12_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 11)));
\echo 'Created idx_m_raw_okbt_kodhms12_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 12)));
\echo 'Created idx_m_raw_okbt_kodhms12_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 13)));
\echo 'Created idx_m_raw_okbt_kodhms12_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 14)));
\echo 'Created idx_m_raw_okbt_kodhms12_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 15)));
\echo 'Created idx_m_raw_okbt_kodhms12_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 16)));
\echo 'Created idx_m_raw_okbt_kodhms12_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 17)));
\echo 'Created idx_m_raw_okbt_kodhms12_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 18)));
\echo 'Created idx_m_raw_okbt_kodhms12_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 19)));
\echo 'Created idx_m_raw_okbt_kodhms12_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 20)));
\echo 'Created idx_m_raw_okbt_kodhms12_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 21)));
\echo 'Created idx_m_raw_okbt_kodhms12_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 22)));
\echo 'Created idx_m_raw_okbt_kodhms12_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 23)));
\echo 'Created idx_m_raw_okbt_kodhms12_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 24)));
\echo 'Created idx_m_raw_okbt_kodhms12_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms12_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS12', 25)));
\echo 'Created idx_m_raw_okbt_kodhms12_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 0)));
\echo 'Created idx_m_raw_okbt_kodhms21_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 1)));
\echo 'Created idx_m_raw_okbt_kodhms21_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 2)));
\echo 'Created idx_m_raw_okbt_kodhms21_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 3)));
\echo 'Created idx_m_raw_okbt_kodhms21_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 4)));
\echo 'Created idx_m_raw_okbt_kodhms21_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 5)));
\echo 'Created idx_m_raw_okbt_kodhms21_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 6)));
\echo 'Created idx_m_raw_okbt_kodhms21_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 7)));
\echo 'Created idx_m_raw_okbt_kodhms21_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 8)));
\echo 'Created idx_m_raw_okbt_kodhms21_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 9)));
\echo 'Created idx_m_raw_okbt_kodhms21_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 10)));
\echo 'Created idx_m_raw_okbt_kodhms21_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 11)));
\echo 'Created idx_m_raw_okbt_kodhms21_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 12)));
\echo 'Created idx_m_raw_okbt_kodhms21_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 13)));
\echo 'Created idx_m_raw_okbt_kodhms21_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 14)));
\echo 'Created idx_m_raw_okbt_kodhms21_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 15)));
\echo 'Created idx_m_raw_okbt_kodhms21_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 16)));
\echo 'Created idx_m_raw_okbt_kodhms21_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 17)));
\echo 'Created idx_m_raw_okbt_kodhms21_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 18)));
\echo 'Created idx_m_raw_okbt_kodhms21_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 19)));
\echo 'Created idx_m_raw_okbt_kodhms21_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 20)));
\echo 'Created idx_m_raw_okbt_kodhms21_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 21)));
\echo 'Created idx_m_raw_okbt_kodhms21_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 22)));
\echo 'Created idx_m_raw_okbt_kodhms21_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 23)));
\echo 'Created idx_m_raw_okbt_kodhms21_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 24)));
\echo 'Created idx_m_raw_okbt_kodhms21_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms21_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS21', 25)));
\echo 'Created idx_m_raw_okbt_kodhms21_25'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_0 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 0)));
\echo 'Created idx_m_raw_okbt_kodhms22_0'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_1 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 1)));
\echo 'Created idx_m_raw_okbt_kodhms22_1'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_2 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 2)));
\echo 'Created idx_m_raw_okbt_kodhms22_2'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_3 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 3)));
\echo 'Created idx_m_raw_okbt_kodhms22_3'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_4 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 4)));
\echo 'Created idx_m_raw_okbt_kodhms22_4'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_5 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 5)));
\echo 'Created idx_m_raw_okbt_kodhms22_5'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_6 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 6)));
\echo 'Created idx_m_raw_okbt_kodhms22_6'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_7 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 7)));
\echo 'Created idx_m_raw_okbt_kodhms22_7'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_8 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 8)));
\echo 'Created idx_m_raw_okbt_kodhms22_8'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_9 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 9)));
\echo 'Created idx_m_raw_okbt_kodhms22_9'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_10 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 10)));
\echo 'Created idx_m_raw_okbt_kodhms22_10'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_11 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 11)));
\echo 'Created idx_m_raw_okbt_kodhms22_11'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_12 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 12)));
\echo 'Created idx_m_raw_okbt_kodhms22_12'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_13 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 13)));
\echo 'Created idx_m_raw_okbt_kodhms22_13'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_14 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 14)));
\echo 'Created idx_m_raw_okbt_kodhms22_14'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_15 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 15)));
\echo 'Created idx_m_raw_okbt_kodhms22_15'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_16 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 16)));
\echo 'Created idx_m_raw_okbt_kodhms22_16'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_17 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 17)));
\echo 'Created idx_m_raw_okbt_kodhms22_17'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_18 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 18)));
\echo 'Created idx_m_raw_okbt_kodhms22_18'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_19 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 19)));
\echo 'Created idx_m_raw_okbt_kodhms22_19'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_20 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 20)));
\echo 'Created idx_m_raw_okbt_kodhms22_20'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_21 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 21)));
\echo 'Created idx_m_raw_okbt_kodhms22_21'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_22 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 22)));
\echo 'Created idx_m_raw_okbt_kodhms22_22'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_23 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 23)));
\echo 'Created idx_m_raw_okbt_kodhms22_23'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_24 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 24)));
\echo 'Created idx_m_raw_okbt_kodhms22_24'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_m_raw_okbt_kodhms22_25 ON public.matches ((public.okbt_basamak_toplam(raw_data->>'KODHMS22', 25)));
\echo 'Created idx_m_raw_okbt_kodhms22_25'
