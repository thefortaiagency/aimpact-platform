import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isToday, isTomorrow, isPast, parseISO } from 'date-fns'

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

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const todos = getUserTodos(session.user.email)
    const activeTodos = todos.filter(t => !t.archived)
    const now = new Date()

    // Basic stats
    const total = activeTodos.length
    const completed = activeTodos.filter(t => t.completed).length
    const pending = activeTodos.filter(t => !t.completed).length
    const archived = todos.filter(t => t.archived).length

    // Due date stats
    const dueToday = activeTodos.filter(t => 
      !t.completed && t.dueDate && isToday(parseISO(t.dueDate))
    ).length

    const dueTomorrow = activeTodos.filter(t => 
      !t.completed && t.dueDate && isTomorrow(parseISO(t.dueDate))
    ).length

    const overdue = activeTodos.filter(t => 
      !t.completed && t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))
    ).length

    const noDueDate = activeTodos.filter(t => 
      !t.completed && !t.dueDate
    ).length

    // Priority breakdown
    const priorityStats = {
      urgent: activeTodos.filter(t => !t.completed && t.priority === 'urgent').length,
      high: activeTodos.filter(t => !t.completed && t.priority === 'high').length,
      medium: activeTodos.filter(t => !t.completed && t.priority === 'medium').length,
      low: activeTodos.filter(t => !t.completed && t.priority === 'low').length
    }

    // Category breakdown
    const categoryStats: { [key: string]: number } = {}
    activeTodos.filter(t => !t.completed).forEach(todo => {
      categoryStats[todo.category] = (categoryStats[todo.category] || 0) + 1
    })

    // Assignee breakdown
    const assigneeStats: { [key: string]: number } = {}
    activeTodos.filter(t => !t.completed && t.assignedTo).forEach(todo => {
      if (todo.assignedTo) {
        assigneeStats[todo.assignedTo] = (assigneeStats[todo.assignedTo] || 0) + 1
      }
    })
    const unassigned = activeTodos.filter(t => !t.completed && !t.assignedTo).length

    // Recent activity
    const recentlyCreated = activeTodos.filter(t => {
      const createdDate = parseISO(t.createdAt)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return createdDate > dayAgo
    }).length

    const recentlyCompleted = todos.filter(t => {
      if (!t.completed) return false
      const updatedDate = parseISO(t.updatedAt)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return updatedDate > dayAgo
    }).length

    // Get upcoming tasks (next 7 days)
    const upcomingTasks = activeTodos
      .filter(t => !t.completed && t.dueDate)
      .map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        priority: t.priority,
        category: t.category
      }))
      .filter(t => {
        const dueDate = parseISO(t.dueDate!)
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return dueDate <= weekFromNow
      })
      .sort((a, b) => parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime())
      .slice(0, 10) // Top 10 upcoming

    // Productivity metrics
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const overdueRate = pending > 0 ? Math.round((overdue / pending) * 100) : 0

    const stats = {
      overview: {
        total,
        completed,
        pending,
        archived,
        completionRate,
        overdueRate
      },
      schedule: {
        dueToday,
        dueTomorrow,
        overdue,
        noDueDate,
        upcomingTasks
      },
      priority: priorityStats,
      categories: categoryStats,
      assignments: {
        ...assigneeStats,
        unassigned
      },
      activity: {
        recentlyCreated,
        recentlyCompleted
      }
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching todo stats:', error)
    return NextResponse.json({ error: 'Failed to fetch todo stats' }, { status: 500 })
  }
}