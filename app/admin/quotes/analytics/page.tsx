'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuoteAnalytics {
  quoteId: string;
  totalViews: number;
  uniqueVisitors: number;
  lastViewed: string;
  paymentClicks: number;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
  };
  recentViews: Array<{
    viewedAt: string;
    device: string;
    event: string;
  }>;
}

export default function QuoteAnalyticsPage() {
  const [analytics, setAnalytics] = useState<QuoteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/quotes/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Analytics</h1>
          <p className="text-gray-600">Toledo Tool & Die Quote Tracking</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Total Views</div>
            <div className="text-3xl font-bold text-gray-900">{analytics?.totalViews || 0}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Unique Visitors</div>
            <div className="text-3xl font-bold text-gray-900">{analytics?.uniqueVisitors || 0}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Payment Clicks</div>
            <div className="text-3xl font-bold text-green-600">{analytics?.paymentClicks || 0}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Last Viewed</div>
            <div className="text-lg font-semibold text-gray-900">
              {analytics?.lastViewed ? new Date(analytics.lastViewed).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Device Breakdown</h2>
          <div className="flex space-x-8">
            <div>
              <span className="text-gray-500">Desktop:</span>
              <span className="ml-2 font-bold">{analytics?.deviceBreakdown?.desktop || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Mobile:</span>
              <span className="ml-2 font-bold">{analytics?.deviceBreakdown?.mobile || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {analytics?.recentViews?.length ? (
              analytics.recentViews.map((view, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{view.event === 'payment_button_clicked' ? '💳 Payment Click' : '👁️ Page View'}</span>
                    <span className="ml-2 text-sm text-gray-500">from {view.device}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(view.viewedAt).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No views yet</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => router.push('/quotes/toledo-2025')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            View Quote
          </button>
          <button
            onClick={fetchAnalytics}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Refresh Analytics
          </button>
        </div>
      </div>
    </div>
  );
}