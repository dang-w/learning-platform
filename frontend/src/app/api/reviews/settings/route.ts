import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getServerAuthToken, logAuthSources } from '@/lib/utils/api';

/**
 * Get review settings from the backend API
 * NOTE: This should be a PUT/POST endpoint, not GET
 */
export async function GET() {
  console.log('Reviews Settings API route: Processing GET request - this method is not allowed');

  // Return a detailed error message since the frontend is trying to GET but we need PUT/POST
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Please use PUT to update review settings'
    },
    { status: 405, headers: { 'Allow': 'PUT' } }
  );
}

/**
 * Update review settings in the backend API
 */
export async function PUT(request: NextRequest) {
  console.log('Reviews Settings API route: Processing PUT request');

  try {
    // Get authentication token using standardized utility
    const authToken = getServerAuthToken(request);

    // Log token debug information
    logAuthSources(request);

    if (!authToken) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const endpoint = `${backendUrl}/api/reviews/settings`;

    console.log(`Reviews Settings API route: Forwarding to backend: ${endpoint}`);

    // Set up headers with auth token
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    // Forward the request to the backend
    const backendResponse = await fetch(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'include'
    });

    console.log(`Reviews Settings API route: Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Reviews Settings API route: Backend error: ${errorText}`);

      // If backend doesn't have this endpoint, return mock data in development
      if (backendResponse.status === 404 && process.env.NODE_ENV === 'development') {
        console.log('Reviews Settings API route: Returning mock data in development mode');
        return NextResponse.json({
          flashcardSettings: {
            defaultSessionSize: 10,
            autoplaySpeed: "medium",
            enableAudio: true
          },
          reminders: {
            enabled: true,
            frequency: "daily",
            time: "18:00"
          },
          displayPreferences: {
            showConfidenceScores: true,
            showStatistics: true,
            darkMode: false
          }
        });
      }

      return NextResponse.json(
        { message: 'Failed to update review settings' },
        { status: backendResponse.status }
      );
    }

    // Forward the successful response
    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in reviews settings update route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}