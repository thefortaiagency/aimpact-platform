// Utility to resolve WHEP endpoint from Red5Pro Stream Manager API
// Returns the resolved endpoint URL or throws on error

export async function resolveWHEPEndpoint({
  streamName,
  nodeGroup,
  baseUrl
}: {
  streamName: string;
  nodeGroup: string;
  baseUrl: string;
}): Promise<string> {
  // Example: https://<stream-manager-host>/streammanager/api/4.0/event/live/{streamName}?nodeGroup={nodeGroup}
  const url = `${baseUrl.replace(/\/$/, '')}/streammanager/api/4.0/event/live/${encodeURIComponent(streamName)}?nodeGroup=${encodeURIComponent(nodeGroup)}`;
  
  console.log(`Attempting to resolve WHEP endpoint from: ${url}`); // Added for debugging

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const errorText = await res.text(); // Try to get more error details
    console.error(`Stream Manager API request failed: ${res.status} ${res.statusText}`, errorText); // Added for debugging
    throw new Error(`Failed to resolve WHEP endpoint: ${res.status} ${res.statusText}. Response: ${errorText}`);
  }
  
  const data = await res.json();
  console.log("Stream Manager response data:", data); // Added for debugging

  if (data.whepUrl) {
    if (typeof data.whepUrl === 'string' && (data.whepUrl.startsWith('http://') || data.whepUrl.startsWith('https://') || data.whepUrl.startsWith('ws://') || data.whepUrl.startsWith('wss://'))) {
      return data.whepUrl;
    } else {
      console.error("Stream Manager returned invalid whepUrl format:", data.whepUrl); // Added for debugging
      throw new Error(`Stream Manager returned invalid whepUrl format: ${data.whepUrl}`);
    }
  }
  
  // If data.serverAddress was previously used and might be relevant, log it for diagnosis
  if (data.serverAddress) {
    console.warn(`Stream Manager response contained serverAddress (${data.serverAddress}) but not a valid whepUrl.`); // Added for debugging
  }
  
  throw new Error('Expected whepUrl not found in Stream Manager response');
}
