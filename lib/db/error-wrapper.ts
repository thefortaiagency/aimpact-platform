import { APIError } from '@/lib/error-handling';

export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    console.error(`Database error in ${context || 'operation'}:`, error);
    
    // PostgreSQL error codes
    if (error.code === '23505') {
      throw new DatabaseError('Duplicate entry found', 'DUPLICATE');
    }
    if (error.code === '23503') {
      throw new DatabaseError('Related record not found', 'FOREIGN_KEY');
    }
    if (error.code === '42P01') {
      throw new DatabaseError('Database table not found', 'TABLE_NOT_FOUND');
    }
    if (error.code === '08001' || error.code === '08006') {
      throw new DatabaseError('Database connection failed', 'CONNECTION_FAILED');
    }
    if (error.code === 'ECONNREFUSED') {
      throw new DatabaseError('Database server is not reachable', 'CONNECTION_REFUSED');
    }
    
    // Generic database error
    throw new DatabaseError(
      error.message || 'Database operation failed',
      error.code || 'UNKNOWN'
    );
  }
}