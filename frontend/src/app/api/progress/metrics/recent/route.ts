import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the token from cookie or Authorization header with detailed logging
    const authHeader = request.headers.get('Authorization');
    const token = request.cookies.get('token')?.value;

    console.log('Progress Metrics API route: Processing request');
    console.log('Auth token sources:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader?.substring(0, 10),
      hasCookie: !!token,
      cookieTokenPrefix: token?.substring(0, 10)
    });

    // Use token from cookie or header
    const authValue = authHeader || (token ? `Bearer ${token}` : '');

    if (!authValue) {
      console.log('Progress Metrics API route: No authentication provided');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the 'days' parameter from the URL
    const url = new URL(request.url);
    const days = url.searchParams.get('days') || '7';
    console.log(`Progress Metrics API route: Requested days: ${days}`);

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const backendEndpoint = `${backendUrl}/api/progress/metrics/recent?days=${days}`;
    console.log('Progress Metrics API route: Forwarding to backend:', backendEndpoint);

    const headers = {
      'Authorization': authValue,
      'Content-Type': 'application/json',
    };

    console.log('Progress Metrics API route: Request headers:', headers);

    const response = await fetch(backendEndpoint, {
      method: 'GET',
      headers,
      cache: 'no-store' // Prevent caching
    });

    console.log('Progress Metrics API route: Backend response status:', response.status);

    // If the response is not ok, try to parse the error
    if (!response.ok) {
      let errorMessage = 'Failed to get progress metrics';
      try {
        const errorData = await response.json();
        console.error('Progress Metrics API route: Backend error data:', errorData);
        errorMessage = errorData.detail || errorMessage;
      } catch (error) {
        console.error('Progress Metrics API route: Error parsing error response:', error);
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Get the response data
    const data = await response.json();
    console.log('Progress Metrics API route: Data received successfully');

    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Progress Metrics API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}