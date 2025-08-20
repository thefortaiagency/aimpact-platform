import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get Calendar client using domain-wide delegation
const getCalendarClient = async (userEmail: string) => {
  // Load service account credentials
  let serviceAccountKey;
  
  // Try to load from environment variable first
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } else {
    // Fall back to file
    const keyPath = path.join(process.cwd(), 'credentials', 'gmail-service-account.json');
    if (fs.existsSync(keyPath)) {
      serviceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } else {
      throw new Error('Service account credentials not found');
    }
  }

  // Create JWT client with domain-wide delegation
  const jwtClient = new google.auth.JWT({
    email: serviceAccountKey.client_email,
    key: serviceAccountKey.private_key,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    subject: userEmail // Impersonate the user
  });

  // Authorize the client
  await jwtClient.authorize();

  // Create Calendar client
  const calendar = google.calendar({ version: 'v3', auth: jwtClient });
  
  return calendar;
};

// Helper function to convert Google Calendar event to our format
const convertGoogleEvent = (event: any) => {
  // Handle all-day events
  const start = event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date + 'T00:00:00');
  const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date + 'T23:59:59');
  
  return {
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description || '',
    start: start.toISOString(),
    end: end.toISOString(),
    isAllDay: !event.start?.dateTime, // All-day if no time specified
    location: event.location || '',
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      name: a.displayName || a.email,
      status: a.responseStatus
    })) || [],
    organizer: {
      email: event.organizer?.email || '',
      name: event.organizer?.displayName || event.organizer?.email || ''
    },
    status: event.status || 'confirmed',
    transparency: event.transparency || 'opaque', // busy vs free
    visibility: event.visibility || 'default',
    source: 'google-calendar',
    googleEventId: event.id,
    hangoutLink: event.hangoutLink,
    meetingUrl: event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri,
    calendarId: event.organizer?.email || 'primary',
    created: event.created,
    updated: event.updated
  };
};

// Helper function to convert Todo to calendar event format
const convertTodoToEvent = (todo: any) => {
  let start, end;
  
  if (todo.due_time) {
    // If specific time is set, use it
    start = new Date(`${todo.due_date}T${todo.due_time}`);
    end = new Date(start.getTime() + 15 * 60 * 1000); // 15 minutes duration
  } else {
    // If no time set, make it all-day or default to 9 AM
    start = new Date(`${todo.due_date}T09:00:00`);
    end = new Date(start.getTime() + 15 * 60 * 1000);
  }
  
  // Priority color mapping
  const priorityColors = {
    urgent: '#ef4444',  // red
    high: '#f97316',    // orange  
    medium: '#3b82f6',  // blue
    low: '#6b7280'      // gray
  };
  
  return {
    id: `todo-${todo.id}`,
    title: `📋 ${todo.title}`,
    description: `${todo.description || ''}\n\nCategory: ${todo.category}\nPriority: ${todo.priority}${todo.google_event_link ? '\n\nSynced with Google Calendar' : ''}`,
    start: start.toISOString(),
    end: end.toISOString(),
    isAllDay: false,
    location: '',
    attendees: [],
    organizer: {
      email: todo.user_email,
      name: todo.user_email
    },
    status: todo.completed ? 'completed' : 'confirmed',
    transparency: 'transparent', // Don't block time for todos
    visibility: 'default',
    source: 'todo',
    todoId: todo.id,
    priority: todo.priority,
    category: todo.category,
    completed: todo.completed,
    backgroundColor: priorityColors[todo.priority] || priorityColors.medium,
    googleEventId: todo.google_event_id,
    googleEventLink: todo.google_event_link,
    created: todo.created_at,
    updated: todo.updated_at
  };
};

// GET - Fetch all calendar events from Google Calendar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    const maxResults = parseInt(searchParams.get('maxResults') || '250');

    // Map .com to .ai since they're aliases of the same mailbox
    let calendarEmail = session.user.email;
    if (calendarEmail === 'aoberlin@thefortaiagency.com') {
      calendarEmail = 'aoberlin@thefortaiagency.ai';
    }

    // Get Calendar client with domain-wide delegation
    const calendar = await getCalendarClient(calendarEmail);

    // First, get list of calendars
    const calendarList = await calendar.calendarList.list();
    const calendars = calendarList.data.items || [];

    console.log(`Found ${calendars.length} calendars for ${calendarEmail}`);

    const allEvents = [];

    // Fetch events from each calendar
    for (const cal of calendars) {
      try {
        console.log(`Fetching events from calendar: ${cal.summary} (${cal.id})`);
        
        const eventsResponse = await calendar.events.list({
          calendarId: cal.id!,
          timeMin,
          timeMax,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime',
          showDeleted: false
        });

        const events = eventsResponse.data.items || [];
        console.log(`Found ${events.length} events in calendar: ${cal.summary}`);

        // Convert each event to our format
        for (const event of events) {
          const convertedEvent = convertGoogleEvent(event);
          convertedEvent.calendarName = cal.summary || cal.id;
          convertedEvent.calendarId = cal.id;
          convertedEvent.calendarColor = cal.backgroundColor || '#1976d2';
          allEvents.push(convertedEvent);
        }
      } catch (calendarError) {
        console.error(`Error fetching events from calendar ${cal.summary}:`, calendarError);
        // Continue with other calendars even if one fails
      }
    }

    // Fetch todos that fall within the time range
    try {
      const startDate = new Date(timeMin).toISOString().split('T')[0];
      const endDate = new Date(timeMax).toISOString().split('T')[0];
      
      const { data: todos, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_email', session.user.email)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .eq('archived', false)
        .order('due_date', { ascending: true });

      if (!todosError && todos) {
        console.log(`Found ${todos.length} todos to include as calendar events`);
        
        // Convert todos to calendar events and add them
        for (const todo of todos) {
          const todoEvent = convertTodoToEvent(todo);
          allEvents.push(todoEvent);
        }
      } else if (todosError) {
        console.error('Error fetching todos:', todosError);
      }
    } catch (todoError) {
      console.error('Error fetching todos for calendar:', todoError);
      // Continue without todos rather than failing completely
    }

    // Sort all events (including todos) by start time
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    console.log(`Total events fetched (including todos): ${allEvents.length}`);

    return NextResponse.json({
      events: allEvents,
      calendars: calendars.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        color: cal.backgroundColor,
        accessRole: cal.accessRole,
        primary: cal.primary
      })),
      total: allEvents.length,
      timeRange: { timeMin, timeMax },
      includesAImpactTodos: true
    });

  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    
    // Check if it's a delegation error
    if (error.message?.includes('unauthorized_client')) {
      return NextResponse.json({
        error: 'Calendar access not authorized. Please ensure domain-wide delegation is configured.',
        details: 'The service account needs Calendar scopes in Google Admin Console.',
        setupGuide: true
      }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: error.message },
      { status: 500 }
    );
  }
}