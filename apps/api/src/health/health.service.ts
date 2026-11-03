import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<{
    service: string;
    status: 'ok' | 'degraded';
    database: 'up' | 'down';
    uptimeSeconds: number;
    timestamp: string;
  }> {
    let database: 'up' | 'down' = 'up';

    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
    } catch {
      database = 'down';
    }

    return {
      service: 'Dealo API',
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
