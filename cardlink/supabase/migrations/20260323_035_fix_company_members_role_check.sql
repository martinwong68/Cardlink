-- ================================================================
-- Fix company_members role check constraint
--
-- The original constraint was too restrictive and didn't include
-- 'owner' as a valid role, causing inserts to fail.
-- This migration drops and recreates the constraint with all
-- valid role values used across the codebase.
-- ================================================================

ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_role_check;

ALTER TABLE company_members ADD CONSTRAINT company_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'member', 'staff'));
