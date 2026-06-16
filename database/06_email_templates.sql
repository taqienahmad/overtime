-- ============================================================
-- Migration: email_templates
-- Tujuan: menyimpan subject & body email reminder validasi
--         overtime (billable / non-billable) yang dapat diedit
--         melalui halaman Email Template
-- ============================================================

CREATE TABLE IF NOT EXISTS overtime.email_templates (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    subject    TEXT NOT NULL,
    body       TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO overtime.email_templates (name, subject, body)
VALUES (
    'approval_reminder',
    'Overtime Validation for Project {Project Name}',
    E'Dear Teams,\n\nThis is a reminder that overtime records for your project have been submitted and require your validation.\n\nProject: {Project Name}\n\nAs part of the overtime review process, please validate each overtime entry and determine whether the hours should be categorized as:\n\n• Billable Hours\nOvertime hours that can be charged to the client based on project activities, deliverables, or approved client-related work.\n\n• Non-Billable Hours\nOvertime hours that cannot be charged to the client, such as internal meetings, administrative tasks, training, knowledge transfer, rework, or other internal activities.\n\nPlease access the approval portal using the link below:\n\n{Approval Link}\n\nInstructions:\n\nReview each team member''s overtime hours.\nEnter the number of Billable Hours.\nEnter the number of Non-Billable Hours.\n\nEnsure:\n\nBillable Hours + Non-Billable Hours = Total Overtime Hours\n\nSubmit the validation once all records have been reviewed.\n\nImportant:\n\n• Approval is required for overtime reporting and client billing purposes.\n• Unvalidated records may delay overtime processing and billing activities.\n• This approval link is unique to your project and should not be shared.\n\nIf you have any questions regarding the overtime records, please contact the Workforce Management Team.\n\nThank you for your cooperation.\n\nBest Regards,\n\nWorkforce Management Team\nOvertime Approval System'
)
ON CONFLICT (name) DO NOTHING;
