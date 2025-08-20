// Janus HTTP Client that uses our Next.js proxy
// This avoids CORS and connectivity issues by routing through our server

import { EventEmitter } from 'events';
import { JanusPluginHandle } from './janus-http-client';

export interface JanusProxyConfig {
  proxyUrl?: string; // Defaults to /api/aimpact/webrtc/janus-proxy
  iceServers?: RTCIceServer[];
  debug?: boolean;
}

export interface JanusProxySession {
  id: string;
}

export interface JanusProxyPluginHandle {
  id: string;
  sessionId: string;
  plugin: string;
  send: (message: any) => Promise<void>;
  hangup: () => Promise<void>;
  detach: () => Promise<void>;
}

export class JanusProxyClient extends EventEmitter {
  private config: JanusProxyConfig;
  private session: JanusProxySession | null = null;
  private handles: Map<string, JanusProxyPluginHandle> = new Map();
  private longPollActive: boolean = false;
  private longPollAbortController: AbortController | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor(config: JanusProxyConfig = {}) {
    super();
    this.config = {
      proxyUrl: '/api/aimpact/webrtc/janus-proxy',
      ...config
    };
  }

  // Create session using proxy
  async createSession(): Promise<JanusProxySession> {
    const transaction = this.generateTransactionId();

    console.log('Creating Janus session via proxy...');

    try {
      const response = await fetch(this.config.proxyUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'create',
          transaction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create session: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      
      if (data.janus !== 'success') {
        throw new Error(`Janus error: ${data.error?.reason || 'Unknown error'}`);
      }

      this.session = {
        id: data.data.id,
      };

      console.log('Janus session created:', this.session.id);
      
      // Start long-polling for events
      this.startLongPolling();

      // Start keep-alive
      this.startKeepAlive();

      return this.session;
    } catch (error) {
      console.error('Failed to create Janus session:', error);
      throw error;
    }
  }

  // Attach to a plugin
  async attachPlugin(plugin: string): Promise<JanusProxyPluginHandle> {
    if (!this.session) throw new Error('No active session');

    const transaction = this.generateTransactionId();

    console.log('Attaching to plugin:', plugin);

    try {
      const response = await fetch(`${this.config.proxyUrl}?sessionId=${this.session.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'attach',
          plugin,
          transaction,
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
      
      const handle: JanusProxyPluginHandle = {
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

  // Send message to plugin
  private async sendMessage(handleId: string, message: any): Promise<void> {
    if (!this.session) throw new Error('No active session');

    const transaction = this.generateTransactionId();

    try {
      const response = await fetch(`${this.config.proxyUrl}?sessionId=${this.session.id}&handleId=${handleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'message',
          transaction,
          body: message.body,
          jsep: message.jsep,
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

  // Start HTTP long-polling for events
  private startLongPolling(): void {
    if (!this.session || this.longPollActive) return;
    
    this.longPollActive = true;
    this.longPoll();
  }

  // HTTP long-polling implementation
  private async longPoll(): Promise<void> {
    if (!this.session || !this.longPollActive) return;

    try {
      this.longPollAbortController = new AbortController();
      
      const response = await fetch(`${this.config.proxyUrl}?sessionId=${this.session.id}&maxev=1`, {
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

  // Handle messages
  private handleMessage(msg: any): void {
    console.log('Janus message:', msg);

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

  // Send hangup request
  private async hangup(handleId: string): Promise<void> {
    await this.sendMessage(handleId, {
      body: { request: 'hangup' }
    });
  }

  // Detach from plugin
  private async detach(handleId: string): Promise<void> {
    if (!this.session) return;

    const transaction = this.generateTransactionId();

    try {
      await fetch(`${this.config.proxyUrl}?sessionId=${this.session.id}&handleId=${handleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          janus: 'detach',
          transaction,
        }),
      });

      this.handles.delete(handleId);
    } catch (error) {
      console.error('Failed to detach plugin:', error);
    }
  }

  // Keep session alive
  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(async () => {
      if (this.session) {
        try {
          await fetch(`${this.config.proxyUrl}?sessionId=${this.session.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              janus: 'keepalive',
              transaction: this.generateTransactionId(),
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
        await fetch(`${this.config.proxyUrl}?sessionId=${this.session.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            janus: 'destroy',
            transaction: this.generateTransactionId(),
          }),
        });
      } catch (error) {
        console.error('Failed to destroy session:', error);
      }
    }

    this.session = null;
    this.handles.clear();
  }

  private generateTransactionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Test proxy connectivity
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/aimpact/webrtc/janus-proxy', {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Proxy test failed:', error);
      return false;
    }
  }
}