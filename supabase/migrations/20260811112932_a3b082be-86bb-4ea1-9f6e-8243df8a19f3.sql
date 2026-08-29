
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','engineer');
CREATE TYPE public.job_type AS ENUM ('pm','breakdown','installation','commissioning');
CREATE TYPE public.job_status AS ENUM ('assigned','accepted','on_the_way','arrived','in_progress','waiting_for_parts','completed','cancelled');
CREATE TYPE public.media_kind AS ENUM ('photo','video');
CREATE TYPE public.report_status AS ENUM ('draft','submitted','approved','rejected');

-- SHARED
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  employee_code TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- signup trigger: create profile, first user becomes admin, others engineer
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, employee_code)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name',''),
          NEW.email,
          NEW.raw_user_meta_data->>'phone',
          NEW.raw_user_meta_data->>'employee_code');
  SELECT count(*) INTO existing_count FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN existing_count = 0 THEN 'admin'::public.app_role ELSE 'engineer'::public.app_role END);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contact_number TEXT,
  email TEXT,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers readable" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers admin write" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "customers admin update" ON public.customers FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "customers admin delete" ON public.customers FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- UNITS
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  unit_code TEXT NOT NULL,
  model_number TEXT,
  serial_number TEXT,
  equipment_type TEXT,
  location TEXT,
  installation_date DATE,
  warranty_until DATE,
  warranty_info TEXT,
  status TEXT NOT NULL DEFAULT 'working',
  photo_url TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units readable" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units admin insert" ON public.units FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "units admin update" ON public.units FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "units admin delete" ON public.units FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER units_updated BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PARTS CATALOG
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  part_number TEXT,
  category TEXT,
  unit_of_measure TEXT DEFAULT 'pcs',
  remarks TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts TO authenticated;
GRANT ALL ON public.parts TO service_role;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parts readable" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "parts admin insert" ON public.parts FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "parts admin update" ON public.parts FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "parts admin delete" ON public.parts FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER parts_updated BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SERVICE JOBS
CREATE TABLE public.service_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE DEFAULT ('JOB-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  engineer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_type public.job_type NOT NULL,
  status public.job_status NOT NULL DEFAULT 'assigned',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal',
  description TEXT,
  remarks TEXT,
  start_latitude DOUBLE PRECISION,
  start_longitude DOUBLE PRECISION,
  complete_latitude DOUBLE PRECISION,
  complete_longitude DOUBLE PRECISION,
  created_by UUID REFERENCES auth.users(id),
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_jobs TO authenticated;
GRANT ALL ON public.service_jobs TO service_role;
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs visible to admin or assigned engineer" ON public.service_jobs FOR SELECT TO authenticated
  USING (public.is_admin() OR engineer_id = auth.uid());
CREATE POLICY "jobs admin insert" ON public.service_jobs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "jobs update admin or engineer" ON public.service_jobs FOR UPDATE TO authenticated
  USING (public.is_admin() OR engineer_id = auth.uid())
  WITH CHECK (public.is_admin() OR engineer_id = auth.uid());
CREATE POLICY "jobs admin delete" ON public.service_jobs FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER service_jobs_updated BEFORE UPDATE ON public.service_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ON public.service_jobs (engineer_id, status);
CREATE INDEX ON public.service_jobs (customer_id);

-- helper for child tables
CREATE OR REPLACE FUNCTION public.can_access_job(_job_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_jobs j
    WHERE j.id = _job_id AND (public.has_role(auth.uid(),'admin') OR j.engineer_id = auth.uid())
  );
$$;

-- PER-TYPE RECORDS
CREATE TABLE public.pm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.breakdown_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  complaint TEXT,
  diagnosis TEXT,
  action_taken TEXT,
  gas_type TEXT,
  gas_quantity TEXT,
  gas_charged_at TIMESTAMPTZ,
  valve_details TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.installation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  installation_location TEXT,
  pipe_size TEXT,
  copper_pipe_details TEXT,
  cable_details TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.commissioning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  commissioning_status TEXT,
  test_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MEDIA
CREATE TABLE public.job_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  kind public.media_kind NOT NULL DEFAULT 'photo',
  checklist_key TEXT,
  label TEXT,
  storage_path TEXT NOT NULL,
  remarks TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PARTS USED
CREATE TABLE public.parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'new',
  serial_number TEXT,
  photo_path TEXT,
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SIGNATURES
CREATE TABLE public.customer_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID REFERENCES auth.users(id)
);

-- SERVICE REPORTS
CREATE TABLE public.service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  report_number TEXT NOT NULL UNIQUE DEFAULT ('SR-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  status public.report_status NOT NULL DEFAULT 'submitted',
  summary TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LOCATION LOGS
CREATE TABLE public.location_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ATTENDANCE
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  out_time TIMESTAMPTZ,
  in_latitude DOUBLE PRECISION,
  in_longitude DOUBLE PRECISION,
  in_address TEXT,
  out_latitude DOUBLE PRECISION,
  out_longitude DOUBLE PRECISION,
  out_address TEXT,
  selfie_path TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engineer_id, work_date)
);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- grants + RLS for job-child tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pm_records','breakdown_records','installation_records','commissioning_records','job_media','parts_used','customer_signatures','service_reports','location_logs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

CREATE POLICY "pm select" ON public.pm_records FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "pm write" ON public.pm_records FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "pm update" ON public.pm_records FOR UPDATE TO authenticated USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "pm delete" ON public.pm_records FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "bd select" ON public.breakdown_records FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "bd write" ON public.breakdown_records FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "bd update" ON public.breakdown_records FOR UPDATE TO authenticated USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "bd delete" ON public.breakdown_records FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "inst select" ON public.installation_records FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "inst write" ON public.installation_records FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "inst update" ON public.installation_records FOR UPDATE TO authenticated USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "inst delete" ON public.installation_records FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "comm select" ON public.commissioning_records FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "comm write" ON public.commissioning_records FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "comm update" ON public.commissioning_records FOR UPDATE TO authenticated USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "comm delete" ON public.commissioning_records FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "media select" ON public.job_media FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "media insert" ON public.job_media FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "media update" ON public.job_media FOR UPDATE TO authenticated USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "media delete" ON public.job_media FOR DELETE TO authenticated USING (public.can_access_job(job_id));

CREATE POLICY "pu select" ON public.parts_used FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "pu insert" ON public.parts_used FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "pu update" ON public.parts_used FOR UPDATE TO authenticated USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "pu delete" ON public.parts_used FOR DELETE TO authenticated USING (public.can_access_job(job_id));

CREATE POLICY "sig select" ON public.customer_signatures FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "sig insert" ON public.customer_signatures FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "sig update" ON public.customer_signatures FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "sig delete" ON public.customer_signatures FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "rep select" ON public.service_reports FOR SELECT TO authenticated USING (public.can_access_job(job_id));
CREATE POLICY "rep insert" ON public.service_reports FOR INSERT TO authenticated WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "rep update" ON public.service_reports FOR UPDATE TO authenticated USING (public.can_access_job(job_id)) WITH CHECK (public.can_access_job(job_id));
CREATE POLICY "rep delete" ON public.service_reports FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "loc select" ON public.location_logs FOR SELECT TO authenticated USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "loc insert" ON public.location_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att select" ON public.attendance FOR SELECT TO authenticated USING (public.is_admin() OR engineer_id = auth.uid());
CREATE POLICY "att insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (engineer_id = auth.uid());
CREATE POLICY "att update" ON public.attendance FOR UPDATE TO authenticated USING (engineer_id = auth.uid() OR public.is_admin()) WITH CHECK (engineer_id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pm_records','breakdown_records','installation_records','commissioning_records','service_reports'] LOOP
    EXECUTE format('CREATE TRIGGER %I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- seed common parts catalog
INSERT INTO public.parts (name, category) VALUES
 ('Blower','Mechanical'),('Compressor','Mechanical'),('Refrigerant Gas','Consumable'),
 ('Heater','Electrical'),('MCB','Electrical'),('Controller Card','Electronics'),
 ('Humidifier Bottle','Consumable'),('Outdoor Fan','Mechanical'),('Dryer','Refrigeration'),
 ('Expansion Valve','Refrigeration'),('Power Drive','Electronics'),('Filter','Consumable'),
 ('Copper Pipe','Piping'),('Other','General');
