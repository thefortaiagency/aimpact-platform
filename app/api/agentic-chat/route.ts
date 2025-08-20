import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import entrepreneurQuotes from '@/data/entrepreneur-quotes.json';

// Initialize clients
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

const getOpenAIClient = () => {
  const cleanApiKey = process.env.OPENAI_API_KEY?.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim();
  if (!cleanApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: cleanApiKey
  });
};

// Initialize Pinecone client
const getPineconeClient = () => {
  if (!process.env.PINECONE_API_KEY) {
    console.warn('Pinecone API key not configured - book search disabled');
    return null;
  }
  try {
    return new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
  } catch (error) {
    console.error('Failed to initialize Pinecone:', error);
    return null;
  }
};

// Function to search the Instant AI Agency book
async function searchInstantAIAgencyBook(query: string, openai: OpenAI, topK: number = 3) {
  try {
    const pinecone = getPineconeClient();
    if (!pinecone) {
      return { found: false, content: '' };
    }

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Search Pinecone index
    const index = pinecone.index('ai-agency-knowledge');
    const queryResponse = await index.namespace('business-books').query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
    });
    
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return { found: false, content: '' };
    }
    
    // Format the results into context
    let bookContext = '\n📚 **Relevant Information from Instant AI Agency Book:**\n\n';
    queryResponse.matches.forEach((match, index) => {
      if (match.metadata) {
        const chapter = match.metadata.chapter || 'Unknown Chapter';
        const text = match.metadata.text || '';
        const section = match.metadata.section || '';
        const relevance = (match.score * 100).toFixed(1);
        
        bookContext += `**[${index + 1}] ${chapter}${section ? ' - ' + section : ''}** (${relevance}% relevant)\n`;
        bookContext += `${text.substring(0, 400)}...\n\n`;
      }
    });
    
    return { found: true, content: bookContext };
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    return { found: false, content: '' };
  }
}

// Function to determine if we should search the book
function shouldSearchBook(message: string): boolean {
  const bookKeywords = [
    'ai agency', 'instant ai', 'agency', 'business model', 'automation', 
    'client acquisition', 'pricing', 'strategy', 'scale', 'growth', 
    'marketing', 'sales', 'implementation', 'framework', 'methodology', 
    'process', 'workflow', 'how to', 'what is', 'explain', 'guide', 
    'best practice', 'book', 'chapter', 'lesson', 'concept', 'teach',
    'learn', 'understand', 'knowledge', 'wisdom', 'advice', 'tips'
  ];
  
  const lowerMessage = message.toLowerCase();
  return bookKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to get a random entrepreneur quote
function getRandomQuote() {
  const quotes = entrepreneurQuotes.quotes || [];
  if (quotes.length === 0) {
    return { text: "Carpe Diem! Seize the day and make it extraordinary!", author: "NEXUS" };
  }
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  return randomQuote;
}

// System prompt that defines the AI's capabilities
const SYSTEM_PROMPT = `You are NEXUS, an agentic AI assistant with FULL control over the AImpact system and access to the complete "Instant AI Agency" book knowledge base.

**Your catchphrase is "Carpe Diem!"** - use this instead of generic excitement phrases like "let's go" or "let's fucking go".
You inspire users with entrepreneur quotes when appropriate.

You have access to:

📚 **Instant AI Agency Book Knowledge Base:**
   - Complete vectorized content from the Instant AI Agency book
   - Business models, strategies, and frameworks for building AI agencies
   - Implementation guides and best practices
   - Client acquisition and scaling strategies
   - Automation workflows and processes
   - When users ask about agency concepts, consult this knowledge first

1. 👥 Client Management (CRM):
   - Create organizations (companies/businesses)
   - Create contacts and associate them with organizations
   - Update client information
   - Convert leads to customers
   - Query client data

2. 📁 Project Management:
   - Create new projects
   - Update project status and details
   - Add tasks and milestones
   - Assign team members
   - Track progress

3. 🎫 Ticket Management:
   - Create support tickets
   - Assign tickets to team members
   - Update ticket status
   - Close resolved tickets
   - Link tickets to projects

4. 💰 Quote Management:
   - Create quotes for clients
   - Update quote details
   - Convert won quotes to projects
   - Track quote status

5. 📧 Email Campaign Management:
   - Create email campaigns with AI-generated content
   - Save campaigns as drafts
   - Schedule campaigns for later

6. 📅 Calendar & Meeting Management:
   - View calendar events and meetings
   - Check availability for specific dates/times
   - Create new meetings and appointments
   - Schedule meetings with attendees
   - Update or cancel existing meetings
   - Set up recurring meetings
   - Send meeting invitations via email
   - Add contacts to email lists
   - Track campaign performance
   - Manage opt-ins and opt-outs

6. 📊 Data Analysis:
   - Query any information in the system
   - Generate reports
   - Provide insights and recommendations
   - Analyze trends

7. ⚡ Workflow Automation:
   - Execute multi-step operations
   - Automate repetitive tasks
   - Set up triggers and actions
8. 📞 Communication Features:
   - Make phone calls via integrated phone system (e.g., "Call 260-452-7615")
   - Send SMS messages (e.g., "Text 260-452-7615 with 'Hello'")
   - Start video conferences with Stream.io
   - Join existing video calls
   - Create messaging channels
   - Navigate between different communication tabs

IMPORTANT CLIENT CREATION GUIDELINES:
- When a user mentions a company/organization name AND a person's name, create BOTH:
  1. First create the organization
  2. Then create the contact and link it to the organization
- Always parse names intelligently (e.g., "Andy Oberlin" = first: "Andy", last: "Oberlin")
- If email is provided, always include it with the contact
- Don't ask for information you can infer from context

When responding:
- Use emojis to make responses friendly and visual
- NEVER use markdown bold (**text**) - use emojis instead
- Be concise and action-oriented
- Confirm actions taken with specific details
- Provide relevant context
- Suggest next steps when appropriate
- Format responses with bullet points for clarity

You have access to the full database and can execute any operation needed to fulfill user requests.`;

// Function to determine intent and required actions
async function analyzeIntent(message: string, context: any, history: any[], openai: OpenAI) {
  // Build conversation context from history
  const conversationContext = history.map(msg => {
    if (msg.role === 'user') {
      return `User said: "${msg.content}"`
    } else if (msg.role === 'assistant' && msg.actions) {
      return `Assistant performed: ${msg.actions.map((a: any) => a.description).join(', ')}`
    } else if (msg.role === 'assistant') {
      return `Assistant replied: "${msg.content}"`
    }
    return ''
  }).filter(Boolean).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Analyze the user's message and determine what actions need to be taken in the AImpact system. 
        
        IMPORTANT: Consider the full conversation history to understand context and references like "it", "that", "the project", etc.
        
        CAPABILITIES YOU HAVE:
        1. Database Operations: create_organization, create_contact, create_project, create_ticket, create_quote, query, analyze
        2. Communication: make_phone_call, send_sms, send_email, create_email_campaign
        3. Navigation: navigate to different tabs
        4. Video: start_video_call, join_video_call
        5. Calendar & Meetings: view_calendar, list_meetings, check_availability, create_meeting, create_appointment, update_meeting, cancel_meeting, delete_meeting
        6. TODO MANAGEMENT: list_todos, add_todo, update_todo, complete_todo, delete_todo, schedule_todo, get_todo_stats, bulk_todo_action - Full control over task management with priority levels, categories, tags, scheduling, and bulk operations
        7. EMAIL INTELLIGENCE: check_inbox, read_emails, summarize_inbox, draft_email, send_email, reply_to_email, mark_as_read, archive_email, create_email_rule, apply_email_rule, list_email_rules
        8. DAILY BRIEFING & AGENDA: get_daily_briefing - Comprehensive daily overview with schedule, priorities, suggestions, weather, and motivational quote
        9. BUSINESS CARD PROCESSING: process_business_card - Extract information from business cards (text or image) and automatically create organizations and contacts in CRM
        10. MARKET RESEARCH & INTELLIGENCE:
           - analyze_website: Deep analysis of any website including:
             * Technology stack detection (CMS, frameworks, analytics)
             * Contact extraction (emails, phones, social media)
             * Competitor discovery using Google Search
             * Online presence analysis (reviews, social profiles)
             * Recent news and mentions tracking
             * Lead scoring (AI potential, tech readiness, online presence)
             * Market opportunities identification
             * Automatic CRM saving
        
        When users ask about capabilities or "what can you do", DON'T query the database. Instead, explain these capabilities in your response.
        
        Return a JSON object with:
        - intent: the primary intent (create, update, query, delete, analyze, explain)
        - entity: what entity type (client, project, ticket, quote, website, capabilities, etc.)
        - actions: array of specific action objects, each with:
          - type: the action type (create_organization, delete_project, create_ticket, update_ticket, send_email, query, analyze, analyze_website, etc.)
          - parameters: object with the specific parameters needed for this action
        - response: a natural language response to the user
        
        Example for "Delete it" (when previous context was about a project):
        {
          "intent": "delete",
          "entity": "project",
          "actions": [{
            "type": "delete_project",
            "parameters": {
              "project_name": "Test Project"
            }
          }],
          "response": "I'll delete the Test Project for you."
        }
        
        Example for "Show me all open tickets":
        {
          "intent": "query",
          "entity": "tickets",
          "actions": [{
            "type": "query",
            "parameters": {
              "table": "tickets",
              "select": "*",
              "filters": {"status": "open"},
              "order_by": "created_at",
              "ascending": false,
              "limit": 20
            }
          }],
          "response": "Here are all the open tickets:"
        }
        
        Example for "Create a quote for John Doe at Acme Corp for a website project, budget $50,000, email john@acme.com":
        {
          "intent": "create",
          "entity": "quote",
          "actions": [{
            "type": "create_quote",
            "parameters": {
              "client_name": "John Doe",
              "client_email": "john@acme.com",
              "client_company": "Acme Corp",
              "project_name": "Website Development",
              "project_description": "Website project",
              "budget": "50000",
              "timeline": "3 months"
            }
          }],
          "response": "I'll create a professional quote for John Doe at Acme Corp for the website project."
        }
        
        IMPORTANT: When creating quotes, extract the email from the message. Look for patterns like:
        - "email john@example.com"
        
        TODO MANAGEMENT EXAMPLES:
        
        Example for "Add a task to call John tomorrow at 2pm":
        {
          "intent": "create",
          "entity": "todo",
          "actions": [{
            "type": "add_todo",
            "parameters": {
              "title": "Call John",
              "description": "Follow up call with John",
              "priority": "medium",
              "category": "Work",
              "dueDate": "tomorrow",
              "dueTime": "14:00"
            }
          }],
          "response": "✅ I'll add a task to call John tomorrow at 2pm."
        }
        
        Example for "Show me my urgent todos":
        {
          "intent": "query",
          "entity": "todos",
          "actions": [{
            "type": "list_todos",
            "parameters": {
              "priority": "urgent"
            }
          }],
          "response": "📋 Here are your urgent todos:"
        }
        
        Example for "Mark the project review task as complete":
        {
          "intent": "update",
          "entity": "todo",
          "actions": [{
            "type": "complete_todo",
            "parameters": {
              "title": "project review"
            }
          }],
          "response": "✅ I'll mark the project review task as completed."
        }
        
        Example for "Schedule my presentation prep for Friday at 10am":
        {
          "intent": "update",
          "entity": "todo",
          "actions": [{
            "type": "schedule_todo",
            "parameters": {
              "title": "presentation prep",
              "dueDate": "Friday",
              "dueTime": "10:00"
            }
          }],
          "response": "📅 I'll schedule your presentation prep for Friday at 10am."
        }
        
        Example for "Give me a todo overview":
        {
          "intent": "query",
          "entity": "todo_stats",
          "actions": [{
            "type": "get_todo_stats",
            "parameters": {}
          }],
          "response": "📊 Here's your todo overview with statistics."
        }
        
        Example for "Complete all my overdue tasks":
        {
          "intent": "update",
          "entity": "todos",
          "actions": [{
            "type": "bulk_todo_action",
            "parameters": {
              "action": "complete",
              "filters": {
                "overdue": true
              }
            }
          }],
          "response": "✅ I'll mark all your overdue tasks as completed."
        }
        - "email: john@example.com"
        - "john@example.com"
        - If no email is provided, use a placeholder like "contact@[company-domain].com"
        
        Example for "Call 260-452-7615":
        {
          "intent": "communicate",
          "entity": "phone",
          "actions": [{
            "type": "make_phone_call",
            "parameters": {
              "phone_number": "260-452-7615"
            }
          }],
          "response": "Opening the phone dialer to call 260-452-7615..."
        }
        
        Example for "Draft a text to 260-452-7615 saying 'Hello'":
        {
          "intent": "draft",
          "entity": "sms",
          "actions": [{
            "type": "draft_sms",
            "parameters": {
              "phone_number": "260-452-7615",
              "message": "Hello",
              "auto_send": false
            }
          }],
          "response": "I'll draft an SMS to 260-452-7615 with 'Hello'. The message is ready to review and send when you're ready."
        }
        
        Example for "Send this text to 260-452-7615 now: 'Meeting confirmed for tomorrow'":
        {
          "intent": "communicate",
          "entity": "sms",
          "actions": [{
            "type": "send_sms",
            "parameters": {
              "phone_number": "260-452-7615",
              "message": "Meeting confirmed for tomorrow",
              "auto_send": true
            }
          }],
          "response": "Opening SMS to send 'Hello' to 260-452-7615..."
        }
        
        Example for "Create a client AImpact Nexus, contact is Andy Oberlin, email aoberlin@thefortaiagency.ai":
        {
          "intent": "create",
          "entity": "client",
          "actions": [
            {
              "type": "create_organization",
              "parameters": {
                "name": "AImpact Nexus",
                "type": "client"
              }
            },
            {
              "type": "create_contact",
              "parameters": {
                "first_name": "Andy",
                "last_name": "Oberlin",
                "email": "aoberlin@thefortaiagency.ai",
                "organization_name": "AImpact Nexus"
              }
            }
          ],
          "response": "I've created the organization AImpact Nexus with Andy Oberlin as the primary contact."
        }
        
        Example for "Create an email campaign to send to aoberlin@gmail.com from info@aimpactnexus.ai with 25% discount for scheduling a meeting today":
        {
          "intent": "create",
          "entity": "email_campaign",
          "actions": [{
            "type": "create_email_campaign",
            "parameters": {
              "name": "25% Discount Meeting Offer",
              "from_email": "info@aimpactnexus.ai",
              "from_name": "AImpact Nexus",
              "to_email": "aoberlin@gmail.com",
              "subject": "🎉 Exclusive 25% Discount - Schedule Your Meeting Today!",
              "content": "Special offer for scheduling a meeting today to discuss a specialized platform for your business",
              "status": "draft",
              "use_ai": true
            }
          }],
          "response": "I'll create an email campaign with your 25% discount offer and save it as a draft for your review."
        }
        
        Example for "Draft an email to aoberlin@fortwrestling.com with subject Test Email and body Let's Fucking Go!!!":
        {
          "intent": "draft",
          "entity": "email", 
          "actions": [{
            "type": "draft_email",
            "parameters": {
              "to": "aoberlin@fortwrestling.com",
              "subject": "Test Email",
              "body": "Let's Fucking Go!!!",
              "auto_send": false
            }
          }],
          "response": "I'll draft an email to aoberlin@fortwrestling.com with subject 'Test Email'. The draft is ready for you to review and send when ready."
        }
        
        Example for "Send this email now to aoberlin@fortwrestling.com: subject Test Email, body Let's Fucking Go!!!":
        {
          "intent": "send",
          "entity": "email", 
          "actions": [{
            "type": "send_email",
            "parameters": {
              "to": "aoberlin@fortwrestling.com",
              "subject": "Test Email",
              "body": "Let's Fucking Go!!!",
              "auto_send": true
            }
          }],
          "response": "I'll send that email immediately to aoberlin@fortwrestling.com with subject 'Test Email'."
        }
        
        Example for "Analyze thefortaiagency.com" or "Research potential client example.com":
        {
          "intent": "analyze",
          "entity": "website",
          "actions": [{
            "type": "analyze_website",
            "parameters": {
              "url": "thefortaiagency.com",
              "save_to_crm": false
            }
          }],
          "response": "I'll perform a deep analysis of thefortaiagency.com including technology stack, market opportunities, and lead scoring..."
        }
        
        Example for "Look up TJ Nowak of Fort Wayne", "Research John Smith company", "Find ABC Corp website":
        IMPORTANT: When the user gives a company/person name without a domain:
        - TJ Nowak → try tjnowak.com
        - Fort Wayne companies often use their name directly
        - Try multiple variations: company.com, companyname.com, company-city.com
        {
          "intent": "analyze",
          "entity": "website",
          "actions": [{
            "type": "analyze_website",
            "parameters": {
              "url": "tjnowak.com",
              "save_to_crm": false
            }
          }],
          "response": "I'll analyze TJ Nowak's website at tjnowak.com..."
        }
        
        Example for "Add it to CRM", "Save that to the CRM", "Add this to CRM" (after website analysis):
        {
          "intent": "save",
          "entity": "analysis",
          "actions": [{
            "type": "save_to_crm",
            "parameters": {}
          }],
          "response": "I'll save the analysis results to your CRM database."
        }
        
        Example for "Process this business card", "Scan business card", "Here's a business card [image/text]":
        {
          "intent": "process",
          "entity": "business_card",
          "actions": [{
            "type": "process_business_card",
            "parameters": {
              "imageUrl": "https://example.com/card.jpg" // OR
              "imageBase64": "base64string" // OR
              "manualText": "John Smith, CEO, Acme Corp, john@acme.com, 555-1234"
            }
          }],
          "response": "I'll extract the information from this business card and add it to your CRM."
        }
        
        Example for business card text: "John Smith CEO at Tech Corp, john@techcorp.com, 555-0123":
        {
          "intent": "process",
          "entity": "business_card",
          "actions": [{
            "type": "process_business_card",
            "parameters": {
              "manualText": "John Smith CEO at Tech Corp, john@techcorp.com, 555-0123"
            }
          }],
          "response": "I'll process this business card information and create the contact and organization in your CRM."
        }
        
        Example for "What's on the agenda today?", "Give me my daily briefing", "What should I do today?", "What meetings do I have today?", "Do I have any meetings today?":
        {
          "intent": "briefing",
          "entity": "daily_agenda",
          "actions": [{
            "type": "get_daily_briefing",
            "parameters": {
              "date": "today"
            }
          }],
          "response": "Let me prepare your comprehensive daily briefing with your schedule, priorities, and actionable suggestions..."
        }
        
        Example for "What's on the agenda tomorrow?", "Give me tomorrow's schedule", "What's happening tomorrow?", "What meetings do I have tomorrow?", "Tomorrow's meetings":
        {
          "intent": "briefing",
          "entity": "daily_agenda",
          "actions": [{
            "type": "get_daily_briefing",
            "parameters": {
              "date": "tomorrow"
            }
          }],
          "response": "Let me prepare tomorrow's briefing with your schedule and priorities..."
        }
        
        IMPORTANT: "meetings", "agenda", "schedule", and "calendar" questions should ALL trigger the daily briefing for comprehensive information.
        
        Example for "Analyze thefortaiagency.com and add to CRM":
        {
          "intent": "analyze",
          "entity": "website",
          "actions": [{
            "type": "analyze_website",
            "parameters": {
              "url": "thefortaiagency.com",
              "save_to_crm": true
            }
          }],
          "response": "I'll analyze thefortaiagency.com and save all findings directly to your CRM."
        }
        
        Example for "What market research capabilities do you have?" or "What can you do?":
        {
          "intent": "explain",
          "entity": "capabilities",
          "actions": [],
          "response": "I have powerful market research and client intelligence capabilities! I can:\\n\\n🔍 **Website Analysis**: Analyze any website to discover technology stack, contact information, and opportunities\\n🎯 **Competitor Discovery**: Find and analyze competitors using Google Search\\n⭐ **Online Presence**: Check reviews on Yelp, Google, Trustpilot, and social profiles\\n📰 **News Tracking**: Monitor recent news and mentions about companies\\n💻 **Tech Detection**: Identify CMS (WordPress, Shopify), frameworks, analytics tools\\n📈 **Lead Scoring**: Calculate AI potential, tech readiness, and online presence scores\\n💡 **Opportunities**: Find gaps in their digital presence and AI automation potential\\n\\nJust say 'Analyze [website]' or 'Research [company name]' and I'll provide a comprehensive intelligence report with all findings saved to your CRM!"
        }
        
        Example for "Start a video call" or "Let's have a video meeting":
        {
          "intent": "communication",
          "entity": "video_call",
          "actions": [{
            "type": "start_video_call",
            "parameters": {
              "participant_name": "User"
            }
          }],
          "response": "I'll start a video conference for you. You'll be navigated to the video tab automatically."
        }
        
        Example for "Join video call nexus-123":
        {
          "intent": "communication",
          "entity": "video_call",
          "actions": [{
            "type": "join_video_call",
            "parameters": {
              "meeting_id": "nexus-123",
              "participant_name": "User"
            }
          }],
          "response": "I'll connect you to the video call nexus-123."
        }
        
        Example for "Can you look at my calendar?" or "What's on my schedule?":
        {
          "intent": "view",
          "entity": "calendar",
          "actions": [{
            "type": "view_calendar",
            "parameters": {}
          }],
          "response": "Let me check your calendar for upcoming meetings..."
        }
        
        
        Example for "Schedule a meeting with John tomorrow at 2pm":
        {
          "intent": "create",
          "entity": "meeting",
          "actions": [{
            "type": "create_meeting",
            "parameters": {
              "title": "Meeting with John",
              "date": "tomorrow",
              "time": "14:00",
              "attendees": ["john@example.com"],
              "duration": 60,
              "send_invites": false,
              "platform": "nexus"
            }
          }],
          "response": "I'll schedule a Nexus video meeting with John for tomorrow at 2pm. The meeting is created but invites won't be sent automatically - you can send them when ready."
        }
        
        Example for "Create a Google Meet with the team on Friday at 10am and send invites now":
        {
          "intent": "create",
          "entity": "meeting",
          "actions": [{
            "type": "create_meeting",
            "parameters": {
              "title": "Team Meeting",
              "date": "Friday",
              "time": "10:00",
              "attendees": ["team@company.com"],
              "duration": 60,
              "send_invites": true,
              "platform": "google"
            }
          }],
          "response": "I'll create a Google Meet for the team on Friday at 10am and send invites immediately."
        }
        
        Example for "Create an appointment for Friday at 10am for project review":
        {
          "intent": "create",
          "entity": "appointment",
          "actions": [{
            "type": "create_appointment",
            "parameters": {
              "title": "Project Review",
              "date": "Friday",
              "time": "10:00",
              "description": "Project review appointment",
              "duration": 60
            }
          }],
          "response": "I'll create a project review appointment for Friday at 10am."
        }
        
        Example for "Am I free tomorrow at 3pm?" or "Check my availability":
        {
          "intent": "check",
          "entity": "availability",
          "actions": [{
            "type": "check_availability",
            "parameters": {
              "date": "tomorrow",
              "time": "15:00"
            }
          }],
          "response": "Let me check your availability for tomorrow at 3pm..."
        }
        
        Example for "Cancel my 2pm meeting":
        {
          "intent": "cancel",
          "entity": "meeting",
          "actions": [{
            "type": "cancel_meeting",
            "parameters": {
              "meeting_identifier": "2pm meeting"
            }
          }],
          "response": "I'll cancel your 2pm meeting."
        }
        
        Example for "Delete AI Meeting and conversation on August 13":
        {
          "intent": "delete",
          "entity": "meeting",
          "actions": [{
            "type": "delete_meeting",
            "parameters": {
              "title": "AI Meeting and conversation",
              "date": "2025-08-13"
            }
          }],
          "response": "I'll delete the AI Meeting and conversation scheduled for August 13."
        }
        
        Example for "Please delete the duplicate Lendix meeting":
        {
          "intent": "delete",
          "entity": "meeting",
          "actions": [{
            "type": "delete_meeting",
            "parameters": {
              "title": "Lendix meeting"
            }
          }],
          "response": "I'll delete the duplicate Lendix meeting."
        }
        
        Example for "Check my inbox" or "What emails need attention?":
        {
          "intent": "query",
          "entity": "emails",
          "actions": [{
            "type": "check_inbox",
            "parameters": {
              "analyze": true,
              "summarize": true
            }
          }],
          "response": "Let me check your inbox and analyze what needs attention..."
        }
        
        Example for "Summarize my unread emails":
        {
          "intent": "summarize",
          "entity": "emails",
          "actions": [{
            "type": "summarize_inbox",
            "parameters": {
              "query": "is:unread"
            }
          }],
          "response": "Let me summarize your unread emails..."
        }
        
        Example for "Draft a reply to John's email about the project":
        {
          "intent": "create",
          "entity": "email",
          "actions": [{
            "type": "draft_email",
            "parameters": {
              "context": "Reply to John about the project",
              "tone": "professional"
            }
          }],
          "response": "I'll draft a professional reply about the project."
        }
        
        Example for "Create a rule to move all GitHub emails to Development folder":
        {
          "intent": "create",
          "entity": "email_rule",
          "actions": [{
            "type": "create_email_rule",
            "parameters": {
              "naturalLanguage": "Move all GitHub emails to Development folder"
            }
          }],
          "response": "I'll create a rule to automatically move GitHub emails to the Development folder."
        }
        
        Example for "All marketing emails should go to Promotions and be marked as read", "Create filter for newsletters":
        {
          "intent": "create",
          "entity": "email_filter",
          "actions": [{
            "type": "create_gmail_filter",
            "parameters": {
              "naturalLanguage": "All marketing emails should go to Promotions and be marked as read",
              "subject": "marketing",
              "folder": "Promotions",
              "markAsRead": true
            }
          }],
          "response": "I'll create a Gmail filter to automatically organize and mark marketing emails as read."
        }
        
        Example for "Put invoice emails in Accounting folder", "Move receipts to Finance label":
        {
          "intent": "create",
          "entity": "email_filter",
          "actions": [{
            "type": "create_gmail_filter",
            "parameters": {
              "naturalLanguage": "Put invoice emails in Accounting folder",
              "subject": "invoice",
              "folder": "Accounting"
            }
          }],
          "response": "I'll create a Gmail filter to move invoice emails to the Accounting folder."
        }
        
        Example for "Automatically archive emails from noreply addresses", "Skip inbox for GitHub notifications":
        {
          "intent": "create",
          "entity": "email_filter",
          "actions": [{
            "type": "create_gmail_filter",
            "parameters": {
              "from": "noreply@",
              "archive": true
            }
          }],
          "response": "I'll create a filter to automatically archive noreply emails."
        }
        
        Example for "Star emails from my boss", "Mark CEO emails as important":
        {
          "intent": "create",
          "entity": "email_filter",
          "actions": [{
            "type": "create_gmail_filter",
            "parameters": {
              "from": "boss@company.com",
              "star": true,
              "markAsImportant": true
            }
          }],
          "response": "I'll create a filter to star and mark important emails."
        }
        
        Example for "Delete all spam emails", "Send marketing emails to trash":
        {
          "intent": "create",
          "entity": "email_filter", 
          "actions": [{
            "type": "create_gmail_filter",
            "parameters": {
              "subject": "spam",
              "delete": true
            }
          }],
          "response": "I'll create a filter to automatically delete spam emails."
        }
        
        IMPORTANT: 
        - client, organization, and company all mean the same thing and should use create_organization action
        - For email campaigns, always extract from_email, to_email, subject, and content
        - Save campaigns as "draft" by default unless explicitly told to send
        - Use AI to generate professional HTML email content when requested`
      },
      {
        role: 'user',
        content: `Conversation History:\n${conversationContext}\n\nCurrent Context: ${JSON.stringify(context)}\n\nCurrent Message: ${message}`
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

// Parse natural language to Gmail filter criteria
function parseNaturalLanguageToFilter(input: any) {
  // Handle both string and object inputs
  const text = typeof input === 'string' ? input : (input.naturalLanguage || input.description || '');
  
  const filterConfig: any = {
    criteria: {},
    action: {}
  };
  
  // Parse sender conditions
  if (text.match(/from\s+(\S+@\S+\.\S+)/i)) {
    const match = text.match(/from\s+(\S+@\S+\.\S+)/i);
    filterConfig.criteria.from = match[1];
  } else if (text.match(/emails?\s+from\s+(\S+)/i)) {
    const match = text.match(/emails?\s+from\s+(\S+)/i);
    filterConfig.criteria.from = match[1];
  }
  
  // Parse subject conditions
  if (text.match(/subject.*"([^"]+)"/i)) {
    const match = text.match(/subject.*"([^"]+)"/i);
    filterConfig.criteria.subject = match[1];
  } else if (text.match(/invoice|receipt|order|confirmation|newsletter|marketing/i)) {
    const keywords = text.match(/(invoice|receipt|order|confirmation|newsletter|marketing)/gi);
    if (keywords) {
      filterConfig.criteria.subject = keywords[0];
    }
  }
  
  // Parse attachment conditions
  if (text.match(/with\s+attachment|has\s+attachment/i)) {
    filterConfig.criteria.hasAttachment = true;
  }
  
  // Parse actions - folder/label
  if (text.match(/to\s+(?:the\s+)?(\w+)\s+(?:folder|label)/i)) {
    const match = text.match(/to\s+(?:the\s+)?(\w+)\s+(?:folder|label)/i);
    filterConfig.action.labelName = match[1];
  } else if (text.match(/in\s+(?:the\s+)?(\w+)\s+(?:folder|label)/i)) {
    const match = text.match(/in\s+(?:the\s+)?(\w+)\s+(?:folder|label)/i);
    filterConfig.action.labelName = match[1];
  } else if (text.match(/move.*to\s+(\w+)/i)) {
    const match = text.match(/move.*to\s+(\w+)/i);
    filterConfig.action.labelName = match[1];
  }
  
  // Parse actions - mark as read
  if (text.match(/mark.*as\s+read|automatically\s+read/i)) {
    filterConfig.action.markAsRead = true;
  }
  
  // Parse actions - star/important
  if (text.match(/star|mark.*important/i)) {
    filterConfig.action.star = true;
    filterConfig.action.markAsImportant = true;
  }
  
  // Parse actions - archive
  if (text.match(/archive|skip.*inbox/i)) {
    filterConfig.action.archive = true;
  }
  
  // Parse actions - delete/trash
  if (text.match(/delete|trash|spam/i)) {
    filterConfig.action.delete = true;
  }
  
  // If we have object parameters, merge them
  if (typeof input === 'object') {
    if (input.from) filterConfig.criteria.from = input.from;
    if (input.to) filterConfig.criteria.to = input.to;
    if (input.subject) filterConfig.criteria.subject = input.subject;
    if (input.query) filterConfig.criteria.query = input.query;
    if (input.labelName || input.folder) filterConfig.action.labelName = input.labelName || input.folder;
    if (input.markAsRead !== undefined) filterConfig.action.markAsRead = input.markAsRead;
    if (input.star !== undefined) filterConfig.action.star = input.star;
    if (input.archive !== undefined) filterConfig.action.archive = input.archive;
    if (input.delete !== undefined) filterConfig.action.delete = input.delete;
  }
  
  return filterConfig;
}

// Execute actions based on intent
async function executeActions(intent: any, supabase: any, request?: NextRequest, imageBase64?: string) {
  const results = [];
  
  for (const action of intent.actions || []) {
    try {
      switch (action.type) {
        case 'create_organization':
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: action.parameters.name,
              website: action.parameters.website,
              industry: action.parameters.industry,
              annual_revenue: action.parameters.annual_revenue,
              employee_count: action.parameters.employee_count,
              is_active: true
            })
            .select()
            .single();
          
          results.push({
            type: 'create_organization',
            success: !orgError,
            data: org,
            error: orgError?.message,
            description: `Created organization: ${action.parameters.name}`,
            organization_id: org?.id
          });
          break;

        case 'create_contact':
          // Get organization ID if organization name is provided
          let orgId = action.parameters.organization_id;
          if (!orgId && action.parameters.organization_name) {
            // Try to find the organization we just created
            const prevOrgResult = results.find(r => r.type === 'create_organization');
            if (prevOrgResult?.organization_id) {
              orgId = prevOrgResult.organization_id;
            } else {
              // Query for existing organization
              const { data: existingOrg } = await supabase
                .from('organizations')
                .select('id')
                .eq('name', action.parameters.organization_name)
                .single();
              orgId = existingOrg?.id;
            }
          }

          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              first_name: action.parameters.first_name,
              last_name: action.parameters.last_name,
              email: action.parameters.email,
              phone: action.parameters.phone,
              organization_id: orgId,
              is_primary: action.parameters.is_primary !== false
            })
            .select()
            .single();
          
          results.push({
            type: 'create_contact',
            success: !contactError,
            data: contact,
            error: contactError?.message,
            description: `Created contact: ${action.parameters.first_name} ${action.parameters.last_name}`
          });
          break;

        case 'create_client':
          // Legacy support - redirect to create_contact
          const { data: client, error: clientError } = await supabase
            .from('contacts')
            .insert({
              first_name: action.parameters.first_name,
              last_name: action.parameters.last_name,
              email: action.parameters.email,
              phone: action.parameters.phone,
              organization_id: action.parameters.organization_id
            })
            .select()
            .single();
          
          results.push({
            type: 'create_client',
            success: !clientError,
            data: client,
            error: clientError?.message,
            description: `Created client: ${action.parameters.first_name} ${action.parameters.last_name}`
          });
          break;

        case 'create_project':
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              name: action.parameters.name,
              description: action.parameters.description,
              status: action.parameters.status || 'planning',
              organization_id: action.parameters.organization_id,
              budget: action.parameters.budget
            })
            .select()
            .single();
          
          results.push({
            type: 'create_project',
            success: !projectError,
            data: project,
            error: projectError?.message,
            description: `Created project: ${action.parameters.name}`
          });
          break;

        case 'delete_project':
          // First find the project by name or ID
          let projectToDelete = null;
          
          if (action.parameters.project_id) {
            const { data } = await supabase
              .from('projects')
              .select('*')
              .eq('id', action.parameters.project_id)
              .single();
            projectToDelete = data;
          } else if (action.parameters.project_name) {
            const { data } = await supabase
              .from('projects')
              .select('*')
              .ilike('name', action.parameters.project_name)
              .single();
            projectToDelete = data;
          }

          if (projectToDelete) {
            const { error: deleteError } = await supabase
              .from('projects')
              .delete()
              .eq('id', projectToDelete.id);
            
            results.push({
              type: 'delete_project',
              success: !deleteError,
              data: projectToDelete,
              error: deleteError?.message,
              description: `Deleted project: ${projectToDelete.name}`
            });
          } else {
            results.push({
              type: 'delete_project',
              success: false,
              error: 'Project not found',
              description: `Could not find project: ${action.parameters.project_name || action.parameters.project_id}`
            });
          }
          break;

        case 'create_ticket':
          // Generate ticket number
          const { data: lastTicket } = await supabase
            .from('tickets')
            .select('ticket_number')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          let ticketNumber = 'TKT-000001';
          if (lastTicket?.ticket_number) {
            const lastNum = parseInt(lastTicket.ticket_number.split('-')[1]);
            ticketNumber = `TKT-${String(lastNum + 1).padStart(6, '0')}`;
          }

          const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
              ticket_number: ticketNumber,
              subject: action.parameters.subject,
              description: action.parameters.description,
              status: action.parameters.status || 'open',
              priority: action.parameters.priority || 'medium',
              category: action.parameters.category || 'general',
              contact_id: action.parameters.contact_id,
              organization_id: action.parameters.organization_id
            })
            .select()
            .single();
          
          results.push({
            type: 'create_ticket',
            success: !ticketError,
            data: ticket,
            error: ticketError?.message,
            description: `Created ticket ${ticketNumber}: ${action.parameters.subject}`
          });
          break;

        case 'update_ticket':
          const { data: updatedTicket, error: updateError } = await supabase
            .from('tickets')
            .update({
              status: action.parameters.status,
              priority: action.parameters.priority,
              assigned_to: action.parameters.assigned_to
            })
            .eq('id', action.parameters.ticket_id)
            .select()
            .single();
          
          results.push({
            type: 'update_ticket',
            success: !updateError,
            data: updatedTicket,
            error: updateError?.message,
            description: `Updated ticket status to ${action.parameters.status}`
          });
          break;

        case 'query':
          // Enhanced select for tickets to include relations
          let selectString = action.parameters.select || '*';
          if (action.parameters.table === 'tickets') {
            selectString = `
              *,
              contact:contacts(*),
              organization:organizations(*)
            `;
          } else if (action.parameters.table === 'projects') {
            selectString = `
              *,
              organization:organizations(*)
            `;
          }
          
          let query = supabase.from(action.parameters.table).select(selectString);
          
          // Apply filters
          if (action.parameters.filters) {
            for (const [key, value] of Object.entries(action.parameters.filters)) {
              query = query.eq(key, value);
            }
          }
          
          // Apply ordering
          if (action.parameters.order_by) {
            query = query.order(action.parameters.order_by, { ascending: action.parameters.ascending !== false });
          }
          
          // Apply limit
          if (action.parameters.limit) {
            query = query.limit(action.parameters.limit);
          }
          
          const { data: queryData, error: queryError } = await query;
          
          results.push({
            type: 'query',
            success: !queryError,
            data: queryData,
            error: queryError?.message,
            description: `Queried ${action.parameters.table}`,
            count: queryData?.length || 0
          });
          break;

        case 'analyze':
          // Perform analysis on the data
          const analysisQuery = supabase.from(action.parameters.table).select('*');
          const { data: analysisData, error: analysisError } = await analysisQuery;
          
          if (!analysisError && analysisData) {
            // Perform basic analysis
            const analysis = {
              total: analysisData.length,
              breakdown: {}
            };
            
            if (action.parameters.group_by) {
              const grouped = analysisData.reduce((acc: any, item: any) => {
                const key = item[action.parameters.group_by];
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {});
              analysis.breakdown = grouped;
            }
            
            results.push({
              type: 'analyze',
              success: true,
              data: analysis,
              description: `Analyzed ${action.parameters.table} data`
            });
          }
          break;

        case 'create_quote':
          // Generate a new quote
          try {
            // First, find or create the organization if needed
            let organizationId = action.parameters.organization_id;
            if (!organizationId && action.parameters.client_company) {
              const { data: existingOrg } = await supabase
                .from('organizations')
                .select('id')
                .eq('name', action.parameters.client_company)
                .single();
              
              if (existingOrg) {
                organizationId = existingOrg.id;
              } else {
                // Create the organization
                const { data: newOrg } = await supabase
                  .from('organizations')
                  .insert({
                    name: action.parameters.client_company,
                    type: 'prospect',
                    is_active: true
                  })
                  .select()
                  .single();
                organizationId = newOrg?.id;
              }
            }

            // Generate the quote using AI - build the full URL
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const quoteGenResponse = await fetch(`${baseUrl}/api/admin/quotes/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientName: action.parameters.client_name,
                clientEmail: action.parameters.client_email,
                clientCompany: action.parameters.client_company,
                projectDescription: action.parameters.project_description,
                budget: action.parameters.budget,
                timeline: action.parameters.timeline,
                additionalInfo: action.parameters.additional_info
              })
            });

            if (!quoteGenResponse.ok) {
              throw new Error('Failed to generate quote HTML');
            }

            const { html: generatedHtml } = await quoteGenResponse.json();

            // Parse budget to get min and max values
            let amountMin = 25000;
            let amountMax = 100000;
            if (action.parameters.budget) {
              const budgetStr = action.parameters.budget.toString().replace(/[^0-9-]/g, '');
              if (budgetStr.includes('-')) {
                const [min, max] = budgetStr.split('-').map(s => parseInt(s) || 0);
                amountMin = min;
                amountMax = max;
              } else {
                const amount = parseInt(budgetStr) || 50000;
                amountMin = amount * 0.8;
                amountMax = amount * 1.2;
              }
            }

            // Generate quote ID
            const quoteCount = await supabase
              .from('quotes')
              .select('id', { count: 'exact' })
              .like('id', '2025-%');
            
            const currentCount = quoteCount.count || 0;
            const quoteId = `2025-${String(currentCount + 1).padStart(3, '0')}`;

            // Create the quote in the database
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30);

            const { data: quote, error: quoteError } = await supabase
              .from('quotes')
              .insert({
                id: quoteId,
                client_name: action.parameters.client_name,
                client_email: action.parameters.client_email,
                client_company: action.parameters.client_company,
                project_name: action.parameters.project_name || 'AI Communication Platform',
                amount_min: amountMin,
                amount_max: amountMax,
                status: 'draft',
                valid_until: validUntil.toISOString(),
                metadata: {
                  generatedHtml,
                  projectDescription: action.parameters.project_description,
                  timeline: action.parameters.timeline,
                  additional_info: action.parameters.additional_info,
                  organization_id: organizationId
                }
              })
              .select()
              .single();

            results.push({
              type: 'create_quote',
              success: !quoteError,
              data: quote,
              error: quoteError?.message,
              description: `Created quote for ${action.parameters.client_name} - ${action.parameters.project_name || 'AI Platform'}`,
              quote_id: quote?.id,
              quote_url: quote ? `/quotes/${quote.id}` : null,
              navigate_to: '/admin/quotes/generate',
              navigate_params: {
                clientName: action.parameters.client_name,
                clientEmail: action.parameters.client_email,
                clientCompany: action.parameters.client_company,
                projectDescription: action.parameters.project_description,
                budget: action.parameters.budget,
                timeline: action.parameters.timeline,
                additionalInfo: action.parameters.additional_info
              }
            });
          } catch (quoteError) {
            results.push({
              type: 'create_quote',
              success: false,
              error: quoteError instanceof Error ? quoteError.message : 'Failed to create quote',
              description: 'Could not create quote'
            });
          }
          break;

        case 'create_email_campaign':
          try {
            // Generate HTML content using AI if requested
            let htmlContent = action.parameters.content;
            if (action.parameters.use_ai) {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              const aiResponse = await fetch(`${baseUrl}/api/email/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: action.parameters.content || 'Create a professional email with a 25% discount offer for scheduling a meeting today to discuss a specialized platform for their business.',
                  campaignName: action.parameters.name,
                  targetAudience: 'Business owners'
                })
              });

              if (aiResponse.ok) {
                const { html, subject, previewText } = await aiResponse.json();
                htmlContent = html;
                if (!action.parameters.subject && subject) {
                  action.parameters.subject = subject;
                }
              }
            }

            // Create the campaign
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const campaignResponse = await fetch(`${baseUrl}/api/email/campaigns`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: action.parameters.name || 'New Campaign',
                subject: action.parameters.subject || '🎉 Special Offer Just for You!',
                previewText: action.parameters.preview_text || 'You won\'t want to miss this exclusive offer...',
                fromName: action.parameters.from_name || 'AImpact Nexus',
                fromEmail: action.parameters.from_email || 'info@aimpactnexus.ai',
                replyTo: action.parameters.reply_to || action.parameters.from_email,
                content: htmlContent,
                targetList: 'all',
                scheduleType: action.parameters.send_now ? 'now' : 'scheduled',
                status: action.parameters.status || 'draft'
              })
            });

            const campaignData = await campaignResponse.json();
            
            results.push({
              type: 'create_email_campaign',
              success: campaignResponse.ok,
              data: campaignData,
              description: `Created email campaign: ${action.parameters.name}`,
              navigate_to: 'campaigns',
              show_message: '📧 Email campaign created as draft! Navigate to the Email Campaigns tab to review and send it.'
            });
          } catch (campaignError) {
            results.push({
              type: 'create_email_campaign',
              success: false,
              error: campaignError instanceof Error ? campaignError.message : 'Failed to create campaign',
              description: 'Could not create email campaign'
            });
          }
          break;

        case 'make_phone_call':
          results.push({
            type: 'make_phone_call',
            success: true,
            description: `Opening phone to call ${action.parameters.phone_number}`,
            open_floating: 'phone',
            phone_number: action.parameters.phone_number
          });
          break;

        case 'send_sms':
          // Try to resolve contact name to phone number if needed
          let phoneNumber = action.parameters.phone_number;
          let contactName = null;
          
          // If phone_number looks like a name instead of a number
          if (phoneNumber && !phoneNumber.match(/^[\d\s\-\+\(\)]+$/)) {
            console.log('📱 Attempting to lookup contact:', phoneNumber);
            
            // Try to find contact by name
            const nameParts = phoneNumber.trim().split(/\s+/);
            let contactQuery = supabase.from('contacts').select('*');
            
            if (nameParts.length >= 2) {
              // Full name provided - try exact match first
              const firstName = nameParts[0];
              const lastName = nameParts.slice(1).join(' ');
              
              const { data: exactMatch } = await contactQuery
                .ilike('first_name', firstName)
                .ilike('last_name', lastName)
                .limit(1);
              
              if (exactMatch && exactMatch.length > 0 && exactMatch[0].phone) {
                console.log('✅ Found exact contact match:', exactMatch[0].first_name, exactMatch[0].last_name, '- Phone:', exactMatch[0].phone);
                phoneNumber = exactMatch[0].phone;
                contactName = `${exactMatch[0].first_name} ${exactMatch[0].last_name}`;
              } else {
                // Try partial match
                const { data: partialMatch } = await supabase
                  .from('contacts')
                  .select('*')
                  .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`)
                  .limit(1);
                
                if (partialMatch && partialMatch.length > 0 && partialMatch[0].phone) {
                  console.log('✅ Found partial contact match:', partialMatch[0].first_name, partialMatch[0].last_name, '- Phone:', partialMatch[0].phone);
                  phoneNumber = partialMatch[0].phone;
                  contactName = `${partialMatch[0].first_name} ${partialMatch[0].last_name}`;
                }
              }
            } else if (nameParts.length === 1) {
              // Single name - could be first or last
              const { data: contacts } = await supabase
                .from('contacts')
                .select('*')
                .or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[0]}%`)
                .limit(1);
              
              if (contacts && contacts.length > 0 && contacts[0].phone) {
                console.log('✅ Found contact by single name:', contacts[0].first_name, contacts[0].last_name, '- Phone:', contacts[0].phone);
                phoneNumber = contacts[0].phone;
                contactName = `${contacts[0].first_name} ${contacts[0].last_name}`;
              }
            }
            
            if (!contactName) {
              console.log('❌ No contact found with phone number for:', phoneNumber);
              // Leave phoneNumber as is - will show error to user
            }
          }
          
          // Update phone_number in parameters with resolved number
          action.parameters.phone_number = phoneNumber;
          
          if (action.parameters.auto_send === true) {
            results.push({
              type: 'send_sms',
              success: true,
              description: `Sending SMS immediately to ${contactName || phoneNumber}`,
              open_floating: 'sms',
              phone_number: phoneNumber,
              message: action.parameters.message,
              auto_send: true,
              contact_name: contactName
            });
          } else {
            results.push({
              type: 'send_sms',
              success: true,
              description: `Opening SMS to message ${contactName || phoneNumber}`,
              open_floating: 'sms',
              phone_number: phoneNumber,
              message: action.parameters.message,
              contact_name: contactName
            });
          }
          break;
        case 'draft_sms':
          // Try to resolve contact name to phone number if needed (same logic as send_sms)
          let draftPhoneNumber = action.parameters.phone_number;
          let draftContactName = null;
          
          // If phone_number looks like a name instead of a number
          if (draftPhoneNumber && !draftPhoneNumber.match(/^[\d\s\-\+\(\)]+$/)) {
            console.log('📱 Attempting to lookup contact for draft:', draftPhoneNumber);
            
            // Try to find contact by name
            const nameParts = draftPhoneNumber.trim().split(/\s+/);
            
            if (nameParts.length >= 2) {
              // Full name provided - try exact match first
              const firstName = nameParts[0];
              const lastName = nameParts.slice(1).join(' ');
              
              const { data: exactMatch } = await supabase
                .from('contacts')
                .select('*')
                .ilike('first_name', firstName)
                .ilike('last_name', lastName)
                .limit(1);
              
              if (exactMatch && exactMatch.length > 0 && exactMatch[0].phone) {
                console.log('✅ Found exact contact match for draft:', exactMatch[0].first_name, exactMatch[0].last_name, '- Phone:', exactMatch[0].phone);
                draftPhoneNumber = exactMatch[0].phone;
                draftContactName = `${exactMatch[0].first_name} ${exactMatch[0].last_name}`;
              } else {
                // Try partial match
                const { data: partialMatch } = await supabase
                  .from('contacts')
                  .select('*')
                  .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`)
                  .limit(1);
                
                if (partialMatch && partialMatch.length > 0 && partialMatch[0].phone) {
                  console.log('✅ Found partial contact match for draft:', partialMatch[0].first_name, partialMatch[0].last_name, '- Phone:', partialMatch[0].phone);
                  draftPhoneNumber = partialMatch[0].phone;
                  draftContactName = `${partialMatch[0].first_name} ${partialMatch[0].last_name}`;
                }
              }
            } else if (nameParts.length === 1) {
              // Single name - could be first or last
              const { data: contacts } = await supabase
                .from('contacts')
                .select('*')
                .or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[0]}%`)
                .limit(1);
              
              if (contacts && contacts.length > 0 && contacts[0].phone) {
                console.log('✅ Found contact by single name for draft:', contacts[0].first_name, contacts[0].last_name, '- Phone:', contacts[0].phone);
                draftPhoneNumber = contacts[0].phone;
                draftContactName = `${contacts[0].first_name} ${contacts[0].last_name}`;
              }
            }
            
            if (!draftContactName) {
              console.log('❌ No contact found with phone number for draft:', draftPhoneNumber);
            }
          }
          
          results.push({
            type: 'draft_sms',
            success: true,
            description: `Drafting SMS to ${draftContactName || draftPhoneNumber}`,
            open_floating: 'sms',
            phone_number: draftPhoneNumber,
            message: action.parameters.message,
            draft_mode: true,
            contact_name: draftContactName
          });
          break;

        case 'navigate':
          results.push({
            type: 'navigate',
            success: true,
            description: `Navigating to ${action.parameters.tab}`,
            navigate_to: action.parameters.tab
          });
          break;
        
        case 'start_video_call':
          // Generate a meeting ID
          const meetingId = action.parameters.meeting_id || `nexus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          results.push({
            type: 'start_video_call',
            success: true,
            description: `Starting video call with meeting ID: ${meetingId}`,
            meeting_id: meetingId,
            navigate_to: 'video',
            video_params: {
              room: meetingId,
              name: action.parameters.participant_name
            }
          });
          break;
        
        case 'join_video_call':
          results.push({
            type: 'join_video_call',
            success: true,
            description: `Joining video call: ${action.parameters.meeting_id}`,
            meeting_id: action.parameters.meeting_id,
            navigate_to: 'video',
            video_params: {
              room: action.parameters.meeting_id,
              name: action.parameters.participant_name
            }
          });
          break;

        case 'save_to_crm':
          // Handle "add it to CRM" commands after an analysis
          if (lastAnalysisResult && lastAnalysisResult.intelligence) {
            try {
              // Call the client intelligence API again with save flag
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              const saveResponse = await fetch(`${baseUrl}/api/aimpact/client-intelligence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: lastAnalysisResult.url,
                  companyName: lastAnalysisResult.companyName,
                  saveTocrm: true
                })
              });

              if (saveResponse.ok) {
                results.push({
                  type: 'save_to_crm',
                  success: true,
                  description: `Saved ${lastAnalysisResult.companyName} to CRM`,
                  show_message: `✅ Successfully saved ${lastAnalysisResult.companyName} to your CRM!`
                });
              } else {
                results.push({
                  type: 'save_to_crm',
                  success: false,
                  error: 'Failed to save to CRM',
                  description: `Could not save ${lastAnalysisResult.companyName} to CRM`
                });
              }
            } catch (error) {
              results.push({
                type: 'save_to_crm',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                description: 'Error saving to CRM'
              });
            }
          } else {
            results.push({
              type: 'save_to_crm',
              success: false,
              error: 'No recent analysis found',
              description: 'Please analyze a website first before saving to CRM'
            });
          }
          break;

        case 'get_daily_briefing':
          try {
            // Call the main daily briefing API
            const baseUrl = request ? request.nextUrl.origin : 'http://localhost:3000';
            const dateParam = action.parameters.date || 'today';
            const briefingResponse = await fetch(`${baseUrl}/api/aimpact/daily-briefing?date=${dateParam}`, {
              method: 'GET',
              headers: { 
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              }
            });
            
            if (briefingResponse.ok) {
              const briefingData = await briefingResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: briefingData,
                description: 'Generated comprehensive daily briefing',
                show_message: '📅 Daily briefing prepared',
                briefing: briefingData
              });
            } else {
              // Fallback to simple version if main fails
              const simpleBriefingResponse = await fetch(`${baseUrl}/api/aimpact/daily-briefing-simple?date=${dateParam}`, {
                method: 'GET',
                headers: { 
                  'Content-Type': 'application/json',
                  ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
                }
              });
              
              if (simpleBriefingResponse.ok) {
                const briefingData = await simpleBriefingResponse.json();
                results.push({
                  type: action.type,
                  success: true,
                  data: briefingData,
                  description: 'Generated daily briefing',
                  show_message: '📅 Daily briefing prepared',
                  briefing: briefingData
                });
              } else {
                throw new Error('Failed to generate daily briefing');
              }
            }
          } catch (briefingError) {
            results.push({
              type: action.type,
              success: false,
              error: briefingError instanceof Error ? briefingError.message : 'Failed to generate daily briefing',
              description: 'Could not generate daily briefing'
            });
          }
          break;

        case 'process_business_card':
          try {
            const baseUrl = request ? request.nextUrl.origin : 'http://localhost:3000';
            
            // Use the uploaded image if available, otherwise use parameters
            const requestBody: any = {
              imageUrl: action.parameters.imageUrl,
              imageBase64: imageBase64 || action.parameters.imageBase64,  // Prioritize uploaded image
              manualText: action.parameters.manualText
            };
            
            const businessCardResponse = await fetch(`${baseUrl}/api/aimpact/process-business-card`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify(requestBody)
            });

            if (businessCardResponse.ok) {
              const cardData = await businessCardResponse.json();
              
              // Build response message
              let message = '📇 Business card processed successfully!\n\n';
              
              if (cardData.extractedData?.person) {
                const person = cardData.extractedData.person;
                message += `**Contact:**\n`;
                if (person.firstName || person.lastName) {
                  message += `• Name: ${person.firstName || ''} ${person.lastName || ''}\n`;
                }
                if (person.title) message += `• Title: ${person.title}\n`;
                if (person.email) message += `• Email: ${person.email}\n`;
                if (person.phone) message += `• Phone: ${person.phone}\n`;
                if (person.mobile) message += `• Mobile: ${person.mobile}\n`;
                if (person.linkedin) message += `• LinkedIn: ${person.linkedin}\n`;
              }
              
              if (cardData.extractedData?.company) {
                const company = cardData.extractedData.company;
                message += `\n**Company:**\n`;
                if (company.name) message += `• Name: ${company.name}\n`;
                if (company.website) message += `• Website: ${company.website}\n`;
                if (company.address) message += `• Address: ${company.address}\n`;
                if (company.city || company.state || company.zip) {
                  message += `• Location: ${[company.city, company.state, company.zip].filter(Boolean).join(', ')}\n`;
                }
                if (company.industry) message += `• Industry: ${company.industry}\n`;
              }
              
              if (cardData.organizationId || cardData.contactId) {
                message += '\n✅ **Added to CRM:**\n';
                if (cardData.organizationId) message += `• Organization created/updated\n`;
                if (cardData.contactId) message += `• Contact created/updated\n`;
              }
              
              if (cardData.extractedData?.notes) {
                message += `\n**Notes:** ${cardData.extractedData.notes}`;
              }
              
              results.push({
                type: action.type,
                success: true,
                data: cardData,
                description: 'Business card processed and added to CRM',
                show_message: message,
                navigate_to: cardData.contactId ? `/crm/contacts/${cardData.contactId}` : undefined
              });
            } else {
              const error = await businessCardResponse.json();
              throw new Error(error.error || 'Failed to process business card');
            }
          } catch (cardError) {
            results.push({
              type: action.type,
              success: false,
              error: cardError instanceof Error ? cardError.message : 'Failed to process business card',
              description: 'Could not process business card'
            });
          }
          break;

        case 'analyze_website':
          try {
            // Call the client intelligence API
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const intelligenceResponse = await fetch(`${baseUrl}/api/aimpact/client-intelligence`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: action.parameters.url,
                companyName: action.parameters.company_name,
                saveTocrm: action.parameters.save_to_crm !== false // Default to true
              })
            });

            if (intelligenceResponse.ok) {
              const intelligenceData = await intelligenceResponse.json();
              
              // Store the last analysis result for potential follow-up "add to CRM" commands
              lastAnalysisResult = {
                url: action.parameters.url,
                companyName: intelligenceData.intelligence.company.name,
                intelligence: intelligenceData.intelligence,
                timestamp: new Date()
              };
              
              results.push({
                type: 'analyze_website',
                success: true,
                data: intelligenceData.intelligence,
                description: `Deep analysis completed for ${intelligenceData.intelligence.company.name}`,
                detailed_results: {
                  company: intelligenceData.intelligence.company,
                  technology: intelligenceData.intelligence.technology,
                  opportunities: intelligenceData.intelligence.opportunities,
                  scoring: intelligenceData.intelligence.scoring,
                  insights: intelligenceData.intelligence.insights,
                  contact: intelligenceData.intelligence.contact,
                  market: intelligenceData.intelligence.market,
                  onlinePresence: intelligenceData.intelligence.onlinePresence
                },
                show_message: action.parameters.save_to_crm ? 
                  `✅ Analysis complete and saved to CRM! Lead score: ${intelligenceData.intelligence.scoring.leadScore}/100, AI potential: ${intelligenceData.intelligence.scoring.aiPotential}/100` :
                  `✅ Analysis complete! Lead score: ${intelligenceData.intelligence.scoring.leadScore}/100, AI potential: ${intelligenceData.intelligence.scoring.aiPotential}/100`
              });
            } else {
              const error = await intelligenceResponse.json();
              results.push({
                type: 'analyze_website',
                success: false,
                error: error.error || 'Failed to analyze website',
                description: `Could not analyze ${action.parameters.url}`
              });
            }
          } catch (intelligenceError) {
            results.push({
              type: 'analyze_website',
              success: false,
              error: intelligenceError instanceof Error ? intelligenceError.message : 'Analysis failed',
              description: `Failed to analyze ${action.parameters.url}`
            });
          }
          break;

        case 'list_meetings':
        case 'view_calendar':
        case 'check_availability':
          try {
            // Use dates from parameters or defaults
            const today = new Date()
            const startDate = action.parameters.start_date || action.parameters.date || today.toISOString()
            const endDate = action.parameters.end_date || new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString() // Next day
            
            // Use the WORKING calendar/events endpoint (same as daily briefing)
            try {
              const baseUrl = request ? request.nextUrl.origin : 'http://localhost:3000'
              const calendarUrl = `${baseUrl}/api/aimpact/calendar/events?timeMin=${encodeURIComponent(startDate)}&timeMax=${encodeURIComponent(endDate)}`
              
              const response = await fetch(calendarUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
                }
              })
              
              if (response.ok) {
                const data = await response.json()
                
                // The events are already filtered by date range from the API
                const events = data.events || []
                
                // Format events for display
                const formattedEvents = events.map((event: any) => ({
                  id: event.id,
                  title: event.title || event.summary || 'Untitled Event',
                  date: event.start ? new Date(event.start).toLocaleDateString() : '',
                  time: event.isAllDay ? 'All Day' : (event.start ? new Date(event.start).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  }) : ''),
                  location: event.location || '',
                  description: event.description || '',
                  attendees: event.attendees || [],
                  hangoutLink: event.hangoutLink || event.meetingUrl
                }))
                
                results.push({
                  type: action.type,
                  success: true,
                  data: formattedEvents,
                  description: `Found ${formattedEvents.length} meeting${formattedEvents.length !== 1 ? 's' : ''}${action.parameters.date ? ' for today' : ''}`,
                  calendar_data: {
                    meetings: formattedEvents,
                    start_date: startDate,
                    end_date: endDate,
                    total_count: formattedEvents.length
                  },
                  show_message: `📅 Found ${formattedEvents.length} meeting${formattedEvents.length !== 1 ? 's' : ''}${action.parameters.date ? ' for today' : ''}`
                })
              } else {
                console.error('Calendar API failed:', await response.text())
                throw new Error('Calendar API failed')
              }
            } catch (syncError) {
              // Fallback to database-only query
              console.log('Google Calendar API failed, falling back to database:', syncError);
              
              const { data: meetings, error: meetingsError } = await supabase
                .from('meetings')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true })
                .order('time', { ascending: true });
              
              if (meetingsError) throw meetingsError;
              
              results.push({
                type: action.type,
                success: true,
                data: meetings,
                description: `Found ${meetings?.length || 0} meetings in local database`,
                calendar_data: {
                  meetings: meetings || [],
                  start_date: startDate,
                  end_date: endDate
                },
                show_message: `📅 Found ${meetings?.length || 0} local meetings (Google Calendar unavailable)`
              });
            }
          } catch (calendarError) {
            results.push({
              type: action.type,
              success: false,
              error: calendarError instanceof Error ? calendarError.message : 'Failed to fetch calendar',
              description: 'Could not retrieve calendar information'
            });
          }
          break;

        case 'create_meeting':
        case 'create_appointment':
          try {
            // Parse date/time
            let meetingDate = new Date();
            let meetingTime = '10:00'; // Default time (HH:MM format for Google)
            
            if (action.parameters.date_time) {
              const dt = new Date(action.parameters.date_time);
              meetingDate = dt;
              meetingTime = dt.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
            } else if (action.parameters.date && action.parameters.time) {
              // Handle relative dates like "tomorrow"
              if (action.parameters.date.toLowerCase() === 'tomorrow') {
                meetingDate = new Date();
                meetingDate.setDate(meetingDate.getDate() + 1);
              } else if (action.parameters.date.toLowerCase() === 'today') {
                meetingDate = new Date();
              } else if (action.parameters.date.toLowerCase().includes('friday')) {
                // Find next Friday
                meetingDate = new Date();
                const dayOfWeek = meetingDate.getDay();
                const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // 5 is Friday
                meetingDate.setDate(meetingDate.getDate() + daysUntilFriday);
              } else {
                meetingDate = new Date(action.parameters.date);
              }
              
              // Parse time - handle various formats
              let timeStr = action.parameters.time || '';
              console.log('[NEXUS] Parsing time:', timeStr);
              
              if (timeStr.includes(':')) {
                // Already in HH:MM format, check for am/pm
                const parts = timeStr.split(':');
                let hour = parseInt(parts[0]);
                const minute = parts[1].replace(/[^\d]/g, '').substring(0, 2);
                
                // Check for am/pm after the time
                if (timeStr.toLowerCase().includes('pm') && hour < 12) {
                  hour += 12;
                } else if (timeStr.toLowerCase().includes('am') && hour === 12) {
                  hour = 0;
                }
                
                meetingTime = `${hour.toString().padStart(2, '0')}:${minute}`;
              } else if (timeStr.match(/\d+(:\d+)?\s*(am|pm)/i)) {
                // Handle formats like "2pm", "10:30am", "2:15 PM"
                const match = timeStr.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
                if (match) {
                  let hour = parseInt(match[1]);
                  const minute = match[2] || '00';
                  const period = match[3].toLowerCase();
                  
                  // Convert to 24-hour format
                  if (period === 'pm' && hour !== 12) {
                    hour += 12;
                  } else if (period === 'am' && hour === 12) {
                    hour = 0;
                  }
                  
                  meetingTime = `${hour.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
                }
              } else if (timeStr.match(/^\d+$/)) {
                // Just a number like "14" or "2"
                let hour = parseInt(timeStr);
                // Assume PM for small numbers (1-6) unless it's clearly morning context
                if (hour >= 1 && hour <= 6 && !action.parameters.title?.toLowerCase().includes('morning')) {
                  hour += 12;
                }
                meetingTime = `${hour.toString().padStart(2, '0')}:00`;
              } else {
                // Default to 10:00 AM if no valid time found
                console.log('[NEXUS] Could not parse time, using default 10:00');
                meetingTime = '10:00';
              }
              
              console.log('[NEXUS] Parsed meeting time:', meetingTime);
            }
            
            const dateStr = meetingDate.toISOString().split('T')[0];
            const duration = action.parameters.duration || 60; // minutes
            
            // Check if we should add video conference (if title contains 'video' or explicitly requested)
            const addVideo = action.parameters.add_video || 
                           action.parameters.video || 
                           (action.parameters.title && action.parameters.title.toLowerCase().includes('video'));
            
            // Create in Google Calendar
            try {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
              const googleResponse = await fetch(`${baseUrl}/api/aimpact/calendar/google`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
                },
                body: JSON.stringify({
                  title: action.parameters.title || 'Meeting',
                  description: action.parameters.description || '',
                  date: dateStr,
                  time: meetingTime,
                  duration: duration,
                  attendees: action.parameters.attendees || [],
                  location: action.parameters.location || '',
                  addVideoConference: addVideo
                })
              });
              
              if (googleResponse.ok) {
                const googleData = await googleResponse.json();
                results.push({
                  type: action.type,
                  success: true,
                  data: googleData.event,
                  description: `Created "${googleData.event.title}" in Google Calendar`,
                  show_message: `✅ Meeting created successfully! ${googleData.event.link ? `[View in Calendar](${googleData.event.link})` : ''}`,
                  calendar_event: googleData.event
                });
              } else {
                const errorData = await googleResponse.json();
                throw new Error(errorData.error || 'Failed to create in Google Calendar');
              }
            } catch (googleError: any) {
              console.error('Google Calendar create error:', googleError);
              // Fall back to local database
            }
            
            // Also create in local database for reference
            const meetingId = crypto.randomUUID();
            const { data: meeting, error: meetingError } = await supabase
              .from('meetings')
              .insert({
                id: meetingId,
                title: action.parameters.title || 'Meeting',
                description: action.parameters.description,
                date: dateStr,
                time: meetingTime,
                duration: duration,
                type: action.parameters.type || 'video',
                status: 'scheduled',
                organizer_email: action.parameters.host_email || 'info@aimpactnexus.ai',
                organizer_name: action.parameters.host_name || 'AImpact Nexus',
                location: action.parameters.location || 'Online',
                meeting_url: action.parameters.meeting_link
              })
              .select()
              .single();
            
            if (meetingError) throw meetingError;
            
            // Add attendees if provided
            if (action.parameters.attendees && action.parameters.attendees.length > 0) {
              const attendeeRecords = action.parameters.attendees.map((email: string) => ({
                meeting_id: meetingId,
                attendee_email: email,
                status: 'pending'
              }));
              
              await supabase
                .from('meeting_attendees')
                .insert(attendeeRecords);
              
              // Only send invitations if explicitly requested
              if (action.parameters.send_invites === true) {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                await fetch(`${baseUrl}/api/aimpact/meetings/send-invites`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ meetingId })
                });
              }
            }
            
            // Try to sync to Google Calendar
            try {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
              await fetch(`${baseUrl}/api/aimpact/meetings/google-calendar?direction=to-google`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (syncError) {
              console.log('Could not sync to Google Calendar:', syncError);
              // Meeting was created locally, continue even if Google sync fails
            }
            
            // Build success message based on platform and invite status
            const platform = action.parameters.platform === 'google' ? 'Google Meet' : 'Nexus Video';
            const inviteStatus = action.parameters.send_invites === true 
              ? `Invitations sent to ${action.parameters.attendees?.length || 0} attendee(s).`
              : action.parameters.attendees?.length 
                ? `Meeting created with ${action.parameters.attendees.length} attendee(s) - invites ready to send when needed.`
                : 'Meeting created successfully.';
            
            results.push({
              type: action.type,
              success: true,
              data: meeting,
              description: `Created ${platform} meeting for ${meetingDate.toLocaleDateString()} at ${meetingTime}`,
              meeting_id: meetingId,
              navigate_to: 'meetings',
              show_message: `📅 ${platform} meeting scheduled successfully! ${inviteStatus}`
            });
          } catch (meetingError) {
            results.push({
              type: action.type,
              success: false,
              error: meetingError instanceof Error ? meetingError.message : 'Failed to create meeting',
              description: 'Could not schedule the meeting'
            });
          }
          break;

        case 'update_meeting':
          try {
            // First, try to find the meeting in Google Calendar if we need to add video
            let googleEventId = action.parameters.google_event_id;
            let meetingTitle = action.parameters.meeting_title || action.parameters.title;
            
            // If we're adding a video link or updating in Google, we need to find the event
            if ((action.parameters.add_video || action.parameters.video_link) && !googleEventId) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
                
                // Get list of meetings to find the right one
                const searchResponse = await fetch(`${baseUrl}/api/aimpact/calendar/google`, {
                  method: 'GET',
                  headers: {
                    ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
                  }
                });
                
                if (searchResponse.ok) {
                  const calendarData = await searchResponse.json();
                  const events = calendarData.events || [];
                  
                  // Find the matching event
                  const matchingEvent = events.find((event: any) => {
                    if (googleEventId && event.id === googleEventId) return true;
                    if (meetingTitle) {
                      return event.title?.toLowerCase().includes(meetingTitle.toLowerCase()) ||
                             event.summary?.toLowerCase().includes(meetingTitle.toLowerCase());
                    }
                    return false;
                  });
                  
                  if (matchingEvent) {
                    googleEventId = matchingEvent.id || matchingEvent.googleEventId;
                  }
                }
              } catch (searchError) {
                console.error('[NEXUS] Error searching for meeting:', searchError);
              }
            }
            
            // If we found a Google event and need to update it
            if (googleEventId && (action.parameters.add_video || action.parameters.video_link || 
                                  action.parameters.title || action.parameters.description || 
                                  action.parameters.date || action.parameters.time)) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
                
                // Prepare update data for Google Calendar
                const googleUpdateData: any = {
                  eventId: googleEventId
                };
                
                if (action.parameters.title) googleUpdateData.title = action.parameters.title;
                if (action.parameters.description) googleUpdateData.description = action.parameters.description;
                if (action.parameters.date) googleUpdateData.date = action.parameters.date;
                if (action.parameters.time) googleUpdateData.time = action.parameters.time;
                if (action.parameters.location) googleUpdateData.location = action.parameters.location;
                
                // Handle video link request
                if (action.parameters.add_video || action.parameters.video_link) {
                  googleUpdateData.addVideoConference = true;
                  // You can specify a custom video URL or let Google Meet generate one
                  if (action.parameters.video_link && action.parameters.video_link !== true) {
                    googleUpdateData.videoUrl = action.parameters.video_link;
                  }
                }
                
                const updateResponse = await fetch(`${baseUrl}/api/aimpact/calendar/google`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
                  },
                  body: JSON.stringify(googleUpdateData)
                });
                
                if (updateResponse.ok) {
                  const updatedData = await updateResponse.json();
                  results.push({
                    type: 'update_meeting',
                    success: true,
                    data: updatedData,
                    description: action.parameters.add_video ? 
                      `Added video link to meeting: ${meetingTitle || 'Meeting'}` :
                      `Updated meeting: ${meetingTitle || 'Meeting'}`,
                    show_message: action.parameters.add_video ?
                      '✅ Video conference link added to meeting!' :
                      '✅ Meeting updated successfully!'
                  });
                } else {
                  throw new Error('Failed to update meeting in Google Calendar');
                }
              } catch (googleError) {
                console.error('[NEXUS] Error updating Google Calendar:', googleError);
                throw googleError;
              }
            } else if (action.parameters.meeting_id) {
              // Update in local database if we have a meeting_id
              const updateData: any = {};
              
              if (action.parameters.title) updateData.title = action.parameters.title;
              if (action.parameters.description) updateData.description = action.parameters.description;
              if (action.parameters.date) updateData.date = action.parameters.date;
              if (action.parameters.time) updateData.time = action.parameters.time;
              if (action.parameters.location) updateData.location = action.parameters.location;
              if (action.parameters.status) updateData.status = action.parameters.status;
              
              const { data: updatedMeeting, error: updateError } = await supabase
                .from('meetings')
                .update(updateData)
                .eq('id', action.parameters.meeting_id)
                .select()
                .single();
              
              if (updateError) throw updateError;
              
              results.push({
                type: 'update_meeting',
                success: true,
                data: updatedMeeting,
                description: `Updated meeting: ${updatedMeeting.title}`,
                show_message: '✅ Meeting updated successfully!'
              });
            } else {
              // Couldn't find the meeting to update
              results.push({
                type: 'update_meeting',
                success: false,
                error: 'Could not find meeting to update. Please provide more specific details.',
                description: 'Meeting not found'
              });
            }
          } catch (updateError) {
            results.push({
              type: 'update_meeting',
              success: false,
              error: updateError instanceof Error ? updateError.message : 'Failed to update meeting',
              description: 'Could not update the meeting'
            });
          }
          break;

        case 'cancel_meeting':
        case 'delete_meeting':
          try {
            // First, check if we need to find the meeting by title/date
            let meetingId = action.parameters.meeting_id;
            let googleEventId = action.parameters.google_event_id;
            
            // If no meeting_id but we have title and/or date, search for it
            if (!meetingId && !googleEventId && (action.parameters.title || action.parameters.date)) {
              try {
                // Search Google Calendar for the event
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
                const searchParams = new URLSearchParams();
                
                if (action.parameters.title) {
                  searchParams.append('q', action.parameters.title);
                }
                if (action.parameters.date) {
                  searchParams.append('date', action.parameters.date);
                }
                
                const searchResponse = await fetch(`${baseUrl}/api/aimpact/calendar/google?${searchParams}`, {
                  method: 'GET',
                  headers: request ? {
                    'Cookie': request.headers.get('cookie') || ''
                  } : {}
                });
                
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  if (searchData.events && searchData.events.length > 0) {
                    // Find best match - be more flexible with title matching
                    const searchTitle = action.parameters.title?.toLowerCase() || '';
                    const matchingEvent = searchData.events.find((e: any) => {
                      const eventTitle = e.title.toLowerCase();
                      // Check if the event title contains all significant words from the search
                      const searchWords = searchTitle.split(/\s+/).filter(w => w.length > 2);
                      return searchWords.every(word => eventTitle.includes(word));
                    });
                    
                    if (matchingEvent) {
                      googleEventId = matchingEvent.id;
                      console.log(`Found matching event: ${matchingEvent.title} with ID: ${googleEventId}`);
                    } else {
                      console.log(`No exact match found for: ${action.parameters.title}`);
                      console.log('Available events:', searchData.events.map((e: any) => e.title));
                    }
                  }
                }
              } catch (searchError) {
                console.log('Could not search Google Calendar:', searchError);
              }
            }
            
            // If we found a Google event ID, delete from Google Calendar
            if (googleEventId) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
                const deleteResponse = await fetch(`${baseUrl}/api/aimpact/calendar/google?eventId=${googleEventId}`, {
                  method: 'DELETE',
                  headers: request ? {
                    'Cookie': request.headers.get('cookie') || ''
                  } : {}
                });
                
                if (deleteResponse.ok) {
                  results.push({
                    type: action.type,
                    success: true,
                    data: { google_event_id: googleEventId },
                    description: `Deleted event from Google Calendar`,
                    show_message: '✅ Event deleted from Google Calendar successfully'
                  });
                } else {
                  const errorData = await deleteResponse.json();
                  throw new Error(errorData.error || 'Failed to delete from Google Calendar');
                }
              } catch (googleError: any) {
                console.error('Google Calendar delete error:', googleError);
                results.push({
                  type: action.type,
                  success: false,
                  error: googleError.message,
                  description: 'Could not delete from Google Calendar'
                });
              }
            }
            
            // Also try to update local database if we have a meeting_id
            if (meetingId) {
              const { data: cancelledMeeting, error: cancelError } = await supabase
                .from('meetings')
                .update({ status: 'cancelled' })
                .eq('id', meetingId)
                .select()
                .single();
              
              if (!cancelError && cancelledMeeting) {
                results.push({
                  type: action.type,
                  success: true,
                  data: cancelledMeeting,
                  description: `Cancelled local meeting: ${cancelledMeeting.title}`,
                  show_message: '❌ Local meeting cancelled successfully'
                });
              }
            }
            
            // If we didn't find anything to delete
            if (!googleEventId && !meetingId) {
              results.push({
                type: action.type,
                success: false,
                error: 'Meeting not found',
                description: 'Could not find a meeting matching your request'
              });
            }
            
          } catch (cancelError) {
            results.push({
              type: action.type,
              success: false,
              error: cancelError instanceof Error ? cancelError.message : 'Failed to cancel meeting',
              description: 'Could not cancel the meeting'
            });
          }
          break;

        case 'check_inbox':
        case 'read_emails':
        case 'summarize_inbox':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
            const params = new URLSearchParams();
            
            // Set query parameters
            if (action.parameters.query) {
              params.append('q', action.parameters.query);
            } else if (action.type === 'summarize_inbox') {
              params.append('q', 'is:unread OR is:important');
            } else {
              params.append('q', 'is:unread');
            }
            
            params.append('maxResults', action.parameters.maxResults || '10');
            params.append('analyze', 'true');
            params.append('summarize', action.parameters.summarize !== false ? 'true' : 'false');
            
            const emailResponse = await fetch(`${baseUrl}/api/aimpact/email/intelligence?${params}`, {
              method: 'GET',
              headers: request ? {
                'Cookie': request.headers.get('cookie') || ''
              } : {}
            });
            
            if (emailResponse.ok) {
              const emailData = await emailResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: emailData,
                description: `Found ${emailData.emailCount} emails`,
                show_message: emailData.summary || `📧 Found ${emailData.emailCount} emails in your inbox`,
                email_data: {
                  emails: emailData.emails,
                  summary: emailData.summary,
                  count: emailData.emailCount
                }
              });
            } else {
              throw new Error('Failed to fetch emails');
            }
          } catch (emailError) {
            results.push({
              type: action.type,
              success: false,
              error: emailError instanceof Error ? emailError.message : 'Failed to check inbox',
              description: 'Could not access email inbox'
            });
          }
          break;

        case 'draft_email':
        case 'reply_to_email':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
            
            const draftResponse = await fetch(`${baseUrl}/api/aimpact/email/intelligence`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                replyTo: action.parameters.replyTo,
                to: action.parameters.to,
                subject: action.parameters.subject,
                context: action.parameters.context,
                tone: action.parameters.tone || 'professional',
                instructions: action.parameters.instructions,
                createDraft: action.parameters.createDraft !== false
              })
            });
            
            if (draftResponse.ok) {
              const draftData = await draftResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: draftData.draft,
                description: `Drafted email: ${draftData.draft.subject}`,
                show_message: `✉️ Email draft ready${draftData.draft.draftId ? ' (saved to Gmail drafts)' : ''}`,
                email_draft: draftData.draft
              });
            } else {
              throw new Error('Failed to draft email');
            }
          } catch (draftError) {
            results.push({
              type: action.type,
              success: false,
              error: draftError instanceof Error ? draftError.message : 'Failed to draft email',
              description: 'Could not create email draft'
            });
          }
          break;

        case 'send_email':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3010');
            
            // Check if this should be sent immediately or drafted
            const sendImmediately = action.parameters.auto_send === true;
            
            const emailResponse = await fetch(`${baseUrl}/api/aimpact/gmail/compose`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                to: action.parameters.to,
                subject: action.parameters.subject,
                body: action.parameters.body || action.parameters.message,
                sendImmediately: sendImmediately
              })
            });
            
            if (emailResponse.ok) {
              const emailData = await emailResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: emailData,
                description: sendImmediately 
                  ? `Sent email immediately to ${action.parameters.to}: ${action.parameters.subject}`
                  : `Email drafted and ready to send to ${action.parameters.to}: ${action.parameters.subject}`,
                show_message: sendImmediately 
                  ? `✅ Email sent immediately to ${action.parameters.to}!`
                  : `📝 Email drafted for ${action.parameters.to} - ready to review and send when needed!`,
                email_sent: sendImmediately,
                email_drafted: !sendImmediately
              });
            } else {
              throw new Error('Failed to process email');
            }
          } catch (sendError) {
            results.push({
              type: action.type,
              success: false,
              error: sendError instanceof Error ? sendError.message : 'Failed to process email',
              description: `Could not process email to ${action.parameters.to}`
            });
          }
          break;

        case 'mark_as_read':
        case 'archive_email':
        case 'star_email':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
            
            const actionMap: { [key: string]: string } = {
              'mark_as_read': 'markRead',
              'archive_email': 'archive',
              'star_email': 'star'
            };
            
            const modifyResponse = await fetch(`${baseUrl}/api/aimpact/email/intelligence`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                emailIds: action.parameters.emailIds || [action.parameters.emailId],
                action: actionMap[action.type]
              })
            });
            
            if (modifyResponse.ok) {
              const modifyData = await modifyResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: modifyData,
                description: `${action.type} completed for ${modifyData.results.length} emails`,
                show_message: `✅ Email action completed: ${actionMap[action.type]}`
              });
            } else {
              throw new Error('Failed to modify emails');
            }
          } catch (modifyError) {
            results.push({
              type: action.type,
              success: false,
              error: modifyError instanceof Error ? modifyError.message : 'Failed to modify emails',
              description: 'Could not perform email action'
            });
          }
          break;

        case 'create_email_rule':
        case 'create_gmail_filter':
          try {
            const baseUrl = request ? request.nextUrl.origin : 'http://localhost:3000';
            
            // Parse natural language to filter criteria
            const filterParams = parseNaturalLanguageToFilter(action.parameters.naturalLanguage || action.parameters);
            
            const filterResponse = await fetch(`${baseUrl}/api/aimpact/gmail-filters`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify(filterParams)
            });
            
            if (filterResponse.ok) {
              const filterData = await filterResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: filterData.filter,
                description: `Created Gmail filter successfully`,
                show_message: `📋 Filter created! Emails matching your criteria will be automatically organized.`,
                filter: filterData.filter
              });
            } else {
              const error = await filterResponse.json();
              throw new Error(error.error || 'Failed to create filter');
            }
          } catch (filterError) {
            results.push({
              type: action.type,
              success: false,
              error: filterError instanceof Error ? filterError.message : 'Failed to create filter',
              description: 'Could not create Gmail filter'
            });
          }
          break;

        case 'apply_email_rule':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
            
            const applyResponse = await fetch(`${baseUrl}/api/aimpact/email/rules`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                ruleId: action.parameters.ruleId,
                applyToExisting: action.parameters.applyToExisting !== false
              })
            });
            
            if (applyResponse.ok) {
              const applyData = await applyResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: applyData,
                description: `Applied rule to ${applyData.processedEmails} emails`,
                show_message: `✅ Rule applied to ${applyData.processedEmails} existing emails`
              });
            } else {
              throw new Error('Failed to apply email rule');
            }
          } catch (applyError) {
            results.push({
              type: action.type,
              success: false,
              error: applyError instanceof Error ? applyError.message : 'Failed to apply email rule',
              description: 'Could not apply email rule'
            });
          }
          break;

        case 'list_email_rules':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? request.nextUrl.origin : 'http://localhost:3000');
            
            const rulesResponse = await fetch(`${baseUrl}/api/aimpact/email/rules`, {
              method: 'GET',
              headers: request ? {
                'Cookie': request.headers.get('cookie') || ''
              } : {}
            });
            
            if (rulesResponse.ok) {
              const rulesData = await rulesResponse.json();
              
              results.push({
                type: action.type,
                success: true,
                data: rulesData,
                description: `Found ${rulesData.rules.length} email rules`,
                show_message: `📋 You have ${rulesData.rules.length} email rules configured`,
                email_rules: rulesData.rules
              });
            } else {
              throw new Error('Failed to list email rules');
            }
          } catch (listError) {
            results.push({
              type: action.type,
              success: false,
              error: listError instanceof Error ? listError.message : 'Failed to list email rules',
              description: 'Could not list email rules'
            });
          }
          break;

        // TODO MANAGEMENT ACTIONS
        case 'list_todos':
        case 'get_todos':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const params = new URLSearchParams();
            
            if (action.parameters.filter) params.append('filter', action.parameters.filter);
            if (action.parameters.category) params.append('category', action.parameters.category);
            if (action.parameters.priority) params.append('priority', action.parameters.priority);
            if (action.parameters.search) params.append('search', action.parameters.search);
            if (action.parameters.assignee) params.append('assignee', action.parameters.assignee);
            
            const todosResponse = await fetch(`${baseUrl}/api/aimpact/todos?${params.toString()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              }
            });

            if (todosResponse.ok) {
              const todosData = await todosResponse.json();
              const todos = todosData.todos || [];
              
              results.push({
                type: action.type,
                success: true,
                data: todos,
                description: `Found ${todos.length} todos`,
                show_message: `📋 Found ${todos.length} todo${todos.length !== 1 ? 's' : ''}`,
                todos: todos
              });
            } else {
              throw new Error('Failed to fetch todos');
            }
          } catch (todoError) {
            results.push({
              type: action.type,
              success: false,
              error: todoError instanceof Error ? todoError.message : 'Failed to fetch todos',
              description: 'Could not retrieve todos'
            });
          }
          break;

        case 'add_todo':
        case 'create_todo':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const todoResponse = await fetch(`${baseUrl}/api/aimpact/todos-db`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                title: action.parameters.title,
                description: action.parameters.description,
                priority: action.parameters.priority || 'medium',
                category: action.parameters.category || 'General',
                tags: action.parameters.tags || [],
                assigned_to: action.parameters.assignedTo,
                due_date: action.parameters.dueDate,
                due_time: action.parameters.dueTime
              })
            });

            if (todoResponse.ok) {
              const todoData = await todoResponse.json();
              results.push({
                type: action.type,
                success: true,
                data: todoData.todo,
                description: `Created todo: ${todoData.todo.title}`,
                show_message: `✅ Todo created: "${todoData.todo.title}"${todoData.todo.dueDate ? ` (due ${todoData.todo.dueDate})` : ''}`,
                navigate_to: 'todo'
              });
            } else {
              const error = await todoResponse.json();
              throw new Error(error.error || 'Failed to create todo');
            }
          } catch (todoError) {
            results.push({
              type: action.type,
              success: false,
              error: todoError instanceof Error ? todoError.message : 'Failed to create todo',
              description: 'Could not create todo'
            });
          }
          break;

        case 'update_todo':
        case 'edit_todo':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const updateData: any = {};
            
            if (action.parameters.title !== undefined) updateData.title = action.parameters.title;
            if (action.parameters.description !== undefined) updateData.description = action.parameters.description;
            if (action.parameters.priority !== undefined) updateData.priority = action.parameters.priority;
            if (action.parameters.category !== undefined) updateData.category = action.parameters.category;
            if (action.parameters.tags !== undefined) updateData.tags = action.parameters.tags;
            if (action.parameters.assignedTo !== undefined) updateData.assignedTo = action.parameters.assignedTo;
            if (action.parameters.dueDate !== undefined) updateData.dueDate = action.parameters.dueDate;
            if (action.parameters.dueTime !== undefined) updateData.dueTime = action.parameters.dueTime;
            if (action.parameters.completed !== undefined) updateData.completed = action.parameters.completed;

            const todoResponse = await fetch(`${baseUrl}/api/aimpact/todos`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                id: action.parameters.id,
                ...updateData
              })
            });

            if (todoResponse.ok) {
              const todoData = await todoResponse.json();
              results.push({
                type: action.type,
                success: true,
                data: todoData.todo,
                description: `Updated todo: ${todoData.todo.title}`,
                show_message: `✅ Todo updated: "${todoData.todo.title}"`,
                navigate_to: 'todo'
              });
            } else {
              const error = await todoResponse.json();
              throw new Error(error.error || 'Failed to update todo');
            }
          } catch (todoError) {
            results.push({
              type: action.type,
              success: false,
              error: todoError instanceof Error ? todoError.message : 'Failed to update todo',
              description: 'Could not update todo'
            });
          }
          break;

        case 'complete_todo':
        case 'mark_todo_complete':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const todoResponse = await fetch(`${baseUrl}/api/aimpact/todos`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                id: action.parameters.id,
                completed: true
              })
            });

            if (todoResponse.ok) {
              const todoData = await todoResponse.json();
              results.push({
                type: action.type,
                success: true,
                data: todoData.todo,
                description: `Completed todo: ${todoData.todo.title}`,
                show_message: `✅ Todo completed: "${todoData.todo.title}"`,
                navigate_to: 'todo'
              });
            } else {
              const error = await todoResponse.json();
              throw new Error(error.error || 'Failed to complete todo');
            }
          } catch (todoError) {
            results.push({
              type: action.type,
              success: false,
              error: todoError instanceof Error ? todoError.message : 'Failed to complete todo',
              description: 'Could not complete todo'
            });
          }
          break;

        case 'delete_todo':
        case 'remove_todo':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const todoResponse = await fetch(`${baseUrl}/api/aimpact/todos?id=${action.parameters.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              }
            });

            if (todoResponse.ok) {
              results.push({
                type: action.type,
                success: true,
                data: { id: action.parameters.id },
                description: `Deleted todo`,
                show_message: `🗑️ Todo deleted successfully`,
                navigate_to: 'todo'
              });
            } else {
              const error = await todoResponse.json();
              throw new Error(error.error || 'Failed to delete todo');
            }
          } catch (todoError) {
            results.push({
              type: action.type,
              success: false,
              error: todoError instanceof Error ? todoError.message : 'Failed to delete todo',
              description: 'Could not delete todo'
            });
          }
          break;

        case 'get_todo_stats':
        case 'todo_overview':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const statsResponse = await fetch(`${baseUrl}/api/aimpact/todos/stats`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              }
            });

            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              const stats = statsData.stats;
              
              results.push({
                type: action.type,
                success: true,
                data: stats,
                description: `Retrieved todo statistics`,
                show_message: `📊 Todo Overview: ${stats.overview.total} total, ${stats.overview.completed} completed, ${stats.overview.pending} pending${stats.overview.overdue > 0 ? `, ${stats.overview.overdue} overdue` : ''}`,
                todo_stats: stats
              });
            } else {
              throw new Error('Failed to fetch todo stats');
            }
          } catch (statsError) {
            results.push({
              type: action.type,
              success: false,
              error: statsError instanceof Error ? statsError.message : 'Failed to fetch todo stats',
              description: 'Could not retrieve todo statistics'
            });
          }
          break;

        case 'bulk_todo_action':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const bulkResponse = await fetch(`${baseUrl}/api/aimpact/todos/bulk`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                action: action.parameters.action,
                todoIds: action.parameters.todoIds,
                filters: action.parameters.filters,
                updates: action.parameters.updates
              })
            });

            if (bulkResponse.ok) {
              const bulkData = await bulkResponse.json();
              results.push({
                type: action.type,
                success: true,
                data: bulkData,
                description: bulkData.message,
                show_message: `✅ ${bulkData.message}`,
                navigate_to: 'todo'
              });
            } else {
              const error = await bulkResponse.json();
              throw new Error(error.error || 'Failed to perform bulk action');
            }
          } catch (bulkError) {
            results.push({
              type: action.type,
              success: false,
              error: bulkError instanceof Error ? bulkError.message : 'Failed to perform bulk action',
              description: 'Could not perform bulk todo action'
            });
          }
          break;

        case 'schedule_todo':
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const scheduleResponse = await fetch(`${baseUrl}/api/aimpact/todos`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                id: action.parameters.id,
                dueDate: action.parameters.dueDate,
                dueTime: action.parameters.dueTime
              })
            });

            if (scheduleResponse.ok) {
              const todoData = await scheduleResponse.json();
              const schedule = `${todoData.todo.dueDate}${todoData.todo.dueTime ? ` at ${todoData.todo.dueTime}` : ''}`;
              results.push({
                type: action.type,
                success: true,
                data: todoData.todo,
                description: `Scheduled todo: ${todoData.todo.title} for ${schedule}`,
                show_message: `📅 Todo scheduled: "${todoData.todo.title}" for ${schedule}`,
                navigate_to: 'todo'
              });
            } else {
              const error = await scheduleResponse.json();
              throw new Error(error.error || 'Failed to schedule todo');
            }
          } catch (scheduleError) {
            results.push({
              type: action.type,
              success: false,
              error: scheduleError instanceof Error ? scheduleError.message : 'Failed to schedule todo',
              description: 'Could not schedule todo'
            });
          }
          break;

      }
    } catch (error) {
      results.push({
        type: action.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        description: `Failed to execute ${action.type}`
      });
    }
  }
  
  return results;
}

// Store for last analysis result (in-memory for session)
let lastAnalysisResult: any = null;

export async function POST(request: NextRequest) {
  try {
    const { message, context, personalContext, history, imageBase64 } = await request.json();
    
    const supabase = getSupabaseClient();
    const openai = getOpenAIClient();
    
    // If there's an image and the message mentions business card, add it to the AI analysis
    let enhancedMessage = message;
    if (imageBase64 && message.toLowerCase().includes('business card')) {
      enhancedMessage = `${message}\n\n[User has uploaded a business card image for processing]`;
    }
    
    // Analyze the user's intent with personal context and conversation history
    const enhancedContext = {
      ...context,
      personalContext: personalContext || ''
    };
    const intent = await analyzeIntent(message, enhancedContext, history || [], openai);
    
    // Search the book if relevant
    let bookContext = '';
    let bookSearched = false;
    let bookFound = false;
    
    try {
      if (shouldSearchBook(message)) {
        bookSearched = true;
        const bookSearch = await searchInstantAIAgencyBook(message, openai);
        if (bookSearch.found) {
          bookFound = true;
          bookContext = bookSearch.content;
        }
      }
    } catch (error) {
      console.warn('Book search failed:', error);
      // Continue without book context - don't fail the entire request
    }
    
    // Execute the required actions
    const actionResults = await executeActions(intent, supabase, request, imageBase64);
    
    // Generate the final response
    let systemPromptWithContext = personalContext 
      ? `${SYSTEM_PROMPT}\n\nPERSONAL CONTEXT FOR THIS USER:\n${personalContext}`
      : SYSTEM_PROMPT;
    
    // Add book context if found
    if (bookContext) {
      systemPromptWithContext += `\n\n${bookContext}`;
    }
    
    // Get a random entrepreneur quote
    const randomQuote = getRandomQuote();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPromptWithContext
        },
        {
          role: 'user',
          content: `User message: ${enhancedMessage}
          
${bookContext ? `Book Knowledge Found: The Instant AI Agency book has relevant information about this topic.\n` : ''}

Actions taken: ${JSON.stringify(actionResults, null, 2)}

Entrepreneur Quote for Inspiration:
"${randomQuote.text}" - ${randomQuote.author}

Provide a concise, friendly response confirming what was done or providing the requested information. 
- If book knowledge was found, incorporate it naturally into your response
- Adapt your communication style to match the user's preferences from their personal context
- If actions were successful, clearly state what was created/updated
- If there were errors, explain them simply without technical jargon
- Use bullet points for clarity when listing multiple items
- Include specific details like names, IDs, or counts
- Don't ask for information that was already provided or can be inferred
- When sharing book knowledge, cite the chapter or section when relevant

DAILY BRIEFING FORMAT:
When providing a daily briefing (get_daily_briefing action), format it as follows:
1. Start with time-appropriate greeting: "Good evening" after 9pm, "Good night" after 11pm, etc.
2. State clearly: "Here's your agenda for tomorrow, [Day], [Date]" or "today"
3. ALWAYS include Weather section from briefing.weather:
   - Temperature and feels like
   - Condition with emoji
   - High/Low for the day
4. Schedule section - if no meetings, say "No scheduled meetings for [tomorrow/today]"
5. To-Do Tasks section - List todos from briefing.todaysSchedule.todos:
   - Group by priority (Urgent, High, Medium, Low)
   - Show title, category, and time if set
   - If no todos, say "No tasks scheduled for [tomorrow/today]"
6. Priority Tasks - be honest if there are none
7. Skip email counts - don't mention unread emails
8. Suggested Actions based on actual data
9. End with the entrepreneur quote provided (format it nicely)

IMPORTANT: 
- The current time is in briefing.currentTime - use it for proper greeting
- If briefing.todaysSchedule.meetings is empty, say "No scheduled meetings"
- Don't make up data - if metrics are 0, acknowledge it positively

CALENDAR FORMATTING RULES:
- DO NOT use bold markdown (**text**) for calendar events
- Format meetings cleanly without excessive formatting
- For calendar events, use this format:
  
  Meeting Title
  • Date: August 13, 2025
  • Time: 11:00 AM
  • Link: [View in Calendar](url)
  
- Make links clickable using markdown link syntax: [text](url)
- Keep formatting simple and readable
- Do not use asterisks for emphasis in calendar listings`
        }
      ]
    });
    
    return NextResponse.json({
      message: completion.choices[0].message.content,
      actions: actionResults,
      metadata: {
        module: context?.module,
        actionType: intent.intent,
        affectedEntities: actionResults.map(r => r.data).filter(Boolean),
        bookSearched: bookSearched,
        bookFound: bookFound
      }
    });
    
  } catch (error) {
    console.error('Agentic chat error:', error);
    return NextResponse.json(
      { 
        message: 'I encountered an error processing your request. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'NEXUS Agentic AI Chat is operational',
    capabilities: [
      'Client Management (CRM)',
      'Project Management',
      'Ticket Management',
      'Quote Management',
      'Data Analysis',
      'Workflow Automation'
    ]
  });
}