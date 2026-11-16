/**
 * One-shot: ensure Mongo org docs have verificationStatus (existing rows start UNVERIFIED).
 * In-house Dealo workspace is marked VERIFIED so staff publishing is not blocked.
 */
import { OrgVerificationStatus, PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(): void {
  for (const envPath of [resolve(__dirname, '../.env'), resolve(__dirname, '../.env.txt')]) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const prisma = new PrismaClient();

async function main() {
  // Required enums do not expose isSet in Prisma filters — use Mongo $exists.
  const missing = await prisma.$runCommandRaw({
    update: 'Organization',
    updates: [
      {
        q: { verificationStatus: { $exists: false } },
        u: { $set: { verificationStatus: OrgVerificationStatus.UNVERIFIED } },
        multi: true,
      },
    ],
  });
  console.log('Backfill UNVERIFIED raw result:', JSON.stringify(missing));

  const dealo = await prisma.organization.updateMany({
    where: { slug: 'dealo' },
    data: {
      verificationStatus: OrgVerificationStatus.VERIFIED,
      workEmail: 'hello@dealonetwork.com',
      workEmailVerifiedAt: new Date(),
      workEmailVerifyToken: null,
      verificationReviewedAt: new Date(),
      verificationNote: 'In-house Dealo workspace',
    },
  });
  console.log(`Dealo workspace verified: ${dealo.count}`);

  const counts = await prisma.organization.groupBy({
    by: ['verificationStatus'],
    _count: { _all: true },
  });
  console.log('By status:', counts);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
