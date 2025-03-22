import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getServerAuthToken, logAuthSources } from '@/lib/utils/api';

/**
 * Get learning paths from the backend API
 */
export async function GET(request: NextRequest) {
  console.log('Learning Path API route: Processing request');

  try {
    // Get authentication token using standardized utility
    const authToken = getServerAuthToken(request);

    // Log token debug information
    logAuthSources(request);

    if (!authToken) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeModules = searchParams.get('includeModules') || 'true';
    const includeProgress = searchParams.get('includeProgress') || 'true';

    // Construct the backend API URL with query parameters
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const endpoint = `${backendUrl}/api/learning-path?includeModules=${includeModules}&includeProgress=${includeProgress}`;

    console.log(`Learning Path API route: Forwarding to backend: ${endpoint}`);

    // Set up headers with auth token
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    // Forward the request to the backend
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers,
      cache: 'no-store',
      credentials: 'include'
    });

    console.log(`Learning Path API route: Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      // Handle 404 with empty array instead of error
      if (backendResponse.status === 404) {
        console.log('Learning Path API route: No paths found, returning empty array');
        return NextResponse.json([]);
      }

      const errorText = await backendResponse.text();
      console.error(`Learning Path API route: Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to fetch learning paths' },
        { status: backendResponse.status }
      );
    }

    // Forward the successful response
    const data = await backendResponse.json();
    console.log('Learning Path API route: Data received successfully');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Learning Path API route: Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}