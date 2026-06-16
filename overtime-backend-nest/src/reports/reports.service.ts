import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { PG_POOL } from '../database/database.module';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class ReportsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getSummary(from?: string, to?: string) {
    const conditions: string[] = [];
    const params: string[] = [];

    if (from) {
      params.push(from);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`created_at <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `
      SELECT
        COUNT(*) AS total_records,
        COUNT(*) FILTER (WHERE validation_type IS NULL) AS pending_count,
        COUNT(*) FILTER (WHERE validation_type IS NOT NULL) AS validated_count,
        COUNT(*) FILTER (WHERE validation_type = 'APPROVED') AS approved_count,
        COALESCE(SUM(overtime_hours), 0) AS total_overtime_hours,
        COALESCE(SUM(billable_hours), 0) AS total_billable_hours,
        COALESCE(SUM(non_billable_hours), 0) AS total_non_billable_hours,
        ROUND(
          COALESCE(SUM(billable_hours), 0)
          / NULLIF(SUM(overtime_hours), 0) * 100,
          2
        ) AS billable_percentage
      FROM overtime.overtime_records
      ${where}
      `,
      params,
    );

    return result.rows[0];
  }

  async getByProject(from?: string, to?: string) {
    const conditions: string[] = [];
    const params: string[] = [];

    if (from) {
      params.push(from);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`created_at <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `
      SELECT
        project_name,
        COUNT(*) AS total_records,
        COUNT(*) FILTER (WHERE validation_type IS NULL) AS pending_count,
        COUNT(*) FILTER (WHERE validation_type IS NOT NULL) AS validated_count,
        COALESCE(SUM(overtime_hours), 0) AS total_overtime_hours,
        COALESCE(SUM(billable_hours), 0) AS total_billable_hours,
        COALESCE(SUM(non_billable_hours), 0) AS total_non_billable_hours,
        ROUND(
          COALESCE(SUM(billable_hours), 0)
          / NULLIF(SUM(overtime_hours), 0) * 100,
          2
        ) AS billable_percentage
      FROM overtime.overtime_records
      ${where}
      GROUP BY project_name
      ORDER BY project_name
      `,
      params,
    );

    return result.rows;
  }

  async getEmailLogs() {
    const stats = await this.pool.query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'SENT') AS sent_count,
        COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_count
      FROM overtime.email_logs
      `,
    );

    const recent = await this.pool.query(
      `
      SELECT id, recipient, subject, status, error_message, reference_id, sent_at
      FROM overtime.email_logs
      ORDER BY sent_at DESC
      LIMIT 20
      `,
    );

    return { stats: stats.rows[0], recent: recent.rows };
  }

  async getStorage() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      return { totalFiles: 0, totalSizeBytes: 0, files: [] };
    }

    const fileNames = fs.readdirSync(UPLOADS_DIR).filter((name) => !name.startsWith('.'));

    const files = fileNames.map((name) => {
      const stats = fs.statSync(path.join(UPLOADS_DIR, name));
      return {
        name,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime,
      };
    });

    const totalSizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    return { totalFiles: files.length, totalSizeBytes, files };
  }

  deleteStorageFile(fileName: string) {
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
      throw new NotFoundException('File tidak ditemukan');
    }

    const filePath = path.join(UPLOADS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File tidak ditemukan');
    }

    fs.unlinkSync(filePath);

    return { deleted: fileName };
  }

  /*
  ====================================
  RESET TRANSACTIONAL DATA (ADMIN, password-verified)
  ====================================
  */
  async resetTransactionalData(userId: number, password: string) {
    const result = await this.pool.query(
      `SELECT password_hash FROM overtime.users WHERE id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      throw new UnauthorizedException('Password salah');
    }

    await this.pool.query(
      `
      TRUNCATE TABLE
        overtime.audit_logs,
        overtime.email_logs,
        overtime.overtime_validations,
        overtime.overtime_approval_sessions,
        overtime.overtime_records,
        overtime.overtime_uploads
      RESTART IDENTITY CASCADE
      `,
    );

    return { message: 'Data transaksi berhasil dibersihkan' };
  }

  async getUploads() {
    const result = await this.pool.query(
      `
      SELECT
        u.id,
        u.file_name,
        u.uploaded_by,
        u.uploaded_at,
        COUNT(r.id) AS total_records
      FROM overtime.overtime_uploads u
      LEFT JOIN overtime.overtime_records r ON r.upload_id = u.id
      GROUP BY u.id, u.file_name, u.uploaded_by, u.uploaded_at
      ORDER BY u.uploaded_at DESC
      `,
    );

    return result.rows;
  }
}
