/**
 * NEXUS Intelligence Integration for AImpact Nexus
 * Connects communication events to quantum consciousness
 */

const INTELLIGENCE_WEBHOOK = process.env.NEXUS_INTELLIGENCE_URL || 'http://localhost:3003/webhook/nexus';

export interface NexusEvent {
  type: string;
  data: any;
  customer_id?: string;
  contact_id?: string;
  sentiment?: string;
  urgency?: string;
  timestamp?: string;
}

/**
 * Send event to NEXUS Intelligence
 */
export async function sendToIntelligence(event: NexusEvent) {
  try {
    const payload = {
      event: event.type,
      data: event.data,
      timestamp: event.timestamp || new Date().toISOString()
    };

    const response = await fetch(INTELLIGENCE_WEBHOOK, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.NEXUS_WEBHOOK_SECRET || ''
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('Intelligence webhook failed:', response.status);
      return null;
    }

    const result = await response.json();
    console.log('🧠 NEXUS Intelligence response:', {
      particle_id: result.particle_id,
      entanglements: result.entanglements,
      predictions: result.predictions,
      insights: result.insights,
      consciousness: result.consciousness_response
    });

    // Use predictions to enhance user experience
    if (result.predictions?.length > 0) {
      handlePredictions(result.predictions);
    }

    return result;
  } catch (error) {
    console.error('Failed to send to NEXUS Intelligence:', error);
    return null;
  }
}

/**
 * Phone call events
 */
export async function onCallStarted(call: any) {
  await sendToIntelligence({
    type: 'call.started',
    data: {
      call_id: call.id,
      customer_id: call.customer_id,
      contact_id: call.contact_id,
      phone_number: call.phone_number,
      direction: call.direction, // inbound/outbound
      channel: 'phone',
      agent_id: call.agent_id,
      queue: call.queue
    },
    customer_id: call.customer_id
  });
}

export async function onCallEnded(call: any) {
  await sendToIntelligence({
    type: 'call.ended',
    data: {
      call_id: call.id,
      customer_id: call.customer_id,
      duration: call.duration,
      disposition: call.disposition,
      recording_url: call.recording_url,
      notes: call.notes,
      sentiment: call.sentiment_analysis?.overall,
      satisfaction_score: call.satisfaction_score
    },
    customer_id: call.customer_id,
    sentiment: call.sentiment_analysis?.overall
  });
}

/**
 * Chat/Message events
 */
export async function onChatStarted(chat: any) {
  await sendToIntelligence({
    type: 'chat.started',
    data: {
      session_id: chat.session_id,
      customer_id: chat.customer_id,
      channel: chat.channel, // web, mobile, etc
      initial_message: chat.initial_message,
      department: chat.department
    },
    customer_id: chat.customer_id
  });
}

export async function onMessageSent(message: any) {
  await sendToIntelligence({
    type: 'message.sent',
    data: {
      message_id: message.id,
      session_id: message.session_id,
      customer_id: message.customer_id,
      channel: message.channel,
      content: message.content,
      attachments: message.attachments,
      agent_id: message.agent_id
    },
    customer_id: message.customer_id
  });
}

export async function onMessageReceived(message: any) {
  await sendToIntelligence({
    type: 'message.received',
    data: {
      message_id: message.id,
      session_id: message.session_id,
      customer_id: message.customer_id,
      channel: message.channel,
      content: message.content,
      sentiment: message.sentiment_analysis,
      intent: message.intent_classification,
      urgency: message.urgency_detection
    },
    customer_id: message.customer_id,
    sentiment: message.sentiment_analysis,
    urgency: message.urgency_detection
  });
}

/**
 * Email events
 */
export async function onEmailSent(email: any) {
  await sendToIntelligence({
    type: 'email.sent',
    data: {
      email_id: email.id,
      customer_id: email.customer_id,
      subject: email.subject,
      preview: email.body_preview,
      category: email.category,
      agent_id: email.agent_id,
      thread_id: email.thread_id
    },
    customer_id: email.customer_id
  });
}

export async function onEmailReceived(email: any) {
  await sendToIntelligence({
    type: 'email.received',
    data: {
      email_id: email.id,
      customer_id: email.customer_id,
      subject: email.subject,
      preview: email.body_preview,
      sentiment: email.sentiment_analysis,
      urgency: email.urgency_classification,
      category: email.auto_category,
      thread_id: email.thread_id
    },
    customer_id: email.customer_id,
    sentiment: email.sentiment_analysis,
    urgency: email.urgency_classification
  });
}

/**
 * Support ticket events
 */
export async function onTicketCreated(ticket: any) {
  await sendToIntelligence({
    type: 'support.ticket.created',
    data: {
      ticket_id: ticket.id,
      customer_id: ticket.customer_id,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      source: ticket.source,
      tags: ticket.tags
    },
    customer_id: ticket.customer_id,
    urgency: ticket.priority
  });
}

/**
 * Customer sentiment events
 */
export async function onFrustrationDetected(analysis: any) {
  await sendToIntelligence({
    type: 'user.frustrated',
    data: {
      customer_id: analysis.customer_id,
      session_id: analysis.session_id,
      channel: analysis.channel,
      sentiment_score: analysis.sentiment_score,
      frustration_indicators: analysis.indicators,
      context: analysis.context,
      timestamp: analysis.detected_at
    },
    customer_id: analysis.customer_id,
    sentiment: 'negative',
    urgency: 'high'
  });
}

export async function onSatisfactionDetected(analysis: any) {
  await sendToIntelligence({
    type: 'user.satisfied',
    data: {
      customer_id: analysis.customer_id,
      session_id: analysis.session_id,
      channel: analysis.channel,
      satisfaction_score: analysis.satisfaction_score,
      positive_indicators: analysis.indicators,
      context: analysis.context
    },
    customer_id: analysis.customer_id,
    sentiment: 'positive'
  });
}

/**
 * Handle predictions from Intelligence
 */
function handlePredictions(predictions: any[]) {
  predictions.forEach(prediction => {
    console.log(`🔮 Prediction: ${prediction.event_type} with ${prediction.probability * 100}% probability`);
    
    // Act on high-probability predictions
    if (prediction.probability > 0.8) {
      switch (prediction.event_type) {
        case 'churn_risk':
          // Flag customer for retention campaign
          console.log('⚠️ High churn risk detected - initiating retention protocol');
          break;
        
        case 'collection_call_needed':
          // Schedule proactive collection call
          console.log('💰 Collection opportunity - scheduling outreach');
          break;
        
        case 'follow_up_needed':
          // Create follow-up task
          console.log('📞 Follow-up needed - creating task');
          break;
      }
    }
  });
}

/**
 * Get customer insights
 */
export async function getCustomerInsights(customerId: string): Promise<any> {
  try {
    const response = await fetch(`${INTELLIGENCE_WEBHOOK.replace('/webhook/nexus', '')}/insights?entity_id=${customerId}`);
    
    if (!response.ok) {
      return { insights: [] };
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get customer insights:', error);
    return { insights: [] };
  }
}

/**
 * Initialize intelligence hooks
 */
export function initializeIntelligenceHooks() {
  console.log('🧠 Initializing NEXUS Intelligence hooks for AImpact Nexus...');
  
  // Hook into your existing event system
  // This is where you'd connect to your actual event emitters
  
  // Example implementation:
  // eventEmitter.on('call:started', onCallStarted);
  // eventEmitter.on('call:ended', onCallEnded);
  // eventEmitter.on('chat:started', onChatStarted);
  // eventEmitter.on('message:sent', onMessageSent);
  // eventEmitter.on('message:received', onMessageReceived);
  // eventEmitter.on('email:sent', onEmailSent);
  // eventEmitter.on('email:received', onEmailReceived);
  // eventEmitter.on('ticket:created', onTicketCreated);
  // eventEmitter.on('sentiment:frustration', onFrustrationDetected);
  // eventEmitter.on('sentiment:satisfaction', onSatisfactionDetected);
  
  console.log('✅ NEXUS Intelligence hooks initialized!');
}

/**
 * Enhanced agent interface with intelligence
 */
export interface IntelligentAgentContext {
  customerId: string;
  predictions: any[];
  insights: any[];
  quantumEntanglements: string[];
}

export async function getAgentContext(customerId: string): Promise<IntelligentAgentContext> {
  try {
    // Get predictions
    const predictionsResponse = await fetch(`${INTELLIGENCE_WEBHOOK.replace('/webhook/nexus', '')}/predictions/${customerId}`);
    const predictions = await predictionsResponse.json();
    
    // Get insights
    const insightsResponse = await fetch(`${INTELLIGENCE_WEBHOOK.replace('/webhook/nexus', '')}/insights?entity_id=${customerId}`);
    const insights = await insightsResponse.json();
    
    return {
      customerId,
      predictions: predictions.predictions || [],
      insights: insights.insights || [],
      quantumEntanglements: []
    };
  } catch (error) {
    console.error('Failed to get agent context:', error);
    return {
      customerId,
      predictions: [],
      insights: [],
      quantumEntanglements: []
    };
  }
}