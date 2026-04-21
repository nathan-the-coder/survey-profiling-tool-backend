-- =============================================================
-- 003_rls_policies.sql – Enable permissive policies for tables
-- Run this in the Supabase SQL editor (or add as a migration)
-- =============================================================

-- Re‑enable RLS on tables (idempotent)
DO $$
BEGIN
   ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.health_conditions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.socio_economic ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.parishes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.community_involvement ENABLE ROW LEVEL SECURITY;
EXCEPTION
   WHEN duplicate_object THEN NULL; -- ignore if already enabled
END $$;

-- ---------- SELECT policies (readable by any authenticated user) ----------
CREATE POLICY "allow_anon_select_households"
  ON public.households
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_anon_select_family_members"
  ON public.family_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_anon_select_health_conditions"
  ON public.health_conditions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_anon_select_socio_economic"
  ON public.socio_economic
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_anon_select_users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_anon_select_parishes"
  ON public.parishes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_anon_select_community_involvement"
  ON public.community_involvement
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------- OPTIONAL: Write policies (remove if you only need read‑only) ----------
-- INSERT/UPDATE/DELETE policies for each table (example for households)
CREATE POLICY "allow_anon_insert_households"
  ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_anon_update_households"
  ON public.households
  FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "allow_anon_delete_households"
  ON public.households
  FOR DELETE
  TO authenticated
  USING (true);

-- Repeat the above three blocks for family_members, health_conditions, socio_economic,
-- users, parishes, and community_involvement if you need write access.

-- =============================================================
-- After applying, you can verify policies with:
-- SELECT policyname, tablename, perm, roles FROM pg_policies;
-- =============================================================
