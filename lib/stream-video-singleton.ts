import { StreamVideoClient } from '@stream-io/video-react-sdk';

class StreamVideoManager {
  private static instance: StreamVideoManager;
  private client: StreamVideoClient | null = null;
  private isConnecting = false;

  private constructor() {}

  static getInstance(): StreamVideoManager {
    if (!StreamVideoManager.instance) {
      StreamVideoManager.instance = new StreamVideoManager();
    }
    return StreamVideoManager.instance;
  }

  async getClient(
    apiKey: string,
    user: { id: string; name: string; image?: string },
    token: string
  ): Promise<StreamVideoClient> {
    // If we already have a connected client with same user, return it
    if (this.client && this.client.user?.id === user.id) {
      console.log('✅ Returning existing StreamVideoClient');
      return this.client;
    }

    // If connecting, wait
    if (this.isConnecting) {
      console.log('⏳ Already connecting, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getClient(apiKey, user, token);
    }

    // Disconnect old client if exists
    if (this.client) {
      console.log('🔄 Disconnecting old client');
      await this.disconnect();
    }

    try {
      this.isConnecting = true;
      console.log('🎥 Creating new StreamVideoClient');
      
      this.client = new StreamVideoClient({
        apiKey,
        user,
        token,
        options: {
          logLevel: 'warn',
        },
      });

      console.log('✅ StreamVideoClient created successfully');
      return this.client;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnectUser();
        this.client = null;
        console.log('✅ StreamVideoClient disconnected');
      } catch (error) {
        console.error('Error disconnecting StreamVideoClient:', error);
      }
    }
  }

  getCurrentClient(): StreamVideoClient | null {
    return this.client;
  }

  // Alias for backward compatibility
  async getOrCreateClient(
    options: { apiKey: string; user: { id: string; name: string; image?: string }; token: string }
  ): Promise<StreamVideoClient> {
    return this.getClient(options.apiKey, options.user, options.token);
  }
}

export const streamVideoManager = StreamVideoManager.getInstance();