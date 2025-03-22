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
 * Change user password
 */
export async function POST(request: NextRequest) {
  console.log('Password change request received');

  try {
    // Get the token from the request
    const token = await getTokenFromRequest(request);

    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate request body
    if (!body.old_password || !body.new_password) {
      return NextResponse.json(
        { message: 'Both old and new passwords are required' },
        { status: 400 }
      );
    }

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const changePasswordEndpoint = `${backendUrl}/api/users/me/change-password`;

    console.log(`Forwarding password change to backend: ${changePasswordEndpoint}`);

    // Forward the request to the backend
    const backendResponse = await fetch(changePasswordEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        old_password: body.old_password,
        new_password: body.new_password
      }),
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${errorText}`);

      // Handle common error cases
      if (backendResponse.status === 400) {
        return NextResponse.json(
          { message: 'Invalid password' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Failed to change password' },
        { status: backendResponse.status }
      );
    }

    // Return success response
    return NextResponse.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}