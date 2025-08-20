import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Track email campaign events for CRM contacts
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { 
      campaign_id,
      contact_id,
      event_type, // 'sent', 'opened', 'clicked', 'bounced', 'unsubscribed'
      metadata = {}
    } = await request.json();

    // Validate required fields
    if (!campaign_id || !contact_id || !event_type) {
      return NextResponse.json(
        { error: 'campaign_id, contact_id, and event_type are required' },
        { status: 400 }
      );
    }

    // Record the campaign event
    const { data: event, error: eventError } = await supabase
      .from('campaign_events')
      .insert({
        campaign_id,
        contact_id,
        event_type,
        metadata,
        occurred_at: new Date().toISOString()
      })
      .select()
      .single();

    if (eventError) {
      // If table doesn't exist, create it
      if (eventError.code === '42P01') {
        await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS campaign_events (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              campaign_id UUID REFERENCES campaigns(id),
              contact_id UUID REFERENCES contacts(id),
              event_type VARCHAR(50) NOT NULL,
              metadata JSONB DEFAULT '{}',
              occurred_at TIMESTAMPTZ DEFAULT NOW(),
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX idx_campaign_events_campaign ON campaign_events(campaign_id);
            CREATE INDEX idx_campaign_events_contact ON campaign_events(contact_id);
            CREATE INDEX idx_campaign_events_type ON campaign_events(event_type);
          `
        });
        
        // Retry the insert
        const { data: retryEvent } = await supabase
          .from('campaign_events')
          .insert({
            campaign_id,
            contact_id,
            event_type,
            metadata,
            occurred_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (retryEvent) {
          return processEvent(supabase, retryEvent, contact_id, event_type);
        }
      }
      
      console.error('Error recording campaign event:', eventError);
      return NextResponse.json(
        { error: 'Failed to record campaign event', details: eventError.message },
        { status: 500 }
      );
    }

    return processEvent(supabase, event, contact_id, event_type);

  } catch (error) {
    console.error('Campaign tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track campaign event' },
      { status: 500 }
    );
  }
}

async function processEvent(supabase: any, event: any, contact_id: string, event_type: string) {
  // Update contact's last engagement
  if (event_type === 'opened' || event_type === 'clicked') {
    await supabase
      .from('contacts')
      .update({
        last_engaged_at: new Date().toISOString(),
        engagement_score: supabase.raw('COALESCE(engagement_score, 0) + ?', [
          event_type === 'clicked' ? 5 : 1
        ])
      })
      .eq('id', contact_id);
  }

  // Handle unsubscribe
  if (event_type === 'unsubscribed') {
    await supabase
      .from('contacts')
      .update({
        email_opt_in: false,
        unsubscribed_at: new Date().toISOString()
      })
      .eq('id', contact_id);
  }

  // Create activity log
  await supabase.from('activities').insert({
    type: `email_${event_type}`,
    description: `Email campaign ${event_type}`,
    entity_type: 'contact',
    entity_id: contact_id,
    metadata: {
      campaign_id: event.campaign_id,
      event_type
    }
  });

  return NextResponse.json({
    success: true,
    event,
    message: `Campaign event tracked: ${event_type}`
  });
}

// GET endpoint to fetch campaign stats for a contact
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const contact_id = searchParams.get('contact_id');
    const campaign_id = searchParams.get('campaign_id');

    if (!contact_id && !campaign_id) {
      return NextResponse.json(
        { error: 'Either contact_id or campaign_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('campaign_events')
      .select(`
        *,
        campaign:campaigns(*),
        contact:contacts(*)
      `)
      .order('occurred_at', { ascending: false });

    if (contact_id) {
      query = query.eq('contact_id', contact_id);
    }
    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }

    const { data: events, error } = await query;

    if (error && error.code !== '42P01') { // Ignore table not exists error
      console.error('Error fetching campaign events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaign events', details: error.message },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total_campaigns: new Set(events?.map((e: any) => e.campaign_id) || []).size,
      emails_sent: events?.filter((e: any) => e.event_type === 'sent').length || 0,
      emails_opened: events?.filter((e: any) => e.event_type === 'opened').length || 0,
      links_clicked: events?.filter((e: any) => e.event_type === 'clicked').length || 0,
      bounced: events?.filter((e: any) => e.event_type === 'bounced').length || 0,
      unsubscribed: events?.filter((e: any) => e.event_type === 'unsubscribed').length || 0,
      events: events || []
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Campaign stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign stats' },
      { status: 500 }
    );
  }
}