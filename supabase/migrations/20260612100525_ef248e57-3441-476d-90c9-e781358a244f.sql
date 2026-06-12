CREATE TABLE public.profile_snapshots (
  username text PRIMARY KEY CHECK (username ~ '^[a-z0-9]{1,40}$'),
  claim_token text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- All access goes through server functions using the service role.
-- No grants to anon / authenticated: the claim_token column is sensitive
-- (anyone holding it can overwrite the snapshot), so we never expose the
-- base table to the Data API.
GRANT ALL ON public.profile_snapshots TO service_role;

ALTER TABLE public.profile_snapshots ENABLE ROW LEVEL SECURITY;

-- Deny-all policy so any accidental anon/authenticated SELECT returns 0 rows.
CREATE POLICY "no direct access"
  ON public.profile_snapshots
  FOR SELECT
  USING (false);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profile_snapshots_set_updated_at
  BEFORE UPDATE ON public.profile_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();