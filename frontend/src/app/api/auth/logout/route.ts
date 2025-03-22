import { NextResponse } from 'next/server';
import { getToken } from '@/lib/utils/api';

// POST /api/auth/logout
export async function POST() {
  try {
    console.log('Logout API route: Processing logout request');

    const token = getToken();
    console.log('Logout API route: Token present:', !!token);

    // In development, just return success
    if (process.env.NODE_ENV === 'development') {
      console.log('Logout API route: Development mode, returning success without backend call');

      // Set cookies to expire
      const response = NextResponse.json({ success: true });
      response.cookies.set('token', '', {
        expires: new Date(0),
        path: '/'
      });
      response.cookies.set('refresh_token', '', {
        expires: new Date(0),
        path: '/'
      });

      return response;
    }

    // For production, call the backend logout endpoint
    if (token) {
      const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
      const backendEndpoint = `${backendUrl}/auth/logout`;
      console.log('Logout API route: Forwarding to backend:', backendEndpoint);

      try {
        await fetch(backendEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          cache: 'no-store'
        });
        console.log('Logout API route: Backend logout successful');
      } catch (error) {
        // If backend call fails, just log it but don't fail the client-side logout
        console.error('Logout API route: Backend logout error:', error);
      }
    }

    // Create response with success
    const response = NextResponse.json({ success: true });

    // Clear cookies
    response.cookies.set('token', '', {
      expires: new Date(0),
      path: '/'
    });
    response.cookies.set('refresh_token', '', {
      expires: new Date(0),
      path: '/'
    });

    console.log('Logout API route: Completed successfully');
    return response;
  } catch (error) {
    console.error('Logout API route error:', error);

    // Even if there's an error, try to clear cookies
    const response = NextResponse.json(
      { error: 'Error during logout process' },
      { status: 500 }
    );

    response.cookies.set('token', '', {
      expires: new Date(0),
      path: '/'
    });
    response.cookies.set('refresh_token', '', {
      expires: new Date(0),
      path: '/'
    });

    return response;
  }
}