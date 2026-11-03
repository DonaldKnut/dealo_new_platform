import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import type { AuthUser } from '../auth/auth.types';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthUser }>();
    const apiKeyId = request.user?.apiKeyId;
    if (!apiKeyId) {
      return next.handle();
    }

    const started = Date.now();
    const path = (request.originalUrl ?? request.url).split('?')[0];

    const record = (statusCode: number) => {
      void this.apiKeysService
        .logUsage({
          apiKeyId,
          method: request.method,
          path,
          statusCode,
          latencyMs: Date.now() - started,
        })
        .catch(() => undefined);
    };

    return next.handle().pipe(
      tap({
        next: () => record(http.getResponse<Response>().statusCode),
        error: (error: unknown) =>
          record(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
