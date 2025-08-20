// Simple test to find the correct Janus endpoints

export async function testJanusConnections() {
  console.log('🔍 Testing Janus connection methods...\n');
  
  // Test various WebSocket endpoints
  const wsEndpoints = [
    'wss://webrtc.aimpactnexus.ai:8989',
    'wss://webrtc.aimpactnexus.ai:8989/',
    'wss://webrtc.aimpactnexus.ai:8989/janus',
    'wss://webrtc.aimpactnexus.ai:8989/ws',
    'wss://webrtc.aimpactnexus.ai:8989/websocket',
    'wss://webrtc.aimpactnexus.ai/ws',
    'wss://webrtc.aimpactnexus.ai/websocket',
  ];
  
  for (const endpoint of wsEndpoints) {
    await testWebSocket(endpoint);
  }
  
  // Test HTTP endpoints
  const httpEndpoints = [
    'https://webrtc.aimpactnexus.ai/janus/info',
    'https://webrtc.aimpactnexus.ai/janus',
    'https://webrtc.aimpactnexus.ai/admin/info',
    'http://webrtc.aimpactnexus.ai:8088/janus/info',
  ];
  
  console.log('\n🔍 Testing HTTP endpoints...\n');
  
  for (const endpoint of httpEndpoints) {
    await testHttp(endpoint);
  }
}

async function testWebSocket(endpoint: string): Promise<void> {
  return new Promise((resolve) => {
    console.log(`Testing WebSocket: ${endpoint}`);
    
    try {
      const ws = new WebSocket(endpoint);
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.log(`  ⏱️ Timeout\n`);
          ws.close();
          resolved = true;
          resolve();
        }
      }, 3000);
      
      ws.onopen = () => {
        console.log(`  ✅ Connected! Sending test message...`);
        ws.send(JSON.stringify({
          janus: 'ping',
          transaction: 'test-' + Date.now()
        }));
      };
      
      ws.onmessage = (event) => {
        console.log(`  📥 Response: ${event.data}\n`);
        clearTimeout(timeout);
        ws.close();
        resolved = true;
        resolve();
      };
      
      ws.onerror = () => {
        console.log(`  ❌ Connection error\n`);
        clearTimeout(timeout);
        resolved = true;
        resolve();
      };
      
      ws.onclose = (event) => {
        if (!resolved) {
          console.log(`  🔌 Closed: ${event.code} ${event.reason || '(no reason)'}\n`);
          clearTimeout(timeout);
          resolved = true;
          resolve();
        }
      };
    } catch (error) {
      console.log(`  ❌ Exception: ${error}\n`);
      resolve();
    }
  });
}

async function testHttp(endpoint: string): Promise<void> {
  console.log(`Testing HTTP: ${endpoint}`);
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log(`  Response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Success! Server: ${data.name || 'Unknown'} v${data.version_string || '?'}\n`);
    } else {
      console.log(`  ❌ Failed\n`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  (window as any).testJanusConnections = testJanusConnections;
}