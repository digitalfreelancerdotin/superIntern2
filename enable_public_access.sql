ALTER TABLE intern_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to intern profiles"
    ON intern_profiles FOR SELECT
    TO public
    USING (true); 