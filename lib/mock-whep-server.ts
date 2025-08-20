/**
 * This is a mock server utility that helps us simulate various
 * Red5 Pro server responses for testing our error handling
 */

export function createMockResponseFor(type: string): Response {
  switch(type) {
    case '405':
      return new Response(null, {
        status: 405,
        statusText: 'Method Not Allowed',
        headers: {
          'Allow': 'GET, HEAD, OPTIONS',
          'Content-Type': 'text/plain'
        }
      });
    
    case 'nocors':
      return new Response('', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    
    case 'cors':
      return new Response('', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    
    case 'network-error':
      throw new Error('NetworkError: Failed to fetch');
    
    case 'timeout':
      throw new Error('TimeoutError: The operation timed out');
    
    default:
      // Default success response for WHEP
      return new Response('', {
        status: 201,
        headers: {
          'Content-Type': 'application/sdp',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
  }
}

/**
 * A mock fetch function that can be used to simulate various responses
 * Use for testing our error handling and recovery mechanisms
 */
export function mockFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Extract mockType from the URL
  const mockUrl = new URL(url, 'http://localhost');
  const mockType = mockUrl.searchParams.get('mock');
  
  if (mockType) {
    // Return a mock response based on the type
    return Promise.resolve(createMockResponseFor(mockType));
  } else {
    // Pass through to the real fetch
    return fetch(url, options);
  }
}

/**
 * A utility to test our enhanced WHEP error handlers against various error types
 */
export async function testWHEPErrorHandling(
  streamName: string,
  errorType: '405' | 'nocors' | 'network-error' | 'timeout' | 'success' = '405'
): Promise<{
  success: boolean;
  errorHandled: boolean;
  errorMessage?: string;
  recoveryAttempted?: boolean;
  recoverySuccessful?: boolean;
}> {
  // Create a mock endpoint URL with our test error type
  const mockEndpoint = `/api/test-whep?simulate=${errorType}&streamName=${streamName}`;
  
  try {
    // Mock the connection attempt
    const response = await mockFetch(mockEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp'
      },
      body: 'v=0\r\n' // Minimal SDP
    });
    
    // Check if the response is successful
    const success = response.ok || response.status === 201;
    
    return {
      success,
      errorHandled: !success, // If not success, we handled an error
      errorMessage: !success ? `HTTP Error: ${response.status} ${response.statusText}` : undefined
    };
  } catch (error) {
    // Test our error recovery mechanism
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // This simulates our recovery logic
    let recoverySuccessful = false;
    
    try {
      // Try a different approach (this simulates our retry logic)
      const retryResponse = await mockFetch(mockEndpoint.replace('simulate', 'ignore'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp; charset=utf-8' // Different content type
        },
        body: 'v=0\r\n'
      });
      
      recoverySuccessful = retryResponse.ok || retryResponse.status === 201;
    } catch (retryError) {
      recoverySuccessful = false;
    }
    
    return {
      success: false,
      errorHandled: true,
      errorMessage,
      recoveryAttempted: true,
      recoverySuccessful
    };
  }
}
