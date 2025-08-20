import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // For now, create a simple login that works for your email
    if (email === 'aoberlin@thefortaiagency.com') {
      // In production, this would verify the password against the database
      // For now, we'll create a session
      
      const response = NextResponse.json({
        success: true,
        user: {
          id: '9850b992-3985-48e9-9b8c-24ad1160b8b2',
          email: email,
          name: 'Coach Oberlin'
        }
      });
      
      // Set a simple session cookie
      response.cookies.set('auth-session', JSON.stringify({
        user: { email, id: '9850b992-3985-48e9-9b8c-24ad1160b8b2' },
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
      
      return response;
    }
    
    return NextResponse.json({
      error: 'Invalid credentials'
    }, { status: 401 });
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({
      error: 'Login failed',
      details: error.message
    }, { status: 500 });
  }
}

// Simple session check endpoint
export async function GET(request: NextRequest) {
  const session = request.cookies.get('auth-session');
  
  if (session) {
    try {
      const data = JSON.parse(session.value);
      return NextResponse.json({
        authenticated: true,
        user: data.user
      });
    } catch (e) {
      // Invalid session
    }
  }
  
  return NextResponse.json({
    authenticated: false
  });
}