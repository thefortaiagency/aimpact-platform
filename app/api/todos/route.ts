import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'

interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  tags: string[]
  assignedTo?: string
  dueDate?: string
  dueTime?: string
  createdAt: string
  updatedAt: string
  archived: boolean
}

// In-memory storage for todos (replace with database in production)
const todosStorage = new Map<string, Todo[]>()

const getUserTodos = (userId: string): Todo[] => {
  return todosStorage.get(userId) || []
}

const setUserTodos = (userId: string, todos: Todo[]) => {
  todosStorage.set(userId, todos)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // all, completed, pending, overdue, archived
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const assignee = searchParams.get('assignee')

    let todos = getUserTodos(session.user.email)

    // Apply filters
    if (filter === 'completed') {
      todos = todos.filter(t => t.completed && !t.archived)
    } else if (filter === 'pending') {
      todos = todos.filter(t => !t.completed && !t.archived)
    } else if (filter === 'overdue') {
      const now = new Date()
      todos = todos.filter(t => !t.completed && !t.archived && t.dueDate && new Date(t.dueDate) < now)
    } else if (filter === 'archived') {
      todos = todos.filter(t => t.archived)
    } else {
      todos = todos.filter(t => !t.archived) // default: non-archived
    }

    if (category && category !== 'all') {
      todos = todos.filter(t => t.category === category)
    }

    if (priority && priority !== 'all') {
      todos = todos.filter(t => t.priority === priority)
    }

    if (assignee) {
      todos = todos.filter(t => t.assignedTo?.toLowerCase().includes(assignee.toLowerCase()))
    }

    if (search) {
      const searchLower = search.toLowerCase()
      todos = todos.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Sort by due date, then priority
    todos.sort((a, b) => {
      // Due date first
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      if (a.dueDate && b.dueDate) {
        const dateA = new Date(a.dueDate)
        const dateB = new Date(b.dueDate)
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime()
        }
      }

      // Then by priority
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    return NextResponse.json({ todos })
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, priority = 'medium', category = 'General', tags = [], assignedTo, dueDate, dueTime } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const todos = getUserTodos(session.user.email)
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description?.trim(),
      completed: false,
      priority,
      category,
      tags: Array.isArray(tags) ? tags : [],
      assignedTo: assignedTo?.trim(),
      dueDate,
      dueTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false
    }

    todos.unshift(newTodo)
    setUserTodos(session.user.email, todos)

    return NextResponse.json({ todo: newTodo }, { status: 201 })
  } catch (error) {
    console.error('Error creating todo:', error)
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 })
    }

    const todos = getUserTodos(session.user.email)
    const todoIndex = todos.findIndex(t => t.id === id)

    if (todoIndex === -1) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    const updatedTodo = {
      ...todos[todoIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    todos[todoIndex] = updatedTodo
    setUserTodos(session.user.email, todos)

    return NextResponse.json({ todo: updatedTodo })
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 })
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
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 })
    }

    const todos = getUserTodos(session.user.email)
    const filteredTodos = todos.filter(t => t.id !== id)

    if (filteredTodos.length === todos.length) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    setUserTodos(session.user.email, filteredTodos)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
  }
}