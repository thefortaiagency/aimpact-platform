import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/utils'

export const GET = withDatabase(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const { db } = await import('@/lib/db/drizzle')
  const { eq } = await import('drizzle-orm')
  const { deals } = await import('@/lib/db/schema-crm')
  
  try {
    const orgDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.organizationId, id))

    return NextResponse.json(orgDeals)
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json([])
  }
})