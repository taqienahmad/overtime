import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import * as XLSX from 'xlsx';
import { PG_POOL } from '../database/database.module';
import { CreateProjectRecipientDto } from './dto/create-project-recipient.dto';

export const RECIPIENT_TEMPLATE_HEADERS = ['Project Name', 'Email', 'Type'];

@Injectable()
export class ProjectRecipientsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `
      SELECT id, project_name, email, type, created_at
      FROM overtime.project_email_recipients
      ORDER BY project_name, type, email
      `,
    );

    return result.rows;
  }

  async findByProject(projectName: string) {
    const result = await this.pool.query(
      `
      SELECT id, project_name, email, type, created_at
      FROM overtime.project_email_recipients
      WHERE project_name = $1
      ORDER BY type, email
      `,
      [projectName],
    );

    return result.rows;
  }

  async create(dto: CreateProjectRecipientDto) {
    await this.pool.query(
      `INSERT INTO overtime.projects (project_name)
       VALUES ($1)
       ON CONFLICT (project_name) DO NOTHING`,
      [dto.project_name],
    );

    try {
      const result = await this.pool.query(
        `
        INSERT INTO overtime.project_email_recipients
        (project_name, email, type)
        VALUES ($1, $2, $3)
        RETURNING id, project_name, email, type, created_at
        `,
        [dto.project_name, dto.email, dto.type],
      );

      return result.rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Email sudah terdaftar untuk project & tipe ini');
      }
      throw err;
    }
  }

  async remove(id: number) {
    await this.pool.query(
      `DELETE FROM overtime.project_email_recipients WHERE id = $1`,
      [id],
    );

    return { deleted: id };
  }

  /*
  ====================================
  GENERATE EXCEL TEMPLATE (download)
  ====================================
  */
  generateTemplate(): Buffer {
    const sampleRows = [
      { 'Project Name': 'Project A', Email: 'abd@email.com', Type: 'TO' },
      { 'Project Name': 'Project A', Email: 'asd@email.com', Type: 'CC' },
      { 'Project Name': 'Project A', Email: 'adf@email.com', Type: 'CC' },
      { 'Project Name': 'Project A', Email: 'dgrg@email.com', Type: 'CC' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, {
      header: RECIPIENT_TEMPLATE_HEADERS,
    });
    worksheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipients');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /*
  ====================================
  BULK IMPORT FROM EXCEL
  ====================================
  */
  async bulkImport(filePath: string) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
    });

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const projectName = String(row['Project Name'] ?? '').trim();
      const email = String(row['Email'] ?? '').trim();
      const type = String(row['Type'] ?? '').trim().toUpperCase();

      if (!projectName || !email || !type) {
        errors.push(`Baris ${rowNum}: Project Name, Email, dan Type wajib diisi`);
        continue;
      }

      if (type !== 'TO' && type !== 'CC') {
        errors.push(`Baris ${rowNum}: Type harus TO atau CC (ditemukan "${type}")`);
        continue;
      }

      try {
        await this.pool.query(
          `
          INSERT INTO overtime.projects (project_name)
          VALUES ($1)
          ON CONFLICT (project_name) DO NOTHING
          `,
          [projectName],
        );

        const result = await this.pool.query(
          `
          INSERT INTO overtime.project_email_recipients
          (project_name, email, type)
          VALUES ($1, $2, $3)
          ON CONFLICT (project_name, email, type) DO NOTHING
          RETURNING id
          `,
          [projectName, email, type],
        );

        if (result.rows.length > 0) {
          inserted++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        errors.push(`Baris ${rowNum}: ${err.message}`);
      }
    }

    return { inserted, skipped, errors };
  }

  /*
  ====================================
  Helper untuk EmailService: ambil daftar
  TO tambahan & CC untuk satu project
  ====================================
  */
  async getRecipientsByType(projectName: string, type: 'TO' | 'CC') {
    const result = await this.pool.query(
      `
      SELECT email
      FROM overtime.project_email_recipients
      WHERE project_name = $1 AND type = $2
      `,
      [projectName, type],
    );

    return result.rows.map((row) => row.email);
  }
}
