-- ============================================================
-- HAPHAK — Schéma PostgreSQL
-- Appliqué automatiquement au démarrage du serveur (idempotent).
-- Peut aussi être exécuté à la main :
--   psql "$DATABASE_URL" -f database/schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- Administrateurs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  admin_token   TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Inscriptions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
  id                  SERIAL PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,

  -- Identité
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  post_name           TEXT,
  gender              TEXT NOT NULL CHECK (gender IN ('Homme', 'Femme')),
  marital_status      TEXT NOT NULL CHECK (marital_status IN ('Célibataire', 'Marié(e)')),

  -- Contact
  phone               TEXT NOT NULL,
  whatsapp            TEXT,
  email               TEXT NOT NULL,

  -- Localisation
  address             TEXT,
  city                TEXT NOT NULL,
  district            TEXT,
  commune             TEXT,
  province            TEXT,
  country             TEXT NOT NULL,

  -- Participation
  origin_city         TEXT NOT NULL,
  how_heard           TEXT NOT NULL,
  full_participation  TEXT NOT NULL
                      CHECK (full_participation IN ('Oui', 'Non', 'Pas encore sûr')),

  -- Hébergement
  needs_accommodation BOOLEAN NOT NULL DEFAULT FALSE,
  number_of_nights    INTEGER,
  comes_alone         BOOLEAN NOT NULL DEFAULT TRUE,
  companions          INTEGER,

  -- Compléments
  special_needs       TEXT,
  comments            TEXT,

  -- Suivi de l'e-mail de confirmation
  email_status        TEXT NOT NULL DEFAULT 'pending'
                      CHECK (email_status IN ('pending', 'sent', 'failed')),
  email_sent_at       TIMESTAMPTZ,
  email_error         TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Index pour la recherche et les filtres
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_registrations_number       ON registrations (registration_number);
CREATE INDEX IF NOT EXISTS idx_registrations_email        ON registrations (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_registrations_phone        ON registrations (phone);
CREATE INDEX IF NOT EXISTS idx_registrations_last_name    ON registrations (LOWER(last_name));
CREATE INDEX IF NOT EXISTS idx_registrations_first_name   ON registrations (LOWER(first_name));
CREATE INDEX IF NOT EXISTS idx_registrations_city         ON registrations (LOWER(city));
CREATE INDEX IF NOT EXISTS idx_registrations_gender       ON registrations (gender);
CREATE INDEX IF NOT EXISTS idx_registrations_accommodation ON registrations (needs_accommodation);
CREATE INDEX IF NOT EXISTS idx_registrations_email_status ON registrations (email_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at   ON registrations (created_at DESC);

-- ------------------------------------------------------------
-- Mise à jour automatique de updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registrations_updated_at ON registrations;
CREATE TRIGGER trg_registrations_updated_at
BEFORE UPDATE ON registrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Séquence des numéros d'inscription : HAP-000001, HAP-000002…
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS registration_number_seq START 1;
