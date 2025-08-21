import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      clientName, 
      clientEmail, 
      projectType, 
      projectDescription, 
      budget,
      timeline,
      additionalNotes 
    } = body;

    // Generate quote content using AI
    const prompt = `Generate a professional project quote for:
Client: ${clientName}
Project Type: ${projectType}
Description: ${projectDescription}
Budget Range: ${budget}
Timeline: ${timeline}
Additional Notes: ${additionalNotes || 'None'}

Please generate:
1. A compelling project name
2. A detailed scope of work (bullet points)
3. Specific deliverables
4. Payment terms
5. Project timeline with milestones
6. Price range (min and max based on the budget)

Format as JSON with keys: projectName, scope, deliverables, paymentTerms, timeline, amountMin, amountMax`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a professional business consultant helping create project quotes. Generate realistic and professional quotes based on the information provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const generatedQuote = JSON.parse(completion.choices[0].message.content || '{}');

    // Create the quote in database
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        client_name: clientName,
        client_email: clientEmail,
        project_name: generatedQuote.projectName || projectType,
        amount_min: generatedQuote.amountMin || 1000,
        amount_max: generatedQuote.amountMax || 5000,
        status: 'draft',
        description: projectDescription,
        scope: generatedQuote.scope || projectDescription,
        deliverables: generatedQuote.deliverables,
        timeline: generatedQuote.timeline || timeline,
        payment_terms: generatedQuote.paymentTerms || 'Net 30',
        created_by: session.user?.email
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      quote: {
        id: quote.id,
        clientName: quote.client_name,
        clientEmail: quote.client_email,
        projectName: quote.project_name,
        amountMin: quote.amount_min,
        amountMax: quote.amount_max,
        status: quote.status,
        scope: quote.scope,
        deliverables: quote.deliverables,
        timeline: quote.timeline,
        paymentTerms: quote.payment_terms,
        createdAt: quote.created_at
      }
    });
  } catch (error) {
    console.error('Error generating quote:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}