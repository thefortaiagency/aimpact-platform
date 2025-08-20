'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Search, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import FloatingWindow from './FloatingWindow';
import { format } from 'date-fns';

interface FloatingSMSProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhoneNumber?: string;
  contactName?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unread?: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export default function FloatingSMS({ isOpen, onClose, initialPhoneNumber, contactName }: FloatingSMSProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  
  // Mock data - replace with real data
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'John Smith',
      phone: '+1234567890',
      lastMessage: 'Thanks for the update!',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 30),
      unread: 2
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      phone: '+0987654321',
      lastMessage: 'See you at the meeting',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2)
    }
  ]);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! Just checking in about the project.',
      sender: 'me',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      status: 'read'
    },
    {
      id: '2',
      text: 'Thanks for the update!',
      sender: 'them',
      timestamp: new Date(Date.now() - 1000 * 60 * 30)
    }
  ]);

  // Set initial contact if provided
  useEffect(() => {
    if (initialPhoneNumber && contactName) {
      setPhoneNumber(initialPhoneNumber);
      // If we have a contact name, we could optionally create/select a contact
      // For now, we'll just use the phone number field
    }
  }, [initialPhoneNumber, contactName]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    
    const recipient = selectedContact?.phone || phoneNumber;
    if (!recipient) {
      alert('Please enter a phone number or select a contact');
      setSending(false);
      return;
    }
    
    try {
      // Add message to UI immediately for better UX
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message,
        sender: 'me',
        timestamp: new Date(),
        status: 'sent'
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Send actual SMS
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          message: message
        })
      });
      
      if (response.ok) {
        // Update message status
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'delivered' }
              : msg
          )
        );
      } else {
        throw new Error('Failed to send SMS');
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (!contact) return false;
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.phone?.includes(searchQuery)
    );
  });

  return (
    <FloatingWindow
      title={contactName ? `SMS to ${contactName}` : "Quick SMS"}
      icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 820 : 500, y: 80 }}
      defaultSize={{ width: 380, height: 600 }}
      minWidth={320}
      minHeight={400}
      maxWidth={600}
      maxHeight={800}
    >
      <div className="flex h-full">
        {/* Contacts List */}
        <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-2/5 border-r`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {/* New Message Option */}
            <button
              onClick={() => {
                setSelectedContact(null);
                setPhoneNumber('');
              }}
              className="w-full p-3 hover:bg-accent flex items-center gap-3 border-b"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">New Message</p>
                <p className="text-xs text-muted-foreground">Start a new conversation</p>
              </div>
            </button>
            
            {/* Contacts */}
            {filteredContacts.map(contact => {
              if (!contact) return null;
              return (
                <button
                  key={contact.id || Math.random()}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full p-3 hover:bg-accent flex items-center gap-3 border-b ${
                    selectedContact?.id === contact.id ? 'bg-accent' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {(contact?.name || 'U').split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{contact?.name || 'Unknown'}</p>
                      {contact?.unread && contact.unread > 0 && (
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                          {contact.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact?.lastMessage || ''}
                    </p>
                  </div>
                  {contact?.lastMessageTime && (
                    <span className="text-xs text-muted-foreground">
                      {format(contact.lastMessageTime, 'HH:mm')}
                    </span>
                  )}
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* Conversation View */}
        <div className={`${selectedContact ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
          {selectedContact || !selectedContact ? (
            <>
              {/* Header */}
              <div className="p-3 border-b flex items-center gap-3">
                {selectedContact ? (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="md:hidden"
                      onClick={() => setSelectedContact(null)}
                    >
                      <User className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(selectedContact?.name || 'U').split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedContact?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{selectedContact?.phone || ''}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <Input
                      placeholder="Enter phone number..."
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-9"
                    />
                  </div>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {selectedContact && messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        msg.sender === 'me' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{msg.text}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs opacity-70">
                            {format(msg.timestamp, 'HH:mm')}
                          </span>
                          {msg.sender === 'me' && msg.status && (
                            <span className="text-xs opacity-70">
                              · {msg.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {!selectedContact && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Enter a phone number to start messaging</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t">
                <div className="flex gap-2">
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
                    className="min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a contact or start a new message</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </FloatingWindow>
  );
}