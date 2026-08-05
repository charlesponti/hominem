-- +goose Up

-- Add missing portfolio columns to app.career_profile
ALTER TABLE app.career_profile
  ADD COLUMN slug              TEXT,
  ADD COLUMN title             TEXT,
  ADD COLUMN is_public         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN is_active         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN initials          TEXT,
  ADD COLUMN tagline           TEXT,
  ADD COLUMN availability_status BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN open_to_remote    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN profile_image_url TEXT,
  ADD COLUMN copyright          TEXT;

CREATE UNIQUE INDEX idx_career_profile_slug ON app.career_profile(owner_userId, slug);

-- +goose Down

DROP INDEX IF EXISTS app.idx_career_profile_slug;

ALTER TABLE app.career_profile
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS is_public,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS initials,
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS availability_status,
  DROP COLUMN IF EXISTS open_to_remote,
  DROP COLUMN IF EXISTS profile_image_url,
  DROP COLUMN IF EXISTS copyright;
