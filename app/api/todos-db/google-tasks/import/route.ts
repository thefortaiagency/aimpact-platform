import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { GoogleTasksService } from '@/lib/google-tasks-service'
import { supabase } from '@/lib/todos-db-service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Google access token
    const { data: userData } = await supabase
      .from('users')
      .select('google_access_token, google_refresh_token')
      .eq('email', session.user.email)
      .single()

    if (!userData?.google_access_token) {
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google account first.' },
        { status: 400 }
      )
    }

    const tasksService = new GoogleTasksService(userData.google_access_token)
    const result = await tasksService.importTasksFromGoogle(session.user.email)

    return NextResponse.json({
      success: true,
      message: `Imported ${result.imported} tasks from Google, ${result.failed} failed`,
      ...result
    })
  } catch (error) {
    console.error('Error importing tasks from Google:', error)
    return NextResponse.json(
      { error: 'Failed to import tasks from Google' },
      { status: 500 }
    )
  }
}