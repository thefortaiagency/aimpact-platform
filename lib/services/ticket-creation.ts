import { 
  createTicket, 
  linkCommunicationToTicket,
  getCommunicationById,
  getContactById,
  getOrganizationById 
} from '@/lib/db/queries-communications';

export interface CreateTicketFromCommunicationOptions {
  communicationId: string;
  subject?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  assignedTo?: string;
}

/**
 * Creates a ticket from a communication (email, phone call, SMS, etc.)
 * Automatically links the communication to the ticket and inherits client information
 */
export async function createTicketFromCommunication(
  options: CreateTicketFromCommunicationOptions
) {
  try {
    // Get the communication details
    const communication = await getCommunicationById(options.communicationId);
    if (!communication) {
      throw new Error('Communication not found');
    }

    // Build ticket data
    let ticketData: any = {
      organizationId: communication.organizationId,
      contactId: communication.contactId,
      status: 'open',
      priority: options.priority || 'medium',
      category: options.category || determineCategoryFromCommunication(communication),
      assignedTo: options.assignedTo || null,
      slaResponseTime: determineSLAResponseTime(options.priority || 'medium'),
      slaResolutionTime: determineSLAResolutionTime(options.priority || 'medium'),
    };

    // Set subject and description
    if (options.subject) {
      ticketData.subject = options.subject;
    } else {
      // Auto-generate subject from communication
      ticketData.subject = generateSubjectFromCommunication(communication);
    }

    if (options.description) {
      ticketData.description = options.description;
    } else {
      // Use communication content as description
      ticketData.description = communication.content || 'No description provided';
    }

    // Create the ticket
    const ticket = await createTicket(ticketData);

    // Link the communication to the ticket
    await linkCommunicationToTicket(ticket.id, communication.id);

    return ticket;
  } catch (error) {
    console.error('Error creating ticket from communication:', error);
    throw error;
  }
}

/**
 * Determines the category based on communication content and metadata
 */
function determineCategoryFromCommunication(communication: any): string {
  const content = (communication.content || '').toLowerCase();
  const subject = (communication.subject || '').toLowerCase();
  
  // Simple keyword-based categorization
  if (content.includes('billing') || content.includes('payment') || content.includes('charge') || content.includes('invoice')) {
    return 'Billing';
  }
  if (content.includes('bug') || content.includes('error') || content.includes('broken') || content.includes('fix')) {
    return 'Technical Support';
  }
  if (content.includes('feature') || content.includes('request') || content.includes('add') || content.includes('enhance')) {
    return 'Feature Request';
  }
  if (content.includes('help') || content.includes('how') || content.includes('question')) {
    return 'General Inquiry';
  }
  
  // Default based on communication type
  switch (communication.type) {
    case 'phone':
      return 'Phone Support';
    case 'email':
      return 'Email Support';
    case 'sms':
      return 'SMS Support';
    case 'chat':
      return 'Chat Support';
    default:
      return 'General Support';
  }
}

/**
 * Generates a subject line from communication content
 */
function generateSubjectFromCommunication(communication: any): string {
  if (communication.subject) {
    return communication.subject;
  }

  const content = communication.content || '';
  const type = communication.type;
  const direction = communication.direction;

  // For phone calls
  if (type === 'phone') {
    return `${direction === 'inbound' ? 'Incoming' : 'Outgoing'} call from ${communication.fromAddress}`;
  }

  // For SMS
  if (type === 'sms') {
    const preview = content.substring(0, 50);
    return `SMS: ${preview}${content.length > 50 ? '...' : ''}`;
  }

  // For chat
  if (type === 'chat') {
    const preview = content.substring(0, 50);
    return `Chat: ${preview}${content.length > 50 ? '...' : ''}`;
  }

  // For email without subject
  const preview = content.substring(0, 60);
  return preview + (content.length > 60 ? '...' : '');
}

/**
 * Determines SLA response time based on priority (in minutes)
 */
function determineSLAResponseTime(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 15; // 15 minutes
    case 'high':
      return 30; // 30 minutes
    case 'medium':
      return 60; // 1 hour
    case 'low':
      return 240; // 4 hours
    default:
      return 60;
  }
}

/**
 * Determines SLA resolution time based on priority (in hours)
 */
function determineSLAResolutionTime(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 4; // 4 hours
    case 'high':
      return 8; // 8 hours
    case 'medium':
      return 24; // 24 hours
    case 'low':
      return 72; // 72 hours
    default:
      return 24;
  }
}

/**
 * Creates a ticket for an unmatched communication (no organization/contact)
 */
export async function createTicketForUnmatchedCommunication(
  communicationId: string,
  organizationId?: string,
  contactId?: string
) {
  const communication = await getCommunicationById(communicationId);
  if (!communication) {
    throw new Error('Communication not found');
  }

  // Update the communication with the new organization/contact if provided
  if (organizationId || contactId) {
    // TODO: Add updateCommunication function to update the communication record
  }

  return createTicketFromCommunication({
    communicationId,
    priority: 'medium',
    category: 'New Client Inquiry'
  });
}