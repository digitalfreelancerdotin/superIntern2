BEGIN;

-- Add dream_role column to intern_profiles table
ALTER TABLE intern_profiles
ADD COLUMN dream_role TEXT;

COMMIT; 