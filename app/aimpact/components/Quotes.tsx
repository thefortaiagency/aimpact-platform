'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, Plus, Send, Eye, Trophy, XCircle, Clock, 
  CheckCircle, Mail, Edit, RefreshCw, DollarSign,
  TrendingUp, Calendar, ChevronRight, Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import QuoteGenerator from './QuoteGenerator'
import QuoteViewer from './QuoteViewer'

interface Quote {
  id: string
  clientName: string
  clientEmail: string
  projectName: string
  amountMin: string | number
  amountMax: string | number
  status: string
  createdAt: string
  sentAt: string | null
  viewedAt: string | null
  signedAt: string | null
  closedAt: string | null
  signature?: {
    signerName: string
    signerEmail: string
    signerTitle: string
    signedAt: string
  }
  viewCount?: number
  organization_id?: string
}

interface QuotesProps {
  onNavigate?: (view: string, data?: any) => void
  refreshTrigger?: number // External trigger to refresh quotes
}

export default function Quotes({ onNavigate, refreshTrigger }: QuotesProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [showGenerator, setShowGenerator] = useState(false)
  const [viewingQuoteId, setViewingQuoteId] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchQuotes()
    
    // Set up polling to check for new quotes every 5 seconds
    // This ensures we catch quotes created by the chatbot
    const interval = setInterval(() => {
      fetchQuotes(true) // Silent refresh
    }, 5000)
    
    setRefreshInterval(interval)
    
    // Cleanup on unmount
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  // Refresh when triggered externally (e.g., by chatbot)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchQuotes(true)
    }
  }, [refreshTrigger])

  const fetchQuotes = async (silent = false) => {
    try {
      const response = await fetch('/api/admin/quotes')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchQuotes()
    setRefreshing(false)
  }

  const handleSendQuote = async (quoteId: string, email: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: email })
      })
      
      if (response.ok) {
        alert('Quote sent successfully!')
        await fetchQuotes()
      }
    } catch (error) {
      console.error('Error sending quote:', error)
    }
  }

  const formatCurrency = (min: string | number, max: string | number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    const minNum = typeof min === 'string' ? parseFloat(min) : min
    const maxNum = typeof max === 'string' ? parseFloat(max) : max
    return `${formatter.format(minNum)} - ${formatter.format(maxNum)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-500'
      case 'lost': return 'bg-red-500'
      case 'signed': return 'bg-green-500'
      case 'viewed': return 'bg-blue-500'
      case 'sent': return 'bg-yellow-500'
      case 'draft': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <Trophy className="h-4 w-4" />
      case 'lost': return <XCircle className="h-4 w-4" />
      case 'signed': return <CheckCircle className="h-4 w-4" />
      case 'viewed': return <Eye className="h-4 w-4" />
      case 'sent': return <Mail className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredQuotes = filter === 'all' 
    ? quotes 
    : quotes.filter(q => q.status === filter)

  // Calculate stats
  const stats = {
    total: quotes.length,
    totalValue: quotes.reduce((sum, q) => {
      const avg = (parseFloat(q.amountMin.toString()) + parseFloat(q.amountMax.toString())) / 2
      return sum + avg
    }, 0),
    won: quotes.filter(q => q.status === 'won').length,
    pending: quotes.filter(q => ['sent', 'viewed'].includes(q.status)).length,
    conversion: quotes.length > 0 
      ? Math.round((quotes.filter(q => q.status === 'won').length / quotes.length) * 100)
      : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show generator if active
  if (showGenerator) {
    return (
      <QuoteGenerator
        onBack={() => setShowGenerator(false)}
        onQuoteCreated={(quoteId) => {
          // Refresh quotes list and go back to list view
          fetchQuotes()
          setShowGenerator(false)
        }}
      />
    )
  }

  // Show viewer if viewing a quote
  if (viewingQuoteId) {
    return (
      <QuoteViewer
        quoteId={viewingQuoteId}
        onBack={() => setViewingQuoteId(null)}
        onUpdate={() => fetchQuotes()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">💰 Quotes</h2>
          <p className="text-white/70">Create and manage project quotes</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowGenerator(true)}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Quote
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">
                  ${stats.totalValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Won Deals</p>
                <p className="text-2xl font-bold text-green-500">{stats.won}</p>
              </div>
              <Trophy className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversion}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={stats.conversion} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'draft', 'sent', 'viewed', 'signed', 'won', 'lost'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className="whitespace-nowrap"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {quotes.filter(q => q.status === status).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'No quotes yet. Create your first quote to get started.'
                : `No ${filter} quotes found.`}
            </p>
            <Button 
              onClick={() => setShowGenerator(true)}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Quote
            </Button>
          </Card>
        ) : (
          filteredQuotes.map((quote) => (
            <motion.div
              key={quote.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{quote.projectName}</h3>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(quote.status)} bg-opacity-10 border-opacity-50`}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(quote.status)}
                            {quote.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Client</p>
                          <p className="font-medium">{quote.clientName}</p>
                          <p className="text-xs text-muted-foreground">{quote.clientEmail}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium text-lg">
                            {formatCurrency(quote.amountMin, quote.amountMax)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                          </p>
                          {quote.viewCount !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              <Eye className="h-3 w-3 inline mr-1" />
                              {quote.viewCount} views
                            </p>
                          )}
                        </div>
                      </div>
                      {quote.signature && (
                        <div className="mt-3 p-2 bg-green-500/10 rounded-lg">
                          <p className="text-xs text-green-500">
                            ✅ Signed by {quote.signature.signerName} on {' '}
                            {format(new Date(quote.signature.signedAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setViewingQuoteId(quote.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {(quote.status === 'draft' || quote.status === 'sent' || quote.status === 'viewed') && (
                        <Button 
                          size="sm"
                          onClick={() => handleSendQuote(quote.id, quote.clientEmail)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {quote.status === 'draft' ? 'Send' : 'Resend'}
                        </Button>
                      )}
                      {quote.status === 'signed' && (
                        <Button 
                          size="sm"
                          variant="default"
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => {
                            // Convert to project
                            if (onNavigate) {
                              onNavigate('projects', { 
                                action: 'create-from-quote',
                                quote: quote 
                              })
                            }
                          }}
                        >
                          <ChevronRight className="h-4 w-4 mr-1" />
                          Convert
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}