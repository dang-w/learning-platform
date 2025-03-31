import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_EXPIRY } from '@/lib/config';

/**
 * Clean token by removing Bearer prefix if present
 */
function cleanToken(token: string): string {
  return token.startsWith('Bearer ') ? token.substring(7) : token;
}

/**
 * Handles user login and returns tokens
 */
export async function POST(request: NextRequest) {
  console.log('Login request received');

  try {
    // Get the request body
    const body = await request.json();

    // Validate request body
    if (!body.username || !body.password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    console.log(`Forwarding login request to: ${backendUrl}/api/auth/login`);

    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: body.username,
        password: body.password,
      }),
    });

    // Get the response data
    let responseData;
    try {
      responseData = await response.json();
    } catch (jsonError) {
      console.error('Error parsing login response:', jsonError);
      return NextResponse.json(
        { message: 'Invalid response from authentication server' },
        { status: 500 }
      );
    }

    // Check if the response was successful
    if (!response.ok) {
      console.error('Login failed:', responseData);
      return NextResponse.json(
        { message: responseData.detail || 'Login failed' },
        { status: response.status }
      );
    }

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
    const authResponse = NextResponse.json(tokenResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    // Set cookies for server-side authentication with proper expiry times
    authResponse.cookies.set({
      name: 'token',
      value: cleanedToken,
      httpOnly: true,
      path: '/',
      maxAge: AUTH_TOKEN_EXPIRY.ACCESS_TOKEN,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    if (responseData.refresh_token) {
      authResponse.cookies.set({
        name: 'refresh_token',
        value: responseData.refresh_token,
        httpOnly: true,
        path: '/',
        maxAge: AUTH_TOKEN_EXPIRY.REFRESH_TOKEN,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    console.log('Login successful, returning tokens and setting cookies');
    return authResponse;

  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}