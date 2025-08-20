'use client'

import { useState, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { 
  CheckCircle2, Circle, Flag, Zap, AlertCircle, 
  Calendar, Clock, Edit3, Trash2, X, Check,
  ChevronLeft, ChevronRight, CalendarDays, List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from 'date-fns'

interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  tags: string[]
  due_date?: string
  due_time?: string
  google_event_id?: string
  google_event_link?: string
}

interface TodoCalendarViewProps {
  todos: Todo[]
  onTodoUpdate: (id: string, updates: Partial<Todo>) => Promise<void>
  onTodoComplete: (id: string) => Promise<void>
  onTodoDelete: (id: string) => Promise<void>
  onTodoCreate: (todo: Partial<Todo>) => Promise<void>
  useDatabase: boolean
}

const priorityColors = {
  low: '#6b7280',     // gray
  medium: '#3b82f6',  // blue
  high: '#f97316',    // orange
  urgent: '#ef4444'   // red
}

const categories = [
  'General',
  'The Fort Wrestling',
  'The Fort AI Agency',
  'Work',
  'Personal',
  'Business',
  'Development',
  'Marketing'
]

export default function TodoCalendarView({ 
  todos, 
  onTodoUpdate, 
  onTodoComplete, 
  onTodoDelete,
  onTodoCreate,
  useDatabase 
}: TodoCalendarViewProps) {
  const calendarRef = useRef<any>(null)
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'General',
    due_date: '',
    due_time: ''
  })
  const [createDate, setCreateDate] = useState<string>('')

  // Convert todos to calendar events
  const calendarEvents = todos
    .filter(todo => todo.due_date && !todo.completed)
    .map(todo => {
      const startDateTime = todo.due_time 
        ? `${todo.due_date}T${todo.due_time}` 
        : `${todo.due_date}T09:00:00`
      
      // Add 15 minutes to start time for end time
      const endDate = new Date(startDateTime)
      endDate.setMinutes(endDate.getMinutes() + 15)
      
      return {
        id: todo.id,
        title: todo.title,
        start: startDateTime,
        end: endDate.toISOString(),
        backgroundColor: priorityColors[todo.priority],
        borderColor: priorityColors[todo.priority],
        extendedProps: {
          description: todo.description,
          category: todo.category,
          priority: todo.priority,
          tags: todo.tags,
          googleEventId: todo.google_event_id,
          googleEventLink: todo.google_event_link
        }
      }
    })

  // Add completed todos with different styling
  const completedEvents = todos
    .filter(todo => todo.due_date && todo.completed)
    .map(todo => {
      const startDateTime = todo.due_time 
        ? `${todo.due_date}T${todo.due_time}` 
        : `${todo.due_date}T09:00:00`
      
      const endDate = new Date(startDateTime)
      endDate.setMinutes(endDate.getMinutes() + 15)
      
      return {
        id: todo.id,
        title: `✅ ${todo.title}`,
        start: startDateTime,
        end: endDate.toISOString(),
        backgroundColor: '#10b981', // green for completed
        borderColor: '#10b981',
        classNames: ['completed-todo'],
        extendedProps: {
          description: todo.description,
          category: todo.category,
          priority: todo.priority,
          tags: todo.tags,
          completed: true
        }
      }
    })

  const allEvents = [...calendarEvents, ...completedEvents]

  // Handle event click
  const handleEventClick = (clickInfo: any) => {
    const todoId = clickInfo.event.id
    const todo = todos.find(t => t.id === todoId)
    if (todo) {
      setSelectedTodo(todo)
      setEditForm({
        title: todo.title,
        description: todo.description || '',
        priority: todo.priority,
        category: todo.category,
        due_date: todo.due_date || '',
        due_time: todo.due_time || ''
      })
      setShowEditDialog(true)
    }
  }

  // Handle date click (create new todo)
  const handleDateClick = (dateInfo: any) => {
    const date = format(dateInfo.date, 'yyyy-MM-dd')
    setCreateDate(date)
    setEditForm({
      title: '',
      description: '',
      priority: 'medium',
      category: 'General',
      due_date: date,
      due_time: '09:00'
    })
    setShowCreateDialog(true)
  }

  // Handle event drag/drop
  const handleEventDrop = async (dropInfo: any) => {
    const todoId = dropInfo.event.id
    const newDate = format(dropInfo.event.start, 'yyyy-MM-dd')
    const newTime = format(dropInfo.event.start, 'HH:mm')
    
    console.log(`🎯 DRAG & DROP: Moving todo ${todoId} to ${newDate} at ${newTime}`)
    console.log('📍 Original position:', dropInfo.oldEvent.start)
    console.log('📍 New position:', dropInfo.event.start)
    
    // Show loading indicator on the event
    const originalTitle = dropInfo.event.title.replace(/^⏳\s+/, '').replace(/^✅\s+/, '').replace(/^❌\s+/, '').replace(/^📋\s+/, '')
    dropInfo.event.setProp('title', `⏳ ${originalTitle}`)
    
    try {
      console.log('🚀 Calling onTodoUpdate with:', { due_date: newDate, due_time: newTime })
      
      await onTodoUpdate(todoId, {
        due_date: newDate,
        due_time: newTime
      })
      
      console.log('✅ Drag & drop update completed successfully!')
      
      // Show success indicator
      dropInfo.event.setProp('title', `✅ ${originalTitle}`)
      
      // Revert to normal after 3 seconds
      setTimeout(() => {
        dropInfo.event.setProp('title', originalTitle)
      }, 3000)
      
    } catch (error) {
      console.error('❌ DRAG & DROP FAILED:', error)
      
      // Show error indicator
      dropInfo.event.setProp('title', `❌ ${originalTitle}`)
      
      // Revert the event position if update failed
      setTimeout(() => {
        console.log('🔄 Reverting drag position due to error')
        dropInfo.revert()
      }, 2000)
    }
  }

  // Handle quick complete
  const handleQuickComplete = async () => {
    if (selectedTodo) {
      await onTodoComplete(selectedTodo.id)
      setShowEditDialog(false)
      setSelectedTodo(null)
    }
  }

  // Handle save edit
  const handleSaveEdit = async () => {
    if (selectedTodo) {
      await onTodoUpdate(selectedTodo.id, editForm)
      setShowEditDialog(false)
      setSelectedTodo(null)
    }
  }

  // Handle create
  const handleCreate = async () => {
    await onTodoCreate({
      ...editForm,
      tags: [],
      completed: false
    })
    setShowCreateDialog(false)
    setEditForm({
      title: '',
      description: '',
      priority: 'medium',
      category: 'General',
      due_date: '',
      due_time: ''
    })
  }

  // Handle delete
  const handleDelete = async () => {
    if (selectedTodo) {
      await onTodoDelete(selectedTodo.id)
      setShowEditDialog(false)
      setSelectedTodo(null)
    }
  }

  // Calendar toolbar customization
  const handleViewChange = (viewType: 'month' | 'week' | 'day' | 'list') => {
    setView(viewType)
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      switch(viewType) {
        case 'month':
          calendarApi.changeView('dayGridMonth')
          break
        case 'week':
          calendarApi.changeView('timeGridWeek')
          break
        case 'day':
          calendarApi.changeView('timeGridDay')
          break
        case 'list':
          calendarApi.changeView('listWeek')
          break
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Calendar View</CardTitle>
              {useDatabase && (
                <Badge variant="outline" className="ml-2">
                  <Circle className="w-2 h-2 mr-1 fill-green-500" />
                  Synced
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange('month')}
              >
                Month
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange('day')}
              >
                Day
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange('list')}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: ''
              }}
              events={allEvents}
              editable={true}
              droppable={true}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventDrop}
              height="auto"
              dayMaxEvents={3}
              eventTimeFormat={{
                hour: 'numeric',
                minute: '2-digit',
                meridiem: 'short'
              }}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:15:00"
              eventClassNames={(arg) => {
                const classes = []
                if (arg.event.extendedProps.completed) {
                  classes.push('opacity-50', 'line-through')
                }
                return classes
              }}
            />
          </div>
          
          {/* Priority Legend */}
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: priorityColors.urgent }} />
              <span>Urgent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: priorityColors.high }} />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: priorityColors.medium }} />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: priorityColors.low }} />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Todo Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Todo</DialogTitle>
            <DialogDescription>
              Update todo details or mark as complete
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={editForm.priority}
                  onValueChange={(value: any) => setEditForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={editForm.category}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={editForm.due_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, due_time: e.target.value }))}
                />
              </div>
            </div>
            
            {selectedTodo?.google_event_link && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-green-700">Synced with Google Calendar</span>
                <a 
                  href={selectedTodo.google_event_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline ml-auto"
                >
                  Open →
                </a>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              {!selectedTodo?.completed && (
                <Button
                  variant="outline"
                  onClick={handleQuickComplete}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Todo Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Todo</DialogTitle>
            <DialogDescription>
              Add a new todo for {createDate && format(new Date(createDate), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter todo title"
              />
            </div>
            
            <div>
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Optional description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-priority">Priority</Label>
                <Select 
                  value={editForm.priority}
                  onValueChange={(value: any) => setEditForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="new-category">Category</Label>
                <Select 
                  value={editForm.category}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-time">Time</Label>
                <Input
                  id="new-time"
                  type="time"
                  value={editForm.due_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, due_time: e.target.value }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}