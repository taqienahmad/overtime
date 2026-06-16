import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request, Response } from 'express';
import { AuditLogService } from '../audit/audit-log.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProjectRecipientDto } from './dto/create-project-recipient.dto';
import { ProjectRecipientsService } from './project-recipients.service';

@Controller('project-recipients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ProjectRecipientsController {
  constructor(
    private readonly projectRecipientsService: ProjectRecipientsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async findAll(@Query('project') project?: string) {
    const data = project
      ? await this.projectRecipientsService.findByProject(project)
      : await this.projectRecipientsService.findAll();

    return { success: true, total: data.length, data };
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = this.projectRecipientsService.generateTemplate();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="project_recipients_template.xlsx"',
    });

    res.send(buffer);
  }

  @Post('bulk-upload')
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
  async bulkUpload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    const result = await this.projectRecipientsService.bulkImport(file.path);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'BULK_IMPORT_PROJECT_RECIPIENTS',
      'project_email_recipients',
      null,
    );

    return { success: true, ...result };
  }

  @Post()
  async create(@Body() dto: CreateProjectRecipientDto, @Req() req: Request) {
    const data = await this.projectRecipientsService.create(dto);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'CREATE_PROJECT_RECIPIENT',
      'project_email_recipients',
      data.id,
    );

    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const result = await this.projectRecipientsService.remove(id);

    await this.auditLogService.log(
      (req as any).user?.id ?? null,
      'DELETE_PROJECT_RECIPIENT',
      'project_email_recipients',
      id,
    );

    return { success: true, ...result };
  }
}
