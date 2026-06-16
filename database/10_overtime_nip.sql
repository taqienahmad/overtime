-- Add NIP (employee ID number) column per record

ALTER TABLE overtime.overtime_records
  ADD COLUMN IF NOT EXISTS nip VARCHAR(50);
