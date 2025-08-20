// Janus WebRTC Gateway Configuration
export const JANUS_CONFIG = {
  // Primary HTTPS endpoint (confirmed working)
  server: 'https://webrtc.aimpactnexus.ai:8089/janus',
  
  apiSecret: process.env.JANUS_API_SECRET || '', // Currently disabled on server
  debug: true, // Enable debug for troubleshooting
  
  // ICE servers for WebRTC connectivity
  iceServers: [
    { urls: 'stun:webrtc.aimpactnexus.ai:3478' }, // Primary STUN server
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Validate required configuration
export function validateJanusConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!JANUS_CONFIG.server) {
    errors.push('JANUS_SERVER environment variable is not set');
  }
  
  // API secret is currently disabled on server, so don't require it
  // if (!JANUS_CONFIG.apiSecret) {
  //   errors.push('JANUS_API_SECRET environment variable is not set');
  // }
  
  return {
    valid: errors.length === 0,
    errors
  };
}