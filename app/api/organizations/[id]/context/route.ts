import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/utils'

export const GET = withDatabase(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { db } = await import('@/lib/db/drizzle')
  const { eq } = await import('drizzle-orm')
  const { unifiedClientContext } = await import('@/lib/db/schema-crm-enhanced')
  
  try {
    const context = await db
      .select()
      .from(unifiedClientContext)
      .where(eq(unifiedClientContext.organizationId, params.id))
      .limit(1)

    return NextResponse.json(context[0] || null)
  } catch (error) {
    console.error('Error fetching unified context:', error)
    return NextResponse.json(null)
  }
})