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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, todoIds, filters, updates } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    let todos = getUserTodos(session.user.email)
    let affectedTodos: Todo[] = []

    // Determine which todos to operate on
    if (todoIds && Array.isArray(todoIds)) {
      // Specific todo IDs
      affectedTodos = todos.filter(t => todoIds.includes(t.id))
    } else if (filters) {
      // Filter-based selection
      affectedTodos = todos.filter(todo => {
        let matches = true

        if (filters.completed !== undefined) {
          matches = matches && todo.completed === filters.completed
        }
        
        if (filters.archived !== undefined) {
          matches = matches && todo.archived === filters.archived
        }
        
        if (filters.priority) {
          matches = matches && todo.priority === filters.priority
        }
        
        if (filters.category) {
          matches = matches && todo.category === filters.category
        }
        
        if (filters.assignedTo) {
          matches = matches && todo.assignedTo === filters.assignedTo
        }
        
        if (filters.overdue) {
          const now = new Date()
          const isOverdue = todo.dueDate && new Date(todo.dueDate) < now && !todo.completed
          matches = matches && isOverdue
        }
        
        if (filters.dueToday) {
          const today = new Date().toDateString()
          const isDueToday = todo.dueDate && new Date(todo.dueDate).toDateString() === today
          matches = matches && isDueToday
        }

        return matches
      })
    } else {
      return NextResponse.json({ error: 'Either todoIds or filters must be provided' }, { status: 400 })
    }

    if (affectedTodos.length === 0) {
      return NextResponse.json({ 
        message: 'No todos matched the criteria',
        affectedCount: 0 
      })
    }

    const updatedAt = new Date().toISOString()

    // Perform the requested action
    switch (action) {
      case 'complete':
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, completed: true, updatedAt }
            : todo
        )
        break

      case 'uncomplete':
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, completed: false, updatedAt }
            : todo
        )
        break

      case 'archive':
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, archived: true, updatedAt }
            : todo
        )
        break

      case 'unarchive':
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, archived: false, updatedAt }
            : todo
        )
        break

      case 'delete':
        const affectedIds = new Set(affectedTodos.map(t => t.id))
        todos = todos.filter(todo => !affectedIds.has(todo.id))
        break

      case 'update':
        if (!updates) {
          return NextResponse.json({ error: 'Updates object is required for update action' }, { status: 400 })
        }
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, ...updates, updatedAt }
            : todo
        )
        break

      case 'prioritize':
        if (!updates?.priority) {
          return NextResponse.json({ error: 'Priority is required for prioritize action' }, { status: 400 })
        }
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, priority: updates.priority, updatedAt }
            : todo
        )
        break

      case 'categorize':
        if (!updates?.category) {
          return NextResponse.json({ error: 'Category is required for categorize action' }, { status: 400 })
        }
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, category: updates.category, updatedAt }
            : todo
        )
        break

      case 'assign':
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { ...todo, assignedTo: updates?.assignedTo, updatedAt }
            : todo
        )
        break

      case 'schedule':
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { 
                ...todo, 
                dueDate: updates?.dueDate || todo.dueDate,
                dueTime: updates?.dueTime || todo.dueTime,
                updatedAt 
              }
            : todo
        )
        break

      case 'add_tags':
        if (!updates?.tags || !Array.isArray(updates.tags)) {
          return NextResponse.json({ error: 'Tags array is required for add_tags action' }, { status: 400 })
        }
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { 
                ...todo, 
                tags: [...new Set([...todo.tags, ...updates.tags])], // Remove duplicates
                updatedAt 
              }
            : todo
        )
        break

      case 'remove_tags':
        if (!updates?.tags || !Array.isArray(updates.tags)) {
          return NextResponse.json({ error: 'Tags array is required for remove_tags action' }, { status: 400 })
        }
        todos = todos.map(todo => 
          affectedTodos.find(a => a.id === todo.id)
            ? { 
                ...todo, 
                tags: todo.tags.filter(tag => !updates.tags.includes(tag)),
                updatedAt 
              }
            : todo
        )
        break

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    setUserTodos(session.user.email, todos)

    return NextResponse.json({
      success: true,
      action,
      affectedCount: affectedTodos.length,
      message: `Successfully ${action}d ${affectedTodos.length} todo(s)`
    })

  } catch (error) {
    console.error('Error performing bulk todo operation:', error)
    return NextResponse.json({ error: 'Failed to perform bulk operation' }, { status: 500 })
  }
}