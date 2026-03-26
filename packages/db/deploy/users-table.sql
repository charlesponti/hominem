BEGIN;

CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image text,
  email_verified boolean DEFAULT false NOT NULL,
  is_admin boolean DEFAULT false NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;

CREATE INDEX users_email_lower_idx ON public.users USING btree (lower(email));

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
