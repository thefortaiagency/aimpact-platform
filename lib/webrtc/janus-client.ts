// Janus WebRTC Client for AImpact Phone System
class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

export interface JanusConfig {
  server: string;
  apiSecret?: string;
  iceServers?: RTCIceServer[];
  debug?: boolean;
}

export interface JanusPluginHandle {
  id: string;
  plugin: string;
  send: (message: any) => Promise<void>;
  hangup: () => Promise<void>;
  detach: () => Promise<void>;
}

export class JanusClient extends EventEmitter {
  private sessionId: string | null = null;
  private handles: Map<string, JanusPluginHandle> = new Map();
  private transactions: Map<string, (response: any) => void> = new Map();
  private config: JanusConfig;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private connected: boolean = false;
  private baseUrl: string = '';

  constructor(config: JanusConfig) {
    super();
    this.config = config;
    // Use HTTPS endpoint
    this.baseUrl = 'https://webrtc.aimpactnexus.ai:8089/janus';
  }

  async connect(): Promise<void> {
    console.log('🔌 Connecting to Janus via HTTPS:', this.baseUrl);
    
    try {
      // Create session
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'create',
          transaction: this.generateTransactionId(),
          apisecret: this.config.apiSecret
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Session response:', data);

      if (data.janus === 'success' && data.data?.id) {
        this.sessionId = data.data.id;
        this.connected = true;
        console.log('✅ Janus session created:', this.sessionId);
        
        // Start keep-alive
        this.startKeepAlive();
        
        // Start long polling for events
        this.startLongPolling();
        
        this.emit('connected');
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('❌ Failed to connect to Janus:', error);
      throw error;
    }
  }

  async attachPlugin(plugin: string): Promise<JanusPluginHandle> {
    if (!this.sessionId || !this.connected) {
      throw new Error('No active session');
    }

    const transaction = this.generateTransactionId();

    try {
      const response = await fetch(`${this.baseUrl}/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'attach',
          plugin,
          transaction,
          apisecret: this.config.apiSecret
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Plugin attach response:', data);

      if (data.janus === 'success' && data.data?.id) {
        const handleId = data.data.id;

        const handle: JanusPluginHandle = {
          id: handleId,
          plugin,
          send: async (message: any) => this.sendMessage(handleId, message),
          hangup: async () => this.hangup(handleId),
          detach: async () => this.detach(handleId)
        };

        this.handles.set(handleId, handle);
        console.log(`✅ Plugin ${plugin} attached with handle ${handleId}`);
        return handle;
      } else {
        throw new Error('Failed to attach plugin');
      }
    } catch (error) {
      console.error('Failed to attach plugin:', error);
      throw error;
    }
  }

  private async sendMessage(handleId: string, message: any): Promise<void> {
    if (!this.sessionId || !this.connected) {
      throw new Error('No active session');
    }

    const transaction = this.generateTransactionId();

    try {
      const response = await fetch(`${this.baseUrl}/${this.sessionId}/${handleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'message',
          body: message.body,
          jsep: message.jsep,
          transaction,
          apisecret: this.config.apiSecret
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Message response:', data);
      
      // Handle the response
      this.handleMessage(data);
      
      // Also handle any transaction callbacks
      if (data.transaction && this.transactions.has(data.transaction)) {
        const callback = this.transactions.get(data.transaction)!;
        this.transactions.delete(data.transaction);
        callback(data);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  private async hangup(handleId: string): Promise<void> {
    await this.sendMessage(handleId, {
      body: { request: 'hangup' }
    });
  }

  private async detach(handleId: string): Promise<void> {
    if (!this.sessionId || !this.connected) return;

    try {
      const response = await fetch(`${this.baseUrl}/${this.sessionId}/${handleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'detach',
          transaction: this.generateTransactionId(),
          apisecret: this.config.apiSecret
        })
      });

      if (response.ok) {
        this.handles.delete(handleId);
        console.log(`Handle ${handleId} detached`);
      }
    } catch (error) {
      console.error('Failed to detach handle:', error);
    }
  }

  private startLongPolling(): void {
    const poll = async () => {
      if (!this.connected || !this.sessionId) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        const response = await fetch(`${this.baseUrl}/${this.sessionId}?maxev=5`, {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const events = await response.json();
          if (Array.isArray(events)) {
            events.forEach(event => this.handleMessage(event));
          } else if (events) {
            this.handleMessage(events);
          }
        }
      } catch (error) {
        // Only log non-timeout errors
        if (error.name !== 'AbortError' && !error.message?.includes('timed out')) {
          console.error('Polling error:', error);
        }
      }

      // Continue polling with a small delay
      if (this.connected) {
        setTimeout(poll, 500);
      }
    };

    poll();
  }

  private handleMessage(msg: any): void {
    console.log('Janus message:', msg);

    // Handle events
    if (msg.janus === 'event' && msg.sender) {
      const handle = this.handles.get(msg.sender);
      if (handle) {
        this.emit('plugin-event', {
          handle,
          data: msg.plugindata?.data,
          jsep: msg.jsep
        });
      }
    }

    // Handle success responses with plugin data
    if (msg.janus === 'success' && msg.plugindata) {
      if (msg.sender) {
        const handle = this.handles.get(msg.sender);
        if (handle) {
          this.emit('plugin-event', {
            handle,
            data: msg.plugindata.data,
            jsep: msg.jsep
          });
        }
      }
    }

    // Handle other message types
    switch (msg.janus) {
      case 'webrtcup':
        this.emit('webrtcup', msg);
        break;
      case 'media':
        this.emit('media', msg);
        break;
      case 'slowlink':
        this.emit('slowlink', msg);
        break;
      case 'hangup':
        this.emit('hangup', msg);
        break;
      case 'error':
        console.error('Janus error:', msg.error);
        this.emit('error', msg.error);
        break;
    }
  }

  private generateTransactionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(async () => {
      if (this.sessionId && this.connected) {
        try {
          await fetch(`${this.baseUrl}/${this.sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              janus: 'keepalive',
              transaction: this.generateTransactionId(),
              apisecret: this.config.apiSecret
            })
          });
        } catch (error) {
          console.error('Keep-alive error:', error);
        }
      }
    }, 25000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.stopKeepAlive();

    // Detach all handles
    this.handles.forEach((handle) => handle.detach());

    // Destroy session
    if (this.sessionId) {
      fetch(`${this.baseUrl}/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'destroy',
          transaction: this.generateTransactionId(),
          apisecret: this.config.apiSecret
        })
      }).catch(error => console.error('Failed to destroy session:', error));
    }

    this.sessionId = null;
    this.handles.clear();
    this.transactions.clear();
  }
}

// SIP Plugin specific functions
export async function registerSIP(handle: JanusPluginHandle, sipConfig: any): Promise<void> {
  return new Promise((resolve, reject) => {
    handle.send({
      body: {
        request: 'register',
        username: sipConfig.username,
        authuser: sipConfig.authuser,
        displayname: sipConfig.displayname,
        secret: sipConfig.password,
        proxy: sipConfig.proxy
      }
    }).then(() => {
      // Listen for registration response
      setTimeout(resolve, 1000); // Simplified - in production, wait for actual response
    }).catch(reject);
  });
}

export async function makeCall(handle: JanusPluginHandle, uri: string): Promise<void> {
  await handle.send({
    body: {
      request: 'call',
      uri
    }
  });
}