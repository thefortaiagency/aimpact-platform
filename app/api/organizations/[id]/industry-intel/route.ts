import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/utils'

export const GET = withDatabase(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const { db } = await import('@/lib/db/drizzle')
  const { eq } = await import('drizzle-orm')
  const { organizationIndustryIntel } = await import('@/lib/db/schema-crm-enhanced')
  
  try {
    const intel = await db
      .select()
      .from(organizationIndustryIntel)
      .where(eq(organizationIndustryIntel.organizationId, id))
      .limit(1)

    return NextResponse.json(intel[0] || null)
  } catch (error) {
    console.error('Error fetching industry intel:', error)
    return NextResponse.json(null)
  }
})