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
  '/e2e-test-fixes', // Special test pages for Cypress
  '/', // Allow the landing page
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Add debug logging
  console.log(`Middleware processing: ${pathname}`);

  // Always allow direct access to register page regardless of auth status
  if (pathname === '/auth/register') {
    console.log('Allowing direct access to register page');
    return NextResponse.next();
  }

  // Special bypass for Cypress tests
  // The cookie is set by Cypress tests to bypass authentication
  if (request.cookies.get('cypress_auth_bypass')?.value === 'true') {
    console.log('Cypress bypass active, skipping auth checks');
    return NextResponse.next();
  }

  // Check if the path is public
  const isPublicPath = publicPaths.some(path =>
    pathname.startsWith(path)
  );

  // If it's a public path, allow the request
  if (isPublicPath) {
    console.log(`Public path detected: ${pathname}`);
    return NextResponse.next();
  }

  // Check if the user has a token (either in cookie or localStorage)
  const token = request.cookies.get('token')?.value;
  console.log(`Auth check - Token exists: ${!!token}`);
  const isAuthenticated = !!token;

  // If trying to access a protected route without authentication
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    console.log(`Redirecting to login: unauthenticated access to protected route ${pathname}`);
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  // If trying to access auth routes while already authenticated
  if (authRoutes.some(route => pathname.startsWith(route)) && isAuthenticated) {
    console.log(`Redirecting to dashboard: authenticated user accessing auth route ${pathname}`);
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

// Specify paths for which the middleware should run
export const config = {
  matcher: [
    // Apply to all routes except static files and api routes that don't need auth
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};