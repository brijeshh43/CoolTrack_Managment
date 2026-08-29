-- Customers: restrict reads
DROP POLICY IF EXISTS "customers readable" ON public.customers;
CREATE POLICY "customers readable by admin or assigned engineer"
ON public.customers FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.service_jobs j
    WHERE j.customer_id = customers.id AND j.engineer_id = auth.uid()
  )
);

-- Profiles: own row or admin
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by self or admin"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

-- User roles: own rows or admin
DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;
CREATE POLICY "roles readable by self or admin"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Storage: tie job-media access to job assignment
DROP POLICY IF EXISTS "job media read" ON storage.objects;
DROP POLICY IF EXISTS "job media insert" ON storage.objects;
DROP POLICY IF EXISTS "job media update" ON storage.objects;
DROP POLICY IF EXISTS "job media delete" ON storage.objects;

CREATE POLICY "job media read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-media' AND (
    public.is_admin()
    OR (split_part(name,'/',1) = 'attendance' AND split_part(name,'/',2) = auth.uid()::text)
    OR (
      split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.can_access_job(split_part(name,'/',1)::uuid)
    )
  )
);

CREATE POLICY "job media insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-media' AND owner = auth.uid() AND (
    (split_part(name,'/',1) = 'attendance' AND split_part(name,'/',2) = auth.uid()::text)
    OR (
      split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.can_access_job(split_part(name,'/',1)::uuid)
    )
  )
);

CREATE POLICY "job media update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'job-media' AND (
    public.is_admin()
    OR (owner = auth.uid() AND (
      (split_part(name,'/',1) = 'attendance' AND split_part(name,'/',2) = auth.uid()::text)
      OR (
        split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.can_access_job(split_part(name,'/',1)::uuid)
      )
    ))
  )
);

CREATE POLICY "job media delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-media' AND (
    public.is_admin()
    OR (owner = auth.uid() AND (
      (split_part(name,'/',1) = 'attendance' AND split_part(name,'/',2) = auth.uid()::text)
      OR (
        split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.can_access_job(split_part(name,'/',1)::uuid)
      )
    ))
  )
);

-- Lock down internal helper functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_job(uuid) FROM PUBLIC, anon;