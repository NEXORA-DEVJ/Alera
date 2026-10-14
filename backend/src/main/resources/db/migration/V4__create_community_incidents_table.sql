-- ========================================================
-- ALERA - V4: Community Incidents and Confirmation Voting
-- ========================================================

-- 1. Tabla de Incidentes Comunitarios
CREATE TABLE IF NOT EXISTS community_incidents (
    id UUID PRIMARY KEY,
    reporter_device_id UUID NOT NULL,
    incident_type VARCHAR(40) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 1000,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    positive_votes INT NOT NULL DEFAULT 0,
    negative_votes INT NOT NULL DEFAULT 0,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices espaciales y de consulta para incidentes
CREATE INDEX IF NOT EXISTS idx_community_incidents_location ON community_incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_community_incidents_status ON community_incidents (status);
CREATE INDEX IF NOT EXISTS idx_community_incidents_expires_at ON community_incidents (expires_at);

-- 2. Tabla de Confirmaciones Comunitarias (Voto único anti-abuso)
CREATE TABLE IF NOT EXISTS community_incident_confirmations (
    id UUID PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES community_incidents(id) ON DELETE CASCADE,
    device_id UUID NOT NULL,
    vote_type VARCHAR(30) NOT NULL,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_incident_device_confirmation UNIQUE (incident_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_confirmations_incident ON community_incident_confirmations (incident_id);