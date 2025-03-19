BEGIN;

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    has_level BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_skills table for storing user's skills with proficiency
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    skill_id TEXT NOT NULL REFERENCES skills(id),
    proficiency_level TEXT CHECK (proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, skill_id)
);

-- Enable RLS
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Skills are viewable by everyone" ON skills;
DROP POLICY IF EXISTS "Users can view their own skills" ON user_skills;
DROP POLICY IF EXISTS "Users can manage their own skills" ON user_skills;
DROP POLICY IF EXISTS "Admins can manage all skills" ON skills;

-- Create policies
CREATE POLICY "Skills are viewable by everyone"
    ON skills FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view their own skills"
    ON user_skills FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills"
    ON user_skills FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all skills"
    ON skills FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM intern_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_skills_updated_at
    BEFORE UPDATE ON user_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial skills data
INSERT INTO skills (id, name, category, subcategory, has_level)
VALUES
    -- Technical - Frontend
    ('react', 'React', 'Technical', 'Frontend', true),
    ('nextjs', 'Next.js', 'Technical', 'Frontend', true),
    ('typescript', 'TypeScript', 'Technical', 'Frontend', true),
    ('angular', 'Angular', 'Technical', 'Frontend', true),
    ('vue', 'Vue.js', 'Technical', 'Frontend', true),
    
    -- Technical - Backend
    ('nodejs', 'Node.js', 'Technical', 'Backend', true),
    ('python-backend', 'Python (Backend)', 'Technical', 'Backend', true),
    ('java', 'Java', 'Technical', 'Backend', true),
    ('ruby', 'Ruby on Rails', 'Technical', 'Backend', true),
    ('go', 'Go', 'Technical', 'Backend', true),
    
    -- Technical - Databases
    ('mysql', 'MySQL', 'Technical', 'Databases', true),
    ('mongodb', 'MongoDB', 'Technical', 'Databases', true),
    ('postgresql', 'PostgreSQL', 'Technical', 'Databases', true),
    ('firebase', 'Firebase', 'Technical', 'Databases', true),
    
    -- Technical - DevOps
    ('docker', 'Docker', 'Technical', 'DevOps', false),
    ('kubernetes', 'Kubernetes', 'Technical', 'DevOps', false),
    ('aws', 'AWS', 'Technical', 'DevOps', false),
    ('ci-cd', 'CI/CD', 'Technical', 'DevOps', false),
    
    -- AI & ML - Machine Learning
    ('ml-algorithms', 'ML Algorithms', 'AI & ML', 'Machine Learning', true),
    ('scikit-learn', 'Scikit-learn', 'AI & ML', 'Machine Learning', true),
    ('tensorflow', 'TensorFlow', 'AI & ML', 'Machine Learning', true),
    ('pytorch', 'PyTorch', 'AI & ML', 'Machine Learning', true),
    
    -- Languages
    ('english', 'English', 'Languages', 'European Languages', true),
    ('spanish', 'Spanish', 'Languages', 'European Languages', true),
    ('french', 'French', 'Languages', 'European Languages', true),
    ('german', 'German', 'Languages', 'European Languages', true),
    
    -- Business
    ('social-media', 'Social Media Marketing', 'Business', 'Marketing', true),
    ('seo', 'SEO', 'Business', 'Marketing', true),
    ('content-marketing', 'Content Marketing', 'Business', 'Marketing', true),
    
    -- Soft Skills
    ('public-speaking', 'Public Speaking', 'Soft Skills', 'Communication', true),
    ('writing', 'Professional Writing', 'Soft Skills', 'Communication', true),
    ('presentation', 'Presentation Skills', 'Soft Skills', 'Communication', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    has_level = EXCLUDED.has_level;

COMMIT; 