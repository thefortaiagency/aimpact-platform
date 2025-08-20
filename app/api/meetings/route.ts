import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { StreamClient } from '@stream-io/node-sdk';

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

// GET - Fetch all meetings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    
    console.log('[Meetings API] Fetching meetings for user:', session.user.email);
    
    // Get meetings where user is organizer
    const { data: organizerMeetings, error: orgError } = await supabase
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
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    // Get meetings where user is an attendee
    const { data: attendeeMeetings, error: attError } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_attendees!inner (
          email,
          name,
          status
        )
      `)
      .eq('meeting_attendees.email', session.user.email)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    if (orgError || attError) {
      console.error('Error fetching meetings:', orgError || attError);
      return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
    }
    
    // Combine and deduplicate meetings
    const allMeetings = [...(organizerMeetings || []), ...(attendeeMeetings || [])];
    const uniqueMeetings = Array.from(
      new Map(allMeetings.map(m => [m.id, m])).values()
    );
    
    console.log('[Meetings API] Found meetings:', {
      organizerCount: organizerMeetings?.length || 0,
      attendeeCount: attendeeMeetings?.length || 0,
      totalUnique: uniqueMeetings.length
    });

    // Format meetings for response
    const formattedMeetings = uniqueMeetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      date: meeting.date,
      time: meeting.time,
      duration: meeting.duration,
      type: meeting.type,
      location: meeting.location,
      meetingUrl: meeting.meeting_url,
      attendees: meeting.meeting_attendees?.map((a: any) => a.email) || [],
      reminder: meeting.reminder,
      status: meeting.status,
      createdAt: meeting.created_at,
      notes: meeting.notes,
      organizerEmail: meeting.organizer_email
    }));

    return NextResponse.json({ meetings: formattedMeetings });
  } catch (error) {
    console.error('Error in GET /api/aimpact/meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Meeting creation request body:', body);
    
    const {
      title,
      description,
      date,
      time,
      duration,
      type,
      location,
      meetingUrl,
      attendees,
      reminder,
      notes,
      requiresPassword,
      password,
      waitingRoomEnabled,
      maxParticipants,
      createStreamCall
    } = body;

    if (!title || !date || !time || !duration || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Create the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title,
        description: description || '',
        date,
        time,
        duration,
        type,
        location: location || null,
        meeting_url: meetingUrl || null,
        reminder: reminder || 15,
        status: 'scheduled',
        notes: notes || null,
        organizer_email: session.user.email,
        created_by: session.user.email,
        requires_password: requiresPassword || false,
        password: password || null,
        waiting_room_enabled: waitingRoomEnabled !== undefined ? waitingRoomEnabled : true,
        max_participants: maxParticipants || 100
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Error creating meeting:', meetingError);
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

    // Create Stream.io call if requested (for instant meetings)
    if (createStreamCall && type === 'video') {
      try {
        // Initialize Stream client
        const streamClient = new StreamClient(
          process.env.NEXT_PUBLIC_STREAM_API_KEY!,
          process.env.STREAM_API_SECRET!
        );

        // Create the call
        const call = streamClient.video.call('default', meeting.id);
        await call.getOrCreate({
          data: {
            created_by_id: session.user.email,
            created_by: {
              id: session.user.email,
              name: session.user.name || session.user.email
            },
            settings_override: {
              recording: {
                mode: 'disabled'
              },
              geofencing: {
                names: ['european_union', 'united_states']
              }
            },
            custom: {
              title,
              description,
              hostEmail: session.user.email,
              requiresPassword: requiresPassword || false,
              waitingRoomEnabled: waitingRoomEnabled || false
            }
          }
        });

        console.log('Stream.io call created successfully for meeting:', meeting.id);
      } catch (streamError) {
        console.error('Error creating Stream.io call:', streamError);
        // Don't fail the whole request if Stream call creation fails
        // The call can be created on first join instead
      }
    }

    // Add attendees (only if provided and not empty)
    if (attendees && attendees.length > 0) {
      const attendeeRecords = attendees.map((email: string) => ({
        meeting_id: meeting.id,
        email,
        status: 'invited'
      }));

      const { error: attendeeError } = await supabase
        .from('meeting_attendees')
        .insert(attendeeRecords);

      if (attendeeError) {
        console.error('Error adding attendees:', attendeeError);
        // Don't fail the whole request if attendees fail
      }
    }

    // Log activity (with error handling)
    try {
      await supabase
        .from('activities')
        .insert({
          type: 'meeting_scheduled',
          description: `Scheduled meeting: ${title}`,
          entity_type: 'meeting',
          entity_id: meeting.id,
          metadata: {
            date,
            time,
            duration,
            type,
            attendeeCount: attendees?.length || 0
          }
        });
    } catch (activityError) {
      // Don't fail if activity logging fails
      console.error('Error logging activity:', activityError);
    }

    console.log('✅ Meeting created successfully:', {
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      type: meeting.type,
      status: meeting.status,
      organizerEmail: meeting.organizer_email
    });

    return NextResponse.json({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      date: meeting.date,
      time: meeting.time,
      duration: meeting.duration,
      type: meeting.type,
      location: meeting.location,
      meetingUrl: meeting.meeting_url,
      attendees: attendees || [],
      reminder: meeting.reminder,
      status: meeting.status,
      createdAt: meeting.created_at,
      notes: meeting.notes,
      requiresPassword: meeting.requires_password,
      password: meeting.password,
      waitingRoomEnabled: meeting.waiting_room_enabled,
      maxParticipants: meeting.max_participants,
      organizerEmail: meeting.organizer_email
    });
  } catch (error) {
    console.error('Error in POST /api/aimpact/meetings:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}

// PATCH - Update a meeting
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Update the meeting
    const { data: meeting, error } = await supabase
      .from('meetings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organizer_email', session.user.email) // Only organizer can update
      .select()
      .single();

    if (error) {
      console.error('Error updating meeting:', error);
      return NextResponse.json(
        { error: 'Failed to update meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Error in PATCH /api/aimpact/meetings:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a meeting
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action') || 'delete'; // 'delete' or 'cancel'

    if (!id) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // First verify the user owns this meeting
    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    // Check if user is the organizer
    if (meeting.organizer_email !== session.user.email) {
      return NextResponse.json({ error: 'You can only modify your own meetings' }, { status: 403 });
    }

    if (action === 'cancel') {
      // Just update status to cancelled
      const { error } = await supabase
        .from('meetings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error cancelling meeting:', error);
        return NextResponse.json(
          { error: 'Failed to cancel meeting' },
          { status: 500 }
        );
      }
    } else {
      // Delete completely
      // Delete attendees first (foreign key constraint)
      await supabase
        .from('meeting_attendees')
        .delete()
        .eq('meeting_id', id);
      
      // Delete the meeting
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Error deleting meeting:', deleteError);
        return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
      }
      
      // Delete Stream.io call if it exists
      if (meeting.meeting_url && process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET) {
        try {
          const streamClient = new StreamClient(
            process.env.STREAM_API_KEY,
            process.env.STREAM_API_SECRET
          );
          const callId = meeting.meeting_url.split('/').pop();
          if (callId) {
            const call = streamClient.video.call('default', callId);
            await call.delete({ hard: true });
          }
        } catch (streamError) {
          console.error('Error deleting Stream.io call:', streamError);
          // Don't fail if Stream deletion fails
        }
      }
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error in DELETE /api/aimpact/meetings:', error);
    return NextResponse.json(
      { error: 'Failed to cancel meeting' },
      { status: 500 }
    );
  }
}