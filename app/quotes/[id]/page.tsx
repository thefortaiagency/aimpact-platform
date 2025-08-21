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
    trackQuoteView();
  }, [params.id]);

  const trackQuoteView = async () => {
    try {
      // Track page view
      await fetch(`/api/quotes/${params.id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'page_view',
          metadata: {
            url: window.location.href,
            referrer: document.referrer,
            screenWidth: window.screen.width,
            timestamp: new Date().toISOString()
          }
        })
      });

      // Track when payment buttons are clicked
      window.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('a[href*="pay.aimpactnexus.ai"]')) {
          fetch(`/api/quotes/${params.id}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment_button_clicked',
              metadata: {
                buttonText: target.innerText,
                paymentUrl: (target.closest('a') as HTMLAnchorElement)?.href
              }
            })
          });
        }
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-6 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-xl p-4 sm:p-6 md:p-8 border-b-4 border-purple-600">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-6 space-y-4 sm:space-y-0">
            <div className="w-full sm:w-auto">
              <Image
                src="/aimpact-logo.png"
                alt="AImpact Nexus"
                width={150}
                height={50}
                className="mb-4"
              />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Enterprise Production Analytics Platform</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">Quote for {quote.clientName}</p>
            </div>
            <div className="w-full sm:w-auto text-left sm:text-right">
              <p className="text-xs sm:text-sm text-gray-500">Quote ID</p>
              <p className="font-mono text-xs sm:text-sm break-all">{quote.id}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Valid Until</p>
              <p className="text-sm sm:text-base font-semibold">{new Date(quote.expiresAt).toLocaleDateString()}</p>
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
        <div className="bg-white shadow-xl p-4 sm:p-6 md:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Quote Details</h2>
          
          {/* Setup Fees */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Setup & Installation</h3>
            <div className="space-y-2 sm:space-y-3">
              {quote.lineItems.filter(item => !item.recurring && !item.included).map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-100">
                  <span className="text-sm sm:text-base text-gray-700">{item.description}</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900 mt-1 sm:mt-0">${item.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm sm:text-base font-bold text-gray-900">Setup Total</span>
                <span className="text-lg sm:text-xl font-bold text-gray-900">${quote.setupTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Monthly Subscriptions */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Monthly Subscriptions</h3>
            <div className="space-y-2 sm:space-y-3">
              {quote.lineItems.filter(item => item.recurring && !item.included).map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-100">
                  <span className="text-sm sm:text-base text-gray-700">{item.description}</span>
                  <span className="text-sm sm:text-base font-semibold text-gray-900 mt-1 sm:mt-0">${item.amount.toLocaleString()}/month</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm sm:text-base font-bold text-gray-900">Monthly Total</span>
                <span className="text-lg sm:text-xl font-bold text-gray-900">${quote.monthlyTotal.toLocaleString()}/month</span>
              </div>
            </div>
          </div>

          {/* Included Services */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Included Services</h3>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quote.lineItems.filter(item => item.included).map((item, idx) => (
                  <div key={idx} className="flex items-start py-1 sm:py-2">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs sm:text-sm text-gray-700">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Structure Note */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2 sm:mb-3">📊 Pricing Structure</h3>
            <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-blue-800">
              <li>• 1 Location: $2,500/month</li>
              <li>• 2 Locations: $2,250/month per location</li>
              <li className="font-bold">• 3 Locations: $2,000/month per location (YOUR RATE)</li>
            </ul>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-blue-700">You're receiving our best 3-location bundle pricing!</p>
          </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-r from-gray-400 to-gray-700 text-white rounded-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Financial Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-gray-100 text-sm sm:text-base">One-Time Setup</p>
                <p className="text-xl sm:text-2xl font-bold">${quote.setupTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-100 text-sm sm:text-base">Monthly Recurring</p>
                <p className="text-xl sm:text-2xl font-bold">${quote.monthlyTotal.toLocaleString()}/mo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-b-2xl shadow-xl p-4 sm:p-6 md:p-8 border-t">
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Ready to Get Started?</h3>
            <div className="space-y-4">
              <div className="flex flex-col space-y-3">
                <h4 className="text-sm sm:text-base font-semibold text-gray-800">Choose Payment Option:</h4>
                <a
                  href="https://pay.aimpactnexus.ai/b/fZu6oJ7WMdjW4Al6vWasg05"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-green-600 to-green-700 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all text-center"
                >
                  <span className="text-base sm:text-lg">Pay 50% Deposit ($26,250)</span>
                  <span className="block text-xs sm:text-sm font-normal mt-1">Recommended - Balance due on go-live</span>
                </a>
                <a
                  href="https://pay.aimpactnexus.ai/b/dRmfZj7WMeo05Ep07yasg06"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all text-center"
                >
                  <span className="text-base sm:text-lg">Pay Full Amount ($52,500)</span>
                  <span className="block text-xs sm:text-sm font-normal mt-1">Single payment - No balance due</span>
                </a>
              </div>
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <p className="mx-4 text-gray-600">or</p>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-gray-200 text-gray-800 px-4 sm:px-6 md:px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all w-full"
              >
                Print Quote
              </button>
              <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong className="text-sm">Payment Information:</strong><br/>
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
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Product of <a href="https://aimpactnexus.ai" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-medium">AImpact Nexus</a>
                <span className="mx-2">•</span>
                Reseller: <a href="https://thefortaiagency.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium">The Fort AI Agency</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}