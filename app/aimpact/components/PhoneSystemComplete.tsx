'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  MessageSquare, Send, Clock, User, Users, Search, Plus,
  Mic, MicOff, Volume2, VolumeX, MoreVertical, Star,
  Calendar, CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, UserPlus
} from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EmbeddedSoftphone } from '@/components/embedded-softphone';
import { format, formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { smsService } from '@/lib/services/sms-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  isFavorite?: boolean;
  lastContacted?: Date;
  avatar?: string;
}

interface CallRecord {
  id: string;
  contactId?: string;
  contactName: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'answered' | 'missed' | 'declined' | 'voicemail';
  duration?: number; // in seconds
  timestamp: Date;
  recording?: string;
}

interface SMSMessage {
  id: string;
  contactId?: string;
  contactName: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  message: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

interface SMSConversation {
  contactId: string;
  contactName: string;
  phoneNumber: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: SMSMessage[];
}

export default function PhoneSystemComplete() {
  const [activeTab, setActiveTab] = useState<'dialer' | 'sms' | 'contacts' | 'history'>('dialer');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use shared contacts hook
  const { 
    contacts: hookContacts, 
    loading: contactsLoading, 
    error: contactsError,
    toggleFavorite: toggleContactFavorite,
    addContact,
    updateContact,
    deleteContact
  } = useContacts();
  
  // Transform contacts to match our interface
  const contacts: Contact[] = hookContacts.map(c => ({
    id: c.id,
    name: c.name || `${c.firstName} ${c.lastName}`.trim(),
    phone: c.phone || '',
    email: c.email,
    company: c.company,
    isFavorite: c.isFavorite,
    lastContacted: c.lastContacted,
    avatar: c.avatar
  })).filter(c => c.phone); // Only show contacts with phone numbers
  
  // Call history state
  const [callHistory, setCallHistory] = useState<CallRecord[]>([
    {
      id: '1',
      contactId: '1',
      contactName: 'John Smith',
      phoneNumber: '+12605551234',
      direction: 'outbound',
      status: 'answered',
      duration: 245,
      timestamp: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      id: '2',
      contactName: 'Unknown',
      phoneNumber: '+12605553456',
      direction: 'inbound',
      status: 'missed',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
    },
    {
      id: '3',
      contactId: '2',
      contactName: 'Sarah Johnson',
      phoneNumber: '+12605555678',
      direction: 'inbound',
      status: 'answered',
      duration: 180,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24)
    }
  ]);
  
  // SMS state - using real data from smsService
  const [smsConversations, setSmsConversations] = useState<SMSConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const [selectedConversation, setSelectedConversation] = useState<SMSConversation | null>(null);
  const [newSmsMessage, setNewSmsMessage] = useState('');
  const [newSmsNumber, setNewSmsNumber] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  
  // Save contact dialog state
  const [showSaveContactDialog, setShowSaveContactDialog] = useState(false);
  const [saveContactPhone, setSaveContactPhone] = useState('');
  const [saveContactFirstName, setSaveContactFirstName] = useState('');
  const [saveContactLastName, setSaveContactLastName] = useState('');
  const [saveContactOrganization, setSaveContactOrganization] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Load SMS conversations on mount and set up polling
  useEffect(() => {
    loadSMSConversations();
    
    // Poll for new messages every 3 seconds
    const pollInterval = setInterval(() => {
      loadSMSConversations();
    }, 3000);
    
    // Listen for SMS events
    const handleSmsReceived = (event: CustomEvent) => {
      console.log('PhoneSystem: SMS received event');
      loadSMSConversations();
      // If this conversation is selected, reload messages
      if (selectedConversation?.phoneNumber === event.detail.phoneNumber) {
        loadConversation(event.detail.phoneNumber);
      }
    };

    const handleConversationsUpdated = (event: CustomEvent) => {
      console.log('PhoneSystem: Conversations updated event');
      loadSMSConversations();
    };
    
    window.addEventListener('sms-received', handleSmsReceived as EventListener);
    window.addEventListener('sms-conversations-updated', handleConversationsUpdated as EventListener);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('sms-received', handleSmsReceived as EventListener);
      window.removeEventListener('sms-conversations-updated', handleConversationsUpdated as EventListener);
    };
  }, [selectedConversation]);

  // Load all SMS conversations using unified smsService
  const loadSMSConversations = async () => {
    try {
      console.log('PhoneSystem: Loading SMS conversations via smsService');
      if (smsService) {
        const convs = smsService.getConversations();
        console.log('PhoneSystem: Got', convs.length, 'conversations from service');
        
        const formattedConvs: SMSConversation[] = convs.map(conv => ({
          contactId: conv.contactId || conv.id,
          contactName: conv.contactName || formatPhoneNumber(conv.phoneNumber),
          phoneNumber: conv.phoneNumber,
          lastMessage: conv.lastMessage || '',
          lastMessageTime: conv.lastMessageTime || new Date(),
          unreadCount: conv.unreadCount,
          messages: conv.messages.map(msg => ({
            id: msg.id,
            contactId: conv.contactId,
            contactName: conv.contactName || formatPhoneNumber(conv.phoneNumber),
            phoneNumber: msg.phoneNumber,
            direction: msg.direction,
            message: msg.message,
            timestamp: msg.createdAt,
            status: msg.status as any || 'delivered'
          }))
        }));
        setSmsConversations(formattedConvs);
      }
    } catch (error) {
      console.error('Error loading SMS conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  };

  // Load a specific conversation
  const loadConversation = async (phoneNumber: string) => {
    setConversationLoading(true);
    try {
      // Fetch messages from database
      const response = await fetch(`/api/sms/messages?phone=${encodeURIComponent(phoneNumber)}`);
      if (response.ok) {
        const data = await response.json();
        
        // Find the conversation in our list
        const conv = smsConversations.find(c => c.phoneNumber === phoneNumber);
        if (conv) {
          // Update with fresh messages
          const updatedConv: SMSConversation = {
            ...conv,
            messages: data.messages.map((msg: any) => ({
              id: msg.id,
              contactId: msg.contact_id,
              contactName: conv.contactName,
              phoneNumber: msg.phone_number,
              direction: msg.direction,
              message: msg.content,
              timestamp: new Date(msg.created_at),
              status: msg.direction === 'outbound' ? 'delivered' : 'received'
            }))
          };
          setSelectedConversation(updatedConv);
          setShowNewConversation(false);
          
          // Mark messages as read
          await fetch('/api/sms/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
          });
        }
      } else {
        // Fallback to service
        if (smsService) {
          const conversation = await smsService.getConversation(phoneNumber);
          if (conversation) {
            const formattedConv: SMSConversation = {
              contactId: conversation.contactId || conversation.id,
              contactName: conversation.contactName || formatPhoneNumber(conversation.phoneNumber),
              phoneNumber: conversation.phoneNumber,
              lastMessage: conversation.lastMessage || '',
              lastMessageTime: conversation.lastMessageTime || new Date(),
              unreadCount: conversation.unreadCount,
              messages: conversation.messages.map(msg => ({
                id: msg.id,
                contactId: conversation.contactId,
                contactName: conversation.contactName || formatPhoneNumber(conversation.phoneNumber),
                phoneNumber: msg.phoneNumber,
                direction: msg.direction,
                message: msg.message,
                timestamp: msg.createdAt,
                status: msg.status as any || 'delivered'
              }))
            };
            setSelectedConversation(formattedConv);
            setShowNewConversation(false);
            await smsService.markAsRead(phoneNumber);
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setConversationLoading(false);
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact &&
    ((contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (contact.phone && contact.phone.includes(searchQuery)) ||
    (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  // Filter call history based on search
  const filteredCallHistory = callHistory.filter(call =>
    call &&
    ((call.contactName && call.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (call.phoneNumber && call.phoneNumber.includes(searchQuery)))
  );

  // Handle making a call from contacts or history
  const handleCall = (phoneNumber: string, contactName?: string) => {
    // This will be handled by the embedded softphone
    // For now, we'll just switch to the dialer tab
    setActiveTab('dialer');
  };

  // Handle sending SMS
  const handleSendSms = async () => {
    if (!newSmsMessage.trim()) return;
    
    const recipient = selectedConversation?.phoneNumber || newSmsNumber;
    if (!recipient) {
      toast.error('Please enter a phone number or select a conversation');
      return;
    }
    
    try {
      // Check if this is a new number (not in contacts)
      const contact = smsService?.getContact(recipient);
      
      // Send message through service
      if (smsService) {
        const sentMessage = await smsService.sendMessage(
          recipient, 
          newSmsMessage, 
          selectedConversation?.contactId
        );
        
        // If no contact exists and we have a name, offer to save
        if (!contact && !selectedConversation?.contactId) {
          setSaveContactPhone(recipient);
          setShowSaveContactDialog(true);
        }
        
        // Reload conversation to show new message
        await loadConversation(recipient);
        
        toast.success('Message sent successfully');
        setNewSmsMessage('');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle saving a contact
  const handleSaveContact = async () => {
    try {
      if (!saveContactFirstName.trim()) {
        toast.error('Please enter a first name');
        return;
      }

      console.log('Saving contact:', { 
        phone: saveContactPhone, 
        firstName: saveContactFirstName,
        lastName: saveContactLastName,
        org: saveContactOrganization 
      });

      // Save directly via API instead of relying on service
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: saveContactFirstName,
          last_name: saveContactLastName || '',
          phone: saveContactPhone,
          organization_id: saveContactOrganization || null,
          is_active: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save contact');
      }

      const result = await response.json();
      console.log('Contact saved:', result);

      toast.success('Contact saved successfully');
      setShowSaveContactDialog(false);
      
      // Reset form
      setSaveContactFirstName('');
      setSaveContactLastName('');
      setSaveContactOrganization('');
      
      // Reload conversations
      await loadSMSConversations();
      if (selectedConversation) {
        await loadConversation(saveContactPhone);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save contact');
    }
  };

  // Toggle favorite status (using the hook)
  const toggleFavorite = async (contactId: string) => {
    await toggleContactFavorite(contactId);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Phone System</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts, numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel - Phone/Dialer */}
        <Card className="w-96 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Phone</CardTitle>
            <CardDescription>Make calls and manage your phone</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <EmbeddedSoftphone position="sidebar" defaultMinimized={false} />
          </CardContent>
        </Card>

        {/* Right Panel - Tabs */}
        <Card className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sms">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS
                </TabsTrigger>
                <TabsTrigger value="contacts">
                  <Users className="h-4 w-4 mr-2" />
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="flex-1 p-4 overflow-hidden">
              {/* SMS Tab */}
              <TabsContent value="sms" className="h-full m-0 flex gap-4">
                {/* Conversations List */}
                <div className="w-80 flex flex-col border-r pr-4">
                  <div className="mb-4 space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedConversation(null);
                        setNewSmsNumber('');
                        setShowNewConversation(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      New Message
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-muted-foreground"
                      onClick={() => {
                        loadSMSConversations();
                        toast.success('Refreshed conversations');
                      }}
                    >
                      <Loader2 className="h-3 w-3 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {conversationsLoading ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading conversations...
                        </div>
                      ) : smsConversations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p className="text-sm">No conversations yet</p>
                          <p className="text-xs mt-1">Send a message to start chatting</p>
                        </div>
                      ) : (
                        smsConversations.map(conv => (
                          <button
                            key={conv.contactId}
                            onClick={() => {
                              setSelectedConversation(conv);
                              setShowNewConversation(false);
                            }}
                            className={`w-full p-3 rounded-lg hover:bg-accent text-left transition-colors ${
                              selectedConversation?.contactId === conv.contactId ? 'bg-accent' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{conv.contactName}</p>
                                  {conv.unreadCount > 0 && (
                                    <Badge variant="default" className="h-5 px-1">
                                      {conv.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {conv.lastMessage}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {conv.lastMessageTime && format(conv.lastMessageTime, 'HH:mm')}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Conversation View */}
                <div className="flex-1 flex flex-col">
                  {selectedConversation ? (
                    <>
                      {/* Conversation Header */}
                      <div className="pb-3 border-b mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{selectedConversation.contactName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedConversation.phoneNumber}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCall(selectedConversation.phoneNumber)}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        </div>
                      </div>

                      {/* Messages */}
                      <ScrollArea className="flex-1 mb-4">
                        <div className="space-y-4 pr-4">
                          {selectedConversation.messages.map(msg => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                msg.direction === 'outbound'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}>
                                <p className="text-sm">{msg.message}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs opacity-70">
                                    {format(msg.timestamp, 'HH:mm')}
                                  </span>
                                  {msg.direction === 'outbound' && (
                                    <>
                                      <span className="text-xs opacity-70">·</span>
                                      <span className="text-xs opacity-70">{msg.status}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={newSmsMessage}
                          onChange={(e) => setNewSmsMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendSms();
                            }
                          }}
                          className="min-h-[60px] resize-none"
                        />
                        <Button onClick={handleSendSms} size="icon" className="h-[60px]">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : showNewConversation ? (
                    <div className="flex-1 flex flex-col">
                      {/* New Conversation Header */}
                      <div className="pb-3 border-b mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-500" />
                          <span className="font-semibold">New Conversation</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Phone Number</label>
                            <Input
                              placeholder="(260) 555-0123"
                              value={newSmsNumber}
                              onChange={(e) => setNewSmsNumber(e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Contact Name (Optional)</label>
                            <Input
                              placeholder="John Smith"
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Empty Messages Area */}
                      <ScrollArea className="flex-1 mb-4">
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                          <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                          <p>No messages yet</p>
                          <p className="text-sm mt-2">Send a message to start the conversation</p>
                        </div>
                      </ScrollArea>
                      
                      {/* Message Input */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={newSmsMessage}
                          onChange={(e) => setNewSmsMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendSms();
                            }
                          }}
                          className="min-h-[60px] resize-none"
                        />
                        <Button 
                          onClick={handleSendSms} 
                          size="icon" 
                          className="h-[60px]"
                          disabled={!newSmsNumber || !newSmsMessage.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                      <h3 className="font-semibold mb-2 text-lg">Select a Conversation</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose a conversation from the list or start a new one
                      </p>
                      <Button 
                        onClick={() => {
                          setShowNewConversation(true);
                          setNewSmsNumber('');
                        }}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Start New Conversation
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="h-full m-0">
                {contactsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : contactsError ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="font-semibold mb-2">Error loading contacts</h3>
                    <p className="text-sm text-muted-foreground">Using sample data</p>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                    {/* Favorites Section */}
                    {filteredContacts.some(c => c.isFavorite) && (
                      <>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                          Favorites
                        </h3>
                        {filteredContacts
                          .filter(c => c && c.isFavorite)
                          .map(contact => {
                            if (!contact) return null;
                            return (
                            <div
                              key={contact?.id || Math.random()}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {(contact?.name || 'U').split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{contact?.name || 'Unknown'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {contact?.company || ''} · {contact?.phone || ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => contact?.id && toggleFavorite(contact.id)}
                                >
                                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => contact?.phone && handleCall(contact.phone, contact?.name)}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setActiveTab('sms');
                                    setNewSmsNumber(contact?.phone || '');
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    <DropdownMenuItem>Edit Contact</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      Delete Contact
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );})}
                        <Separator className="my-4" />
                      </>
                    )}

                    {/* All Contacts */}
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                      All Contacts
                    </h3>
                    {filteredContacts
                      .filter(c => c && !c.isFavorite)
                      .map(contact => {
                        if (!contact) return null;
                        return (
                        <div
                          key={contact?.id || Math.random()}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {(contact?.name || 'U').split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{contact?.name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {contact?.company || ''} · {contact?.phone || ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => contact?.id && toggleFavorite(contact.id)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => contact?.phone && handleCall(contact.phone, contact?.name)}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setActiveTab('sms');
                                setNewSmsNumber(contact?.phone || '');
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit Contact</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  Delete Contact
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );})}
                  </div>
                </ScrollArea>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {filteredCallHistory.map(call => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarFallback>
                                {(call.contactName || 'U').split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center ${
                              call.direction === 'inbound' ? 'bg-blue-500' : 'bg-green-500'
                            }`}>
                              {call.direction === 'inbound' ? (
                                <PhoneIncoming className="h-3 w-3 text-white" />
                              ) : (
                                <PhoneOutgoing className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{call.contactName || 'Unknown'}</p>
                              {call.status === 'missed' && (
                                <Badge variant="destructive" className="text-xs">
                                  Missed
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{call.phoneNumber}</span>
                              {call.duration && (
                                <>
                                  <span>·</span>
                                  <span>{formatDuration(call.duration)}</span>
                                </>
                              )}
                              <span>·</span>
                              <span>{formatDistanceToNow(call.timestamp, { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCall(call.phoneNumber, call.contactName)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveTab('sms');
                              setNewSmsNumber(call.phoneNumber);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Add to Contacts</DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                Delete from History
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
      
      {/* Save Contact Dialog */}
      <Dialog open={showSaveContactDialog} onOpenChange={setShowSaveContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as New Contact</DialogTitle>
            <DialogDescription>
              Add this phone number to your contacts for easier messaging in the future.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={saveContactFirstName}
                  onChange={(e) => setSaveContactFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={saveContactLastName}
                  onChange={(e) => setSaveContactLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formatPhoneNumber(saveContactPhone)}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization (Optional)</Label>
              <Input
                id="organization"
                value={saveContactOrganization}
                onChange={(e) => setSaveContactOrganization(e.target.value)}
                placeholder="Company Name"
              />
              <p className="text-xs text-muted-foreground">
                You can add an organization later if needed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveContactDialog(false);
                setSaveContactFirstName('');
                setSaveContactLastName('');
                setSaveContactOrganization('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveContact}>
              Save Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}