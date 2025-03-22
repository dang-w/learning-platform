import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_API_URL } from '@/lib/config';
import { getAuthToken } from '@/lib/auth/utils';
import { API_URL } from '@/config';

export async function GET(request: NextRequest) {
  console.log('API: Getting all sessions');

  // Get auth token from cookies or header
  const authToken = getAuthToken(request);
  if (!authToken) {
    console.log('API: No auth token found for sessions list');
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const backendUrl = BACKEND_API_URL || process.env.BACKEND_API_URL;
    const sessionsEndpoint = `${backendUrl}/api/sessions`;

    console.log(`API: Forwarding to backend at ${sessionsEndpoint}`);

    const response = await fetch(sessionsEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      console.error(`API: Error from backend: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API: Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
 * Creates a new session for the authenticated user
 */
export async function POST(request: NextRequest) {
  console.log('Session creation requested');

  try {
    // Get the token from the request (either from Authorization header or cookies)
    const token = await getTokenFromRequest(request);

    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token found, creating session');

    // Extract additional data from the request (optional)
    let userAgent, ipAddress;
    try {
      const body = await request.json().catch(() => ({}));
      userAgent = body.userAgent;
      ipAddress = body.ipAddress;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.log('No body data provided for session');
    }

    // If not provided in the body, try to get from headers
    if (!userAgent) {
      userAgent = request.headers.get('user-agent') || undefined;
    }

    if (!ipAddress) {
      // Get IP from headers - could be behind proxies
      ipAddress = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown';
    }

    // Construct the backend API URL with the /api prefix
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const sessionEndpoint = `${backendUrl}/api/sessions/`;

    console.log(`Forwarding session creation request to backend: ${sessionEndpoint}`);

    // Forward the request to the backend
    const backendResponse = await fetch(sessionEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_agent: userAgent,
        ip_address: ipAddress
      }),
      cache: 'no-store'
    });

    // Log the backend response for debugging
    console.log(`Backend responded with status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to create session' },
        { status: backendResponse.status }
      );
    }

    // Return the response from the backend
    const responseData = await backendResponse.json();
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}