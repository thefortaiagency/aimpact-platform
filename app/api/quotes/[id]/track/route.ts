import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = await request.json();
    
    // Get visitor information
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'direct';
    
    // Parse user agent for device info
    const isMobile = /mobile|android|iphone/i.test(userAgent);
    const device = isMobile ? 'mobile' : 'desktop';
    
    // Track the view
    const { data, error } = await supabase
      .from('quote_views')
      .insert({
        quote_id: quoteId,
        viewed_at: new Date().toISOString(),
        ip_address: ip.split(',')[0].trim(), // Get first IP if multiple
        user_agent: userAgent.substring(0, 255), // Limit length
        device_type: device,
        referer: referer,
        event_type: body.event || 'page_view',
        metadata: {
          ...body.metadata,
          timestamp: Date.now()
        }
      });
    
    if (error) {
      console.error('Error tracking quote view:', error);
    }
    
    // Also update a view counter on the quote itself
    if (quoteId === 'toledo-2025' || quoteId === '2025-001') {
      // Track Toledo specific views
      console.log(`📊 Toledo quote viewed from ${device} device at ${new Date().toLocaleString()}`);
    }
    
    return NextResponse.json({ 
      success: true,
      tracked: true,
      message: 'View tracked successfully'
    });
    
  } catch (error) {
    console.error('Error in quote tracking:', error);
    return NextResponse.json({ 
      success: false,
      tracked: false,
      error: 'Failed to track view' 
    });
  }
}