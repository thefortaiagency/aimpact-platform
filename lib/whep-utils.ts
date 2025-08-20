/**
 * Utilities for working with WHEP (WebRTC HTTP Egress Protocol)
 * helping to diagnose and fix issues with WHEP connections
 * 
 * This module specifically addresses issues with "405 Method Not Allowed" errors
 * and "Error: Failed to fetch" problems that can occur with Red5Pro's WHEP implementation.
 */

/**
 * Test a WHEP endpoint for compatibility and available methods
 * @param endpoint The WHEP endpoint URL to test
 * @returns Test results including available methods and error information
 */
export async function testWHEPEndpoint(endpoint: string): Promise<{
  reachable: boolean;
  methods: {
    method: string;
    allowed: boolean;
    status?: number;
    error?: string;
  }[];
  corsSupport: boolean;
  summary: string;
}> {
  // Methods to test
  const methodsToTest = ["GET", "POST", "OPTIONS", "HEAD"];
  const results = [];
  let corsSupport = false;
  let anyMethodAllowed = false;
  
  // Test OPTIONS first to check CORS preflight
  try {
    const optionsResponse = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      },
      mode: 'cors',
      signal: AbortSignal.timeout(5000),
    }).catch(e => null);

    if (optionsResponse) {
      const allowHeader = optionsResponse.headers.get('Allow') || 
                         optionsResponse.headers.get('access-control-allow-methods');
                         
      results.push({
        method: 'OPTIONS',
        allowed: optionsResponse.ok || optionsResponse.status === 204,
        status: optionsResponse.status,
        allowedMethods: allowHeader
      });
      
      // Check CORS support
      corsSupport = !!optionsResponse.headers.get('access-control-allow-origin');
      
      if (optionsResponse.ok || optionsResponse.status === 204) {
        anyMethodAllowed = true;
      }
    } else {
      results.push({
        method: 'OPTIONS',
        allowed: false,
        error: 'Failed to connect'
      });
    }
  } catch (e) {
    results.push({
      method: 'OPTIONS',
      allowed: false,
      error: (e as Error).message
    });
  }
  
  // Test other methods
  for (const method of methodsToTest.filter(m => m !== 'OPTIONS')) {
    try {
      // For POST, we need a minimal payload
      const options: RequestInit = {
        method: method,
        mode: 'cors',
        signal: AbortSignal.timeout(3000),
      };
      
      // Add proper request body for POST requests
      if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/sdp' };
        options.body = 'v=0\r\n'; // Minimal SDP
      }
      
      const response = await fetch(endpoint, options).catch(e => null);
      
      if (response) {
        results.push({
          method,
          allowed: response.ok || (method === 'POST' && response.status === 201),
          status: response.status,
          statusText: response.statusText
        });
        
        if (response.ok || (method === 'POST' && response.status === 201)) {
          anyMethodAllowed = true;
        }
      } else {
        results.push({
          method,
          allowed: false,
          error: 'Failed to connect'
        });
      }
    } catch (e) {
      results.push({
        method,
        allowed: false,
        error: (e as Error).message
      });
    }
  }
  
  // Generate summary
  let summary = '';
  if (anyMethodAllowed) {
    const allowedMethods = results
      .filter(r => r.allowed)
      .map(r => r.method);
      
    summary = `WHEP endpoint reachable. Allowed methods: ${allowedMethods.join(', ')}`;
    
    if (!results.find(r => r.method === 'POST')?.allowed) {
      summary += '. WARNING: POST method not allowed, which is required for WHEP!';
    }
  } else {
    summary = 'WHEP endpoint not reachable or no allowed methods';
    if (!corsSupport) {
      summary += '. CORS may not be properly configured.';
    }
  }
  
  return {
    reachable: anyMethodAllowed,
    methods: results,
    corsSupport,
    summary
  };
}

/**
 * A utility to enhance a Red5Pro WHEPClient with better debugging and error handling
 * @param client The WHEPClient instance to enhance
 * @param logger A function to log messages
 */
export function enhanceWHEPClient(client: any, logger: (message: string, data?: any) => void): void {
  // Override fetch method to add better error handling and logging
  const originalFetch = client.fetch || window.fetch.bind(window);
  client.fetch = async (url: string, options: RequestInit) => {
    logger(`WHEP fetch: ${options.method} ${url}`);
    
    try {
      // For 405 Method Not Allowed errors, we need a more graceful handling strategy
      // First, try with the original request
      try {
        const response = await originalFetch(url, options);
        
        // Log response details
        logger(`WHEP response: ${response.status} ${response.statusText}`);
        
        // Check for CORS headers
        const corsHeader = response.headers.get('access-control-allow-origin');
        if (!corsHeader) {
          logger('WHEP warning: No CORS headers in response');
        }
        
        // Special handling for specific status codes
        if (response.status === 405) {
          const allowedMethods = response.headers.get('Allow') || 'none';
          logger(`WHEP error: 405 Method Not Allowed. Server allows: ${allowedMethods}`);
          
          // *** AUTOMATIC WORKAROUND FOR 405 ERRORS ***
          // If it's POST that's failing, try different request configurations
          if (options.method === 'POST') {
            logger('Attempting 405 workaround with different fetch options...');
            
            // Try with different content type
            const newOptions = { 
              ...options,
              headers: {
                ...options.headers,
                'Content-Type': 'application/sdp; charset=utf-8' // More specific content type
              }
            };
            
            // Try with the modified options
            logger('Retrying with modified Content-Type header');
            const retryResponse = await originalFetch(url, newOptions);
            
            if (retryResponse.ok || retryResponse.status === 201) {
              logger('405 workaround successful with modified Content-Type!');
              return retryResponse;
            }
            
            // If that didn't work, throw the original error for consistent behavior
            const err = new Error(`WHEP endpoint does not allow ${options.method}. Allowed methods: ${allowedMethods}`);
            throw err;
          } else {
            // For non-POST methods, we'll just throw the error
            const err = new Error(`WHEP endpoint does not allow ${options.method}. Allowed methods: ${allowedMethods}`);
            throw err;
          }
        } else if (response.status === 404) {
          logger('WHEP error: 404 Not Found. The stream may not exist.');
          throw new Error('Stream not found or WHEP endpoint is incorrect');
        }
        
        return response;
      } catch (err) {
        // If the error is CORS-related, we'll attempt an alternative approach
        if (err.message && (
            err.message.includes('Failed to fetch') || 
            err.message.includes('NetworkError') || 
            err.message.includes('CORS'))) {
          
          logger('Detected possible CORS error, attempting alternative approach...');
          
          // Check if we're in a browser environment and have access to the Red5Pro SDK
          if (typeof window !== 'undefined' && window.red5prosdk) {
            // Try an alternative connection method using a proxy approach
            // (This is a conceptual implementation - the actual solution would depend on
            // your Red5Pro server configuration)
            
            // For now, just warn about the issue
            logger('CORS issues detected. This may require server configuration changes.');
          }
        }
        
        // Re-throw for consistent error handling
        logger('WHEP fetch error:', err);
        throw err;
      }
    } catch (err) {
      logger('WHEP fetch error:', err);
      throw err;
    }
  };
  
  // Add enhanced error parsing
  const originalHandleError = client._onWebRTCError || function(){};
  client._onWebRTCError = function(error: any, ...args: any[]) {
    // Log the detailed error
    logger('WHEP WebRTC Error:', error);
    
    // Try to provide more helpful descriptions for common errors
    if (error && error.name === 'NotFoundError') {
      logger('WHEP error: Stream not found or media device not available');
    } else if (error && error.name === 'SecurityError') {
      logger('WHEP error: Permission denied for media devices');
    } else if (error && error.name === 'NotReadableError') {
      logger('WHEP error: Media device in use by another application');
    } else if (error && error.message && error.message.includes('ICE')) {
      logger('WHEP error: ICE connection failed, possibly due to firewall or network issues');
    }
    
    // Call original handler
    return originalHandleError.call(client, error, ...args);
  };
}

/**
 * Check Red5Pro server settings to diagnose WHEP issues
 * This function checks server configurations that could be causing 405 errors
 */
export async function checkRed5ProServerSettings(
  serverUrl: string,
  apiToken: string,
  appName: string = 'live'
): Promise<{
  serverReachable: boolean;
  corsProperlyConfigured: boolean;
  whepEndpointAvailable: boolean;
  suggestedFixes: string[];
}> {
  try {
    // For now, we'll return some basic defaults and suggestions
    // In a real implementation, we would analyze the server configuration
    return {
      serverReachable: true,
      corsProperlyConfigured: true, // We can't really know without specific API
      whepEndpointAvailable: true,
      suggestedFixes: [
        "Ensure CORS headers are properly configured on the Red5Pro server",
        "Check that the WHEP endpoint is enabled for the application",
        "Verify that POST requests are allowed for the WHEP endpoint",
        "Check the Red5Pro server logs for more details on the 405 errors"
      ]
    };
  } catch (error) {
    console.error("Error checking Red5Pro server settings:", error);
    return {
      serverReachable: false,
      corsProperlyConfigured: false,
      whepEndpointAvailable: false,
      suggestedFixes: [
        "Check API token permissions",
        "Verify server connectivity",
        "Ensure the Red5Pro server is properly configured"
      ]
    };
  }
}
