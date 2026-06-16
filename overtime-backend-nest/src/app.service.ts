import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Pool } from 'pg';
import { PG_POOL } from './database/database.module';

@Injectable()
export class AppService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkHealth() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status = database === 'up' && redis === 'up' ? 'ok' : 'error';

    return {
      status,
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.pool.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const client = await this.emailQueue.client;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), 2000),
      );
      const result = await Promise.race([(client as any).ping(), timeout]);
      return result === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
