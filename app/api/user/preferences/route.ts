import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { createClient } from '@supabase/supabase-js';
import { getDefaultSenderEmail, canUserSendFrom } from '@/lib/email-config';

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

interface UserPreferences {
  defaultSenderEmail?: string;
  emailSignature?: string;
  autoCC?: string[];
  autoBCC?: string[];
  replyToEmail?: string;
  sendReadReceipts?: boolean;
  saveToSent?: boolean;
  defaultMeetingDuration?: number;
  defaultMeetingType?: 'video' | 'phone' | 'in-person';
  defaultReminderMinutes?: number;
}

// GET - Fetch user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    
    // Try to get saved preferences from database
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_email', session.user.email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user preferences:', error);
    }

    // Return preferences or defaults
    const defaultPreferences: UserPreferences = {
      defaultSenderEmail: getDefaultSenderEmail(session.user.email),
      emailSignature: '',
      autoCC: [],
      autoBCC: [],
      replyToEmail: session.user.email,
      sendReadReceipts: false,
      saveToSent: true,
      defaultMeetingDuration: 60,
      defaultMeetingType: 'video',
      defaultReminderMinutes: 15
    };

    if (preferences) {
      return NextResponse.json({
        preferences: {
          defaultSenderEmail: preferences.default_sender_email || defaultPreferences.defaultSenderEmail,
          emailSignature: preferences.email_signature || defaultPreferences.emailSignature,
          autoCC: preferences.auto_cc || defaultPreferences.autoCC,
          autoBCC: preferences.auto_bcc || defaultPreferences.autoBCC,
          replyToEmail: preferences.reply_to_email || defaultPreferences.replyToEmail,
          sendReadReceipts: preferences.send_read_receipts ?? defaultPreferences.sendReadReceipts,
          saveToSent: preferences.save_to_sent ?? defaultPreferences.saveToSent,
          defaultMeetingDuration: preferences.default_meeting_duration || defaultPreferences.defaultMeetingDuration,
          defaultMeetingType: preferences.default_meeting_type || defaultPreferences.defaultMeetingType,
          defaultReminderMinutes: preferences.default_reminder_minutes || defaultPreferences.defaultReminderMinutes
        }
      });
    }

    return NextResponse.json({ preferences: defaultPreferences });
  } catch (error) {
    console.error('Error in GET /api/aimpact/user/preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UserPreferences = await request.json();
    
    // Validate default sender email if provided
    if (body.defaultSenderEmail) {
      if (!canUserSendFrom(session.user.email, body.defaultSenderEmail)) {
        return NextResponse.json(
          { error: 'You are not authorized to set this email as default sender' },
          { status: 403 }
        );
      }
    }
    
    // Validate reply-to email if provided
    if (body.replyToEmail) {
      if (!canUserSendFrom(session.user.email, body.replyToEmail)) {
        return NextResponse.json(
          { error: 'You are not authorized to use this reply-to email' },
          { status: 403 }
        );
      }
    }

    const supabase = getSupabaseClient();
    
    // Prepare preferences object for database
    const dbPreferences = {
      user_email: session.user.email,
      default_sender_email: body.defaultSenderEmail,
      email_signature: body.emailSignature,
      auto_cc: body.autoCC,
      auto_bcc: body.autoBCC,
      reply_to_email: body.replyToEmail,
      send_read_receipts: body.sendReadReceipts,
      save_to_sent: body.saveToSent,
      default_meeting_duration: body.defaultMeetingDuration,
      default_meeting_type: body.defaultMeetingType,
      default_reminder_minutes: body.defaultReminderMinutes,
      updated_at: new Date().toISOString()
    };

    // Upsert preferences (insert or update)
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(dbPreferences, { 
        onConflict: 'user_email' 
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: {
        defaultSenderEmail: data.default_sender_email,
        emailSignature: data.email_signature,
        autoCC: data.auto_cc,
        autoBCC: data.auto_bcc,
        replyToEmail: data.reply_to_email,
        sendReadReceipts: data.send_read_receipts,
        saveToSent: data.save_to_sent,
        defaultMeetingDuration: data.default_meeting_duration,
        defaultMeetingType: data.default_meeting_type,
        defaultReminderMinutes: data.default_reminder_minutes
      }
    });
  } catch (error) {
    console.error('Error in PUT /api/aimpact/user/preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

// PATCH - Update specific preference
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { field, value } = body;

    if (!field) {
      return NextResponse.json(
        { error: 'Field name required' },
        { status: 400 }
      );
    }

    // Validate email fields
    if (field === 'defaultSenderEmail' && value) {
      if (!canUserSendFrom(session.user.email, value)) {
        return NextResponse.json(
          { error: 'You are not authorized to use this email address' },
          { status: 403 }
        );
      }
    }

    const supabase = getSupabaseClient();
    
    // Map field names to database columns
    const fieldMap: Record<string, string> = {
      defaultSenderEmail: 'default_sender_email',
      emailSignature: 'email_signature',
      autoCC: 'auto_cc',
      autoBCC: 'auto_bcc',
      replyToEmail: 'reply_to_email',
      sendReadReceipts: 'send_read_receipts',
      saveToSent: 'save_to_sent',
      defaultMeetingDuration: 'default_meeting_duration',
      defaultMeetingType: 'default_meeting_type',
      defaultReminderMinutes: 'default_reminder_minutes'
    };

    const dbField = fieldMap[field];
    if (!dbField) {
      return NextResponse.json(
        { error: 'Invalid field name' },
        { status: 400 }
      );
    }

    // Update specific field
    const updateData = {
      user_email: session.user.email,
      [dbField]: value,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(updateData, { 
        onConflict: 'user_email' 
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating preference:', error);
      return NextResponse.json(
        { error: 'Failed to update preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      field,
      value: data[dbField]
    });
  } catch (error) {
    console.error('Error in PATCH /api/aimpact/user/preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preference' },
      { status: 500 }
    );
  }
}