-- Begin transaction
BEGIN;

-- Create referral_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS referral_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_code UNIQUE (user_id)
);

-- Create referrals table if it doesn't exist
CREATE TABLE IF NOT EXISTS referrals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_task_count integer NOT NULL DEFAULT 0,
    points_awarded boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_referral UNIQUE (referred_user_id)
);

-- Drop the view if it exists
DROP VIEW IF EXISTS referral_details;

-- Create a view for referral data with user details
CREATE OR REPLACE VIEW referral_details AS
SELECT 
    r.id,
    r.referrer_id,
    r.referred_user_id,
    r.status,
    r.completed_task_count,
    r.points_awarded,
    r.created_at,
    r.updated_at,
    ip.first_name,
    ip.last_name,
    ip.email
FROM referrals r
JOIN intern_profiles ip ON ip.user_id = r.referred_user_id;

-- Grant access to authenticated users
GRANT SELECT ON referral_details TO authenticated;

-- Enable RLS if not already enabled
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own referral code" ON referral_codes;
DROP POLICY IF EXISTS "Users can create their own referral code" ON referral_codes;
DROP POLICY IF EXISTS "Users can view referrals they made" ON referrals;
DROP POLICY IF EXISTS "System can create referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view referred users profiles" ON intern_profiles;
DROP POLICY IF EXISTS "Users can view available tasks" ON tasks;

-- Create or update policies
CREATE POLICY "Users can view their own referral code"
    ON referral_codes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral code"
    ON referral_codes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view referrals they made"
    ON referrals FOR SELECT
    TO authenticated
    USING (auth.uid() = referrer_id);

CREATE POLICY "System can create referrals"
    ON referrals FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add policy to allow users to view profiles of users they referred
CREATE POLICY "Users can view referred users profiles"
    ON intern_profiles FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR -- Users can view their own profile
        auth.uid() IN (
            SELECT referrer_id 
            FROM referrals 
            WHERE referred_user_id = intern_profiles.user_id
        ) OR -- Users can view profiles of users they referred
        user_id IN (
            SELECT referred_user_id 
            FROM referrals 
            WHERE referrer_id = auth.uid()
        ) -- Users can view profiles of users who referred them
    );

-- Create policy for viewing available unassigned tasks
CREATE POLICY "Users can view available tasks"
    ON tasks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM intern_profiles 
            WHERE user_id = auth.uid()
        ) AND
        assigned_to IS NULL AND
        status = 'open'
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commit transaction
COMMIT; 