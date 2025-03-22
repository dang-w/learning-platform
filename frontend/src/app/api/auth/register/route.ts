import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_API_URL } from '@/lib/config';

// POST /api/auth/register
export async function POST(request: NextRequest) {
  console.log('API: Processing registration request');

  try {
    // Get registration data from request body
    const body = await request.json().catch(() => null);
    if (!body || !body.username || !body.email || !body.password) {
      console.log('API: Invalid registration request - missing required fields');
      return NextResponse.json({ error: 'Invalid registration request' }, { status: 400 });
    }

    const backendUrl = BACKEND_API_URL || process.env.BACKEND_API_URL;
    const registerEndpoint = `${backendUrl}/auth/register`;

    console.log(`API: Forwarding registration request to backend at ${registerEndpoint}`);

    const response = await fetch(registerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API: Registration failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: data.detail || 'Registration failed' },
        { status: response.status }
      );
    }

    console.log('API: Registration successful');

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('API: Error during registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}