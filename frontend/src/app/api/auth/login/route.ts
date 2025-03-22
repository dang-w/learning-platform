import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';

/**
 * Handles user login and returns tokens
 */
export async function POST(request: NextRequest) {
  console.log('Login request received');

  try {
    const body = await request.json();

    if (!body.username || !body.password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    console.log(`Login attempt for user: ${body.username}`);

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const loginEndpoint = `${backendUrl}/api/auth/token`;

    console.log(`Forwarding login request to backend: ${loginEndpoint}`);

    // Convert JSON data to form data format for OAuth2 compatibility
    const formData = new URLSearchParams();
    formData.append('username', body.username);
    formData.append('password', body.password);

    // Forward the request to the backend using x-www-form-urlencoded format
    const backendResponse = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      cache: 'no-store'
    });

    console.log(`Backend login response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Login error from backend:', errorData);

      // Return appropriate error messages
      if (backendResponse.status === 401) {
        return NextResponse.json(
          { message: 'Invalid username or password' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { message: errorData.detail || 'Login failed' },
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

    console.log('Login successful, returning tokens and setting cookies');
    return response;

  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}