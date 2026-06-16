import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const result = await this.auditLogService.findAll({
      userId: userId ? Number(userId) : undefined,
      action,
      from,
      to,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    return { success: true, ...result };
  }
}
