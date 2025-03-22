import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/utils/api';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[API] Processing DELETE request for metric ID: ${params.id}`);

  // In development mode, just return success without calling backend
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
    console.log('[API] Development mode: Simulating successful deletion');
    return new NextResponse(null, { status: 204 });
  }

  try {
    // Get the auth token
    const token = getToken();
    if (!token) {
      console.error('[API] Authentication required for deleting metric');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Construct the delete URL
    const deleteUrl = `${process.env.NEXT_PUBLIC_API_URL}/progress/metrics/${params.id}`;
    console.log(`[API] Sending DELETE request to: ${deleteUrl}`);

    // Send the request to delete the metric
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[API] Failed to delete metric: ${JSON.stringify(errorData)}`);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Return a success response with no content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[API] Error deleting metric:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting metric' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`[API] Processing PUT request for metric ID: ${params.id}`);

  // In development mode, simulate a backend response
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
    console.log('[API] Development mode: Simulating metric update');

    try {
      // Parse the update data from the request
      const updateData = await request.json();

      // Return a mock response with the updated data
      return NextResponse.json({
        ...updateData,
        id: params.id,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[API] Error parsing request in development mode:', error);
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
  }

  try {
    // Get the auth token
    const token = getToken();
    if (!token) {
      console.error('[API] Authentication required for updating metric');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the metric data from the request
    const metricData = await request.json();

    // Construct the update URL
    const updateUrl = `${process.env.NEXT_PUBLIC_API_URL}/progress/metrics/${params.id}`;
    console.log(`[API] Sending PUT request to: ${updateUrl}`);

    // Send the request to update the metric
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metricData),
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[API] Failed to update metric: ${JSON.stringify(errorData)}`);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Return the updated metric data
    const updatedMetric = await response.json();
    return NextResponse.json(updatedMetric);
  } catch (error) {
    console.error('[API] Error updating metric:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating metric' },
      { status: 500 }
    );
  }
}