'use client';

import React, { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaCheck, FaTimes } from 'react-icons/fa';

interface EmailRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    from?: string;
    subject?: string;
    body?: string;
    sender_domain?: string;
    keywords?: string[];
  };
  actions: {
    add_label?: string;
    mark_as_read?: boolean;
    archive?: boolean;
  };
  active: boolean;
  created_at: string;
}

interface EmailRulesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailRulesManager({ isOpen, onClose }: EmailRulesManagerProps) {
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/aimpact/email/rules-production');
      const data = await response.json();
      
      if (data.success) {
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    if (!newRuleText.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/aimpact/email/rules-production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          naturalLanguage: newRuleText
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setNewRuleText('');
        loadRules(); // Refresh the rules list
      } else {
        alert(`Error creating rule: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Error creating rule');
    } finally {
      setCreating(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/aimpact/email/rules-production?ruleId=${ruleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        loadRules(); // Refresh the rules list
      } else {
        alert(`Error deleting rule: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Error deleting rule');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Email Rules</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Create New Rule */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2">Create New Rule</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                placeholder="Describe your rule in natural language (e.g., 'Move all emails from GitHub to Development folder')"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createRule();
                  }
                }}
              />
              <button
                onClick={createRule}
                disabled={creating || !newRuleText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? (
                  'Creating...'
                ) : (
                  <>
                    <FaPlus className="text-xs" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Rules List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No email rules found.</p>
              <p className="text-sm">Create your first rule above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        {rule.name}
                        {rule.active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <FaCheck className="text-xs" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Inactive
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this rule?')) {
                          deleteRule(rule.id);
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full ml-2"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                    {/* Conditions */}
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Conditions:</h4>
                      <ul className="text-gray-600 space-y-1">
                        {rule.conditions.subject && (
                          <li>• Subject contains: "{rule.conditions.subject}"</li>
                        )}
                        {rule.conditions.from && (
                          <li>• From: {rule.conditions.from}</li>
                        )}
                        {rule.conditions.sender_domain && (
                          <li>• Domain: {rule.conditions.sender_domain}</li>
                        )}
                        {rule.conditions.keywords && rule.conditions.keywords.length > 0 && (
                          <li>• Keywords: {rule.conditions.keywords.join(', ')}</li>
                        )}
                      </ul>
                    </div>
                    
                    {/* Actions */}
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Actions:</h4>
                      <ul className="text-gray-600 space-y-1">
                        {rule.actions.add_label && (
                          <li>• Move to: {rule.actions.add_label}</li>
                        )}
                        {rule.actions.mark_as_read && (
                          <li>• Mark as read</li>
                        )}
                        {rule.actions.archive && (
                          <li>• Skip inbox (archive)</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-3">
                    Created: {new Date(rule.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md"
          >
            Close
          </button>
        </div>
        
      </div>
    </div>
  );
}