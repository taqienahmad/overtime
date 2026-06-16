TRUNCATE TABLE
overtime.audit_logs,
overtime.email_logs,
overtime.overtime_validations,
overtime.overtime_approval_sessions,
overtime.overtime_records,
overtime.overtime_uploads
RESTART IDENTITY CASCADE;