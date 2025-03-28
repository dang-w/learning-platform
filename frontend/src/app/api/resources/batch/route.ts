import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();

    // Get the authorization header from the request
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

    // First try the /api/resources/batch endpoint
    let response = await fetch(`${backendUrl}/api/resources/batch`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    // If that fails with a 404, try the /batch endpoint
    if (response.status === 404) {
      console.log('Batch endpoint not found at /api/resources/batch, trying /batch');
      response = await fetch(`${backendUrl}/batch`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      });
    }

    // Get the response data
    const data = await response.json();

    // Check if the response was successful
    if (!response.ok) {
      // Return the error from the backend
      return NextResponse.json(
        { error: data.detail || 'Batch resource creation failed' },
        { status: response.status }
      );
    }

    // Return the successful response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Batch resource API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}