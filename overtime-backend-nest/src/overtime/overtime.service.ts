import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { PG_POOL } from '../database/database.module';
import { ApprovalSessionDto } from './dto/approval-session.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ExcelService } from './excel.service';

@Injectable()
export class OvertimeService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly excelService: ExcelService,
  ) {}

  async uploadExcel(file: Express.Multer.File, uploadedBy: string) {
    const rows = this.excelService.readExcel(file.path);

    const uploadResult = await this.pool.query(
      `
      INSERT INTO overtime.overtime_uploads
      (file_name, uploaded_by)
      VALUES ($1, $2)
      RETURNING id
      `,
      [file.originalname, uploadedBy],
    );

    const uploadId = uploadResult.rows[0].id;

    let inserted = 0;

    for (const row of rows) {
      const nip = row['NIP'] ? String(row['NIP']) : null;
      let employeeEmail = row['Email Address'] || null;

      if (!employeeEmail) {
        employeeEmail = await this.findReferenceEmail(nip, row['Nama'], row['Project']);
      }

      await this.pool.query(
        `
        INSERT INTO overtime.overtime_records
        (
          employee_name,
          employee_email,
          project_name,
          overtime_hours,
          upload_id,
          billable_hours,
          non_billable_hours,
          overtime_period,
          nip
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          row['Nama'],
          employeeEmail,
          row['Project'],
          row['Total Overtime (Hours)'],
          uploadId,
          0,
          0,
          row['Periode Overtime'] || null,
          nip,
        ],
      );

      inserted++;
    }

    return {
      uploadId,
      fileName: file.originalname,
      totalRows: rows.length,
      inserted,
    };
  }

  /*
  ====================================
  FIND REFERENCE EMAIL (untuk auto-lengkapi email dari riwayat upload)
  ====================================
  */
  async findReferenceEmail(nip: string | null, employeeName: string, projectName: string) {
    const projectRecipient = await this.pool.query(
      `
      SELECT email
      FROM overtime.project_email_recipients
      WHERE project_name = $1
      AND type = 'TO'
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [projectName],
    );

    return projectRecipient.rows.length > 0 ? projectRecipient.rows[0].email : null;
  }

  /*
  ====================================
  GET PENDING OVERTIME
  ====================================
  */
  async getPendingOvertime() {
    const result = await this.pool.query(
      `
      SELECT
        id,
        nip,
        employee_name,
        employee_email,
        project_name,
        overtime_hours,
        overtime_period,
        status,
        validation_type,
        validation_remark,
        validated_at
      FROM overtime.overtime_records
      WHERE validation_type IS NULL
      ORDER BY id
      `,
    );

    return result.rows;
  }

  /*
  ====================================
  GET VALIDATED/APPROVED HISTORY
  ====================================
  */
  async getValidationHistory() {
    const result = await this.pool.query(
      `
      SELECT
        r.id,
        r.nip,
        r.employee_name,
        r.employee_email,
        r.project_name,
        r.overtime_hours,
        r.overtime_period,
        r.billable_hours,
        r.non_billable_hours,
        r.status,
        r.validation_type,
        r.validation_remark,
        r.validated_by,
        r.validated_device,
        r.validated_at,
        session.validation_method,
        session.total_billable_hours AS session_total_billable_hours,
        session.total_non_billable_hours AS session_total_non_billable_hours
      FROM overtime.overtime_records r
      LEFT JOIN LATERAL (
        SELECT validation_method, total_billable_hours, total_non_billable_hours
        FROM overtime.overtime_approval_sessions s
        WHERE s.approver_email = r.employee_email
        AND s.project_name = r.project_name
        AND s.status = 'APPROVED'
        ORDER BY s.approved_at DESC
        LIMIT 1
      ) session ON true
      WHERE r.validation_type IS NOT NULL
      ORDER BY r.validated_at DESC
      `,
    );

    return result.rows;
  }

  /*
  ====================================
  DELETE VALIDATED/APPROVED HISTORY (manual cleanup)
  ====================================
  */
  async deleteValidationHistory() {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
        DELETE FROM overtime.overtime_validations
        WHERE record_id IN (
          SELECT id FROM overtime.overtime_records
          WHERE validation_type IS NOT NULL
        )
        `,
      );

      const result = await client.query(
        `
        DELETE FROM overtime.overtime_records
        WHERE validation_type IS NOT NULL
        `,
      );

      await client.query('COMMIT');

      return { deleted: result.rowCount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /*
  ====================================
  BACKFILL EMPTY EMAIL (untuk melengkapi data lama yang belum punya email)
  ====================================
  */
  async backfillEmptyEmails() {
    // Lengkapi email kosong dari email TO project recipient
    await this.pool.query(
      `
      UPDATE overtime.overtime_records r
      SET employee_email = ref.email
      FROM (
        SELECT DISTINCT ON (project_name) project_name, email
        FROM overtime.project_email_recipients
        WHERE type = 'TO'
        ORDER BY project_name, created_at ASC
      ) ref
      WHERE r.project_name = ref.project_name
      AND (r.employee_email IS NULL OR r.employee_email = '')
      `,
    );
  }

  /*
  ====================================
  GROUP BY APPROVER EMAIL
  ====================================
  */
  async getGroupedOvertime() {
    await this.backfillEmptyEmails();

    const result = await this.pool.query(
      `
      SELECT
        r.employee_email,
        r.project_name,
        COUNT(*) AS total_members,
        SUM(r.overtime_hours) AS total_hours,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', r.id,
            'nip', r.nip,
            'employee_name', r.employee_name,
            'overtime_hours', r.overtime_hours,
            'overtime_period', r.overtime_period,
            'status', r.status,
            'validation_type', r.validation_type
          )
        ) AS members,
        latest_session.status AS last_email_status,
        latest_session.created_at AS last_email_sent_at,
        latest_session.approved_at AS last_validated_at
      FROM overtime.overtime_records r
      LEFT JOIN LATERAL (
        SELECT status, created_at, approved_at
        FROM overtime.overtime_approval_sessions s
        WHERE s.approver_email = r.employee_email
        AND s.project_name = r.project_name
        ORDER BY s.created_at DESC
        LIMIT 1
      ) latest_session ON true
      WHERE r.validation_type IS NULL
      GROUP BY
        r.employee_email,
        r.project_name,
        latest_session.status,
        latest_session.created_at,
        latest_session.approved_at
      ORDER BY r.project_name
      `,
    );

    return result.rows;
  }

  /*
  ====================================
  GET DAILY OVERTIME TREND
  ====================================
  */
  async getOvertimeTrend(days = 14) {
    const result = await this.pool.query(
      `
      SELECT
        TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(r.overtime_hours), 0) AS total_hours
      FROM generate_series(
        CURRENT_DATE - ($1::int - 1),
        CURRENT_DATE,
        '1 day'
      ) AS d(day)
      LEFT JOIN overtime.overtime_records r
        ON r.created_at::date = d.day
      GROUP BY d.day
      ORDER BY d.day
      `,
      [days],
    );

    return result.rows.map((row) => ({
      date: row.date,
      total_hours: Number(row.total_hours),
    }));
  }

  /*
  ====================================
  CREATE APPROVAL SESSION
  ====================================
  */
  async createApprovalSession(dto: ApprovalSessionDto) {
    const token = uuidv4();

    const result = await this.pool.query(
      `
      INSERT INTO overtime.overtime_approval_sessions
      (approver_email, project_name, approval_token)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [dto.email, dto.project, token],
    );

    return {
      token,
      approvalUrl: `http://localhost:3000/approval/${token}`,
      data: result.rows[0],
    };
  }

  /*
  ====================================
  GET APPROVAL DATA BY TOKEN
  ====================================
  */
  async getApprovalByToken(token: string) {
    const session = await this.pool.query(
      `
      SELECT *
      FROM overtime.overtime_approval_sessions
      WHERE approval_token = $1
      `,
      [token],
    );

    if (session.rows.length === 0) {
      throw new NotFoundException('Token tidak ditemukan');
    }

    const approval = session.rows[0];

    const records = await this.pool.query(
      `
      SELECT
        id,
        nip,
        employee_name,
        overtime_hours,
        overtime_period,
        billable_hours,
        non_billable_hours,
        status,
        validation_type,
        validation_remark,
        validated_by
      FROM overtime.overtime_records
      WHERE employee_email = $1
      AND project_name = $2
      ORDER BY id
      `,
      [approval.approver_email, approval.project_name],
    );

    return {
      project: approval.project_name,
      approver: approval.approver_email,
      status: approval.status,
      validationMethod: approval.validation_method || 'PER_NAME',
      totalBillableHours: approval.total_billable_hours,
      totalNonBillableHours: approval.total_non_billable_hours,
      members: records.rows,
    };
  }

  /*
  ====================================
  SUBMIT APPROVAL
  ====================================
  */
  async submitApproval(token: string, dto: SubmitApprovalDto) {
    const client = await this.pool.connect();

    try {
      const session = await client.query(
        `
        SELECT *
        FROM overtime.overtime_approval_sessions
        WHERE approval_token = $1
        `,
        [token],
      );

      if (session.rows.length === 0) {
        throw new NotFoundException('Token tidak ditemukan');
      }

      const approval = session.rows[0];

      await client.query('BEGIN');

      const validatorName = dto.validatorName || null;
      const validatorDevice = dto.validatorDevice || null;
      const validationMethod = dto.validationMethod || 'PER_NAME';

      if (validationMethod === 'TOTAL') {
        const totalBillable = Number(dto.totalBillableHours) || 0;
        const totalNonBillable = Number(dto.totalNonBillableHours) || 0;

        const recordsResult = await client.query(
          `
          SELECT id, overtime_hours
          FROM overtime.overtime_records
          WHERE employee_email = $1
          AND project_name = $2
          `,
          [approval.approver_email, approval.project_name],
        );

        const sumOvertime = recordsResult.rows.reduce(
          (sum, row) => sum + Number(row.overtime_hours),
          0,
        );

        if (totalBillable + totalNonBillable !== sumOvertime) {
          throw new BadRequestException(
            `Total Billable + Total Non Billable harus sama dengan total OT seluruh anggota (${sumOvertime})`,
          );
        }

        const memberById = new Map(dto.members.map((m) => [m.id, m]));

        let allocatedBillable = 0;

        recordsResult.rows.forEach((row, index) => {
          const isLast = index === recordsResult.rows.length - 1;
          const overtimeHours = Number(row.overtime_hours);

          let billable;
          if (isLast) {
            billable = totalBillable - allocatedBillable;
          } else {
            billable =
              sumOvertime > 0
                ? Math.round((overtimeHours / sumOvertime) * totalBillable)
                : 0;
            billable = Math.min(billable, overtimeHours);
            allocatedBillable += billable;
          }

          row.billable_hours = billable;
          row.non_billable_hours = overtimeHours - billable;
        });

        for (const row of recordsResult.rows) {
          const member = memberById.get(row.id);
          const remark = member?.remark || null;

          await client.query(
            `
            UPDATE overtime.overtime_records
            SET
              billable_hours = $1,
              non_billable_hours = $2,
              status = 'VALIDATED',
              validation_type = 'APPROVED',
              validation_remark = $3,
              validated_by = $4,
              validated_device = $5,
              validated_at = NOW()
            WHERE id = $6
            `,
            [row.billable_hours, row.non_billable_hours, remark, validatorName, validatorDevice, row.id],
          );

          await client.query(
            `
            INSERT INTO overtime.overtime_validations
            (record_id, validator_email, validation_status, remarks, validator_name, validator_device, validated_at)
            VALUES ($1, $2, 'APPROVED', $3, $4, $5, NOW())
            `,
            [
              row.id,
              approval.approver_email,
              remark || `Validasi metode total: Billable ${totalBillable}, Non Billable ${totalNonBillable}`,
              validatorName,
              validatorDevice,
            ],
          );
        }

        await client.query(
          `
          UPDATE overtime.overtime_approval_sessions
          SET
            status = 'APPROVED',
            approved_at = NOW(),
            validation_method = 'TOTAL',
            total_billable_hours = $1,
            total_non_billable_hours = $2
          WHERE approval_token = $3
          `,
          [totalBillable, totalNonBillable, token],
        );

        await client.query('COMMIT');

        return { message: 'Approval berhasil disubmit' };
      }

      for (const member of dto.members) {
        const { id, billable_hours, non_billable_hours, remark } = member;

        const record = await client.query(
          `
          SELECT overtime_hours
          FROM overtime.overtime_records
          WHERE id = $1
          AND employee_email = $2
          AND project_name = $3
          `,
          [id, approval.approver_email, approval.project_name],
        );

        if (record.rows.length === 0) {
          throw new NotFoundException(`Record id ${id} tidak ditemukan`);
        }

        const overtimeHours = Number(record.rows[0].overtime_hours);
        const billable = Number(billable_hours) || 0;
        const nonBillable = Number(non_billable_hours) || 0;

        if (billable + nonBillable !== overtimeHours) {
          throw new BadRequestException(
            `Billable + Non Billable harus sama dengan Overtime Hours pada record id ${id}`,
          );
        }

        await client.query(
          `
          UPDATE overtime.overtime_records
          SET
            billable_hours = $1,
            non_billable_hours = $2,
            status = 'VALIDATED',
            validation_type = 'APPROVED',
            validation_remark = $3,
            validated_by = $4,
            validated_device = $5,
            validated_at = NOW()
          WHERE id = $6
          `,
          [billable, nonBillable, remark || null, validatorName, validatorDevice, id],
        );

        await client.query(
          `
          INSERT INTO overtime.overtime_validations
          (record_id, validator_email, validation_status, remarks, validator_name, validator_device, validated_at)
          VALUES ($1, $2, 'APPROVED', $3, $4, $5, NOW())
          `,
          [
            id,
            approval.approver_email,
            remark || `Billable: ${billable}, Non Billable: ${nonBillable}`,
            validatorName,
            validatorDevice,
          ],
        );
      }

      await client.query(
        `
        UPDATE overtime.overtime_approval_sessions
        SET status = 'APPROVED', approved_at = NOW(), validation_method = 'PER_NAME'
        WHERE approval_token = $1
        `,
        [token],
      );

      await client.query('COMMIT');

      return { message: 'Approval berhasil disubmit' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /*
  ====================================
  FIND APPROVAL SESSION ID (untuk email_logs reference)
  ====================================
  */
  async findApprovalSessionId(email: string, project: string) {
    const result = await this.pool.query(
      `
      SELECT id
      FROM overtime.overtime_approval_sessions
      WHERE approver_email = $1
      AND project_name = $2
      ORDER BY id DESC
      LIMIT 1
      `,
      [email, project],
    );

    return result.rows[0] ? result.rows[0].id : null;
  }
}
