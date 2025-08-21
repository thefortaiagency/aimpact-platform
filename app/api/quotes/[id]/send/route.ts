import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientEmail } = await req.json();
    const quoteId = params.id;

    // Fetch quote details
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Generate quote viewing URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://impact.aimpactnexus.ai';
    const viewUrl = `${baseUrl}/quotes/view/${quoteId}`;

    // Email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .amount { font-size: 24px; color: #667eea; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Project Quote</h1>
              <p>AImpact Nexus</p>
            </div>
            <div class="content">
              <h2>Hello ${quote.client_name},</h2>
              <p>Thank you for your interest in our services. We're pleased to present you with a quote for:</p>
              
              <h3>${quote.project_name}</h3>
              <p class="amount">$${quote.amount_min.toLocaleString()} - $${quote.amount_max.toLocaleString()}</p>
              
              <p>${quote.description || 'We look forward to working with you on this project.'}</p>
              
              <div style="text-align: center;">
                <a href="${viewUrl}" class="button">View Full Quote</a>
              </div>
              
              <p>This quote includes:</p>
              <ul>
                <li>Detailed scope of work</li>
                <li>Timeline and milestones</li>
                <li>Payment terms</li>
                <li>Terms and conditions</li>
              </ul>
              
              <p>If you have any questions or would like to discuss this quote, please don't hesitate to reach out.</p>
              
              <p>Best regards,<br>The AImpact Nexus Team</p>
            </div>
            <div class="footer">
              <p>This quote is valid for 30 days from the date sent.</p>
              <p>© 2024 AImpact Nexus. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    try {
      await transporter.sendMail({
        from: `"AImpact Nexus" <${process.env.GMAIL_USER}>`,
        to: recipientEmail || quote.client_email,
        subject: `Quote: ${quote.project_name}`,
        html: emailHtml,
      });

      // Update quote status
      await supabase
        .from('quotes')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      return NextResponse.json({ 
        success: true, 
        message: 'Quote sent successfully',
        viewUrl 
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send quote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}