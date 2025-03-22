
import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';

// Helper function to extract token from request
async function getTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('Found token in Authorization header');
    return authHeader.substring(7);
  }

  // Try to get token from request cookies
  const token = request.cookies.get('token')?.value;
  if (token) {
    console.log('Found token in request cookies');
    return token;
  }

  console.log('No token found in request');
  return null;
}

/**
 * Get current user data
 */
export async function GET(request: NextRequest) {
  console.log('User profile request received');

  try {
    // Get the token from the request
    const token = await getTokenFromRequest(request);

    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const userEndpoint = `${backendUrl}/api/users/me`;

    console.log(`Forwarding user request to backend: ${userEndpoint}`);

    // Forward the request to the backend
    const backendResponse = await fetch(userEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to get user profile' },
        { status: backendResponse.status }
      );
    }

    // Return the user data
    const userData = await backendResponse.json();
    return NextResponse.json(userData);

  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update user profile
 */
export async function PUT(request: NextRequest) {
  console.log('User profile update request received');

  try {
    // Get the token from the request
    const token = await getTokenFromRequest(request);

    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const userEndpoint = `${backendUrl}/api/users/me`;

    console.log(`Forwarding user update to backend: ${userEndpoint}`);

    // Forward the request to the backend
    const backendResponse = await fetch(userEndpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to update user profile' },
        { status: backendResponse.status }
      );
    }

    // Return the updated user data
    const userData = await backendResponse.json();
    return NextResponse.json(userData);

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}