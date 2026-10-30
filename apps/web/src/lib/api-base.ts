export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
}

export function getGoogleAuthUrl(role?: 'EMPLOYER' | 'TALENT'): string {
  const base = getApiBaseUrl();
  const params = role ? `?role=${role}` : '';
  return `${base}/auth/google${params}`;
}
