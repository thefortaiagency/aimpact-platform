import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';

// Service account email
const SERVICE_ACCOUNT_EMAIL = 'aimpacthelp@thefortai-gc-env.iam.gserviceaccount.com';

async function getGmailClient(userEmail: string) {
  let serviceAccountKey;
  
  // Try to load from environment variable first
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } else {
    // Fall back to file (for local development)
    const fs = await import('fs');
    const path = await import('path');
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
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.settings.basic'
    ],
    subject: userEmail // Impersonate the user
  });

  // Authorize the client
  await jwtClient.authorize();

  // Create Gmail client
  const gmail = google.gmail({ version: 'v1', auth: jwtClient });
  
  return gmail;
}

// GET - List all filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gmail = await getGmailClient(session.user.email);
    
    const response = await gmail.users.settings.filters.list({
      userId: 'me'
    });

    return NextResponse.json({
      success: true,
      filters: response.data.filter || []
    });
  } catch (error: any) {
    console.error('Error listing filters:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to list filters'
    }, { status: 500 });
  }
}

// POST - Create a new filter
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const gmail = await getGmailClient(session.user.email);
    
    // Create filter criteria
    const filter: any = {
      criteria: {},
      action: {}
    };

    // Set criteria
    if (body.from) filter.criteria.from = body.from;
    if (body.to) filter.criteria.to = body.to;
    if (body.subject) filter.criteria.subject = body.subject;
    if (body.query) filter.criteria.query = body.query;
    if (body.hasAttachment !== undefined) filter.criteria.hasAttachment = body.hasAttachment;

    // Set actions
    if (body.addLabelIds) filter.action.addLabelIds = body.addLabelIds;
    if (body.removeLabelIds) filter.action.removeLabelIds = body.removeLabelIds;
    if (body.skipInbox) filter.action.removeLabelIds = ['INBOX'];
    if (body.markAsRead) filter.action.removeLabelIds = ['UNREAD'];
    if (body.delete) filter.action.delete = true;
    if (body.forward) filter.action.forward = body.forward;

    // Ensure label arrays are properly set
    if (body.skipInbox && !filter.action.removeLabelIds?.includes('INBOX')) {
      filter.action.removeLabelIds = [...(filter.action.removeLabelIds || []), 'INBOX'];
    }

    const response = await gmail.users.settings.filters.create({
      userId: 'me',
      requestBody: filter
    });

    return NextResponse.json({
      success: true,
      filter: response.data,
      message: 'Filter created successfully'
    });
  } catch (error: any) {
    console.error('Error creating filter:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create filter'
    }, { status: 500 });
  }
}

// DELETE - Delete a filter
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterId = searchParams.get('id');

    if (!filterId) {
      return NextResponse.json({
        success: false,
        error: 'Filter ID is required'
      }, { status: 400 });
    }

    const gmail = await getGmailClient(session.user.email);
    
    await gmail.users.settings.filters.delete({
      userId: 'me',
      id: filterId
    });

    return NextResponse.json({
      success: true,
      message: 'Filter deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting filter:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete filter'
    }, { status: 500 });
  }
}