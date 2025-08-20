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

// POST - Manage email operations (move, mark read, delete, etc.)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { 
      action, // 'move', 'mark_read', 'mark_unread', 'star', 'unstar', 'delete', 'archive', 'mark_important'
      messageIds, // Array of message IDs
      targetFolderId, // For move operations
      sourceFolderId // For move operations
    } = body;
    
    if (!action || !messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({
        success: false,
        error: 'Action and messageIds array are required'
      }, { status: 400 });
    }
    
    const gmail = await getGmailClient(userEmail);
    const results = [];
    
    for (const messageId of messageIds) {
      try {
        let modifyRequest: any = {};
        let operation = action;
        
        switch (action) {
          case 'move':
            if (!targetFolderId) {
              throw new Error('targetFolderId is required for move operation');
            }
            
            // Remove from source folder and add to target folder
            modifyRequest = {
              addLabelIds: [targetFolderId],
              removeLabelIds: sourceFolderId ? [sourceFolderId] : ['INBOX']
            };
            break;
            
          case 'mark_read':
            modifyRequest = {
              removeLabelIds: ['UNREAD']
            };
            break;
            
          case 'mark_unread':
            modifyRequest = {
              addLabelIds: ['UNREAD']
            };
            break;
            
          case 'star':
            modifyRequest = {
              addLabelIds: ['STARRED']
            };
            break;
            
          case 'unstar':
            modifyRequest = {
              removeLabelIds: ['STARRED']
            };
            break;
            
          case 'mark_important':
            modifyRequest = {
              addLabelIds: ['IMPORTANT']
            };
            break;
            
          case 'archive':
            modifyRequest = {
              removeLabelIds: ['INBOX']
            };
            break;
            
          case 'delete':
            // Move to trash
            modifyRequest = {
              addLabelIds: ['TRASH'],
              removeLabelIds: ['INBOX']
            };
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        
        const response = await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: modifyRequest
        });
        
        results.push({
          messageId,
          success: true,
          action: operation
        });
        
      } catch (error: any) {
        results.push({
          messageId,
          success: false,
          error: error.message,
          action: operation
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: messageIds.length,
        successful: successCount,
        failed: failureCount,
        action: action
      },
      message: `${action} operation: ${successCount} successful, ${failureCount} failed`
    });
    
  } catch (error: any) {
    console.error('Gmail management error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to manage emails'
    }, { status: 500 });
  }
}

// GET - Get emails from specific folder with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'INBOX';
    const maxResults = parseInt(searchParams.get('maxResults') || '20');
    const pageToken = searchParams.get('pageToken') || undefined;
    
    const gmail = await getGmailClient(userEmail);
    
    // Get messages from folder
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [folderId],
      maxResults,
      pageToken
    });
    
    const messages = messagesResponse.data.messages || [];
    
    // Get full message details for each message
    const emailDetails = await Promise.all(
      messages.slice(0, 10).map(async (message) => { // Limit to 10 for performance
        try {
          const messageDetail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full'
          });
          
          const payload = messageDetail.data.payload;
          const headers = payload?.headers || [];
          
          // Extract headers
          const getHeader = (name: string) => 
            headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
          
          // Extract body
          let body = '';
          if (payload?.parts) {
            const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
          } else if (payload?.body?.data) {
            body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
          }
          
          return {
            id: message.id,
            threadId: messageDetail.data.threadId,
            subject: getHeader('subject'),
            from: getHeader('from'),
            to: getHeader('to'),
            date: getHeader('date'),
            body: body.substring(0, 500), // Truncate for performance
            labels: messageDetail.data.labelIds || [],
            unread: messageDetail.data.labelIds?.includes('UNREAD') || false,
            starred: messageDetail.data.labelIds?.includes('STARRED') || false,
            important: messageDetail.data.labelIds?.includes('IMPORTANT') || false,
            hasAttachments: (payload?.parts?.length || 0) > 1
          };
          
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error);
          return null;
        }
      })
    );
    
    const validEmails = emailDetails.filter(email => email !== null);
    
    return NextResponse.json({
      success: true,
      emails: validEmails,
      pagination: {
        nextPageToken: messagesResponse.data.nextPageToken,
        resultSizeEstimate: messagesResponse.data.resultSizeEstimate,
        currentPage: validEmails.length,
        hasNextPage: !!messagesResponse.data.nextPageToken
      },
      folderId,
      folderName: getFolderName(folderId)
    });
    
  } catch (error: any) {
    console.error('Get emails error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get emails'
    }, { status: 500 });
  }
}

// Helper function to get folder name
function getFolderName(folderId: string): string {
  const folderNames: { [key: string]: string } = {
    'INBOX': 'Inbox',
    'SENT': 'Sent',
    'DRAFT': 'Drafts',
    'SPAM': 'Spam',
    'TRASH': 'Trash',
    'STARRED': 'Starred',
    'IMPORTANT': 'Important',
    'UNREAD': 'Unread'
  };
  
  return folderNames[folderId] || folderId;
}