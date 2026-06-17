-- ============================================================
-- Migration: tambah kolom detail SPL ke overtime_records
-- Menyimpan semua kolom dari format Excel baru agar bisa
-- ditampilkan lengkap di halaman validasi dan download.
-- ============================================================

ALTER TABLE overtime.overtime_records
  ADD COLUMN IF NOT EXISTS job_position    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS schedule        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shift           VARCHAR(50),
  ADD COLUMN IF NOT EXISTS duty_on_before  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS duty_off_before VARCHAR(20),
  ADD COLUMN IF NOT EXISTS duration_before NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS break_after     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ot_after        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS duration_after  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS spl_total_break NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS spl_total_ot    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_duty_on  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS actual_duty_off VARCHAR(20),
  ADD COLUMN IF NOT EXISTS attendance_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS ot_calc_1_5     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ot_calc_2       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ot_calc_3       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ot_calc_4       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS spl_indeks_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS overtime_paid   NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS note            TEXT;
