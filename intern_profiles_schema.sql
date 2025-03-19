-- Drop existing table if it exists
DROP TABLE IF EXISTS intern_profiles CASCADE;

-- Create intern_profiles table
CREATE TABLE intern_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    location TEXT,
    university TEXT,
    major TEXT,
    graduation_year TEXT,
    resume_url TEXT,
    total_points INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bio TEXT,
    skills TEXT[],
    github_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add phone_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'phone_number') THEN
        ALTER TABLE intern_profiles ADD COLUMN phone_number TEXT;
    END IF;

    -- Add location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'location') THEN
        ALTER TABLE intern_profiles ADD COLUMN location TEXT;
    END IF;

    -- Add university column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'university') THEN
        ALTER TABLE intern_profiles ADD COLUMN university TEXT;
    END IF;

    -- Add major column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'major') THEN
        ALTER TABLE intern_profiles ADD COLUMN major TEXT;
    END IF;

    -- Add graduation_year column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'graduation_year') THEN
        ALTER TABLE intern_profiles ADD COLUMN graduation_year TEXT;
    END IF;

    -- Add resume_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intern_profiles' AND column_name = 'resume_url') THEN
        ALTER TABLE intern_profiles ADD COLUMN resume_url TEXT;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE intern_profiles ENABLE ROW LEVEL SECURITY;

-- Create a view to cache admin status to avoid recursion
CREATE OR REPLACE VIEW admin_users AS
SELECT user_id FROM intern_profiles WHERE is_admin = true;

-- Basic policy for all authenticated users to view profiles
CREATE POLICY "View profiles" ON intern_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to manage their own profile
CREATE POLICY "Manage own profile" ON intern_profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Allow admins to manage all profiles
CREATE POLICY "Admin manage all" ON intern_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_intern_profiles_updated_at
    BEFORE UPDATE ON intern_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin function
CREATE OR REPLACE FUNCTION create_initial_admin()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM intern_profiles WHERE is_admin = true) THEN
        NEW.is_admin := true;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for initial admin
CREATE TRIGGER set_initial_admin
    BEFORE INSERT ON intern_profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_admin(); 