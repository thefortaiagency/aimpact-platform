import { EventEmitter } from 'events';

interface JanusConfig {
  httpServer: string;
  wsServer?: string;
  apiSecret?: string;
  debug?: boolean;
  iceServers?: RTCIceServer[];
}

export class JanusHybridClient extends EventEmitter {
  private config: JanusConfig;
  private sessionId: string | null = null;
  private ws: WebSocket | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  
  constructor(config: JanusConfig) {
    super();
    this.config = config;
  }
  
  async connect(): Promise<void> {
    console.log('🔄 Using hybrid connection approach...');
    
    // First, create session via HTTPS API (which we know works)
    await this.createSessionViaHttp();
    
    // Then try WebSocket for real-time events (optional)
    if (this.config.wsServer) {
      this.tryWebSocketConnection();
    }
  }
  
  private async createSessionViaHttp(): Promise<void> {
    const transaction = this.generateTransactionId();
    
    try {
      console.log('📡 Creating session via HTTPS API...');
      const response = await fetch(`${this.config.httpServer}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'create',
          transaction,
          // apisecret: this.config.apiSecret // Currently disabled
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.janus === 'success' && data.data?.id) {
        this.sessionId = data.data.id;
        console.log('✅ Session created:', this.sessionId);
        this.startKeepAlive();
        this.emit('connected');
      } else {
        throw new Error(`Failed to create session: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw error;
    }
  }
  
  private tryWebSocketConnection(): void {
    if (!this.config.wsServer) return;
    
    console.log('🔌 Attempting WebSocket connection for real-time events...');
    
    try {
      this.ws = new WebSocket(this.config.wsServer);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected for real-time events');
        // Optionally claim the session
        if (this.sessionId) {
          this.ws?.send(JSON.stringify({
            janus: 'claim',
            session_id: this.sessionId,
            transaction: this.generateTransactionId()
          }));
        }
      };
      
      this.ws.onerror = (error) => {
        console.warn('⚠️ WebSocket error (falling back to HTTP polling):', error);
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket closed, continuing with HTTP only');
        this.ws = null;
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };
    } catch (error) {
      console.warn('⚠️ WebSocket not available, using HTTP only');
    }
  }
  
  async attachPlugin(plugin: string): Promise<any> {
    if (!this.sessionId) throw new Error('No session');
    
    const transaction = this.generateTransactionId();
    
    const response = await fetch(`${this.config.httpServer}/${this.sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        janus: 'attach',
        plugin,
        transaction
      })
    });
    
    const data = await response.json();
    if (data.janus === 'success' && data.data?.id) {
      console.log(`✅ Attached to ${plugin}, handle:`, data.data.id);
      return {
        id: data.data.id,
        send: (message: any) => this.sendPluginMessage(data.data.id, message),
        hangup: () => this.hangup(data.data.id),
        detach: () => this.detach(data.data.id)
      };
    }
    
    throw new Error(`Failed to attach plugin: ${JSON.stringify(data)}`);
  }
  
  private async sendPluginMessage(handleId: string, message: any): Promise<void> {
    if (!this.sessionId) throw new Error('No session');
    
    const response = await fetch(`${this.config.httpServer}/${this.sessionId}/${handleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...message,
        transaction: message.transaction || this.generateTransactionId()
      })
    });
    
    const data = await response.json();
    this.handleMessage(data);
  }
  
  private handleMessage(data: any): void {
    if (this.config.debug) {
      console.log('📥 Janus message:', data);
    }
    
    if (data.plugindata) {
      this.emit('plugin-event', data);
    }
  }
  
  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(async () => {
      if (!this.sessionId) return;
      
      try {
        const response = await fetch(`${this.config.httpServer}/${this.sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            janus: 'keepalive',
            transaction: this.generateTransactionId()
          })
        });
        
        if (!response.ok) {
          console.error('Keep-alive failed');
        }
      } catch (error) {
        console.error('Keep-alive error:', error);
      }
    }, 25000);
  }
  
  private generateTransactionId(): string {
    return Math.random().toString(36).substr(2, 12);
  }
  
  async disconnect(): Promise<void> {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.sessionId) {
      await fetch(`${this.config.httpServer}/${this.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'destroy',
          transaction: this.generateTransactionId()
        })
      });
    }
  }
  
  private async hangup(handleId: string): Promise<void> {
    await this.sendPluginMessage(handleId, {
      janus: 'hangup',
      transaction: this.generateTransactionId()
    });
  }
  
  private async detach(handleId: string): Promise<void> {
    if (!this.sessionId) return;
    
    await fetch(`${this.config.httpServer}/${this.sessionId}/${handleId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        janus: 'detach',
        transaction: this.generateTransactionId()
      })
    });
  }
}