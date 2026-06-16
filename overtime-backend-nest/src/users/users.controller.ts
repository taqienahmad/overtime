import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuditLogService } from '../audit/audit-log.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async findAll() {
    const data = await this.usersService.findAll();
    return { success: true, total: data.length, data };
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: Request) {
    const data = await this.usersService.create(dto);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'CREATE_USER',
      'users',
      data.id,
    );

    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const data = await this.usersService.update(Number(id), dto);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'UPDATE_USER',
      'users',
      data.id,
    );

    return { success: true, data };
  }

  @Patch(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const result = await this.usersService.resetPassword(Number(id), dto.password);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'RESET_PASSWORD',
      'users',
      result.id,
    );

    return { success: true, message: 'Password berhasil direset' };
  }
}
