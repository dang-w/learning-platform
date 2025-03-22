import { NextRequest } from 'next/server';

/**
 * Get authentication token from request headers or cookies
 */
export function getAuthToken(request: NextRequest): string | null {
  // Try to get from Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fall back to cookies
  const token = request.cookies.get('token')?.value;
  return token || null;
}