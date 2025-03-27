import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_EXPIRY } from '@/lib/config';

/**
 * Clean token by removing Bearer prefix if present
 */
function cleanToken(token: string): string {
  return token.startsWith('Bearer ') ? token.substring(7) : token;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Auth Token API route: Processing authentication request');

    // Parse the request body
    const body = await request.json();
    const { username, password } = body;

    console.log(`Auth Token API route: Received login request for user: ${username}`);

    if (!username || !password) {
      console.log('Auth Token API route: Missing username or password');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    console.log(`Auth Token API route: Forwarding to backend: ${backendUrl}/auth/token`);

    // Create a URLSearchParams object for the backend request
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await fetch(`${backendUrl}/auth/token`, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Get the response data
    const data = await response.json();
    console.log(`Auth Token API route: Backend response status: ${response.status}`);

    // Check if the response was successful
    if (!response.ok) {
      console.error('Auth Token API route: Authentication failed:', data);
      // Return the error from the backend
      return NextResponse.json(
        { error: data.detail || 'Authentication failed' },
        { status: response.status }
      );
    }

    if (!data.access_token) {
      console.error('Auth Token API route: No access token in response:', data);
      return NextResponse.json(
        { error: 'Invalid response from authentication server' },
        { status: 500 }
      );
    }

    console.log('Auth Token API route: Authentication successful');

    // Clean the access token
    const cleanedToken = cleanToken(data.access_token);

    // Create response with proper headers
    const authResponse = NextResponse.json({
      token: cleanedToken,
      refreshToken: data.refresh_token,
      tokenType: data.token_type
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    // Set cookies for the access token and refresh token with proper expiry times
    authResponse.cookies.set({
      name: 'token',
      value: cleanedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_TOKEN_EXPIRY.ACCESS_TOKEN,
      path: '/',
    });

    if (data.refresh_token) {
      authResponse.cookies.set({
        name: 'refresh_token',
        value: data.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: AUTH_TOKEN_EXPIRY.REFRESH_TOKEN,
        path: '/',
      });
    }

    return authResponse;
  } catch (error) {
    console.error('Auth Token API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}