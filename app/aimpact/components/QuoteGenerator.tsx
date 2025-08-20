'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, Eye, Save, Send, Loader2, CheckCircle,
  ChevronLeft, FileText, Download, Edit, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';

interface QuoteGeneratorProps {
  onBack?: () => void;
  onQuoteCreated?: (quoteId: string) => void;
  prefilledData?: {
    clientName?: string;
    clientEmail?: string;
    clientCompany?: string;
    projectDescription?: string;
    budget?: string;
    timeline?: string;
    additionalInfo?: string;
  };
}

export default function QuoteGenerator({ onBack, onQuoteCreated, prefilledData }: QuoteGeneratorProps) {
  const [formData, setFormData] = useState({
    clientName: prefilledData?.clientName || '',
    clientEmail: prefilledData?.clientEmail || '',
    clientCompany: prefilledData?.clientCompany || '',
    projectDescription: prefilledData?.projectDescription || '',
    budget: prefilledData?.budget || '',
    timeline: prefilledData?.timeline || '',
    additionalInfo: prefilledData?.additionalInfo || ''
  });
  
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'preview'>('preview');
  const [suggestedFeatures, setSuggestedFeatures] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Show notification if form was pre-filled
  useEffect(() => {
    if (prefilledData?.clientName) {
      // Small delay to show the prefilled animation
      setTimeout(() => {
        // Optional: Add any animation or notification here
      }, 100);
    }
  }, [prefilledData]);

  const handleGenerate = async () => {
    // Validate required fields
    if (!formData.clientName || !formData.clientEmail || !formData.projectDescription) {
      alert('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/quotes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          suggestedFeatures: selectedFeatures.length > 0 ? selectedFeatures : undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedHtml(data.html);
      } else {
        const errorData = await response.json();
        alert(`Failed to generate quote: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating quote:', error);
      alert('Failed to generate quote');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuote = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/quotes/save-generated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          generatedHtml
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedQuoteId(data.quoteId);
        setShowSuccess(true);
        
        // Notify parent component
        if (onQuoteCreated) {
          onQuoteCreated(data.quoteId);
        }
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        alert('Failed to save quote');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Failed to save quote');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!formData.projectDescription) {
      return;
    }

    try {
      const response = await fetch('/api/admin/quotes/suggest-features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDescription: formData.projectDescription,
          budget: formData.budget,
          industry: formData.clientCompany
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedFeatures(data.features);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              AI Quote Generator
            </h2>
            <p className="text-sm text-muted-foreground">
              Create professional quotes with AI assistance
            </p>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      <AnimatePresence>
        {showSuccess && savedQuoteId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert className="bg-green-500/10 border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Quote {savedQuoteId} created successfully!
                <div className="mt-2 flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`/quotes/${savedQuoteId}`, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Quote
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      // Reset form for new quote
                      setFormData({
                        clientName: '',
                        clientEmail: '',
                        clientCompany: '',
                        projectDescription: '',
                        budget: '',
                        timeline: '',
                        additionalInfo: ''
                      });
                      setGeneratedHtml('');
                      setSavedQuoteId(null);
                      setShowSuccess(false);
                      setSelectedFeatures([]);
                      setSuggestedFeatures([]);
                    }}
                  >
                    Create Another
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="john@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="clientCompany">Company</Label>
              <Input
                id="clientCompany"
                value={formData.clientCompany}
                onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <Label htmlFor="projectDescription">Project Description *</Label>
              <Textarea
                id="projectDescription"
                value={formData.projectDescription}
                onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                onBlur={handleGetSuggestions}
                rows={4}
                placeholder="Describe the project requirements..."
                required
              />
            </div>

            {/* AI Suggested Features */}
            {suggestedFeatures.length > 0 && (
              <div>
                <Label>AI Suggested Features</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestedFeatures.map((feature, index) => (
                    <Badge
                      key={index}
                      variant={selectedFeatures.includes(feature) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFeature(feature)}
                    >
                      {selectedFeatures.includes(feature) && <CheckCircle className="h-3 w-3 mr-1" />}
                      {feature}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Click features to include them in the quote
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget Range</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="$10,000 - $25,000"
                />
              </div>

              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  placeholder="4-6 weeks"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <Textarea
                id="additionalInfo"
                value={formData.additionalInfo}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                rows={3}
                placeholder="Any special requirements or notes..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || !formData.clientName || !formData.clientEmail || !formData.projectDescription}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Quote
                  </>
                )}
              </Button>

              {generatedHtml && (
                <Button 
                  onClick={handleSaveQuote}
                  disabled={isSaving}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Quote
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quote Preview</CardTitle>
              {generatedHtml && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={previewMode === 'preview' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('preview')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant={previewMode === 'html' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('html')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    HTML
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!generatedHtml ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Fill in the project details and click "Generate Quote" to see a preview</p>
              </div>
            ) : previewMode === 'preview' ? (
              <div className="relative">
                <iframe
                  srcDoc={generatedHtml}
                  className="w-full h-[600px] border-0"
                  title="Quote Preview"
                />
                {savedQuoteId && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Saved
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                <pre className="text-xs overflow-auto max-h-[600px] bg-muted p-4 rounded">
                  <code>{generatedHtml}</code>
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}