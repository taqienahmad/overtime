import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `
      SELECT id, name, email, role, status, created_at
      FROM overtime.users
      ORDER BY id
      `,
    );

    return result.rows;
  }

  async create(dto: CreateUserDto) {
    const role = dto.role || 'WFM';
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const result = await this.pool.query(
        `
        INSERT INTO overtime.users
        (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, status, created_at
        `,
        [dto.name, dto.email, passwordHash, role],
      );

      return result.rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    const fields: string[] = [];
    const params: any[] = [];

    if (dto.name !== undefined) {
      params.push(dto.name);
      fields.push(`name = $${params.length}`);
    }
    if (dto.role !== undefined) {
      params.push(dto.role);
      fields.push(`role = $${params.length}`);
    }
    if (dto.status !== undefined) {
      params.push(dto.status);
      fields.push(`status = $${params.length}`);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const result = await this.pool.query(
      `
      UPDATE overtime.users
      SET ${fields.join(', ')}
      WHERE id = $${params.length}
      RETURNING id, name, email, role, status, created_at
      `,
      params,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return result.rows[0];
  }

  async resetPassword(id: number, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await this.pool.query(
      `
      UPDATE overtime.users
      SET password_hash = $1
      WHERE id = $2
      RETURNING id, name, email, role, status
      `,
      [passwordHash, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return { id: result.rows[0].id, email: result.rows[0].email };
  }

  private async findById(id: number) {
    const result = await this.pool.query(
      `
      SELECT id, name, email, role, status, created_at
      FROM overtime.users
      WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return result.rows[0];
  }
}
