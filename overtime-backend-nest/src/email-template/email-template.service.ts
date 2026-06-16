import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

export const APPROVAL_REMINDER_TEMPLATE = 'approval_reminder';

@Injectable()
export class EmailTemplateService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getByName(name: string) {
    const result = await this.pool.query(
      `
      SELECT name, subject, body, updated_at
      FROM overtime.email_templates
      WHERE name = $1
      `,
      [name],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Template tidak ditemukan');
    }

    return result.rows[0];
  }

  async update(name: string, dto: UpdateEmailTemplateDto) {
    const result = await this.pool.query(
      `
      UPDATE overtime.email_templates
      SET subject = $1, body = $2, updated_at = NOW()
      WHERE name = $3
      RETURNING name, subject, body, updated_at
      `,
      [dto.subject, dto.body, name],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Template tidak ditemukan');
    }

    return result.rows[0];
  }
}
