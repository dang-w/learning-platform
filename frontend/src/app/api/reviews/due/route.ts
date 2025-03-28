import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getServerAuthToken, logAuthSources } from '@/lib/utils/api';

/**
 * Get due reviews from the backend API
 */
export async function GET(request: NextRequest) {
  try {
    // Get authentication token using standardized utility
    const authToken = getServerAuthToken(request);

    // Log token debug information
    logAuthSources(request);

    if (!authToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';

    // Construct the backend API URL with query parameters
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const dueReviewsEndpoint = `${backendUrl}/api/reviews/due?limit=${limit}&offset=${offset}`;

    // Set up headers with auth token
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    // Forward the request to the backend
    const backendResponse = await fetch(dueReviewsEndpoint, {
      method: 'GET',
      headers,
      cache: 'no-store',
      credentials: 'include'
    });

    if (!backendResponse.ok) {
      // Handle 404 with empty array instead of error
      if (backendResponse.status === 404) {
        return NextResponse.json([]);
      }

      const errorText = await backendResponse.text();
      console.error(`Due Reviews API route: Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to fetch due reviews' },
        { status: backendResponse.status }
      );
    }

    // Forward the successful response
    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Due Reviews API route: Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}