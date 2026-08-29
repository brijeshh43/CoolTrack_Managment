-- POSTS & COMMENTS
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "posts readable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts insert by author" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts update by author" ON public.posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts delete by author or admin" ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin());

-- Comments policies
CREATE POLICY "comments readable by authenticated" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments insert by author" ON public.comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments update by author" ON public.comments FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments delete by author or admin" ON public.comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin());

-- Triggers for updated_at
CREATE TRIGGER posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER comments_updated BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX ON public.posts (author_id, created_at DESC);
CREATE INDEX ON public.comments (post_id, created_at);