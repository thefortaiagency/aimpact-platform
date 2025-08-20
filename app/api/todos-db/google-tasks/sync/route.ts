import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { GoogleTasksService } from '@/lib/google-tasks-service'
import { supabase } from '@/lib/todos-db-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { todoId, action, syncAll } = await request.json()

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

    // Handle bulk sync
    if (syncAll) {
      const result = await tasksService.syncAllTodos(session.user.email)
      return NextResponse.json({
        success: true,
        message: `Synced ${result.synced} todos to Google Tasks, ${result.failed} failed`,
        ...result
      })
    }

    // Handle single todo sync
    if (todoId) {
      const { data: todo } = await supabase
        .from('todos')
        .select('*')
        .eq('id', todoId)
        .eq('user_email', session.user.email)
        .single()

      if (!todo) {
        return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
      }

      let result
      switch (action) {
        case 'create':
          result = await tasksService.createTask(todo)
          break
        case 'update':
          result = await tasksService.updateTask(todo)
          break
        case 'delete':
          result = await tasksService.deleteTask(todo)
          return NextResponse.json({
            success: result,
            message: result ? 'Task deleted from Google' : 'Failed to delete task'
          })
        case 'complete':
          result = await tasksService.completeTask(todo)
          break
        default:
          // Auto-detect action based on todo state
          if (todo.google_task_id) {
            result = await tasksService.updateTask(todo)
          } else {
            result = await tasksService.createTask(todo)
          }
      }

      return NextResponse.json({
        success: !!result,
        message: result ? 'Task synced successfully' : 'Failed to sync task',
        task: result
      })
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide todoId or syncAll flag.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error syncing with Google Tasks:', error)
    return NextResponse.json(
      { error: 'Failed to sync with Google Tasks' },
      { status: 500 }
    )
  }
}

// Two-way sync endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
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
        { error: 'Google account not connected' },
        { status: 400 }
      )
    }

    const tasksService = new GoogleTasksService(userData.google_access_token)
    const result = await tasksService.twoWaySync(session.user.email)

    return NextResponse.json({
      success: true,
      message: `Two-way sync complete: ${result.toGoogle} sent to Google, ${result.fromGoogle} imported from Google`,
      ...result
    })
  } catch (error) {
    console.error('Error in two-way sync:', error)
    return NextResponse.json(
      { error: 'Failed to perform two-way sync' },
      { status: 500 }
    )
  }
}