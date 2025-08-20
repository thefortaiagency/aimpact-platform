// Simple sentiment analysis implementation
// In production, you would use OpenAI API or similar service

interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  insights: {
    keywords: string[];
    intent?: string;
    category?: string;
    suggestedActions?: string[];
  };
}

// Positive and negative word lists for basic sentiment analysis
const positiveWords = [
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'happy',
  'pleased', 'satisfied', 'love', 'perfect', 'awesome', 'thanks', 'thank you',
  'appreciate', 'helpful', 'resolved', 'fixed', 'working', 'success'
];

const negativeWords = [
  'bad', 'terrible', 'awful', 'horrible', 'poor', 'unhappy', 'disappointed',
  'frustrated', 'angry', 'hate', 'problem', 'issue', 'broken', 'failed',
  'error', 'bug', 'crash', 'slow', 'confusing', 'difficult'
];

const urgentWords = [
  'urgent', 'asap', 'immediately', 'critical', 'emergency', 'important',
  'quickly', 'now', 'today', 'deadline'
];

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  // Convert to lowercase for analysis
  const lowerText = text.toLowerCase();
  
  // Count positive and negative words
  let positiveCount = 0;
  let negativeCount = 0;
  const foundKeywords: string[] = [];

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) {
      positiveCount++;
      foundKeywords.push(word);
    }
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) {
      negativeCount++;
      foundKeywords.push(word);
    }
  });

  // Calculate sentiment score
  const total = positiveCount + negativeCount;
  let score = 0;
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

  if (total > 0) {
    score = (positiveCount - negativeCount) / total;
    if (score > 0.2) {
      sentiment = 'positive';
    } else if (score < -0.2) {
      sentiment = 'negative';
    }
  }

  // Detect intent and category
  let intent = 'general';
  let category = 'general';
  const suggestedActions: string[] = [];

  // Check for specific patterns
  if (lowerText.includes('refund') || lowerText.includes('charge') || lowerText.includes('payment')) {
    category = 'billing';
    intent = 'billing_inquiry';
    suggestedActions.push('Check payment history', 'Review billing details');
  } else if (lowerText.includes('bug') || lowerText.includes('error') || lowerText.includes('not working')) {
    category = 'technical';
    intent = 'bug_report';
    suggestedActions.push('Check system logs', 'Reproduce issue', 'Create bug ticket');
  } else if (lowerText.includes('how to') || lowerText.includes('help') || lowerText.includes('guide')) {
    category = 'support';
    intent = 'help_request';
    suggestedActions.push('Provide documentation', 'Offer tutorial', 'Schedule training');
  } else if (lowerText.includes('feature') || lowerText.includes('request') || lowerText.includes('add')) {
    category = 'feature_request';
    intent = 'enhancement';
    suggestedActions.push('Log feature request', 'Discuss with product team');
  }

  // Check urgency
  const isUrgent = urgentWords.some(word => lowerText.includes(word));
  if (isUrgent) {
    suggestedActions.unshift('Prioritize response');
  }

  return {
    sentiment,
    score,
    insights: {
      keywords: foundKeywords,
      intent,
      category,
      suggestedActions
    }
  };
}

// In production, this would call OpenAI or another AI service
export async function generateAIResponse(
  context: string,
  sentiment: string,
  category: string
): Promise<string> {
  // Placeholder for AI response generation
  // In production, use OpenAI API or similar
  
  const templates = {
    positive: {
      billing: "Thank you for reaching out. I'm happy to help with your billing inquiry.",
      technical: "I appreciate you bringing this to our attention. Let me help resolve this issue.",
      support: "I'd be glad to help you with that. Here's what you need to know:",
      general: "Thank you for your message. I'm here to assist you."
    },
    negative: {
      billing: "I understand your concern about the billing issue. Let me look into this right away.",
      technical: "I apologize for the technical difficulties you're experiencing. Let's get this fixed.",
      support: "I'm sorry you're having trouble. Let me help clarify this for you.",
      general: "I apologize for any inconvenience. Let me help resolve this for you."
    },
    neutral: {
      billing: "I'll help you with your billing question.",
      technical: "I'll assist you with the technical matter.",
      support: "I'll provide the information you need.",
      general: "Thank you for contacting us. How can I help?"
    }
  };

  const sentimentKey = sentiment as keyof typeof templates;
  const categoryKey = category as keyof typeof templates.positive;
  
  return templates[sentimentKey]?.[categoryKey] || templates.neutral.general;
}

// Extract entities from text (companies, people, etc.)
export function extractEntities(text: string): Array<{ type: string; value: string; confidence: number }> {
  const entities: Array<{ type: string; value: string; confidence: number }> = [];
  
  // Simple email extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex);
  if (emails) {
    emails.forEach(email => {
      entities.push({ type: 'email', value: email, confidence: 1.0 });
    });
  }

  // Simple phone number extraction
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones) {
    phones.forEach(phone => {
      entities.push({ type: 'phone', value: phone, confidence: 0.9 });
    });
  }

  // In production, use NLP library or AI service for better entity extraction
  
  return entities;
}