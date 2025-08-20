'use client';

import { useState, useEffect, useRef } from 'react';
// import { useSession } from 'next-auth/react';
import { 
  MessageSquare, Send, Search, User, Clock, X, Minimize2, Maximize2,
  MoreVertical, Trash2, Phone, ChevronDown, Archive, Star, AlertCircle,
  UserPlus, Building2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import FloatingWindow from './FloatingWindow';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { smsService, type SMSContact, type SMSMessage, type SMSConversation } from '@/lib/services/sms-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

interface FloatingSMSRedesignedProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhoneNumber?: string;
  contactName?: string;
}


export default function FloatingSMSRedesigned({ 
  isOpen, 
  onClose, 
  initialPhoneNumber, 
  contactName 
}: FloatingSMSRedesignedProps) {
  // const { data: session } = useSession();
  const session = null; // Disabled for build
  const [selectedConversation, setSelectedConversation] = useState<SMSConversation | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  const [newContactName, setNewContactName] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(!initialPhoneNumber);
  const [conversationLoading, setConversationLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Save contact dialog state
  const [showSaveContactDialog, setShowSaveContactDialog] = useState(false);
  const [saveContactPhone, setSaveContactPhone] = useState('');
  const [saveContactFirstName, setSaveContactFirstName] = useState('');
  const [saveContactLastName, setSaveContactLastName] = useState('');
  const [saveContactOrganization, setSaveContactOrganization] = useState('');
  
  // Delete conversation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<SMSConversation | null>(null);
  
  // Use SMS service for conversations
  const [conversations, setConversations] = useState<SMSConversation[]>([]);

  // Message templates
  const templates = [
    { label: 'Meeting Reminder', text: 'Hi {{name}}, just a reminder about our meeting tomorrow at {{time}}. Let me know if you need to reschedule.' },
    { label: 'Follow Up', text: 'Hi {{name}}, following up on our conversation. Let me know if you have any questions.' },
    { label: 'Project Update', text: 'Hi {{name}}, quick update on {{project}}: {{status}}. More details to follow.' },
    { label: 'Support Response', text: 'Hi {{name}}, we received your request. Our team is looking into it and will get back to you shortly.' },
  ];

  // Load all conversations on mount
  useEffect(() => {
    loadConversations();
    
    // Listen for SMS events
    const handleSmsReceived = (event: CustomEvent) => {
      console.log('FloatingSMS: SMS received event');
      loadConversations();
      // If this conversation is selected, reload messages
      if (selectedConversation?.phoneNumber === event.detail.phoneNumber) {
        loadConversation(event.detail.phoneNumber);
      }
    };

    const handleConversationsUpdated = (event: CustomEvent) => {
      console.log('FloatingSMS: Conversations updated event');
      loadConversations();
      // If this conversation is selected, refresh it
      if (selectedConversation?.phoneNumber) {
        loadConversation(selectedConversation.phoneNumber);
      }
    };
    
    window.addEventListener('sms-received', handleSmsReceived as EventListener);
    window.addEventListener('sms-conversations-updated', handleConversationsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('sms-received', handleSmsReceived as EventListener);
      window.removeEventListener('sms-conversations-updated', handleConversationsUpdated as EventListener);
    };
  }, [selectedConversation]);

  // Set initial conversation if provided
  useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber);
      loadConversation(initialPhoneNumber);
    }
  }, [initialPhoneNumber]);

  // Auto-save draft
  useEffect(() => {
    if (message.length > 0) {
      const timer = setTimeout(() => {
        setAutoSaveStatus('saving');
        localStorage.setItem('sms-draft', JSON.stringify({
          phoneNumber,
          message,
          conversationId: selectedConversation?.id
        }));
        setTimeout(() => setAutoSaveStatus('saved'), 500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [message, phoneNumber, selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [selectedConversation?.messages]);

  const loadConversations = async () => {
    try {
      if (smsService) {
        const convs = smsService.getConversations();
        setConversations(convs);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversation = async (phoneNumber: string) => {
    setConversationLoading(true);
    try {
      if (smsService) {
        const conversation = await smsService.getConversation(phoneNumber);
        if (conversation) {
          setSelectedConversation(conversation);
          setShowNewConversation(false);
          // Mark messages as read
          await smsService.markAsRead(phoneNumber);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setConversationLoading(false);
    }
  };

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

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const recipient = selectedConversation?.phoneNumber || phoneNumber;
    if (!recipient) {
      toast.error('Please enter a phone number or select a contact');
      return;
    }
    
    setSending(true);
    
    try {
      // Check if this is a new number (not in contacts)
      const contact = smsService?.getContact(recipient);
      
      // Send message through service
      const sentMessage = smsService ? await smsService.sendMessage(
        recipient, 
        message, 
        selectedConversation?.contactId
      ) : null;
      
      console.log('FloatingSMS: Message sent, result:', sentMessage);
      
      // Force refresh the conversation from the service cache
      if (smsService) {
        const updatedConversation = await smsService.getConversation(recipient);
        if (updatedConversation) {
          setSelectedConversation(updatedConversation);
          console.log('FloatingSMS: Updated conversation with', updatedConversation.messages.length, 'messages');
        }
      }
      
      // If no contact exists and we have a name, offer to save
      if (!contact && !selectedConversation?.contactId) {
        setSaveContactPhone(recipient);
        setShowSaveContactDialog(true);
      }
      
      toast.success('Message sent successfully');
      setMessage('');
      localStorage.removeItem('sms-draft');
    } catch (error) {
      console.error('Error sending SMS:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleSaveContact = async () => {
    try {
      if (!saveContactFirstName.trim()) {
        toast.error('Please enter a first name');
        return;
      }

      if (smsService) {
        const newContact = await smsService.saveContact(
          saveContactPhone,
          saveContactFirstName,
          saveContactLastName,
          saveContactOrganization || undefined
        );
      }

      toast.success('Contact saved successfully');
      setShowSaveContactDialog(false);
      
      // Reset form
      setSaveContactFirstName('');
      setSaveContactLastName('');
      setSaveContactOrganization('');
      
      // Reload conversations
      await loadConversations();
      await loadConversation(saveContactPhone);
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      // Call API to delete conversation
      const response = await fetch(`/api/sms/conversations/${conversationToDelete.phoneNumber}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Conversation deleted successfully');
        setShowDeleteDialog(false);
        setConversationToDelete(null);
        
        // If deleted conversation was selected, clear selection
        if (selectedConversation?.id === conversationToDelete.id) {
          setSelectedConversation(null);
          setShowNewConversation(true);
        }
        
        // Reload conversations
        await loadConversations();
      } else {
        throw new Error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleRefresh = async () => {
    try {
      await loadConversations();
      if (selectedConversation) {
        await loadConversation(selectedConversation.phoneNumber);
      }
      toast.success('Conversations refreshed');
    } catch (error) {
      console.error('Error refreshing conversations:', error);
      toast.error('Failed to refresh conversations');
    }
  };

  const handleTemplateSelect = (template: typeof templates[0]) => {
    let text = template.text;
    if (selectedConversation?.contactName) {
      text = text.replace('{{name}}', selectedConversation.contactName.split(' ')[0]);
    }
    text = text.replace('{{time}}', '2:00 PM');
    text = text.replace('{{project}}', 'Website Redesign');
    text = text.replace('{{status}}', 'On track for Friday delivery');
    setMessage(text);
    setShowTemplates(false);
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.contactName?.toLowerCase().includes(searchLower) ||
      conv.phoneNumber?.includes(searchQuery)
    );
  });

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="shadow-lg bg-gradient-to-r from-blue-500 to-blue-600"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          SMS
          {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0) > 0 && (
            <Badge className="ml-2 bg-red-500">
              {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <FloatingWindow
      title="SMS Messages"
      icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 900 : 500, y: 100 }}
      defaultSize={{ width: 850, height: 650 }}
      minWidth={700}
      minHeight={500}
      maxWidth={1200}
      maxHeight={900}
    >
      <div className="flex h-full bg-background">
        {/* Left Sidebar - Contact List */}
        <div className="w-80 border-r flex flex-col bg-muted/5">
          {/* Search Header */}
          <div className="p-4 border-b bg-background/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts or numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="p-2 border-b bg-background/50">
            <Button
              onClick={() => {
                setSelectedConversation(null);
                setPhoneNumber('');
                setNewContactName('');
                setShowNewConversation(true);
              }}
              variant="ghost"
              className="w-full justify-start font-semibold"
            >
              <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
              New Message
            </Button>
          </div>
          
          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredConversations.length === 0 && !searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Send a message to start chatting</p>
                </div>
              )}
              {filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.phoneNumber)}
                  className={`w-full p-3 rounded-lg mb-1 hover:bg-accent transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        {conv.contactName 
                          ? conv.contactName.split(' ').map(n => n[0]).join('')
                          : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">
                          {conv.contactName || formatPhoneNumber(conv.phoneNumber)}
                        </p>
                        {conv.lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {format(conv.lastMessageTime, 'MMM d')}
                          </span>
                        )}
                      </div>
                      {conv.contactName && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {formatPhoneNumber(conv.phoneNumber)}
                        </p>
                      )}
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-blue-500 text-white">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Conversation */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Conversation Header */}
          <div className="p-4 border-b bg-muted/5">
            {selectedConversation ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      {selectedConversation.contactName 
                        ? selectedConversation.contactName.split(' ').map(n => n[0]).join('')
                        : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedConversation.contactName || formatPhoneNumber(selectedConversation.phoneNumber)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.contactName 
                        ? formatPhoneNumber(selectedConversation.phoneNumber)
                        : 'Unknown Contact'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={handleRefresh}
                    title="Refresh conversations"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => window.location.href = `tel:${selectedConversation.phoneNumber}`}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  {!selectedConversation.contactId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSaveContactPhone(selectedConversation.phoneNumber);
                        setShowSaveContactDialog(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Save Contact
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {selectedConversation.contactId && (
                        <DropdownMenuItem>
                          <Building2 className="h-4 w-4 mr-2" />
                          Add to Organization
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Star className="h-4 w-4 mr-2" />
                        Mark as Important
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          setConversationToDelete(selectedConversation);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">New Conversation</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Phone Number</label>
                    <Input
                      placeholder="(260) 555-0123"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
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
            )}
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {conversationLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading conversation...</div>
              </div>
            ) : selectedConversation?.messages && selectedConversation.messages.length > 0 ? (
              <div className="space-y-4">
                {selectedConversation.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.direction === 'outbound' ? 'order-2' : ''}`}>
                      <div className={`rounded-2xl px-4 py-2 ${
                        msg.direction === 'outbound' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <div className={`flex items-center gap-2 mt-1 px-2 ${
                        msg.direction === 'outbound' ? 'justify-end' : ''
                      }`}>
                        <span className="text-xs text-muted-foreground">
                          {format(msg.createdAt, 'h:mm a')}
                        </span>
                        {msg.direction === 'outbound' && msg.status && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className={`text-xs ${
                              msg.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {msg.status === 'sending' ? 'Sending...' :
                               msg.status === 'sent' ? 'Sent' :
                               msg.status === 'delivered' ? 'Delivered' :
                               msg.status === 'failed' ? 'Failed' : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                <p>No messages yet</p>
                <p className="text-sm mt-2">Send a message to start the conversation</p>
              </div>
            )}
          </ScrollArea>

          {/* Message Input Area */}
          <div className="border-t p-4 bg-muted/5">
            {/* Quick Templates */}
            {showTemplates && (
              <div className="mb-3 p-3 bg-background rounded-lg border">
                <p className="text-sm font-medium mb-2">Quick Templates</p>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[80px] pr-20 resize-none"
                  disabled={sending}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  {autoSaveStatus === 'saved' && (
                    <span className="text-xs text-muted-foreground">Saved</span>
                  )}
                  {message.length > 0 && (
                    <span className={`text-xs ${message.length > 160 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {message.length}/160
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setShowTemplates(!showTemplates)}
                  variant="outline"
                  size="sm"
                >
                  Templates
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sending || (!selectedConversation && !phoneNumber)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Character count warning */}
            {message.length > 160 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-orange-500">
                <AlertCircle className="h-4 w-4" />
                <span>Message will be sent as {Math.ceil(message.length / 160)} segments</span>
              </div>
            )}
          </div>
        </div>
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
      
      {/* Delete Conversation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation with {conversationToDelete?.contactName || formatPhoneNumber(conversationToDelete?.phoneNumber || '')}? 
              This will permanently delete all messages and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FloatingWindow>
  );
}