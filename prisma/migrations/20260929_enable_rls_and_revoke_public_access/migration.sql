-- Migration: Enable Row Level Security (RLS) and Revoke Public PostgREST Access
-- Applied to Supabase Production PostgreSQL on 2026-09-29

-- 1. Enable Row Level Security (RLS) on all 16 tables in public schema
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BrandName" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClinicalReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Contraindication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Drug" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DrugAlias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DrugClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DrugInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EvidenceSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FoodInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Ingredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InteractionEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InteractionMechanism" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PillboxShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SavedPillbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all permissions on public schema objects from anon and authenticated roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- 3. Revoke default privileges for any future objects created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;
