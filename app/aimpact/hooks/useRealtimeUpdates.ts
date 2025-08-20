import { useEffect, useCallback, useRef, useState } from 'react'
import sseConnectionManager from '../utils/sse-connection-manager'

interface RealtimeUpdateOptions {
  onUpdate?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  enabled?: boolean
  connectionId?: string // Unique ID for this hook instance
}

export function useRealtimeUpdates(options: RealtimeUpdateOptions = {}) {
  const { 
    onUpdate, 
    onConnect, 
    onDisconnect, 
    enabled = true, 
    connectionId 
  } = options
  
  // Use a stable ID that persists across renders
  const stableId = useRef(connectionId || `hook-${Math.random().toString(36).substr(2, 9)}`)
  const idRef = useRef(stableId.current)

  // Track if we're already subscribed to prevent duplicates
  const isSubscribed = useRef(false)
  
  // Use refs for callbacks to avoid re-subscribing on every render
  const onUpdateRef = useRef(onUpdate)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)
  
  // Update refs when callbacks change
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onConnectRef.current = onConnect
    onDisconnectRef.current = onDisconnect
  }, [onUpdate, onConnect, onDisconnect])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    if (!enabled) {
      // Unsubscribe if disabled
      if (isSubscribed.current) {
        sseConnectionManager.unsubscribe(idRef.current)
        isSubscribed.current = false
      }
      return
    }

    // Prevent duplicate subscriptions
    if (isSubscribed.current) return

    // Subscribe to updates
    const updateHandler = (data: any) => {
      onUpdateRef.current?.(data)
    }
    
    sseConnectionManager.subscribe(idRef.current, updateHandler)
    isSubscribed.current = true

    // Set up connection listeners
    const handleConnect = () => {
      console.log(`useRealtimeUpdates: Connected (${idRef.current})`)
      onConnectRef.current?.()
    }

    const handleDisconnect = () => {
      console.log(`useRealtimeUpdates: Disconnected (${idRef.current})`)
      onDisconnectRef.current?.()
    }

    sseConnectionManager.onConnect(handleConnect)
    sseConnectionManager.onDisconnect(handleDisconnect)

    // Cleanup
    return () => {
      if (isSubscribed.current) {
        sseConnectionManager.unsubscribe(idRef.current)
        isSubscribed.current = false
      }
      
      sseConnectionManager.removeConnectionListener(handleConnect)
      sseConnectionManager.removeDisconnectionListener(handleDisconnect)
    }
  }, [enabled]) // Only depend on enabled, not the callbacks

  // Return control functions
  const reconnect = useCallback(() => {
    console.log(`useRealtimeUpdates: Manual reconnect requested (${idRef.current})`)
    // The connection manager handles reconnection automatically
    // This is kept for API compatibility
  }, [])

  const disconnect = useCallback(() => {
    sseConnectionManager.unsubscribe(idRef.current)
  }, [])

  // Use state to track connection status to avoid hydration issues
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsConnected(false)
      return
    }
    
    const checkConnection = () => {
      setIsConnected(sseConnectionManager.getConnectionState() === 'connected')
    }
    
    // Check initial state
    checkConnection()
    
    // Update when connection state changes
    const handleConnectionChange = () => checkConnection()
    sseConnectionManager.onConnect(handleConnectionChange)
    sseConnectionManager.onDisconnect(handleConnectionChange)
    
    return () => {
      sseConnectionManager.removeConnectionListener(handleConnectionChange)
      sseConnectionManager.removeDisconnectionListener(handleConnectionChange)
    }
  }, [])

  return {
    reconnect,
    disconnect,
    isConnected
  }
}