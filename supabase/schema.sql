-- =========================================================
-- TAKA AI GATEWAY - COMPLETE DATABASE SCHEMA
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

-- 2. Table: taka_api_keys (Custom Developer Client Keys)
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

-- 3. Table: access_codes (One-Time and Admin Access Codes for Web UI)
CREATE TABLE IF NOT EXISTS access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    label TEXT DEFAULT 'Access Pass',
    is_used BOOLEAN DEFAULT FALSE,
    is_one_time BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Atomic Function: Verify and consume one-time access code
CREATE OR REPLACE FUNCTION verify_and_consume_access_code(input_code TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    code_label TEXT,
    is_one_time BOOLEAN
) AS $$
DECLARE
    found_record RECORD;
BEGIN
    SELECT * INTO found_record
    FROM access_codes
    WHERE code = TRIM(input_code)
      AND (is_used = FALSE OR is_one_time = FALSE)
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

    IF found_record.id IS NOT NULL THEN
        IF found_record.is_one_time = TRUE THEN
            UPDATE access_codes
            SET is_used = TRUE,
                used_at = NOW()
            WHERE id = found_record.id;
        END IF;

        RETURN QUERY SELECT TRUE, found_record.label, found_record.is_one_time;
    ELSE
        RETURN QUERY SELECT FALSE, ''::TEXT, FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Atomic Compute Node Rotator
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

-- 6. Cooldown Handler
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

-- 7. Seed Initial One-Time Access Passcodes
INSERT INTO access_codes (code, label, is_one_time) VALUES
    ('TAKA-VIP-8899', 'VIP One-Time Pass', TRUE),
    ('TAKA-VIP-7722', 'VIP One-Time Pass', TRUE),
    ('TAKA-VIP-3344', 'VIP One-Time Pass', TRUE),
    ('TAKA-MASTER-2026', 'Master Admin Pass', FALSE)
ON CONFLICT (code) DO NOTHING;
