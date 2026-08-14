-- =========================================================
-- TAKA AI GATEWAY - COMPLETE ENTERPRISE SCHEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: groq_keys (Internal Neural Compute Nodes)
CREATE TABLE IF NOT EXISTS groq_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key TEXT UNIQUE NOT NULL,
    label TEXT DEFAULT 'Compute Node',
    is_active BOOLEAN DEFAULT TRUE,
    cooldown_until TIMESTAMPTZ DEFAULT NULL,
    total_requests BIGINT DEFAULT 0,
    failed_requests BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groq_keys_selection 
ON groq_keys (is_active, cooldown_until, last_used_at);

-- 2. Table: taka_api_keys (Custom Client API Keys for Developers)
CREATE TABLE IF NOT EXISTS taka_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_secret TEXT UNIQUE NOT NULL,
    key_masked TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Default Key',
    is_active BOOLEAN DEFAULT TRUE,
    total_requests BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Atomic Compute Node Rotator
CREATE OR REPLACE FUNCTION get_next_groq_key()
RETURNS TABLE (
    id UUID,
    api_key TEXT,
    label TEXT
) AS $$
BEGIN
    RETURN QUERY
    UPDATE groq_keys
    SET last_used_at = NOW(),
        total_requests = groq_keys.total_requests + 1
    WHERE groq_keys.id = (
        SELECT gk.id
        FROM groq_keys gk
        WHERE gk.is_active = TRUE
          AND (gk.cooldown_until IS NULL OR gk.cooldown_until <= NOW())
        ORDER BY gk.last_used_at ASC NULLS FIRST
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING groq_keys.id, groq_keys.api_key, groq_keys.label;
END;
$$ LANGUAGE plpgsql;

-- 4. Cooldown Handler
CREATE OR REPLACE FUNCTION mark_key_cooldown(
    target_key_id UUID,
    cooldown_seconds INT DEFAULT 60
)
RETURNS VOID AS $$
BEGIN
    UPDATE groq_keys
    SET cooldown_until = NOW() + (cooldown_seconds || ' seconds')::INTERVAL,
        failed_requests = groq_keys.failed_requests + 1
    WHERE id = target_key_id;
END;
$$ LANGUAGE plpgsql;
