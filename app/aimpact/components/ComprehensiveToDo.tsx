'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, CheckCircle2, Circle, Trash2, Edit3, Filter, Search, Star, Flag, User, Tag, X, ChevronDown, ChevronUp, AlertCircle, Zap, Archive, RotateCcw, Database, Loader2, List, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isTomorrow, isYesterday, parseISO, isPast, isFuture, addDays } from 'date-fns'
import dynamic from 'next/dynamic'

// Dynamically import TodoCalendarView to avoid SSR issues with FullCalendar
const TodoCalendarView = dynamic(
  () => import('./TodoCalendarView'),
  { 
    ssr: false,
    loading: () => (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </CardContent>
      </Card>
    )
  }
)

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
  due_date?: string  // Added for calendar compatibility
  due_time?: string  // Added for calendar compatibility
  createdAt: string
  updatedAt: string
  archived: boolean
  google_event_id?: string
  google_event_link?: string
}

interface TodoFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  tags: string
  assignedTo: string
  dueDate: string
  dueTime: string
}

const categories = [
  'General',
  'The Fort Wrestling',
  'The Fort AI Agency',
  'Work',
  'Personal', 
  'Business',
  'Development',
  'Marketing',
  'Finance',
  'Health',
  'Learning',
  'Family',
  'Travel',
  'Shopping'
]

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500', 
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const priorityIcons = {
  low: Circle,
  medium: AlertCircle,
  high: Flag,
  urgent: Zap
}

export default function ComprehensiveToDo() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all') 
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('dueDate')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [showArchived, setShowArchived] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [useDatabase, setUseDatabase] = useState(true) // Toggle between DB and localStorage
  
  // Debug logging
  useEffect(() => {
    console.log('🔧 ComprehensiveToDo initialized with useDatabase:', useDatabase)
  }, [useDatabase])
  
  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'General',
    tags: '',
    assignedTo: '',
    dueDate: '',
    dueTime: ''
  })

  // Load todos from database or localStorage on mount
  useEffect(() => {
    const loadTodos = async () => {
      setIsLoading(true)
      
      // Try to load from database first
      try {
        console.log('Fetching todos from database...')
        const response = await fetch('/api/aimpact/todos-db')
        console.log('Database response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Todos from database:', data.todos)
          
          // Map database fields to component fields
          const mappedTodos = (data.todos || []).map((todo: any) => ({
            ...todo,
            dueDate: todo.due_date || todo.dueDate,
            dueTime: todo.due_time || todo.dueTime,
            createdAt: todo.created_at || todo.createdAt,
            updatedAt: todo.updated_at || todo.updatedAt,
            assignedTo: todo.assigned_to || todo.assignedTo,
          }))
          
          console.log('Mapped todos:', mappedTodos)
          console.log('First todo:', mappedTodos[0])
          setTodos(mappedTodos)
          setUseDatabase(true)
          console.log('Using database for todos')
        } else {
          const errorText = await response.text()
          console.error('Database error:', errorText)
          throw new Error('Database not available')
        }
      } catch (error) {
        // Fallback to localStorage
        console.log('Database error, using localStorage fallback:', error)
        const storedTodos = localStorage.getItem('nexus-todos')
        if (storedTodos) {
          const parsed = JSON.parse(storedTodos)
          console.log('Todos from localStorage:', parsed)
          setTodos(parsed)
        } else {
          console.log('No todos in localStorage')
        }
        setUseDatabase(false)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTodos()
  }, [])

  // Save todos to localStorage only if not using database
  useEffect(() => {
    if (!useDatabase) {
      localStorage.setItem('nexus-todos', JSON.stringify(todos))
    }
  }, [todos, useDatabase])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'General', 
      tags: '',
      assignedTo: '',
      dueDate: '',
      dueTime: ''
    })
    setEditingTodo(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) return

    const todoData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      category: formData.category,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      assignedTo: formData.assignedTo.trim() || undefined,
      assigned_to: formData.assignedTo.trim() || undefined, // Include both formats
      dueDate: formData.dueDate || undefined,
      dueTime: formData.dueTime || undefined,
      due_date: formData.dueDate || undefined, // Include snake_case for DB
      due_time: formData.dueTime || undefined, // Include snake_case for DB
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(), // Include snake_case for DB
    }

    if (useDatabase) {
      try {
        if (editingTodo) {
          const response = await fetch('/api/aimpact/todos-db', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingTodo.id, ...todoData })
          })
          if (response.ok) {
            const { todo } = await response.json()
            setTodos(prev => prev.map(t => t.id === todo.id ? todo : t))
          }
        } else {
          const response = await fetch('/api/aimpact/todos-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todoData)
          })
          if (response.ok) {
            const { todo } = await response.json()
            setTodos(prev => [todo, ...prev])
          }
        }
      } catch (error) {
        console.error('Database operation failed:', error)
      }
    } else {
      // Fallback to localStorage
      if (editingTodo) {
        setTodos(prev => prev.map(todo => 
          todo.id === editingTodo.id 
            ? { ...todo, ...todoData }
            : todo
        ))
      } else {
        const newTodo: Todo = {
          ...todoData,
          id: Date.now().toString(),
          completed: false,
          createdAt: new Date().toISOString(),
          archived: false
        }
        setTodos(prev => [newTodo, ...prev])
      }
    }

    resetForm()
  }

  const toggleTodo = async (id: string) => {
    if (useDatabase) {
      try {
        const response = await fetch('/api/aimpact/todos-db', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'toggle_complete' })
        })
        if (response.ok) {
          const { todo } = await response.json()
          setTodos(prev => prev.map(t => t.id === todo.id ? todo : t))
        }
      } catch (error) {
        console.error('Failed to toggle todo:', error)
      }
    } else {
      setTodos(prev => prev.map(todo =>
        todo.id === id 
          ? { 
              ...todo, 
              completed: !todo.completed,
              updatedAt: new Date().toISOString()
            }
          : todo
      ))
    }
  }

  const deleteTodo = async (id: string) => {
    if (useDatabase) {
      try {
        const response = await fetch(`/api/aimpact/todos-db?id=${id}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setTodos(prev => prev.filter(todo => todo.id !== id))
        }
      } catch (error) {
        console.error('Failed to delete todo:', error)
      }
    } else {
      setTodos(prev => prev.filter(todo => todo.id !== id))
    }
  }

  const archiveTodo = (id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id 
        ? { ...todo, archived: true, updatedAt: new Date().toISOString() }
        : todo
    ))
  }

  const unarchiveTodo = (id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id 
        ? { ...todo, archived: false, updatedAt: new Date().toISOString() }
        : todo
    ))
  }

  const editTodo = (todo: Todo) => {
    setFormData({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      category: todo.category,
      tags: todo.tags.join(', '),
      assignedTo: todo.assignedTo || '',
      dueDate: todo.dueDate || '',
      dueTime: todo.dueTime || ''
    })
    setEditingTodo(todo)
    setShowForm(true)
  }

  // Handler methods for calendar view
  const handleTodoUpdate = async (id: string, updates: Partial<Todo>) => {
    console.log(`🔄 Updating todo ${id} with:`, updates)
    
    if (useDatabase) {
      try {
        console.log('📡 Sending API request to update todo...')
        const response = await fetch('/api/aimpact/todos-db', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates })
        })
        
        if (response.ok) {
          const { todo } = await response.json()
          console.log('✅ Todo updated in database:', todo)
          setTodos(prev => prev.map(t => t.id === todo.id ? todo : t))
          
          // ALWAYS trigger calendar sync for date/time changes OR any todo with a due date
          const shouldSync = updates.due_date || updates.due_time || todo.due_date
          if (shouldSync) {
            console.log('📅 Forcing calendar sync...')
            console.log(`🗓️ Todo has due date: ${todo.due_date} ${todo.due_time}`)
            
            try {
              const syncResponse = await fetch('/api/calendar/sync-todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ todoId: id, action: 'sync' })
              })
              
              if (syncResponse.ok) {
                const syncData = await syncResponse.json()
                console.log('✅ Google Calendar sync successful:', syncData)
                // Update the todo with the Google Calendar link
                if (syncData.google_event_link) {
                  setTodos(prev => prev.map(t => 
                    t.id === id 
                      ? { ...t, google_event_link: syncData.google_event_link, google_event_id: syncData.google_event_id }
                      : t
                  ))
                }
              } else {
                const errorText = await syncResponse.text()
                console.error('❌ Google Calendar sync failed:', syncResponse.status, errorText)
              }
            } catch (syncError) {
              console.error('❌ Calendar sync request failed:', syncError)
            }
          } else {
            console.log('ℹ️ No due date set, skipping calendar sync')
          }
        } else {
          const errorText = await response.text()
          console.error('❌ Failed to update todo in database:', response.status, errorText)
        }
      } catch (error) {
        console.error('❌ Network error updating todo:', error)
      }
    } else {
      setTodos(prev => prev.map(todo =>
        todo.id === id
          ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
          : todo
      ))
    }
  }

  const handleTodoComplete = async (id: string) => {
    await toggleTodo(id)
  }

  const handleTodoDelete = async (id: string) => {
    await deleteTodo(id)
  }

  const handleTodoCreate = async (todoData: Partial<Todo>) => {
    console.log('🆕 Creating new todo:', todoData)
    
    const formattedData = {
      title: todoData.title || '',
      description: todoData.description || '',
      priority: todoData.priority || 'medium',
      category: todoData.category || 'General',
      tags: todoData.tags || [],
      assignedTo: todoData.assignedTo || undefined,
      dueDate: todoData.due_date || todoData.dueDate || undefined,
      dueTime: todoData.due_time || todoData.dueTime || undefined,
    }

    console.log('📝 Formatted todo data:', formattedData)

    if (useDatabase) {
      try {
        console.log('📡 Sending create request to /api/aimpact/todos-db...')
        const response = await fetch('/api/aimpact/todos-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedData)
        })
        
        console.log('📬 Create response status:', response.status)
        
        if (response.ok) {
          const { todo } = await response.json()
          console.log('✅ Todo created successfully:', todo)
          setTodos(prev => [todo, ...prev])
          
          // Trigger calendar sync
          if (todo.due_date) {
            console.log('📅 Triggering calendar sync for new todo...')
            try {
              await fetch('/api/calendar/sync-todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ todoId: todo.id, action: 'create' })
              })
              console.log('✅ Calendar sync triggered successfully')
            } catch (syncError) {
              console.error('❌ Calendar sync failed for new todo:', syncError)
            }
          }
        } else {
          const errorText = await response.text()
          console.error('❌ Failed to create todo:', response.status, errorText)
          
          // Show error message to user
          if (response.status === 401) {
            alert('Please log in to create todos')
          } else {
            alert(`Failed to create todo: ${errorText}`)
          }
        }
      } catch (error) {
        console.error('❌ Network error creating todo:', error)
        alert('Network error: Unable to create todo')
      }
    } else {
      console.log('💾 Creating todo in local storage mode')
      const newTodo: Todo = {
        ...formattedData as Todo,
        id: Date.now().toString(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        tags: formattedData.tags || []
      }
      setTodos(prev => [newTodo, ...prev])
      console.log('✅ Todo added to local state:', newTodo)
    }
  }

  // Convert todos for calendar view (normalize field names)
  const todosForCalendar = todos.map(todo => ({
    ...todo,
    due_date: todo.due_date || todo.dueDate,
    due_time: todo.due_time || todo.dueTime
  }))

  const filteredTodos = todos.filter(todo => {
    // Show archived todos when showArchived is true, non-archived when false
    if (showArchived && !todo.archived) return false
    if (!showArchived && todo.archived) return false
    
    if (searchTerm && !todo.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !todo.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !todo.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false
    }
    
    if (filterCategory !== 'all' && todo.category !== filterCategory) return false
    if (filterPriority !== 'all' && todo.priority !== filterPriority) return false
    if (filterStatus !== 'all') {
      if (filterStatus === 'completed' && !todo.completed) return false
      if (filterStatus === 'pending' && todo.completed) return false
      if (filterStatus === 'overdue' && (!todo.dueDate || !isPast(parseISO(todo.dueDate)) || todo.completed)) return false
    }
    
    return true
  })

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      case 'created':
        return parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      default:
        return 0
    }
  })

  const getDateLabel = (dueDate?: string) => {
    if (!dueDate) return null
    
    const date = parseISO(dueDate)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow' 
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMM d, yyyy')
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return isPast(parseISO(dueDate)) && !isToday(parseISO(dueDate))
  }

  const stats = {
    total: todos.filter(t => !t.archived).length,
    completed: todos.filter(t => t.completed && !t.archived).length,
    pending: todos.filter(t => !t.completed && !t.archived).length,
    overdue: todos.filter(t => !t.completed && !t.archived && t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
    archived: todos.filter(t => t.archived).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">To Do</h1>
          <p className="text-muted-foreground">
            Manage your tasks and stay organized
            {useDatabase && (
              <Badge variant="outline" className="ml-2">
                <Database className="w-3 h-3 mr-1" />
                Synced
              </Badge>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
          
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Calendar
          </Button>

          <div className="w-px bg-border mx-2" />

          <Button 
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="w-4 h-4 mr-2" />
            {showArchived ? 'Show Active' : `Archived (${stats.archived})`}
          </Button>
          
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 border rounded-md bg-background"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-1 border rounded-md bg-background"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 border rounded-md bg-background"
              >
                <option value="dueDate">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="created">Sort by Created</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List or Calendar View */}
      {viewMode === 'calendar' ? (
        <TodoCalendarView
          todos={todosForCalendar}
          onTodoUpdate={handleTodoUpdate}
          onTodoComplete={handleTodoComplete}
          onTodoDelete={handleTodoDelete}
          onTodoCreate={handleTodoCreate}
          useDatabase={useDatabase}
        />
      ) : (
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading todos...</p>
            </CardContent>
          </Card>
        ) : sortedTodos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Circle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {showArchived ? 'No archived tasks' : 'No tasks found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {showArchived 
                  ? 'Archive tasks to organize your completed work'
                  : 'Create your first task to get started'
                }
              </p>
              {!showArchived && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedTodos.map(todo => {
            const PriorityIcon = priorityIcons[todo.priority]
            const dateLabel = getDateLabel(todo.dueDate)
            const overdue = isOverdue(todo.dueDate)
            
            return (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`${todo.completed ? 'opacity-60' : ''} ${overdue && !todo.completed ? 'border-red-500' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTodo(todo.id)}
                        className="p-0 h-auto mt-1"
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                        )}
                      </Button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {todo.title}
                            </h3>
                            
                            {todo.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {todo.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-white ${priorityColors[todo.priority]}`}
                              >
                                <PriorityIcon className="w-3 h-3 mr-1" />
                                {todo.priority}
                              </Badge>
                              
                              <Badge variant="outline">
                                {todo.category}
                              </Badge>
                              
                              {todo.tags.map(tag => (
                                <Badge key={tag} variant="secondary">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              
                              {todo.assignedTo && (
                                <Badge variant="outline">
                                  <User className="w-3 h-3 mr-1" />
                                  {todo.assignedTo}
                                </Badge>
                              )}
                              
                              {dateLabel && (
                                <Badge 
                                  variant={overdue && !todo.completed ? "destructive" : "outline"}
                                >
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {dateLabel}
                                  {todo.dueTime && ` ${todo.dueTime}`}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editTodo(todo)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            
                            {showArchived ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => unarchiveTodo(todo.id)}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => archiveTodo(todo.id)}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTodo(todo.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>
      )}

      {/* Add/Edit Task Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => resetForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    {editingTodo ? 'Edit Task' : 'Add New Task'}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter task title..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add description..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <select 
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Tags</label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Comma separated tags..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Assigned To</label>
                    <Input
                      value={formData.assignedTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      placeholder="Person responsible..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Due Date</label>
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Due Time</label>
                      <Input
                        type="time"
                        value={formData.dueTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingTodo ? 'Update Task' : 'Add Task'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}