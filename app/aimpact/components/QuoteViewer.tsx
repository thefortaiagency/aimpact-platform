'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronLeft, FileText, Send, Download, CheckCircle, 
  Clock, Eye, X, ExternalLink, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface QuoteViewerProps {
  quoteId: string;
  onBack: () => void;
  onUpdate?: () => void;
}

interface Quote {
  id: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  projectName: string;
  amountMin: number;
  amountMax: number;
  status: string;
  validUntil?: string;
  createdAt: string;
  sentAt?: string | null;
  viewedAt?: string | null;
  signedAt?: string | null;
  viewCount?: number;
  metadata?: {
    generatedHtml?: string;
    [key: string]: any;
  };
  signature?: {
    signerName: string;
    signerEmail: string;
    signerTitle: string;
    signedAt: string;
  };
}

export default function QuoteViewer({ quoteId, onBack, onUpdate }: QuoteViewerProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (response.ok) {
        const data = await response.json();
        setQuote(data);
      } else {
        console.error('Failed to fetch quote');
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async () => {
    if (!quote) return;
    
    setSending(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: quote.clientEmail })
      });
      
      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        await fetchQuote(); // Refresh quote data
        if (onUpdate) onUpdate(); // Notify parent to refresh list
      } else {
        alert('Failed to send quote');
      }
    } catch (error) {
      console.error('Error sending quote:', error);
      alert('Failed to send quote');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = () => {
    if (!quote?.metadata?.generatedHtml) return;
    
    const blob = new Blob([quote.metadata.generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote-${quote.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (min: number, max: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-500';
      case 'lost': return 'bg-red-500';
      case 'signed': return 'bg-green-500';
      case 'viewed': return 'bg-blue-500';
      case 'sent': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won':
      case 'signed': return <CheckCircle className="h-4 w-4" />;
      case 'viewed': return <Eye className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Quote not found</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Quote {quote.id}</h2>
            <p className="text-sm text-muted-foreground">
              Created {format(new Date(quote.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="bg-green-500/10 border-green-500">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Quote sent successfully to {quote.clientEmail}!
          </AlertDescription>
        </Alert>
      )}

      {/* Quote Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{quote.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{quote.clientEmail}</p>
              </div>
              {quote.clientCompany && (
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{quote.clientCompany}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Project Name</p>
                <p className="font-medium">{quote.projectName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Range</p>
                <p className="font-medium text-lg">
                  {formatCurrency(quote.amountMin, quote.amountMax)}
                </p>
              </div>
              {quote.validUntil && (
                <div>
                  <p className="text-sm text-muted-foreground">Valid Until</p>
                  <p className="font-medium">
                    {format(new Date(quote.validUntil), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(quote.createdAt), 'MMM d, h:mm a')}</span>
              </div>
              {quote.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{format(new Date(quote.sentAt), 'MMM d, h:mm a')}</span>
                </div>
              )}
              {quote.viewedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First Viewed</span>
                  <span>{format(new Date(quote.viewedAt), 'MMM d, h:mm a')}</span>
                </div>
              )}
              {quote.viewCount !== undefined && quote.viewCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Views</span>
                  <span>{quote.viewCount}</span>
                </div>
              )}
              {quote.signature && (
                <div className="pt-2 border-t">
                  <p className="text-green-600 font-medium">✅ Signed</p>
                  <p className="text-xs mt-1">
                    by {quote.signature.signerName} ({quote.signature.signerTitle})
                  </p>
                  <p className="text-xs">
                    on {format(new Date(quote.signature.signedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            {(quote.status === 'draft' || quote.status === 'sent' || quote.status === 'viewed') && (
              <Button 
                onClick={handleSendQuote}
                disabled={sending}
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {quote.status === 'draft' ? 'Send Quote' : 'Resend Quote'}
                  </>
                )}
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={() => window.open(`/quotes/${quote.id}`, '_blank')}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Signing Page
            </Button>

            {quote.metadata?.generatedHtml && (
              <Button 
                variant="outline"
                onClick={handleDownload}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download HTML
              </Button>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quote Preview</CardTitle>
              {quote.metadata?.generatedHtml && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={viewMode === 'preview' ? 'default' : 'outline'}
                    onClick={() => setViewMode('preview')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'html' ? 'default' : 'outline'}
                    onClick={() => setViewMode('html')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    HTML
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {quote.metadata?.generatedHtml ? (
              viewMode === 'preview' ? (
                <iframe
                  srcDoc={quote.metadata.generatedHtml}
                  className="w-full h-[700px] border-0"
                  title="Quote Preview"
                />
              ) : (
                <div className="p-4 max-h-[700px] overflow-auto">
                  <pre className="text-xs bg-muted p-4 rounded">
                    <code>{quote.metadata.generatedHtml}</code>
                  </pre>
                </div>
              )
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No preview available for this quote</p>
                <p className="text-sm mt-2">This quote may have been created manually</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}