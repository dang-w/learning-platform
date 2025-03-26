import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getAuthToken } from '@/lib/auth/utils';

/**
 * Get resource statistics from the backend API
 */
export async function GET(request: NextRequest) {
  console.log('Resources Statistics API route: Processing request');

  try {
    // Get authentication token using standardized utility
    const authToken = getAuthToken(request);

    if (!authToken) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const statsEndpoint = `${backendUrl}/api/resources/statistics`;

    console.log(`Resources Statistics API route: Forwarding to backend: ${statsEndpoint}`);

    // Set up headers with auth token
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    console.log('Resources Statistics API route: Request headers:', {
      Authorization: authToken.substring(0, 20) + '...',
      'Content-Type': 'application/json'
    });

    // Forward the request to the backend
    const backendResponse = await fetch(statsEndpoint, {
      method: 'GET',
      headers,
      cache: 'no-store',
      credentials: 'include'
    });

    console.log(`Resources Statistics API route: Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Resources Statistics API route: Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to fetch resource statistics' },
        { status: backendResponse.status }
      );
    }

    // Forward the successful response
    const data = await backendResponse.json();
    console.log('Resources Statistics API route: Data received successfully');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Resources Statistics API route: Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}