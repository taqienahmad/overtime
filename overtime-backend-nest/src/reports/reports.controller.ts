import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuditLogService } from '../audit/audit-log.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ResetDatabaseDto } from './dto/reset-database.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('summary')
  async getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.reportsService.getSummary(from, to);
    return { success: true, data };
  }

  @Get('by-project')
  async getByProject(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.reportsService.getByProject(from, to);
    return { success: true, total: data.length, data };
  }

  @Get('email-logs')
  async getEmailLogs() {
    const data = await this.reportsService.getEmailLogs();
    return { success: true, ...data };
  }

  @Get('uploads')
  async getUploads() {
    const data = await this.reportsService.getUploads();
    return { success: true, total: data.length, data };
  }

  @Get('storage')
  async getStorage() {
    const data = await this.reportsService.getStorage();
    return { success: true, ...data };
  }

  @Post('reset-database')
  async resetDatabase(@Body() dto: ResetDatabaseDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    const result = await this.reportsService.resetTransactionalData(
      userId,
      dto.password,
    );

    await this.auditLogService.log(
      userId ?? null,
      'RESET_TRANSACTIONAL_DATA',
    );

    return { success: true, ...result };
  }

  @Delete('storage/:fileName')
  async deleteStorageFile(@Param('fileName') fileName: string, @Req() req: Request) {
    const result = this.reportsService.deleteStorageFile(fileName);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'DELETE_STORAGE_FILE',
      'uploads',
      null,
    );

    return { success: true, ...result };
  }
}
