import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for extracting metadata from a URL
 * This connects to the backend URL extraction service
 */
export async function POST(request: NextRequest) {
  try {
    // Get the token from cookies
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Get the backend API URL from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Call the backend URL extraction service
    const response = await fetch(`${apiUrl}/api/url/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || 'Failed to extract metadata' },
        { status: response.status }
      );
    }

    // Return the extracted metadata
    const metadata = await response.json();
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error in URL metadata extraction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}