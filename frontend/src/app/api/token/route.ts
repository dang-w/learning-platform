import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Create a new form data object to forward to the backend
    const forwardFormData = new FormData();

    // Copy all fields from the request form data
    for (const [key, value] of formData.entries()) {
      forwardFormData.append(key, value);
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/auth/token`, {
      method: 'POST',
      body: forwardFormData,
      headers: {
        // Don't set Content-Type here as fetch will automatically set it with the boundary
      },
    });

    // Get the response data
    const data = await response.json();

    // Check if the response was successful
    if (!response.ok) {
      // Return the error from the backend
      return NextResponse.json(
        { error: data.detail || 'Authentication failed' },
        { status: response.status }
      );
    }

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
    console.error('Token API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}