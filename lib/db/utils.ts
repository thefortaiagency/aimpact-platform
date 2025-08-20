import { NextResponse } from 'next/server';

/**
 * Wraps an API handler to handle database connection issues during build time
 */
export function withDatabase<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    // During build time, just return a mock response
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      console.warn('Database not configured - returning empty response');
      return NextResponse.json({ 
        error: 'Database not configured',
        data: null 
      }, { status: 503 });
    }

    try {
      return await handler(...args);
    } catch (error: any) {
      if (error.message?.includes('Database operations not available during build time')) {
        return NextResponse.json({ 
          error: 'Service temporarily unavailable',
          data: null 
        }, { status: 503 });
      }
      throw error;
    }
  }) as T;
}

/**
 * Check if we're in build mode
 */
export function isBuildTime() {
  return process.env.NODE_ENV === 'production' && 
         !process.env.VERCEL && 
         (!process.env.POSTGRES_URL && !process.env.DATABASE_URL);
}