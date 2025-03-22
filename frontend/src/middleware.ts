import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/resources',
  '/learning-path',
  '/reviews',
  '/progress',
];

// Define auth routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
];

// Paths that don't require authentication
const PUBLIC_PATHS = [
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

// Main middleware function
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow direct access to the registration page
  if (pathname === '/auth/register') {
    return NextResponse.next();
  }

  // Skip auth check during Cypress testing
  if (request.headers.get('x-cypress-testing') === 'true') {
    return NextResponse.next();
  }

  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(pattern => {
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  });

  // Check if the route is an auth route
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));

  // Check if the route is a public path
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));

  // Check authentication status
  const token = request.cookies.get('token')?.value || '';
  const isAuthenticated = !!token;

  // Handle API requests
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated && !isPublicPath) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users trying to access protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = new URL('/auth/login', request.url);
    // Add the current path as a callback URL
    redirectUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users trying to access auth routes to dashboard
  if (isAuthRoute && isAuthenticated) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
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