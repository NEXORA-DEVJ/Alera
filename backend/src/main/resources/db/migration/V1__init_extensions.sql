-- ========================================================
-- ALERA - V1: Initialize Database Extensions and Verification
-- ========================================================

-- 1. Habilitar extensión para generación de identificadores universales (UUID v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Habilitar extensión geoespacial PostGIS
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 3. Tabla de verificación de inicialización del sistema
CREATE TABLE IF NOT EXISTS system_healthcheck (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_healthcheck (component, status) 
VALUES ('DATABASE_POSTGIS_INIT', 'HEALTHY')
ON CONFLICT DO NOTHING;
