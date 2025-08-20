interface ErrorLog {
  message: string;
  stack?: string;
  type: string;
  context?: Record<string, any>;
  timestamp: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
}

interface ErrorLoggerConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  environment?: string;
  maxRetries?: number;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private queue: ErrorLog[] = [];
  private config: ErrorLoggerConfig = {
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV,
    maxRetries: 3,
  };
  private isOnline = true;
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flush();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }

    // Flush logs periodically
    this.startFlushInterval();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  configure(config: Partial<ErrorLoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  log(error: unknown, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.name : typeof error,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      // TODO: Add user ID from auth context
      // TODO: Add session ID
    };

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Logged');
      console.error('Message:', errorLog.message);
      if (errorLog.stack) console.error('Stack:', errorLog.stack);
      if (errorLog.context) console.table(errorLog.context);
      console.groupEnd();
    }

    // Add to queue if enabled
    if (this.config.enabled) {
      this.queue.push(errorLog);
      
      // Flush immediately for critical errors
      if (this.isCriticalError(error)) {
        this.flush();
      }
    }
  }

  private isCriticalError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    // Define critical error patterns
    const criticalPatterns = [
      /authentication/i,
      /authorization/i,
      /security/i,
      /payment/i,
      /critical/i,
      /fatal/i,
    ];

    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }

  private startFlushInterval() {
    // Flush logs every 30 seconds
    this.flushInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, 30000);
  }

  private async flush() {
    if (!this.isOnline || this.queue.length === 0 || !this.config.endpoint) {
      return;
    }

    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        },
        body: JSON.stringify({
          logs: logsToSend,
          environment: this.config.environment,
        }),
      });

      if (!response.ok) {
        // Put logs back in queue if send failed
        this.queue.unshift(...logsToSend);
      }
    } catch (error) {
      // Put logs back in queue if send failed
      this.queue.unshift(...logsToSend);
      console.error('Failed to send error logs:', error);
    }
  }

  // Get error statistics for monitoring
  getStats() {
    return {
      queueSize: this.queue.length,
      isOnline: this.isOnline,
      enabled: this.config.enabled,
    };
  }

  // Clear the queue
  clear() {
    this.queue = [];
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // Final flush
  }
}

export const errorLogger = ErrorLogger.getInstance();

// Convenience function for logging
export function logErrorToService(error: unknown, context?: Record<string, any>) {
  errorLogger.log(error, context);
}

// React hook for error logging
export function useErrorLogger() {
  return {
    logError: (error: unknown, context?: Record<string, any>) => {
      errorLogger.log(error, context);
    },
    getStats: () => errorLogger.getStats(),
  };
}

// Global error handler for uncaught errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.log(event.error || new Error(event.message), {
      type: 'uncaught',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
      type: 'unhandledRejection',
      reason: event.reason,
    });
  });
}