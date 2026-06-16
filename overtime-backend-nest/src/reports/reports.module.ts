import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
