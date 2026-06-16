import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EmailTemplateModule } from '../email-template/email-template.module';
import { ProjectRecipientsModule } from '../project-recipients/project-recipients.module';
import { EmailScheduleController } from './email-schedule.controller';
import { EmailScheduleScheduler } from './email-schedule.scheduler';
import { EmailScheduleService } from './email-schedule.service';
import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';
import { ExcelService } from './excel.service';
import { OvertimeController } from './overtime.controller';
import { OvertimeService } from './overtime.service';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    EmailTemplateModule,
    ProjectRecipientsModule,
    BullModule.registerQueue({ name: 'email' }),
  ],
  controllers: [OvertimeController, EmailScheduleController],
  providers: [
    OvertimeService,
    ExcelService,
    EmailService,
    EmailProcessor,
    EmailScheduleService,
    EmailScheduleScheduler,
  ],
})
export class OvertimeModule {}
