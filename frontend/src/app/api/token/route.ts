import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Token API route: Processing authentication request');

    // Check content type and handle both form data and URL encoded
    const contentType = request.headers.get('content-type') || '';
    console.log('Token API route: Content type:', contentType);

    let username = '';
    let password = '';

    try {
      if (contentType.includes('application/json')) {
        // Parse JSON body
        const body = await request.json();
        username = body.username;
        password = body.password;
        console.log(`Token API route: Received JSON login request for user: ${username}`);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Parse URL encoded form data
        const text = await request.text();
        const params = new URLSearchParams(text);
        username = params.get('username') || '';
        password = params.get('password') || '';
        console.log(`Token API route: Received form login request for user: ${username}`);
      } else {
        console.log(`Token API route: Unsupported content type, trying to parse as JSON`);
        // Try JSON as fallback
        const body = await request.json();
        username = body.username;
        password = body.password;
      }
    } catch (parseError) {
      console.error('Token API route: Error parsing request data:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    if (!username || !password) {
      console.log('Token API route: Missing username or password');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    console.log(`Token API route: Forwarding to backend: ${backendUrl}/api/auth/token`);

    // Create a URLSearchParams object for the backend request
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
      const response = await fetch(`${backendUrl}/api/auth/token`, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Get the response data
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Token API route: Error parsing backend response:', jsonError);
        return NextResponse.json(
          { error: 'Invalid response from authentication server' },
          { status: 500 }
        );
      }

      console.log(`Token API route: Backend response status: ${response.status}`);

      // Check if the response was successful
      if (!response.ok) {
        console.error('Token API route: Authentication failed:', data);
        // Return the error from the backend
        return NextResponse.json(
          { error: data.detail || 'Authentication failed' },
          { status: response.status }
        );
      }

      console.log('Token API route: Authentication successful');

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
    } catch (fetchError) {
      console.error('Token API route: Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to communicate with authentication server' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Token API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}