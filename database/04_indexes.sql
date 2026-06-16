CREATE INDEX idx_employee_email
ON overtime.overtime_records(employee_email);

CREATE INDEX idx_project_name
ON overtime.overtime_records(project_name);

CREATE INDEX idx_approval_token
ON overtime.overtime_approval_sessions(approval_token);