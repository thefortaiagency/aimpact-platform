// Twilio SMS Configuration for AImpact Nexus
// A2P Campaign for account verification and security notifications

export const TWILIO_CONFIG = {
  // Twilio Account Credentials (from environment variables)
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  
  // Default sender number (if not using Messaging Service)
  fromNumber: process.env.TWILIO_PHONE_NUMBER || '+12602647730',
  
  // A2P Campaign Configuration
  campaign: {
    brandName: 'The Fort AI Agency',
    campaignUseCase: 'Low Volume Mixed',
    description: 'Account verification, authentication, and security notifications for AImpact Nexus platform users',
  },
  
  // Message Templates
  templates: {
    verification: {
      body: 'AImpact Nexus: Your verification code is {{code}}. This code expires in 10 minutes. Do not share this code with anyone.',
      codeLength: 6,
      expiryMinutes: 10,
    },
    welcome: {
      body: 'Fort AI: Welcome! Please verify your account by entering code {{code}} or clicking: {{link}}',
    },
    passwordReset: {
      body: 'Your Fort AI password reset code is {{code}}. This code will expire in 15 minutes. If you didn\'t request this, please ignore this message.',
      codeLength: 6,
      expiryMinutes: 15,
    },
    securityAlert: {
      body: 'Security Alert: {{message}}. If this wasn\'t you, please secure your account immediately at https://aimpactnexus.ai/security',
    },
    loginCode: {
      body: 'AImpact Nexus: Your login code is {{code}}. Valid for 5 minutes. Reply STOP to unsubscribe.',
      codeLength: 6,
      expiryMinutes: 5,
    },
  },
  
  // Opt-in/Opt-out Configuration
  keywords: {
    optIn: ['START', 'VERIFY', 'SUBSCRIBE', 'YES', 'CONFIRM', 'ENABLE'],
    optOut: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
    help: ['HELP', 'INFO', 'SUPPORT'],
  },
  
  // Auto-response Messages
  autoResponses: {
    optIn: 'The Fort AI Agency: You\'re now opted-in to receive account security messages. Message frequency varies. Msg & data rates may apply. Reply HELP for support or STOP to cancel.',
    optOut: 'The Fort AI Agency: You have been unsubscribed from SMS notifications. You will no longer receive messages from us. Reply START to re-subscribe.',
    help: 'The Fort AI Agency: For support, visit https://aimpactnexus.ai/support or call (260) 999-0142. Reply STOP to unsubscribe. Msg & data rates may apply.',
  },
  
  // Rate Limiting
  rateLimits: {
    maxAttemptsPerPhone: 5,
    windowMinutes: 60,
    maxDailyMessages: 10,
  },
};

// Validation patterns
export const PHONE_VALIDATION = {
  // US phone number pattern
  US: /^\+1[2-9]\d{9}$/,
  // International format
  INTERNATIONAL: /^\+[1-9]\d{1,14}$/,
};

// Generate random verification code
export function generateVerificationCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

// Format phone number to E.164 format
export function formatPhoneToE164(phone: string, defaultCountryCode: string = '+1'): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (!phone.startsWith('+')) {
    if (cleaned.length === 10 && defaultCountryCode === '+1') {
      // US number without country code
      cleaned = '1' + cleaned;
    }
    return defaultCountryCode.replace('+', '') === '1' 
      ? '+' + cleaned 
      : defaultCountryCode + cleaned;
  }
  
  return '+' + cleaned;
}

// Validate phone number
export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneToE164(phone);
  return PHONE_VALIDATION.US.test(formatted) || PHONE_VALIDATION.INTERNATIONAL.test(formatted);
}

// Check if message contains opt-out keyword
export function containsOptOutKeyword(message: string): boolean {
  const normalizedMessage = message.toUpperCase().trim();
  return TWILIO_CONFIG.keywords.optOut.some(keyword => 
    normalizedMessage === keyword || normalizedMessage.startsWith(keyword + ' ')
  );
}

// Check if message contains opt-in keyword
export function containsOptInKeyword(message: string): boolean {
  const normalizedMessage = message.toUpperCase().trim();
  return TWILIO_CONFIG.keywords.optIn.some(keyword => 
    normalizedMessage === keyword || normalizedMessage.startsWith(keyword + ' ')
  );
}

// Check if message contains help keyword
export function containsHelpKeyword(message: string): boolean {
  const normalizedMessage = message.toUpperCase().trim();
  return TWILIO_CONFIG.keywords.help.some(keyword => 
    normalizedMessage === keyword || normalizedMessage.startsWith(keyword + ' ')
  );
}