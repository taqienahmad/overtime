-- ============================================================
-- Migration: project_email_recipients
-- Tujuan: menyimpan daftar email TO (tambahan) dan CC per
--         project, sehingga saat blast email approval, CC
--         (dan TO tambahan) otomatis diambil dari referensi
--         project ini.
-- ============================================================

CREATE TABLE IF NOT EXISTS overtime.project_email_recipients (
    id           SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL REFERENCES overtime.projects(project_name)
                  ON UPDATE CASCADE ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL,
    type         VARCHAR(10) NOT NULL CHECK (type IN ('TO', 'CC')),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (project_name, email, type)
);

CREATE INDEX IF NOT EXISTS idx_project_email_recipients_project
    ON overtime.project_email_recipients(project_name);
