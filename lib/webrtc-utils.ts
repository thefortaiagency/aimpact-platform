/**
 * WebRTC utilities for simplified streaming and diagnostics
 * Enhanced with tools to diagnose and fix 405 Method Not Allowed errors
 */

export interface WebRTCDiagnosticResults {
  browserSupport: {
    supported: boolean;
    rtcPeerConnection: boolean;
    mediaDevices: boolean;
  };
  networkConnectivity: {
    stunConnectivity: boolean;
    turnConnectivity?: boolean;
    error?: string;
  };
  serverConnectivity: {
    reachable: boolean;
    allowsWebRTC: boolean;
    error?: string;
  };
  recommendations: string[];
}

/**
 * Create a WebRTC peer connection with standard configuration
 * @returns A new RTCPeerConnection
 */
export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun1.l.google.com:19302" }, 
      { urls: "stun:stun2.l.google.com:19302" }
    ],
    iceCandidatePoolSize: 10,
  })
}

/**
 * Create a WebRTC peer connection with optimized configuration for Red5Pro
 * Specifically addresses 405 errors by using more resilient settings
 * @returns A new RTCPeerConnection with optimized settings
 */
export function createOptimizedPeerConnection(preferTcp = true): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun1.l.google.com:19302" }, 
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" }, 
      { urls: "stun:stun4.l.google.com:19302" }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: preferTcp ? 'relay' : 'all'
    // sdpSemantics is not part of standard RTCConfiguration in TypeScript defs
  })
}

/**
 * Get user media with standard constraints
 * @param videoEnabled Whether video should be enabled
 * @param audioEnabled Whether audio should be enabled
 * @returns A promise that resolves to a MediaStream
 */
export async function getUserMedia(videoEnabled = true, audioEnabled = true): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: videoEnabled
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        }
      : false,
    audio: audioEnabled
      ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : false,
  }

  return navigator.mediaDevices.getUserMedia(constraints)
}

/**
 * Add tracks from a media stream to a peer connection
 * @param pc The peer connection
 * @param stream The media stream
 */
export function addTracksToConnection(pc: RTCPeerConnection, stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream)
  })
}

/**
 * Create and set a local description for a peer connection
 * @param pc The peer connection
 * @param offerOptions Options for the offer
 * @returns A promise that resolves when the local description is set
 */
export async function createAndSetLocalDescription(
  pc: RTCPeerConnection,
  offerOptions: RTCOfferOptions = {},
): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer(offerOptions)
  await pc.setLocalDescription(offer)
  return offer
}

/**
 * Set up standard event handlers for a peer connection
 * @param pc The peer connection
 * @param onIceCandidate Callback for ICE candidate events
 * @param onConnectionStateChange Callback for connection state change events
 * @param onTrack Callback for track events
 */
export function setupPeerConnectionEventHandlers(
  pc: RTCPeerConnection,
  onIceCandidate?: (candidate: RTCIceCandidate) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void,
  onTrack?: (track: MediaStreamTrack, streams: readonly MediaStream[]) => void,
): void {
  if (onIceCandidate) {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate)
      }
    }
  }

  if (onConnectionStateChange) {
    pc.onconnectionstatechange = () => {
      onConnectionStateChange(pc.connectionState)
    }
  }

  if (onTrack) {
    pc.ontrack = (event) => {
      onTrack(event.track, event.streams)
    }
  }
}

/**
 * Helper to safely stringify objects for debugging
 * @param obj The object to stringify
 * @returns A string representation of the object
 */
export function safeStringify(obj: any): string {
  try {
    // Create a safe copy of the object without circular references
    const getCircularReplacer = () => {
      const seen = new WeakSet()
      return (key: string, value: any) => {
        // Skip DOM nodes and React elements
        if (key === "current" && (value instanceof Element || value instanceof HTMLElement)) {
          return "[DOM Element]"
        }
        if (value instanceof Element || value instanceof HTMLElement) {
          return "[DOM Element]"
        }
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular Reference]"
          }
          seen.add(value)
        }
        return value
      }
    }

    return JSON.stringify(obj, getCircularReplacer(), 2)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `[Error stringifying object: ${errorMessage}]`
  }
}

/**
 * Replace a media track in an active WebRTC session
 * @param publisher The Red5 Pro publisher instance with getPeerConnection method
 * @param track The new track to replace with, or null to remove the track
 * @param kind The kind of track to replace ('audio' or 'video')
 * @param logCallback Optional callback for logging
 * @returns A promise that resolves to true if successful, false otherwise
 */
export async function replaceMediaTrack(
  publisher: any,
  track: MediaStreamTrack | null,
  kind: "audio" | "video",
  logCallback?: (message: string) => void,
): Promise<boolean> {
  if (!publisher || !publisher.getPeerConnection) {
    logCallback?.("Cannot replace track: publisher or getPeerConnection method not available")
    return false
  }

  try {
    const peerConnection = publisher.getPeerConnection()
    if (!peerConnection) {
      logCallback?.("Cannot replace track: peer connection not available")
      return false
    }

    const sender = peerConnection.getSenders().find((s: RTCRtpSender) => s.track?.kind === kind)
    if (!sender) {
      logCallback?.(`Could not find ${kind} sender to replace track`)
      return false
    }

    await sender.replaceTrack(track)
    logCallback?.(`${kind} track ${track ? "replaced/added" : "removed"} successfully`)
    return true
  } catch (err: any) {
    logCallback?.(`Error replacing ${kind} track: ${err.message}`)
    return false
  }
}

/**
 * Test if the browser supports WebRTC properly
 */
export function checkWebRTCSupport(): { supported: boolean; details: Record<string, boolean>; } {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      details: {
        'window': false,
      }
    };
  }
  
  const details: Record<string, boolean> = {
    'RTCPeerConnection': 'RTCPeerConnection' in window,
    'getUserMedia': !!(navigator?.mediaDevices?.getUserMedia),
    'webkitRTCPeerConnection': 'webkitRTCPeerConnection' in window,
    'mozRTCPeerConnection': 'mozRTCPeerConnection' in window,
  };
  
  return {
    supported: details['RTCPeerConnection'] && details['getUserMedia'],
    details
  };
}

/**
 * Test connectivity to STUN servers using WebRTC
 * @param stunServer Optional STUN server to test against
 */
export async function testSTUNConnectivity(stunServer = 'stun:stun.l.google.com:19302'): Promise<boolean> {
  if (typeof window === 'undefined' || !('RTCPeerConnection' in window)) {
    return false;
  }
  
  return new Promise<boolean>((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunServer }]
      });
      
      // Create a data channel to trigger ICE gathering
      pc.createDataChannel('test');
      
      // Set a timeout in case ICE gathering never completes
      const timeout = setTimeout(() => {
        pc.close();
        resolve(false);
      }, 5000);
      
      // Listen for ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // If we get a candidate, the STUN server is working
          if (event.candidate.candidate.includes('typ srflx')) {
            clearTimeout(timeout);
            pc.close();
            resolve(true);
          }
        } else if (event.candidate === null) {
          // ICE gathering completed without finding a srflx candidate
          clearTimeout(timeout);
          pc.close();
          resolve(false);
        }
      };
      
      // Start ICE gathering
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => {
          clearTimeout(timeout);
          pc.close();
          resolve(false);
        });
    } catch (e) {
      console.error('Error testing STUN connectivity:', e);
      resolve(false);
    }
  });
}

/**
 * Run a full diagnostic on WebRTC connectivity
 * to help identify issues with 405 errors
 */
export async function runWebRTCDiagnostics(): Promise<WebRTCDiagnosticResults> {
  const support = checkWebRTCSupport();
  const recommendations: string[] = [];
  
  // Start with browser support
  const browserSupport = {
    supported: support.supported,
    rtcPeerConnection: support.details['RTCPeerConnection'],
    mediaDevices: support.details['getUserMedia'],
  };
  
  if (!browserSupport.supported) {
    recommendations.push('Use a WebRTC compatible browser like Chrome, Firefox, Safari, or Edge');
  }
  
  // Test STUN connectivity for NAT traversal
  const stunConnectivity = await testSTUNConnectivity().catch(() => false);
  
  const networkConnectivity = {
    stunConnectivity,
  };
  
  if (!stunConnectivity) {
    recommendations.push('Check if your firewall allows WebRTC (UDP ports)');
    recommendations.push('Try connecting from a different network');
    networkConnectivity.error = 'Cannot connect to STUN server, NAT traversal might be blocked';
  }
  
  // For the server connectivity, we'll use a simple heuristic based on previous tests
  const serverConnectivity = {
    reachable: true,  // Assuming reachable by default
    allowsWebRTC: stunConnectivity,  // If STUN works, WebRTC might work
  };
  
  // Add specific recommendations for 405 Method Not Allowed errors
  if (stunConnectivity && browserSupport.supported) {
    recommendations.push('If encountering 405 Method Not Allowed errors:');
    recommendations.push('- Check that the server\'s CORS settings allow POST requests');
    recommendations.push('- Ensure the WebRTC endpoints are properly configured');
    recommendations.push('- Try alternative transport settings (TCP instead of UDP)');
    recommendations.push('- Verify that the stream exists on the server');
  }
  
  return {
    browserSupport,
    networkConnectivity,
    serverConnectivity,
    recommendations
  };
}
