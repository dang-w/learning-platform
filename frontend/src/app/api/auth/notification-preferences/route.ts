import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';

/**
 * Get notification preferences
 */
export async function GET(request: NextRequest) {
  console.log('Notification preferences request received');

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
    const endpoint = `${backendUrl}/api/auth/notification-preferences`;

    console.log(`Forwarding preferences request to backend: ${endpoint}`);

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
        { message: errorData.detail || 'Failed to fetch notification preferences' },
        { status: backendResponse.status }
      );
    }

    // Return the preferences data
    const data = await backendResponse.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * Update notification preferences
 */
export async function PUT(request: NextRequest) {
  console.log('Update notification preferences request received');

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header present');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const preferences = await request.json();

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const endpoint = `${backendUrl}/api/auth/notification-preferences`;

    console.log(`Forwarding preferences update to backend: ${endpoint}`);

    // Forward the request to the backend
    const backendResponse = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferences),
      cache: 'no-store'
    });

    console.log(`Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Error from backend:', errorData);
      return NextResponse.json(
        { message: errorData.detail || 'Failed to update notification preferences' },
        { status: backendResponse.status }
      );
    }

    // Return the updated preferences
    const data = await backendResponse.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating notification preferences' },
      { status: 500 }
    );
  }
}