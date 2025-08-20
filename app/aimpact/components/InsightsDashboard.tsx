'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Brain, Calendar, Users, Phone, Mail, MessageSquare, AlertCircle, Target, Zap, Activity, Clock, DollarSign, UserCheck, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { DraggableGrid } from '@/components/ui/draggable-grid'

interface Insight {
  id: string
  type: 'trend' | 'suggestion' | 'alert' | 'achievement'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  icon: any
  action?: {
    label: string
    onClick: () => void
  }
}

interface MetricCard {
  title: string
  value: string | number
  change: number
  trend: 'up' | 'down'
  icon: any
  color: string
}

export default function InsightsDashboard() {
  const [activeTimeframe, setActiveTimeframe] = useState<'day' | 'week' | 'month'>('week')
  const [animatedValues, setAnimatedValues] = useState({
    responseTime: 0,
    satisfaction: 0,
    efficiency: 0
  })

  // Animate values on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValues({
        responseTime: 92,
        satisfaction: 87,
        efficiency: 94
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const insights: Insight[] = [
    {
      id: '1',
      type: 'trend',
      title: 'Peak Communication Hours',
      description: 'Most customer interactions occur between 2-4 PM. Consider scheduling more agents during this time.',
      impact: 'high',
      icon: Activity,
      action: {
        label: 'Adjust Schedule',
        onClick: () => console.log('Adjust schedule')
      }
    },
    {
      id: '2',
      type: 'suggestion',
      title: 'Follow-up Opportunity',
      description: '5 high-value clients haven\'t been contacted in over 30 days.',
      impact: 'medium',
      icon: Users,
      action: {
        label: 'View Clients',
        onClick: () => console.log('View clients')
      }
    },
    {
      id: '3',
      type: 'alert',
      title: 'Response Time Alert',
      description: 'Average email response time has increased by 35% this week.',
      impact: 'high',
      icon: AlertCircle
    },
    {
      id: '4',
      type: 'achievement',
      title: 'Call Volume Record',
      description: 'Your team handled 127 calls yesterday - a new daily record!',
      impact: 'low',
      icon: Phone
    },
    {
      id: '5',
      type: 'suggestion',
      title: 'Sentiment Analysis',
      description: '3 recent conversations showed negative sentiment. Review for service improvement opportunities.',
      impact: 'medium',
      icon: AlertTriangle,
      action: {
        label: 'Review Conversations',
        onClick: () => console.log('Review conversations')
      }
    },
    {
      id: '6',
      type: 'trend',
      title: 'Conversion Rate Increase',
      description: 'Email campaigns are converting 23% better than last month.',
      impact: 'high',
      icon: TrendingUp
    }
  ]

  const metrics: MetricCard[] = [
    {
      title: 'Total Interactions',
      value: '1,284',
      change: 12.5,
      trend: 'up',
      icon: Activity,
      color: 'text-blue-500'
    },
    {
      title: 'Avg Response Time',
      value: '2m 14s',
      change: -8.3,
      trend: 'down',
      icon: Zap,
      color: 'text-green-500'
    },
    {
      title: 'Customer Satisfaction',
      value: '4.7/5',
      change: 3.2,
      trend: 'up',
      icon: Target,
      color: 'text-purple-500'
    },
    {
      title: 'Active Conversations',
      value: '47',
      change: 15.7,
      trend: 'up',
      icon: MessageSquare,
      color: 'text-orange-500'
    },
    {
      title: 'Revenue Impact',
      value: '$45.2K',
      change: 28.4,
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-500'
    },
    {
      title: 'Lead Conversion',
      value: '34%',
      change: 5.8,
      trend: 'up',
      icon: UserCheck,
      color: 'text-indigo-500'
    }
  ]

  const channelDistribution = [
    { channel: 'Phone', percentage: 45, count: 578, color: 'bg-blue-500' },
    { channel: 'Email', percentage: 30, count: 385, color: 'bg-green-500' },
    { channel: 'SMS', percentage: 15, count: 193, color: 'bg-purple-500' },
    { channel: 'Chat', percentage: 10, count: 128, color: 'bg-orange-500' }
  ]

  const timeBasedInsights = {
    day: {
      busiest: '2:00 PM - 4:00 PM',
      quietest: '6:00 AM - 8:00 AM',
      peakChannel: 'Phone',
      avgHandleTime: '3m 45s'
    },
    week: {
      busiestDay: 'Wednesday',
      quietestDay: 'Sunday',
      weeklyGrowth: '+15%',
      topPerformer: 'Sarah Johnson'
    },
    month: {
      trend: 'Increasing',
      monthlyGrowth: '+22%',
      projectedNext: '1,580 interactions',
      seasonalFactor: 'Holiday season approaching'
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI-Powered Insights</h2>
            <p className="text-muted-foreground">Smart recommendations based on your communication patterns</p>
          </div>
        </div>
        <Tabs value={activeTimeframe} onValueChange={(v: any) => setActiveTimeframe(v)}>
          <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <DraggableGrid
        storageKey="insights-metrics"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-4"
        enabled={true}
      >
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-card/30 backdrop-blur-md">
              <CardContent className="p-3 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm text-muted-foreground">{metric.title}</p>
                    <p className="text-lg lg:text-2xl font-bold">{metric.value}</p>
                    <p className={`text-xs flex items-center mt-1 ${metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {metric.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {metric.trend === 'up' ? '+' : ''}{metric.change}%
                    </p>
                  </div>
                  <metric.icon className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground/20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </DraggableGrid>

      <DraggableGrid
        storageKey="insights-main-grid"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6"
        enabled={true}
      >
        {/* AI Insights Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg lg:text-xl">Smart Insights</CardTitle>
              <CardDescription className="text-sm">AI-generated recommendations and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 lg:p-4 rounded-lg border ${
                      insight.type === 'alert' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                      insight.type === 'achievement' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                      'hover:bg-accent'
                    } transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        insight.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/50' :
                        insight.type === 'achievement' ? 'bg-green-100 text-green-600 dark:bg-green-900/50' :
                        insight.type === 'trend' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50' :
                        'bg-purple-100 text-purple-600 dark:bg-purple-900/50'
                      }`}>
                        <insight.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm lg:text-base">{insight.title}</h4>
                          <Badge variant={
                            insight.impact === 'high' ? 'destructive' :
                            insight.impact === 'medium' ? 'default' :
                            'secondary'
                          }>
                            {insight.impact} impact
                          </Badge>
                        </div>
                        <p className="text-xs lg:text-sm text-muted-foreground mt-1">{insight.description}</p>
                        {insight.action && (
                          <Button 
                            size="sm" 
                            variant="link" 
                            className="mt-2 p-0 h-auto"
                            onClick={insight.action.onClick}
                          >
                            {insight.action.label} →
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Channel Distribution */}
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Channel Distribution</CardTitle>
              <CardDescription>Communication breakdown by channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelDistribution.map((channel, index) => (
                  <motion.div
                    key={channel.channel}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{channel.channel}</span>
                      <span className="text-sm text-muted-foreground">{channel.count} ({channel.percentage}%)</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`absolute left-0 top-0 h-full ${channel.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${channel.percentage}%` }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics & Time-based Insights */}
        <div className="space-y-4">
          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg lg:text-xl">Performance Score</CardTitle>
              <CardDescription className="text-sm">Real-time team performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Response Time</span>
                    <span className="text-sm text-muted-foreground">{animatedValues.responseTime}%</span>
                  </div>
                  <Progress value={animatedValues.responseTime} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Customer Satisfaction</span>
                    <span className="text-sm text-muted-foreground">{animatedValues.satisfaction}%</span>
                  </div>
                  <Progress value={animatedValues.satisfaction} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Team Efficiency</span>
                    <span className="text-sm text-muted-foreground">{animatedValues.efficiency}%</span>
                  </div>
                  <Progress value={animatedValues.efficiency} className="h-2" />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                    91%
                  </p>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Time-based Insights</CardTitle>
              <CardDescription>Patterns for {activeTimeframe === 'day' ? 'today' : activeTimeframe === 'week' ? 'this week' : 'this month'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeTimeframe === 'day' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Busiest Period</span>
                    <span className="text-sm font-medium">{timeBasedInsights.day.busiest}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Quietest Period</span>
                    <span className="text-sm font-medium">{timeBasedInsights.day.quietest}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Peak Channel</span>
                    <Badge variant="outline">{timeBasedInsights.day.peakChannel}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Handle Time</span>
                    <span className="text-sm font-medium">{timeBasedInsights.day.avgHandleTime}</span>
                  </div>
                </>
              )}
              {activeTimeframe === 'week' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Busiest Day</span>
                    <span className="text-sm font-medium">{timeBasedInsights.week.busiestDay}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Quietest Day</span>
                    <span className="text-sm font-medium">{timeBasedInsights.week.quietestDay}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Weekly Growth</span>
                    <Badge variant="default">{timeBasedInsights.week.weeklyGrowth}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Top Performer</span>
                    <span className="text-sm font-medium">{timeBasedInsights.week.topPerformer}</span>
                  </div>
                </>
              )}
              {activeTimeframe === 'month' && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Overall Trend</span>
                    <Badge variant="default">{timeBasedInsights.month.trend}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monthly Growth</span>
                    <span className="text-sm font-medium">{timeBasedInsights.month.monthlyGrowth}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Next Month Projection</span>
                    <span className="text-sm font-medium">{timeBasedInsights.month.projectedNext}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {timeBasedInsights.month.seasonalFactor}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/30 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>AI-suggested actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Team Meeting
              </Button>
              <Button className="w-full justify-start" variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Review Pending Contacts
              </Button>
              <Button className="w-full justify-start" variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Weekly Report
              </Button>
              <Button className="w-full justify-start" variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Call High-Priority Leads
              </Button>
            </CardContent>
          </Card>
        </div>
      </DraggableGrid>
    </div>
  )
}