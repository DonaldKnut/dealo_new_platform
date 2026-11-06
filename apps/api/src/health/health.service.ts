import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type DatabaseIssue = 'network' | 'auth' | 'config' | 'unknown';

/** A safe, coarse reason for a failed ping (never the raw message, which can include hosts). */
function classify(message: string): DatabaseIssue {
  if (/server selection|timed? ?out|ENOTFOUND|ECONNREFUSED|ECONNRESET|querySrv|getaddrinfo|No available servers/i.test(message)) return 'network';
  if (/auth|bad auth|SCRAM|not authorized|password/i.test(message)) return 'auth';
  if (/environment variable|invalid.*(url|connection string)|database must be defined|URI/i.test(message)) return 'config';
  return 'unknown';
}

const HINT: Record<DatabaseIssue, string> = {
  network: 'Cannot reach the database server. Check Atlas Network Access allows this host (0.0.0.0/0) and the cluster is not paused.',
  auth: 'The database rejected the username or password in DATABASE_URL.',
  config: 'DATABASE_URL is missing or not a valid MongoDB connection string (it must include the database name).',
  unknown: 'Database ping failed. See the API logs for details.',
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<{
    service: string;
    status: 'ok' | 'degraded';
    database: 'up' | 'down';
    databaseIssue?: DatabaseIssue;
    hint?: string;
    uptimeSeconds: number;
    timestamp: string;
  }> {
    let issue: DatabaseIssue | null = null;

    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issue = classify(message);
      this.logger.error(`Database ping failed (${issue}): ${message.slice(0, 500)}`);
    }

    return {
      service: 'Dealo API',
      status: issue ? 'degraded' : 'ok',
      database: issue ? 'down' : 'up',
      ...(issue ? { databaseIssue: issue, hint: HINT[issue] } : {}),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
