-- ========================================================
-- ALERA - V3: Devices Table for FCM Push Notifications
-- ========================================================

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY,
    user_id UUID,
    fcm_token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_fcm_token ON devices(fcm_token);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);