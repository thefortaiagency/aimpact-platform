'use client';

import { useState, useEffect } from 'react';
// import { useSession } from 'next-auth/react';
import { 
  Mail, Send, Paperclip, X, Minimize2, Maximize2, 
  MoreVertical, Trash2, Smile,
  Link, Image, Lock, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import FloatingWindow from './FloatingWindow';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Debug logging
console.log('[FloatingEmail] Component loading...');
console.log('[FloatingEmail] FloatingWindow import:', FloatingWindow);
console.log('[FloatingEmail] Button import:', Button);
console.log('[FloatingEmail] All imports:', {
  FloatingWindow,
  Button,
  Textarea,
  Badge,
  ScrollArea,
  useContacts,
  toast,
  Mail,
  Send,
  Paperclip,
  X,
  Minimize2,
  Maximize2,
  MoreVertical,
  Trash2,
  Link,
  Image,
  Lock,
  Smile
});

interface FloatingEmailProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  contactName?: string;
  replyTo?: {
    messageId: string;
    subject: string;
    from: string;
    body: string;
  };
}

interface EmailDraft {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachments: File[];
}

export default function FloatingEmail({ 
  isOpen, 
  onClose, 
  initialTo, 
  initialSubject,
  initialBody,
  contactName,
  replyTo
}: FloatingEmailProps) {
  console.log('[FloatingEmail] Rendering with props:', {
    isOpen,
    initialTo,
    initialSubject,
    initialBody,
    contactName,
    replyTo
  });

  // const { data: session } = useSession();
  const session = null; // Disabled for now to fix build
  const { contacts } = useContacts();
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [fromEmail, setFromEmail] = useState('aoberlin@thefortaiagency.ai');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  
  console.log('[FloatingEmail] State initialized, contacts:', contacts);
  console.log('[FloatingEmail] Session:', session);
  
  // Email draft state
  const [draft, setDraft] = useState<EmailDraft>({
    to: initialTo ? [initialTo] : [],
    cc: [],
    bcc: [],
    subject: initialSubject || (replyTo ? `Re: ${replyTo.subject}` : ''),
    body: initialBody || (replyTo ? `\n\n---\nOn ${new Date().toLocaleDateString()}, ${replyTo.from} wrote:\n${replyTo.body}` : ''),
    attachments: []
  });
  
  // Current input values for recipients
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  
  // Auto-save draft every 10 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (draft.to.length || draft.subject || draft.body) {
        localStorage.setItem('floatingEmailDraft', JSON.stringify(draft));
        setLastSaved(new Date());
      }
    }, 10000);
    
    return () => clearInterval(saveInterval);
  }, [draft]);

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('floatingEmailDraft');
    if (savedDraft && !initialTo && !initialSubject && !initialBody && !replyTo) {
      try {
        const parsed = JSON.parse(savedDraft);
        setDraft(parsed);
      } catch (e) {
        console.error('Failed to load saved draft:', e);
      }
    }
  }, []);

  // Parse recipients from input (handles comma-separated emails)
  const parseRecipients = (input: string): string[] => {
    return input
      .split(',')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));
  };

  // Handle recipient input change
  const handleRecipientChange = (field: 'to' | 'cc' | 'bcc', value: string) => {
    const emails = parseRecipients(value);
    if (emails.length > 0) {
      setDraft(prev => ({
        ...prev,
        [field]: emails
      }));
      // Clear the input
      if (field === 'to') setToInput('');
      if (field === 'cc') setCcInput('');
      if (field === 'bcc') setBccInput('');
    } else {
      // Update input while typing
      if (field === 'to') setToInput(value);
      if (field === 'cc') setCcInput(value);
      if (field === 'bcc') setBccInput(value);
    }
  };

  // Handle file attachment
  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDraft(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setDraft(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Send email using Gmail API
  const sendEmail = async () => {
    if (!draft.to.length && !draft.cc.length && !draft.bcc.length) {
      toast.error('Please specify at least one recipient');
      return;
    }
    
    setSending(true);
    
    try {
      // Use the Gmail compose endpoint
      const response = await fetch('/api/aimpact/gmail/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: draft.to.join(', '),
          cc: draft.cc.join(', '),
          bcc: draft.bcc.join(', '),
          subject: draft.subject || '(no subject)',
          body: draft.body
        })
      });
      
      if (response.ok) {
        toast.success('Message sent');
        // Clear draft and close
        setDraft({
          to: [],
          cc: [],
          bcc: [],
          subject: '',
          body: '',
          attachments: []
        });
        localStorage.removeItem('floatingEmailDraft');
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send with Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      sendEmail();
    }
    // Close with Escape
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Text formatting functions
  const insertTextAtCursor = (textarea: HTMLTextAreaElement, textToInsert: string) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + textToInsert + text.substring(end);
    setDraft(prev => ({ ...prev, body: newText }));
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleTextFormatting = (format: 'bold' | 'italic' | 'link') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let newText = '';
    switch (format) {
      case 'bold':
        newText = selectedText ? `**${selectedText}**` : '**bold text**';
        break;
      case 'italic':
        newText = selectedText ? `*${selectedText}*` : '*italic text*';
        break;
      case 'link':
        newText = selectedText ? `[${selectedText}](url)` : '[link text](url)';
        break;
    }

    insertTextAtCursor(textarea, newText);
  };

  console.log('[FloatingEmail] About to render, checking components:');
  console.log('[FloatingEmail] FloatingWindow type:', typeof FloatingWindow);
  console.log('[FloatingEmail] FloatingWindow:', FloatingWindow);
  console.log('[FloatingEmail] Button type:', typeof Button);
  console.log('[FloatingEmail] Is FloatingWindow a function?', typeof FloatingWindow === 'function');
  
  if (!FloatingWindow) {
    console.error('[FloatingEmail] ERROR: FloatingWindow is undefined!');
    return <div>Error: FloatingWindow component not found</div>;
  }

  return (
    <FloatingWindow
      title=""
      icon={null}
      isOpen={isOpen}
      onClose={onClose}
      defaultPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 600 : 200, y: 100 }}
      defaultSize={{ width: 580, height: 500 }}
      minWidth={450}
      minHeight={350}
      maxWidth={800}
      maxHeight={700}
      hideHeader={true}
    >
      <div className="flex flex-col h-full bg-white dark:bg-[#1e1e1e]" onKeyDown={handleKeyDown}>
        {/* Gmail-style header */}
        <div className="bg-[#404040] dark:bg-[#2b2b2b] text-white px-4 py-2 flex items-center justify-between drag-handle cursor-move">
          <span className="text-sm font-normal text-[#e8eaed] pointer-events-none">
            {replyTo ? 'Reply' : 'New Message'}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#e8eaed] hover:bg-[#5f6368] rounded"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#e8eaed] hover:bg-[#5f6368] rounded"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Recipients section */}
          <div className="border-b border-[#e0e0e0] dark:border-[#5f6368]">
            {/* From field */}
            <div className="flex items-center px-4 py-2 hover:shadow-sm border-b border-[#e0e0e0] dark:border-[#5f6368]">
              <span className="text-[#5f6368] dark:text-[#9aa0a6] text-sm w-12">From</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex-1 justify-between h-auto p-0 hover:bg-transparent text-left font-normal"
                  >
                    <span className="text-sm text-[#202124] dark:text-[#e8eaed]">
                      {fromEmail}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[#5f6368] dark:text-[#9aa0a6]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px]">
                  <DropdownMenuItem
                    onClick={() => setFromEmail('aoberlin@thefortaiagency.ai')}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">aoberlin@thefortaiagency.ai</span>
                      <span className="text-xs text-muted-foreground">The Fort AI Agency</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFromEmail('aoberlin@aimpactnexus.ai')}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">aoberlin@aimpactnexus.ai</span>
                      <span className="text-xs text-muted-foreground">AImpact Nexus</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* To field */}
            <div className="flex items-center px-4 py-2 hover:shadow-sm">
              <span className="text-[#5f6368] dark:text-[#9aa0a6] text-sm w-12">To</span>
              <div className="flex-1 flex items-center">
                <input
                  type="text"
                  value={toInput || draft.to.join(', ')}
                  onChange={(e) => handleRecipientChange('to', e.target.value)}
                  onBlur={() => {
                    if (toInput) {
                      handleRecipientChange('to', toInput);
                    }
                  }}
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                  placeholder="Recipients"
                  disabled={sending}
                />
                <button
                  className="text-[#5f6368] dark:text-[#9aa0a6] text-sm px-2 hover:text-[#202124] dark:hover:text-[#e8eaed]"
                  onClick={() => setShowCc(!showCc)}
                >
                  Cc
                </button>
                <button
                  className="text-[#5f6368] dark:text-[#9aa0a6] text-sm px-2 hover:text-[#202124] dark:hover:text-[#e8eaed]"
                  onClick={() => setShowBcc(!showBcc)}
                >
                  Bcc
                </button>
              </div>
            </div>

            {/* Cc field */}
            {showCc && (
              <div className="flex items-center px-4 py-2 hover:shadow-sm">
                <span className="text-[#5f6368] dark:text-[#9aa0a6] text-sm w-12">Cc</span>
                <input
                  type="text"
                  value={ccInput || draft.cc.join(', ')}
                  onChange={(e) => handleRecipientChange('cc', e.target.value)}
                  onBlur={() => {
                    if (ccInput) {
                      handleRecipientChange('cc', ccInput);
                    }
                  }}
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                  placeholder="Cc recipients"
                  disabled={sending}
                />
              </div>
            )}

            {/* Bcc field */}
            {showBcc && (
              <div className="flex items-center px-4 py-2 hover:shadow-sm">
                <span className="text-[#5f6368] dark:text-[#9aa0a6] text-sm w-12">Bcc</span>
                <input
                  type="text"
                  value={bccInput || draft.bcc.join(', ')}
                  onChange={(e) => handleRecipientChange('bcc', e.target.value)}
                  onBlur={() => {
                    if (bccInput) {
                      handleRecipientChange('bcc', bccInput);
                    }
                  }}
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                  placeholder="Bcc recipients"
                  disabled={sending}
                />
              </div>
            )}

            {/* Subject field */}
            <div className="flex items-center px-4 py-2 hover:shadow-sm">
              <input
                type="text"
                value={draft.subject}
                onChange={(e) => setDraft(prev => ({ ...prev, subject: e.target.value }))}
                className="flex-1 bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368]"
                placeholder="Subject"
                disabled={sending}
              />
            </div>
          </div>

          {/* Message body */}
          <div className="flex-1 px-4 py-3 overflow-hidden">
            <textarea
              value={draft.body}
              onChange={(e) => setDraft(prev => ({ ...prev, body: e.target.value }))}
              className="w-full h-full bg-transparent border-0 outline-none text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368] resize-none"
              placeholder="Compose email"
              disabled={sending}
              autoFocus
            />
          </div>

          {/* Attachments */}
          {draft.attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-[#e0e0e0] dark:border-[#5f6368]">
              <div className="flex flex-wrap gap-2">
                {draft.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-[#f1f3f4] dark:bg-[#3c4043] rounded text-xs"
                  >
                    <Paperclip className="h-3 w-3 text-[#5f6368]" />
                    <span className="text-[#202124] dark:text-[#e8eaed]">
                      {file.name} ({formatFileSize(file.size)})
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="ml-1 text-[#5f6368] hover:text-[#202124] dark:hover:text-[#e8eaed]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="border-t border-[#e0e0e0] dark:border-[#5f6368] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Send button */}
                <Button
                  onClick={sendEmail}
                  disabled={sending || (!draft.to.length && !draft.cc.length && !draft.bcc.length)}
                  className="bg-[#1a73e8] hover:bg-[#1765cc] text-white px-6 py-1.5 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed h-8"
                >
                  {sending ? 'Sending...' : 'Send'}
                </Button>

                {/* Formatting options */}
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                    onClick={() => setShowFormatting(!showFormatting)}
                    title="Text formatting"
                  >
                    <span className="text-base font-serif">A</span>
                  </Button>
                  <label htmlFor="file-upload-floating">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                      asChild
                    >
                      <span>
                        <Paperclip className="h-4 w-4" />
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-upload-floating"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileAttachment}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                    onClick={() => handleTextFormatting('link')}
                    title="Insert link"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {lastSaved && (
                  <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mr-2">
                    Draft saved
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleTextFormatting('bold')}
                      className="cursor-pointer"
                    >
                      <span className="font-bold">B</span>
                      <span className="ml-2">Bold</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTextFormatting('italic')}
                      className="cursor-pointer"
                    >
                      <span className="italic">I</span>
                      <span className="ml-2">Italic</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                        if (textarea) {
                          insertTextAtCursor(textarea, '• ');
                        }
                      }}
                      className="cursor-pointer"
                    >
                      • Bullet point
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded"
                  onClick={() => {
                    if (draft.body || draft.subject || draft.to.length) {
                      if (confirm('Are you sure you want to discard this draft?')) {
                        setDraft({
                          to: [],
                          cc: [],
                          bcc: [],
                          subject: '',
                          body: '',
                          attachments: []
                        });
                        localStorage.removeItem('floatingEmailDraft');
                        toast.success('Draft discarded');
                      }
                    } else {
                      setDraft({
                        to: [],
                        cc: [],
                        bcc: [],
                        subject: '',
                        body: '',
                        attachments: []
                      });
                      localStorage.removeItem('floatingEmailDraft');
                    }
                  }}
                  title="Discard draft"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Keyboard shortcut hint */}
            <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1">
              Press Ctrl+Enter to send
            </div>
          </div>
        </div>
        )}
      </div>
    </FloatingWindow>
  );
}