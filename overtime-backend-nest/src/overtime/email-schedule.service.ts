import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AuditLogService } from '../audit/audit-log.service';
import { ProjectRecipientsService } from '../project-recipients/project-recipients.service';
import { ApprovalEmailJobData } from './email.processor';
import { OvertimeService } from './overtime.service';
import { UpdateEmailScheduleDto } from './dto/update-email-schedule.dto';

@Injectable()
export class EmailScheduleService {
  private readonly logger = new Logger(EmailScheduleService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
    private readonly overtimeService: OvertimeService,
    private readonly projectRecipientsService: ProjectRecipientsService,
    private readonly auditLogService: AuditLogService,
    @InjectQueue('email') private readonly emailQueue: Queue<ApprovalEmailJobData>,
  ) {}

  /*
  ====================================
  GET SCHEDULE SETTINGS
  ====================================
  */
  async getSettings() {
    const result = await this.pool.query(
      `SELECT * FROM overtime.email_schedule_settings WHERE id = 1`,
    );

    return result.rows[0];
  }

  /*
  ====================================
  UPDATE SCHEDULE SETTINGS
  ====================================
  */
  async updateSettings(dto: UpdateEmailScheduleDto, updatedBy: string | null) {
    const result = await this.pool.query(
      `
      UPDATE overtime.email_schedule_settings
      SET
        enabled = $1,
        days_of_week = $2,
        hour = $3,
        minute = $4,
        timezone = COALESCE($5, timezone),
        updated_at = NOW(),
        updated_by = $6
      WHERE id = 1
      RETURNING *
      `,
      [dto.enabled, dto.daysOfWeek, dto.hour, dto.minute, dto.timezone || null, updatedBy],
    );

    return result.rows[0];
  }

  /*
  ====================================
  MARK LAST RUN DATE (cegah kirim ganda dalam hari yang sama)
  ====================================
  */
  async markLastRunDate(date: string) {
    await this.pool.query(
      `UPDATE overtime.email_schedule_settings SET last_run_date = $1 WHERE id = 1`,
      [date],
    );
  }

  /*
  ====================================
  RUN AUTO SEND
  Membuat approval session + mengirim email approval untuk
  setiap grup overtime pending yang memiliki email approver.
  ====================================
  */
  async runAutoSend() {
    const baseUrl =
      this.config.get<string>('APPROVAL_BASE_URL') || 'http://localhost:5173/approval';

    const groups = await this.overtimeService.getGroupedOvertime();

    let sentCount = 0;
    let skippedCount = 0;

    for (const group of groups) {
      const email = group.employee_email;
      const project = group.project_name;

      if (!email) {
        skippedCount++;
        continue;
      }

      const session = await this.overtimeService.createApprovalSession({
        email,
        project,
      });

      const approvalUrl = `${baseUrl}/${session.token}`;
      const referenceId = session.data?.id ?? null;

      const cc = await this.projectRecipientsService.getRecipientsByType(project, 'CC');
      const extraTo = await this.projectRecipientsService.getRecipientsByType(project, 'TO');

      await this.emailQueue.add(
        'send-approval-email',
        {
          email,
          project,
          approvalUrl,
          referenceId,
          cc,
          extraTo,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      await this.auditLogService.log(
        null,
        'AUTO_SEND_APPROVAL_EMAIL',
        'overtime_approval_sessions',
        referenceId,
      );

      sentCount++;
    }

    this.logger.log(
      `Auto send approval email selesai: ${sentCount} dikirim, ${skippedCount} dilewati (tanpa email approver)`,
    );

    return { sentCount, skippedCount, totalGroups: groups.length };
  }
}
