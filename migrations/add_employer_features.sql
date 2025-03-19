BEGIN;

-- Add columns to intern_profiles if they don't exist
DO $$ 
BEGIN 
    -- Check if is_customer column exists
    IF NOT EXISTS (SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='intern_profiles' 
        AND column_name='is_customer') 
    THEN
        ALTER TABLE intern_profiles
        ADD COLUMN is_customer BOOLEAN DEFAULT FALSE;
    END IF;

    -- Check if customer_type column exists
    IF NOT EXISTS (SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='intern_profiles' 
        AND column_name='customer_type') 
    THEN
        ALTER TABLE intern_profiles
        ADD COLUMN customer_type VARCHAR(20) CHECK (customer_type IN ('freemium', 'pro', 'premium', 'premium_plus'));
    END IF;
END $$;

-- Create table for job searches if it doesn't exist
CREATE TABLE IF NOT EXISTS job_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES intern_profiles(user_id),
    search_query TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for candidate applications/selections if it doesn't exist
CREATE TABLE IF NOT EXISTS candidate_selections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES intern_profiles(user_id),
    intern_id UUID REFERENCES intern_profiles(user_id),
    status VARCHAR(20) CHECK (status IN ('selected', 'rejected', 'pending')),
    feedback TEXT,
    onboard_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE job_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_selections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own searches" ON job_searches;
DROP POLICY IF EXISTS "Users can create their own searches" ON job_searches;
DROP POLICY IF EXISTS "Users can view their own selections" ON candidate_selections;
DROP POLICY IF EXISTS "Users can manage their own selections" ON candidate_selections;
DROP POLICY IF EXISTS "Users can update their own selections" ON candidate_selections;

-- Create new policies
CREATE POLICY "Users can view their own searches"
    ON job_searches FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own searches"
    ON job_searches FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Policies for candidate_selections
CREATE POLICY "Users can view their own selections"
    ON candidate_selections FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Users can manage their own selections"
    ON candidate_selections FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own selections"
    ON candidate_selections FOR UPDATE
    USING (auth.uid() = customer_id);

COMMIT; 