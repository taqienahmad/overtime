-- ============================================================
-- Auto-send approval reminder email schedule settings.
-- Single-row config table (id = 1) used by the Nest scheduler
-- to know when (and whether) to automatically send "Create
-- Session & Send Email" for every pending overtime group.
-- ============================================================

CREATE TABLE IF NOT EXISTS overtime.email_schedule_settings (
    id            SERIAL PRIMARY KEY,
    enabled       BOOLEAN NOT NULL DEFAULT false,
    days_of_week  INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Minggu ... 6=Sabtu
    hour          INTEGER NOT NULL DEFAULT 10,
    minute        INTEGER NOT NULL DEFAULT 0,
    timezone      VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    last_run_date DATE,
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by    VARCHAR(255)
);

INSERT INTO overtime.email_schedule_settings (id, enabled)
SELECT 1, false
WHERE NOT EXISTS (SELECT 1 FROM overtime.email_schedule_settings WHERE id = 1);
