import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_EXPIRY } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    console.log('Token Refresh API route: Processing refresh request');

    // Get the request body
    let body;
    try {
      body = await request.json();
      console.log('Token Refresh API route: Received refresh token request');
    } catch (parseError) {
      console.error('Token Refresh API route: Error parsing request:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    if (!body.refresh_token) {
      console.error('Token Refresh API route: Missing refresh token');
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const backendEndpoint = `${backendUrl}/api/auth/token/refresh`;
    console.log(`Token Refresh API route: Forwarding to backend: ${backendEndpoint}`);

    try {
      console.log(`Token Refresh API route: Sending refresh token: ${body.refresh_token.substring(0, 10)}...`);

      const response = await fetch(backendEndpoint, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`Token Refresh API route: Backend response status: ${response.status}`);

      // Get the response data
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Token Refresh API route: Error parsing backend response:', jsonError);
        return NextResponse.json(
          { error: 'Invalid response from authentication server' },
          { status: 500 }
        );
      }

      // Check if the response was successful
      if (!response.ok) {
        const errorDetail = data.detail || data.message || JSON.stringify(data);
        console.error('Token Refresh API route: Token refresh failed:', errorDetail);

        // If authentication failed, clear cookies
        if (response.status === 401) {
          const errorResponse = NextResponse.json(
            { error: 'Authentication failed - please log in again' },
            { status: 401 }
          );

          errorResponse.cookies.delete('token');
          errorResponse.cookies.delete('refresh_token');

          return errorResponse;
        }

        // Return the error from the backend
        return NextResponse.json(
          { error: errorDetail || 'Token refresh failed' },
          { status: response.status }
        );
      }

      console.log('Token Refresh API route: Token refresh successful');

      // Create cookies for authentication
      const authResponse = NextResponse.json(data);

      // Set cookies for the access token and refresh token with proper expiry times
      authResponse.cookies.set('token', data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: AUTH_TOKEN_EXPIRY.ACCESS_TOKEN,
        path: '/',
      });

      if (data.refresh_token) {
        authResponse.cookies.set('refresh_token', data.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: AUTH_TOKEN_EXPIRY.REFRESH_TOKEN,
          path: '/',
        });
      }

      return authResponse;
    } catch (fetchError) {
      console.error('Token Refresh API route: Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to communicate with authentication server' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Token Refresh API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}