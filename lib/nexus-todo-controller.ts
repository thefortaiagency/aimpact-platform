/**
 * NEXUS TODO CONTROLLER
 * Gives the Nexus AI Assistant FULL AUTONOMOUS CONTROL over todo management
 * Integrates Claude Code TodoWrite system with nexus-platform todo system
 */

export interface NexusTodo {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  tags?: string[]
  assignedTo?: string
  dueDate?: string
  dueTime?: string
  createdAt: string
  updatedAt: string
  source: 'claude_code' | 'nexus_platform' | 'hybrid'
}

export class NexusTodoController {
  private static instance: NexusTodoController
  private todos: NexusTodo[] = []
  
  static getInstance(): NexusTodoController {
    if (!NexusTodoController.instance) {
      NexusTodoController.instance = new NexusTodoController()
    }
    return NexusTodoController.instance
  }

  /**
   * AI AUTONOMOUS ACTIONS - Full Control Interface
   */
  
  async createTodo(params: {
    content: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    category?: string
    assignedTo?: string
    dueDate?: string
    dueTime?: string
    status?: 'pending' | 'in_progress'
  }): Promise<NexusTodo> {
    const todo: NexusTodo = {
      id: this.generateId(),
      content: params.content,
      status: params.status || 'pending',
      priority: params.priority || 'medium',
      category: params.category || 'General',
      assignedTo: params.assignedTo,
      dueDate: params.dueDate,
      dueTime: params.dueTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'nexus_platform'
    }
    
    this.todos.push(todo)
    await this.syncToClaudeCode()
    return todo
  }

  async updateTodo(id: string, updates: Partial<NexusTodo>): Promise<NexusTodo | null> {
    const todoIndex = this.todos.findIndex(t => t.id === id)
    if (todoIndex === -1) return null
    
    this.todos[todoIndex] = {
      ...this.todos[todoIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    await this.syncToClaudeCode()
    return this.todos[todoIndex]
  }

  async completeTodo(id: string): Promise<NexusTodo | null> {
    return this.updateTodo(id, { status: 'completed' })
  }

  async deleteTodo(id: string): Promise<boolean> {
    const initialLength = this.todos.length
    this.todos = this.todos.filter(t => t.id !== id)
    
    if (this.todos.length < initialLength) {
      await this.syncToClaudeCode()
      return true
    }
    return false
  }

  async bulkAction(action: 'complete' | 'delete' | 'archive', filters?: {
    priority?: string
    category?: string
    overdue?: boolean
    status?: string
  }): Promise<number> {
    let affectedTodos = this.todos
    
    // Apply filters
    if (filters) {
      if (filters.priority) {
        affectedTodos = affectedTodos.filter(t => t.priority === filters.priority)
      }
      if (filters.category) {
        affectedTodos = affectedTodos.filter(t => t.category === filters.category)
      }
      if (filters.status) {
        affectedTodos = affectedTodos.filter(t => t.status === filters.status)
      }
      if (filters.overdue) {
        const now = new Date()
        affectedTodos = affectedTodos.filter(t => {
          if (!t.dueDate) return false
          return new Date(t.dueDate) < now && t.status !== 'completed'
        })
      }
    }
    
    // Perform bulk action
    const affectedCount = affectedTodos.length
    
    switch (action) {
      case 'complete':
        affectedTodos.forEach(todo => {
          const index = this.todos.findIndex(t => t.id === todo.id)
          if (index !== -1) {
            this.todos[index].status = 'completed'
            this.todos[index].updatedAt = new Date().toISOString()
          }
        })
        break
        
      case 'delete':
        const idsToDelete = affectedTodos.map(t => t.id)
        this.todos = this.todos.filter(t => !idsToDelete.includes(t.id))
        break
    }
    
    if (affectedCount > 0) {
      await this.syncToClaudeCode()
    }
    
    return affectedCount
  }

  /**
   * SMART QUERYING - AI can ask complex questions
   */
  
  queryTodos(filters?: {
    status?: 'pending' | 'in_progress' | 'completed'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    category?: string
    assignedTo?: string
    search?: string
    overdue?: boolean
    dueToday?: boolean
  }): NexusTodo[] {
    let results = [...this.todos]
    
    if (!filters) return results
    
    if (filters.status) {
      results = results.filter(t => t.status === filters.status)
    }
    
    if (filters.priority) {
      results = results.filter(t => t.priority === filters.priority)
    }
    
    if (filters.category) {
      results = results.filter(t => t.category === filters.category)
    }
    
    if (filters.assignedTo) {
      results = results.filter(t => t.assignedTo === filters.assignedTo)
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      results = results.filter(t => 
        t.content.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower)
      )
    }
    
    if (filters.overdue) {
      const now = new Date()
      results = results.filter(t => {
        if (!t.dueDate) return false
        return new Date(t.dueDate) < now && t.status !== 'completed'
      })
    }
    
    if (filters.dueToday) {
      const today = new Date().toISOString().split('T')[0]
      results = results.filter(t => t.dueDate === today)
    }
    
    return results
  }

  getTodoStats(): {
    total: number
    pending: number
    inProgress: number
    completed: number
    overdue: number
    dueToday: number
    byPriority: Record<string, number>
    byCategory: Record<string, number>
  } {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const stats = {
      total: this.todos.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      byPriority: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    }
    
    this.todos.forEach(todo => {
      // Status counts
      if (todo.status === 'pending') stats.pending++
      else if (todo.status === 'in_progress') stats.inProgress++
      else if (todo.status === 'completed') stats.completed++
      
      // Overdue check
      if (todo.dueDate && new Date(todo.dueDate) < now && todo.status !== 'completed') {
        stats.overdue++
      }
      
      // Due today check
      if (todo.dueDate === today) {
        stats.dueToday++
      }
      
      // Priority counts
      const priority = todo.priority || 'medium'
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1
      
      // Category counts
      const category = todo.category || 'General'
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
    })
    
    return stats
  }

  /**
   * AI CONTEXT INTEGRATION
   */
  
  async getAIContext(): Promise<string> {
    const stats = this.getTodoStats()
    const overdue = this.queryTodos({ overdue: true })
    const dueToday = this.queryTodos({ dueToday: true })
    const urgent = this.queryTodos({ priority: 'urgent', status: 'pending' })
    
    let context = `📋 **Current Todo Status:**\n`
    context += `• Total: ${stats.total} tasks\n`
    context += `• Pending: ${stats.pending} | In Progress: ${stats.inProgress} | Completed: ${stats.completed}\n`
    
    if (stats.overdue > 0) {
      context += `🚨 **${stats.overdue} OVERDUE TASKS!**\n`
      overdue.slice(0, 3).forEach(todo => {
        context += `  • ${todo.content} (due ${todo.dueDate})\n`
      })
    }
    
    if (stats.dueToday > 0) {
      context += `⏰ **${stats.dueToday} tasks due TODAY:**\n`
      dueToday.slice(0, 3).forEach(todo => {
        context += `  • ${todo.content}${todo.dueTime ? ` at ${todo.dueTime}` : ''}\n`
      })
    }
    
    if (urgent.length > 0) {
      context += `🔥 **${urgent.length} URGENT tasks:**\n`
      urgent.slice(0, 3).forEach(todo => {
        context += `  • ${todo.content}\n`
      })
    }
    
    return context
  }

  /**
   * CLAUDE CODE INTEGRATION
   */
  
  private async syncToClaudeCode(): Promise<void> {
    // Convert nexus todos to Claude Code format
    const claudeCodeTodos = this.todos.map(todo => ({
      id: todo.id,
      content: todo.content,
      status: todo.status
    }))
    
    // In a real implementation, this would call the actual TodoWrite API
    // For now, we'll just log the sync
    console.log('🔄 Syncing todos to Claude Code:', claudeCodeTodos.length, 'todos')
  }
  
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}

/**
 * EXPORTED FUNCTIONS FOR AI ASSISTANT
 */

export const nexusTodoController = NexusTodoController.getInstance()

export async function aiCreateTodo(content: string, options?: {
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  assignedTo?: string
  dueDate?: string
  dueTime?: string
}): Promise<NexusTodo> {
  return nexusTodoController.createTodo({
    content,
    ...options
  })
}

export async function aiCompleteTodo(id: string): Promise<NexusTodo | null> {
  return nexusTodoController.completeTodo(id)
}

export async function aiBulkCompleteOverdue(): Promise<number> {
  return nexusTodoController.bulkAction('complete', { overdue: true })
}

export async function aiGetTodoInsights(): Promise<string> {
  return nexusTodoController.getAIContext()
}

export function aiQueryTodos(query: string): NexusTodo[] {
  // Smart query parsing for natural language
  const filters: any = {}
  
  if (query.includes('urgent')) filters.priority = 'urgent'
  if (query.includes('high priority')) filters.priority = 'high'
  if (query.includes('overdue')) filters.overdue = true
  if (query.includes('today')) filters.dueToday = true
  if (query.includes('pending')) filters.status = 'pending'
  if (query.includes('completed')) filters.status = 'completed'
  if (query.includes('in progress')) filters.status = 'in_progress'
  
  return nexusTodoController.queryTodos(filters)
}