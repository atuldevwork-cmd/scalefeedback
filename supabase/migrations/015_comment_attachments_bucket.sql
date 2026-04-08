-- Create storage bucket for comment image attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-attachments', 'comment-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload comment attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comment-attachments');

-- Allow public read access
CREATE POLICY "Public read for comment attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comment-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own comment attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comment-attachments');
