import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db/drizzle';
import { emailContacts } from '@/lib/db/schema';
import { eq, desc, and, like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/email/contacts - Fetch all contacts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const subscribed = url.searchParams.get('subscribed');

    let query = db.select().from(emailContacts);

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(emailContacts.email, `%${search}%`),
          like(emailContacts.firstName, `%${search}%`),
          like(emailContacts.lastName, `%${search}%`),
          like(emailContacts.company, `%${search}%`)
        )
      );
    }

    if (subscribed !== null && subscribed !== undefined) {
      conditions.push(eq(emailContacts.isSubscribed, subscribed === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const contacts = await query
      .orderBy(desc(emailContacts.createdAt))
      .limit(100);

    // Format the response
    const formattedContacts = contacts.map(contact => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      isSubscribed: contact.isSubscribed,
      optedInAt: contact.optedInAt?.toISOString(),
      lastEngagedAt: contact.lastEngagedAt?.toISOString(),
      tags: contact.tags || [],
    }));

    return NextResponse.json(formattedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/email/contacts - Create new contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, firstName, lastName, company, tags, optIn = true } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    // Check if contact already exists
    const existing = await db
      .select()
      .from(emailContacts)
      .where(eq(emailContacts.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Contact already exists' },
        { status: 409 }
      );
    }

    // Create new contact
    const newContact = await db.insert(emailContacts).values({
      id: uuidv4(),
      email,
      firstName,
      lastName,
      company,
      tags: tags || [],
      isSubscribed: optIn,
      optedInAt: optIn ? new Date() : null,
      optInMethod: 'manual',
      consentGiven: optIn,
      consentDate: optIn ? new Date() : null,
      consentIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    }).returning();

    return NextResponse.json({
      id: newContact[0].id,
      message: 'Contact created successfully',
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}

// PATCH /api/email/contacts/[id] - Update contact
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const contactId = url.pathname.split('/').pop();
    
    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    // Only update provided fields
    if (body.firstName !== undefined) updates.firstName = body.firstName;
    if (body.lastName !== undefined) updates.lastName = body.lastName;
    if (body.company !== undefined) updates.company = body.company;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.isSubscribed !== undefined) {
      updates.isSubscribed = body.isSubscribed;
      if (!body.isSubscribed) {
        updates.optedOutAt = new Date();
        updates.optOutReason = body.reason || 'User unsubscribed';
      } else {
        updates.optedInAt = new Date();
        updates.optedOutAt = null;
      }
    }

    await db
      .update(emailContacts)
      .set(updates)
      .where(eq(emailContacts.id, contactId));

    return NextResponse.json({ message: 'Contact updated successfully' });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/email/contacts/[id] - Delete contact
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const contactId = url.pathname.split('/').pop();

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID required' },
        { status: 400 }
      );
    }

    await db
      .delete(emailContacts)
      .where(eq(emailContacts.id, contactId));

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}