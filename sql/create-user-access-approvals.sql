-- Kullanıcı onay akışı (admin onayı) için erişim tablosu
-- Admin e-posta: ahmetserhatelmas@gmail.com

CREATE TABLE IF NOT EXISTS public.user_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  is_approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_user_access_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_access_updated_at ON public.user_access;
CREATE TRIGGER trg_user_access_updated_at
BEFORE UPDATE ON public.user_access
FOR EACH ROW
EXECUTE FUNCTION public.set_user_access_updated_at();

CREATE OR REPLACE FUNCTION public.handle_user_access_from_auth_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(new.email);
  v_admin constant text := 'ahmetserhatelmas@gmail.com';
  v_is_admin boolean := v_email = v_admin;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN new;
  END IF;

  INSERT INTO public.user_access (
    user_id,
    email,
    is_approved,
    approved_at,
    approved_by_email
  )
  VALUES (
    new.id,
    v_email,
    v_is_admin,
    CASE WHEN v_is_admin THEN now() ELSE NULL END,
    CASE WHEN v_is_admin THEN v_admin ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_access_from_auth_users ON auth.users;
CREATE TRIGGER trg_user_access_from_auth_users
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_access_from_auth_users();

-- Var olan auth kullanıcılarını da tabloya taşı
INSERT INTO public.user_access (user_id, email, is_approved, approved_at, approved_by_email)
SELECT
  u.id,
  lower(u.email) AS email,
  lower(u.email) = 'ahmetserhatelmas@gmail.com' AS is_approved,
  CASE WHEN lower(u.email) = 'ahmetserhatelmas@gmail.com' THEN now() ELSE NULL END AS approved_at,
  CASE WHEN lower(u.email) = 'ahmetserhatelmas@gmail.com' THEN 'ahmetserhatelmas@gmail.com' ELSE NULL END AS approved_by_email
FROM auth.users u
WHERE u.email IS NOT NULL AND u.email <> ''
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email;

ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_access_select_own ON public.user_access;
CREATE POLICY user_access_select_own
ON public.user_access
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.user_access TO authenticated;
REVOKE ALL ON public.user_access FROM anon;
