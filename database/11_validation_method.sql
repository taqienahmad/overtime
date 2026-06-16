-- Support two validation methods: PER_NAME (existing) and TOTAL (aggregate billable/non-billable)

ALTER TABLE overtime.overtime_approval_sessions
  ADD COLUMN IF NOT EXISTS validation_method VARCHAR(20) DEFAULT 'PER_NAME',
  ADD COLUMN IF NOT EXISTS total_billable_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS total_non_billable_hours NUMERIC;
