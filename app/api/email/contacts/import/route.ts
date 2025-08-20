import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db/drizzle';
import { emailContacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

// POST /api/email/contacts/import - Import contacts from CSV
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    
    // Parse CSV
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors);
      return NextResponse.json(
        { error: 'Failed to parse CSV file', details: parseResult.errors },
        { status: 400 }
      );
    }

    const rows = parseResult.data as any[];
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Process contacts
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Map CSV columns to database fields
        const email = row.email || row.email_address || row['e-mail'] || '';
        
        if (!email || !email.includes('@')) {
          skipped++;
          continue;
        }

        // Check if contact already exists
        const existing = await db
          .select()
          .from(emailContacts)
          .where(eq(emailContacts.email, email))
          .limit(1);

        if (existing.length > 0) {
          // Update existing contact
          await db
            .update(emailContacts)
            .set({
              firstName: row.first_name || row.firstname || row.fname || existing[0].firstName,
              lastName: row.last_name || row.lastname || row.lname || existing[0].lastName,
              company: row.company || row.organization || existing[0].company,
              phone: row.phone || row.phone_number || row.mobile || existing[0].phone,
              updatedAt: new Date(),
            })
            .where(eq(emailContacts.email, email));
          skipped++;
        } else {
          // Create new contact
          await db.insert(emailContacts).values({
            id: uuidv4(),
            email,
            firstName: row.first_name || row.firstname || row.fname || null,
            lastName: row.last_name || row.lastname || row.lname || null,
            company: row.company || row.organization || null,
            phone: row.phone || row.phone_number || row.mobile || null,
            isSubscribed: true,
            optedInAt: new Date(),
            optInMethod: 'import',
            consentGiven: true,
            consentDate: new Date(),
            consentIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
            customFields: {
              source: 'csv_import',
              importDate: new Date().toISOString(),
            },
          });
          imported++;
        }
      } catch (error) {
        console.error(`Error importing contact:`, error);
        failed++;
        errors.push(`Failed to import row: ${JSON.stringify(row)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed`,
      stats: {
        total: rows.length,
        imported,
        skipped,
        failed,
      },
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json(
      { error: 'Failed to import contacts' },
      { status: 500 }
    );
  }
}