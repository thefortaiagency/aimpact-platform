'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface LineItem {
  description: string;
  amount: number;
  recurring: boolean;
  included?: boolean;
}

interface QuoteData {
  id: string;
  clientName: string;
  clientEmail: string;
  projectType: string;
  setupTotal: number;
  monthlyTotal: number;
  expiresAt: string;
  status: string;
  lineItems: LineItem[];
  description: string;
}

export default function PublicQuotePage() {
  const params = useParams();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuote();
  }, [params.id]);

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`);
      if (!response.ok) throw new Error('Quote not found');
      const data = await response.json();
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Quote not found or expired</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-xl p-8 border-b-4 border-purple-600">
          <div className="flex justify-between items-start mb-6">
            <div>
              <Image
                src="/aimpact-logo.png"
                alt="AImpact Nexus"
                width={150}
                height={50}
                className="mb-4"
              />
              <h1 className="text-3xl font-bold text-gray-900">Enterprise Production Analytics Platform</h1>
              <p className="text-gray-600 mt-2">Quote for {quote.clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Quote ID</p>
              <p className="font-mono text-sm">{quote.id}</p>
              <p className="text-sm text-gray-500 mt-2">Valid Until</p>
              <p className="font-semibold">{new Date(quote.expiresAt).toLocaleDateString()}</p>
            </div>
          </div>

          {quote.status === 'open' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="ml-3 text-green-800 font-medium">This quote is active and ready for acceptance</p>
            </div>
          )}
        </div>

        {/* Quote Details */}
        <div className="bg-white shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quote Details</h2>
          
          {/* Setup Fees */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Setup & Installation</h3>
            <div className="space-y-3">
              {quote.lineItems.filter(item => !item.recurring && !item.included).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">{item.description}</span>
                  <span className="font-semibold text-gray-900">${item.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-gray-900">Setup Total</span>
                <span className="font-bold text-xl text-gray-900">${quote.setupTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Monthly Subscriptions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Subscriptions</h3>
            <div className="space-y-3">
              {quote.lineItems.filter(item => item.recurring && !item.included).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">{item.description}</span>
                  <span className="font-semibold text-gray-900">${item.amount.toLocaleString()}/month</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-gray-900">Monthly Total</span>
                <span className="font-bold text-xl text-gray-900">${quote.monthlyTotal.toLocaleString()}/month</span>
              </div>
            </div>
          </div>

          {/* Included Services */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Included Services</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {quote.lineItems.filter(item => item.included).map((item, idx) => (
                <div key={idx} className="flex items-center py-2">
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{item.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Structure Note */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">📊 Pricing Structure</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• 1 Location: $2,500/month</li>
              <li>• 2 Locations: $2,250/month per location</li>
              <li className="font-bold">• 3 Locations: $2,000/month per location (YOUR RATE)</li>
            </ul>
            <p className="mt-3 text-blue-700">You're receiving our best 3-location bundle pricing!</p>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-r from-gray-400 to-gray-700 text-white rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">Financial Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-100">One-Time Setup</p>
                <p className="text-2xl font-bold">${quote.setupTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-100">Monthly Recurring</p>
                <p className="text-2xl font-bold">${quote.monthlyTotal.toLocaleString()}/mo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-b-2xl shadow-xl p-8 border-t">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ready to Get Started?</h3>
            <div className="space-y-4">
              <div className="flex flex-col space-y-3">
                <h4 className="font-semibold text-gray-800">Choose Payment Option:</h4>
                <a
                  href="https://buy.stripe.com/fZu6oJ7WMdjW4Al6vWasg05"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all text-center"
                >
                  Pay 50% Deposit ($26,250)
                  <span className="block text-sm font-normal mt-1">Recommended - Balance due on go-live</span>
                </a>
                <a
                  href="https://buy.stripe.com/dRmfZj7WMeo05Ep07yasg06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all text-center"
                >
                  Pay Full Amount ($52,500)
                  <span className="block text-sm font-normal mt-1">Single payment - No balance due</span>
                </a>
              </div>
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <p className="mx-4 text-gray-600">or</p>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all w-full"
              >
                Print Quote
              </button>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Payment Information:</strong><br/>
                  • Both options accept card or ACH bank transfer<br/>
                  • No login or account required<br/>
                  • ACH recommended for lower fees (0.8% vs 2.9%)<br/>
                  • Monthly subscription ($6,000/mo) starts after go-live<br/>
                  • If 50% deposit chosen, balance link sent at completion
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Questions? Contact us at support@aimpactnexus.ai
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}