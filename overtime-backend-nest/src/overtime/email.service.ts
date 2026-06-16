import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  APPROVAL_REMINDER_TEMPLATE,
  EmailTemplateService,
} from '../email-template/email-template.service';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendApprovalEmail(
    email: string,
    project: string,
    approvalUrl: string,
    referenceId: number | null,
    cc?: string[],
    extraTo?: string[],
  ) {
    const template = await this.emailTemplateService.getByName(
      APPROVAL_REMINDER_TEMPLATE,
    );

    const subject = template.subject.replace(/{Project Name}/g, project);

    const bodyText = template.body
      .replace(/{Project Name}/g, project)
      .replace(/{Approval Link}/g, approvalUrl);

    const html = bodyText
      .split('\n')
      .map((line: string) => line || '<br>')
      .join('<br>');

    const to = [email, ...(extraTo || [])].join(', ');
    const ccList = (cc || []).join(', ') || undefined;
    const recipientLog = [to, ccList].filter(Boolean).join('; CC: ');

    try {
      const result = await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_USER'),
        to,
        cc: ccList,
        subject,
        html,
      });

      await this.pool.query(
        `
        INSERT INTO overtime.email_logs
        (recipient, subject, status, reference_id)
        VALUES ($1, $2, 'SENT', $3)
        `,
        [recipientLog, subject, referenceId],
      );

      return result;
    } catch (err: any) {
      await this.pool.query(
        `
        INSERT INTO overtime.email_logs
        (recipient, subject, status, error_message, reference_id)
        VALUES ($1, $2, 'FAILED', $3, $4)
        `,
        [recipientLog, subject, err.message, referenceId],
      );

      throw err;
    }
  }
}
