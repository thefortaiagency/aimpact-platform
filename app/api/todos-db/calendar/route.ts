import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { TodosService } from '@/lib/todos-db-service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    const upcomingTodos = await TodosService.getUpcomingTodos(session.user.email, days)
    
    // Format todos for calendar display
    const calendarEvents = upcomingTodos.map(todo => ({
      id: todo.id,
      title: todo.title,
      start: todo.due_date,
      end: todo.due_date,
      allDay: !todo.due_time,
      time: todo.due_time,
      color: getPriorityColor(todo.priority),
      extendedProps: {
        description: todo.description,
        category: todo.category,
        priority: todo.priority,
        tags: todo.tags,
        completed: todo.completed,
        googleEventId: todo.google_event_id,
        googleEventLink: todo.google_event_link,
        syncStatus: todo.calendar_sync_status
      }
    }))

    return NextResponse.json({ events: calendarEvents })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

function getPriorityColor(priority: string): string {
  const colorMap = {
    urgent: '#ef4444', // red
    high: '#f97316',   // orange
    medium: '#3b82f6', // blue
    low: '#6b7280'     // gray
  }
  return colorMap[priority] || '#3b82f6'
}