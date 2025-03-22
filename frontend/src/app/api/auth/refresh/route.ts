import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';

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

    // Rename tokens for frontend consistency
    const tokenResponse = {
      token: responseData.access_token,
      refreshToken: responseData.refresh_token
    };

    // Set cookies for server-side authentication
    const response = NextResponse.json(tokenResponse, { status: 200 });

    // Set HTTP-only cookie for added security
    response.cookies.set({
      name: 'token',
      value: tokenResponse.token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60, // 1 hour
      sameSite: 'lax',
    });

    if (tokenResponse.refreshToken) {
      response.cookies.set({
        name: 'refresh_token',
        value: tokenResponse.refreshToken,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
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