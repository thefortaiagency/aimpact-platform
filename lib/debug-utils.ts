// Debug logging disabled - was causing console spam
// To re-enable, uncomment the code below and add ?debug=true to the URL

// Debug utility to catch and log contact errors
export function safeContactMap<T>(
  array: T[] | undefined | null,
  mapFn: (item: T, index: number) => any,
  componentName: string = 'Unknown'
): any[] {
  if (!array) {
    console.warn(`[${componentName}] Array is null/undefined`);
    return [];
  }
  
  try {
    return array.map((item, index) => {
      if (!item) {
        console.warn(`[${componentName}] Item at index ${index} is null/undefined`);
        return null;
      }
      
      try {
        // Log the item structure before processing
        if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
          console.log(`[${componentName}] Processing item ${index}:`, item);
        }
        
        return mapFn(item, index);
      } catch (error) {
        console.error(`[${componentName}] Error mapping item at index ${index}:`, error);
        console.error('Item that caused error:', item);
        throw error; // Re-throw to maintain error boundary behavior
      }
    });
  } catch (error) {
    console.error(`[${componentName}] Fatal error in map operation:`, error);
    console.error('Full array:', array);
    throw error;
  }
}

// Global error interceptor for debugging
if (typeof window !== 'undefined') {
  const originalError = window.Error;
  window.Error = function(message: string, ...args: any[]) {
    if (message && message.includes('contact is not defined')) {
      console.error('CONTACT ERROR INTERCEPTED!');
      console.trace();
      
      // Try to capture more context
      try {
        const stack = new originalError().stack;
        console.error('Stack trace:', stack);
      } catch (e) {}
    }
    return originalError.apply(this, [message, ...args] as any);
  } as any;
}