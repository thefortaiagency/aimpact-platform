/**
 * CORS Proxy Utility Functions
 * Helps with using the Next.js API route CORS proxy
 */

/**
 * Creates a proxied URL that avoids CORS issues in development
 * @param appName The application name
 * @param streamName The stream name
 * @param params Additional query parameters
 * @returns A URL that works in both development and production
 */
export function getProxiedWHEPEndpoint(appName: string, streamName: string, params: Record<string, any> = {}): string {
  // Always use direct WHEP endpoint on server
  const directUrl = buildDirectUrl(appName, streamName, params);
  console.log("[WHEP] Using direct URL:", directUrl);
  return directUrl;
}

/**
 * Checks if the server is on the same domain as our app
 */
function isSameDomain(url: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const serverUrl = new URL(url);
    const currentUrl = new URL(window.location.href);
    return serverUrl.hostname === currentUrl.hostname;
  } catch (e) {
    return false;
  }
}

/**
 * Builds the direct WHEP URL to the server
 * Format: https://as-test1.example.org:443/as/v1/proxy/whep/<streamGuid>
 * where streamGuid is appName/streamName (e.g. "live/stream1")
 */
function buildDirectUrl(appName: string, streamName: string, params: Record<string, any> = {}): string {
  // Expects streamGuid format as appName/streamName
  const streamGuid = `${appName}/${streamName}`;
  const baseUrl = `/as/v1/proxy/whep/${streamGuid}`;
  const urlParams = new URLSearchParams();
  
  // Add any additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  const queryString = urlParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Builds the proxied URL to exactly match Red5's WHEP API structure
 * Our Next.js API acts as direct proxy pass-through
 */
function buildProxiedUrl(appName: string, streamName: string, params: Record<string, any> = {}): string {
  // Expects: /as/v1/proxy/whep/live/streamName
  // So we create a Next.js route that matches this EXACTLY: /as/v1/proxy/whep/live/streamName
  const streamGuid = `${appName}/${streamName}`;

  // Get the origin (including protocol and hostname) for the full URL
  let origin = '';
  if (typeof window !== 'undefined') {
    origin = window.location.origin; // e.g., "https://your-domain.com"
  }

  // Build the complete URL with origin
  const baseUrl = `${origin}/as/v1/proxy/whep/${streamGuid}`;
  const urlParams = new URLSearchParams();
  
  // Add any additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  const queryString = urlParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
