'use client'

import { useState, useEffect } from 'react'
import { 
  X, Building2, Globe, Phone, Mail, MapPin, Calendar, DollarSign,
  TrendingUp, Activity, Shield, Users, Briefcase, Target, Brain,
  MessageCircle, Clock, CheckCircle2, AlertCircle, Star, ThumbsUp,
  Database, Cpu, Cloud, Lock, BarChart3, Settings, Zap, Heart,
  Smile, Meh, Frown, Timer, Crown, GitBranch, Link2, Award,
  Package, Server, Code, Layers, Wifi, HardDrive, Monitor
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface ClientDetailModalProps {
  organization: any
  isOpen: boolean
  onClose: () => void
}

export default function ClientDetailModal({ organization, isOpen, onClose }: ClientDetailModalProps) {
  const [clientData, setClientData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (isOpen && organization) {
      fetchClientDetails()
    }
  }, [isOpen, organization])

  const fetchClientDetails = async () => {
    setIsLoading(true)
    try {
      // Fetch all enhanced data for this client
      const [contextRes, techRes, industryRes, dealsRes, contactsRes, ticketsRes] = await Promise.all([
        fetch(`/api/aimpact/organizations/${organization.id}/context`),
        fetch(`/api/aimpact/organizations/${organization.id}/tech-stack`),
        fetch(`/api/aimpact/organizations/${organization.id}/industry-intel`),
        fetch(`/api/aimpact/organizations/${organization.id}/deals`),
        fetch(`/api/aimpact/organizations/${organization.id}/contacts`),
        fetch(`/api/aimpact/organizations/${organization.id}/tickets`)
      ])

      const data = {
        context: await contextRes.json().catch(() => null),
        techStack: await techRes.json().catch(() => []),
        industryIntel: await industryRes.json().catch(() => null),
        deals: await dealsRes.json().catch(() => []),
        contacts: await contactsRes.json().catch(() => []),
        tickets: await ticketsRes.json().catch(() => [])
      }

      setClientData(data)
    } catch (error) {
      console.error('Error fetching client details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!organization) return null

  const healthScore = clientData?.context?.overallHealthScore || organization.healthScore || 85
  const satisfactionScore = clientData?.context?.satisfactionScore || organization.overallSatisfaction || 78
  const engagementScore = clientData?.context?.engagementScore || 72
  const riskScore = clientData?.context?.riskScore || 15
  const opportunityScore = clientData?.context?.opportunityScore || 88

  const getScoreColor = (score: number, inverse: boolean = false) => {
    if (inverse) {
      if (score <= 30) return 'text-green-600'
      if (score <= 60) return 'text-amber-600'
      return 'text-red-600'
    }
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="h-4 w-4 text-green-500" />
      case 'negative': return <Frown className="h-4 w-4 text-red-500" />
      default: return <Meh className="h-4 w-4 text-amber-500" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                  {organization.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{organization.name}</DialogTitle>
                <div className="flex items-center gap-4 mt-2">
                  {organization.industry && (
                    <Badge variant="outline">
                      <Building2 className="h-3 w-3 mr-1" />
                      {organization.industry}
                    </Badge>
                  )}
                  {organization.domain && (
                    <Badge variant="outline">
                      <Globe className="h-3 w-3 mr-1" />
                      {organization.domain}
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={organization.riskLevel === 'high' ? 'border-red-500 text-red-600' : 
                              organization.riskLevel === 'medium' ? 'border-amber-500 text-amber-600' : 
                              'border-green-500 text-green-600'}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {organization.riskLevel || 'Low'} Risk
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* Health Scores Row */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Overall Health</p>
                    <p className={`text-2xl font-bold ${getScoreColor(healthScore)}`}>{healthScore}%</p>
                  </div>
                  <Heart className="h-8 w-8 text-green-500/30" />
                </div>
                <Progress value={healthScore} className="h-1 mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Satisfaction</p>
                    <p className={`text-2xl font-bold ${getScoreColor(satisfactionScore)}`}>{satisfactionScore}%</p>
                  </div>
                  <ThumbsUp className="h-8 w-8 text-blue-500/30" />
                </div>
                <Progress value={satisfactionScore} className="h-1 mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Engagement</p>
                    <p className={`text-2xl font-bold ${getScoreColor(engagementScore)}`}>{engagementScore}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-500/30" />
                </div>
                <Progress value={engagementScore} className="h-1 mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <p className={`text-2xl font-bold ${getScoreColor(riskScore, true)}`}>{riskScore}%</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500/30" />
                </div>
                <Progress value={riskScore} className="h-1 mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Opportunity</p>
                    <p className={`text-2xl font-bold ${getScoreColor(opportunityScore)}`}>{opportunityScore}%</p>
                  </div>
                  <Target className="h-8 w-8 text-amber-500/30" />
                </div>
                <Progress value={opportunityScore} className="h-1 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-8 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="techstack">Tech Stack</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="industry">Industry Intel</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="ai">AI Insights</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Company Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {organization.website && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a href={organization.website} target="_blank" className="text-blue-500 hover:underline">
                              {organization.website}
                            </a>
                          </div>
                        )}
                        {organization.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{organization.phone}</span>
                          </div>
                        )}
                        {organization.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{organization.email}</span>
                          </div>
                        )}
                        {organization.address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{organization.address}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Financial Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lifetime Value</span>
                          <span className="font-medium">${((organization.lifetimeValue || clientData?.context?.totalRevenue || 0) / 1000).toFixed(0)}k</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Order Value</span>
                          <span className="font-medium">${((organization.avgOrderValue || 0) / 1000).toFixed(0)}k</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pipeline Value</span>
                          <span className="font-medium">${((clientData?.context?.totalPipelineValue || 0) / 1000).toFixed(0)}k</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Communication Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Response Time</span>
                          <span className="font-medium">{organization.avgResponseTime || 2.4}h</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Interactions</span>
                          <span className="font-medium">{organization.totalInteractions || 47}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sentiment Trend</span>
                          <Badge variant="outline" className="text-xs">
                            {organization.sentimentTrend || 'stable'}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Open Tickets</span>
                          <span className="font-medium">{clientData?.context?.openTickets || 2}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {clientData?.context?.executiveSummary && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Executive Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {clientData.context.executiveSummary}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
                ) : clientData?.contacts?.length > 0 ? (
                  <div className="space-y-3">
                    {clientData.contacts.map((contact: any) => {
                      if (!contact) return null;
                      const firstName = contact.firstName || contact.first_name || '';
                      const lastName = contact.lastName || contact.last_name || '';
                      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Contact';
                      const initials = [
                        (firstName?.[0] || '').toUpperCase(),
                        (lastName?.[0] || '').toUpperCase()
                      ].filter(Boolean).join('') || 'C';
                      
                      return (
                      <Card key={contact.id || Math.random()}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {fullName}
                                  {contact.isPrimary && <Badge className="ml-2 text-xs">Primary</Badge>}
                                </p>
                                <p className="text-sm text-muted-foreground">{contact.position || 'Contact'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {contact.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span>{contact.email}</span>
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{contact.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )})}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No contacts found</div>
                )}
              </TabsContent>

              <TabsContent value="techstack" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tech stack...</div>
                ) : clientData?.techStack?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {clientData.techStack.map((tech: any, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {tech.category === 'CRM' && <Users className="h-5 w-5 text-blue-500" />}
                              {tech.category === 'Email' && <Mail className="h-5 w-5 text-green-500" />}
                              {tech.category === 'Analytics' && <BarChart3 className="h-5 w-5 text-purple-500" />}
                              {tech.category === 'Cloud' && <Cloud className="h-5 w-5 text-sky-500" />}
                              {tech.category === 'Security' && <Lock className="h-5 w-5 text-red-500" />}
                              {!['CRM', 'Email', 'Analytics', 'Cloud', 'Security'].includes(tech.category) && 
                                <Cpu className="h-5 w-5 text-gray-500" />
                              }
                              <div>
                                <p className="font-medium">{tech.name}</p>
                                <p className="text-sm text-muted-foreground">{tech.category}</p>
                              </div>
                            </div>
                            {tech.confidence && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Confidence</p>
                                <Progress value={tech.confidence * 100} className="w-20 h-1" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No tech stack data available</div>
                )}
              </TabsContent>

              <TabsContent value="deals" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading deals...</div>
                ) : clientData?.deals?.length > 0 ? (
                  <div className="space-y-3">
                    {clientData.deals.map((deal: any) => (
                      <Card key={deal.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{deal.name}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant="outline">{deal.stage}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  ${(deal.value / 1000).toFixed(0)}k • {deal.probability}% probability
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Expected close</p>
                              <p className="text-sm font-medium">
                                {new Date(deal.expectedCloseDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No active deals</div>
                )}
              </TabsContent>

              <TabsContent value="tickets" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading tickets...</div>
                ) : clientData?.tickets?.length > 0 ? (
                  <div className="space-y-3">
                    {clientData.tickets.map((ticket: any) => (
                      <Card key={ticket.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{ticket.subject}</p>
                              <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                            </div>
                            <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No tickets found</div>
                )}
              </TabsContent>

              <TabsContent value="industry" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading industry intelligence...</div>
                ) : clientData?.industryIntel ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Company Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Primary Industry</span>
                          <span className="font-medium">{clientData.industryIntel.primaryIndustry || organization.industry}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Employee Range</span>
                          <span className="font-medium">{clientData.industryIntel.employeeRange || '11-50'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Revenue Range</span>
                          <span className="font-medium">{clientData.industryIntel.revenueRange || '$1-10M'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Year Founded</span>
                          <span className="font-medium">{clientData.industryIntel.yearFounded || 2015}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Business Model</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Market Position</span>
                          <Badge variant="outline">{clientData.industryIntel.marketPosition || 'challenger'}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Business Model</span>
                          <span className="font-medium">{clientData.industryIntel.businessModel || 'B2B'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sales Cycle</span>
                          <span className="font-medium">{clientData.industryIntel.salesCycle || 'medium'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {clientData.industryIntel.painPoints?.length > 0 && (
                      <Card className="col-span-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Key Pain Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {clientData.industryIntel.painPoints.map((pain: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <div>
                                  <p className="text-sm font-medium">{pain.category}</p>
                                  <p className="text-xs text-muted-foreground">{pain.description}</p>
                                </div>
                                <Badge 
                                  variant="outline"
                                  className={pain.severity === 'high' ? 'border-red-500 text-red-600' : 
                                            pain.severity === 'medium' ? 'border-amber-500 text-amber-600' : 
                                            'border-green-500 text-green-600'}
                                >
                                  {pain.severity}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No industry intelligence available</div>
                )}
              </TabsContent>

              <TabsContent value="communications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Communications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <Mail className="h-4 w-4 text-blue-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Email: Project Update</p>
                          <p className="text-xs text-muted-foreground">2 days ago • Positive sentiment</p>
                        </div>
                        {getSentimentIcon('positive')}
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <Phone className="h-4 w-4 text-green-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Call: Quarterly Review</p>
                          <p className="text-xs text-muted-foreground">1 week ago • Neutral sentiment</p>
                        </div>
                        {getSentimentIcon('neutral')}
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded bg-muted/50">
                        <MessageCircle className="h-4 w-4 text-purple-500 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">SMS: Payment Reminder</p>
                          <p className="text-xs text-muted-foreground">2 weeks ago • Positive response</p>
                        </div>
                        {getSentimentIcon('positive')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      AI-Generated Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded bg-background/50">
                      <p className="text-sm font-medium mb-1">🎯 Upsell Opportunity Detected</p>
                      <p className="text-xs text-muted-foreground">
                        Based on usage patterns and engagement metrics, this client is a prime candidate for 
                        upgrading to the Enterprise plan. They've exceeded 80% of their current plan limits.
                      </p>
                    </div>
                    <div className="p-3 rounded bg-background/50">
                      <p className="text-sm font-medium mb-1">📈 Growth Trajectory</p>
                      <p className="text-xs text-muted-foreground">
                        Client has shown 45% growth in platform usage over the last quarter. 
                        Engagement score increased from 52% to 72% indicating strong adoption.
                      </p>
                    </div>
                    <div className="p-3 rounded bg-background/50">
                      <p className="text-sm font-medium mb-1">⚠️ Attention Required</p>
                      <p className="text-xs text-muted-foreground">
                        Response time has increased by 2.3 hours in the last month. 
                        Consider scheduling a check-in call to maintain satisfaction levels.
                      </p>
                    </div>
                    <div className="p-3 rounded bg-background/50">
                      <p className="text-sm font-medium mb-1">🔗 Integration Recommendations</p>
                      <p className="text-xs text-muted-foreground">
                        Based on their tech stack (Salesforce, Gmail), recommend our CRM sync 
                        and email automation features to streamline their workflow.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}