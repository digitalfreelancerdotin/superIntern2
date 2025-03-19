BEGIN;

-- Add video_url column to intern_profiles table
ALTER TABLE intern_profiles
ADD COLUMN video_url TEXT;

-- Create storage bucket for profile videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-videos', 'profile-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload their own videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view videos
CREATE POLICY "Public can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-videos');

COMMIT; 