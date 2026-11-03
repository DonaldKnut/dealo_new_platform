import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/public.decorator';

@ApiTags('root')
@Controller()
export class RootController {
  @Public()
  @Get()
  @ApiOkResponse({ description: 'API service metadata' })
  getRoot() {
    return {
      service: 'Dealo API',
      product: 'Dealo recruitment & managed staffing platform',
      status: 'online',
      version: '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      authentication: {
        cookie: 'access_token (dashboard users)',
        apiKey: 'Authorization: Bearer dk_live_… | dk_test_…',
      },
      endpoints: {
        health: '/health',
        docs: '/api/docs',
        openapi: '/api/openapi.json',
        apiBase: '/api/v1',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
