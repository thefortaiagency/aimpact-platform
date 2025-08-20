import twilio from 'twilio';
import { 
  TWILIO_CONFIG, 
  generateVerificationCode, 
  formatPhoneToE164,
  validatePhoneNumber 
} from './twilio-config';

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!TWILIO_CONFIG.accountSid || !TWILIO_CONFIG.authToken) {
      throw new Error('Twilio credentials not configured');
    }
    twilioClient = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
  }
  return twilioClient;
}

// Store for verification codes (in production, use Redis or database)
const verificationCodes = new Map<string, {
  code: string;
  expiresAt: Date;
  attempts: number;
  type: 'verification' | 'login' | 'passwordReset';
}>();

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, {
  attempts: number;
  resetAt: Date;
}>();

// Check rate limiting
function checkRateLimit(phone: string): boolean {
  const now = new Date();
  const limit = rateLimitStore.get(phone);
  
  if (!limit || limit.resetAt < now) {
    // Reset or create new limit
    rateLimitStore.set(phone, {
      attempts: 1,
      resetAt: new Date(now.getTime() + TWILIO_CONFIG.rateLimits.windowMinutes * 60000),
    });
    return true;
  }
  
  if (limit.attempts >= TWILIO_CONFIG.rateLimits.maxAttemptsPerPhone) {
    return false;
  }
  
  limit.attempts++;
  return true;
}

// Send verification code
export async function sendVerificationCode(
  phone: string,
  type: 'verification' | 'login' | 'passwordReset' = 'verification'
): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      return { success: false, message: 'Invalid phone number format' };
    }
    
    // Format phone number
    const formattedPhone = formatPhoneToE164(phone);
    
    // Check rate limiting
    if (!checkRateLimit(formattedPhone)) {
      return { 
        success: false, 
        message: 'Too many attempts. Please try again later.' 
      };
    }
    
    // Generate verification code
    const template = TWILIO_CONFIG.templates[type];
    const code = generateVerificationCode(template.codeLength || 6);
    
    // Store verification code
    verificationCodes.set(formattedPhone, {
      code,
      expiresAt: new Date(Date.now() + (template.expiryMinutes || 10) * 60000),
      attempts: 0,
      type,
    });
    
    // Prepare message body
    let messageBody = template.body.replace('{{code}}', code);
    
    // If it's a welcome message, add a verification link
    if (type === 'verification') {
      const verifyLink = `https://aimpactnexus.ai/verify?phone=${encodeURIComponent(formattedPhone)}&code=${code}`;
      messageBody = messageBody.replace('{{link}}', verifyLink);
    }
    
    // Send SMS via Twilio
    const client = getTwilioClient();
    const message = await client.messages.create({
      body: messageBody,
      messagingServiceSid: TWILIO_CONFIG.messagingServiceSid,
      to: formattedPhone,
    });
    
    return {
      success: true,
      message: 'Verification code sent successfully',
      sid: message.sid,
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send verification code',
    };
  }
}

// Verify code
export async function verifyCode(
  phone: string,
  code: string,
  type?: 'verification' | 'login' | 'passwordReset'
): Promise<{ success: boolean; message: string }> {
  try {
    const formattedPhone = formatPhoneToE164(phone);
    const storedData = verificationCodes.get(formattedPhone);
    
    if (!storedData) {
      return { success: false, message: 'No verification code found for this number' };
    }
    
    // Check if code has expired
    if (storedData.expiresAt < new Date()) {
      verificationCodes.delete(formattedPhone);
      return { success: false, message: 'Verification code has expired' };
    }
    
    // Check if type matches (if specified)
    if (type && storedData.type !== type) {
      return { success: false, message: 'Invalid verification code type' };
    }
    
    // Increment attempts
    storedData.attempts++;
    
    // Check if too many attempts
    if (storedData.attempts > 3) {
      verificationCodes.delete(formattedPhone);
      return { success: false, message: 'Too many incorrect attempts' };
    }
    
    // Verify code
    if (storedData.code !== code) {
      return { success: false, message: 'Invalid verification code' };
    }
    
    // Success - remove code from store
    verificationCodes.delete(formattedPhone);
    return { success: true, message: 'Phone number verified successfully' };
  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify code',
    };
  }
}

// Send custom SMS
export async function sendSMS(
  phone: string,
  message: string
): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      return { success: false, message: 'Invalid phone number format' };
    }
    
    const formattedPhone = formatPhoneToE164(phone);
    
    // Check rate limiting
    if (!checkRateLimit(formattedPhone)) {
      return { 
        success: false, 
        message: 'Too many messages sent. Please try again later.' 
      };
    }
    
    // Send SMS via Twilio
    const client = getTwilioClient();
    const twilioMessage = await client.messages.create({
      body: message,
      messagingServiceSid: TWILIO_CONFIG.messagingServiceSid,
      to: formattedPhone,
    });
    
    return {
      success: true,
      message: 'Message sent successfully',
      sid: twilioMessage.sid,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

// Handle incoming SMS (webhook)
export async function handleIncomingSMS(
  from: string,
  body: string
): Promise<{ response: string }> {
  const messageBody = body.trim();
  
  // Check for opt-out keywords
  if (TWILIO_CONFIG.keywords.optOut.some(keyword => 
    messageBody.toUpperCase() === keyword
  )) {
    // In production, update user preferences in database
    return { response: TWILIO_CONFIG.autoResponses.optOut };
  }
  
  // Check for opt-in keywords
  if (TWILIO_CONFIG.keywords.optIn.some(keyword => 
    messageBody.toUpperCase() === keyword
  )) {
    // In production, update user preferences in database
    return { response: TWILIO_CONFIG.autoResponses.optIn };
  }
  
  // Check for help keywords
  if (TWILIO_CONFIG.keywords.help.some(keyword => 
    messageBody.toUpperCase() === keyword
  )) {
    return { response: TWILIO_CONFIG.autoResponses.help };
  }
  
  // Default response for unrecognized messages
  return { 
    response: 'Reply HELP for assistance, STOP to unsubscribe.' 
  };
}

// Send security alert
export async function sendSecurityAlert(
  phone: string,
  alertMessage: string
): Promise<{ success: boolean; message: string; sid?: string }> {
  const message = TWILIO_CONFIG.templates.securityAlert.body.replace('{{message}}', alertMessage);
  return sendSMS(phone, message);
}

// Clean up expired codes (call periodically)
export function cleanupExpiredCodes(): void {
  const now = new Date();
  for (const [phone, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) {
      verificationCodes.delete(phone);
    }
  }
}

// Clean up rate limit store (call periodically)
export function cleanupRateLimits(): void {
  const now = new Date();
  for (const [phone, data] of rateLimitStore.entries()) {
    if (data.resetAt < now) {
      rateLimitStore.delete(phone);
    }
  }
}