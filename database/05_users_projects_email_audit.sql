-- ============================================================
-- Migration: users, projects, email_logs, audit_logs
-- Tujuan: fondasi untuk Auth Service, normalisasi project,
--         dan tracking email & audit umum (lihat ARSITEKTUR diagram)
-- ============================================================

-- TABLE: users
CREATE TABLE IF NOT EXISTS overtime.users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role          VARCHAR(50) NOT NULL DEFAULT 'WFM',
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLE: projects
CREATE TABLE IF NOT EXISTS overtime.projects (
    id            SERIAL PRIMARY KEY,
    project_code  VARCHAR(50) UNIQUE,
    project_name  VARCHAR(255) NOT NULL UNIQUE,
    manager_email VARCHAR(255),
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLE: email_logs
CREATE TABLE IF NOT EXISTS overtime.email_logs (
    id            SERIAL PRIMARY KEY,
    recipient     VARCHAR(255) NOT NULL,
    subject       VARCHAR(255),
    status        VARCHAR(50) NOT NULL,
    error_message TEXT,
    reference_id  INTEGER,
    sent_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLE: audit_logs (general, terpisah dari overtime_validations)
CREATE TABLE IF NOT EXISTS overtime.audit_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES overtime.users(id),
    action          VARCHAR(255) NOT NULL,
    reference_table VARCHAR(100),
    reference_id    INTEGER,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON overtime.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_audit_logs_reference ON overtime.audit_logs(reference_table, reference_id);

-- ============================================================
-- Seed projects dari data overtime_records yang sudah ada
-- ============================================================
INSERT INTO overtime.projects (project_name, manager_email)
SELECT DISTINCT project_name, employee_email
FROM overtime.overtime_records
ON CONFLICT (project_name) DO NOTHING;
