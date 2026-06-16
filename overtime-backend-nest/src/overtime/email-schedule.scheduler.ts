import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailScheduleService } from './email-schedule.service';

@Injectable()
export class EmailScheduleScheduler {
  private readonly logger = new Logger(EmailScheduleScheduler.name);

  constructor(private readonly emailScheduleService: EmailScheduleService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const settings = await this.emailScheduleService.getSettings();

    if (!settings?.enabled) return;

    const timezone = settings.timezone || 'Asia/Jakarta';
    const now = new Date();

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(now);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value;
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    const day = dayNames.indexOf(weekdayPart || '');

    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);

    if (!settings.days_of_week.includes(day)) return;
    if (hour !== settings.hour || minute !== settings.minute) return;

    const lastRunDate = settings.last_run_date
      ? new Date(settings.last_run_date).toISOString().slice(0, 10)
      : null;

    if (lastRunDate === todayDateStr) return;

    this.logger.log(`Menjalankan auto send approval email terjadwal (${todayDateStr} ${hour}:${minute} ${timezone})`);

    await this.emailScheduleService.markLastRunDate(todayDateStr);
    await this.emailScheduleService.runAutoSend();
  }
}
