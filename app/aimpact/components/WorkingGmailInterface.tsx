'use client';

import React, { useState, useEffect } from 'react';
import { FaInbox, FaPaperPlane, FaFolder, FaStar, FaSync, FaPlus, FaEnvelope, FaEnvelopeOpen, FaCog } from 'react-icons/fa';
import FloatingEmail from './FloatingEmail';
import EmailRulesManager from './EmailRulesManager';

interface EmailFolder {
  id: string;
  name: string;
  type: 'system' | 'user';
  messageCount: number;
  unreadCount: number;
  color: string;
  description: string;
}

interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  labels: string[];
  unread: boolean;
  starred: boolean;
  important: boolean;
  hasAttachments: boolean;
}

export default function WorkingGmailInterface() {
  const [status, setStatus] = useState('Loading Gmail interface...');
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  });

  useEffect(() => {
    console.log('WorkingGmailInterface mounted - loading folders...');
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder && folders.length > 0) {
      console.log(`Loading emails for folder: ${selectedFolder}`);
      loadEmails(selectedFolder);
    }
  }, [selectedFolder, folders]);

  const loadFolders = async () => {
    try {
      console.log('Fetching /api/aimpact/gmail/folders...');
      setStatus('Loading Gmail folders...');
      
      const response = await fetch('/api/aimpact/gmail/folders');
      console.log('Folders response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Folders data received:', data);
      
      if (data.success) {
        setFolders(data.folders || []);
        setStatus(`✅ Loaded ${data.folders.length} folders successfully!`);
        console.log(`Successfully loaded ${data.folders.length} folders`);
      } else {
        setStatus(`❌ API Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error loading folders:', error);
      setStatus(`❌ Connection Error: ${error.message}`);
    }
  };

  const loadEmails = async (folderId: string) => {
    try {
      console.log(`Fetching emails for folder ${folderId}...`);
      setStatus(`Loading emails from ${folderId}...`);
      
      const response = await fetch(`/api/aimpact/gmail/manage?folderId=${folderId}&maxResults=10`);
      console.log('Emails response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Emails data for ${folderId}:`, data);
      
      if (data.success) {
        setEmails(data.emails || []);
        setStatus(`✅ Loaded ${(data.emails || []).length} emails from ${folderId}`);
      } else {
        setStatus(`❌ Failed to load emails: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error loading emails:', error);
      setStatus(`❌ Error loading emails: ${error.message}`);
    }
  };

  const deleteEmail = async (messageId: string) => {
    try {
      setStatus('Deleting email...');
      
      const response = await fetch('/api/aimpact/gmail/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          messageIds: [messageId]
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove the email from the current list
        setEmails(prevEmails => prevEmails.filter(email => email.id !== messageId));
        setSelectedEmail(null);
        setStatus('✅ Email deleted successfully!');
        
        // Refresh the current folder after a short delay
        setTimeout(() => {
          loadEmails(selectedFolder);
        }, 1000);
      } else {
        setStatus(`❌ Failed to delete email: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error deleting email:', error);
      setStatus(`❌ Error deleting email: ${error.message}`);
    }
  };


  const systemFolders = folders.filter(f => f.type === 'system').slice(0, 6);
  const userFolders = folders.filter(f => f.type === 'user');

  return (
    <div className="bg-white h-full flex flex-col">
      {/* NexusMail Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/impactlogotransparent.png" 
                alt="Nexus Logo" 
                className="h-8 w-8 object-contain"
              />
              <h1 className="text-2xl font-normal text-gray-900">NexusMail</h1>
            </div>
            <span className="text-sm text-gray-600">{status}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadFolders}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-full flex items-center gap-2 border border-gray-300"
            >
              <FaSync className="text-xs" />
              Refresh
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-full flex items-center gap-2 border border-gray-300"
            >
              <FaCog className="text-xs" />
              Rules
            </button>
            <button
              onClick={() => setShowCompose(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 flex items-center gap-2 shadow-sm"
            >
              <FaPlus className="text-xs" />
              Compose
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Gmail-style Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-3">
            {/* System Folders */}
            <div className="space-y-1">
              {systemFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full text-left px-4 py-2 rounded-r-full flex items-center justify-between transition-colors text-sm ${
                    selectedFolder === folder.id 
                      ? 'bg-red-100 text-red-800 font-medium border-l-4 border-red-600' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {folder.name === 'INBOX' && <FaInbox className="text-gray-600" />}
                    {folder.name === 'SENT' && <FaPaperPlane className="text-gray-600" />}
                    {folder.name === 'DRAFTS' && <FaEnvelope className="text-gray-600" />}
                    {!['INBOX', 'SENT', 'DRAFTS'].includes(folder.name) && <FaFolder className="text-gray-600" />}
                    <span>{folder.name}</span>
                  </div>
                  {folder.unreadCount > 0 && (
                    <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                      {folder.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Folders */}
          {userFolders.length > 0 && (
            <div className="px-3 pb-3">
              <div className="text-xs font-medium text-gray-500 mb-2 px-4">Folders</div>
              <div className="space-y-1">
                {userFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full text-left px-4 py-2 rounded-r-full flex items-center justify-between transition-colors text-sm ${
                      selectedFolder === folder.id 
                        ? 'bg-red-100 text-red-800 font-medium border-l-4 border-red-600' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FaFolder className="text-gray-600 text-xs" />
                      <span>{folder.name}</span>
                    </div>
                    {folder.messageCount > 0 && (
                      <span className="text-xs text-gray-500">
                        {folder.messageCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gmail-style Email List */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-normal text-gray-900">
              {folders.find(f => f.id === selectedFolder)?.name || selectedFolder}
              <span className="text-sm text-gray-500 ml-2 font-normal">({emails.length})</span>
            </h2>
          </div>
          
          {emails.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaEnvelope className="text-4xl mx-auto mb-4 opacity-50" />
              <p>No emails found in this folder</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {emails.map((email, index) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`px-6 py-3 hover:shadow-sm transition-all cursor-pointer border-l-4 ${
                    email.unread 
                      ? 'bg-white border-l-blue-500 hover:bg-gray-50' 
                      : 'bg-white border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox placeholder */}
                    <div className="w-4 h-4"></div>
                    
                    {/* Star */}
                    <button className="text-gray-300 hover:text-yellow-400">
                      <FaStar className={`text-sm ${email.starred ? 'text-yellow-400 fill-current' : ''}`} />
                    </button>
                    
                    {/* From */}
                    <div className={`w-48 truncate text-sm ${email.unread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {email.from}
                    </div>
                    
                    {/* Subject and snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-sm truncate ${email.unread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {email.subject || '(No subject)'}
                        </span>
                        <span className="text-sm text-gray-500 truncate">
                          - {email.body.substring(0, 80)}...
                        </span>
                      </div>
                    </div>
                    
                    {/* Date */}
                    <div className="text-sm text-gray-500 ml-4 flex-shrink-0">
                      {new Date(email.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FloatingEmail Compose Modal */}
      <FloatingEmail
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false);
          setComposeData({ to: '', subject: '', body: '' });
        }}
        initialTo={composeData.to}
        initialSubject={composeData.subject}
        initialBody={composeData.body}
      />

      {/* Email Rules Manager */}
      <EmailRulesManager
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />

      {/* Gmail-style Email View Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Gmail-style Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Back to inbox
                </button>
                <h2 className="font-normal text-gray-900 truncate">
                  {selectedEmail.subject || '(No subject)'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-gray-100 rounded-full">
                  <FaStar className={selectedEmail.starred ? 'text-yellow-500 fill-current' : ''} />
                </button>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Email Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-6">
                
                {/* Sender Info */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {selectedEmail.from.split('@')[0].charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{selectedEmail.from}</div>
                        <div className="text-sm text-gray-600">to {selectedEmail.to}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(selectedEmail.date).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {/* Status badges */}
                  <div className="flex items-center gap-2">
                    {selectedEmail.unread && (
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200">
                        Unread
                      </span>
                    )}
                    {selectedEmail.important && (
                      <span className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full border border-red-200">
                        Important
                      </span>
                    )}
                    {selectedEmail.hasAttachments && (
                      <span className="bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded-full border border-gray-200">
                        📎 Attachment
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Email Body */}
                <div className="prose prose-gray max-w-none">
                  <div 
                    className="text-gray-900 leading-relaxed whitespace-pre-wrap text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedEmail.body
                        .replace(/\n/g, '<br>')
                        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="text-blue-600 underline" target="_blank">$1</a>')
                    }}
                  />
                </div>
                
              </div>
            </div>
            
            {/* Gmail-style Action Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const quotedBody = selectedEmail.body
                      .split('\n')
                      .map(line => `> ${line}`)
                      .join('\n');
                    
                    setComposeData({
                      to: selectedEmail.from,
                      subject: selectedEmail.subject.startsWith('Re: ') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
                      body: `\n\nOn ${new Date(selectedEmail.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}, ${selectedEmail.from} wrote:\n\n${quotedBody}`
                    });
                    setSelectedEmail(null);
                    setShowCompose(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  <FaPaperPlane className="text-xs" />
                  Reply
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm">
                  Forward
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  Archive
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this email?')) {
                      deleteEmail(selectedEmail.id);
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}