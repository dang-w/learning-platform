import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware function to handle authentication
 */
export async function middleware(request: NextRequest) {
  const requestPath = request.nextUrl.pathname;

  // Check for rate limiting signals
  const isRateLimited = checkRateLimiting(request);
  if (isRateLimited) {
    console.log(`[Middleware] Request to ${requestPath} is rate limited, bypassing authentication checks`);
    // Pass the original request through if we're rate limited
    return NextResponse.next();
  }

  // Log middleware execution
  console.log(`[Middleware] Processing request to ${requestPath}`);

  // Extract token from Authorization header or cookies
  const authHeader = request.headers.get('Authorization');
  const tokenFromHeader = authHeader ?
    (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader)
    : null;
  const tokenFromCookie = request.cookies.get('token')?.value;

  const token = tokenFromHeader || tokenFromCookie;

  // For debugging only - log token details
  console.log(`[Middleware] Token sources:`, {
    path: requestPath,
    headerPresent: !!authHeader,
    headerValue: authHeader ? `${authHeader.substring(0, 15)}...` : 'none',
    cookiePresent: !!tokenFromCookie,
    cookieValue: tokenFromCookie ? `${tokenFromCookie.substring(0, 10)}...` : 'none',
    finalToken: token ? `${token.substring(0, 10)}...` : 'none'
  });

  if (!token) {
    // For XHR/fetch requests, return 401
    if (isAPIRequest(requestPath) && isClientSideRequest(request)) {
      console.log(`[Middleware] No token found for API request to ${requestPath}, returning 401`);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // For other requests without a token, redirect to login
    console.log(`[Middleware] No token found for page request to ${requestPath}, redirecting to login`);
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('from', requestPath);
    return NextResponse.redirect(url);
  }

  // Clone the request headers to avoid modifying the original
  const requestHeaders = new Headers(request.headers);

  // Ensure token is in Bearer format for Authorization header
  const formattedToken = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;
  requestHeaders.set('Authorization', formattedToken);

  console.log(`[Middleware] Set Authorization header: ${formattedToken.substring(0, 15)}...`);

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Ensure token is in cookie for future requests (strip Bearer prefix if present)
  const cookieToken = token.replace(/^Bearer\s+/i, '');
  console.log(`[Middleware] Setting token cookie: ${cookieToken.substring(0, 10)}...`);

  response.cookies.set({
    name: 'token',
    value: cookieToken,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 // 1 hour
  });

  return response;
}

/**
 * Check if the request is from client-side JavaScript
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
 * Check if the request is for an API endpoint
 */
function isAPIRequest(path: string): boolean {
  return path.startsWith('/api/');
}

/**
 * Check if we're currently rate limited
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
    '/api/auth/:path*',
    '/api/token/:path*',
    '/api/sessions/:path*',

    // Catch all other API routes
    '/api/:path*',
  ]
};