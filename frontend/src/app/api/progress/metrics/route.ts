import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    console.log('Progress Metrics API route: Processing request');

    // In development, return dummy data for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('Progress Metrics API route: Returning dummy data in development mode');

      // Create dummy metrics data
      const dummyMetrics = [
        {
          id: '1',
          date: '2023-05-15',
          study_hours: 2.5,
          topics: 'React, TypeScript',
          focus_score: 8,
          notes: 'Productive study session on React hooks'
        },
        {
          id: '2',
          date: '2023-05-16',
          study_hours: 1.5,
          topics: 'Next.js, API Routes',
          focus_score: 7,
          notes: 'Worked on server components'
        },
        {
          id: '3',
          date: '2023-05-17',
          study_hours: 3.0,
          topics: 'Authentication, JWT',
          focus_score: 9,
          notes: 'Implemented token-based auth'
        }
      ];

      return NextResponse.json(dummyMetrics);
    }

    // For production, get the actual metrics from the backend
    const token = getToken();
    console.log('Progress Metrics API route: Token present:', !!token);

    if (!token) {
      console.error('Progress Metrics API route: No authentication token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters if any
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build the URL with query parameters
    let url = `${process.env.NEXT_PUBLIC_API_URL}/progress/metrics`;
    const params = new URLSearchParams();

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log(`Progress Metrics API route: Fetching from ${url}`);

    // Make the request to the backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If the response is not ok, try to parse the error
    if (!response.ok) {
      let errorMessage = 'Failed to get metrics';
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

export async function POST(request: NextRequest) {
  try {
    console.log('Progress Metrics API route: Processing POST request');

    // In development, return dummy data for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('Progress Metrics API route: Returning dummy response in development mode');

      // Parse the request body
      const body = await request.json();

      // Create a mock response with an ID added to the submitted data
      const mockResponse = {
        ...body,
        id: `dev-${Date.now()}`, // Generate a mock ID
      };

      console.log('Progress Metrics API route: Created mock metric:', mockResponse);

      return NextResponse.json(mockResponse);
    }

    // For production, send the data to the backend
    const token = getToken();
    console.log('Progress Metrics API route: Token present:', !!token);

    if (!token) {
      console.error('Progress Metrics API route: No authentication token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    console.log('Progress Metrics API route: Received metric data:', body);

    // Send the data to the backend
    const url = `${process.env.NEXT_PUBLIC_API_URL}/progress/metrics`;
    console.log(`Progress Metrics API route: Sending to ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // If the response is not ok, try to parse the error
    if (!response.ok) {
      let errorMessage = 'Failed to add metric';
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
    console.log('Progress Metrics API route: Metric added successfully');

    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Progress Metrics API route POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}