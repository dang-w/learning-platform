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

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/sessions/`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    // Get the response data
    const data = await response.json();

    // Check if the response was successful
    if (!response.ok) {
      // Return the error from the backend
      return NextResponse.json(
        { error: data.detail || 'Failed to create session' },
        { status: response.status }
      );
    }

    // Return the session data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Session API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}