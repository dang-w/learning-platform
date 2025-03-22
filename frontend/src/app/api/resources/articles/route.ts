import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getServerAuthToken, logAuthSources } from '@/lib/utils/api';

/**
 * Get articles from the backend API
 */
export async function GET(request: NextRequest) {
  console.log('Articles API route: Processing request');

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
    const query = searchParams.get('q') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Construct the backend API URL with query parameters
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    let articlesEndpoint = `${backendUrl}/api/resources/articles`;

    // Add query parameters
    const queryParams = new URLSearchParams();
    if (query) queryParams.append('q', query);
    queryParams.append('page', page);
    queryParams.append('limit', limit);
    queryParams.append('sortBy', sortBy);
    queryParams.append('sortOrder', sortOrder);

    // Append query parameters to endpoint
    if (queryParams.toString()) {
      articlesEndpoint += `?${queryParams.toString()}`;
    }

    console.log(`Articles API route: Forwarding to backend: ${articlesEndpoint}`);

    // Set up headers with auth token
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    // Forward the request to the backend
    const backendResponse = await fetch(articlesEndpoint, {
      method: 'GET',
      headers,
      cache: 'no-store',
      credentials: 'include'
    });

    console.log(`Articles API route: Backend response status: ${backendResponse.status}`);

    // Handle errors from backend
    if (!backendResponse.ok) {
      // Handle 404 specifically with empty results instead of error
      if (backendResponse.status === 404) {
        console.log('Articles API route: Resource not found, returning empty results');
        return NextResponse.json({
          items: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: 0
        });
      }

      const errorText = await backendResponse.text();
      console.error(`Articles API route: Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to fetch articles' },
        { status: backendResponse.status }
      );
    }

    // Forward the successful response
    const data = await backendResponse.json();
    console.log('Articles API route: Data received successfully');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Articles API route: Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}