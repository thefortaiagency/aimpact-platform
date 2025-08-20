import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/utils'

export const GET = withDatabase(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const { db } = await import('@/lib/db/drizzle')
  const { eq } = await import('drizzle-orm')
  const { organizationTechStack } = await import('@/lib/db/schema-crm-enhanced')
  
  try {
    const techStack = await db
      .select()
      .from(organizationTechStack)
      .where(eq(organizationTechStack.organizationId, params.id))

    return NextResponse.json(techStack)
  } catch (error) {
    console.error('Error fetching tech stack:', error)
    return NextResponse.json([])
  }
})