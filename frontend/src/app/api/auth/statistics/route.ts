import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getServerAuthToken, logAuthSources } from '@/lib/utils/api';

/**
 * Get user statistics from the backend API
 */
export async function GET(request: NextRequest) {
  console.log('User Statistics API route: Processing request');

  try {
    // Get authentication token using standardized utility
    const authToken = getServerAuthToken(request);

    // Log token debug information
    logAuthSources(request);

    if (!authToken) {
      console.log('No token found, returning 401');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Construct the backend API URL - use the correct endpoint
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const endpoint = `${backendUrl}/api/users/me/statistics`;

    console.log(`User Statistics API route: Forwarding to backend: ${endpoint}`);

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

    console.log(`User Statistics API route: Backend response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`User Statistics API route: Backend error: ${errorText}`);

      if (backendResponse.status === 404) {
        // Return dummy data for development if endpoint doesn't exist yet
        if (process.env.NODE_ENV === 'development') {
          console.log('User Statistics API route: Returning mock data in development mode');
          return NextResponse.json({
            totalCoursesEnrolled: 5,
            completedCourses: 3,
            averageScore: 85,
            totalTimeSpent: 24,
            conceptsLearned: 42,
            reviewsCompleted: 120,
            streakDays: 7,
            lastActivity: new Date().toISOString()
          });
        }
      }

      return NextResponse.json(
        { message: 'Failed to fetch user statistics' },
        { status: backendResponse.status }
      );
    }

    // Transform the backend response to match the expected frontend format
    const backendData = await backendResponse.json();

    // Map backend fields to frontend expected format
    const transformedData = {
      totalCoursesEnrolled: backendData.total_learning_paths || 0,
      completedCourses: backendData.completed_resources || 0,
      averageScore: backendData.review_accuracy || 0,
      totalTimeSpent: backendData.study_time || 0,
      conceptsLearned: backendData.total_concepts || 0,
      completionRate: backendData.completion_rate || 0,
      streakDays: backendData.active_days || 0,
      lastActivity: new Date().toISOString()
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error in user statistics route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}