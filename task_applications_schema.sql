-- Drop existing table if it exists
DROP TABLE IF EXISTS task_applications CASCADE;

-- Create task_applications table
CREATE TABLE task_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES intern_profiles(user_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_task_applicant UNIQUE (task_id, applicant_id)
);

-- Enable Row Level Security
ALTER TABLE task_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own applications" ON task_applications
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = applicant_id
        OR 
        EXISTS (
            SELECT 1 FROM intern_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

CREATE POLICY "Users can create their own applications" ON task_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = applicant_id
        AND
        status = 'pending'
    );

CREATE POLICY "Admins can update applications" ON task_applications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM intern_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_task_applications_updated_at
    BEFORE UPDATE ON task_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 