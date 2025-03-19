-- Drop existing table if it exists
DROP TABLE IF EXISTS tasks CASCADE;

-- Create tasks table
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE,
    required_skills TEXT[],
    max_applicants INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES intern_profiles(user_id),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'approved', 'blocked', 'cancelled')),
    is_paid BOOLEAN DEFAULT false,
    payment_amount DECIMAL(10,2),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on status for faster queries
CREATE INDEX idx_tasks_status ON tasks(status);

-- Create index on assigned_to for faster joins
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage all tasks" ON tasks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM intern_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

CREATE POLICY "Users can view open tasks" ON tasks
    FOR SELECT
    TO authenticated
    USING (status = 'open');

CREATE POLICY "Users can view their assigned tasks" ON tasks
    FOR SELECT
    TO authenticated
    USING (assigned_to = auth.uid());

CREATE POLICY "Users can update their assigned tasks" ON tasks
    FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();