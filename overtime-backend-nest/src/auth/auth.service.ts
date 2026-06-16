import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { AuditLogService } from '../audit/audit-log.service';
import { PG_POOL } from '../database/database.module';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto) {
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

  async login(dto: LoginDto) {
    const result = await this.pool.query(
      `
      SELECT id, name, email, password_hash, role, status
      FROM overtime.users
      WHERE email = $1
      `,
      [dto.email],
    );

    const user = result.rows[0];

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Email atau password salah');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await this.auditLogService.log(user.id, 'LOGIN', 'users', user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
