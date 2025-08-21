// Simple Quote View Tracking
// This logs views to console/server logs for now

const fs = require('fs');
const path = require('path');

// Simple file-based tracking for immediate use
const trackingFile = path.join(__dirname, '../quote-views.json');

function loadTracking() {
  try {
    if (fs.existsSync(trackingFile)) {
      return JSON.parse(fs.readFileSync(trackingFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading tracking data:', error);
  }
  return { views: [], summary: {} };
}

function saveTracking(data) {
  try {
    fs.writeFileSync(trackingFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving tracking data:', error);
  }
}

function trackView(quoteId, metadata = {}) {
  const tracking = loadTracking();
  
  const view = {
    quoteId,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  tracking.views.push(view);
  
  // Update summary
  if (!tracking.summary[quoteId]) {
    tracking.summary[quoteId] = {
      totalViews: 0,
      firstView: view.timestamp,
      lastView: view.timestamp,
      uniqueIPs: new Set()
    };
  }
  
  tracking.summary[quoteId].totalViews++;
  tracking.summary[quoteId].lastView = view.timestamp;
  if (metadata.ip) {
    tracking.summary[quoteId].uniqueIPs.add(metadata.ip);
  }
  
  saveTracking(tracking);
  
  console.log(`📊 Quote View Tracked: ${quoteId} at ${view.timestamp}`);
  return view;
}

function getAnalytics(quoteId) {
  const tracking = loadTracking();
  const summary = tracking.summary[quoteId];
  
  if (!summary) {
    return {
      quoteId,
      totalViews: 0,
      uniqueVisitors: 0,
      message: 'No views yet'
    };
  }
  
  return {
    quoteId,
    totalViews: summary.totalViews,
    uniqueVisitors: summary.uniqueIPs?.size || 0,
    firstView: summary.firstView,
    lastView: summary.lastView,
    recentViews: tracking.views
      .filter(v => v.quoteId === quoteId)
      .slice(-10)
      .reverse()
  };
}

// Example usage
if (require.main === module) {
  console.log('\n📊 QUOTE VIEW TRACKING SYSTEM');
  console.log('================================\n');
  
  // Show analytics for Toledo quote
  const analytics = getAnalytics('toledo-2025');
  
  console.log('Toledo Quote Analytics:');
  console.log('----------------------');
  console.log(`Total Views: ${analytics.totalViews}`);
  console.log(`Unique Visitors: ${analytics.uniqueVisitors}`);
  if (analytics.lastView) {
    console.log(`Last Viewed: ${new Date(analytics.lastView).toLocaleString()}`);
  }
  
  console.log('\n💡 HOW TO USE:');
  console.log('1. Check quote-views.json for tracking data');
  console.log('2. Server logs will show view events');
  console.log('3. Vercel dashboard shows access logs');
  console.log('\n📈 VERCEL ANALYTICS:');
  console.log('For production tracking, check:');
  console.log('https://vercel.com/[your-team]/aimpact-platform/analytics');
  console.log('\nVercel provides:');
  console.log('• Page views');
  console.log('• Unique visitors');
  console.log('• Geographic location');
  console.log('• Device types');
  console.log('• Referrer sources');
}

module.exports = { trackView, getAnalytics };