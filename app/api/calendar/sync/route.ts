import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Initialize Supabase
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Initialize Google Calendar client with service account
const getGoogleCalendarClient = async (userEmail: string) => {
  try {
    // Load service account credentials
    const serviceAccountKey = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 
      JSON.stringify(require('@/credentials/gmail-service-account.json'))
    );

    // Create JWT client
    const jwtClient = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      subject: userEmail // Impersonate the user (requires domain-wide delegation)
    });

    // Authorize the client
    await jwtClient.authorize();

    // Create calendar client
    const calendar = google.calendar({ version: 'v3', auth: jwtClient });
    
    return calendar;
  } catch (error: any) {
    console.error('Failed to create Google Calendar client:', error);
    throw error;
  }
};

// GET - Fetch calendar events (both from database and Google Calendar)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const supabase = getSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || format(new Date(), 'yyyy-MM-dd');
    const endDate = searchParams.get('end') || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    // First, get meetings from the database
    const { data: dbMeetings, error: dbError } = await supabase
      .from('meetings')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    if (dbError) {
      console.error('Database error:', dbError);
    }
    
    let googleEvents = [];
    let googleError = null;
    
    // Try to get Google Calendar events - use default email if no session
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    try {
      const calendar = await getGoogleCalendarClient(userEmail);
      
      const timeMin = new Date(startDate);
      const timeMax = new Date(endDate);
      timeMax.setDate(timeMax.getDate() + 1); // Include the full end date
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });
      
      googleEvents = (response.data.items || []).map(event => {
        const startTime = event.start?.dateTime ? new Date(event.start.dateTime) : 
                         event.start?.date ? new Date(event.start.date) : null;
        
        if (!startTime) return null;
        
        // Convert to Eastern Time using Intl.DateTimeFormat
        const easternFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        const easternParts = easternFormatter.formatToParts(startTime);
        const dateParts: any = {};
        easternParts.forEach(part => {
          dateParts[part.type] = part.value;
        });
        
        const easternDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
        const easternTime = `${dateParts.hour}:${dateParts.minute}`;
        
        return {
          id: `google-${event.id}`,
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          date: easternDate,
          time: easternTime,
          location: event.location || null,
          attendees: event.attendees?.map(a => a.email).filter(Boolean) || [],
          source: 'google',
          google_event_id: event.id,
          google_calendar_link: event.htmlLink,
          status: event.status === 'cancelled' ? 'cancelled' : 
                 startTime < new Date() ? 'ended' : 'scheduled'
        };
      }).filter(Boolean);
      
    } catch (error: any) {
      console.error('Google Calendar error:', error);
      googleError = error.message;
      
      // Check if it's a delegation/auth error
      if (error.message?.includes('delegation') || error.code === 401 || error.code === 403) {
        googleError = 'Google Calendar requires domain-wide delegation to be configured';
      }
    }
    
    // Combine and deduplicate events
    const allEvents = [...(dbMeetings || [])];
    
    // Add Google events that don't exist in the database
    googleEvents.forEach(googleEvent => {
      const exists = allEvents.some(dbEvent => 
        dbEvent.google_event_id === googleEvent.google_event_id?.replace('google-', '')
      );
      if (!exists) {
        allEvents.push(googleEvent);
      }
    });
    
    // Sort all events by date and time
    allEvents.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    return NextResponse.json({
      success: true,
      events: allEvents,
      sources: {
        database: dbMeetings?.length || 0,
        google: googleEvents.length
      },
      googleError,
      totalEvents: allEvents.length,
      timezone: 'America/New_York',
      timezoneDisplay: 'Eastern Time'
    });
    
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch calendar events',
      details: error.message,
      events: []
    }, { status: 500 });
  }
}