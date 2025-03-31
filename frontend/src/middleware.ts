import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_TOKEN_EXPIRY } from '@/lib/config';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/token',
  '/api/auth/token/refresh',
  '/api/auth/verify',
  '/api/auth/debug'
];

/**
 * Clean token by removing Bearer prefix if present
 */
function cleanToken(token: string): string {
  return token.startsWith('Bearer ') ? token.substring(7) : token;
}

/**
 * Check if a request is rate limited
 */
function checkRateLimiting(request: NextRequest): boolean {
  const rateLimitUntil = request.cookies.get('_rate_limit_until')?.value;

  if (rateLimitUntil) {
    const limitTime = parseInt(rateLimitUntil, 10);
    const now = Date.now();

    if (limitTime > now) {
      // We're still in a rate-limited state
      return true;
    }
  }

  return false;
}

/**
 * Check if a request is an API request
 */
function isAPIRequest(path: string): boolean {
  return path.startsWith('/api/');
}

/**
 * Check if a request is a client-side request
 */
function isClientSideRequest(request: NextRequest): boolean {
  // Check if the request has standard client-side request headers
  const accept = request.headers.get('accept') || '';
  const xRequestedWith = request.headers.get('x-requested-with');
  const contentType = request.headers.get('content-type') || '';

  return (
    accept.includes('application/json') ||
    xRequestedWith === 'XMLHttpRequest' ||
    contentType.includes('application/json')
  );
}

/**
 * Middleware function to handle authentication
 */
export async function middleware(request: NextRequest) {
  const requestPath = request.nextUrl.pathname;

  // Skip authentication for public routes
  if (PUBLIC_ROUTES.includes(requestPath)) {
    console.log(`[Middleware] Skipping auth check for public route: ${requestPath}`);
    return NextResponse.next();
  }

  // Check for rate limiting signals
  const isRateLimited = checkRateLimiting(request);
  if (isRateLimited) {
    console.log(`[Middleware] Request to ${requestPath} is rate limited, bypassing authentication checks`);
    return NextResponse.next();
  }

  // Log middleware execution
  console.log(`[Middleware] Processing request to ${requestPath}`);

  // Extract token from Authorization header or cookies
  const authHeader = request.headers.get('Authorization');
  const tokenFromHeader = authHeader ? cleanToken(authHeader) : null;
  const tokenFromCookie = request.cookies.get('token')?.value;
  const cleanedCookieToken = tokenFromCookie ? cleanToken(tokenFromCookie) : null;

  // Use the first available clean token
  const token = tokenFromHeader || cleanedCookieToken;

  // For debugging only - log token details
  console.log(`[Middleware] Token sources:`, {
    path: requestPath,
    headerPresent: !!authHeader,
    headerValue: tokenFromHeader ? `${tokenFromHeader.substring(0, 10)}...` : 'none',
    cookiePresent: !!tokenFromCookie,
    cookieValue: cleanedCookieToken ? `${cleanedCookieToken.substring(0, 10)}...` : 'none',
    finalToken: token ? `${token.substring(0, 10)}...` : 'none'
  });

  if (!token) {
    // For XHR/fetch requests, return 401
    if (isAPIRequest(requestPath) && isClientSideRequest(request)) {
      console.log(`[Middleware] No valid token found for API request to ${requestPath}, returning 401`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // For other requests without a token, redirect to login
    console.log(`[Middleware] No valid token found for page request to ${requestPath}, redirecting to login`);
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', requestPath);
    return NextResponse.redirect(url);
  }

  // Clone the request headers to avoid modifying the original
  const requestHeaders = new Headers(request.headers);

  // Set clean token in Authorization header
  requestHeaders.set('Authorization', `Bearer ${token}`);

  console.log(`[Middleware] Set Authorization header with clean token: Bearer ${token.substring(0, 10)}...`);

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set clean token in cookie with proper expiry time
  response.cookies.set({
    name: 'token',
    value: token,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_TOKEN_EXPIRY.ACCESS_TOKEN
  });

  return response;
}

// Configure paths to run the middleware on
export const config = {
  matcher: [
    // Match specific API routes that need authorization
    '/api/reviews/:path*',
    '/api/learning-path/:path*',
    '/api/progress/:path*',
    '/api/user/:path*',
    '/api/users/:path*',
    '/api/resources/:path*',
    '/api/auth/((?!login|register|token|verify|debug).)*', // Match auth routes except public ones
    '/api/sessions/:path*',

    // Catch all other API routes
    '/api/:path*',
  ]
};