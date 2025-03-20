import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/resources',
  '/learning-path',
  '/reviews',
  '/progress',
];

// Define auth routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/register',
];

// Paths that don't require authentication
const publicPaths = [
  '/auth/login',
  '/auth/register',
  '/api/token',
  '/api/token/refresh',
  '/_next', // Next.js assets
  '/favicon.ico',
  '/public',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Special bypass for Cypress tests
  // The cookie is set by Cypress tests to bypass authentication
  if (request.cookies.get('cypress_auth_bypass')?.value === 'true') {
    return NextResponse.next();
  }

  // Check if the path is public
  const isPublicPath = publicPaths.some(path =>
    pathname.startsWith(path)
  );

  // If it's a public path, allow the request
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if the user has a token (either in cookie or localStorage)
  const token = request.cookies.get('token')?.value;
  const isAuthenticated = !!token;

  // If trying to access a protected route without authentication
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  // If trying to access auth routes while already authenticated
  if (authRoutes.some(route => pathname.startsWith(route)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If trying to access API routes without authentication
  if (pathname.startsWith('/api/') && !isPublicPath && !isAuthenticated) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // If there is a token, allow the request and add it to the headers for API routes
  if (isAuthenticated && pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Authorization', `Bearer ${token}`);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};