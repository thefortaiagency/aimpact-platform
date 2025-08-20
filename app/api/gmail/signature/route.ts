import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';

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
        'https://www.googleapis.com/auth/gmail.settings.basic',
        'https://www.googleapis.com/auth/gmail.settings.sharing'
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

// GET - Fetch user's Gmail signature
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = 'aoberlin@thefortaiagency.ai';
    
    const gmail = await getGmailClient(userEmail);
    
    // Get the send-as settings which includes signatures
    const sendAsResponse = await gmail.users.settings.sendAs.list({
      userId: 'me'
    });
    
    const sendAsAddresses = sendAsResponse.data.sendAs || [];
    
    // Find the primary or matching email address
    const primaryAddress = sendAsAddresses.find(
      addr => addr.isPrimary || addr.sendAsEmail === userEmail
    );
    
    if (primaryAddress && primaryAddress.signature) {
      return NextResponse.json({
        success: true,
        signature: primaryAddress.signature,
        email: primaryAddress.sendAsEmail,
        displayName: primaryAddress.displayName
      });
    }
    
    // If no signature found, return empty
    return NextResponse.json({
      success: true,
      signature: '',
      email: userEmail,
      message: 'No signature configured in Gmail'
    });
    
  } catch (error: any) {
    console.error('Failed to fetch Gmail signature:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch signature',
      details: error.message
    }, { status: 500 });
  }
}