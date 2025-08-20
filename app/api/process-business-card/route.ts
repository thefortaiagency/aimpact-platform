import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { OpenAI } from 'openai'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI
const getOpenAIClient = () => {
  const cleanApiKey = process.env.OPENAI_API_KEY?.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim()
  if (!cleanApiKey) {
    throw new Error('OpenAI API key not configured')
  }
  return new OpenAI({
    apiKey: cleanApiKey
  })
}

// Initialize Supabase
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, imageBase64, manualText } = await request.json()
    
    if (!imageUrl && !imageBase64 && !manualText) {
      return NextResponse.json({ 
        error: 'Please provide either an image URL, base64 image data, or manual text' 
      }, { status: 400 })
    }

    const openai = getOpenAIClient()
    const supabase = getSupabaseClient()

    // Use GPT-4 Vision to extract business card information
    let extractedData
    
    if (manualText) {
      // Process manual text input
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract business card information from the provided text. Return a JSON object with:
            {
              "person": {
                "firstName": "string",
                "lastName": "string", 
                "title": "string",
                "email": "string",
                "phone": "string",
                "mobile": "string",
                "linkedin": "string"
              },
              "company": {
                "name": "string",
                "website": "string",
                "address": "string",
                "city": "string",
                "state": "string",
                "zip": "string",
                "country": "string",
                "industry": "string"
              },
              "notes": "any additional information"
            }
            
            If any field is not found, use null. Be smart about parsing - look for email patterns, phone number formats, etc.`
          },
          {
            role: 'user',
            content: manualText
          }
        ],
        response_format: { type: "json_object" }
      })
      
      extractedData = JSON.parse(completion.choices[0].message.content || '{}')
    } else {
      // Process image with GPT-4 Vision
      const imageData = imageUrl || `data:image/jpeg;base64,${imageBase64}`
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a business card OCR expert. Extract all information from the business card image and return a JSON object with:
            {
              "person": {
                "firstName": "string",
                "lastName": "string",
                "title": "string",
                "email": "string",
                "phone": "string",
                "mobile": "string",
                "linkedin": "string"
              },
              "company": {
                "name": "string",
                "website": "string",
                "address": "string",
                "city": "string",
                "state": "string",
                "zip": "string",
                "country": "string",
                "industry": "string"
              },
              "notes": "any additional information or special designations"
            }
            
            Be thorough and extract ALL visible text. If any field is not found, use null.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all information from this business card:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      })
      
      extractedData = JSON.parse(completion.choices[0].message.content || '{}')
    }

    // Check if organization already exists
    let organizationId = null
    if (extractedData.company?.name) {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', extractedData.company.name)
        .single()
      
      if (existingOrg) {
        organizationId = existingOrg.id
      } else {
        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: extractedData.company.name,
            website: extractedData.company.website,
            industry: extractedData.company.industry,
            address: extractedData.company.address,
            city: extractedData.company.city,
            state: extractedData.company.state,
            zip: extractedData.company.zip,
            country: extractedData.company.country,
            created_by: session.user.email,
            status: 'lead',
            source: 'business_card',
            metadata: {
              extracted_from: 'business_card',
              extraction_date: new Date().toISOString()
            }
          })
          .select()
          .single()
        
        if (!orgError && newOrg) {
          organizationId = newOrg.id
        }
      }
    }

    // Check if contact already exists
    let contactId = null
    if (extractedData.person?.email || extractedData.person?.phone) {
      // Build query for existing contact
      let contactQuery = supabase.from('contacts').select('id')
      
      if (extractedData.person.email) {
        contactQuery = contactQuery.eq('email', extractedData.person.email)
      } else if (extractedData.person.phone) {
        contactQuery = contactQuery.eq('phone', extractedData.person.phone)
      }
      
      const { data: existingContact } = await contactQuery.single()
      
      if (existingContact) {
        contactId = existingContact.id
        // Update existing contact with any new information
        await supabase
          .from('contacts')
          .update({
            organization_id: organizationId || undefined,
            title: extractedData.person.title || undefined,
            linkedin: extractedData.person.linkedin || undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContact.id)
      } else {
        // Create new contact
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            first_name: extractedData.person.firstName,
            last_name: extractedData.person.lastName,
            email: extractedData.person.email,
            phone: extractedData.person.phone || extractedData.person.mobile,
            mobile: extractedData.person.mobile,
            title: extractedData.person.title,
            linkedin: extractedData.person.linkedin,
            organization_id: organizationId,
            created_by: session.user.email,
            status: 'active',
            source: 'business_card',
            metadata: {
              extracted_from: 'business_card',
              extraction_date: new Date().toISOString(),
              notes: extractedData.notes
            }
          })
          .select()
          .single()
        
        if (!contactError && newContact) {
          contactId = newContact.id
        }
      }
    }

    return NextResponse.json({
      success: true,
      extractedData,
      organizationId,
      contactId,
      message: `Successfully processed business card. ${organizationId ? 'Organization created/updated.' : ''} ${contactId ? 'Contact created/updated.' : ''}`
    })

  } catch (error) {
    console.error('Error processing business card:', error)
    return NextResponse.json(
      { error: 'Failed to process business card', details: error },
      { status: 500 }
    )
  }
}