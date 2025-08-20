'use client';

import React, { useState, useEffect } from 'react';
import { FaInbox, FaPaperPlane, FaDraftingCompass, FaFolder, FaStar, FaTrash, FaPlus, FaSearch, FaEnvelope, FaEnvelopeOpen, FaCog, FaSync } from 'react-icons/fa';

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

interface EmailStats {
  totalFolders: number;
  userFolders: number;
  systemFolders: number;
  totalMessages: number;
  totalUnread: number;
}

export default function AdvancedEmailInterface() {
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  });

  // Load folders on component mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Load emails when folder changes
  useEffect(() => {
    if (selectedFolder) {
      loadEmails(selectedFolder);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      console.log('Loading folders...');
      setLoading(true);
      const response = await fetch('/api/aimpact/gmail/folders');
      console.log('Folders response:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Folders data:', data);
      
      if (data.success) {
        setFolders(data.folders);
        setStats(data.stats);
        console.log(`Loaded ${data.folders.length} folders successfully`);
      } else {
        console.error('API returned error:', data.error);
        alert('Failed to load Gmail folders: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      alert('Failed to connect to Gmail API: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async (folderId: string) => {
    try {
      console.log(`Loading emails from folder: ${folderId}`);
      setEmailLoading(true);
      const response = await fetch(`/api/aimpact/gmail/manage?folderId=${folderId}&maxResults=20`);
      console.log('Emails response:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Emails data for ${folderId}:`, data);
      
      if (data.success) {
        setEmails(data.emails || []);
        console.log(`Loaded ${(data.emails || []).length} emails from ${folderId}`);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Error loading emails:', error);
      setEmails([]); // Set empty array on error
    } finally {
      setEmailLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const response = await fetch('/api/aimpact/gmail/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewFolderName('');
        setShowNewFolder(false);
        loadFolders(); // Refresh folders
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const moveEmails = async (targetFolderId: string) => {
    if (selectedEmails.length === 0) return;
    
    try {
      const response = await fetch('/api/aimpact/gmail/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          messageIds: selectedEmails,
          targetFolderId,
          sourceFolderId: selectedFolder
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedEmails([]);
        loadEmails(selectedFolder); // Refresh current view
        loadFolders(); // Refresh folder counts
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error moving emails:', error);
    }
  };

  const markAsRead = async () => {
    if (selectedEmails.length === 0) return;
    
    try {
      const response = await fetch('/api/aimpact/gmail/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          messageIds: selectedEmails
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedEmails([]);
        loadEmails(selectedFolder);
        loadFolders();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const response = await fetch('/api/aimpact/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setComposeData({ to: '', subject: '', body: '' });
        setShowCompose(false);
        alert('Email sent successfully!');
        loadFolders(); // Refresh folder counts
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails(prev => 
      prev.includes(emailId) 
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const filteredEmails = emails.filter(email =>
    searchQuery === '' || 
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const systemFolders = folders.filter(f => f.type === 'system');
  const userFolders = folders.filter(f => f.type === 'user');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FaSync className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading Gmail interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex">
      {/* Sidebar - Folders */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Gmail Control</h2>
            <button
              onClick={loadFolders}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              title="Refresh folders"
            >
              <FaSync className="text-sm" />
            </button>
          </div>
          
          {/* Stats */}
          {stats && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="font-medium text-blue-900">{stats.totalFolders}</div>
                  <div className="text-blue-700">Folders</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">{stats.totalUnread}</div>
                  <div className="text-blue-700">Unread</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Compose Button */}
        <div className="p-4">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <FaPlus className="text-sm" />
            Compose Email
          </button>
        </div>

        {/* System Folders */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-2">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              System Folders
            </h3>
            {systemFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left p-2 rounded-lg mb-1 flex items-center justify-between transition-colors ${
                  selectedFolder === folder.id 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="text-sm">{folder.name}</span>
                </div>
                {folder.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {folder.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* User Folders */}
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Custom Folders
              </h3>
              <button
                onClick={() => setShowNewFolder(true)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Create new folder"
              >
                <FaPlus className="text-sm" />
              </button>
            </div>
            
            {showNewFolder && (
              <div className="mb-3">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={createFolder}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewFolder(false)}
                    className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {userFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left p-2 rounded-lg mb-1 flex items-center justify-between transition-colors ${
                  selectedFolder === folder.id 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FaFolder className="text-blue-500" />
                  <span className="text-sm">{folder.name}</span>
                </div>
                {folder.messageCount > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {folder.messageCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Email List */}
      <div className="flex-1 flex flex-col">
        {/* Email Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {folders.find(f => f.id === selectedFolder)?.name || selectedFolder}
            </h3>
            
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
              />
            </div>
          </div>

          {/* Email Actions */}
          {selectedEmails.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">
                {selectedEmails.length} email{selectedEmails.length !== 1 ? 's' : ''} selected
              </span>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={markAsRead}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Mark Read
                </button>
                
                <select
                  onChange={(e) => e.target.value && moveEmails(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Move to...</option>
                  {[...systemFolders, ...userFolders]
                    .filter(f => f.id !== selectedFolder)
                    .map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {emailLoading ? (
            <div className="flex items-center justify-center h-32">
              <FaSync className="animate-spin text-2xl text-blue-500 mr-2" />
              <span className="text-gray-600">Loading emails...</span>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaEnvelope className="text-4xl mx-auto mb-4 opacity-50" />
              <p>No emails found in this folder</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEmails.map(email => (
                <div
                  key={email.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedEmails.includes(email.id) ? 'bg-blue-50' : ''
                  } ${email.unread ? 'border-l-4 border-l-blue-500' : ''}`}
                  onClick={() => toggleEmailSelection(email.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(email.id)}
                          onChange={() => toggleEmailSelection(email.id)}
                          className="text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {email.starred && <FaStar className="text-yellow-500 text-sm" />}
                        {email.unread ? (
                          <FaEnvelope className="text-blue-500 text-sm" />
                        ) : (
                          <FaEnvelopeOpen className="text-gray-400 text-sm" />
                        )}
                        <span className={`text-sm ${email.unread ? 'font-semibold' : 'font-normal'}`}>
                          {email.from}
                        </span>
                      </div>
                      
                      <h4 className={`mb-1 ${email.unread ? 'font-semibold' : 'font-normal'} text-gray-900`}>
                        {email.subject || '(No subject)'}
                      </h4>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {email.body.substring(0, 150)}...
                      </p>
                    </div>
                    
                    <div className="text-sm text-gray-500 ml-4 flex-shrink-0">
                      {new Date(email.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Compose Email</h3>
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="To"
                  value={composeData.to}
                  onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                
                <textarea
                  placeholder="Message"
                  value={composeData.body}
                  onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                />
                
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCompose(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FaPaperPlane />
                    Send Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}