import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class AuditLogService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async log(
    userId: number | null,
    action: string,
    referenceTable?: string,
    referenceId?: number | null,
  ) {
    await this.pool.query(
      `
      INSERT INTO overtime.audit_logs
      (user_id, action, reference_table, reference_id)
      VALUES ($1, $2, $3, $4)
      `,
      [userId, action, referenceTable || null, referenceId ?? null],
    );
  }

  async findAll(filters: {
    userId?: number;
    action?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.userId) {
      params.push(filters.userId);
      conditions.push(`a.user_id = $${params.length}`);
    }
    if (filters.action) {
      params.push(filters.action);
      conditions.push(`a.action = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`a.created_at >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`a.created_at <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM overtime.audit_logs a ${where}`,
      params,
    );

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit);
    params.push(offset);

    const dataResult = await this.pool.query(
      `
      SELECT
        a.id,
        a.user_id,
        u.name AS user_name,
        u.email AS user_email,
        a.action,
        a.reference_table,
        a.reference_id,
        a.created_at
      FROM overtime.audit_logs a
      LEFT JOIN overtime.users u ON u.id = a.user_id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );

    return {
      total: Number(countResult.rows[0].count),
      page: filters.page,
      limit: filters.limit,
      data: dataResult.rows,
    };
  }
}
