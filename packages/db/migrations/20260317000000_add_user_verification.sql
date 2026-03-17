-- +goose Up
CREATE TABLE IF NOT EXISTS public.user_verification (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.user_verification
    ADD CONSTRAINT user_verification_pkey PRIMARY KEY (id);

CREATE INDEX user_verification_identifier_idx ON public.user_verification USING btree (identifier);

-- +goose Down
DROP TABLE IF EXISTS public.user_verification;
