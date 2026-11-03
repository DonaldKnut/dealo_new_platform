import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ApiKeyRateLimiter } from './api-key-rate-limiter';
import { ApiPlansService } from './api-plans.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiUsageInterceptor } from './api-usage.interceptor';

@Module({
  controllers: [ApiKeysController],
  providers: [
    ApiKeysService,
    ApiKeyRateLimiter,
    ApiPlansService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiUsageInterceptor,
    },
  ],
  exports: [ApiKeysService, ApiPlansService],
})
export class ApiKeysModule {}
