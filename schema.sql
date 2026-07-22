-- Not At Home v2 — Neon Postgres Schema
-- Run once against your Neon database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Congregations
CREATE TABLE IF NOT EXISTS congregations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  pin_code    VARCHAR(10) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | active | suspended
  contact_email TEXT,
  notification_email TEXT,                     -- receives auto-expiry emails
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Congregation admins (up to 3 per congregation)
CREATE TABLE IF NOT EXISTS congregation_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES congregations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Territory maps
CREATE TABLE IF NOT EXISTS territory_maps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES congregations(id) ON DELETE CASCADE,
  map_number      INTEGER NOT NULL,
  name            TEXT,
  block_count     INTEGER NOT NULL DEFAULT 1,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(congregation_id, map_number)
);

-- Do Not Call entries per map
CREATE TABLE IF NOT EXISTS do_not_call (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id       UUID NOT NULL REFERENCES territory_maps(id) ON DELETE CASCADE,
  block_number INTEGER,
  address      TEXT NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing databases: add the block column if missing
ALTER TABLE do_not_call ADD COLUMN IF NOT EXISTS block_number INTEGER;

-- Active sessions (ephemeral — deleted when session ends or after 24h)
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(6) NOT NULL UNIQUE,
  congregation_id UUID NOT NULL REFERENCES congregations(id) ON DELETE CASCADE,
  map_number      INTEGER NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Not-at-home addresses (ephemeral — deleted with session)
CREATE TABLE IF NOT EXISTS not_at_home_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  block_number INTEGER NOT NULL,
  unit_number  TEXT,
  house_number TEXT NOT NULL,
  street_name  TEXT NOT NULL,
  suburb       TEXT,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- New congregation requests
CREATE TABLE IF NOT EXISTS congregation_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  pin_code      VARCHAR(10) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_congregation ON sessions(congregation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_addresses_session ON not_at_home_addresses(session_id);
CREATE INDEX IF NOT EXISTS idx_maps_congregation ON territory_maps(congregation_id);
CREATE INDEX IF NOT EXISTS idx_admins_congregation ON congregation_admins(congregation_id);
