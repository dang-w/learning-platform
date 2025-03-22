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

interface Params {
  params: {
    sessionId: string;
  };
}

/**
 * Updates the session activity for a specific session ID
 */
export async function PUT(request: NextRequest, context: Params) {
  const { sessionId } = await context.params;
  console.log(`Session activity update requested for session: ${sessionId}`);

  try {
    // Get the token from the request (either from Authorization header or cookies)
    const token = await getTokenFromRequest(request);

    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token found, updating session activity');

    // Construct the backend API URL with the /api prefix
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const sessionActivityEndpoint = `${backendUrl}/api/sessions/${sessionId}/activity`;

    console.log(`Forwarding request to backend: ${sessionActivityEndpoint}`);

    // Forward the request to the backend
    const backendResponse = await fetch(sessionActivityEndpoint, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    // Log the backend response for debugging
    console.log(`Backend responded with status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to update session activity' },
        { status: backendResponse.status }
      );
    }

    // Return success response
    return NextResponse.json(
      { message: 'Session activity updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating session activity:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
