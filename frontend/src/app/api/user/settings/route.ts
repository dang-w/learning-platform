import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/utils/api';

export async function GET() {
  console.log('[API] Processing GET request for user settings');

  // In development mode, return dummy data
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
    console.log('[API] Development mode: Returning mock user settings data');
    return NextResponse.json({
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        frequency: 'daily',
      },
      privacy: {
        profile_visibility: 'public',
        show_progress: true,
        show_achievements: true,
      },
      accessibility: {
        high_contrast: false,
        font_size: 'medium',
      },
      dashboard: {
        default_view: 'summary',
        widgets: ['progress', 'recent_resources', 'goals', 'achievements'],
      },
      learning_preferences: {
        daily_goal_hours: 2,
        preferred_resources: ['video', 'interactive', 'text'],
        difficulty_level: 'intermediate',
      },
    });
  }

  try {
    // Get the auth token
    const token = getToken();
    if (!token) {
      console.error('[API] Authentication required for fetching user settings');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Construct the settings URL
    const settingsUrl = `${process.env.NEXT_PUBLIC_API_URL}/user/settings`;
    console.log(`[API] Sending GET request to: ${settingsUrl}`);

    // Send the request to get the user settings
    const response = await fetch(settingsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[API] Failed to fetch user settings: ${JSON.stringify(errorData)}`);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Return the user settings data
    const settingsData = await response.json();
    return NextResponse.json(settingsData);
  } catch (error) {
    console.error('[API] Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching user settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[API] Processing PUT request for user settings');

  // In development mode, simulate updating the settings
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
    console.log('[API] Development mode: Simulating settings update');

    try {
      // Parse the update data from the request
      const updateData = await request.json();

      // Return a mock response with the updated data
      return NextResponse.json({
        ...updateData,
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
      console.error('[API] Authentication required for updating user settings');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the settings data from the request
    const settingsData = await request.json();

    // Construct the update URL
    const updateUrl = `${process.env.NEXT_PUBLIC_API_URL}/user/settings`;
    console.log(`[API] Sending PUT request to: ${updateUrl}`);

    // Send the request to update the settings
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settingsData),
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[API] Failed to update user settings: ${JSON.stringify(errorData)}`);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Return the updated settings data
    const updatedSettings = await response.json();
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('[API] Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating user settings' },
      { status: 500 }
    );
  }
}