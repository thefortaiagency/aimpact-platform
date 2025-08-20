import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { TodosService } from '@/lib/todos-db-service'
import { GoogleTasksService } from '@/lib/google-tasks-service'
import { supabase } from '@/lib/todos-db-service'

// Helper function to sync with Google Tasks
async function syncWithGoogleTasks(todo: any, action: 'create' | 'update' | 'delete', userEmail: string) {
  try {
    // Get user's Google access token
    const { data: userData } = await supabase
      .from('users')
      .select('google_access_token')
      .eq('email', userEmail)
      .single()

    if (!userData?.google_access_token) {
      console.log('Google account not connected, skipping sync')
      return
    }

    const tasksService = new GoogleTasksService(userData.google_access_token)
    
    switch (action) {
      case 'create':
        await tasksService.createTask(todo)
        break
      case 'update':
        await tasksService.updateTask(todo)
        break
      case 'delete':
        await tasksService.deleteTask(todo)
        break
    }
  } catch (error) {
    console.error('Error syncing with Google Tasks:', error)
    // Don't throw - we don't want Google sync failures to break todo operations
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching todos for user:', session.user.email)

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const archived = searchParams.get('archived') === 'true'

    let todos

    if (filter || category || priority || search || archived) {
      todos = await TodosService.getFilteredTodos(session.user.email, {
        completed: filter === 'completed' ? true : filter === 'pending' ? false : undefined,
        archived,
        category: category || undefined,
        priority: priority || undefined,
        search: search || undefined
      })
    } else {
      todos = await TodosService.getTodos(session.user.email)
    }

    console.log(`Found ${todos.length} todos for ${session.user.email}`)
    if (todos.length > 0) {
      console.log('First todo:', todos[0].title)
    }

    return NextResponse.json({ todos })
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const todoData = await request.json()
    
    const newTodo = await TodosService.createTodo({
      ...todoData,
      user_email: session.user.email,
      tags: Array.isArray(todoData.tags) ? todoData.tags : 
             typeof todoData.tags === 'string' ? todoData.tags.split(',').map(t => t.trim()) : []
    })

    if (!newTodo) {
      return NextResponse.json(
        { error: 'Failed to create todo' },
        { status: 500 }
      )
    }

    // Sync with Google Tasks in the background
    syncWithGoogleTasks(newTodo, 'create', session.user.email)

    return NextResponse.json({ todo: newTodo })
  } catch (error) {
    console.error('Error creating todo:', error)
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...updates } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      )
    }

    // Handle special actions
    if (updates.action === 'toggle_complete') {
      const todo = await TodosService.toggleTodoComplete(id)
      // Sync completion status with Google Tasks
      if (todo) {
        syncWithGoogleTasks(todo, 'update', session.user.email)
      }
      return NextResponse.json({ todo })
    }
    
    if (updates.action === 'toggle_archive') {
      const todo = await TodosService.toggleTodoArchive(id)
      // If archiving, delete from Google Tasks
      if (todo && todo.archived) {
        syncWithGoogleTasks(todo, 'delete', session.user.email)
      }
      return NextResponse.json({ todo })
    }

    // Regular update
    const updatedTodo = await TodosService.updateTodo(id, updates)
    
    if (!updatedTodo) {
      return NextResponse.json(
        { error: 'Failed to update todo' },
        { status: 500 }
      )
    }

    // Sync with Google Tasks in the background
    syncWithGoogleTasks(updatedTodo, 'update', session.user.email)

    return NextResponse.json({ todo: updatedTodo })
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Todo ID is required' },
        { status: 400 }
      )
    }

    // Get the todo before deleting to sync with Google
    const { data: todo } = await supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .eq('user_email', session.user.email)
      .single()

    const success = await TodosService.deleteTodo(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete todo' },
        { status: 500 }
      )
    }

    // Sync deletion with Google Tasks in the background
    if (todo) {
      syncWithGoogleTasks(todo, 'delete', session.user.email)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    )
  }
}