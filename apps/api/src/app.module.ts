import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { CandidatesModule } from './candidates/candidates.module';
import { CommonModule } from './common/common.module';
import { validateEnv } from './config/env.validation';
import { ContactModule } from './contact/contact.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { HireInquiryModule } from './hire-inquiry/hire-inquiry.module';
import { MailModule } from './mail/mail.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { PrismaModule } from './prisma/prisma.module';
import { RootModule } from './root/root.module';
import { SupportModule } from './support/support.module';
import { TalentModule } from './talent/talent.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.txt'],
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
    RootModule,
    HealthModule,
    UsersModule,
    AuthModule,
    HireInquiryModule,
    DashboardModule,
    ContactModule,
    BlogModule,
    CandidatesModule,
    NewsletterModule,
    TalentModule,
    AuditModule,
    SupportModule,
    MailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
