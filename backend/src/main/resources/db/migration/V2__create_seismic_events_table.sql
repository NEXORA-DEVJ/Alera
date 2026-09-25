-- ========================================================
-- ALERA - V2: Seismic Events Table with PostGIS
-- ========================================================

CREATE TABLE IF NOT EXISTS seismic_events (
    id UUID PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    magnitude DOUBLE PRECISION NOT NULL,
    depth_km DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    epicenter_description VARCHAR(255),
    origin_time TIMESTAMPTZ NOT NULL,
    review_status VARCHAR(30) NOT NULL DEFAULT 'PRELIMINARY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_seismic_source_external UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_seismic_location ON seismic_events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_seismic_origin_time ON seismic_events (origin_time DESC);