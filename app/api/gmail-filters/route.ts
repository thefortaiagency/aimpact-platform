import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

// Get Gmail client using domain-wide delegation
const getGmailClient = async (userEmail: string) => {
  // Load service account credentials
  let serviceAccountKey
  
  // Try to load from environment variable first
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  } else {
    // Fall back to file
    const keyPath = path.join(process.cwd(), 'credentials', 'gmail-service-account.json')
    if (fs.existsSync(keyPath)) {
      serviceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
    } else {
      throw new Error('Service account credentials not found')
    }
  }

  // Create JWT client with domain-wide delegation
  const jwtClient = new google.auth.JWT({
    email: serviceAccountKey.client_email,
    key: serviceAccountKey.private_key,
    scopes: [
      'https://www.googleapis.com/auth/gmail.settings.basic',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    subject: userEmail // Impersonate the user
  })

  // Authorize the client
  await jwtClient.authorize()

  // Create Gmail client
  const gmail = google.gmail({ version: 'v1', auth: jwtClient })
  
  return gmail
}

// GET - List all filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Map .com to .ai since they're aliases
    let gmailEmail = session.user.email
    if (gmailEmail === 'aoberlin@thefortaiagency.com') {
      gmailEmail = 'aoberlin@thefortaiagency.ai'
    }

    const gmail = await getGmailClient(gmailEmail)
    
    // List all filters
    const response = await gmail.users.settings.filters.list({
      userId: 'me'
    })

    const filters = response.data.filter || []
    
    // Format filters for easier understanding
    const formattedFilters = filters.map(filter => ({
      id: filter.id,
      criteria: {
        from: filter.criteria?.from,
        to: filter.criteria?.to,
        subject: filter.criteria?.subject,
        query: filter.criteria?.query,
        hasAttachment: filter.criteria?.hasAttachment,
        size: filter.criteria?.size,
        sizeComparison: filter.criteria?.sizeComparison,
        excludeChats: filter.criteria?.excludeChats
      },
      action: {
        addLabelIds: filter.action?.addLabelIds,
        removeLabelIds: filter.action?.removeLabelIds,
        forward: filter.action?.forward,
        markAsRead: filter.action?.removeLabelIds?.includes('UNREAD'),
        markAsImportant: filter.action?.addLabelIds?.includes('IMPORTANT'),
        delete: filter.action?.addLabelIds?.includes('TRASH'),
        archive: filter.action?.removeLabelIds?.includes('INBOX'),
        star: filter.action?.addLabelIds?.includes('STARRED')
      }
    }))

    return NextResponse.json({
      filters: formattedFilters,
      total: filters.length
    })
    
  } catch (error: any) {
    console.error('Error fetching Gmail filters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filters', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new filter
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.criteria || !body.action) {
      return NextResponse.json(
        { error: 'Missing criteria or action for filter' },
        { status: 400 }
      )
    }

    // Map .com to .ai since they're aliases
    let gmailEmail = session.user.email
    if (gmailEmail === 'aoberlin@thefortaiagency.com') {
      gmailEmail = 'aoberlin@thefortaiagency.ai'
    }

    const gmail = await getGmailClient(gmailEmail)
    
    // Build filter criteria
    const criteria: any = {}
    if (body.criteria.from) criteria.from = body.criteria.from
    if (body.criteria.to) criteria.to = body.criteria.to
    if (body.criteria.subject) criteria.subject = body.criteria.subject
    if (body.criteria.query) criteria.query = body.criteria.query
    if (body.criteria.hasAttachment !== undefined) criteria.hasAttachment = body.criteria.hasAttachment
    if (body.criteria.size) criteria.size = body.criteria.size
    if (body.criteria.sizeComparison) criteria.sizeComparison = body.criteria.sizeComparison
    if (body.criteria.excludeChats !== undefined) criteria.excludeChats = body.criteria.excludeChats
    
    // Build filter action
    const action: any = {}
    const addLabelIds = []
    const removeLabelIds = []
    
    // Handle label/folder assignment
    if (body.action.labelName) {
      // First, try to find or create the label
      try {
        const labelsResponse = await gmail.users.labels.list({ userId: 'me' })
        const labels = labelsResponse.data.labels || []
        
        let labelId = labels.find(l => l.name === body.action.labelName)?.id
        
        if (!labelId) {
          // Create the label if it doesn't exist
          const newLabel = await gmail.users.labels.create({
            userId: 'me',
            requestBody: {
              name: body.action.labelName,
              labelListVisibility: 'labelShow',
              messageListVisibility: 'show'
            }
          })
          labelId = newLabel.data.id
        }
        
        if (labelId) {
          addLabelIds.push(labelId)
        }
      } catch (labelError) {
        console.error('Error handling label:', labelError)
      }
    }
    
    // Handle other actions
    if (body.action.markAsRead) removeLabelIds.push('UNREAD')
    if (body.action.markAsImportant) addLabelIds.push('IMPORTANT')
    if (body.action.star) addLabelIds.push('STARRED')
    if (body.action.archive) removeLabelIds.push('INBOX')
    if (body.action.delete) addLabelIds.push('TRASH')
    if (body.action.forward) action.forward = body.action.forward
    
    if (addLabelIds.length > 0) action.addLabelIds = addLabelIds
    if (removeLabelIds.length > 0) action.removeLabelIds = removeLabelIds
    
    // Create the filter
    const response = await gmail.users.settings.filters.create({
      userId: 'me',
      requestBody: {
        criteria,
        action
      }
    })

    return NextResponse.json({
      success: true,
      filter: {
        id: response.data.id,
        criteria: response.data.criteria,
        action: response.data.action
      },
      message: 'Filter created successfully'
    })
    
  } catch (error: any) {
    console.error('Error creating Gmail filter:', error)
    return NextResponse.json(
      { error: 'Failed to create filter', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove a filter
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filterId = searchParams.get('id')
    
    if (!filterId) {
      return NextResponse.json(
        { error: 'Filter ID is required' },
        { status: 400 }
      )
    }

    // Map .com to .ai since they're aliases
    let gmailEmail = session.user.email
    if (gmailEmail === 'aoberlin@thefortaiagency.com') {
      gmailEmail = 'aoberlin@thefortaiagency.ai'
    }

    const gmail = await getGmailClient(gmailEmail)
    
    // Delete the filter
    await gmail.users.settings.filters.delete({
      userId: 'me',
      id: filterId
    })

    return NextResponse.json({
      success: true,
      message: 'Filter deleted successfully'
    })
    
  } catch (error: any) {
    console.error('Error deleting Gmail filter:', error)
    return NextResponse.json(
      { error: 'Failed to delete filter', details: error.message },
      { status: 500 }
    )
  }
}