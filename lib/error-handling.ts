import { toast } from '@/hooks/use-toast';
import { ErrorDiagnostics } from './error-diagnostics';

// Custom error classes
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error handler for API responses
export async function handleAPIResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = null;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorDetails = errorData;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new APIError(errorMessage, response.status, undefined, errorDetails);
  }

  try {
    return await response.json();
  } catch {
    // Return empty object if response has no body
    return {} as T;
  }
}

// User-friendly error messages
const ERROR_MESSAGES: Record<number | string, string> = {
  // HTTP status codes
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to perform this action.",
  404: 'The requested resource was not found.',
  408: 'Request timeout. Please check your connection and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Server error. Our team has been notified.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service maintenance in progress. Please try again later.',
  
  // Custom error codes
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  VALIDATION_ERROR: 'Please check the form and correct any errors.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// Get user-friendly error message with diagnostics
export function getErrorMessage(error: unknown, context?: any): string {
  // Get diagnostic information
  const diagnostic = ErrorDiagnostics.analyze(error, context);
  
  // In development, show detailed diagnostics
  if (process.env.NODE_ENV === 'development') {
    return diagnostic.userMessage + '\n\n' + 
           `Error Code: ${diagnostic.errorCode}\n` +
           `Category: ${diagnostic.category}`;
  }
  
  // In production, show user-friendly message with error code
  return `${diagnostic.userMessage} (${diagnostic.errorCode})`;
}

// Toast notification helper with detailed diagnostics
export function showErrorToast(error: unknown, title?: string, context?: any) {
  const diagnostic = ErrorDiagnostics.analyze(error, context);
  
  // In development, log full diagnostics to console
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error Diagnostics: ${diagnostic.errorCode}`);
    console.error('Category:', diagnostic.category);
    console.error('Technical Message:', diagnostic.technicalMessage);
    console.error('Context:', diagnostic.context);
    console.error('Possible Causes:', diagnostic.possibleCauses);
    console.error('Troubleshooting:', diagnostic.troubleshootingSteps);
    if (diagnostic.stackTrace) {
      console.error('Stack Trace:', diagnostic.stackTrace);
    }
    console.groupEnd();
  }
  
  toast({
    title: title || `Error ${diagnostic.errorCode}`,
    description: diagnostic.userMessage,
    variant: 'destructive',
  });
}

// Retry mechanism for failed requests
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      if (error instanceof APIError) {
        // Retry on network errors and server errors
        return !error.status || error.status >= 500 || error.status === 408;
      }
      return error instanceof NetworkError;
    },
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Exponential backoff with jitter
      delay = Math.min(delay * 2 + Math.random() * 1000, maxDelay);
    }
  }

  throw lastError;
}

// Error logging service with enhanced diagnostics
export function logError(error: unknown, context?: Record<string, any>) {
  const diagnostic = ErrorDiagnostics.analyze(error, context);
  
  const errorData = {
    errorCode: diagnostic.errorCode,
    category: diagnostic.category,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    type: error instanceof Error ? error.name : typeof error,
    diagnostic: diagnostic,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
  };

  // Enhanced logging in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`📋 Error Log: ${diagnostic.errorCode}`);
    console.error('Diagnostic Report:', ErrorDiagnostics.formatForDisplay(diagnostic, true));
    console.groupEnd();
  }

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Include diagnostic info in production logs
    // TODO: Implement actual logging service integration
    // Example: sendToSentry(errorData);
    // Example: sendToLogRocket(errorData);
  }
}

// Safe JSON parse with error handling
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    logError(error, { json, fallback });
    return fallback;
  }
}

// Async error wrapper for consistency
export async function handleAsync<T>(
  promise: Promise<T>,
  errorMessage?: string
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    logError(error, { errorMessage });
    return [null, error as Error];
  }
}

// Form validation error helper
export function getFieldError(
  error: unknown,
  fieldName: string
): string | undefined {
  if (error instanceof ValidationError && error.fields) {
    const fieldErrors = error.fields[fieldName];
    return fieldErrors?.[0];
  }
  return undefined;
}