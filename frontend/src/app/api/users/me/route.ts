import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const backendEndpoint = `${backendUrl}/users/me/`;
    console.log('Forwarding to backend:', backendEndpoint);

    const response = await fetch(backendEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response status:', response.status);

    // If the response is not ok, try to parse the error
    if (!response.ok) {
      let errorMessage = 'Failed to get user data';
      try {
        const errorData = await response.json();
        console.error('Backend error data:', errorData);
        errorMessage = errorData.detail || errorMessage;
      } catch (error) {
        console.error('Error parsing error response:', error);
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Get the response data
    const data = await response.json();
    console.log('User data received successfully');

    // Return the user data
    return NextResponse.json(data);
  } catch (error) {
    console.error('User API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const response = await fetch(`${backendUrl}/users/me/`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Get the response data
    const data = await response.json();

    // Check if the response was successful
    if (!response.ok) {
      // Return the error from the backend
      return NextResponse.json(
        { error: data.detail || 'Failed to update user data' },
        { status: response.status }
      );
    }

    // Return the updated user data
    return NextResponse.json(data);
  } catch (error) {
    console.error('User API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}