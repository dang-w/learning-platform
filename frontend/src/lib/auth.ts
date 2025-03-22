import { NextRequest } from 'next/server';

/**
 * Extracts the authentication token from a request.
 * Checks both the Authorization header and cookies.
 */
export async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('Found token in Authorization header');
    return authHeader.substring(7);
  }

  // Try to get token from request cookies
  const token = request.cookies.get('token')?.value;
  if (token) {
    console.log('Found token in request cookies');
    return token;
  }

  console.log('No token found in request');
  return null;
}

/**
 * Validates if a token exists and is not expired
 * This is a simple validation, not a full JWT verification
 */
export function isValidToken(token: string | null): boolean {
  if (!token) return false;

  try {
    // For JWT tokens, we can check the expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds

    return Date.now() < expiry;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}