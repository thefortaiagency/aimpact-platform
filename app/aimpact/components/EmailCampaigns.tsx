'use client';

import { useState, useEffect } from 'react';
import { 
  Mail, Send, Users, FileText, BarChart3, Plus, Upload,
  Eye, MousePointer, TrendingUp, UserX, AlertCircle,
  Sparkles, Clock, CheckCircle, XCircle, RefreshCw,
  Settings, Download, Search, Filter, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledAt?: string;
  sentAt?: string;
  stats: {
    recipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  rates: {
    open: number;
    click: number;
    bounce: number;
    unsubscribe: number;
  };
}

interface EmailContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  isSubscribed: boolean;
  optedInAt?: string;
  lastEngagedAt?: string;
  tags: string[];
  organization_id?: string;
  organization?: any;
}

export default function EmailCampaigns() {
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New campaign form
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    previewText: '',
    fromName: '',
    fromEmail: '',
    replyTo: '',
    content: '',
    useAI: false,
    aiPrompt: '',
    targetList: 'all',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: ''
  });

  // Stats
  const stats = {
    totalContacts: contacts.length,
    subscribed: contacts.filter(c => c && c.isSubscribed).length,
    unsubscribed: contacts.filter(c => c && !c.isSubscribed).length,
    avgOpenRate: campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + c.rates.open, 0) / campaigns.length 
      : 0,
    avgClickRate: campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + c.rates.click, 0) / campaigns.length
      : 0,
    totalSent: campaigns.reduce((sum, c) => sum + c.stats.sent, 0)
  };

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/email/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      // First try to fetch from CRM contacts
      const crmResponse = await fetch('/api/aimpact/contacts');
      if (crmResponse.ok) {
        const crmContacts = await crmResponse.json();
        // Transform CRM contacts to email campaign format
        const emailContacts = crmContacts.map((contact: any) => ({
          id: contact.id,
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name,
          company: contact.organization?.name || contact.company,
          isSubscribed: contact.email_opt_in !== false,
          organization_id: contact.organization_id,
          organization: contact.organization,
          tags: contact.tags || []
        }));
        setContacts(emailContacts);
      } else {
        // Fallback to email contacts API
        const response = await fetch('/api/email/contacts');
        if (response.ok) {
          const data = await response.json();
          setContacts(data);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!campaignForm.aiPrompt) return;
    
    try {
      const response = await fetch('/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: campaignForm.aiPrompt,
          campaignName: campaignForm.name,
          targetAudience: campaignForm.targetList
        })
      });
      
      if (response.ok) {
        const { html, subject, previewText } = await response.json();
        setCampaignForm(prev => ({
          ...prev,
          content: html,
          subject: subject || prev.subject,
          previewText: previewText || prev.previewText
        }));
      }
    } catch (error) {
      console.error('Error generating with AI:', error);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm)
      });
      
      if (response.ok) {
        await fetchCampaigns();
        setShowNewCampaign(false);
        setCampaignForm({
          name: '',
          subject: '',
          previewText: '',
          fromName: '',
          fromEmail: '',
          replyTo: '',
          content: '',
          useAI: false,
          aiPrompt: '',
          targetList: 'all',
          scheduleType: 'now',
          scheduleDate: '',
          scheduleTime: ''
        });
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleImportContacts = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/email/contacts/import', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        await fetchContacts();
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showNewCampaign) {
    return (
      <div className="space-y-6">
        {/* New Campaign Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create Email Campaign</h2>
            <p className="text-muted-foreground">Design and send your email campaign</p>
          </div>
          <Button variant="outline" onClick={() => setShowNewCampaign(false)}>
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="Summer Sale 2024"
                />
              </div>
              
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                  placeholder="🎉 Exclusive Summer Sale - 50% Off!"
                />
              </div>
              
              <div>
                <Label>Preview Text</Label>
                <Input
                  value={campaignForm.previewText}
                  onChange={(e) => setCampaignForm({ ...campaignForm, previewText: e.target.value })}
                  placeholder="Don't miss out on our biggest sale of the year..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={campaignForm.fromName}
                    onChange={(e) => setCampaignForm({ ...campaignForm, fromName: e.target.value })}
                    placeholder="Your Company"
                  />
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={campaignForm.fromEmail}
                    onChange={(e) => setCampaignForm({ ...campaignForm, fromEmail: e.target.value })}
                    placeholder="hello@company.com"
                  />
                </div>
              </div>
              
              <div>
                <Label>Reply-To Email</Label>
                <Input
                  type="email"
                  value={campaignForm.replyTo}
                  onChange={(e) => setCampaignForm({ ...campaignForm, replyTo: e.target.value })}
                  placeholder="support@company.com"
                />
              </div>
              
              {/* AI Content Generation */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Use AI to Generate Content</Label>
                  <Switch
                    checked={campaignForm.useAI}
                    onCheckedChange={(checked) => setCampaignForm({ ...campaignForm, useAI: checked })}
                  />
                </div>
                
                {campaignForm.useAI && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Describe your email campaign... e.g., 'Create a summer sale email promoting 50% off all products, emphasizing limited time offer and free shipping'"
                      value={campaignForm.aiPrompt}
                      onChange={(e) => setCampaignForm({ ...campaignForm, aiPrompt: e.target.value })}
                      rows={3}
                    />
                    <Button onClick={handleGenerateWithAI} className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate with AI
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Manual Content Editor */}
              {!campaignForm.useAI && (
                <div>
                  <Label>Email Content (HTML)</Label>
                  <Textarea
                    value={campaignForm.content}
                    onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                    placeholder="Enter your HTML content or use the AI generator above"
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview & Settings */}
          <div className="space-y-6">
            {/* Email Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-3 border-b">
                    <p className="text-sm font-medium">Subject: {campaignForm.subject || 'Your Subject Line'}</p>
                    <p className="text-xs text-muted-foreground">
                      From: {campaignForm.fromName || 'Sender Name'} &lt;{campaignForm.fromEmail || 'sender@email.com'}&gt;
                    </p>
                  </div>
                  {campaignForm.content ? (
                    <iframe
                      srcDoc={campaignForm.content}
                      className="w-full h-[400px]"
                      title="Email Preview"
                    />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Email preview will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Targeting & Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle>Targeting & Scheduling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Target List</Label>
                  <Select
                    value={campaignForm.targetList}
                    onValueChange={(value) => setCampaignForm({ ...campaignForm, targetList: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subscribers ({stats.subscribed})</SelectItem>
                      <SelectItem value="engaged">Engaged (Last 30 days)</SelectItem>
                      <SelectItem value="new">New Subscribers</SelectItem>
                      <SelectItem value="inactive">Re-engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Send Time</Label>
                  <Select
                    value={campaignForm.scheduleType}
                    onValueChange={(value) => setCampaignForm({ ...campaignForm, scheduleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Immediately</SelectItem>
                      <SelectItem value="scheduled">Schedule for Later</SelectItem>
                      <SelectItem value="optimal">Optimal Send Time (AI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {campaignForm.scheduleType === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={campaignForm.scheduleDate}
                        onChange={(e) => setCampaignForm({ ...campaignForm, scheduleDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={campaignForm.scheduleTime}
                        onChange={(e) => setCampaignForm({ ...campaignForm, scheduleTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                
                {/* Campaign Actions */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1">
                    Save as Draft
                  </Button>
                  <Button onClick={handleCreateCampaign} className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Send Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📧 Email Campaigns</h2>
          <p className="text-muted-foreground">Create, send, and track email campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Contacts
          </Button>
          <Button onClick={() => setShowNewCampaign(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold">{stats.totalContacts}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Subscribed</p>
                <p className="text-2xl font-bold text-green-500">{stats.subscribed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Open Rate</p>
                <p className="text-2xl font-bold">{stats.avgOpenRate.toFixed(1)}%</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Click Rate</p>
                <p className="text-2xl font-bold">{stats.avgClickRate.toFixed(1)}%</p>
              </div>
              <MousePointer className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unsubscribed</p>
                <p className="text-2xl font-bold text-red-500">{stats.unsubscribed}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest email campaigns and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No campaigns yet</p>
                  <Button onClick={() => setShowNewCampaign(true)} className="mt-4">
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 5).map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <Badge variant={
                            campaign.status === 'sent' ? 'default' :
                            campaign.status === 'sending' ? 'secondary' :
                            campaign.status === 'scheduled' ? 'outline' :
                            'secondary'
                          }>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {campaign.sentAt ? `Sent ${format(new Date(campaign.sentAt), 'MMM d, yyyy')}` : 'Not sent yet'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-medium">{campaign.stats.delivered}</p>
                          <p className="text-xs text-muted-foreground">Delivered</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-blue-500">{campaign.rates.open}%</p>
                          <p className="text-xs text-muted-foreground">Open Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-purple-500">{campaign.rates.click}%</p>
                          <p className="text-xs text-muted-foreground">Click Rate</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowNewCampaign(true)}>
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Create Campaign</h3>
                <p className="text-sm text-muted-foreground mt-1">Design and send a new email</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold">Import Contacts</h3>
                <p className="text-sm text-muted-foreground mt-1">Add subscribers from CSV</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold">View Analytics</h3>
                <p className="text-sm text-muted-foreground mt-1">Track campaign performance</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>Manage your email subscribers and their preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Contact management interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
              <CardDescription>Detailed performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Email Automation</CardTitle>
              <CardDescription>Set up automated email workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Automation workflows coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}