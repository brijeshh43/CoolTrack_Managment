
CREATE POLICY "job media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-media' AND (owner = auth.uid() OR public.is_admin()));
CREATE POLICY "job media insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-media' AND owner = auth.uid());
CREATE POLICY "job media update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'job-media' AND (owner = auth.uid() OR public.is_admin()));
CREATE POLICY "job media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'job-media' AND (owner = auth.uid() OR public.is_admin()));
