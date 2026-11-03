import { BadRequestException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

export const SIGNATURE_HEADER = 'X-Dealo-Signature';

export function generateWebhookSecret() {
  return `whsec_${randomBytes(32).toString('base64url')}`;
}

/** Header value `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. */
export function signWebhookPayload(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const lower = address.toLowerCase();
  if (lower.startsWith('::ffff:')) {
    return isPrivateAddress(lower.slice('::ffff:'.length));
  }
  return (
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  );
}

/**
 * Rejects non-HTTP(S) URLs everywhere. In production, also requires HTTPS and
 * refuses hosts that are, or resolve to, private/loopback/link-local addresses.
 */
export async function assertSafeWebhookUrl(rawUrl: string, isProduction: boolean) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Webhook URL is not valid');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BadRequestException('Webhook URL must use http or https');
  }
  if (url.username || url.password) {
    throw new BadRequestException('Webhook URL must not contain credentials');
  }
  if (!isProduction) {
    return;
  }
  if (url.protocol !== 'https:') {
    throw new BadRequestException('Webhook URL must use https');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new BadRequestException('Webhook URL must be publicly reachable');
  }

  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);
  if (addresses.length === 0) {
    throw new BadRequestException('Webhook URL host could not be resolved');
  }
  if (addresses.some(isPrivateAddress)) {
    throw new BadRequestException('Webhook URL must be publicly reachable');
  }
}
