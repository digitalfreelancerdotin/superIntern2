BEGIN;

-- Create reactivation_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS reactivation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE reactivation_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reactivation requests" ON reactivation_requests;
DROP POLICY IF EXISTS "Users can create their own reactivation requests" ON reactivation_requests;
DROP POLICY IF EXISTS "Admins can view all reactivation requests" ON reactivation_requests;
DROP POLICY IF EXISTS "Admins can update reactivation requests" ON reactivation_requests;

-- Create policies
CREATE POLICY "Users can view their own reactivation requests"
    ON reactivation_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reactivation requests"
    ON reactivation_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all reactivation requests"
    ON reactivation_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM intern_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can update reactivation requests"
    ON reactivation_requests
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM intern_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
DROP TRIGGER IF EXISTS update_reactivation_requests_updated_at ON reactivation_requests;
CREATE TRIGGER update_reactivation_requests_updated_at
    BEFORE UPDATE ON reactivation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT; 