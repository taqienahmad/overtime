import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ProjectRecipientsController } from './project-recipients.controller';
import { ProjectRecipientsService } from './project-recipients.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ProjectRecipientsController],
  providers: [ProjectRecipientsService],
  exports: [ProjectRecipientsService],
})
export class ProjectRecipientsModule {}
