import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/users/me/change-password/`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Check if the response was successful
    if (!response.ok) {
      // Try to parse error details from response
      let errorMessage = 'Failed to change password';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // If we can't parse the JSON, just use the default error message
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}