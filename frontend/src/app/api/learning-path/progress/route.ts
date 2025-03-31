import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/config';
import { getAuthToken } from '@/lib/auth/utils';

/**
 * Get learning path progress from the backend API
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Learning Path Progress API route: Processing request');

    // Get authentication token using standardized utility
    const authToken = getAuthToken(request);

    // Log detailed token information for debugging
    console.log('Learning Path Progress API route: Auth token details:', {
      hasToken: !!authToken,
      tokenPrefix: authToken ? authToken.substring(0, 15) + '...' : 'none',
      headers: {
        authorization: request.headers.get('authorization'),
        cookie: request.headers.get('cookie')
      }
    });

    // Check if we have a token
    if (!authToken) {
      console.log('Learning Path Progress API route: No authentication token found');

      // Return a dummy response for development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Learning Path Progress API route: Returning dummy data in development mode');
        return NextResponse.json({
          overall_progress: 0,
          completed_goals: 0,
          total_goals: 0,
          completed_milestones: 0,
          total_milestones: 0,
          next_milestone: null,
          recent_completions: [],
          recommended_resources: [],
          current_phase: null,
          paths: [
            {
              id: "dummy-path-1",
              title: "Introduction to Machine Learning",
              progress_percentage: 0,
              completed_resources: 0,
              total_resources: 5,
              estimated_completion_date: new Date().toISOString(),
              next_resource: null
            }
          ]
        });
      }

      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.BACKEND_API_URL || API_URL || 'http://localhost:8000';
    const backendEndpoint = `${backendUrl}/api/learning-path/progress`;
    console.log('Learning Path Progress API route: Forwarding to backend:', backendEndpoint);

    // Prepare headers for backend request
    const headers = {
      'Authorization': authToken,
      'Content-Type': 'application/json'
    };

    console.log('Learning Path Progress API route: Request headers:', {
      Authorization: headers.Authorization.substring(0, 20) + '...',
      'Content-Type': headers['Content-Type']
    });

    // Make the request to the backend
    const response = await fetch(backendEndpoint, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store'
    });

    console.log('Learning Path Progress API route: Backend response status:', response.status);

    // Handle non-success responses
    if (!response.ok) {
      let errorMessage = 'Failed to get learning path progress';
      try {
        const errorData = await response.json();
        console.error('Learning Path Progress API route: Backend error data:', errorData);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        console.error('Learning Path Progress API route: Error parsing error response');
      }

      // Return dummy data in development mode for a better testing experience
      if (process.env.NODE_ENV === 'development') {
        console.log('Learning Path Progress API route: Returning dummy data in development mode due to backend error');
        return NextResponse.json({
          overall_progress: 0,
          completed_goals: 0,
          total_goals: 0,
          completed_milestones: 0,
          total_milestones: 0,
          next_milestone: null,
          recent_completions: [],
          recommended_resources: [],
          current_phase: null,
          paths: [
            {
              id: "dummy-path-1",
              title: "Introduction to Machine Learning",
              progress_percentage: 0,
              completed_resources: 0,
              total_resources: 5,
              estimated_completion_date: new Date().toISOString(),
              next_resource: null
            }
          ]
        });
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Successfully got data from backend
    const data = await response.json();
    console.log('Learning Path Progress API route: Data received successfully');

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Learning Path Progress API route error:', error);

    // Return dummy data in development mode for a better testing experience
    if (process.env.NODE_ENV === 'development') {
      console.log('Learning Path Progress API route: Returning dummy data in development mode due to error');
      return NextResponse.json({
        overall_progress: 0,
        completed_goals: 0,
        total_goals: 0,
        completed_milestones: 0,
        total_milestones: 0,
        next_milestone: null,
        recent_completions: [],
        recommended_resources: [],
        current_phase: null,
        paths: [
          {
            id: "dummy-path-1",
            title: "Introduction to Machine Learning",
            progress_percentage: 0,
            completed_resources: 0,
            total_resources: 5,
            estimated_completion_date: new Date().toISOString(),
            next_resource: null
          }
        ]
      });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}