import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

// GET - Test fetching Gmail signature
export async function GET(request: NextRequest) {
  try {
    const userEmail = 'aoberlin@thefortaiagency.ai';
    
    const gmail = await getGmailClient(userEmail);
    
    // Get the send-as settings which includes signatures
    const sendAsResponse = await gmail.users.settings.sendAs.list({
      userId: 'me'
    });
    
    const sendAsAddresses = sendAsResponse.data.sendAs || [];
    
    console.log('[Test] Found send-as addresses:', sendAsAddresses.length);
    
    // Get all signatures
    const signatures = sendAsAddresses.map(addr => ({
      email: addr.sendAsEmail,
      displayName: addr.displayName,
      isPrimary: addr.isPrimary,
      hasSignature: !!addr.signature,
      signatureLength: addr.signature ? addr.signature.length : 0,
      signaturePreview: addr.signature ? addr.signature.substring(0, 500) : null
    }));
    
    // Find the primary address
    const primaryAddress = sendAsAddresses.find(addr => addr.isPrimary);
    
    return NextResponse.json({
      success: true,
      userEmail,
      sendAsCount: sendAsAddresses.length,
      signatures,
      primarySignature: primaryAddress ? {
        email: primaryAddress.sendAsEmail,
        displayName: primaryAddress.displayName,
        signature: primaryAddress.signature,
        isDefault: primaryAddress.isDefault,
        isPrimary: primaryAddress.isPrimary
      } : null
    });
    
  } catch (error: any) {
    console.error('Test signature error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test signature',
      details: error
    }, { status: 500 });
  }
}