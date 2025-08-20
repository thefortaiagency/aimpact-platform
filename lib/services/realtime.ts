import { EventEmitter } from 'events'

export interface RealtimeUpdate {
  type: 'new_communication' | 'communication_update' | 'client_update' | 'ticket_update'
  data: any
  timestamp: Date
}

class RealtimeService extends EventEmitter {
  private static instance: RealtimeService
  private updates: RealtimeUpdate[] = []

  private constructor() {
    super()
  }

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  // Emit an update to all connected clients
  emitUpdate(update: RealtimeUpdate) {
    this.updates.push(update)
    this.emit('update', update)
  }

  // Get recent updates (for SSE reconnection)
  getRecentUpdates(since?: Date): RealtimeUpdate[] {
    if (!since) {
      return this.updates.slice(-50) // Return last 50 updates
    }
    return this.updates.filter(u => u.timestamp > since)
  }

  // Clean old updates (older than 1 hour)
  cleanOldUpdates() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    this.updates = this.updates.filter(u => u.timestamp > oneHourAgo)
  }
}

export const realtimeService = RealtimeService.getInstance()

// Clean old updates every 30 minutes
setInterval(() => {
  realtimeService.cleanOldUpdates()
}, 30 * 60 * 1000)