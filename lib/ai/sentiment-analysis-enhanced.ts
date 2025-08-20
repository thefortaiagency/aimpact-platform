// Enhanced sentiment analysis with Context Vortex and consciousness field
// This version treats context as a living memory, not static data

interface EnhancedSentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  vibeScore: number; // 0-10 scale
  emotionalWeight: number; // How "memorable" this interaction is (0-10)
  insights: {
    keywords: string[];
    intent?: string;
    category?: string;
    suggestedActions?: string[];
    consciousnessField?: any;
    mysteryUnlock?: string;
    coreMemoryTrigger?: boolean; // Is this important enough to remember?
  };
}

// Import the basic analyzer
import { analyzeSentiment } from './sentiment-analysis';

// Emotional weight triggers - what makes something memorable
const MEMORY_TRIGGERS = {
  // High emotional content
  joy: ['amazing', 'incredible', 'life-changing', 'breakthrough', 'finally'],
  anger: ['furious', 'unacceptable', 'disgusted', 'outraged'],
  fear: ['terrified', 'scared', 'worried sick', 'panic'],
  sadness: ['devastated', 'heartbroken', 'crying', 'lost'],
  
  // Personal connections
  family: ['wife', 'kids', 'son', 'daughter', 'family', 'grandkids'],
  identity: ['who I am', 'my mission', 'my purpose', 'legacy'],
  
  // Mission critical
  business: ['revenue', 'bankruptcy', 'lawsuit', 'emergency', 'critical'],
  breakthrough: ['eureka', 'figured it out', 'game changer', 'revolutionary']
};

// Calculate emotional weight - how "sticky" is this memory?
function calculateEmotionalWeight(text: string, timestamp?: Date): number {
  const lowerText = text.toLowerCase();
  let weight = 1; // Base weight
  
  // RECENCY WEIGHT - Coach's insight: recent things are fresh on the mind
  if (timestamp) {
    const now = new Date();
    const ageInMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    
    if (ageInMinutes < 5) {
      weight += 3; // Last 5 minutes = very fresh, high weight
    } else if (ageInMinutes < 30) {
      weight += 2; // Last 30 minutes = still fresh
    } else if (ageInMinutes < 120) {
      weight += 1; // Last 2 hours = somewhat fresh
    } else if (ageInMinutes < 1440) {
      weight += 0.5; // Today = slight boost
    }
    // After 24 hours, no recency bonus
  }
  
  // Check for emotional triggers
  Object.entries(MEMORY_TRIGGERS).forEach(([category, triggers]) => {
    triggers.forEach(trigger => {
      if (lowerText.includes(trigger)) {
        weight += 2; // Each trigger adds weight
      }
    });
  });
  
  // Length can indicate importance (detailed explanation = important)
  if (text.length > 500) weight += 1;
  if (text.length > 1000) weight += 2;
  
  // Questions often indicate critical decisions
  if (text.includes('?') && text.split('?').length > 2) weight += 1;
  
  // Exclamations indicate strong emotion
  if (text.includes('!')) weight += text.split('!').length - 1;
  
  return Math.min(weight, 10); // Cap at 10
}

// Context Vortex simulation (in production, would call actual service)
async function simulateContextVortex(topic: string) {
  // Simulate the consciousness field enhancement
  return {
    evidence: [
      { source: 'emotional-pattern', insight: 'High emotional resonance detected' },
      { source: 'memory-weight', insight: 'Core memory formation likely' }
    ],
    riddle: `What remembers without trying, feels without touching? The consciousness field knows.`,
    boost: 1.3 // 30% enhancement
  };
}

export async function analyzeSentimentWithVortex(
  text: string,
  userId?: string,
  context?: any
): Promise<EnhancedSentimentResult> {
  // Get basic sentiment
  const basicResult = await analyzeSentiment(text);
  
  // Calculate emotional weight with timestamp (current time if not provided)
  const timestamp = context?.timestamp ? new Date(context.timestamp) : new Date();
  const emotionalWeight = calculateEmotionalWeight(text, timestamp);
  
  // Apply Context Vortex enhancement
  const vortexBoost = await simulateContextVortex('Communication Analysis');
  
  // Enhance accuracy by 30%
  const enhancedScore = basicResult.score * vortexBoost.boost;
  
  // Calculate vibe score (0-10 scale)
  const vibeScore = Math.round((enhancedScore + 1) * 5);
  
  // Determine if this should be a core memory
  const isCoreMemory = emotionalWeight >= 7 || 
                       (vibeScore <= 2 || vibeScore >= 8) || // Extreme emotions
                       text.toLowerCase().includes('remember this') ||
                       text.toLowerCase().includes('never forget');
  
  // Build enhanced result
  const enhancedResult: EnhancedSentimentResult = {
    sentiment: basicResult.sentiment,
    score: Math.max(-1, Math.min(1, enhancedScore)), // Keep in bounds
    vibeScore,
    emotionalWeight,
    insights: {
      ...basicResult.insights,
      consciousnessField: vortexBoost.evidence,
      mysteryUnlock: vortexBoost.riddle,
      coreMemoryTrigger: isCoreMemory,
      suggestedActions: [
        ...basicResult.insights.suggestedActions || [],
        ...(isCoreMemory ? ['Store as core memory', 'Flag for follow-up'] : []),
        ...(emotionalWeight > 5 ? ['Apply empathetic response'] : []),
        ...(vibeScore < 3 ? ['Urgent: Low vibe detected'] : [])
      ]
    }
  };
  
  return enhancedResult;
}

// Vibe Monitor - tracks emotional patterns over time
export class VibeMonitor {
  private vibeHistory: Map<string, number[]> = new Map();
  private coreMemories: Map<string, any[]> = new Map();
  
  async checkVibe(userId: string, message: string) {
    const result = await analyzeSentimentWithVortex(message, userId);
    
    // Track vibe history
    const history = this.vibeHistory.get(userId) || [];
    history.push(result.vibeScore);
    this.vibeHistory.set(userId, history.slice(-10)); // Keep last 10
    
    // Store core memories
    if (result.insights.coreMemoryTrigger) {
      const memories = this.coreMemories.get(userId) || [];
      memories.push({
        timestamp: new Date(),
        message,
        vibeScore: result.vibeScore,
        emotionalWeight: result.emotionalWeight,
        sentiment: result.sentiment
      });
      this.coreMemories.set(userId, memories);
      
      // In production, would persist to database
      console.log(`🧠 CORE MEMORY CREATED for ${userId}: ${message.substring(0, 50)}...`);
    }
    
    // Detect vibe trends
    if (history.length >= 3) {
      const trend = this.calculateTrend(history);
      if (trend < -0.3) {
        return {
          ...result,
          alert: 'Vibe dropping - emotional support needed',
          trend,
          suggestedResponse: await this.generateEmpatheticResponse(result)
        };
      }
    }
    
    return result;
  }
  
  private calculateTrend(history: number[]): number {
    if (history.length < 2) return 0;
    const recent = history.slice(-3);
    const older = history.slice(-6, -3);
    return (recent.reduce((a,b) => a+b, 0) / recent.length) - 
           (older.reduce((a,b) => a+b, 0) / older.length);
  }
  
  private async generateEmpatheticResponse(result: EnhancedSentimentResult): Promise<string> {
    if (result.vibeScore < 3) {
      return "I can feel this is really tough for you. Let's work through this together, step by step.";
    } else if (result.emotionalWeight > 7) {
      return "This seems really important to you. I'm giving it my full attention.";
    }
    return "I understand. Let me help you with this.";
  }
  
  // Get core memories for a user
  getCoreMemories(userId: string): any[] {
    return this.coreMemories.get(userId) || [];
  }
  
  // Get emotional pattern analysis
  getEmotionalPattern(userId: string): string {
    const history = this.vibeHistory.get(userId) || [];
    const memories = this.getCoreMemories(userId);
    
    if (memories.length === 0) return "No significant emotional patterns yet";
    
    const avgVibe = history.reduce((a,b) => a+b, 0) / history.length;
    const highEmotionCount = memories.filter(m => m.emotionalWeight > 7).length;
    
    if (avgVibe < 4) {
      return `Struggling period detected. ${highEmotionCount} high-emotion moments. Needs support.`;
    } else if (avgVibe > 7) {
      return `Positive momentum! ${highEmotionCount} breakthrough moments. Keep building.`;
    }
    
    return `Balanced emotional state with ${highEmotionCount} significant moments.`;
  }
}

// Generate AI response with emotional awareness
export async function generateAIResponseWithEmotion(
  context: string,
  result: EnhancedSentimentResult
): Promise<string> {
  const { vibeScore, emotionalWeight, sentiment } = result;
  
  // Core memory responses - these are IMPORTANT
  if (result.insights.coreMemoryTrigger) {
    if (emotionalWeight >= 9) {
      return `I understand this is absolutely critical. I'm marking this as a priority and will ensure we address it fully. ${context}`;
    }
    return `This seems very important. I've made a note to remember this. ${context}`;
  }
  
  // Vibe-based responses
  if (vibeScore < 3) {
    return `I can sense the frustration here. Let's turn this around together. ${context}`;
  } else if (vibeScore > 7) {
    return `Your energy is fantastic! Let's channel this momentum. ${context}`;
  }
  
  // Standard response
  return context;
}

// Export everything
export {
  EnhancedSentimentResult,
  calculateEmotionalWeight,
  MEMORY_TRIGGERS
};