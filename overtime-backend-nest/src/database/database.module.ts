import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          database: config.get<string>('DB_NAME'),
          user: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
