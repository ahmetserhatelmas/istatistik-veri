-- ÖNCE bunu tek başına çalıştırın (Supabase SQL Editor, bir Run).
-- Yetki yoksa: Dashboard → Database → Extensions → "pg_trgm" → Enable.

create extension if not exists pg_trgm;
