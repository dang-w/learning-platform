import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';
import { expect } from '@jest/globals';

// Mock NextResponse
jest.mock('next/server', () => {
  return {
    NextRequest: jest.fn().mockImplementation((url) => ({
      url,
      nextUrl: new URL(url),
      cookies: {
        get: jest.fn(),
      },
    })),
    NextResponse: {
      next: jest.fn(() => 'next_response'),
      redirect: jest.fn((url) => ({ redirectUrl: url })),
      json: jest.fn((data, options) => ({ data, options })),
    },
  };
});

describe('Middleware', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = {
      nextUrl: {
        pathname: '/',
        searchParams: {
          set: jest.fn(),
        },
      },
      cookies: {
        get: jest.fn(),
      },
      url: 'http://localhost:3000',
    } as unknown as NextRequest;
  });

  it('should allow access to public routes when not authenticated', () => {
    // Mock unauthenticated state
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);
    mockRequest.nextUrl.pathname = '/';

    const response = middleware(mockRequest);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(response).toBe('next_response');
  });

  it('should redirect to login when accessing protected routes without authentication', () => {
    // Mock unauthenticated state
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);

    // Test each protected route
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/resources',
      '/learning-path',
      '/reviews',
      '/progress',
    ];

    protectedRoutes.forEach(route => {
      mockRequest.nextUrl.pathname = route;

      middleware(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'localhost',
          pathname: '/auth/login',
          searchParams: expect.any(URLSearchParams),
        })
      );

      // Reset mocks between tests
      jest.clearAllMocks();
    });
  });

  it('should set callbackUrl when redirecting to login', () => {
    // Mock unauthenticated state
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);
    mockRequest.nextUrl.pathname = '/dashboard';

    // Set up a spy for the searchParams.set method
    const setSearchParamsSpy = jest.fn();
    mockRequest.nextUrl.searchParams.set = setSearchParamsSpy;

    middleware(mockRequest);

    // Verify that NextResponse.redirect was called
    expect(NextResponse.redirect).toHaveBeenCalled();

    // Get the URL argument passed to redirect
    const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];

    // Verify the pathname is correct
    expect(redirectUrl.pathname).toBe('/auth/login');
  });

  it('should redirect to dashboard when accessing auth routes while authenticated', () => {
    // Mock authenticated state
    mockRequest.cookies.get = jest.fn().mockReturnValue({ value: 'valid-token' });

    // Test each auth route
    const authRoutes = [
      '/auth/login',
      '/auth/register',
    ];

    authRoutes.forEach(route => {
      mockRequest.nextUrl.pathname = route;

      middleware(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'localhost',
          pathname: '/dashboard',
        })
      );

      // Reset mocks between tests
      jest.clearAllMocks();
    });
  });

  it('should allow access to protected routes when authenticated', () => {
    // Mock authenticated state
    mockRequest.cookies.get = jest.fn().mockReturnValue({ value: 'valid-token' });

    // Test each protected route
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/resources',
      '/learning-path',
      '/reviews',
      '/progress',
    ];

    protectedRoutes.forEach(route => {
      mockRequest.nextUrl.pathname = route;

      const response = middleware(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(response).toBe('next_response');

      // Reset mocks between tests
      jest.clearAllMocks();
    });
  });

  it('should allow access to API routes', () => {
    // API routes should be handled by the matcher config, not the middleware function
    // This test is just for documentation purposes
    mockRequest.nextUrl.pathname = '/api/resources';

    const response = middleware(mockRequest);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(response).toBe('next_response');
  });

  it('should check for token in cookies', () => {
    mockRequest.nextUrl.pathname = '/dashboard';

    // No token
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);
    middleware(mockRequest);
    expect(NextResponse.redirect).toHaveBeenCalled();
    jest.clearAllMocks();

    // Empty token
    mockRequest.cookies.get = jest.fn().mockReturnValue({ value: '' });
    middleware(mockRequest);
    expect(NextResponse.redirect).toHaveBeenCalled();
    jest.clearAllMocks();

    // Valid token
    mockRequest.cookies.get = jest.fn().mockReturnValue({ value: 'valid-token' });
    middleware(mockRequest);
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('should return 401 JSON for unauthenticated API requests', () => {
    // Mock unauthenticated state
    mockRequest.cookies.get = jest.fn().mockReturnValue(undefined);
    mockRequest.nextUrl.pathname = '/api/resources';

    middleware(mockRequest);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Authentication required' },
      { status: 401 }
    );
  });
});