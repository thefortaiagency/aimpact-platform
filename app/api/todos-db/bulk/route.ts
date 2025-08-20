import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { TodosService } from '@/lib/todos-db-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, todoIds } = await request.json()
    
    if (!action || !todoIds || !Array.isArray(todoIds)) {
      return NextResponse.json(
        { error: 'Action and todoIds array are required' },
        { status: 400 }
      )
    }

    let success = false
    
    switch (action) {
      case 'complete':
        success = await TodosService.bulkComplete(todoIds)
        break
      case 'delete':
        success = await TodosService.bulkDelete(todoIds)
        break
      case 'archive':
        success = await TodosService.bulkArchive(todoIds)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    if (!success) {
      return NextResponse.json(
        { error: `Failed to ${action} todos` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully ${action}d ${todoIds.length} todo(s)`
    })
  } catch (error) {
    console.error('Error in bulk operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}