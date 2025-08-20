import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/utils'

export const GET = withDatabase(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const { db } = await import('@/lib/db/drizzle')
  const { eq } = await import('drizzle-orm')
  const { contacts } = await import('@/lib/db/schema-communications')
  
  try {
    const orgContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.organizationId, id))

    return NextResponse.json(orgContacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json([])
  }
})