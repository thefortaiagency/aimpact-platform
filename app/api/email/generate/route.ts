import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/email/generate - Generate email content with AI
export async function POST(request: NextRequest) {
  try {
    // Allow internal API calls for chatbot integration
    // In production, implement proper service-to-service auth

    const body = await request.json();
    const { prompt, campaignName, targetAudience } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt required' },
        { status: 400 }
      );
    }

    // Create enhanced prompt for better email generation
    const enhancedPrompt = `Create a professional marketing email with the following requirements:

Campaign: ${campaignName || 'Marketing Campaign'}
Target Audience: ${targetAudience || 'General subscribers'}
Instructions: ${prompt}

Generate:
1. A compelling subject line (max 60 characters)
2. Preview text (max 140 characters) 
3. Complete HTML email with:
   - Professional header
   - Engaging body content
   - Clear call-to-action buttons
   - Footer with unsubscribe link
   - Mobile-responsive design
   
Use modern, clean HTML with inline CSS. Include placeholder variables like {{firstName}}, {{company}} for personalization.
Make the design professional and visually appealing with a primary color of #0066cc.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert email marketing copywriter and HTML designer. Create compelling, conversion-focused emails that follow best practices.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0].message.content;
    
    // Parse the AI response to extract components
    // In a real implementation, you'd parse this more robustly
    const subjectMatch = response?.match(/Subject Line?:?\s*(.+?)(?:\n|$)/i);
    const previewMatch = response?.match(/Preview Text?:?\s*(.+?)(?:\n|$)/i);
    
    // Extract HTML content (everything after the headers)
    const htmlStart = response?.search(/<(!DOCTYPE|html)/i) || 0;
    const htmlContent = response?.substring(htmlStart) || generateDefaultTemplate(prompt);

    return NextResponse.json({
      subject: subjectMatch?.[1]?.trim() || `${campaignName || 'Important Update'} - Don't Miss Out!`,
      previewText: previewMatch?.[1]?.trim() || 'You won\'t want to miss this exclusive offer...',
      html: htmlContent,
    });
  } catch (error) {
    console.error('Error generating email:', error);
    
    // Fallback to a simple template if AI fails
    const fallbackHtml = generateDefaultTemplate(request.body.prompt || '');
    
    return NextResponse.json({
      subject: 'Special Announcement',
      previewText: 'Important update for our valued subscribers',
      html: fallbackHtml,
    });
  }
}

function generateDefaultTemplate(prompt: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
    .content { padding: 40px 20px; }
    .content h2 { color: #333333; margin-top: 0; }
    .content p { color: #666666; line-height: 1.6; }
    .cta-button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #999999; }
    .footer a { color: #667eea; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px 15px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{companyName}}</h1>
    </div>
    <div class="content">
      <h2>Hello {{firstName}}!</h2>
      <p>${prompt || 'Thank you for being a valued subscriber. We have exciting news to share with you.'}</p>
      <p>We're thrilled to announce our latest updates and exclusive offers just for you. As a valued member of our community, you get first access to these amazing opportunities.</p>
      <center>
        <a href="{{ctaLink}}" class="cta-button">Learn More</a>
      </center>
      <p>Don't miss out on this limited-time opportunity. Click the button above to get started!</p>
      <p>Best regards,<br>The {{companyName}} Team</p>
    </div>
    <div class="footer">
      <p>© 2024 {{companyName}}. All rights reserved.</p>
      <p>{{companyAddress}}</p>
      <p>
        <a href="{{unsubscribeLink}}">Unsubscribe</a> | 
        <a href="{{preferencesLink}}">Update Preferences</a> | 
        <a href="{{viewOnlineLink}}">View Online</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}