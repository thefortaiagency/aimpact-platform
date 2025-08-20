// Janus Connection Manager - Handles both HTTP and WebSocket connections
import { JanusClient, JanusConfig, JanusPluginHandle } from './janus-client';
import { JanusHttpClient, JanusHttpConfig } from './janus-http-client';
import { JanusProxyClient } from './janus-proxy-client';
import { EventEmitter } from 'events';

export type ConnectionMode = 'websocket' | 'http' | 'proxy' | 'auto';

export interface JanusConnectionConfig {
  server: string;
  apiSecret?: string;
  mode?: ConnectionMode;
  httpPort?: string;
  wsPort?: string;
  iceServers?: RTCIceServer[];
  debug?: boolean;
}

export class JanusConnectionManager extends EventEmitter {
  private config: JanusConnectionConfig;
  private client: JanusClient | JanusHttpClient | JanusProxyClient | null = null;
  private connectionMode: 'websocket' | 'http' | 'proxy' | null = null;

  constructor(config: JanusConnectionConfig) {
    super();
    this.config = {
      mode: 'auto',
      httpPort: '8088',
      wsPort: '8989',
      ...config
    };
  }

  async connect(): Promise<void> {
    console.log('🚀 Janus Connection Manager starting...');
    console.log(`Mode: ${this.config.mode}`);

    if (this.config.mode === 'websocket') {
      return this.connectWebSocket();
    } else if (this.config.mode === 'http') {
      return this.connectHttp();
    } else if (this.config.mode === 'proxy') {
      return this.connectProxy();
    } else {
      // Auto mode - try proxy first (most reliable), then WebSocket, then direct HTTP
      try {
        await this.connectProxy();
      } catch (proxyError) {
        console.warn('Proxy connection failed, trying WebSocket...', proxyError);
        try {
          await this.connectWebSocket();
        } catch (wsError) {
          console.warn('WebSocket connection failed, trying direct HTTP...', wsError);
          await this.connectHttp();
        }
      }
    }
  }

  private async connectHttp(): Promise<void> {
    console.log('📡 Attempting HTTP API connection...');
    console.log(`Server: ${this.config.server}:${this.config.httpPort}`);
    
    const httpClient = new JanusHttpClient({
      httpServer: this.config.server,
      httpPort: this.config.httpPort,
      wsServer: this.config.server,
      wsPort: this.config.wsPort,
      apiSecret: this.config.apiSecret,
      iceServers: this.config.iceServers,
      debug: this.config.debug
    });

    // Forward events
    httpClient.on('error', (error) => this.emit('error', error));
    httpClient.on('disconnected', () => this.emit('disconnected'));
    httpClient.on('plugin-event', (event) => this.emit('plugin-event', event));
    httpClient.on('webrtcup', (event) => this.emit('webrtcup', event));
    httpClient.on('media', (event) => this.emit('media', event));
    httpClient.on('slowlink', (event) => this.emit('slowlink', event));
    httpClient.on('hangup', (event) => this.emit('hangup', event));

    try {
      await httpClient.createSession();
      this.client = httpClient;
      this.connectionMode = 'http';
      console.log('✅ Connected via HTTP API');
    } catch (error) {
      console.error('❌ HTTP connection failed:', error);
      throw error;
    }
  }

  private async connectWebSocket(): Promise<void> {
    console.log('🔌 Attempting WebSocket connection...');
    
    const wsClient = new JanusClient({
      server: this.config.server,
      apiSecret: this.config.apiSecret,
      iceServers: this.config.iceServers,
      debug: this.config.debug
    });

    // Forward events
    wsClient.on('error', (error) => this.emit('error', error));
    wsClient.on('disconnected', () => this.emit('disconnected'));
    wsClient.on('plugin-event', (event) => this.emit('plugin-event', event));
    wsClient.on('webrtcup', (event) => this.emit('webrtcup', event));
    wsClient.on('media', (event) => this.emit('media', event));
    wsClient.on('slowlink', (event) => this.emit('slowlink', event));
    wsClient.on('hangup', (event) => this.emit('hangup', event));

    try {
      await wsClient.connect();
      this.client = wsClient;
      this.connectionMode = 'websocket';
      console.log('✅ Connected via WebSocket');
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      throw error;
    }
  }

  async attachPlugin(plugin: string): Promise<JanusPluginHandle> {
    if (!this.client) {
      throw new Error('Not connected to Janus');
    }

    return this.client.attachPlugin(plugin);
  }

  getConnectionMode(): string | null {
    return this.connectionMode;
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  private async connectProxy(): Promise<void> {
    console.log('🌐 Attempting proxy connection...');
    
    const proxyClient = new JanusProxyClient({
      iceServers: this.config.iceServers,
      debug: this.config.debug
    });

    // Forward events
    proxyClient.on('error', (error) => this.emit('error', error));
    proxyClient.on('disconnected', () => this.emit('disconnected'));
    proxyClient.on('plugin-event', (event) => this.emit('plugin-event', event));
    proxyClient.on('webrtcup', (event) => this.emit('webrtcup', event));
    proxyClient.on('media', (event) => this.emit('media', event));
    proxyClient.on('slowlink', (event) => this.emit('slowlink', event));
    proxyClient.on('hangup', (event) => this.emit('hangup', event));

    try {
      await proxyClient.createSession();
      this.client = proxyClient;
      this.connectionMode = 'proxy';
      console.log('✅ Connected via proxy');
    } catch (error) {
      console.error('❌ Proxy connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      if (this.client instanceof JanusHttpClient || this.client instanceof JanusProxyClient) {
        await this.client.destroy();
      } else {
        this.client.disconnect();
      }
      this.client = null;
      this.connectionMode = null;
    }
  }

  // Convenience method to create and connect
  static async create(config: JanusConnectionConfig): Promise<JanusConnectionManager> {
    const manager = new JanusConnectionManager(config);
    await manager.connect();
    return manager;
  }
}

// Helper function to test connection before using
export async function testJanusConnection(config: JanusConnectionConfig): Promise<{
  httpAvailable: boolean;
  wsAvailable: boolean;
  recommendation: ConnectionMode;
}> {
  let httpAvailable = false;
  let wsAvailable = false;

  // Test HTTP
  try {
    const response = await fetch(`${config.server}:${config.httpPort || '8088'}/janus/info`);
    httpAvailable = response.ok;
  } catch (error) {
    httpAvailable = false;
  }

  // Test WebSocket (quick check)
  try {
    const ws = new WebSocket(`wss://${config.server.replace('https://', '')}:${config.wsPort || '8989'}`);
    await new Promise((resolve, reject) => {
      ws.onopen = () => {
        ws.close();
        resolve(true);
      };
      ws.onerror = () => reject(false);
      setTimeout(() => reject(false), 3000);
    });
    wsAvailable = true;
  } catch (error) {
    wsAvailable = false;
  }

  return {
    httpAvailable,
    wsAvailable,
    recommendation: httpAvailable ? 'http' : (wsAvailable ? 'websocket' : 'auto')
  };
}