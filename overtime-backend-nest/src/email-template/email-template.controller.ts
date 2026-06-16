import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuditLogService } from '../audit/audit-log.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import {
  APPROVAL_REMINDER_TEMPLATE,
  EmailTemplateService,
} from './email-template.service';

@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EmailTemplateController {
  constructor(
    private readonly emailTemplateService: EmailTemplateService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('approval-reminder')
  async getApprovalReminder() {
    const data = await this.emailTemplateService.getByName(
      APPROVAL_REMINDER_TEMPLATE,
    );
    return { success: true, data };
  }

  @Put('approval-reminder')
  async updateApprovalReminder(
    @Body() dto: UpdateEmailTemplateDto,
    @Req() req: Request,
  ) {
    const data = await this.emailTemplateService.update(
      APPROVAL_REMINDER_TEMPLATE,
      dto,
    );

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'UPDATE_EMAIL_TEMPLATE',
      'email_templates',
      null,
    );

    return { success: true, data };
  }
}
