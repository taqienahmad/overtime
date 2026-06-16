import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EmailTemplateModule } from './email-template/email-template.module';
import { OvertimeModule } from './overtime/overtime.module';
import { ProjectRecipientsModule } from './project-recipients/project-recipients.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'email' }),
    DatabaseModule,
    AuthModule,
    AuditModule,
    EmailTemplateModule,
    OvertimeModule,
    ProjectRecipientsModule,
    ReportsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
