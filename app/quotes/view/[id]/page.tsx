'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, FileText, Calendar, DollarSign, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Quote {
  id: string
  clientName: string
  clientEmail: string
  projectName: string
  amountMin: number
  amountMax: number
  description: string
  scope: string
  deliverables: string
  timeline: string
  paymentTerms: string
  status: string
  createdAt: string
  validUntil: string
}

export default function PublicQuoteView() {
  const params = useParams()
  const quoteId = params.id as string
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signature, setSignature] = useState({
    name: '',
    email: '',
    title: ''
  })

  useEffect(() => {
    fetchQuote()
  }, [quoteId])

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/view`)
      if (response.ok) {
        const data = await response.json()
        setQuote(data)
        setSigned(data.status === 'signed')
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async () => {
    if (!signature.name || !signature.email || !signature.title) {
      alert('Please fill in all signature fields')
      return
    }

    setSigning(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          signature: {
            ...signature,
            ipAddress: 'client-ip',
            userAgent: navigator.userAgent
          }
        })
      })

      if (response.ok) {
        setSigned(true)
        alert('Quote signed successfully!')
      }
    } catch (error) {
      console.error('Error signing quote:', error)
      alert('Failed to sign quote')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-gray-600">This quote may have expired or been removed.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/aimpact-logo.png" 
            alt="AImpact Nexus" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold text-white mb-2">Project Quote</h1>
          {signed && (
            <div className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full">
              <CheckCircle className="h-5 w-5" />
              <span>Signed</span>
            </div>
          )}
        </div>

        {/* Quote Content */}
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-500 text-white">
            <CardTitle className="text-2xl">{quote.projectName}</CardTitle>
            <p className="text-white/90">For: {quote.clientName}</p>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Amount */}
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Project Investment</p>
              <p className="text-4xl font-bold text-purple-600">
                ${quote.amountMin.toLocaleString()} - ${quote.amountMax.toLocaleString()}
              </p>
            </div>

            {/* Description */}
            {quote.description && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Project Overview</h3>
                <p className="text-gray-700">{quote.description}</p>
              </div>
            )}

            {/* Scope */}
            {quote.scope && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Scope of Work</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.scope}</p>
                </div>
              </div>
            )}

            {/* Deliverables */}
            {quote.deliverables && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Deliverables</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.deliverables}</p>
                </div>
              </div>
            )}

            {/* Timeline & Terms */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Timeline
                </h3>
                <p className="text-gray-700">{quote.timeline || 'To be determined'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Payment Terms
                </h3>
                <p className="text-gray-700">{quote.paymentTerms || 'Net 30'}</p>
              </div>
            </div>

            {/* Signature Section */}
            {!signed ? (
              <div className="border-t pt-6 mt-8">
                <h3 className="font-semibold text-lg mb-4">Electronic Signature</h3>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800">
                    By signing below, you agree to the terms and conditions of this quote.
                  </p>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={signature.name}
                      onChange={(e) => setSignature({ ...signature, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={signature.email}
                      onChange={(e) => setSignature({ ...signature, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={signature.title}
                      onChange={(e) => setSignature({ ...signature, title: e.target.value })}
                      placeholder="CEO"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSign}
                  disabled={signing}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  size="lg"
                >
                  {signing ? 'Signing...' : 'Sign & Accept Quote'}
                </Button>
              </div>
            ) : (
              <div className="border-t pt-6 mt-8">
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Quote Signed Successfully</h3>
                  <p className="text-gray-600">
                    Thank you for accepting this quote. We'll be in touch shortly to begin the project.
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 pt-6 border-t">
              <p>Quote valid until: {quote.validUntil ? format(new Date(quote.validUntil), 'MMMM d, yyyy') : '30 days from creation'}</p>
              <p>Quote ID: {quote.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="text-center mt-8 text-white">
          <p>Questions? Contact us at support@aimpactnexus.ai</p>
          <p className="mt-2">© 2024 AImpact Nexus. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}