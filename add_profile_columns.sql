-- Migration: Add new columns to intern_profiles table
-- Description: Adds phone_number, location, university, major, graduation_year, and resume_url columns

-- Wrap in a transaction
BEGIN;

DO $$ 
BEGIN
    -- Add phone_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'phone_number') THEN
        ALTER TABLE intern_profiles ADD COLUMN phone_number TEXT;
        RAISE NOTICE 'Added phone_number column';
    END IF;

    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'location') THEN
        ALTER TABLE intern_profiles ADD COLUMN location TEXT;
        RAISE NOTICE 'Added location column';
    END IF;

    -- Add university column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'university') THEN
        ALTER TABLE intern_profiles ADD COLUMN university TEXT;
        RAISE NOTICE 'Added university column';
    END IF;

    -- Add major column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'major') THEN
        ALTER TABLE intern_profiles ADD COLUMN major TEXT;
        RAISE NOTICE 'Added major column';
    END IF;

    -- Add graduation_year column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'graduation_year') THEN
        ALTER TABLE intern_profiles ADD COLUMN graduation_year TEXT;
        RAISE NOTICE 'Added graduation_year column';
    END IF;

    -- Add resume_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'resume_url') THEN
        ALTER TABLE intern_profiles ADD COLUMN resume_url TEXT;
        RAISE NOTICE 'Added resume_url column';
    END IF;
END $$;

COMMIT; 