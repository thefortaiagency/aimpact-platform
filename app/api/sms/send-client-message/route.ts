import { NextRequest, NextResponse } from 'next/server';
import { sendClientMessage, sendTicketNotification, sendProjectUpdate } from '@/lib/twilio-client-messaging';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      phone, 
      message, 
      type = 'general',
      context,
      // For ticket notifications
      ticketNumber,
      subject,
      details,
      // For project updates
      projectName,
      status,
    } = await request.json();
    
    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'ticket_created':
      case 'ticket_update':
      case 'ticket_resolved':
        if (!ticketNumber || !subject) {
          return NextResponse.json(
            { success: false, message: 'Ticket number and subject are required' },
            { status: 400 }
          );
        }
        result = await sendTicketNotification(
          phone, 
          ticketNumber, 
          subject,
          type.replace('ticket_', '') as 'created' | 'update' | 'resolved',
          details
        );
        break;

      case 'project_update':
        if (!projectName || !status) {
          return NextResponse.json(
            { success: false, message: 'Project name and status are required' },
            { status: 400 }
          );
        }
        result = await sendProjectUpdate(phone, projectName, status, details || '');
        break;

      case 'general':
      default:
        if (!message) {
          return NextResponse.json(
            { success: false, message: 'Message content is required' },
            { status: 400 }
          );
        }
        result = await sendClientMessage(phone, message, context);
        break;
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    // Log the message in your database (optional)
    console.log('Client SMS sent:', {
      type,
      to: phone,
      by: session.user?.email,
      sid: result.sid,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      sid: result.sid,
    });
  } catch (error) {
    console.error('Error in send-client-message API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send message' 
      },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Client SMS Messaging API is operational',
    endpoints: {
      send: 'POST /api/sms/send-client-message',
      webhook: 'POST /api/sms/webhook',
    },
    messageTypes: [
      'general',
      'ticket_created',
      'ticket_update', 
      'ticket_resolved',
      'project_update',
    ],
  });
}