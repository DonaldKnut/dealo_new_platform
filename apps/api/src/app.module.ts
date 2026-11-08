import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AiModule } from './ai/ai.module';
import { AssistantModule } from './assistant/assistant.module';
import { AtsModule } from './ats/ats.module';
import { HiringAgentsModule } from './hiring-agents/hiring-agents.module';
import { JobBoardModule } from './job-board/job-board.module';
import { ResumesModule } from './resumes/resumes.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
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
import { MediaModule } from './media/media.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { OpsModule } from './ops/ops.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RootModule } from './root/root.module';
import { SupportModule } from './support/support.module';
import { TalentModule } from './talent/talent.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // apps/api/.env wins; the monorepo root .env fills in anything it leaves out.
      envFilePath: ['.env', '.env.local', '.env.txt', '../../.env'],
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
    PaymentsModule,
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
    MediaModule,
    ApiKeysModule,
    WebhooksModule,
    BillingModule,
    OpsModule,
    AiModule,
    AtsModule,
    ResumesModule,
    JobBoardModule,
    HiringAgentsModule,
    AssistantModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
