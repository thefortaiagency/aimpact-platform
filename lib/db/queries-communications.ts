import { db } from './drizzle';
import { eq, and, or, desc, asc, sql, gte, lte, like, ilike } from 'drizzle-orm';
import {
  organizations,
  contacts,
  communications,
  tickets,
  phoneNumbers,
  emailAddresses,
  ticketCommunications,
  communicationAnalytics,
  type Organization,
  type OrganizationInsert,
  type Contact,
  type ContactInsert,
  type Communication,
  type CommunicationInsert,
  type Ticket,
  type TicketInsert,
} from './schema-communications';

// Organization queries
export async function createOrganization(data: OrganizationInsert) {
  const [organization] = await db.insert(organizations).values(data).returning();
  return organization;
}

export async function getOrganizationByDomain(domain: string) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.domain, domain))
    .limit(1);
  return organization;
}

export async function getOrganizationById(id: string) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  return organization;
}

// Contact queries
export async function createContact(data: ContactInsert) {
  const [contact] = await db.insert(contacts).values(data).returning();
  return contact;
}

export async function getContactByEmail(email: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, email))
    .limit(1);
  return contact;
}

export async function getContactByPhoneNumber(phoneNumber: string) {
  const [phoneRecord] = await db
    .select()
    .from(phoneNumbers)
    .where(eq(phoneNumbers.phoneNumber, phoneNumber))
    .limit(1);
  
  if (phoneRecord && phoneRecord.contactId) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, phoneRecord.contactId))
      .limit(1);
    return contact;
  }
  
  return null;
}

export async function getContactsByOrganization(organizationId: string) {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId))
    .orderBy(desc(contacts.createdAt));
}

// Communication queries
export async function createCommunication(data: CommunicationInsert) {
  const [communication] = await db.insert(communications).values(data).returning();
  return communication;
}

export async function getCommunicationById(id: string) {
  const [communication] = await db
    .select()
    .from(communications)
    .where(eq(communications.id, id))
    .limit(1);
  return communication;
}

export async function getCommunicationByMessageId(messageId: string) {
  const [communication] = await db
    .select()
    .from(communications)
    .where(eq(communications.messageId, messageId))
    .limit(1);
  return communication;
}

export async function getCommunicationsByOrganization(
  organizationId: string,
  filters?: {
    type?: string;
    sentiment?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  let query = db
    .select()
    .from(communications)
    .where(eq(communications.organizationId, organizationId));

  if (filters?.type) {
    query = query.where(eq(communications.type, filters.type as any));
  }

  if (filters?.sentiment) {
    query = query.where(eq(communications.sentiment, filters.sentiment as any));
  }

  if (filters?.startDate) {
    query = query.where(gte(communications.communicatedAt, filters.startDate.toISOString()));
  }

  if (filters?.endDate) {
    query = query.where(lte(communications.communicatedAt, filters.endDate.toISOString()));
  }

  query = query.orderBy(desc(communications.communicatedAt));

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  return query;
}

export async function getCommunicationsByContact(contactId: string) {
  return db
    .select()
    .from(communications)
    .where(eq(communications.contactId, contactId))
    .orderBy(desc(communications.communicatedAt));
}

export async function updateCommunicationSentiment(
  id: string,
  sentiment: 'positive' | 'neutral' | 'negative',
  sentimentScore: number,
  aiInsights?: any
) {
  const [updated] = await db
    .update(communications)
    .set({
      sentiment,
      sentimentScore,
      aiInsights,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(communications.id, id))
    .returning();
  return updated;
}

// Ticket queries
export async function createTicket(data: TicketInsert) {
  // Generate ticket number (you might want to customize this)
  const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
  
  const [ticket] = await db
    .insert(tickets)
    .values({
      ...data,
      ticketNumber,
    })
    .returning();
  return ticket;
}

export async function getTicketById(id: string) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);
  return ticket;
}

export async function getTicketByNumber(ticketNumber: string) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.ticketNumber, ticketNumber))
    .limit(1);
  return ticket;
}

export async function getTicketsByOrganization(
  organizationId: string,
  filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = db
    .select()
    .from(tickets)
    .where(eq(tickets.organizationId, organizationId));

  if (filters?.status) {
    query = query.where(eq(tickets.status, filters.status as any));
  }

  if (filters?.priority) {
    query = query.where(eq(tickets.priority, filters.priority as any));
  }

  if (filters?.assignedTo) {
    query = query.where(eq(tickets.assignedTo, filters.assignedTo));
  }

  query = query.orderBy(desc(tickets.createdAt));

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  return query;
}

export async function getAllTickets(
  filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      organizationId: tickets.organizationId,
      contactId: tickets.contactId,
      subject: tickets.subject,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      assignedTo: tickets.assignedTo,
      resolvedAt: tickets.resolvedAt,
      closedAt: tickets.closedAt,
      slaResponseTime: tickets.slaResponseTime,
      slaResolutionTime: tickets.slaResolutionTime,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .orderBy(desc(tickets.createdAt));

  if (filters?.status) {
    query = query.where(eq(tickets.status, filters.status as any));
  }

  if (filters?.priority) {
    query = query.where(eq(tickets.priority, filters.priority as any));
  }

  if (filters?.assignedTo) {
    query = query.where(eq(tickets.assignedTo, filters.assignedTo));
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  return query;
}

export async function updateTicketStatus(
  id: string,
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
) {
  const updateData: any = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === 'resolved') {
    updateData.resolvedAt = new Date().toISOString();
  } else if (status === 'closed') {
    updateData.closedAt = new Date().toISOString();
  }

  const [updated] = await db
    .update(tickets)
    .set(updateData)
    .where(eq(tickets.id, id))
    .returning();
  return updated;
}

export async function linkCommunicationToTicket(
  ticketId: string,
  communicationId: string,
  isInternal = false
) {
  const [link] = await db
    .insert(ticketCommunications)
    .values({
      ticketId,
      communicationId,
      isInternal,
    })
    .returning();
  return link;
}

// Phone number queries
export async function upsertPhoneNumber(
  phoneNumber: string,
  organizationId?: string,
  contactId?: string
) {
  const existing = await db
    .select()
    .from(phoneNumbers)
    .where(eq(phoneNumbers.phoneNumber, phoneNumber))
    .limit(1);

  if (existing.length > 0) {
    // Update last used
    const [updated] = await db
      .update(phoneNumbers)
      .set({
        lastUsedAt: new Date().toISOString(),
        organizationId: organizationId || existing[0].organizationId,
        contactId: contactId || existing[0].contactId,
      })
      .where(eq(phoneNumbers.id, existing[0].id))
      .returning();
    return updated;
  } else {
    // Create new
    const [created] = await db
      .insert(phoneNumbers)
      .values({
        phoneNumber,
        organizationId,
        contactId,
        lastUsedAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }
}

// Email address queries
export async function upsertEmailAddress(
  emailAddress: string,
  organizationId?: string,
  contactId?: string
) {
  const domain = emailAddress.split('@')[1];
  
  const existing = await db
    .select()
    .from(emailAddresses)
    .where(eq(emailAddresses.emailAddress, emailAddress))
    .limit(1);

  if (existing.length > 0) {
    // Update last used
    const [updated] = await db
      .update(emailAddresses)
      .set({
        lastUsedAt: new Date().toISOString(),
        organizationId: organizationId || existing[0].organizationId,
        contactId: contactId || existing[0].contactId,
      })
      .where(eq(emailAddresses.id, existing[0].id))
      .returning();
    return updated;
  } else {
    // Create new
    const [created] = await db
      .insert(emailAddresses)
      .values({
        emailAddress,
        domain,
        organizationId,
        contactId,
        lastUsedAt: new Date().toISOString(),
      })
      .returning();
    return created;
  }
}

// Analytics queries
export async function updateCommunicationAnalytics(
  organizationId: string,
  contactId?: string,
  periodType: 'daily' | 'weekly' | 'monthly' = 'daily'
) {
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  switch (periodType) {
    case 'daily':
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - dayOfWeek);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
      break;
    case 'monthly':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
  }

  // Get aggregated data
  const aggregatedData = await db
    .select({
      totalCommunications: sql`COUNT(*)`.as('total_communications'),
      emailCount: sql`COUNT(CASE WHEN type = 'email' THEN 1 END)`.as('email_count'),
      phoneCount: sql`COUNT(CASE WHEN type = 'phone' THEN 1 END)`.as('phone_count'),
      smsCount: sql`COUNT(CASE WHEN type = 'sms' THEN 1 END)`.as('sms_count'),
      chatCount: sql`COUNT(CASE WHEN type = 'chat' THEN 1 END)`.as('chat_count'),
      avgSentimentScore: sql`AVG(sentiment_score)`.as('avg_sentiment_score'),
      positiveSentimentCount: sql`COUNT(CASE WHEN sentiment = 'positive' THEN 1 END)`.as('positive_sentiment_count'),
      neutralSentimentCount: sql`COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END)`.as('neutral_sentiment_count'),
      negativeSentimentCount: sql`COUNT(CASE WHEN sentiment = 'negative' THEN 1 END)`.as('negative_sentiment_count'),
    })
    .from(communications)
    .where(
      and(
        eq(communications.organizationId, organizationId),
        contactId ? eq(communications.contactId, contactId) : sql`true`,
        gte(communications.communicatedAt, periodStart.toISOString()),
        lte(communications.communicatedAt, periodEnd.toISOString())
      )
    );

  if (aggregatedData.length > 0) {
    const data = aggregatedData[0];
    
    // Check if analytics record exists
    const existing = await db
      .select()
      .from(communicationAnalytics)
      .where(
        and(
          eq(communicationAnalytics.organizationId, organizationId),
          contactId ? eq(communicationAnalytics.contactId, contactId) : sql`contact_id IS NULL`,
          eq(communicationAnalytics.periodType, periodType),
          eq(communicationAnalytics.periodStart, periodStart.toISOString())
        )
      )
      .limit(1);

    const analyticsData = {
      organizationId,
      contactId,
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalCommunications: Number(data.totalCommunications) || 0,
      emailCount: Number(data.emailCount) || 0,
      phoneCount: Number(data.phoneCount) || 0,
      smsCount: Number(data.smsCount) || 0,
      chatCount: Number(data.chatCount) || 0,
      avgSentimentScore: Number(data.avgSentimentScore) || null,
      positiveSentimentCount: Number(data.positiveSentimentCount) || 0,
      neutralSentimentCount: Number(data.neutralSentimentCount) || 0,
      negativeSentimentCount: Number(data.negativeSentimentCount) || 0,
    };

    if (existing.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(communicationAnalytics)
        .set({
          ...analyticsData,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(communicationAnalytics.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(communicationAnalytics)
        .values(analyticsData)
        .returning();
      return created;
    }
  }
}

// Search and filtering
export async function searchCommunications(
  searchQuery: string,
  organizationId?: string,
  limit = 50
) {
  let query = db
    .select()
    .from(communications)
    .where(
      or(
        ilike(communications.subject, `%${searchQuery}%`),
        ilike(communications.content, `%${searchQuery}%`),
        ilike(communications.fromAddress, `%${searchQuery}%`),
        ilike(communications.toAddress, `%${searchQuery}%`)
      )
    );

  if (organizationId) {
    query = query.where(eq(communications.organizationId, organizationId));
  }

  return query.orderBy(desc(communications.communicatedAt)).limit(limit);
}

// Helper function to create a communication from email
export async function createCommunicationFromEmail(
  email: {
    from: string;
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    htmlBody?: string;
    messageId: string;
    threadId?: string;
    date: Date;
    attachments?: Array<{ name: string; url: string; size: number; type: string }>;
  },
  organizationId?: string,
  contactId?: string
) {
  // Try to find organization by domain if not provided
  if (!organizationId && email.from) {
    const domain = email.from.split('@')[1];
    const org = await getOrganizationByDomain(domain);
    if (org) {
      organizationId = org.id;
    }
  }

  // Try to find contact by email if not provided
  if (!contactId && email.from) {
    const contact = await getContactByEmail(email.from);
    if (contact) {
      contactId = contact.id;
    }
  }

  // Create communication record
  const communication = await createCommunication({
    organizationId,
    contactId,
    type: 'email',
    direction: 'inbound',
    subject: email.subject,
    content: email.body,
    htmlContent: email.htmlBody,
    fromAddress: email.from,
    toAddress: email.to,
    ccAddresses: email.cc || [],
    bccAddresses: email.bcc || [],
    messageId: email.messageId,
    threadId: email.threadId,
    attachments: email.attachments || [],
    communicatedAt: email.date.toISOString(),
  });

  // Update email address tracking
  await upsertEmailAddress(email.from, organizationId, contactId);

  return communication;
}

// Helper function to create a communication from phone call
export async function createCommunicationFromCall(
  call: {
    from: string;
    to: string;
    direction: 'inbound' | 'outbound';
    duration?: number; // in seconds
    callSid: string;
    recordingUrl?: string;
    transcription?: string;
    date: Date;
    state?: string;
  },
  organizationId?: string,
  contactId?: string
) {
  // Generate content based on available information
  let content = '';
  if (call.transcription) {
    content = call.transcription;
  } else if (call.duration !== undefined && call.duration > 0) {
    content = `Call duration: ${call.duration} seconds`;
  } else if (call.state) {
    content = `Call ${call.state} - ${call.direction === 'inbound' ? 'from' : 'to'} ${call.direction === 'inbound' ? call.from : call.to}`;
  } else {
    content = `${call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call ${call.direction === 'inbound' ? 'from' : 'to'} ${call.direction === 'inbound' ? call.from : call.to}`;
  }
  
  // Create communication record
  const communication = await createCommunication({
    organizationId,
    contactId,
    type: 'phone',
    direction: call.direction,
    subject: `Phone call ${call.direction === 'inbound' ? 'from' : 'to'} ${call.direction === 'inbound' ? call.from : call.to}`,
    content, // Now properly set
    phoneNumber: call.direction === 'inbound' ? call.from : call.to,
    duration: call.duration,
    messageId: call.callSid,
    metadata: {
      recordingUrl: call.recordingUrl,
      state: call.state,
    },
    communicatedAt: call.date.toISOString(),
  });

  // Update phone number tracking
  const phoneNumber = call.direction === 'inbound' ? call.from : call.to;
  await upsertPhoneNumber(phoneNumber, organizationId, contactId);

  return communication;
}