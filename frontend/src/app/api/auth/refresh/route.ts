import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_EXPIRY } from '@/lib/config';
import { API_URL } from '@/config';

/**
 * Clean token by removing Bearer prefix if present
 */
function cleanToken(token: string): string {
  return token.startsWith('Bearer ') ? token.substring(7) : token;
}

/**
 * Refreshes the user's authentication token
 */
export async function POST(request: NextRequest) {
  console.log('Token refresh request received');

  try {
    // Get the refresh token from request cookies
    const refreshToken = request.cookies.get('refresh_token')?.value;
    let tokenFromBody;

    if (!refreshToken) {
      console.log('No refresh token found in cookies');

      // Try to get it from the request body
      const body = await request.json().catch(() => ({}));
      tokenFromBody = body.refresh_token;

      if (!tokenFromBody) {
        return NextResponse.json(
          { message: 'No refresh token provided' },
          { status: 401 }
        );
      }
    }

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const refreshEndpoint = `${backendUrl}/auth/token/refresh`;

    console.log(`Forwarding token refresh request to: ${refreshEndpoint}`);

    // Forward the request to the backend using JSON as expected by the RefreshTokenRequest model
    const backendResponse = await fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken || tokenFromBody,
      }),
      cache: 'no-store'
    });

    console.log(`Backend refresh response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Token refresh error from backend:', errorData);

      // If authentication failed, clear cookies
      if (backendResponse.status === 401) {
        const errorResponse = NextResponse.json(
          { message: errorData.detail || 'Authentication failed - please log in again' },
          { status: 401 }
        );

        errorResponse.cookies.delete('token');
        errorResponse.cookies.delete('refresh_token');

        return errorResponse;
      }

      return NextResponse.json(
        { message: errorData.detail || 'Token refresh failed' },
        { status: backendResponse.status }
      );
    }

    // Parse tokens from backend response
    const responseData = await backendResponse.json();

    if (!responseData.access_token) {
      console.error('Backend did not return an access token', responseData);
      return NextResponse.json(
        { message: 'Invalid response from authentication server' },
        { status: 500 }
      );
    }

    // Clean the access token
    const cleanedToken = cleanToken(responseData.access_token);

    // Create response with proper headers
    const response = NextResponse.json({
      token: cleanedToken,
      refreshToken: responseData.refresh_token
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    // Set cookies for server-side authentication with proper expiry times
    response.cookies.set({
      name: 'token',
      value: cleanedToken,
      httpOnly: true,
      path: '/',
      maxAge: AUTH_TOKEN_EXPIRY.ACCESS_TOKEN,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    if (responseData.refresh_token) {
      response.cookies.set({
        name: 'refresh_token',
        value: responseData.refresh_token,
        httpOnly: true,
        path: '/',
        maxAge: AUTH_TOKEN_EXPIRY.REFRESH_TOKEN,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    console.log('Token refresh successful');
    return response;

  } catch (error) {
    console.error('Error during token refresh:', error);
    return NextResponse.json(
      { message: 'An error occurred during token refresh' },
      { status: 500 }
    );
  }
}