import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getServerAuthToken, logAuthSources } from '@/lib/utils/api';

/**
 * Get user notification preferences from the backend API
 */
export async function GET(request: NextRequest) {
  console.log('Notification Preferences API route: Processing GET request');

  try {
    // Get authentication token using standardized utility
    const authToken = getServerAuthToken(request);

    // Log token debug information
    logAuthSources(request);

    if (!authToken) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const endpoint = `${backendUrl}/api/users/me/notifications`;

    console.log(`Notification Preferences API route: Forwarding to backend: ${endpoint}`);

    // Set up headers with auth token
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    // Forward the request to the backend
    const backendResponse = await fetch(endpoint, {
      method: 'GET',
      headers,
      cache: 'no-store',
      credentials: 'include'
    });

    console.log(`Notification Preferences API route: Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Notification Preferences API route: Backend error: ${errorText}`);

      if (backendResponse.status === 404) {
        // Return dummy data for development if endpoint doesn't exist yet
        if (process.env.NODE_ENV === 'development') {
          console.log('Notification Preferences API route: Returning mock data in development mode');
          return NextResponse.json({
            emailNotifications: true,
            courseUpdates: true,
            newMessages: true,
            marketingEmails: false,
            weeklyDigest: true
          });
        }
      }

      return NextResponse.json(
        { message: 'Failed to fetch notification preferences' },
        { status: backendResponse.status }
      );
    }

    // Transform the backend data to the frontend format
    const backendData = await backendResponse.json();

    // Map backend property names to frontend property names
    const transformedData = {
      emailNotifications: backendData.email_notifications || false,
      courseUpdates: backendData.learning_reminders || false,
      newMessages: backendData.achievement_notifications || false,
      marketingEmails: backendData.newsletter || false,
      weeklyDigest: backendData.review_reminders || false
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in notification preferences route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update user notification preferences
 */
export async function PUT(request: NextRequest) {
  console.log('Notification Preferences API route: Processing PUT request');

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
    const frontendPrefs = await request.json();

    // Transform frontend format to backend format
    const backendPrefs = {
      email_notifications: frontendPrefs.emailNotifications || false,
      learning_reminders: frontendPrefs.courseUpdates || false,
      achievement_notifications: frontendPrefs.newMessages || false,
      newsletter: frontendPrefs.marketingEmails || false,
      review_reminders: frontendPrefs.weeklyDigest || false
    };

    // Construct the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const endpoint = `${backendUrl}/api/users/me/notifications`;

    console.log(`Notification Preferences API route: Forwarding to backend: ${endpoint}`);

    // Set up headers with auth token
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    // Forward the request to the backend
    const backendResponse = await fetch(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(backendPrefs),
      cache: 'no-store',
      credentials: 'include'
    });

    console.log(`Notification Preferences API route: Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Notification Preferences API route: Backend error: ${errorText}`);
      return NextResponse.json(
        { message: 'Failed to update notification preferences' },
        { status: backendResponse.status }
      );
    }

    // Transform the response back to frontend format
    const backendData = await backendResponse.json();

    // Map backend property names back to frontend property names
    const transformedData = {
      emailNotifications: backendData.email_notifications || false,
      courseUpdates: backendData.learning_reminders || false,
      newMessages: backendData.achievement_notifications || false,
      marketingEmails: backendData.newsletter || false,
      weeklyDigest: backendData.review_reminders || false
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in notification preferences update route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}