import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';

/**
 * Get user statistics
 */
export async function GET(request: NextRequest) {
  console.log('Statistics request received');

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header present');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Found token in Authorization header');

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const endpoint = `${backendUrl}/api/auth/statistics`;

    console.log(`Forwarding statistics request to backend: ${endpoint}`);

    // Forward the request to the backend
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    console.log(`Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Error from backend:', errorData);
      return NextResponse.json(
        { message: errorData.detail || 'Failed to fetch statistics' },
        { status: backendResponse.status }
      );
    }

    // Return the statistics data
    const data = await backendResponse.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching statistics' },
      { status: 500 }
    );
  }
}