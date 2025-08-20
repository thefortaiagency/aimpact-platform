import { APIError, NetworkError, ValidationError } from './error-handling';

interface ErrorContext {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  browser?: string;
  sessionId?: string;
  [key: string]: any;
}

interface DiagnosticInfo {
  errorCode: string;
  category: ErrorCategory;
  userMessage: string;
  technicalMessage: string;
  possibleCauses: string[];
  troubleshootingSteps: string[];
  context: ErrorContext;
  stackTrace?: string;
  relatedErrors?: string[];
}

export enum ErrorCategory {
  AUTHENTICATION = 'Authentication',
  NETWORK = 'Network',
  PERMISSION = 'Permission',
  VALIDATION = 'Validation',
  SERVER = 'Server',
  CLIENT = 'Client',
  INTEGRATION = 'Integration',
  UNKNOWN = 'Unknown'
}

// Error code mappings for better identification
const ERROR_CODES: Record<string, { category: ErrorCategory; message: string }> = {
  // Authentication errors
  'AUTH001': { category: ErrorCategory.AUTHENTICATION, message: 'Invalid credentials' },
  'AUTH002': { category: ErrorCategory.AUTHENTICATION, message: 'Session expired' },
  'AUTH003': { category: ErrorCategory.AUTHENTICATION, message: 'Invalid token' },
  'AUTH004': { category: ErrorCategory.AUTHENTICATION, message: 'Account locked' },
  'AUTH005': { category: ErrorCategory.AUTHENTICATION, message: 'CredentialsSignIn error' },
  
  // Network errors
  'NET001': { category: ErrorCategory.NETWORK, message: 'Connection timeout' },
  'NET002': { category: ErrorCategory.NETWORK, message: 'No internet connection' },
  'NET003': { category: ErrorCategory.NETWORK, message: 'DNS resolution failed' },
  'NET004': { category: ErrorCategory.NETWORK, message: 'SSL certificate error' },
  
  // Permission errors
  'PERM001': { category: ErrorCategory.PERMISSION, message: 'Insufficient permissions' },
  'PERM002': { category: ErrorCategory.PERMISSION, message: 'Resource access denied' },
  'PERM003': { category: ErrorCategory.PERMISSION, message: 'Feature not available for your plan' },
  
  // Validation errors
  'VAL001': { category: ErrorCategory.VALIDATION, message: 'Invalid input data' },
  'VAL002': { category: ErrorCategory.VALIDATION, message: 'Required field missing' },
  'VAL003': { category: ErrorCategory.VALIDATION, message: 'Data format error' },
  
  // Server errors
  'SRV001': { category: ErrorCategory.SERVER, message: 'Internal server error' },
  'SRV002': { category: ErrorCategory.SERVER, message: 'Database connection failed' },
  'SRV003': { category: ErrorCategory.SERVER, message: 'Service temporarily unavailable' },
  'SRV004': { category: ErrorCategory.SERVER, message: 'Rate limit exceeded' },
  
  // Integration errors
  'INT001': { category: ErrorCategory.INTEGRATION, message: 'Email service unavailable' },
  'INT002': { category: ErrorCategory.INTEGRATION, message: 'Phone system offline' },
  'INT003': { category: ErrorCategory.INTEGRATION, message: 'Power Automate webhook failed' },
  'INT004': { category: ErrorCategory.INTEGRATION, message: 'Telnyx API error' },
};

export class ErrorDiagnostics {
  static analyze(error: unknown, context?: ErrorContext): DiagnosticInfo {
    const baseInfo = this.getBaseErrorInfo(error);
    const category = this.categorizeError(error, baseInfo);
    const errorCode = this.generateErrorCode(error, category);
    
    return {
      errorCode,
      category,
      userMessage: this.getUserMessage(error, category),
      technicalMessage: this.getTechnicalMessage(error),
      possibleCauses: this.getPossibleCauses(error, category, context),
      troubleshootingSteps: this.getTroubleshootingSteps(error, category, context),
      context: this.enhanceContext(context, error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      relatedErrors: this.getRelatedErrors(errorCode),
    };
  }

  private static getBaseErrorInfo(error: unknown): { message: string; status?: number } {
    if (error instanceof APIError) {
      return { message: error.message, status: error.status };
    }
    if (error instanceof Error) {
      return { message: error.message };
    }
    return { message: String(error) };
  }

  private static categorizeError(error: unknown, baseInfo: { status?: number }): ErrorCategory {
    // Check for specific error types
    if (error instanceof NetworkError) return ErrorCategory.NETWORK;
    if (error instanceof ValidationError) return ErrorCategory.VALIDATION;
    
    // Check by status code
    if (baseInfo.status) {
      if (baseInfo.status === 401 || baseInfo.status === 403) return ErrorCategory.AUTHENTICATION;
      if (baseInfo.status === 422 || baseInfo.status === 400) return ErrorCategory.VALIDATION;
      if (baseInfo.status >= 500) return ErrorCategory.SERVER;
      if (baseInfo.status === 429) return ErrorCategory.SERVER;
    }
    
    // Check by error message patterns
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) return ErrorCategory.NETWORK;
    if (message.includes('auth') || message.includes('token') || message.includes('session') || message.includes('credentialssignin')) return ErrorCategory.AUTHENTICATION;
    if (message.includes('permission') || message.includes('forbidden')) return ErrorCategory.PERMISSION;
    if (message.includes('validation') || message.includes('invalid')) return ErrorCategory.VALIDATION;
    if (message.includes('telnyx') || message.includes('power automate') || message.includes('email')) return ErrorCategory.INTEGRATION;
    if (message.includes('too many re-renders') || message.includes('infinite loop')) return ErrorCategory.CLIENT;
    
    return ErrorCategory.UNKNOWN;
  }

  private static generateErrorCode(error: unknown, category: ErrorCategory): string {
    // Try to find a matching predefined error code
    if (error instanceof APIError && error.code) {
      return error.code;
    }
    
    // Generate a code based on category and timestamp
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).substring(-4).toUpperCase();
    return `${categoryPrefix}${timestamp}`;
  }

  private static getUserMessage(error: unknown, category: ErrorCategory): string {
    const baseMessage = error instanceof Error ? error.message : String(error);
    
    // Provide category-specific user-friendly messages
    const categoryMessages: Record<ErrorCategory, string> = {
      [ErrorCategory.AUTHENTICATION]: 'Please sign in again to continue.',
      [ErrorCategory.NETWORK]: 'Connection issue detected. Please check your internet and try again.',
      [ErrorCategory.PERMISSION]: 'You don\'t have access to this feature.',
      [ErrorCategory.VALIDATION]: 'Please check your input and try again.',
      [ErrorCategory.SERVER]: 'Our servers are having issues. Please try again in a moment.',
      [ErrorCategory.CLIENT]: 'Something went wrong on your device. Please refresh the page.',
      [ErrorCategory.INTEGRATION]: 'One of our services is temporarily unavailable.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    };
    
    return categoryMessages[category] || baseMessage;
  }

  private static getTechnicalMessage(error: unknown): string {
    if (error instanceof APIError) {
      return `API Error ${error.status || 'unknown'}: ${error.message}`;
    }
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    return String(error);
  }

  private static getPossibleCauses(error: unknown, category: ErrorCategory, context?: ErrorContext): string[] {
    const causes: string[] = [];
    
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        causes.push(
          'Your email or password may be incorrect',
          'Your account may not exist yet',
          'Your session may have expired',
          'Browser cookies may be disabled',
          'Caps Lock may be on'
        );
        if (context?.errorType === 'CredentialsSignin') {
          causes.unshift('The email/password combination is not recognized');
        }
        break;
        
      case ErrorCategory.NETWORK:
        causes.push(
          'Internet connection is unstable or disconnected',
          'Firewall or proxy blocking the connection',
          'DNS server issues',
          'VPN interference'
        );
        if (context?.url?.includes('localhost')) {
          causes.push('Local development server may not be running');
        }
        break;
        
      case ErrorCategory.PERMISSION:
        causes.push(
          'Your account plan doesn\'t include this feature',
          'Your role doesn\'t have the required permissions',
          'The resource may have been deleted or moved',
          'Access control rules have changed'
        );
        break;
        
      case ErrorCategory.VALIDATION:
        causes.push(
          'Required fields are missing',
          'Data format doesn\'t match expected format',
          'Values are outside acceptable range',
          'Duplicate entry where unique value is required'
        );
        break;
        
      case ErrorCategory.SERVER:
        causes.push(
          'Server is under heavy load',
          'Database connection issues',
          'Service maintenance in progress',
          'Rate limiting triggered'
        );
        break;
        
      case ErrorCategory.INTEGRATION:
        if (context?.url?.includes('telnyx')) {
          causes.push(
            'Telnyx API credentials may be invalid',
            'Telnyx service is experiencing issues',
            'Phone number configuration error'
          );
        }
        if (context?.url?.includes('power-automate')) {
          causes.push(
            'Power Automate webhook is misconfigured',
            'Microsoft authentication has expired',
            'Power Automate flow is disabled'
          );
        }
        causes.push('Third-party service is down or unreachable');
        break;
        
      case ErrorCategory.CLIENT:
        causes.push(
          'A component may have an infinite render loop',
          'State updates are triggering continuous re-renders',
          'React hooks have incorrect dependencies',
          'Components are creating new objects/arrays on every render'
        );
        if (error instanceof Error && error.message.includes('too many re-renders')) {
          causes.unshift(
            'A setState call is being made during render',
            'useEffect is missing proper dependencies',
            'useMemo or useCallback is needed to stabilize values'
          );
        }
        break;
    }
    
    return causes;
  }

  private static getTroubleshootingSteps(error: unknown, category: ErrorCategory, context?: ErrorContext): string[] {
    const steps: string[] = [];
    
    // Common steps for all errors
    steps.push('Refresh the page and try again');
    
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        steps.push(
          'Double-check your email address for typos',
          'Verify your password is correct (check Caps Lock)',
          'Try resetting your password if forgotten',
          'Clear your browser cookies and cache',
          'Try using an incognito/private browser window'
        );
        if (context?.errorType === 'CredentialsSignin') {
          steps.unshift('Ensure you have an account - you may need to register first');
        }
        break;
        
      case ErrorCategory.NETWORK:
        steps.push(
          'Check your internet connection',
          'Try disabling VPN if you\'re using one',
          'Check if other websites are loading',
          'Try a different browser or device',
          'Disable browser extensions temporarily',
          'Check your firewall settings'
        );
        break;
        
      case ErrorCategory.PERMISSION:
        steps.push(
          'Verify you\'re logged into the correct account',
          'Check your account permissions with an administrator',
          'Upgrade your plan if this is a premium feature',
          'Contact your organization\'s admin for access'
        );
        break;
        
      case ErrorCategory.VALIDATION:
        steps.push(
          'Review all form fields for errors',
          'Check for required fields marked with asterisks',
          'Ensure email addresses are properly formatted',
          'Check that phone numbers include country codes',
          'Remove any special characters that might not be allowed'
        );
        break;
        
      case ErrorCategory.SERVER:
        steps.push(
          'Wait a few minutes and try again',
          'Check our status page for known issues',
          'Try during off-peak hours',
          'Contact support if the issue persists'
        );
        break;
        
      case ErrorCategory.INTEGRATION:
        if (context?.action === 'email') {
          steps.push(
            'Check your email configuration in settings',
            'Verify Power Automate connection is active',
            'Re-authenticate with Microsoft if needed'
          );
        }
        if (context?.action === 'phone') {
          steps.push(
            'Check your phone system settings',
            'Verify Telnyx credentials are correct',
            'Ensure phone numbers are properly configured'
          );
        }
        steps.push('Check integration settings', 'Re-authorize third-party connections');
        break;
        
      case ErrorCategory.CLIENT:
        steps.push(
          'Check React Developer Tools for component re-renders',
          'Review useEffect dependencies',
          'Add useMemo to expensive computations',
          'Use useCallback for event handlers passed as props',
          'Check for setState calls during render',
          'Look for missing key props in lists'
        );
        if (error instanceof Error && error.message.includes('too many re-renders')) {
          steps.unshift(
            'Open browser DevTools and check the console for the component causing the issue',
            'Look for setState calls outside of event handlers or effects',
            'Check if any effects are missing dependency arrays'
          );
        }
        break;
    }
    
    return steps;
  }

  private static enhanceContext(context?: ErrorContext, error?: unknown): ErrorContext {
    const enhanced: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      browser: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : context?.url,
    };
    
    // Add error-specific context
    if (error instanceof APIError) {
      enhanced.apiStatus = error.status;
      enhanced.apiDetails = error.details;
    }
    
    return enhanced;
  }

  private static getRelatedErrors(errorCode: string): string[] {
    // Map errors that commonly occur together
    const relatedErrorMap: Record<string, string[]> = {
      'AUTH002': ['AUTH001', 'AUTH003'], // Session expired often relates to invalid credentials or tokens
      'NET001': ['NET002', 'NET003'], // Network timeout often relates to connection issues
      'INT001': ['INT003', 'SRV003'], // Email service issues often relate to webhook or server problems
      'INT002': ['INT004', 'NET001'], // Phone system issues often relate to Telnyx API or network
    };
    
    return relatedErrorMap[errorCode] || [];
  }

  static formatForDisplay(diagnostic: DiagnosticInfo, isDevelopment: boolean = false): string {
    const sections: string[] = [];
    
    // Header
    sections.push(`🚨 Error ${diagnostic.errorCode} - ${diagnostic.category}`);
    sections.push('');
    
    // User message
    sections.push(`**What happened:**`);
    sections.push(diagnostic.userMessage);
    sections.push('');
    
    // Possible causes
    if (diagnostic.possibleCauses.length > 0) {
      sections.push(`**Possible causes:**`);
      diagnostic.possibleCauses.forEach(cause => {
        sections.push(`• ${cause}`);
      });
      sections.push('');
    }
    
    // Troubleshooting steps
    if (diagnostic.troubleshootingSteps.length > 0) {
      sections.push(`**How to fix it:**`);
      diagnostic.troubleshootingSteps.forEach((step, index) => {
        sections.push(`${index + 1}. ${step}`);
      });
      sections.push('');
    }
    
    // Technical details (development mode only)
    if (isDevelopment) {
      sections.push(`**Technical details:**`);
      sections.push(`Message: ${diagnostic.technicalMessage}`);
      if (diagnostic.context.url) sections.push(`URL: ${diagnostic.context.url}`);
      if (diagnostic.context.method) sections.push(`Method: ${diagnostic.context.method}`);
      if (diagnostic.context.component) sections.push(`Component: ${diagnostic.context.component}`);
      sections.push('');
      
      if (diagnostic.stackTrace) {
        sections.push(`**Stack trace:**`);
        sections.push('```');
        sections.push(diagnostic.stackTrace);
        sections.push('```');
      }
    }
    
    return sections.join('\n');
  }
}