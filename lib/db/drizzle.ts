import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create a lazy-loaded database connection
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  // Return existing instance if already created
  if (dbInstance) {
    return dbInstance;
  }

  // Check for database URL
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    // During build time, we don't have env vars, so just return a dummy object
    // that will throw if actually used
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.warn('⚠️ Database connection not configured - using dummy connection for build');
      return new Proxy({} as any, {
        get() {
          throw new Error('Database operations not available during build time');
        }
      });
    }
    
    console.error('❌ POSTGRES_URL environment variable is not set');
    throw new Error('Database connection string (POSTGRES_URL) is required but not configured');
  }

  // Create postgres connection
  const client = postgres(connectionString, {
    ssl: 'require',
    max: 1
  });

  // Create and cache drizzle instance
  dbInstance = drizzle(client);
  return dbInstance;
}

// Export a getter for the database
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop, receiver) {
    const database = getDb();
    return Reflect.get(database, prop, receiver);
  }
});