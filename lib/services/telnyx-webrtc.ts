'use client'

// Conditionally import TelnyxRTC to avoid SSR issues
let TelnyxRTC: any
if (typeof window !== 'undefined') {
  TelnyxRTC = require('@telnyx/webrtc').TelnyxRTC
}

export interface TelnyxCallState {
  id: string
  state: 'new' | 'connecting' | 'ringing' | 'active' | 'held' | 'hangup' | 'destroy'
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  startTime?: Date
  endTime?: Date
  duration?: number
}

export interface TelnyxWebRTCConfig {
  login_token?: string
  credential_token?: string
  login?: string
  password?: string
  ringtoneFile?: string
  ringbackFile?: string
}

class TelnyxWebRTCService {
  private client: TelnyxRTC | null = null
  private activeCall: any = null
  private listeners: Map<string, Function[]> = new Map()
  private audioElement: HTMLAudioElement | null = null

  constructor() {
    // Initialize audio element for remote stream
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio()
      this.audioElement.autoplay = true
    }
  }

  async initialize(config: TelnyxWebRTCConfig): Promise<void> {
    if (!TelnyxRTC) {
      throw new Error('TelnyxRTC not available - client-side only')
    }
    
    if (!config.login_token && !config.credential_token && !config.login) {
      throw new Error('Authentication credentials required')
    }

    try {
      console.log('Initializing Telnyx WebRTC...')
      
      // Create new Telnyx WebRTC client
      const clientConfig: any = {
        ringtoneFile: config.ringtoneFile,
        ringbackFile: config.ringbackFile,
      }

      // Use the appropriate auth method
      if (config.login && config.password) {
        // SIP credentials
        console.log('Using SIP credentials authentication')
        clientConfig.login = config.login
        clientConfig.password = config.password
      } else if (config.login_token) {
        // JWT/Public key token
        console.log('Using login token authentication')
        clientConfig.login_token = config.login_token
      } else if (config.credential_token) {
        // API key fallback
        console.log('Using credential token authentication')
        clientConfig.login = config.credential_token
        clientConfig.password = config.credential_token
      }

      this.client = new TelnyxRTC(clientConfig)

      // Set up event listeners before connecting
      this.setupEventListeners()

      // Add more detailed logging
      this.client.on('telnyx.socket.open', () => {
        console.log('WebSocket opened')
      })

      this.client.on('telnyx.socket.close', (e) => {
        console.log('WebSocket closed:', e)
      })

      this.client.on('telnyx.socket.error', (e) => {
        console.error('WebSocket error:', e)
      })

      // Connect to Telnyx
      console.log('Connecting to Telnyx...')
      await this.client.connect()
      
      // Wait for registration with better error handling
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('Registration timeout - client state:', this.client?.getState())
          reject(new Error('Registration timeout after 15s'))
        }, 15000)

        const readyHandler = () => {
          console.log('Telnyx ready event received')
          clearTimeout(timeout)
          resolve(true)
        }

        const errorHandler = (error: any) => {
          console.error('Telnyx error during registration:', error)
          clearTimeout(timeout)
          reject(error)
        }

        this.client!.once('telnyx.ready', readyHandler)
        this.client!.once('telnyx.error', errorHandler)
      })

      console.log('Telnyx WebRTC initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Telnyx WebRTC:', error)
      throw error
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return

    // Registration events
    this.client.on('telnyx.ready', () => {
      console.log('Telnyx client ready')
      this.emit('ready')
    })

    this.client.on('telnyx.error', (error) => {
      console.error('Telnyx error:', error)
      this.emit('error', error)
    })

    // Call events
    this.client.on('telnyx.notification', (notification) => {
      const call = notification.call

      if (!call) return

      switch (notification.type) {
        case 'callUpdate':
          this.handleCallUpdate(call)
          break
        case 'userMediaError':
          console.error('User media error:', notification.error)
          this.emit('mediaError', notification.error)
          break
      }
    })
  }

  private handleCallUpdate(call: any): void {
    const callState: TelnyxCallState = {
      id: call.id,
      state: call.state,
      direction: call.direction,
      from: call.from,
      to: call.to,
      startTime: call.startTime,
      endTime: call.endTime,
      duration: call.duration,
    }

    console.log('Call update:', callState)

    switch (call.state) {
      case 'new':
        if (call.direction === 'inbound') {
          this.emit('incomingCall', callState)
        }
        break
      case 'trying':
      case 'connecting':
        this.emit('connecting', callState)
        break
      case 'ringing':
        this.emit('ringing', callState)
        break
      case 'active':
        this.activeCall = call
        this.setupAudioStream(call)
        this.emit('connected', callState)
        break
      case 'held':
        this.emit('held', callState)
        break
      case 'hangup':
      case 'destroy':
        this.cleanupCall()
        this.emit('ended', callState)
        break
    }

    this.emit('stateChange', callState)
  }

  private setupAudioStream(call: any): void {
    if (!this.audioElement) return

    try {
      // Get the remote stream
      const remoteStream = call.remoteStream
      if (remoteStream) {
        this.audioElement.srcObject = remoteStream
        console.log('Audio stream connected')
      }
    } catch (error) {
      console.error('Failed to setup audio stream:', error)
    }
  }

  private cleanupCall(): void {
    this.activeCall = null
    if (this.audioElement) {
      this.audioElement.srcObject = null
    }
  }

  async makeCall(phoneNumber: string, callerIdNumber?: string): Promise<string> {
    if (!this.client) {
      throw new Error('Telnyx client not initialized')
    }

    try {
      const call = await this.client.newCall({
        destinationNumber: phoneNumber,
        callerNumber: callerIdNumber,
      })

      this.activeCall = call
      return call.id
    } catch (error) {
      console.error('Failed to make call:', error)
      throw error
    }
  }

  async answerCall(callId: string): Promise<void> {
    if (!this.activeCall || this.activeCall.id !== callId) {
      throw new Error('Call not found')
    }

    try {
      await this.activeCall.answer()
    } catch (error) {
      console.error('Failed to answer call:', error)
      throw error
    }
  }

  async hangupCall(): Promise<void> {
    if (!this.activeCall) {
      return
    }

    try {
      await this.activeCall.hangup()
    } catch (error) {
      console.error('Failed to hangup call:', error)
      throw error
    }
  }

  async toggleMute(): Promise<boolean> {
    if (!this.activeCall) {
      throw new Error('No active call')
    }

    try {
      if (this.activeCall.isMuted) {
        await this.activeCall.unmute()
        return false
      } else {
        await this.activeCall.mute()
        return true
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error)
      throw error
    }
  }

  async toggleHold(): Promise<boolean> {
    if (!this.activeCall) {
      throw new Error('No active call')
    }

    try {
      if (this.activeCall.state === 'held') {
        await this.activeCall.unhold()
        return false
      } else {
        await this.activeCall.hold()
        return true
      }
    } catch (error) {
      console.error('Failed to toggle hold:', error)
      throw error
    }
  }

  async sendDTMF(digit: string): Promise<void> {
    if (!this.activeCall) {
      throw new Error('No active call')
    }

    try {
      await this.activeCall.dtmf(digit)
    } catch (error) {
      console.error('Failed to send DTMF:', error)
      throw error
    }
  }

  disconnect(): void {
    if (this.activeCall) {
      this.hangupCall().catch(console.error)
    }

    if (this.client) {
      this.client.disconnect()
      this.client = null
    }

    this.cleanupCall()
    this.listeners.clear()
  }

  // Event emitter methods
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(...args))
    }
  }

  getActiveCall(): TelnyxCallState | null {
    if (!this.activeCall) return null

    return {
      id: this.activeCall.id,
      state: this.activeCall.state,
      direction: this.activeCall.direction,
      from: this.activeCall.from,
      to: this.activeCall.to,
      startTime: this.activeCall.startTime,
      endTime: this.activeCall.endTime,
      duration: this.activeCall.duration,
    }
  }

  isCallActive(): boolean {
    return this.activeCall !== null && 
           ['connecting', 'ringing', 'active', 'held'].includes(this.activeCall.state)
  }
}

// Export singleton instance with lazy initialization
let instance: TelnyxWebRTCService | null = null

export const telnyxWebRTC = {
  initialize: async (config: TelnyxWebRTCConfig) => {
    if (!instance) {
      instance = new TelnyxWebRTCService()
    }
    return instance.initialize(config)
  },
  makeCall: async (phoneNumber: string, callerIdNumber?: string) => {
    if (!instance) throw new Error('Service not initialized')
    return instance.makeCall(phoneNumber, callerIdNumber)
  },
  answerCall: async (callId: string) => {
    if (!instance) throw new Error('Service not initialized')
    return instance.answerCall(callId)
  },
  hangupCall: async () => {
    if (!instance) throw new Error('Service not initialized')
    return instance.hangupCall()
  },
  toggleMute: async () => {
    if (!instance) throw new Error('Service not initialized')
    return instance.toggleMute()
  },
  toggleHold: async () => {
    if (!instance) throw new Error('Service not initialized')
    return instance.toggleHold()
  },
  sendDTMF: async (digit: string) => {
    if (!instance) throw new Error('Service not initialized')
    return instance.sendDTMF(digit)
  },
  disconnect: () => {
    if (!instance) return
    instance.disconnect()
    instance = null
  },
  on: (event: string, callback: Function) => {
    if (!instance) {
      instance = new TelnyxWebRTCService()
    }
    return instance.on(event, callback)
  },
  off: (event: string, callback: Function) => {
    if (!instance) return
    return instance.off(event, callback)
  },
  getActiveCall: () => {
    if (!instance) return null
    return instance.getActiveCall()
  },
  isCallActive: () => {
    if (!instance) return false
    return instance.isCallActive()
  }
}