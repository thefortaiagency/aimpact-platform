import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import { format, addMinutes } from 'date-fns';

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
};

// GET - Sync meetings FROM Google Calendar TO our database
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const syncDirection = searchParams.get('direction') || 'from-google'; // 'from-google' or 'to-google'
    
    const supabase = getSupabaseClient();
    
    if (syncDirection === 'from-google') {
      // Sync FROM Google Calendar TO our database
      try {
        const calendar = await getGoogleCalendarClient(session.user.email);
        
        // Get events from the last 30 days to the next 90 days
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 90);
        
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100
        });
        
        const events = response.data.items || [];
        const syncedMeetings = [];
        
        for (const event of events) {
          // Skip events without a start time
          if (!event.start?.dateTime && !event.start?.date) continue;
          
          // Extract meeting details
          const startTime = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!);
          const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : 
                          event.end?.date ? new Date(event.end.date) : 
                          addMinutes(startTime, 60);
          
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          
          // Determine meeting type based on conference data
          let meetingType: 'video' | 'phone' | 'in-person' = 'in-person';
          let meetingUrl = '';
          
          if (event.conferenceData?.entryPoints) {
            const videoEntry = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
            const phoneEntry = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'phone');
            
            if (videoEntry) {
              meetingType = 'video';
              meetingUrl = videoEntry.uri || '';
            } else if (phoneEntry) {
              meetingType = 'phone';
            }
          } else if (event.location?.includes('meet.google.com') || event.location?.includes('zoom')) {
            meetingType = 'video';
            meetingUrl = event.location;
          }
          
          // Extract attendees
          const attendees = event.attendees?.map(a => a.email).filter(Boolean) || [];
          
          // Check if meeting already exists (by google_event_id)
          const { data: existingMeeting } = await supabase
            .from('meetings')
            .select('id')
            .eq('google_event_id', event.id)
            .single();
          
          const meetingData = {
            title: event.summary || 'Untitled Meeting',
            description: event.description || '',
            date: format(startTime, 'yyyy-MM-dd'),
            time: format(startTime, 'HH:mm'),
            duration,
            type: meetingType,
            location: event.location || null,
            meeting_url: meetingUrl || null,
            status: event.status === 'cancelled' ? 'cancelled' : 
                   startTime < new Date() ? 'ended' : 'scheduled',
            organizer_email: event.organizer?.email || session.user.email,
            google_event_id: event.id,
            google_calendar_link: event.htmlLink || null,
            updated_at: new Date().toISOString()
          };
          
          let meetingId;
          
          if (existingMeeting) {
            // Update existing meeting
            const { data: updated } = await supabase
              .from('meetings')
              .update(meetingData)
              .eq('id', existingMeeting.id)
              .select()
              .single();
            
            meetingId = existingMeeting.id;
            syncedMeetings.push({ ...updated, action: 'updated' });
          } else {
            // Create new meeting
            const { data: created } = await supabase
              .from('meetings')
              .insert({
                ...meetingData,
                created_by: session.user.email,
                reminder: 15
              })
              .select()
              .single();
            
            meetingId = created?.id;
            if (created) {
              syncedMeetings.push({ ...created, action: 'created' });
            }
          }
          
          // Update attendees if meeting was created/updated successfully
          if (meetingId && attendees.length > 0) {
            // Remove existing attendees
            await supabase
              .from('meeting_attendees')
              .delete()
              .eq('meeting_id', meetingId);
            
            // Add new attendees
            const attendeeRecords = attendees.map(email => ({
              meeting_id: meetingId,
              email,
              status: 'invited'
            }));
            
            await supabase
              .from('meeting_attendees')
              .insert(attendeeRecords);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `Synced ${syncedMeetings.length} meetings from Google Calendar`,
          meetings: syncedMeetings
        });
        
      } catch (error: any) {
        console.error('Error syncing from Google Calendar:', error);
        
        // Check if it's a delegation error
        if (error.message?.includes('delegation') || error.code === 401) {
          return NextResponse.json({
            error: 'Google Calendar sync requires domain-wide delegation to be configured',
            details: 'Please ensure the service account has domain-wide delegation enabled and Calendar API scope',
            setupGuide: '/api/aimpact/meetings/google-calendar/setup'
          }, { status: 403 });
        }
        
        return NextResponse.json({
          error: 'Failed to sync from Google Calendar',
          details: error.message
        }, { status: 500 });
      }
      
    } else {
      // Sync TO Google Calendar FROM our database
      try {
        const calendar = await getGoogleCalendarClient(session.user.email);
        
        // Get meetings from our database that don't have google_event_id
        const { data: meetings } = await supabase
          .from('meetings')
          .select(`
            *,
            meeting_attendees (
              email,
              name,
              status
            )
          `)
          .eq('organizer_email', session.user.email)
          .is('google_event_id', null)
          .eq('status', 'scheduled');
        
        const syncedMeetings = [];
        
        for (const meeting of meetings || []) {
          const startDateTime = new Date(`${meeting.date}T${meeting.time}`);
          const endDateTime = addMinutes(startDateTime, meeting.duration);
          
          // Prepare Google Calendar event
          const event: any = {
            summary: meeting.title,
            description: meeting.description || '',
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'America/New_York' // You might want to make this configurable
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'America/New_York'
            },
            attendees: meeting.meeting_attendees?.map((a: any) => ({
              email: a.email,
              displayName: a.name
            })) || [],
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: meeting.reminder || 15 },
                { method: 'popup', minutes: meeting.reminder || 15 }
              ]
            }
          };
          
          // Add location if it's an in-person meeting
          if (meeting.type === 'in-person' && meeting.location) {
            event.location = meeting.location;
          }
          
          // Add conference data for video meetings
          if (meeting.type === 'video' && meeting.meeting_url) {
            event.location = meeting.meeting_url;
          }
          
          try {
            // Create event in Google Calendar
            const response = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: event,
              conferenceDataVersion: meeting.type === 'video' ? 1 : 0
            });
            
            // Update our database with Google event ID
            await supabase
              .from('meetings')
              .update({
                google_event_id: response.data.id,
                google_calendar_link: response.data.htmlLink,
                updated_at: new Date().toISOString()
              })
              .eq('id', meeting.id);
            
            syncedMeetings.push({
              id: meeting.id,
              title: meeting.title,
              googleEventId: response.data.id,
              action: 'created'
            });
            
          } catch (eventError: any) {
            console.error(`Failed to sync meeting ${meeting.id}:`, eventError);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `Synced ${syncedMeetings.length} meetings to Google Calendar`,
          meetings: syncedMeetings
        });
        
      } catch (error: any) {
        console.error('Error syncing to Google Calendar:', error);
        return NextResponse.json({
          error: 'Failed to sync to Google Calendar',
          details: error.message
        }, { status: 500 });
      }
    }
    
  } catch (error) {
    console.error('Error in Google Calendar sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Google Calendar' },
      { status: 500 }
    );
  }
}

// POST - Create a meeting in both our database and Google Calendar
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { syncToGoogle = true, ...meetingData } = body;
    
    // First create the meeting in our database
    const response = await fetch(`${request.nextUrl.origin}/api/aimpact/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify(meetingData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }
    
    const createdMeeting = await response.json();
    
    // If syncToGoogle is true, also create in Google Calendar
    if (syncToGoogle) {
      try {
        const calendar = await getGoogleCalendarClient(session.user.email);
        
        const startDateTime = new Date(`${createdMeeting.date}T${createdMeeting.time}`);
        const endDateTime = addMinutes(startDateTime, createdMeeting.duration);
        
        const event: any = {
          summary: createdMeeting.title,
          description: createdMeeting.description || '',
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'America/New_York'
          },
          attendees: createdMeeting.attendees?.map((email: string) => ({ email })) || [],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: createdMeeting.reminder || 15 },
              { method: 'popup', minutes: createdMeeting.reminder || 15 }
            ]
          }
        };
        
        if (createdMeeting.location) {
          event.location = createdMeeting.location;
        }
        
        const googleResponse = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          conferenceDataVersion: createdMeeting.type === 'video' ? 1 : 0
        });
        
        // Update our database with Google event ID
        const supabase = getSupabaseClient();
        await supabase
          .from('meetings')
          .update({
            google_event_id: googleResponse.data.id,
            google_calendar_link: googleResponse.data.htmlLink
          })
          .eq('id', createdMeeting.id);
        
        createdMeeting.googleEventId = googleResponse.data.id;
        createdMeeting.googleCalendarLink = googleResponse.data.htmlLink;
        
      } catch (googleError: any) {
        console.error('Failed to sync to Google Calendar:', googleError);
        // Don't fail the whole request if Google sync fails
        createdMeeting.googleSyncError = googleError.message;
      }
    }
    
    return NextResponse.json(createdMeeting);
    
  } catch (error) {
    console.error('Error creating meeting with Google sync:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}