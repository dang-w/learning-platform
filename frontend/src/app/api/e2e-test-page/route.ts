import { NextRequest, NextResponse } from 'next/server';

/**
 * This API route dynamically redirects to the correct test page component
 * based on the 'page' query parameter.
 *
 * Only works in development mode for security reasons
 */
export function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(JSON.stringify({
      error: 'Test pages are only available in development mode'
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Get the requested test page from the URL
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page');

  // If no page specified, redirect to test pages index
  if (!page) {
    return NextResponse.redirect(new URL('/test-pages', request.nextUrl.origin));
  }

  // Map of valid test pages and their routes
  const testPages: Record<string, string> = {
    'resources': '/test-pages/resources-test',
    'knowledge': '/test-pages/knowledge-test',
  };

  // Check if the requested page is valid
  if (!testPages[page]) {
    // Return a JSON response with available test pages
    return new NextResponse(JSON.stringify({
      error: 'Invalid test page requested',
      availablePages: Object.keys(testPages),
      usage: '/api/e2e-test-page?page=resources'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Redirect to the appropriate test page
  return NextResponse.redirect(new URL(testPages[page], request.nextUrl.origin));
}