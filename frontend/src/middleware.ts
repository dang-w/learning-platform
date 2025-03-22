import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/resources',
  '/learning-path',
  '/knowledge',
  '/reviews',
  '/progress',
  '/analytics',
];

// Define auth routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
];

// Skip authentication for these paths
const AUTH_WHITELIST = [
  /^\/$/, // Home page
  /^\/auth\/login/,
  /^\/auth\/register/,
  /^\/api\/auth\/login/,
  /^\/api\/auth\/register/,
  /^\/api\/auth\/refresh/,
  // Add e2e test pages to whitelist in development
  ...(process.env.NODE_ENV === 'development' ? [
    /^\/e2e-test-fixes\/.*/,
    /^\/api\/e2e-test-page.*/,
  ] : []),
  // Public assets and Next.js files
  /^\/_next\/.*/,
  /^\/favicon\.ico$/,
  /\.(svg|png|jpg|jpeg|gif|webp|ico|json|js|css)$/,
];

// Check if path should skip authentication
function shouldSkipAuth(pathname: string): boolean {
  // Check against the AUTH_WHITELIST
  return AUTH_WHITELIST.some(pattern =>
    pattern instanceof RegExp
      ? pattern.test(pathname)
      : pathname === pattern
  );
}

// Main middleware function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip authentication for whitelisted routes
  if (shouldSkipAuth(pathname)) {
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

  // Check authentication status
  const token = request.cookies.get('token')?.value || '';
  const isAuthenticated = !!token;

  // Handle API requests
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
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