import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Users API route: Processing registration request');

    // Parse the request body
    const body = await request.json();
    console.log('Registration data received (sanitized):', {
      username: body.username,
      email: body.email,
      full_name: body.full_name,
      // Don't log password
    });

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const backendEndpoint = `${backendUrl}/users/`;
    console.log('Users API route: Forwarding to backend:', backendEndpoint);

    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Users API route: Backend response status:', response.status);

    // Get the response data
    const data = await response.json();

    // Check if the response was successful
    if (!response.ok) {
      console.error('Users API route: Registration failed:', data);
      // Return the error from the backend
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    console.log('Users API route: Registration successful');
    // Return the created user data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Users API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}