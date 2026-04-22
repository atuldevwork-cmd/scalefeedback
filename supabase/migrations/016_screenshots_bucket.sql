-- Create storage bucket for widget and AI-scan screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload screenshots
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'screenshots');

-- Allow service role to upload screenshots (used by AI scan API)
CREATE POLICY "Service role can upload screenshots"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'screenshots');

-- Allow public read access to screenshots
CREATE POLICY "Public read for screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'screenshots');

-- Allow authenticated users to delete screenshots
CREATE POLICY "Users can delete screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'screenshots');
