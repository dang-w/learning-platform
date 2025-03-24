import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';

/**
 * Clean token by removing Bearer prefix if present
 */
function cleanToken(token: string): string {
  return token.replace(/^Bearer\s+/i, '').trim();
}

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
    formData.append('grant_type', 'password');

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

    // Clean and format tokens for frontend consistency
    const cleanedToken = cleanToken(responseData.access_token);
    const tokenResponse = {
      token: cleanedToken, // Send clean token without Bearer prefix
      refreshToken: responseData.refresh_token,
      tokenType: responseData.token_type
    };

    // Create response with proper headers
    const response = NextResponse.json(tokenResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    // Set cookies for server-side authentication
    response.cookies.set({
      name: 'token',
      value: cleanedToken,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60, // 1 hour
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    if (responseData.refresh_token) {
      response.cookies.set({
        name: 'refresh_token',
        value: responseData.refresh_token,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

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