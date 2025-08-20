import { NextRequest, NextResponse } from 'next/server';

// Puppeteer scraping endpoint that connects to webrtc.aimpactnexus.ai
const PUPPETEER_SERVER = 'http://webrtc.aimpactnexus.ai';
const API_KEY = 'ba3abe0c489cbd0b910359e9a75214be926c8e76e9181fdab851cf911939532d';

export async function POST(request: NextRequest) {
  try {
    const { url, selector, waitFor, screenshot } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Try to use the remote Puppeteer server first
    try {
      console.log('Attempting to use Puppeteer server at webrtc.aimpactnexus.ai...');
      
      // Check if the server has a Puppeteer endpoint
      const puppeteerResponse = await fetch(`${PUPPETEER_SERVER}/api/mcp/puppeteer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          action: 'scrape',
          url,
          selector: selector || 'body',
          waitFor: waitFor || 3000,
          screenshot: screenshot || false,
          options: {
            // Extract team members specifically
            extractTeamMembers: true,
            extractContacts: true,
            fullPageContent: true
          }
        })
      });

      if (puppeteerResponse.ok) {
        const data = await puppeteerResponse.json();
        console.log('Successfully scraped with Puppeteer server');
        return NextResponse.json({
          success: true,
          source: 'puppeteer-server',
          data
        });
      } else {
        console.log('Puppeteer server not available, status:', puppeteerResponse.status);
      }
    } catch (error) {
      console.log('Could not connect to Puppeteer server:', error);
    }

    // Fallback: Try N8N workflow for scraping
    try {
      console.log('Attempting N8N workflow for scraping...');
      
      const n8nResponse = await fetch(`${PUPPETEER_SERVER}/webhook/website-scraper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          extractTeamMembers: true,
          extractContacts: true
        })
      });

      if (n8nResponse.ok) {
        const data = await n8nResponse.json();
        console.log('Successfully scraped with N8N workflow');
        return NextResponse.json({
          success: true,
          source: 'n8n-workflow',
          data
        });
      }
    } catch (error) {
      console.log('N8N workflow not available:', error);
    }

    // Final fallback: Use basic fetch (already implemented in client-intelligence)
    return NextResponse.json({
      success: false,
      message: 'Puppeteer server not available. Use /api/aimpact/client-intelligence for basic scraping.',
      alternatives: [
        '/api/aimpact/client-intelligence - Current HTML scraper',
        'webrtc.aimpactnexus.ai/api/mcp/puppeteer - Not yet implemented',
        'webrtc.aimpactnexus.ai/webhook/website-scraper - N8N workflow (if configured)'
      ]
    });

  } catch (error) {
    console.error('Puppeteer scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape website', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET method to check server status
export async function GET() {
  try {
    // Check if Puppeteer server is available
    const healthCheck = await fetch(`${PUPPETEER_SERVER}/health`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });

    const isHealthy = healthCheck.ok;
    const healthData = isHealthy ? await healthCheck.json() : null;

    return NextResponse.json({
      status: 'ready',
      puppeteerServer: PUPPETEER_SERVER,
      serverHealthy: isHealthy,
      serverInfo: healthData,
      endpoints: {
        puppeteer: `${PUPPETEER_SERVER}/api/mcp/puppeteer (not yet implemented)`,
        n8n: `${PUPPETEER_SERVER}/webhook/website-scraper (requires N8N workflow)`,
        fallback: '/api/aimpact/client-intelligence'
      },
      message: 'Puppeteer scraping service with fallback to basic HTML scraping'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Could not check Puppeteer server status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}