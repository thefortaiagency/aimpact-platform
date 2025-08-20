import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';

// Initialize Gmail client
const getGmailClient = async (userEmail: string) => {
  try {
    const serviceAccountKey = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 
      JSON.stringify(require('@/credentials/gmail-service-account.json'))
    );

    const jwtClient = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      subject: userEmail
    });

    await jwtClient.authorize();
    return google.gmail({ version: 'v1', auth: jwtClient });
  } catch (error: any) {
    console.error('Failed to create Gmail client:', error);
    throw error;
  }
};

// GET - Fetch all Gmail folders/labels with message counts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const gmail = await getGmailClient(userEmail);
    
    // Get all labels
    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    const labels = labelsResponse.data.labels || [];
    
    // Categorize labels
    const systemLabels = labels.filter(label => 
      label.type === 'system' && 
      !['CHAT', 'CATEGORY_FORUMS', 'CATEGORY_UPDATES', 'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL'].includes(label.id || '')
    );
    
    const userLabels = labels.filter(label => label.type === 'user');
    const categoryLabels = labels.filter(label => 
      label.id?.startsWith('CATEGORY_') || ['CHAT'].includes(label.id || '')
    );
    
    // Get message counts for important folders
    const foldersWithCounts = await Promise.all([
      ...systemLabels.map(async (label) => {
        try {
          const messages = await gmail.users.messages.list({
            userId: 'me',
            labelIds: [label.id!],
            maxResults: 1
          });
          
          return {
            id: label.id,
            name: label.name,
            type: 'system',
            messageCount: messages.data.resultSizeEstimate || 0,
            unreadCount: label.messagesUnread || 0,
            color: getSystemLabelColor(label.id || ''),
            description: getSystemLabelDescription(label.id || '')
          };
        } catch (error) {
          return {
            id: label.id,
            name: label.name,
            type: 'system',
            messageCount: 0,
            unreadCount: label.messagesUnread || 0,
            color: getSystemLabelColor(label.id || ''),
            description: getSystemLabelDescription(label.id || '')
          };
        }
      }),
      
      ...userLabels.map(async (label) => {
        try {
          const messages = await gmail.users.messages.list({
            userId: 'me',
            labelIds: [label.id!],
            maxResults: 1
          });
          
          return {
            id: label.id,
            name: label.name,
            type: 'user',
            messageCount: messages.data.resultSizeEstimate || 0,
            unreadCount: label.messagesUnread || 0,
            color: '#3B82F6', // Blue for user labels
            description: 'Custom folder'
          };
        } catch (error) {
          return {
            id: label.id,
            name: label.name,
            type: 'user',
            messageCount: 0,
            unreadCount: label.messagesUnread || 0,
            color: '#3B82F6',
            description: 'Custom folder'
          };
        }
      })
    ]);
    
    return NextResponse.json({
      success: true,
      folders: foldersWithCounts,
      stats: {
        totalFolders: foldersWithCounts.length,
        userFolders: userLabels.length,
        systemFolders: systemLabels.length,
        totalMessages: foldersWithCounts.reduce((sum, folder) => sum + folder.messageCount, 0),
        totalUnread: foldersWithCounts.reduce((sum, folder) => sum + folder.unreadCount, 0)
      }
    });
    
  } catch (error: any) {
    console.error('Fetch folders error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch folders'
    }, { status: 500 });
  }
}

// POST - Create new Gmail folder/label
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { name, color = '#3B82F6' } = body;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Folder name is required'
      }, { status: 400 });
    }
    
    const gmail = await getGmailClient(userEmail);
    
    // Check if label already exists
    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    const existingLabel = labelsResponse.data.labels?.find(
      (label: any) => label.name === name
    );
    
    if (existingLabel) {
      return NextResponse.json({
        success: false,
        error: 'Folder with this name already exists'
      }, { status: 400 });
    }
    
    // Create new label
    const createResponse = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: name,
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow',
        type: 'user',
        color: {
          backgroundColor: color,
          textColor: '#FFFFFF'
        }
      }
    });
    
    const newLabel = createResponse.data;
    
    return NextResponse.json({
      success: true,
      folder: {
        id: newLabel.id,
        name: newLabel.name,
        type: 'user',
        messageCount: 0,
        unreadCount: 0,
        color: color,
        description: 'Custom folder'
      },
      message: `Folder "${name}" created successfully`
    });
    
  } catch (error: any) {
    console.error('Create folder error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create folder'
    }, { status: 500 });
  }
}

// DELETE - Delete Gmail folder/label
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    
    if (!folderId) {
      return NextResponse.json({
        success: false,
        error: 'Folder ID is required'
      }, { status: 400 });
    }
    
    const gmail = await getGmailClient(userEmail);
    
    // Get label info first
    const labelResponse = await gmail.users.labels.get({
      userId: 'me',
      id: folderId
    });
    
    const label = labelResponse.data;
    
    if (label.type === 'system') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete system folders'
      }, { status: 400 });
    }
    
    // Delete the label
    await gmail.users.labels.delete({
      userId: 'me',
      id: folderId
    });
    
    return NextResponse.json({
      success: true,
      message: `Folder "${label.name}" deleted successfully`
    });
    
  } catch (error: any) {
    console.error('Delete folder error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete folder'
    }, { status: 500 });
  }
}

// Helper functions
function getSystemLabelColor(labelId: string): string {
  const colorMap: { [key: string]: string } = {
    'INBOX': '#10B981', // Green
    'SENT': '#3B82F6', // Blue
    'DRAFT': '#F59E0B', // Amber
    'SPAM': '#EF4444', // Red
    'TRASH': '#6B7280', // Gray
    'STARRED': '#F59E0B', // Amber
    'IMPORTANT': '#EF4444', // Red
    'UNREAD': '#8B5CF6', // Purple
  };
  
  return colorMap[labelId] || '#6B7280';
}

function getSystemLabelDescription(labelId: string): string {
  const descriptions: { [key: string]: string } = {
    'INBOX': 'New incoming messages',
    'SENT': 'Messages you have sent',
    'DRAFT': 'Messages being composed',
    'SPAM': 'Spam messages',
    'TRASH': 'Deleted messages',
    'STARRED': 'Important starred messages',
    'IMPORTANT': 'Messages marked as important',
    'UNREAD': 'Unread messages',
  };
  
  return descriptions[labelId] || 'System folder';
}