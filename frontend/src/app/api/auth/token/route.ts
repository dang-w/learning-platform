import { NextRequest, NextResponse } from 'next/server';

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

    console.log('Auth Token API route: Authentication successful');

    // Create cookies for authentication
    const authResponse = NextResponse.json(data);

    // Set cookies for the access token and refresh token
    authResponse.cookies.set('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    if (data.refresh_token) {
      authResponse.cookies.set('refresh_token', data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
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