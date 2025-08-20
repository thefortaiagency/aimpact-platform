// Janus HTTP/WebSocket Hybrid Client
// This client uses HTTP API for session management and WebSocket for real-time events

import { EventEmitter } from 'events';

export interface JanusHttpConfig {
  httpServer: string;
  httpPort?: string;
  wsServer?: string;
  wsPort?: string;
  apiSecret?: string;
  iceServers?: RTCIceServer[];
  debug?: boolean;
}

export interface JanusSession {
  id: string;
  server: string;
}

export interface JanusPluginHandle {
  id: string;
  sessionId: string;
  plugin: string;
  send: (message: any) => Promise<void>;
  hangup: () => Promise<void>;
  detach: () => Promise<void>;
}

export class JanusHttpClient extends EventEmitter {
  private config: JanusHttpConfig;
  private session: JanusSession | null = null;
  private ws: WebSocket | null = null;
  private handles: Map<string, JanusPluginHandle> = new Map();
  private transactions: Map<string, (response: any) => void> = new Map();
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private longPollActive: boolean = false;
  private longPollAbortController: AbortController | null = null;

  constructor(config: JanusHttpConfig) {
    super();
    this.config = {
      httpPort: '8088',
      wsPort: '8989',
      ...config
    };
  }

  // Create session using HTTP API
  async createSession(): Promise<JanusSession> {
    const url = `${this.config.httpServer}:${this.config.httpPort}/janus`;
    const transaction = this.generateTransactionId();

    console.log('Creating Janus session via HTTP:', url);
    console.log('Using API secret:', this.config.apiSecret ? 'Yes' : 'No');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'create',
          transaction,
          apisecret: this.config.apiSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.janus !== 'success') {
        throw new Error(`Janus error: ${data.error?.reason || 'Unknown error'}`);
      }

      this.session = {
        id: data.data.id,
        server: this.config.httpServer,
      };

      console.log('Janus session created:', this.session.id);
      
      // Start HTTP long-polling for events instead of WebSocket
      this.startLongPolling();

      // Start keep-alive
      this.startKeepAlive();

      return this.session;
    } catch (error) {
      console.error('Failed to create Janus session:', error);
      throw error;
    }
  }

  // Start HTTP long-polling for events
  private startLongPolling(): void {
    if (!this.session || this.longPollActive) return;
    
    this.longPollActive = true;
    this.longPoll();
  }

  // HTTP long-polling implementation
  private async longPoll(): Promise<void> {
    if (!this.session || !this.longPollActive) return;

    const url = `${this.config.httpServer}:${this.config.httpPort}/janus/${this.session.id}`;
    const transaction = this.generateTransactionId();

    try {
      this.longPollAbortController = new AbortController();
      
      const response = await fetch(url + '?maxev=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.longPollAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Long poll failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle the event
      if (data.janus === 'event' && data.sender) {
        const handle = this.handles.get(data.sender);
        if (handle) {
          this.emit('plugin-event', {
            handle,
            data: data.plugindata?.data,
            jsep: data.jsep,
          });
        }
      } else {
        // Handle other message types
        this.handleMessage(data);
      }

      // Continue polling
      if (this.longPollActive) {
        setTimeout(() => this.longPoll(), 100);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Long polling aborted');
      } else {
        console.error('Long polling error:', error);
        // Retry after a delay
        if (this.longPollActive) {
          setTimeout(() => this.longPoll(), 5000);
        }
      }
    }
  }

  // Stop long-polling
  private stopLongPolling(): void {
    this.longPollActive = false;
    if (this.longPollAbortController) {
      this.longPollAbortController.abort();
      this.longPollAbortController = null;
    }
  }

  // Attach to a plugin using HTTP API
  async attachPlugin(plugin: string): Promise<JanusPluginHandle> {
    if (!this.session) throw new Error('No active session');

    const url = `${this.config.httpServer}:${this.config.httpPort}/janus/${this.session.id}`;
    const transaction = this.generateTransactionId();

    console.log('Attaching to plugin:', plugin);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'attach',
          plugin,
          transaction,
          apisecret: this.config.apiSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to attach plugin: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.janus !== 'success') {
        throw new Error(`Janus error: ${data.error?.reason || 'Unknown error'}`);
      }

      const handleId = data.data.id;
      
      const handle: JanusPluginHandle = {
        id: handleId,
        sessionId: this.session.id,
        plugin,
        send: (message: any) => this.sendMessage(handleId, message),
        hangup: () => this.hangup(handleId),
        detach: () => this.detach(handleId),
      };

      this.handles.set(handleId, handle);
      console.log(`Plugin ${plugin} attached with handle ${handleId}`);
      
      return handle;
    } catch (error) {
      console.error('Failed to attach plugin:', error);
      throw error;
    }
  }

  // Send message to plugin using HTTP API
  private async sendMessage(handleId: string, message: any): Promise<void> {
    if (!this.session) throw new Error('No active session');

    const url = `${this.config.httpServer}:${this.config.httpPort}/janus/${this.session.id}/${handleId}`;
    const transaction = this.generateTransactionId();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'message',
          transaction,
          body: message.body,
          jsep: message.jsep,
          apisecret: this.config.apiSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Message response:', data);
      
      // Handle response - emit event immediately for synchronous responses
      if (data.plugindata || data.jsep) {
        this.emit('plugin-event', {
          handle: this.handles.get(handleId),
          data: data.plugindata?.data,
          jsep: data.jsep,
        });
      }
      
      // Also handle any inline events
      if (data.janus === 'event') {
        this.handleMessage(data);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Send hangup request
  private async hangup(handleId: string): Promise<void> {
    await this.sendMessage(handleId, {
      body: { request: 'hangup' }
    });
  }

  // Detach from plugin
  private async detach(handleId: string): Promise<void> {
    if (!this.session) return;

    const url = `${this.config.httpServer}:${this.config.httpPort}/janus/${this.session.id}/${handleId}`;
    const transaction = this.generateTransactionId();

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'detach',
          transaction,
          apisecret: this.config.apiSecret,
        }),
      });

      this.handles.delete(handleId);
    } catch (error) {
      console.error('Failed to detach plugin:', error);
    }
  }

  // Handle messages from HTTP responses or long-polling
  private handleMessage(msg: any): void {
    console.log('Janus message:', msg);

    // Handle transaction responses
    if (msg.transaction && this.transactions.has(msg.transaction)) {
      const callback = this.transactions.get(msg.transaction)!;
      this.transactions.delete(msg.transaction);
      callback(msg);
      return;
    }

    // Handle events
    if (msg.janus === 'event' && msg.sender) {
      const handle = this.handles.get(msg.sender);
      if (handle) {
        this.emit('plugin-event', {
          handle,
          data: msg.plugindata?.data,
          jsep: msg.jsep,
        });
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
    }
  }

  // Keep session alive
  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(async () => {
      if (this.session) {
        try {
          const url = `${this.config.httpServer}:${this.config.httpPort}/janus/${this.session.id}`;
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              janus: 'keepalive',
              transaction: this.generateTransactionId(),
              apisecret: this.config.apiSecret,
            }),
          });
        } catch (error) {
          console.error('Keep-alive failed:', error);
        }
      }
    }, 30000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // Destroy session
  async destroy(): Promise<void> {
    this.stopKeepAlive();
    this.stopLongPolling();

    // Detach all handles
    const handles = Array.from(this.handles.values());
    for (const handle of handles) {
      await handle.detach();
    }

    // Destroy session
    if (this.session) {
      try {
        const url = `${this.config.httpServer}:${this.config.httpPort}/janus/${this.session.id}`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            janus: 'destroy',
            transaction: this.generateTransactionId(),
            apisecret: this.config.apiSecret,
          }),
        });
      } catch (error) {
        console.error('Failed to destroy session:', error);
      }
    }

    // Close WebSocket if any
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.session = null;
    this.handles.clear();
    this.transactions.clear();
  }

  private generateTransactionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Helper function to use either HTTP or WebSocket client based on connection success
export async function createJanusClient(config: JanusHttpConfig): Promise<JanusHttpClient | null> {
  const client = new JanusHttpClient(config);
  
  try {
    // Try HTTP API first
    await client.createSession();
    console.log('Successfully connected via HTTP API');
    return client;
  } catch (httpError) {
    console.error('HTTP API connection failed:', httpError);
    
    // You could fall back to pure WebSocket here if needed
    // For now, return null to indicate failure
    return null;
  }
}