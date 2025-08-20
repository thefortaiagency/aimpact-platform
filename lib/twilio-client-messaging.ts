import twilio from 'twilio';
import { TWILIO_CONFIG, formatPhoneToE164, validatePhoneNumber } from './twilio-config';

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

// Message templates for client communication
export const CLIENT_MESSAGE_TEMPLATES = {
  ticketCreated: {
    body: 'Fort AI: Ticket #{{ticketNumber}} created - {{subject}}. We\'ll resolve this ASAP. Reply here or call (260) 999-0142. Reply STOP to opt-out.',
    requiresOptIn: true,
  },
  ticketUpdate: {
    body: 'Fort AI Update: Ticket #{{ticketNumber}} - {{update}}. Questions? Reply here or call support.',
    requiresOptIn: true,
  },
  ticketResolved: {
    body: 'Fort AI: Great news! Ticket #{{ticketNumber}} has been resolved. {{resolution}}. Need more help? Just reply!',
    requiresOptIn: true,
  },
  generalMessage: {
    body: '{{message}} - Fort AI Support Team',
    requiresOptIn: true,
  },
  appointmentReminder: {
    body: 'Fort AI Reminder: {{appointment}} scheduled for {{date}} at {{time}}. Reply Y to confirm or R to reschedule.',
    requiresOptIn: true,
  },
  projectUpdate: {
    body: 'Fort AI Project Update: {{projectName}} - {{status}}. {{details}} View full details at aimpactnexus.ai/projects',
    requiresOptIn: true,
  },
  invoiceReminder: {
    body: 'Fort AI: Invoice #{{invoiceNumber}} for ${{amount}} is {{status}}. {{paymentLink}} Questions? Reply or call accounting.',
    requiresOptIn: true,
  },
};

// Interface for conversation tracking
export interface SMSConversation {
  clientPhone: string;
  clientName?: string;
  organizationId?: string;
  ticketId?: string;
  projectId?: string;
  lastMessageAt: Date;
  optedIn: boolean;
  preferredChannel: 'sms' | 'email' | 'phone' | 'all';
}

// Send ticket notification to client
export async function sendTicketNotification(
  clientPhone: string,
  ticketNumber: string,
  subject: string,
  type: 'created' | 'update' | 'resolved',
  details?: string
): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    if (!validatePhoneNumber(clientPhone)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    const formattedPhone = formatPhoneToE164(clientPhone);
    let messageBody = '';

    switch (type) {
      case 'created':
        messageBody = CLIENT_MESSAGE_TEMPLATES.ticketCreated.body
          .replace('{{ticketNumber}}', ticketNumber)
          .replace('{{subject}}', subject);
        break;
      case 'update':
        messageBody = CLIENT_MESSAGE_TEMPLATES.ticketUpdate.body
          .replace('{{ticketNumber}}', ticketNumber)
          .replace('{{update}}', details || 'Status updated');
        break;
      case 'resolved':
        messageBody = CLIENT_MESSAGE_TEMPLATES.ticketResolved.body
          .replace('{{ticketNumber}}', ticketNumber)
          .replace('{{resolution}}', details || 'Issue has been resolved');
        break;
    }

    const client = getTwilioClient();
    const messageOptions: any = {
      body: messageBody,
      to: formattedPhone,
    };
    
    // Use messaging service if available, otherwise use from number
    if (TWILIO_CONFIG.messagingServiceSid) {
      messageOptions.messagingServiceSid = TWILIO_CONFIG.messagingServiceSid;
    } else {
      messageOptions.from = TWILIO_CONFIG.fromNumber;
    }
    
    const message = await client.messages.create(messageOptions);

    return {
      success: true,
      message: 'Notification sent successfully',
      sid: message.sid,
    };
  } catch (error) {
    console.error('Error sending ticket notification:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send notification',
    };
  }
}

// Send project update to client
export async function sendProjectUpdate(
  clientPhone: string,
  projectName: string,
  status: string,
  details: string
): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    if (!validatePhoneNumber(clientPhone)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    const formattedPhone = formatPhoneToE164(clientPhone);
    const messageBody = CLIENT_MESSAGE_TEMPLATES.projectUpdate.body
      .replace('{{projectName}}', projectName)
      .replace('{{status}}', status)
      .replace('{{details}}', details);

    const client = getTwilioClient();
    const messageOptions: any = {
      body: messageBody,
      to: formattedPhone,
    };
    
    // Use messaging service if available, otherwise use from number
    if (TWILIO_CONFIG.messagingServiceSid) {
      messageOptions.messagingServiceSid = TWILIO_CONFIG.messagingServiceSid;
    } else {
      messageOptions.from = TWILIO_CONFIG.fromNumber;
    }
    
    const message = await client.messages.create(messageOptions);

    return {
      success: true,
      message: 'Project update sent successfully',
      sid: message.sid,
    };
  } catch (error) {
    console.error('Error sending project update:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send update',
    };
  }
}

// Send custom message to client
export async function sendClientMessage(
  clientPhone: string,
  message: string,
  context?: {
    ticketId?: string;
    projectId?: string;
    organizationId?: string;
  }
): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    if (!validatePhoneNumber(clientPhone)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    const formattedPhone = formatPhoneToE164(clientPhone);
    
    // Add signature if not present
    if (!message.includes('Fort AI')) {
      message = `${message} - Fort AI Support Team`;
    }

    const client = getTwilioClient();
    const messageOptions: any = {
      body: message,
      to: formattedPhone,
    };
    
    // Use messaging service if available, otherwise use from number
    if (TWILIO_CONFIG.messagingServiceSid) {
      messageOptions.messagingServiceSid = TWILIO_CONFIG.messagingServiceSid;
    } else {
      messageOptions.from = TWILIO_CONFIG.fromNumber;
    }
    
    const twilioMessage = await client.messages.create(messageOptions);

    // Log the conversation for tracking
    console.log('Client message sent:', {
      to: formattedPhone,
      context,
      sid: twilioMessage.sid,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Message sent successfully',
      sid: twilioMessage.sid,
    };
  } catch (error) {
    console.error('Error sending client message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

// Handle incoming client message (webhook)
export async function handleIncomingClientMessage(
  from: string,
  body: string,
  messageSid: string
): Promise<{ 
  response: string; 
  shouldCreateTicket?: boolean;
  ticketSubject?: string;
  ticketDescription?: string;
}> {
  const messageBody = body.trim();
  const normalizedMessage = messageBody.toUpperCase();

  // Check for opt-out
  if (TWILIO_CONFIG.keywords.optOut.some(keyword => 
    normalizedMessage === keyword || normalizedMessage.startsWith(keyword + ' ')
  )) {
    return { 
      response: 'Fort AI: You\'ve been unsubscribed from SMS notifications. You can still reach us at (260) 999-0142 or support@thefortaiagency.ai' 
    };
  }

  // Check for help request
  if (TWILIO_CONFIG.keywords.help.some(keyword => 
    normalizedMessage === keyword || normalizedMessage.startsWith(keyword + ' ')
  )) {
    return { 
      response: 'Fort AI Support: Call (260) 999-0142, email support@thefortaiagency.ai, or reply with your issue. Reply STOP to unsubscribe.' 
    };
  }

  // Check for appointment confirmation
  if (normalizedMessage === 'Y' || normalizedMessage === 'YES') {
    return { 
      response: 'Fort AI: Appointment confirmed! We\'ll send a reminder 1 hour before. Thank you!' 
    };
  }

  // Check for reschedule request
  if (normalizedMessage === 'R' || normalizedMessage === 'RESCHEDULE') {
    return { 
      response: 'Fort AI: To reschedule, please call (260) 999-0142 or visit aimpactnexus.ai/schedule' 
    };
  }

  // Check if this looks like a support request
  const supportKeywords = ['HELP', 'ISSUE', 'PROBLEM', 'ERROR', 'BUG', 'DOWN', 'NOT WORKING', 'BROKEN', 'URGENT'];
  const isSupport = supportKeywords.some(keyword => normalizedMessage.includes(keyword));

  if (isSupport) {
    return {
      response: 'Fort AI: I\'ve received your message and will create a support ticket. A team member will respond shortly.',
      shouldCreateTicket: true,
      ticketSubject: `SMS Support Request from ${from}`,
      ticketDescription: messageBody,
    };
  }

  // Default response for general messages
  return {
    response: 'Fort AI: Message received! A team member will respond during business hours. For urgent issues, call (260) 999-0142.',
  };
}

// Send appointment reminder
export async function sendAppointmentReminder(
  clientPhone: string,
  appointmentType: string,
  date: string,
  time: string
): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    if (!validatePhoneNumber(clientPhone)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    const formattedPhone = formatPhoneToE164(clientPhone);
    const messageBody = CLIENT_MESSAGE_TEMPLATES.appointmentReminder.body
      .replace('{{appointment}}', appointmentType)
      .replace('{{date}}', date)
      .replace('{{time}}', time);

    const client = getTwilioClient();
    const messageOptions: any = {
      body: messageBody,
      to: formattedPhone,
    };
    
    // Use messaging service if available, otherwise use from number
    if (TWILIO_CONFIG.messagingServiceSid) {
      messageOptions.messagingServiceSid = TWILIO_CONFIG.messagingServiceSid;
    } else {
      messageOptions.from = TWILIO_CONFIG.fromNumber;
    }
    
    const message = await client.messages.create(messageOptions);

    return {
      success: true,
      message: 'Appointment reminder sent',
      sid: message.sid,
    };
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send reminder',
    };
  }
}

// Send invoice notification
export async function sendInvoiceNotification(
  clientPhone: string,
  invoiceNumber: string,
  amount: string,
  status: 'due' | 'overdue' | 'paid',
  paymentLink?: string
): Promise<{ success: boolean; message: string; sid?: string }> {
  try {
    if (!validatePhoneNumber(clientPhone)) {
      return { success: false, message: 'Invalid phone number format' };
    }

    const formattedPhone = formatPhoneToE164(clientPhone);
    const statusText = status === 'due' ? 'due for payment' : status === 'overdue' ? 'overdue' : 'paid - thank you!';
    const paymentInfo = paymentLink ? `Pay online: ${paymentLink}` : '';
    
    const messageBody = CLIENT_MESSAGE_TEMPLATES.invoiceReminder.body
      .replace('{{invoiceNumber}}', invoiceNumber)
      .replace('{{amount}}', amount)
      .replace('{{status}}', statusText)
      .replace('{{paymentLink}}', paymentInfo);

    const client = getTwilioClient();
    const messageOptions: any = {
      body: messageBody,
      to: formattedPhone,
    };
    
    // Use messaging service if available, otherwise use from number
    if (TWILIO_CONFIG.messagingServiceSid) {
      messageOptions.messagingServiceSid = TWILIO_CONFIG.messagingServiceSid;
    } else {
      messageOptions.from = TWILIO_CONFIG.fromNumber;
    }
    
    const message = await client.messages.create(messageOptions);

    return {
      success: true,
      message: 'Invoice notification sent',
      sid: message.sid,
    };
  } catch (error) {
    console.error('Error sending invoice notification:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send notification',
    };
  }
}

// Batch send messages to multiple clients
export async function sendBatchMessages(
  recipients: Array<{ phone: string; message: string; context?: any }>,
  delayMs: number = 1000
): Promise<Array<{ phone: string; success: boolean; sid?: string; error?: string }>> {
  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await sendClientMessage(recipient.phone, recipient.message, recipient.context);
      results.push({
        phone: recipient.phone,
        success: result.success,
        sid: result.sid,
        error: result.success ? undefined : result.message,
      });

      // Add delay between messages to avoid rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      results.push({
        phone: recipient.phone,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send',
      });
    }
  }

  return results;
}