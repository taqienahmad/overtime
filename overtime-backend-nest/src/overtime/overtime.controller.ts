import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request, Response } from 'express';
import { ExcelService } from './excel.service';
import { AuditLogService } from '../audit/audit-log.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApprovalSessionDto } from './dto/approval-session.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ProjectRecipientsService } from '../project-recipients/project-recipients.service';
import { ApprovalEmailJobData } from './email.processor';
import { OvertimeService } from './overtime.service';

@Controller('overtime')
export class OvertimeController {
  constructor(
    private readonly overtimeService: OvertimeService,
    private readonly auditLogService: AuditLogService,
    private readonly projectRecipientsService: ProjectRecipientsService,
    private readonly excelService: ExcelService,
    @InjectQueue('email') private readonly emailQueue: Queue<ApprovalEmailJobData>,
  ) {}

  @Get('upload-template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async downloadUploadTemplate(@Res() res: Response) {
    const buffer = this.excelService.generateUploadTemplate();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="overtime_upload_template.xlsx"',
    });

    res.send(buffer);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async uploadExcel(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    const uploadedBy = (req as any).user?.email || 'ADMIN';

    const result = await this.overtimeService.uploadExcel(file, uploadedBy);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'UPLOAD_EXCEL',
      'overtime_uploads',
      result.uploadId ?? null,
    );

    return { success: true, ...result };
  }

  /*
  ====================================
  GET PENDING
  ====================================
  */
  @Get('pending')
  @UseGuards(JwtAuthGuard)
  async getPending() {
    const data = await this.overtimeService.getPendingOvertime();
    return { success: true, total: data.length, data };
  }

  /*
  ====================================
  GROUPED BY EMAIL
  ====================================
  */
  @Get('grouped')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getGrouped() {
    const data = await this.overtimeService.getGroupedOvertime();
    return { success: true, totalGroups: data.length, data };
  }

  /*
  ====================================
  DAILY OVERTIME TREND
  ====================================
  */
  @Get('trend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getTrend(@Query('days') days?: string) {
    const parsedDays = Number(days) || 14;
    const data = await this.overtimeService.getOvertimeTrend(parsedDays);
    return { success: true, data };
  }

  /*
  ====================================
  VALIDATION HISTORY (ARCHIVE)
  ====================================
  */
  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getHistory() {
    const data = await this.overtimeService.getValidationHistory();
    return { success: true, total: data.length, data };
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteHistory(@Req() req: Request) {
    const result = await this.overtimeService.deleteValidationHistory();

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'DELETE_HISTORY',
      'overtime_records',
      null,
    );

    return { success: true, ...result };
  }

  /*
  ====================================
  CREATE APPROVAL SESSION
  ====================================
  */
  @Post('approval-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createApprovalSession(@Body() dto: ApprovalSessionDto, @Req() req: Request) {
    const result = await this.overtimeService.createApprovalSession(dto);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'CREATE_APPROVAL_SESSION',
      'overtime_approval_sessions',
      result.data?.id ?? null,
    );

    return { success: true, ...result };
  }

  /*
  ====================================
  SEND APPROVAL EMAIL
  ====================================
  */
  @Post('send-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async sendApprovalEmail(@Body() dto: SendEmailDto, @Req() req: Request) {
    const referenceId = await this.overtimeService.findApprovalSessionId(
      dto.email,
      dto.project,
    );

    const cc = await this.projectRecipientsService.getRecipientsByType(
      dto.project,
      'CC',
    );

    const extraTo = await this.projectRecipientsService.getRecipientsByType(
      dto.project,
      'TO',
    );

    await this.emailQueue.add(
      'send-approval-email',
      {
        email: dto.email,
        project: dto.project,
        approvalUrl: dto.approvalUrl,
        referenceId,
        cc,
        extraTo,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'SEND_APPROVAL_EMAIL',
      'overtime_approval_sessions',
      referenceId,
    );

    return { success: true, message: 'Email sedang diproses di background' };
  }

  /*
  ====================================
  GET APPROVAL DATA BY TOKEN (public)
  ====================================
  */
  @Get('approval/:token')
  async getApprovalByToken(@Param('token') token: string) {
    const data = await this.overtimeService.getApprovalByToken(token);
    return { success: true, ...data };
  }

  /*
  ====================================
  SUBMIT APPROVAL (public, token-based)
  ====================================
  */
  @Post('approval-submit/:token')
  async submitApproval(
    @Param('token') token: string,
    @Body() dto: SubmitApprovalDto,
  ) {
    const result = await this.overtimeService.submitApproval(token, dto);

    await this.auditLogService.log(
      null,
      'SUBMIT_APPROVAL',
      'overtime_approval_sessions',
      null,
    );

    return { success: true, ...result };
  }
}
