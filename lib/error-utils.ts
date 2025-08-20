/**
 * Safely extracts an error message from event data
 * @param eventData The event data object that might contain a message
 * @returns A string with the message or 'Unknown error'
 */
export function safeExtractErrorMessage(eventData: any): string {
  if (!eventData) return 'Unknown error';
  
  try {
    // Check if message is directly accessible
    if (typeof eventData.message === 'string') {
      return eventData.message;
    }
    
    // Try to extract a useful message from the object
    if (typeof eventData.code === 'number' || typeof eventData.code === 'string') {
      return `Error code: ${eventData.code}`;
    }
    
    if (typeof eventData.name === 'string') {
      return `Error type: ${eventData.name}`;
    }
    
    // For simplicity, just show a generic message
    return 'Connection error occurred';
  } catch (err) {
    return 'Unknown error';
  }
}

/**
 * Safely stringify objects that might contain circular references
 * @param obj Any object to stringify
 * @returns Safely stringified representation or error message
 */
export function safeStringify(obj: any): string {
  if (!obj) return 'null';
  
  try {
    // Handle primitives
    if (typeof obj !== 'object') {
      return String(obj);
    }
    
    // Create a clean object with only simple properties
    const simplifiedObj: Record<string, any> = {};
    
    // Only include stringifiable properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Skip functions, DOM nodes, and other complex objects
        if (typeof value === 'function') {
          simplifiedObj[key] = '[Function]';
        } else if (value instanceof Node) {
          simplifiedObj[key] = `[${value.nodeName || 'DOM Node'}]`;
        } else if (value instanceof MediaStream) {
          simplifiedObj[key] = '[MediaStream]';
        } else if (typeof value !== 'object' || value === null) {
          simplifiedObj[key] = value;
        } else {
          // For objects, try to include some simple properties but prevent recursion
          simplifiedObj[key] = '[Object]';
        }
      }
    }
    
    return JSON.stringify(simplifiedObj);
  } catch (err) {
    return '[Object cannot be stringified]';
  }
}

/**
 * Tests connectivity to a server URL with various methods and returns 
 * diagnostic information about which connection methods work
 * 
 * @param url The server URL to test
 * @param timeoutMs Timeout in milliseconds for each test
 * @returns An object with diagnostic information
 */
export async function testServerConnectivity(url: string, timeoutMs = 3000): Promise<{
  reachable: boolean;
  methods: {
    name: string;
    success: boolean;
    error?: string;
  }[];
  summary: string;
}> {
  const methods = [
    { name: 'HEAD (no-cors)', options: { method: 'HEAD', mode: 'no-cors' as RequestMode } },
    { name: 'GET (no-cors)', options: { method: 'GET', mode: 'no-cors' as RequestMode } },
    { name: 'OPTIONS (cors)', options: { method: 'OPTIONS', mode: 'cors' as RequestMode } },
    { name: 'GET (cors)', options: { method: 'GET', mode: 'cors' as RequestMode } },
  ];
  
  const results = [];
  
  for (const method of methods) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      // Attempt fetch
      await fetch(url, {
        ...method.options,
        signal: controller.signal,
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // If we got here without error, it's a success
      results.push({ name: method.name, success: true });
    } catch (e) {
      const error = e as Error;
      results.push({ 
        name: method.name, 
        success: false, 
        error: error.name === 'AbortError' ? `Timeout (${timeoutMs}ms)` : error.message 
      });
    }
  }
  
  const reachable = results.some(r => r.success);
  let summary = '';
  
  if (reachable) {
    const successful = results.filter(r => r.success).map(r => r.name);
    summary = `Server reachable using: ${successful.join(', ')}`;
  } else {
    summary = 'Server unreachable with all methods tried';
  }
  
  return {
    reachable,
    methods: results,
    summary
  };
}
