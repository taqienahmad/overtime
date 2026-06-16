-- Add overtime period column (e.g. "01-15 Juni 2026") per record

ALTER TABLE overtime.overtime_records
  ADD COLUMN IF NOT EXISTS overtime_period VARCHAR(100);
