import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
// This bypasses RLS to allow the server to access todos for authenticated users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface Todo {
  id: string
  user_email: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  tags: string[]
  assigned_to?: string
  due_date?: string
  due_time?: string
  created_at: string
  updated_at: string
  archived: boolean
  project_id?: string
  parent_todo_id?: string
  completion_notes?: string
  estimated_hours?: number
  actual_hours?: number
  reminder_date?: string
  recurring_pattern?: string
  attachments?: any[]
  metadata?: any
  // Google Calendar fields
  google_event_id?: string
  google_calendar_id?: string
  google_event_link?: string
  calendar_sync_status?: 'pending' | 'synced' | 'failed' | 'disabled'
  last_synced_at?: string
  // Google Tasks fields
  google_task_id?: string
  google_task_list_id?: string
  google_task_etag?: string
  task_sync_status?: 'pending' | 'synced' | 'failed' | 'disabled'
  task_sync_error?: string
  last_task_sync_at?: string
}

export class TodosService {
  // Get all todos for a user
  static async getTodos(userEmail: string): Promise<Todo[]> {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching todos:', error)
      return []
    }

    return data || []
  }

  // Get filtered todos
  static async getFilteredTodos(
    userEmail: string,
    filters: {
      completed?: boolean
      archived?: boolean
      category?: string
      priority?: string
      search?: string
    }
  ): Promise<Todo[]> {
    let query = supabase.from('todos').select('*').eq('user_email', userEmail)

    if (filters.completed !== undefined) {
      query = query.eq('completed', filters.completed)
    }
    if (filters.archived !== undefined) {
      query = query.eq('archived', filters.archived)
    }
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error fetching filtered todos:', error)
      return []
    }

    return data || []
  }

  // Create a new todo
  static async createTodo(todo: Partial<Todo>): Promise<Todo | null> {
    const { data, error } = await supabase
      .from('todos')
      .insert([todo])
      .select()
      .single()

    if (error) {
      console.error('Error creating todo:', error)
      return null
    }

    // Trigger calendar sync if due date is set
    if (data && data.due_date) {
      this.triggerCalendarSync(data.id)
    }

    return data
  }

  // Update a todo
  static async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo | null> {
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating todo:', error)
      return null
    }

    // Trigger calendar sync if due date changed
    if (data && (updates.due_date !== undefined || updates.due_time !== undefined)) {
      this.triggerCalendarSync(data.id)
    }

    return data
  }

  // Delete a todo
  static async deleteTodo(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting todo:', error)
      return false
    }

    return true
  }

  // Toggle todo completion
  static async toggleTodoComplete(id: string): Promise<Todo | null> {
    // First get the current state
    const { data: currentTodo } = await supabase
      .from('todos')
      .select('completed')
      .eq('id', id)
      .single()

    if (!currentTodo) return null

    // Toggle the state
    const { data, error } = await supabase
      .from('todos')
      .update({ 
        completed: !currentTodo.completed,
        completion_notes: !currentTodo.completed ? `Completed at ${new Date().toISOString()}` : null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error toggling todo:', error)
      return null
    }

    return data
  }

  // Archive/Unarchive a todo
  static async toggleTodoArchive(id: string): Promise<Todo | null> {
    const { data: currentTodo } = await supabase
      .from('todos')
      .select('archived')
      .eq('id', id)
      .single()

    if (!currentTodo) return null

    const { data, error } = await supabase
      .from('todos')
      .update({ archived: !currentTodo.archived })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error archiving todo:', error)
      return null
    }

    return data
  }

  // Bulk operations
  static async bulkComplete(ids: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('todos')
      .update({ completed: true })
      .in('id', ids)

    return !error
  }

  static async bulkDelete(ids: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('todos')
      .delete()
      .in('id', ids)

    return !error
  }

  static async bulkArchive(ids: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('todos')
      .update({ archived: true })
      .in('id', ids)

    return !error
  }

  // Calendar sync trigger (placeholder - actual implementation will call Google Calendar API)
  private static async triggerCalendarSync(todoId: string): Promise<void> {
    try {
      // Mark todo for calendar sync - this will be picked up by the sync endpoint
      await supabase
        .from('todos')
        .update({
          calendar_sync_status: 'pending',
          last_synced_at: new Date().toISOString()
        })
        .eq('id', todoId)
      
      console.log(`Todo ${todoId} marked for calendar sync`)
    } catch (error) {
      console.error('Calendar sync marking failed:', error)
      // Don't throw - allow todo operations to succeed even if sync marking fails
    }
  }

  // Get upcoming todos for calendar view
  static async getUpcomingTodos(userEmail: string, days: number = 30): Promise<Todo[]> {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_email', userEmail)
      .eq('completed', false)
      .eq('archived', false)
      .not('due_date', 'is', null)
      .lte('due_date', endDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching upcoming todos:', error)
      return []
    }

    return data || []
  }

  // Subscribe to real-time changes
  static subscribeToTodos(
    userEmail: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('todos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_email=eq.${userEmail}`
        },
        callback
      )
      .subscribe()
  }
}