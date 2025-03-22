import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/utils/api';

export async function GET() {
  console.log('[API] Processing GET request for user profile');

  // In development mode, return dummy data
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
    console.log('[API] Development mode: Returning mock user profile data');
    return NextResponse.json({
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      bio: 'I am a software developer interested in machine learning and web development.',
      preferences: {
        theme: 'light',
        notifications_enabled: true,
        email_notifications: true,
      },
      learning_goals: [
        'Master React and Next.js',
        'Learn Python for data science',
        'Complete a full-stack project',
      ],
      joined_date: '2023-01-15T00:00:00Z',
      avatar_url: 'https://ui-avatars.com/api/?name=Test+User&background=random',
    });
  }

  try {
    // Get the auth token
    const token = getToken();
    if (!token) {
      console.error('[API] Authentication required for fetching user profile');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Construct the profile URL
    const profileUrl = `${process.env.NEXT_PUBLIC_API_URL}/user/profile`;
    console.log(`[API] Sending GET request to: ${profileUrl}`);

    // Send the request to get the user profile
    const response = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[API] Failed to fetch user profile: ${JSON.stringify(errorData)}`);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Return the user profile data
    const profileData = await response.json();
    return NextResponse.json(profileData);
  } catch (error) {
    console.error('[API] Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[API] Processing PUT request for user profile');

  // In development mode, simulate updating the profile
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
    console.log('[API] Development mode: Simulating profile update');

    try {
      // Parse the update data from the request
      const updateData = await request.json();

      // Return a mock response with the updated data
      return NextResponse.json({
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
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
      console.error('[API] Authentication required for updating user profile');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the profile data from the request
    const profileData = await request.json();

    // Construct the update URL
    const updateUrl = `${process.env.NEXT_PUBLIC_API_URL}/user/profile`;
    console.log(`[API] Sending PUT request to: ${updateUrl}`);

    // Send the request to update the profile
    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[API] Failed to update user profile: ${JSON.stringify(errorData)}`);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Return the updated profile data
    const updatedProfile = await response.json();
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('[API] Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating user profile' },
      { status: 500 }
    );
  }
}