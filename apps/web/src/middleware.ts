import { NextResponse, type NextRequest } from 'next/server';

/**
 * Signed-out visitors never see the dashboard: without a session cookie they go straight to sign in.
 * This is only a gate for the page; the API still checks every request.
 */
export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_API_PROXY === 'false') return NextResponse.next();
  const hasSession = request.cookies.has('access_token') || request.cookies.has('refresh_token');
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
