import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Initialize OpenAI (if available)
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  const { OpenAI } = require('openai');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// Google Search API functions
async function searchGoogle(query: string, num: number = 5): Promise<any[]> {
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
    console.warn('Google API not configured');
    return [];
  }

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', process.env.GOOGLE_API_KEY);
    url.searchParams.append('cx', process.env.GOOGLE_SEARCH_ENGINE_ID);
    url.searchParams.append('q', query);
    url.searchParams.append('num', num.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('Google Search API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Google Search error:', error);
    return [];
  }
}

// Find competitors using Google Search
async function findCompetitors(companyName: string, domain: string): Promise<string[]> {
  const competitors = new Set<string>();
  
  // Search for competitors
  const competitorQueries = [
    `"${companyName}" competitors`,
    `"${companyName}" vs`,
    `alternatives to "${companyName}"`,
    `"${companyName}" industry competitors`
  ];

  for (const query of competitorQueries.slice(0, 2)) { // Limit to avoid rate limits
    const results = await searchGoogle(query, 3);
    
    results.forEach(result => {
      // Extract potential competitor names from titles and snippets
      const text = `${result.title} ${result.snippet}`.toLowerCase();
      
      // Look for patterns like "vs", "alternative", "competitor"
      const vsMatches = text.match(/(?:vs|versus|compared to|alternative to)\s+([a-z0-9\s]+)/gi);
      if (vsMatches) {
        vsMatches.forEach(match => {
          const competitor = match.replace(/^(vs|versus|compared to|alternative to)\s+/i, '').trim();
          if (competitor && competitor !== companyName.toLowerCase()) {
            competitors.add(competitor);
          }
        });
      }
    });
  }

  return Array.from(competitors).slice(0, 5);
}

// Get recent news and mentions
async function getRecentNews(companyName: string, domain: string): Promise<any[]> {
  const newsQuery = `"${companyName}" OR site:${domain} news OR announcement OR update`;
  const results = await searchGoogle(newsQuery, 5);
  
  return results.map(result => ({
    title: result.title,
    snippet: result.snippet,
    link: result.link,
    date: result.pagemap?.metatags?.[0]?.['article:published_time'] || null
  }));
}

// Get online reviews and ratings
async function getOnlinePresence(companyName: string, domain: string): Promise<any> {
  const presence = {
    googleResults: 0,
    reviews: [],
    socialProfiles: [],
    directories: []
  };

  // Search for the company
  const brandResults = await searchGoogle(`"${companyName}"`, 10);
  presence.googleResults = brandResults.length;

  // Analyze results for reviews and profiles
  brandResults.forEach(result => {
    const link = result.link.toLowerCase();
    const title = result.title.toLowerCase();
    
    // Check for review sites
    if (link.includes('yelp.com') || link.includes('google.com/maps') || 
        link.includes('trustpilot') || link.includes('bbb.org')) {
      presence.reviews.push({
        platform: extractPlatformName(link),
        url: result.link,
        snippet: result.snippet
      });
    }
    
    // Check for social profiles
    if (link.includes('facebook.com') || link.includes('linkedin.com') || 
        link.includes('twitter.com') || link.includes('instagram.com')) {
      presence.socialProfiles.push({
        platform: extractPlatformName(link),
        url: result.link
      });
    }
    
    // Check for business directories
    if (link.includes('yellowpages') || link.includes('whitepages') || 
        link.includes('manta.com') || link.includes('dnb.com')) {
      presence.directories.push({
        platform: extractPlatformName(link),
        url: result.link
      });
    }
  });

  return presence;
}

function extractPlatformName(url: string): string {
  const domains = {
    'yelp.com': 'Yelp',
    'google.com': 'Google',
    'trustpilot': 'Trustpilot',
    'bbb.org': 'Better Business Bureau',
    'facebook.com': 'Facebook',
    'linkedin.com': 'LinkedIn',
    'twitter.com': 'Twitter',
    'instagram.com': 'Instagram',
    'yellowpages': 'Yellow Pages',
    'manta.com': 'Manta',
    'dnb.com': 'Dun & Bradstreet'
  };
  
  for (const [domain, name] of Object.entries(domains)) {
    if (url.includes(domain)) return name;
  }
  
  return 'Other';
}

interface DeepClientIntelligence {
  company: {
    name: string;
    domain: string;
    industry: string;
    description: string;
    logo?: string;
    founded?: string;
    size?: string;
    revenue?: string;
    location?: string;
    headquarters?: string;
  };
  contact: {
    phones: string[];
    emails: string[];
    addresses: string[];
    hours?: string;
    socialMedia: {
      facebook?: string;
      twitter?: string;
      linkedin?: string;
      instagram?: string;
      youtube?: string;
      tiktok?: string;
    };
  };
  technology: {
    cms?: string;
    frameworks: string[];
    analytics: string[];
    marketing: string[];
    ecommerce?: string;
    hosting?: string;
    ssl: boolean;
    mobile: boolean;
    performance: {
      loadTime?: number;
      pageSize?: number;
      requests?: number;
    };
  };
  market: {
    competitors: string[];
    industryTrends: string[];
    marketPosition?: string;
    targetAudience?: string;
    uniqueValueProp?: string;
    recentNews?: any[];
  };
  onlinePresence?: {
    googleResults: number;
    reviews: any[];
    socialProfiles: any[];
    directories: any[];
  };
  opportunities: {
    technical: string[];
    marketing: string[];
    content: string[];
    conversion: string[];
    aiAutomation: string[];
  };
  scoring: {
    leadScore: number;
    techReadiness: number;
    aiPotential: number;
    urgency: number;
    budget: string;
    onlinePresenceScore?: number;
  };
  insights: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    estimatedValue: string;
  };
}

// Analyze website technology stack
async function analyzeTechnology(html: string, $: cheerio.CheerioAPI): Promise<any> {
  const tech: any = {
    frameworks: [],
    analytics: [],
    marketing: [],
    ssl: false,
    mobile: false
  };

  // Check for common frameworks
  if (html.includes('wp-content') || html.includes('WordPress')) tech.cms = 'WordPress';
  if (html.includes('Shopify')) tech.ecommerce = 'Shopify';
  if (html.includes('wix.com')) tech.cms = 'Wix';
  if (html.includes('squarespace')) tech.cms = 'Squarespace';
  
  // Check for React/Next.js
  if (html.includes('__NEXT_DATA__')) tech.frameworks.push('Next.js');
  if (html.includes('react')) tech.frameworks.push('React');
  if (html.includes('vue')) tech.frameworks.push('Vue');
  if (html.includes('angular')) tech.frameworks.push('Angular');
  
  // Check for analytics
  if (html.includes('google-analytics') || html.includes('gtag')) tech.analytics.push('Google Analytics');
  if (html.includes('facebook.com/tr')) tech.analytics.push('Facebook Pixel');
  if (html.includes('hotjar')) tech.analytics.push('Hotjar');
  
  // Check mobile responsiveness
  const viewport = $('meta[name="viewport"]').attr('content');
  tech.mobile = !!viewport && viewport.includes('width=device-width');
  
  return tech;
}

// Extract contact information with deep individual contact discovery
async function extractContactInfo(html: string, $: cheerio.CheerioAPI, domain: string): Promise<any> {
  const contact: any = {
    phones: [],
    emails: [],
    addresses: [],
    socialMedia: {},
    individuals: []
  };
  
  // Extract phone numbers
  const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = html.match(phoneRegex) || [];
  contact.phones = [...new Set(phones)];
  
  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex) || [];
  contact.emails = [...new Set(emails.filter(e => !e.includes('.png') && !e.includes('.jpg')))];
  
  // Extract social media links
  $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="youtube.com"], a[href*="tiktok.com"]').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      if (href.includes('facebook.com')) contact.socialMedia.facebook = href;
      if (href.includes('twitter.com')) contact.socialMedia.twitter = href;
      if (href.includes('linkedin.com')) contact.socialMedia.linkedin = href;
      if (href.includes('instagram.com')) contact.socialMedia.instagram = href;
      if (href.includes('youtube.com')) contact.socialMedia.youtube = href;
      if (href.includes('tiktok.com')) contact.socialMedia.tiktok = href;
    }
  });
  
  return contact;
}

// Find individual contacts by crawling team/about pages
async function findIndividualContacts(baseUrl: string, $: cheerio.CheerioAPI, domain: string): Promise<any[]> {
  const individuals: any[] = [];
  const processedNames = new Set<string>();
  
  // Look for team/about/contact/staff links - expanded search
  const teamLinks: string[] = [];
  const teamPatterns = [
    'about', 'team', 'staff', 'leadership', 'contact', 'people', 'our-team',
    'management', 'executives', 'board', 'directors', 'employees', 'who-we-are',
    'meet-the-team', 'our-people', 'company', 'personnel', 'crew', 'experts',
    'expertise', 'specialists', 'professionals', 'members'
  ];
  
  $('a').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      const lowerHref = href.toLowerCase();
      for (const pattern of teamPatterns) {
        if (lowerHref.includes(pattern)) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
          if (fullUrl.includes(domain) && !teamLinks.includes(fullUrl)) {
            teamLinks.push(fullUrl);
            break;
          }
        }
      }
    }
  });
  
  console.log(`Found ${teamLinks.length} potential team pages for ${domain}:`, teamLinks.slice(0, 5));
  
  // Extract names and titles from current page with enhanced patterns
  const namePatterns = [
    // Look for common name patterns with titles
    /(?:CEO|CTO|CFO|COO|President|Director|Manager|VP|Vice President|Founder|Owner|Sales|Marketing|Head of)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    // Names in specific contexts
    /(?:Contact|Email|Call|Reach out to)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    // Names with comma-separated titles
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s*(?:CEO|President|Director|Manager|VP)/g,
    // Names in quotes or special formatting
    /"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)"/g,
  ];
  
  const titlePatterns = [
    'CEO', 'Chief Executive Officer',
    'CTO', 'Chief Technology Officer',
    'CFO', 'Chief Financial Officer',
    'COO', 'Chief Operating Officer',
    'President', 'Vice President', 'VP',
    'Director', 'Manager',
    'Head of', 'Lead',
    'Founder', 'Co-Founder',
    'Owner', 'Partner',
    'Sales', 'Marketing', 'Operations', 'Engineering'
  ];
  
  // Search for individual contacts in text
  const bodyText = $('body').text();
  
  // Look for LinkedIn profiles which often have names
  $('a[href*="linkedin.com/in/"]').each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();
    const parentText = $(elem).parent().text();
    
    if (href && text && text.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/)) {
      const name = text;
      if (!processedNames.has(name)) {
        processedNames.add(name);
        
        // Try to find title nearby
        let title = '';
        titlePatterns.forEach(pattern => {
          if (parentText.toLowerCase().includes(pattern.toLowerCase())) {
            title = pattern;
          }
        });
        
        // Generate potential email addresses
        const nameParts = name.toLowerCase().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        
        individuals.push({
          name,
          title: title || 'Team Member',
          linkedIn: href,
          potentialEmails: [
            `${firstName}@${domain}`,
            `${firstName}.${lastName}@${domain}`,
            `${firstName}${lastName}@${domain}`,
            `${firstName[0]}${lastName}@${domain}`,
            `${firstName}${lastName[0]}@${domain}`
          ]
        });
      }
    }
  });
  
  // Crawl team pages for more contacts (limit to 5 pages, prioritize likely team pages)
  const prioritizedLinks = teamLinks.sort((a, b) => {
    // Prioritize URLs with team-related keywords
    const aScore = (a.includes('expert') ? 10 : 0) + (a.includes('team') ? 8 : 0) + 
                   (a.includes('staff') ? 6 : 0) + (a.includes('about') ? 4 : 0);
    const bScore = (b.includes('expert') ? 10 : 0) + (b.includes('team') ? 8 : 0) + 
                   (b.includes('staff') ? 6 : 0) + (b.includes('about') ? 4 : 0);
    return bScore - aScore;
  });
  
  for (const teamUrl of prioritizedLinks.slice(0, 5)) {
    try {
      console.log(`Fetching team page: ${teamUrl}`);
      const response = await fetch(teamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AImpact-Bot/1.0; +https://aimpactnexus.ai/bot)'
        }
      });
      
      if (response.ok) {
        const teamHtml = await response.text();
        const $team = cheerio.load(teamHtml);
        console.log(`Successfully fetched ${teamUrl}, HTML length: ${teamHtml.length}`);
        
        // First try specific patterns for TJ Nowak style pages
        // Look for name as h2/h3 followed by title text
        $team('article, .entry-content, .page-content, main').find('h2, h3, h4, strong').each((_, elem) => {
          const $elem = $team(elem);
          const text = $elem.text().trim();
          const nextText = $elem.next().text() || $elem.parent().text();
          
          // Check if this looks like a person's name (2-3 words, proper case)
          // Exclude common non-name phrases
          const excludedPhrases = ['Meet Mike', 'Meet Joseph', 'Meet Amy', 'Give Us', 'Unsupported Browser', 
                                  'Learn More', 'Contact Us', 'About Us', 'Our Team', 'View All'];
          
          if (text.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/) && 
              !excludedPhrases.some(phrase => text.includes(phrase))) {
            const name = text;
            // Additional validation: name should be 2-4 words and not contain common website words
            const words = name.split(' ');
            if (words.length >= 2 && words.length <= 4 && 
                !name.toLowerCase().includes('click') && 
                !name.toLowerCase().includes('view') &&
                !name.toLowerCase().includes('download') &&
                !processedNames.has(name)) {
              processedNames.add(name);
              
              // Look for title in nearby text
              let title = '';
              const titleMatch = nextText.match(/(CEO|President|Chief|Director|Manager|VP|Officer|Specialist|Controller|Owner)/i);
              if (titleMatch) {
                // Extract full title around the keyword
                const fullTitleMatch = nextText.match(/([^.]*(?:CEO|President|Chief|Director|Manager|VP|Officer|Specialist|Controller|Owner)[^.]*)/i);
                title = fullTitleMatch ? fullTitleMatch[1].trim() : titleMatch[1];
              }
              
              const nameParts = name.toLowerCase().split(' ');
              const firstName = nameParts[0];
              const lastName = nameParts[nameParts.length - 1];
              
              individuals.push({
                name,
                title: title || 'Team Member',
                source: 'Website',
                potentialEmails: [
                  `${firstName}@${domain}`,
                  `${firstName}.${lastName}@${domain}`,
                  `${firstName}${lastName}@${domain}`,
                  `${firstName[0]}${lastName}@${domain}`,
                ]
              });
              
              console.log(`Found team member: ${name} - ${title}`);
            }
          }
        });
        
        // Also look for team member sections with expanded patterns
        $team('.team-member, .staff-member, .expert, .member, [class*="team"], [class*="staff"], [class*="person"], [class*="expert"]').each((_, elem) => {
          const memberText = $team(elem).text();
          const memberHtml = $team(elem).html() || '';
          
          // Extract name - multiple patterns
          const namePatterns = [
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,  // Standard name
            /^([A-Z][a-z]+\s+[A-Z][a-z]+)/,      // Name at start
            /([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)/, // Name with middle initial
          ];
          
          let name = null;
          for (const pattern of namePatterns) {
            const match = memberText.match(pattern);
            if (match) {
              name = match[1].trim();
              break;
            }
          }
          
          if (name && !processedNames.has(name) && name.split(' ').length >= 2) {
            processedNames.add(name);
            
            // Extract title
            let title = '';
            titlePatterns.forEach(pattern => {
              if (memberText.toLowerCase().includes(pattern.toLowerCase())) {
                title = pattern;
              }
            });
            
            // Extract email if present
            const emailMatch = memberHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            
            // Generate potential emails
            const nameParts = name.toLowerCase().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            
            individuals.push({
              name,
              title: title || 'Team Member',
              email: emailMatch ? emailMatch[0] : null,
              potentialEmails: emailMatch ? [emailMatch[0]] : [
                `${firstName}@${domain}`,
                `${firstName}.${lastName}@${domain}`,
                `${firstName}${lastName}@${domain}`,
                `${firstName[0]}${lastName}@${domain}`,
                `${firstName}${lastName[0]}@${domain}`
              ]
            });
          }
        });
      }
    } catch (error) {
      console.log('Could not fetch team page:', teamUrl);
    }
  }
  
  // If we didn't find many contacts on the website, try Google for leadership info
  if (individuals.length < 2 && process.env.GOOGLE_API_KEY) {
    try {
      // Search for company leadership
      const companyName = domain.replace('.com', '').replace('.net', '').replace('.org', '');
      const leadershipResults = await searchGoogle(`"${companyName}" CEO OR President OR Owner site:linkedin.com`, 3);
      
      leadershipResults.forEach(result => {
        // Extract names from LinkedIn titles
        const titleMatch = result.title.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[-–]\s*(CEO|President|Owner|Director|Manager|VP)/);
        if (titleMatch && !processedNames.has(titleMatch[1])) {
          processedNames.add(titleMatch[1]);
          
          const nameParts = titleMatch[1].toLowerCase().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          
          individuals.push({
            name: titleMatch[1],
            title: titleMatch[2],
            source: 'LinkedIn Search',
            linkedIn: result.link,
            potentialEmails: [
              `${firstName}@${domain}`,
              `${firstName}.${lastName}@${domain}`,
              `${firstName}${lastName}@${domain}`,
              `${firstName[0]}${lastName}@${domain}`,
            ]
          });
        }
      });
    } catch (error) {
      console.log('Could not search for additional contacts:', error);
    }
  }
  
  return individuals;
}

// Analyze market position and opportunities
async function analyzeMarketPosition(domain: string, content: string, openai: any): Promise<any> {
  const market: any = {
    competitors: [],
    industryTrends: [],
    opportunities: {
      technical: [],
      marketing: [],
      content: [],
      conversion: [],
      aiAutomation: []
    }
  };
  
  // Basic opportunity detection
  if (!content.includes('chatbot') && !content.includes('chat')) {
    market.opportunities.aiAutomation.push('AI Chatbot for 24/7 customer support');
  }
  
  if (!content.includes('appointment') && !content.includes('booking')) {
    market.opportunities.conversion.push('Online appointment booking system');
  }
  
  if (!content.includes('testimonial') && !content.includes('review')) {
    market.opportunities.content.push('Customer testimonials section');
  }
  
  if (!content.includes('blog') && !content.includes('article')) {
    market.opportunities.marketing.push('Content marketing blog');
  }
  
  // Use AI for deeper analysis if available
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst identifying opportunities for AI automation and digital transformation.'
          },
          {
            role: 'user',
            content: `Analyze this website content and identify:
              1. Top 3 AI automation opportunities
              2. Main competitors they might have
              3. Industry trends affecting them
              4. Target audience
              
              Website: ${domain}
              Content snippet: ${content.substring(0, 2000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const analysis = completion.choices[0].message.content;
      // Parse AI response and add to market data
      if (analysis) {
        market.aiAnalysis = analysis;
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    }
  }
  
  return market;
}

// Calculate lead scoring
function calculateScoring(tech: any, contact: any, market: any): any {
  const scoring: any = {
    leadScore: 50,
    techReadiness: 50,
    aiPotential: 50,
    urgency: 50,
    budget: 'Unknown'
  };
  
  // Tech readiness scoring
  if (tech.ssl) scoring.techReadiness += 10;
  if (tech.mobile) scoring.techReadiness += 10;
  if (tech.analytics.length > 0) scoring.techReadiness += 15;
  if (tech.frameworks.length > 0) scoring.techReadiness += 15;
  
  // AI potential scoring
  const aiOpportunities = market.opportunities.aiAutomation.length;
  scoring.aiPotential = Math.min(100, 50 + (aiOpportunities * 15));
  
  // Lead score calculation
  if (contact.emails.length > 0) scoring.leadScore += 20;
  if (contact.phones.length > 0) scoring.leadScore += 15;
  if (Object.keys(contact.socialMedia).length > 2) scoring.leadScore += 15;
  
  // Budget estimation based on tech stack
  if (tech.ecommerce) scoring.budget = 'High';
  else if (tech.cms === 'WordPress') scoring.budget = 'Medium';
  else if (tech.cms === 'Wix' || tech.cms === 'Squarespace') scoring.budget = 'Low-Medium';
  
  return scoring;
}

export async function POST(request: NextRequest) {
  try {
    const { url, companyName, saveTocrm = false } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Normalize URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }
    
    // Fetch website content
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AImpact-Bot/1.0; +https://aimpactnexus.ai/bot)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract domain
    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Initialize OpenAI if available
    const openai = getOpenAIClient();
    
    // Extract company name from title if not provided
    let extractedName = companyName || $('title').text().split('-')[0].trim() || domain;
    
    // Don't use generic titles as company names
    if (extractedName.toLowerCase() === 'home' || extractedName.toLowerCase() === 'welcome') {
      // Try to extract from domain
      extractedName = domain.replace('.com', '').replace('.net', '').replace('.org', '')
        .split('.')[0] // Get subdomain if exists
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .replace(/([A-Z])/g, ' $1') // Add space before capitals
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
      
      // Special case for known domains
      if (domain.includes('tjnowak')) {
        extractedName = 'TJ Nowak Supply';
      }
    }
    
    // Perform deep analysis
    const tech = await analyzeTechnology(html, $);
    const contact = await extractContactInfo(html, $, domain);
    const market = await analyzeMarketPosition(domain, html, openai);
    
    // Find individual contacts
    const individuals = await findIndividualContacts(targetUrl, $, domain);
    contact.individuals = individuals;
    
    // Perform Google Search analysis
    const competitors = await findCompetitors(extractedName, domain);
    const recentNews = await getRecentNews(extractedName, domain);
    const onlinePresence = await getOnlinePresence(extractedName, domain);
    
    // Enhanced market data with Google results
    market.competitors = competitors;
    market.recentNews = recentNews;
    
    // Calculate scoring with online presence
    const scoring = calculateScoring(tech, contact, market);
    
    // Add online presence score
    scoring.onlinePresenceScore = Math.min(100, 
      (onlinePresence.googleResults * 5) + 
      (onlinePresence.reviews.length * 15) + 
      (onlinePresence.socialProfiles.length * 10) +
      (onlinePresence.directories.length * 5)
    );
    
    // Build company profile
    const intelligence: DeepClientIntelligence = {
      company: {
        name: extractedName,
        domain,
        industry: market.industry || 'Unknown',
        description: $('meta[name="description"]').attr('content') || '',
        logo: $('link[rel="icon"]').attr('href') || $('img[alt*="logo" i]').first().attr('src'),
        location: contact.addresses[0] || 'Unknown'
      },
      contact,
      technology: tech,
      market,
      onlinePresence,
      opportunities: market.opportunities,
      scoring,
      insights: {
        summary: `${extractedName} shows ${scoring.techReadiness > 70 ? 'strong' : scoring.techReadiness > 50 ? 'moderate' : 'limited'} technical readiness with ${scoring.aiPotential > 70 ? 'high' : scoring.aiPotential > 50 ? 'good' : 'significant'} AI automation potential. Online presence score: ${scoring.onlinePresenceScore}/100.`,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        estimatedValue: scoring.budget === 'High' ? '$50K-200K' : scoring.budget === 'Medium' ? '$20K-50K' : '$5K-20K'
      }
    };
    
    // Generate insights
    if (tech.ssl) intelligence.insights.strengths.push('SSL certificate installed');
    if (tech.mobile) intelligence.insights.strengths.push('Mobile responsive design');
    if (tech.analytics.length > 0) intelligence.insights.strengths.push('Analytics tracking in place');
    if (onlinePresence.googleResults > 5) intelligence.insights.strengths.push(`Strong online presence (${onlinePresence.googleResults} Google results)`);
    if (onlinePresence.reviews.length > 0) intelligence.insights.strengths.push(`Customer reviews on ${onlinePresence.reviews.length} platform(s)`);
    if (competitors.length > 0) intelligence.insights.strengths.push(`${competitors.length} competitors identified for competitive analysis`);
    
    if (!tech.ssl) intelligence.insights.weaknesses.push('No SSL certificate');
    if (!tech.mobile) intelligence.insights.weaknesses.push('Not mobile optimized');
    if (contact.emails.length === 0) intelligence.insights.weaknesses.push('No contact email found');
    if (onlinePresence.googleResults < 3) intelligence.insights.weaknesses.push('Limited online visibility');
    if (onlinePresence.reviews.length === 0) intelligence.insights.weaknesses.push('No online reviews found');
    
    // Add recommendations
    market.opportunities.aiAutomation.forEach(opp => {
      intelligence.insights.recommendations.push(opp);
    });
    
    // Save to CRM if requested
    if (saveTocrm) {
      const supabase = getSupabaseClient();
      
      // Create or update organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .upsert({
          name: intelligence.company.name,
          domain: intelligence.company.domain,
          industry: intelligence.company.industry,
          website: targetUrl,
          description: intelligence.company.description,
          metadata: {
            technology: tech,
            scoring,
            lastAnalyzed: new Date().toISOString()
          }
        }, {
          onConflict: 'domain'
        })
        .select()
        .single();
      
      if (org && contact.emails.length > 0) {
        // Create contact for primary email
        await supabase
          .from('contacts')
          .upsert({
            email: contact.emails[0],
            first_name: 'Primary',
            last_name: 'Contact',
            organization_id: org.id,
            phone: contact.phones[0] || null,
            metadata: {
              socialMedia: contact.socialMedia,
              discoveredVia: 'Client Intelligence Scan'
            }
          }, {
            onConflict: 'email'
          });
      }
      
      // Log activity
      await supabase
        .from('activities')
        .insert({
          type: 'intelligence_scan',
          description: `Deep analysis completed for ${intelligence.company.name}`,
          entity_type: 'organization',
          entity_id: org?.id,
          metadata: {
            url: targetUrl,
            leadScore: scoring.leadScore,
            aiPotential: scoring.aiPotential
          }
        });
    }
    
    return NextResponse.json({
      success: true,
      intelligence,
      message: saveTocrm ? 'Analysis complete and saved to CRM' : 'Analysis complete'
    });
    
  } catch (error) {
    console.error('Client intelligence error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze client', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}