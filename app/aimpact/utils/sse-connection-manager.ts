import { logError } from '@/lib/error-handling'

// Singleton SSE connection manager to prevent multiple connections
class SSEConnectionManager {
  private static instance: SSEConnectionManager
  private eventSource: EventSource | null = null
  private listeners: Map<string, (data: any) => void> = new Map()
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private maxReconnectDelay = 60000 // 1 minute
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'
  private connectionListeners: Set<() => void> = new Set()
  private disconnectionListeners: Set<() => void> = new Set()
  private errorListeners: Set<(error: Error) => void> = new Set()
  private lastConnectionTime = 0
  private minConnectionInterval = 5000 // Minimum 5 seconds between connection attempts
  private lastError: Error | null = null

  private constructor() {}

  static getInstance(): SSEConnectionManager {
    if (!SSEConnectionManager.instance) {
      SSEConnectionManager.instance = new SSEConnectionManager()
    }
    return SSEConnectionManager.instance
  }

  subscribe(id: string, callback: (data: any) => void) {
    this.listeners.set(id, callback)
    
    // Connect if this is the first listener
    if (this.listeners.size === 1) {
      this.connect()
    }
    
    // Notify if already connected
    if (this.connectionState === 'connected') {
      this.connectionListeners.forEach(listener => listener())
    }
  }

  unsubscribe(id: string) {
    this.listeners.delete(id)
    
    // Disconnect if no more listeners
    if (this.listeners.size === 0) {
      this.disconnect()
    }
  }

  onConnect(listener: () => void) {
    this.connectionListeners.add(listener)
    // Immediately call if already connected
    if (this.connectionState === 'connected') {
      listener()
    }
  }

  onDisconnect(listener: () => void) {
    this.disconnectionListeners.add(listener)
  }

  onError(listener: (error: Error) => void) {
    this.errorListeners.add(listener)
    // Immediately call if we have a current error
    if (this.connectionState === 'error' && this.lastError) {
      listener(this.lastError)
    }
  }

  removeConnectionListener(listener: () => void) {
    this.connectionListeners.delete(listener)
  }

  removeDisconnectionListener(listener: () => void) {
    this.disconnectionListeners.delete(listener)
  }

  removeErrorListener(listener: (error: Error) => void) {
    this.errorListeners.delete(listener)
  }

  private connect() {
    if (this.connectionState !== 'disconnected' || this.eventSource?.readyState === EventSource.OPEN) {
      console.log('SSEConnectionManager: Connection already in progress or established')
      return
    }

    // Enforce minimum time between connection attempts
    const now = Date.now()
    const timeSinceLastConnection = now - this.lastConnectionTime
    if (timeSinceLastConnection < this.minConnectionInterval) {
      const waitTime = this.minConnectionInterval - timeSinceLastConnection
      console.log(`SSEConnectionManager: Too soon to reconnect. Waiting ${waitTime}ms`)
      setTimeout(() => {
        if (this.listeners.size > 0 && this.connectionState === 'disconnected') {
          this.connect()
        }
      }, waitTime)
      return
    }

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.connectionState = 'connecting'
    this.lastConnectionTime = now

    try {
      console.log('SSEConnectionManager: Establishing connection...')
      const eventSource = new EventSource('/api/aimpact/communications/updates')
      this.eventSource = eventSource

      eventSource.onopen = () => {
        console.log('SSEConnectionManager: Connected')
        this.connectionState = 'connected'
        this.reconnectAttempts = 0
        this.connectionListeners.forEach(listener => listener())
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Ignore heartbeat messages
          if (data.type === 'heartbeat') return
          
          // Notify all listeners with error boundary
          this.listeners.forEach(callback => {
            try {
              callback(data)
            } catch (error) {
              console.error('SSEConnectionManager: Listener error:', error)
              logError(error, { 
                context: 'SSEConnectionManager.onmessage.listener',
                data 
              })
              // Don't propagate listener errors to prevent cascade failures
            }
          })
        } catch (error) {
          console.error('SSEConnectionManager: Failed to parse message:', error)
          logError(error, { 
            context: 'SSEConnectionManager.onmessage.parse',
            eventData: event.data 
          })
        }
      }

      eventSource.onerror = async (error) => {
        console.error('SSEConnectionManager: Connection error:', error)
        
        // Create a proper error object
        const connectionError = new Error('SSE connection failed')
        this.lastError = connectionError
        
        logError(connectionError, {
          context: 'SSEConnectionManager.onerror',
          state: this.connectionState,
          reconnectAttempts: this.reconnectAttempts
        })
        
        this.connectionState = 'error'
        eventSource.close()
        this.eventSource = null
        
        // Notify error listeners
        this.errorListeners.forEach(listener => {
          try {
            listener(connectionError)
          } catch (err) {
            console.error('Error in error listener:', err)
          }
        })
        
        this.disconnectionListeners.forEach(listener => {
          try {
            listener()
          } catch (err) {
            console.error('Error in disconnection listener:', err)
          }
        })

        // Don't attempt reconnection if there are no listeners
        if (this.listeners.size === 0) {
          console.log('SSEConnectionManager: No active listeners, skipping reconnection')
          return
        }

        // Check for rate limit before attempting reconnection
        try {
          const response = await fetch('/api/aimpact/communications/updates', { method: 'HEAD' })
          
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 120000 // Default to 2 minutes if no Retry-After header
            
            console.warn(`SSEConnectionManager: Rate limited. Waiting ${delay/1000} seconds before retry...`)
            
            // Clear any existing timeout
            if (this.reconnectTimeout) {
              clearTimeout(this.reconnectTimeout)
            }
            
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts = 0
              if (this.listeners.size > 0) {
                this.reconnect()
              }
            }, delay)
            return
          }
        } catch (e) {
          console.error('SSEConnectionManager: Failed to check rate limit status:', e)
          logError(e, { context: 'SSEConnectionManager.checkRateLimit' })
        }

        // Exponential backoff reconnection only if not rate limited
        if (this.listeners.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          const delay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
          )
          
          console.log(`SSEConnectionManager: Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
          
          // Clear any existing timeout
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
          }
          
          this.reconnectTimeout = setTimeout(() => {
            if (this.listeners.size > 0) {
              this.reconnect()
            }
          }, delay)
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(`SSEConnectionManager: Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`)
        }
      }
    } catch (error) {
      console.error('SSEConnectionManager: Failed to create connection:', error)
      this.connectionState = 'error'
      this.lastError = error as Error
      
      logError(error, {
        context: 'SSEConnectionManager.connect',
        listeners: this.listeners.size
      })
      
      // Notify error listeners
      this.errorListeners.forEach(listener => {
        try {
          listener(error as Error)
        } catch (err) {
          console.error('Error in error listener:', err)
        }
      })
    }
  }

  private disconnect() {
    console.log('SSEConnectionManager: Disconnecting...')
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.connectionState = 'disconnected'
    this.reconnectAttempts = 0
  }

  private reconnect() {
    // Prevent reconnection loops by checking state
    if (this.connectionState === 'connecting') {
      console.log('SSEConnectionManager: Already connecting, skipping reconnect')
      return
    }
    
    this.disconnect()
    if (this.listeners.size > 0) {
      // Add a small delay to prevent tight loops
      setTimeout(() => {
        this.connect()
      }, 100)
    }
  }

  getConnectionState() {
    return this.connectionState
  }

  getLastError() {
    return this.lastError
  }

  // Gracefully handle connection cleanup
  cleanup() {
    console.log('SSEConnectionManager: Cleaning up...')
    this.disconnect()
    this.listeners.clear()
    this.connectionListeners.clear()
    this.disconnectionListeners.clear()
    this.errorListeners.clear()
    this.lastError = null
  }
}

export default SSEConnectionManager.getInstance()