const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : 'Request failed';
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : Array.isArray(
              typeof payload === 'object' &&
                payload !== null &&
                'message' in payload
                ? (payload as { message: unknown }).message
                : null,
            )
          ? ((payload as { message: string[] }).message.join(', '))
          : 'Upload failed';
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
