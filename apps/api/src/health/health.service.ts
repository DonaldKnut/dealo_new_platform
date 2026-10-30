import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<{ status: 'ok' | 'degraded'; database: 'up' | 'down'; timestamp: string }> {
    let database: 'up' | 'down' = 'up';

    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
