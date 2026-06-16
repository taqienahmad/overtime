import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EmailTemplateController } from './email-template.controller';
import { EmailTemplateService } from './email-template.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [EmailTemplateController],
  providers: [EmailTemplateService],
  exports: [EmailTemplateService],
})
export class EmailTemplateModule {}
