import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { API_SCOPES } from '@dealo/shared';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      { path: 'api/openapi.json', method: RequestMethod.GET },
    ],
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  const corsOrigin = config.getOrThrow<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const apiUrl = config.get<string>('API_URL') ?? 'http://localhost:4000';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dealo API')
    .setDescription(
      [
        'Commercial hiring API for office talent and skilled trades.',
        '',
        '## Authentication',
        '- **Dashboard / staff:** HTTP-only cookie `access_token` (login via `/api/v1/auth/login`).',
        '- **Partners:** `Authorization: Bearer dk_live_…` or `dk_test_…` API key.',
        '- **Partners (OAuth2):** client-credentials at `POST /api/v1/oauth/token`, then `Authorization: Bearer <access_token>` (1 hour).',
        '- **Self-serve sandbox:** employers create `dk_test_` keys in Dashboard → Developer API.',
        '',
        '## Scopes (API keys)',
        '- `hire-inquiries:read` / `hire-inquiries:write`',
        '- `candidates:read`',
        '- `blog:read`',
        '- `health:read`',
        '',
        'API keys are issued by Dealo admins. Contact sales for partner or enterprise plans.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .setContact('Dealo API', 'https://dealo.com', 'api@dealo.com')
    .addServer(apiUrl, 'Current environment')
    .addServer('http://localhost:4000', 'Local development')
    .addCookieAuth('access_token')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Partner API key (`dk_live_…` or `dk_test_…`)',
      },
      'api_key',
    )
    .addOAuth2(
      {
        type: 'oauth2',
        description: 'OAuth2 client credentials; tokens carry the backing API key scopes.',
        flows: {
          clientCredentials: {
            tokenUrl: `${apiUrl}/api/v1/oauth/token`,
            scopes: Object.fromEntries(API_SCOPES.map((scope) => [scope, scope])),
          },
        },
      },
      'oauth2',
    )
    .addTag('health', 'Liveness and dependency checks')
    .addTag('oauth', 'OAuth2 client credentials')
    .addTag('auth', 'User authentication')
    .addTag('hire-inquiries', 'Hiring intake and pipeline')
    .addTag('api-keys', 'Partner API key administration')
    .addTag('webhooks', 'Signed outbound event delivery')
    .addTag('billing', 'API plans, Paystack checkout and invoices')
    .addTag('blog', 'Public content')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Dealo API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      displayRequestDuration: true,
    },
  });

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/api/openapi.json', (_req: unknown, res: { type: (t: string) => void; json: (b: unknown) => void }) => {
    res.type('application/json');
    res.json(document);
  });

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`API listening on port ${port}`);
  logger.log(`Swagger UI: ${apiUrl}/api/docs`);
  logger.log(`OpenAPI JSON: ${apiUrl}/api/openapi.json`);
}

void bootstrap();
