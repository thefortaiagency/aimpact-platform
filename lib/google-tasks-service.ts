import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { supabase } from './todos-db-service'

// Initialize Google OAuth2 client
export function getGoogleAuthClient(accessToken?: string): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  if (accessToken) {
    oauth2Client.setCredentials({ access_token: accessToken })
  }

  return oauth2Client
}

export interface GoogleTask {
  id?: string
  title: string
  notes?: string
  status?: 'needsAction' | 'completed'
  due?: string // RFC 3339 timestamp
  completed?: string // RFC 3339 timestamp
  updated?: string
  deleted?: boolean
  hidden?: boolean
  parent?: string
  position?: string
  selfLink?: string
  etag?: string
}

export interface GoogleTaskList {
  id?: string
  title: string
  updated?: string
  selfLink?: string
  etag?: string
}

export class GoogleTasksService {
  private auth: OAuth2Client
  private tasks: any

  constructor(accessToken: string) {
    this.auth = getGoogleAuthClient(accessToken)
    this.tasks = google.tasks({ version: 'v1', auth: this.auth })
  }

  // Get or create the default Nexus task list
  async getOrCreateNexusTaskList(): Promise<string> {
    try {
      // First, try to find existing Nexus list
      const listsResponse = await this.tasks.tasklists.list()
      const lists = listsResponse.data.items || []
      
      const nexusList = lists.find((list: GoogleTaskList) => 
        list.title === 'Nexus Tasks' || list.title === 'AImpact Nexus'
      )
      
      if (nexusList) {
        console.log('Found existing Nexus task list:', nexusList.id)
        return nexusList.id!
      }
      
      // Create new list if not found
      const newList = await this.tasks.tasklists.insert({
        requestBody: {
          title: 'AImpact Nexus'
        }
      })
      
      console.log('Created new Nexus task list:', newList.data.id)
      return newList.data.id!
    } catch (error) {
      console.error('Error getting/creating task list:', error)
      // Use default task list as fallback
      return '@default'
    }
  }

  // Create a task in Google Tasks
  async createTask(todo: any, taskListId?: string): Promise<GoogleTask | null> {
    try {
      const listId = taskListId || await this.getOrCreateNexusTaskList()
      
      const task: GoogleTask = {
        title: todo.title,
        notes: todo.description || '',
        status: todo.completed ? 'completed' : 'needsAction'
      }
      
      // Add due date if present
      if (todo.due_date) {
        const dueDate = new Date(todo.due_date)
        if (todo.due_time) {
          const [hours, minutes] = todo.due_time.split(':')
          dueDate.setHours(parseInt(hours), parseInt(minutes))
        }
        task.due = dueDate.toISOString()
      }
      
      // Add completion date if completed
      if (todo.completed && todo.updated_at) {
        task.completed = new Date(todo.updated_at).toISOString()
      }
      
      const response = await this.tasks.tasks.insert({
        tasklist: listId,
        requestBody: task
      })
      
      console.log('Created Google Task:', response.data.id)
      
      // Update todo with Google Task ID
      await supabase
        .from('todos')
        .update({
          google_task_id: response.data.id,
          google_task_list_id: listId,
          task_sync_status: 'synced',
          last_task_sync_at: new Date().toISOString()
        })
        .eq('id', todo.id)
      
      return response.data
    } catch (error) {
      console.error('Error creating Google Task:', error)
      
      // Update sync status to failed
      await supabase
        .from('todos')
        .update({
          task_sync_status: 'failed',
          task_sync_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', todo.id)
      
      return null
    }
  }

  // Update a task in Google Tasks
  async updateTask(todo: any): Promise<GoogleTask | null> {
    try {
      if (!todo.google_task_id || !todo.google_task_list_id) {
        // Task doesn't exist in Google, create it
        return await this.createTask(todo)
      }
      
      const task: GoogleTask = {
        id: todo.google_task_id,
        title: todo.title,
        notes: todo.description || '',
        status: todo.completed ? 'completed' : 'needsAction'
      }
      
      // Add due date if present
      if (todo.due_date) {
        const dueDate = new Date(todo.due_date)
        if (todo.due_time) {
          const [hours, minutes] = todo.due_time.split(':')
          dueDate.setHours(parseInt(hours), parseInt(minutes))
        }
        task.due = dueDate.toISOString()
      }
      
      // Add completion date if completed
      if (todo.completed && todo.updated_at) {
        task.completed = new Date(todo.updated_at).toISOString()
      }
      
      const response = await this.tasks.tasks.update({
        tasklist: todo.google_task_list_id,
        task: todo.google_task_id,
        requestBody: task
      })
      
      console.log('Updated Google Task:', response.data.id)
      
      // Update sync status
      await supabase
        .from('todos')
        .update({
          task_sync_status: 'synced',
          last_task_sync_at: new Date().toISOString()
        })
        .eq('id', todo.id)
      
      return response.data
    } catch (error: any) {
      console.error('Error updating Google Task:', error)
      
      // If task not found, try to recreate it
      if (error.code === 404) {
        console.log('Task not found in Google, recreating...')
        return await this.createTask(todo)
      }
      
      // Update sync status to failed
      await supabase
        .from('todos')
        .update({
          task_sync_status: 'failed',
          task_sync_error: error.message
        })
        .eq('id', todo.id)
      
      return null
    }
  }

  // Delete a task from Google Tasks
  async deleteTask(todo: any): Promise<boolean> {
    try {
      if (!todo.google_task_id || !todo.google_task_list_id) {
        console.log('No Google Task to delete')
        return true
      }
      
      await this.tasks.tasks.delete({
        tasklist: todo.google_task_list_id,
        task: todo.google_task_id
      })
      
      console.log('Deleted Google Task:', todo.google_task_id)
      return true
    } catch (error: any) {
      console.error('Error deleting Google Task:', error)
      
      // If task not found, consider it deleted
      if (error.code === 404) {
        console.log('Task already deleted from Google')
        return true
      }
      
      return false
    }
  }

  // Complete a task in Google Tasks
  async completeTask(todo: any): Promise<GoogleTask | null> {
    try {
      if (!todo.google_task_id || !todo.google_task_list_id) {
        // Task doesn't exist in Google, create it as completed
        return await this.createTask({ ...todo, completed: true })
      }
      
      const task: GoogleTask = {
        id: todo.google_task_id,
        status: 'completed',
        completed: new Date().toISOString()
      }
      
      const response = await this.tasks.tasks.patch({
        tasklist: todo.google_task_list_id,
        task: todo.google_task_id,
        requestBody: task
      })
      
      console.log('Completed Google Task:', response.data.id)
      
      // Update sync status
      await supabase
        .from('todos')
        .update({
          task_sync_status: 'synced',
          last_task_sync_at: new Date().toISOString()
        })
        .eq('id', todo.id)
      
      return response.data
    } catch (error: any) {
      console.error('Error completing Google Task:', error)
      
      // If task not found, try to recreate it as completed
      if (error.code === 404) {
        console.log('Task not found in Google, recreating as completed...')
        return await this.createTask({ ...todo, completed: true })
      }
      
      // Update sync status to failed
      await supabase
        .from('todos')
        .update({
          task_sync_status: 'failed',
          task_sync_error: error.message
        })
        .eq('id', todo.id)
      
      return null
    }
  }

  // Sync all todos to Google Tasks
  async syncAllTodos(userEmail: string): Promise<{ synced: number; failed: number }> {
    try {
      const { data: todos, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_email', userEmail)
        .eq('archived', false)
      
      if (error) {
        console.error('Error fetching todos for sync:', error)
        return { synced: 0, failed: 0 }
      }
      
      let synced = 0
      let failed = 0
      
      for (const todo of todos || []) {
        const result = todo.google_task_id 
          ? await this.updateTask(todo)
          : await this.createTask(todo)
        
        if (result) {
          synced++
        } else {
          failed++
        }
      }
      
      console.log(`Synced ${synced} todos, ${failed} failed`)
      return { synced, failed }
    } catch (error) {
      console.error('Error syncing todos:', error)
      return { synced: 0, failed: 0 }
    }
  }

  // Import tasks from Google Tasks
  async importTasksFromGoogle(userEmail: string): Promise<{ imported: number; failed: number }> {
    try {
      const taskListId = await this.getOrCreateNexusTaskList()
      
      // Get all tasks from the list
      const response = await this.tasks.tasks.list({
        tasklist: taskListId,
        maxResults: 100,
        showCompleted: true,
        showHidden: false
      })
      
      const tasks = response.data.items || []
      let imported = 0
      let failed = 0
      
      for (const task of tasks) {
        try {
          // Check if task already exists
          const { data: existing } = await supabase
            .from('todos')
            .select('id')
            .eq('google_task_id', task.id)
            .single()
          
          if (existing) {
            console.log('Task already exists:', task.id)
            continue
          }
          
          // Parse due date
          let dueDate = null
          let dueTime = null
          if (task.due) {
            const date = new Date(task.due)
            dueDate = date.toISOString().split('T')[0]
            dueTime = date.toTimeString().substring(0, 5)
          }
          
          // Create todo from task
          const { error } = await supabase
            .from('todos')
            .insert({
              user_email: userEmail,
              title: task.title || 'Untitled Task',
              description: task.notes || '',
              completed: task.status === 'completed',
              priority: 'medium',
              category: 'personal',
              tags: ['imported', 'google-tasks'],
              due_date: dueDate,
              due_time: dueTime,
              google_task_id: task.id,
              google_task_list_id: taskListId,
              task_sync_status: 'synced',
              last_task_sync_at: new Date().toISOString(),
              archived: false
            })
          
          if (error) {
            console.error('Error importing task:', error)
            failed++
          } else {
            imported++
          }
        } catch (error) {
          console.error('Error processing task:', error)
          failed++
        }
      }
      
      console.log(`Imported ${imported} tasks, ${failed} failed`)
      return { imported, failed }
    } catch (error) {
      console.error('Error importing tasks from Google:', error)
      return { imported: 0, failed: 0 }
    }
  }

  // Get all tasks from Google
  async getAllTasks(): Promise<GoogleTask[]> {
    try {
      const taskListId = await this.getOrCreateNexusTaskList()
      
      const response = await this.tasks.tasks.list({
        tasklist: taskListId,
        maxResults: 100,
        showCompleted: true,
        showHidden: false
      })
      
      return response.data.items || []
    } catch (error) {
      console.error('Error fetching tasks from Google:', error)
      return []
    }
  }

  // Two-way sync between local todos and Google Tasks
  async twoWaySync(userEmail: string): Promise<{ 
    toGoogle: number; 
    fromGoogle: number; 
    conflicts: number;
    failed: number;
  }> {
    try {
      // Get all local todos
      const { data: localTodos } = await supabase
        .from('todos')
        .select('*')
        .eq('user_email', userEmail)
        .eq('archived', false)
      
      // Get all Google tasks
      const googleTasks = await this.getAllTasks()
      
      let toGoogle = 0
      let fromGoogle = 0
      let conflicts = 0
      let failed = 0
      
      // Create a map of Google tasks by ID
      const googleTaskMap = new Map<string, GoogleTask>()
      googleTasks.forEach(task => {
        if (task.id) googleTaskMap.set(task.id, task)
      })
      
      // Sync local todos to Google
      for (const todo of localTodos || []) {
        if (!todo.google_task_id) {
          // New todo, create in Google
          const result = await this.createTask(todo)
          if (result) toGoogle++
          else failed++
        } else if (googleTaskMap.has(todo.google_task_id)) {
          // Check if update needed
          const googleTask = googleTaskMap.get(todo.google_task_id)!
          const localUpdated = new Date(todo.updated_at)
          const googleUpdated = new Date(googleTask.updated || '')
          
          if (localUpdated > googleUpdated) {
            // Local is newer, update Google
            const result = await this.updateTask(todo)
            if (result) toGoogle++
            else failed++
          }
          
          // Remove from map as it's been processed
          googleTaskMap.delete(todo.google_task_id)
        } else {
          // Task was deleted from Google, delete locally
          await supabase
            .from('todos')
            .delete()
            .eq('id', todo.id)
        }
      }
      
      // Import remaining Google tasks (not in local)
      for (const [taskId, task] of googleTaskMap) {
        try {
          // Parse due date
          let dueDate = null
          let dueTime = null
          if (task.due) {
            const date = new Date(task.due)
            dueDate = date.toISOString().split('T')[0]
            dueTime = date.toTimeString().substring(0, 5)
          }
          
          // Create local todo
          const { error } = await supabase
            .from('todos')
            .insert({
              user_email: userEmail,
              title: task.title || 'Untitled Task',
              description: task.notes || '',
              completed: task.status === 'completed',
              priority: 'medium',
              category: 'personal',
              tags: ['synced'],
              due_date: dueDate,
              due_time: dueTime,
              google_task_id: task.id,
              google_task_list_id: await this.getOrCreateNexusTaskList(),
              task_sync_status: 'synced',
              last_task_sync_at: new Date().toISOString(),
              archived: false
            })
          
          if (!error) fromGoogle++
          else failed++
        } catch (error) {
          console.error('Error importing task:', error)
          failed++
        }
      }
      
      console.log(`Two-way sync complete: ${toGoogle} to Google, ${fromGoogle} from Google, ${conflicts} conflicts, ${failed} failed`)
      return { toGoogle, fromGoogle, conflicts, failed }
    } catch (error) {
      console.error('Error in two-way sync:', error)
      return { toGoogle: 0, fromGoogle: 0, conflicts: 0, failed: 0 }
    }
  }
}