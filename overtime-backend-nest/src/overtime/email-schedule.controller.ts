import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuditLogService } from '../audit/audit-log.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateEmailScheduleDto } from './dto/update-email-schedule.dto';
import { EmailScheduleService } from './email-schedule.service';

@Controller('overtime/email-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EmailScheduleController {
  constructor(
    private readonly emailScheduleService: EmailScheduleService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async getSettings() {
    const data = await this.emailScheduleService.getSettings();
    return { success: true, data };
  }

  @Put()
  async updateSettings(@Body() dto: UpdateEmailScheduleDto, @Req() req: Request) {
    const updatedBy = (req as any).user?.email || null;
    const data = await this.emailScheduleService.updateSettings(dto, updatedBy);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'UPDATE_EMAIL_SCHEDULE',
      'email_schedule_settings',
      data.id,
    );

    return { success: true, data };
  }

  @Post('run-now')
  async runNow(@Req() req: Request) {
    const result = await this.emailScheduleService.runAutoSend();

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'MANUAL_RUN_AUTO_SEND',
      'overtime_approval_sessions',
      null,
    );

    return { success: true, ...result };
  }
}
