import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { validateEnv } from './config/env.validation';
import { ContactModule } from './contact/contact.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { HireInquiryModule } from './hire-inquiry/hire-inquiry.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    CommonModule,
    EmailModule,
    HealthModule,
    UsersModule,
    AuthModule,
    HireInquiryModule,
    DashboardModule,
    ContactModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
