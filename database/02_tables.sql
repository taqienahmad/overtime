-- ============================================================
-- Base tables for the Overtime Approval System
-- Kolom tambahan (nip, overtime_period, validated_by,
-- validated_device, validation_method, dst) ditambahkan oleh
-- migrasi 11-14, lihat file tersebut.
-- ============================================================

-- TABLE: overtime_uploads
-- Menyimpan histori file Excel overtime yang diupload.
CREATE TABLE IF NOT EXISTS overtime.overtime_uploads (
    id          SERIAL PRIMARY KEY,
    file_name   VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLE: overtime_records
-- Menyimpan seluruh data overtime per member, hasil import dari Excel.
CREATE TABLE IF NOT EXISTS overtime.overtime_records (
    id                  SERIAL PRIMARY KEY,
    employee_name       VARCHAR(255) NOT NULL,
    employee_email      VARCHAR(255),
    project_name        VARCHAR(255) NOT NULL,
    overtime_hours      NUMERIC(10,2) NOT NULL DEFAULT 0,
    upload_id           INTEGER REFERENCES overtime.overtime_uploads(id),
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    validation_type     VARCHAR(50),
    validation_remark   TEXT,
    validated_at        TIMESTAMP,
    billable_hours      NUMERIC(10,2) NOT NULL DEFAULT 0,
    non_billable_hours  NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TABLE: overtime_approval_sessions
-- Menyimpan approval session (per project + approver email) yang
-- dikirim melalui email, beserta token approval (UUID).
CREATE TABLE IF NOT EXISTS overtime.overtime_approval_sessions (
    id              SERIAL PRIMARY KEY,
    approver_email  VARCHAR(255) NOT NULL,
    project_name    VARCHAR(255) NOT NULL,
    approval_token  UUID NOT NULL UNIQUE,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at     TIMESTAMP
);

-- TABLE: overtime_validations
-- Audit trail approval, diisi otomatis oleh endpoint
-- POST /api/overtime/approval-submit/:token
CREATE TABLE IF NOT EXISTS overtime.overtime_validations (
    id                 SERIAL PRIMARY KEY,
    record_id          INTEGER NOT NULL REFERENCES overtime.overtime_records(id),
    validator_email    VARCHAR(255),
    validation_status  VARCHAR(50) NOT NULL,
    remarks            TEXT,
    validated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
