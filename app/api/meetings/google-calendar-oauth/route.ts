import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';

// OAuth2 client configuration
const getOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/aimpact/meetings/google-calendar-oauth/callback`
  );
  
  return oauth2Client;
};

// GET - Initiate OAuth flow or handle sync
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'auth') {
      // Initiate OAuth flow
      const oauth2Client = getOAuth2Client();
      
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ],
        prompt: 'consent',
        state: JSON.stringify({
          userEmail: session.user.email,
          returnUrl: searchParams.get('returnUrl') || '/aimpact'
        })
      });
      
      return NextResponse.json({ authUrl });
      
    } else if (action === 'status') {
      // Check if user has authorized Google Calendar
      // In a real implementation, you'd check if you have stored tokens for this user
      // For now, we'll return a simple status
      return NextResponse.json({
        authorized: false,
        message: 'Google Calendar not connected. Click "Connect Google Calendar" to authorize.'
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Error in Google Calendar OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// POST - Handle OAuth callback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
    }
    
    const oauth2Client = getOAuth2Client();
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Parse state to get user info
    const stateData = JSON.parse(state || '{}');
    
    // In a real implementation, you would:
    // 1. Store the tokens securely (encrypted in database)
    // 2. Associate them with the user
    // 3. Use them for future API calls
    
    // For demonstration, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'Google Calendar connected successfully',
      returnUrl: stateData.returnUrl || '/aimpact'
    });
    
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return NextResponse.json(
      { error: 'Failed to connect Google Calendar' },
      { status: 500 }
    );
  }
}