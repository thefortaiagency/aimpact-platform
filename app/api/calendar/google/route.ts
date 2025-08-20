import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';

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

// DELETE - Delete a Google Calendar event
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Event ID is required' 
      }, { status: 400 });
    }
    
    const calendar = await getGoogleCalendarClient(userEmail);
    
    // Delete the event
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId.replace('google-', '') // Remove prefix if present
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event deleted successfully',
      eventId 
    });
    
  } catch (error: any) {
    console.error('Delete event error:', error);
    
    if (error.code === 404) {
      return NextResponse.json({ 
        success: false, 
        error: 'Event not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to delete event' 
    }, { status: 500 });
  }
}

// POST - Create a new Google Calendar event
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { title, description, date, time, duration = 60, attendees = [], location, addVideoConference } = body;
    
    if (!title || !date || !time) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title, date, and time are required' 
      }, { status: 400 });
    }
    
    const calendar = await getGoogleCalendarClient(userEmail);
    
    // Parse date and time in Eastern timezone
    // Determine if we're in EST or EDT based on the date
    const testDate = new Date(date);
    const isEDT = testDate.getTimezoneOffset() === 240; // EDT is UTC-4 (240 minutes offset)
    const timezoneOffset = isEDT ? '-04:00' : '-05:00';
    
    // Create the datetime string with proper timezone offset
    const startDateTime = new Date(`${date}T${time}:00${timezoneOffset}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
    
    // Create event object
    const event: any = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York'
      },
      attendees: attendees.map((email: string) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 30 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };
    
    // Add video conference if requested
    if (addVideoConference) {
      event.conferenceData = {
        createRequest: {
          requestId: `nexus-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      };
    }
    
    // Create the event
    const insertParams: any = {
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all' // Send invitations to attendees
    };
    
    // If we're adding video conference, include the conferenceDataVersion parameter
    if (addVideoConference) {
      insertParams.conferenceDataVersion = 1;
    }
    
    const response = await calendar.events.insert(insertParams);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event created successfully',
      event: {
        id: response.data.id,
        title: response.data.summary,
        link: response.data.htmlLink,
        start: response.data.start,
        end: response.data.end,
        videoLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri,
        conferenceData: response.data.conferenceData
      }
    });
    
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to create event' 
    }, { status: 500 });
  }
}

// PATCH - Update an existing Google Calendar event
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { eventId, title, description, date, time, duration, attendees, location, addVideoConference, videoUrl } = body;
    
    if (!eventId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Event ID is required' 
      }, { status: 400 });
    }
    
    const calendar = await getGoogleCalendarClient(userEmail);
    
    // Get existing event first
    const existingEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId.replace('google-', '')
    });
    
    // Build update object
    const updates: any = {
      ...existingEvent.data
    };
    
    if (title) updates.summary = title;
    if (description !== undefined) updates.description = description;
    if (location !== undefined) updates.location = location;
    
    // Handle video conference request
    if (addVideoConference) {
      // Add Google Meet conference data
      updates.conferenceData = {
        createRequest: {
          requestId: `nexus-${Date.now()}`, // Unique request ID
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          },
          status: {
            statusCode: 'success'
          }
        }
      };
      
      // Set the conference data version to 1 to enable conference support
      updates.conferenceDataVersion = 1;
    } else if (videoUrl) {
      // If a custom video URL is provided, add it to the description
      const videoText = `\n\nVideo Conference Link: ${videoUrl}`;
      updates.description = (updates.description || '') + videoText;
    }
    
    if (date && time) {
      const startDateTime = new Date(`${date}T${time}:00`);
      const eventDuration = duration || 60;
      const endDateTime = new Date(startDateTime.getTime() + eventDuration * 60 * 1000);
      
      updates.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York'
      };
      updates.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York'
      };
    }
    
    if (attendees) {
      updates.attendees = attendees.map((email: string) => ({ email }));
    }
    
    // Update the event
    const updateParams: any = {
      calendarId: 'primary',
      eventId: eventId.replace('google-', ''),
      requestBody: updates,
      sendUpdates: 'all'
    };
    
    // If we're adding video conference, include the conferenceDataVersion parameter
    if (addVideoConference) {
      updateParams.conferenceDataVersion = 1;
    }
    
    const response = await calendar.events.update(updateParams);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event updated successfully',
      event: {
        id: response.data.id,
        title: response.data.summary,
        link: response.data.htmlLink,
        start: response.data.start,
        end: response.data.end,
        videoLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri,
        conferenceData: response.data.conferenceData
      }
    });
    
  } catch (error: any) {
    console.error('Update event error:', error);
    
    if (error.code === 404) {
      return NextResponse.json({ 
        success: false, 
        error: 'Event not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to update event' 
    }, { status: 500 });
  }
}

// GET - Search for events by title or date
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const date = searchParams.get('date');
    
    const calendar = await getGoogleCalendarClient(userEmail);
    
    // Set date range
    let timeMin = new Date();
    let timeMax = new Date();
    
    if (date) {
      timeMin = new Date(date);
      timeMax = new Date(date);
      timeMax.setDate(timeMax.getDate() + 1);
    } else {
      // Default to next 30 days
      timeMax.setDate(timeMax.getDate() + 30);
    }
    
    // Search events
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      q: query || undefined,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    });
    
    const events = (response.data.items || []).map(event => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      date: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      location: event.location || '',
      attendees: event.attendees?.map(a => a.email) || [],
      link: event.htmlLink
    }));
    
    return NextResponse.json({ 
      success: true, 
      events,
      count: events.length
    });
    
  } catch (error: any) {
    console.error('Search events error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to search events' 
    }, { status: 500 });
  }
}