-- Add remark, validator name, and validator device columns for overtime approval validation

ALTER TABLE overtime.overtime_records
  ADD COLUMN IF NOT EXISTS validated_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS validated_device VARCHAR(255);

ALTER TABLE overtime.overtime_validations
  ADD COLUMN IF NOT EXISTS validator_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS validator_device VARCHAR(255);
