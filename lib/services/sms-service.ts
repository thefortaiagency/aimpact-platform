import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SMSContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  organizationId?: string;
  organizationName?: string;
  createdAt: Date;
  lastContacted?: Date;
  notes?: string;
}

export interface SMSMessage {
  id: string;
  conversationId: string;
  contactId?: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  message: string;
  status?: 'sending' | 'sent' | 'delivered' | 'failed' | 'received';
  messageSid?: string;
  createdAt: Date;
  readAt?: Date;
}

export interface SMSConversation {
  id: string;
  contactId?: string;
  contactName?: string;
  phoneNumber: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  messages: SMSMessage[];
}

class SMSService {
  private static instance: SMSService;
  private conversations: Map<string, SMSConversation> = new Map();
  private contacts: Map<string, SMSContact> = new Map();

  private constructor() {
    this.loadConversations();
    this.loadContacts();
    // Poll for new messages every 3 seconds
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.checkForNewMessages();
      }, 3000);
    }
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  // Check for new messages and outbound messages
  async checkForNewMessages() {
    try {
      console.log('SMS Service: Checking for new messages...');
      
      // Get ALL recent messages (both inbound and outbound) to ensure full sync
      const { data: recentMessages, error } = await supabase
        .from('communications')
        .select('*')
        .eq('type', 'sms')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Last 2 minutes
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking for new messages:', error);
        return;
      }

      console.log('SMS Service: Found', recentMessages?.length || 0, 'recent messages');
      let hasNewMessages = false;

      // Process each recent message
      for (const msg of recentMessages || []) {
        const phoneNumber = msg.phone_number;
        
        // Get or create conversation
        let conversation = this.conversations.get(phoneNumber);
        if (!conversation) {
          console.log('SMS Service: Creating new conversation for', phoneNumber);
          await this.loadConversations();
          conversation = this.conversations.get(phoneNumber);
        }

        if (conversation) {
          // Check if we already have this message
          const existingMessage = conversation.messages.find(m => 
            m.messageSid === msg.message_id || 
            (m.createdAt.getTime() === new Date(msg.created_at).getTime() && m.message === msg.content)
          );
          
          if (!existingMessage) {
            console.log('SMS Service: Adding new message to conversation:', msg.direction, msg.content.substring(0, 50));
            hasNewMessages = true;
            
            // This is a new message, add it to the conversation
            const newMessage: SMSMessage = {
              id: msg.id,
              conversationId: `conv_${phoneNumber}`,
              contactId: msg.contact_id,
              phoneNumber: msg.phone_number,
              direction: msg.direction,
              message: msg.content,
              status: msg.direction === 'inbound' ? 'received' : 'sent',
              messageSid: msg.message_id,
              createdAt: new Date(msg.created_at),
              readAt: msg.read_at ? new Date(msg.read_at) : undefined
            };
            
            conversation.messages.push(newMessage);
            conversation.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            
            conversation.lastMessage = msg.content;
            conversation.lastMessageTime = new Date(msg.created_at);
            
            if (msg.direction === 'inbound' && !msg.read_at) {
              conversation.unreadCount++;
            }
          }
        }
      }

      // Emit update event if we found new messages
      if (hasNewMessages && typeof window !== 'undefined') {
        console.log('SMS Service: Broadcasting conversation update event');
        window.dispatchEvent(new CustomEvent('sms-conversations-updated', {
          detail: { conversations: this.getConversations() }
        }));
      }
      
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }

  // Load conversations from database
  async loadConversations() {
    try {
      // Get unique phone numbers from communications
      const { data: communications, error } = await supabase
        .from('communications')
        .select('phone_number, content, created_at, direction, contact_id')
        .eq('type', 'sms')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      // Group messages by phone number to create conversations
      const phoneNumbers = new Set<string>();
      const latestMessages = new Map<string, any>();
      
      communications?.forEach(msg => {
        if (msg.phone_number) {
          phoneNumbers.add(msg.phone_number);
          if (!latestMessages.has(msg.phone_number)) {
            latestMessages.set(msg.phone_number, msg);
          }
        }
      });

      // Create conversations for each unique phone number
      for (const phoneNumber of phoneNumbers) {
        const latestMsg = latestMessages.get(phoneNumber);
        
        // Load contact info if available
        let contactName = null;
        if (latestMsg?.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('first_name, last_name')
            .eq('id', latestMsg.contact_id)
            .single();
          
          if (contact) {
            contactName = `${contact.first_name} ${contact.last_name || ''}`.trim();
          }
        }
        
        const conversation: SMSConversation = {
          id: `conv_${phoneNumber}`,
          contactId: latestMsg?.contact_id,
          contactName,
          phoneNumber,
          lastMessage: latestMsg?.content,
          lastMessageTime: latestMsg?.created_at ? new Date(latestMsg.created_at) : undefined,
          unreadCount: 0, // Will be calculated when messages are loaded
          messages: []
        };
        this.conversations.set(phoneNumber, conversation);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  // Load contacts from database
  async loadContacts() {
    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .not('phone', 'is', null);

      if (error) {
        console.error('Error loading contacts:', error);
        return;
      }

      contacts?.forEach(contact => {
        const smsContact: SMSContact = {
          id: contact.id,
          firstName: contact.first_name || '',
          lastName: contact.last_name || '',
          phone: contact.phone,
          email: contact.email,
          organizationId: contact.organization_id,
          organizationName: contact.organization?.name,
          createdAt: new Date(contact.created_at),
          lastContacted: contact.last_contacted ? new Date(contact.last_contacted) : undefined,
          notes: contact.notes
        };
        this.contacts.set(contact.phone, smsContact);
      });
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }

  // Get all conversations
  getConversations(): SMSConversation[] {
    return Array.from(this.conversations.values()).sort((a, b) => {
      const timeA = a.lastMessageTime?.getTime() || 0;
      const timeB = b.lastMessageTime?.getTime() || 0;
      return timeB - timeA;
    });
  }

  // Get conversation by phone number
  async getConversation(phoneNumber: string): Promise<SMSConversation | null> {
    console.log('SMS Service: Getting conversation for', phoneNumber);
    
    // Check cache first
    if (this.conversations.has(phoneNumber)) {
      const conversation = this.conversations.get(phoneNumber)!;
      console.log('SMS Service: Found cached conversation with', conversation.messages.length, 'messages');
      
      // Load messages if not loaded
      if (conversation.messages.length === 0) {
        console.log('SMS Service: No messages in cache, loading from database');
        await this.loadMessages(phoneNumber);
      }
      return conversation;
    }

    // Try to load from database - using communications table
    const { data: messages, error } = await supabase
      .from('communications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('type', 'sms')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading conversation:', error);
      return null;
    }

    // Create new conversation
    const conversation: SMSConversation = {
      id: `conv_${phoneNumber}`,
      phoneNumber,
      messages: messages?.map(msg => ({
        id: msg.id,
        conversationId: `conv_${phoneNumber}`,
        contactId: msg.contact_id,
        phoneNumber: msg.phone_number,
        direction: msg.direction,
        message: msg.content, // Changed from msg.message to msg.content
        status: msg.metadata?.status || (msg.direction === 'inbound' ? 'received' : 'sent'),
        messageSid: msg.message_id,
        createdAt: new Date(msg.created_at),
        readAt: msg.read_at ? new Date(msg.read_at) : undefined
      })) || [],
      unreadCount: messages?.filter(m => m.direction === 'inbound' && !m.read_at).length || 0,
      lastMessage: messages?.[messages.length - 1]?.content, // Changed from message to content
      lastMessageTime: messages?.[messages.length - 1] ? new Date(messages[messages.length - 1].created_at) : undefined
    };

    // Check if contact exists
    const contact = this.contacts.get(phoneNumber);
    if (contact) {
      conversation.contactId = contact.id;
      conversation.contactName = `${contact.firstName} ${contact.lastName}`.trim();
    }

    this.conversations.set(phoneNumber, conversation);
    return conversation;
  }

  // Load messages for a conversation
  async loadMessages(phoneNumber: string): Promise<SMSMessage[]> {
    const { data: messages, error } = await supabase
      .from('communications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('type', 'sms')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return [];
    }

    const smsMessages = messages?.map(msg => ({
      id: msg.id,
      conversationId: `conv_${phoneNumber}`,
      contactId: msg.contact_id,
      phoneNumber: msg.phone_number,
      direction: msg.direction as 'inbound' | 'outbound',
      message: msg.content, // Changed from msg.message to msg.content
      status: msg.metadata?.status || (msg.direction === 'inbound' ? 'received' : 'sent'),
      messageSid: msg.message_id,
      createdAt: new Date(msg.created_at),
      readAt: msg.read_at ? new Date(msg.read_at) : undefined
    })) || [];

    // Update conversation cache
    if (this.conversations.has(phoneNumber)) {
      const conversation = this.conversations.get(phoneNumber)!;
      conversation.messages = smsMessages;
    }

    return smsMessages;
  }

  // Send SMS message
  async sendMessage(phoneNumber: string, message: string, contactId?: string): Promise<SMSMessage> {
    console.log('SMS Service: Sending message to', phoneNumber, 'Content:', message);
    
    // Create message object
    const newMessage: SMSMessage = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_${phoneNumber}`,
      contactId,
      phoneNumber,
      direction: 'outbound',
      message,
      status: 'sending',
      createdAt: new Date()
    };

    // Update conversation
    let conversation = await this.getConversation(phoneNumber);
    if (!conversation) {
      console.log('SMS Service: Creating new conversation for', phoneNumber);
      conversation = {
        id: `conv_${phoneNumber}`,
        phoneNumber,
        messages: [],
        unreadCount: 0,
        contactId,
        lastMessage: message,
        lastMessageTime: new Date()
      };
      this.conversations.set(phoneNumber, conversation);
    }
    
    console.log('SMS Service: Adding message to conversation cache. Messages before:', conversation.messages.length);
    conversation.messages.push(newMessage);
    conversation.lastMessage = message;
    conversation.lastMessageTime = new Date();
    console.log('SMS Service: Messages after adding:', conversation.messages.length);

    // Send via API
    try {
      const response = await fetch('/api/sms/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, message })
      });

      if (response.ok) {
        const result = await response.json();
        newMessage.status = 'sent';
        newMessage.messageSid = result.sid;
        console.log('SMS Service: Message sent successfully, Twilio SID:', result.sid);

        // Store in communications table for CRM - with all required fields
        const { error: insertError } = await supabase.from('communications').insert({
          contact_id: contactId,
          type: 'sms',
          direction: 'outbound',
          content: message,
          phone_number: phoneNumber,
          from_address: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || '+12602647730',
          to_address: phoneNumber,
          message_id: result.sid,
          communicated_at: new Date().toISOString(), // Required field
          metadata: { twilio_sid: result.sid },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        if (insertError) {
          console.error('Failed to store outbound SMS:', insertError);
        } else {
          console.log('SMS Service: Message stored in database successfully');
        }
      } else {
        console.error('SMS Service: Failed to send message via API');
        newMessage.status = 'failed';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      newMessage.status = 'failed';
    }

    console.log('SMS Service: Returning message with status:', newMessage.status);
    return newMessage;
  }

  // Save new contact
  async saveContact(phoneNumber: string, firstName: string, lastName?: string, organizationId?: string): Promise<SMSContact> {
    try {
      console.log('Saving contact:', { phoneNumber, firstName, lastName, organizationId });
      
      // Clean phone number to match database format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : 
                             cleanPhone.length === 11 && cleanPhone[0] === '1' ? `+${cleanPhone}` :
                             phoneNumber;
      
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: lastName || '',
          phone: formattedPhone,
          organization_id: organizationId || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving contact to database:', error);
        throw error;
      }

      const newContact: SMSContact = {
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name || '',
        phone: contact.phone,
        organizationId: contact.organization_id,
        createdAt: new Date(contact.created_at)
      };

      // Update cache with both original and formatted phone numbers
      this.contacts.set(phoneNumber, newContact);
      this.contacts.set(formattedPhone, newContact);

      // Update conversation if exists
      if (this.conversations.has(phoneNumber)) {
        const conversation = this.conversations.get(phoneNumber)!;
        conversation.contactId = contact.id;
        conversation.contactName = `${firstName} ${lastName || ''}`.trim();
      }

      return newContact;
    } catch (error) {
      console.error('Error saving contact:', error);
      throw error;
    }
  }

  // Move contact to organization
  async moveContactToOrganization(contactId: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ organization_id: organizationId })
        .eq('id', contactId);

      if (error) {
        throw error;
      }

      // Update cache
      for (const contact of this.contacts.values()) {
        if (contact.id === contactId) {
          contact.organizationId = organizationId;
          break;
        }
      }
    } catch (error) {
      console.error('Error moving contact:', error);
      throw error;
    }
  }

  // Get contact by phone number
  getContact(phoneNumber: string): SMSContact | null {
    return this.contacts.get(phoneNumber) || null;
  }

  // Mark messages as read
  async markAsRead(phoneNumber: string): Promise<void> {
    try {
      await supabase
        .from('communications')
        .update({ read_at: new Date().toISOString() })
        .eq('phone_number', phoneNumber)
        .eq('type', 'sms')
        .eq('direction', 'inbound')
        .is('read_at', null);

      // Update cache
      if (this.conversations.has(phoneNumber)) {
        const conversation = this.conversations.get(phoneNumber)!;
        conversation.unreadCount = 0;
        conversation.messages.forEach(msg => {
          if (msg.direction === 'inbound' && !msg.readAt) {
            msg.readAt = new Date();
          }
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Listen for incoming messages (can be called from webhook)
  async receiveMessage(phoneNumber: string, message: string, messageSid: string): Promise<void> {
    const contact = this.getContact(phoneNumber);
    
    const newMessage: SMSMessage = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_${phoneNumber}`,
      contactId: contact?.id,
      phoneNumber,
      direction: 'inbound',
      message,
      status: 'received',
      messageSid,
      createdAt: new Date()
    };

    // Store in communications table for CRM
    await supabase.from('communications').insert({
      contact_id: contact?.id,
      type: 'sms',
      direction: 'inbound',
      content: message,
      phone_number: phoneNumber,
      from_address: phoneNumber,
      to_address: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || '+12602647730',
      message_id: messageSid,
      metadata: { twilio_sid: messageSid }
    });

    // Update conversation
    let conversation = await this.getConversation(phoneNumber);
    if (!conversation) {
      conversation = {
        id: `conv_${phoneNumber}`,
        phoneNumber,
        messages: [],
        unreadCount: 0,
        contactId: contact?.id,
        contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : undefined,
        lastMessage: message,
        lastMessageTime: new Date()
      };
      this.conversations.set(phoneNumber, conversation);
    }
    
    conversation.messages.push(newMessage);
    conversation.lastMessage = message;
    conversation.lastMessageTime = new Date();
    conversation.unreadCount++;

    // Emit event for UI updates (only on client)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms-received', {
        detail: { phoneNumber, message, contact }
      }));
    }
  }
}

// Create a proxy that initializes the service only when accessed on the client
const createSMSServiceProxy = () => {
  let instance: SMSService | null = null;
  
  return new Proxy({} as SMSService, {
    get(target, prop, receiver) {
      if (typeof window === 'undefined') {
        // On server, return a no-op function for any method
        if (typeof prop === 'string') {
          return () => Promise.resolve(null);
        }
        return null;
      }
      
      // On client, initialize if needed
      if (!instance) {
        instance = SMSService.getInstance();
      }
      
      return Reflect.get(instance, prop, receiver);
    }
  });
};

export const smsService = createSMSServiceProxy();