import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * Execute a confirmed action after user approval
 * This endpoint only executes actions that have been explicitly confirmed
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (!action || !action.type) {
      return NextResponse.json(
        { error: 'Invalid action provided' },
        { status: 400 }
      )
    }

    // Handle both action.parameters and action.details (for backwards compatibility)
    const params = action.parameters || action.details || {}
    console.log('🔄 Executing confirmed action:', action.type, params)

    const supabase = getSupabaseClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    let result: any = {}
    
    switch (action.type) {
      case 'send_email':
        // Send the email with updated content
        const emailResponse = await fetch(`${baseUrl}/api/aimpact/gmail/compose`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
          },
          body: JSON.stringify({
            to: params.to,
            subject: params.subject,
            body: params.body
          })
        })
        
        if (emailResponse.ok) {
          const emailData = await emailResponse.json()
          result = {
            success: true,
            message: `✅ Email sent successfully to ${params.to}!`,
            data: emailData
          }
        } else {
          throw new Error('Failed to send email')
        }
        break
        
      case 'send_sms':
        // Send SMS message
        const smsResponse = await fetch(`${baseUrl}/api/sms/send-client-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
          },
          body: JSON.stringify({
            phoneNumber: params.phone_number,
            message: params.message
          })
        })
        
        if (smsResponse.ok) {
          const smsData = await smsResponse.json()
          result = {
            success: true,
            message: `✅ SMS sent successfully to ${params.phone_number}!`,
            data: smsData
          }
        } else {
          throw new Error('Failed to send SMS')
        }
        break
        
      case 'create_meeting':
      case 'create_appointment':
        // Create meeting/appointment
        const meetingResponse = await fetch(`${baseUrl}/api/aimpact/meetings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
          },
          body: JSON.stringify({
            title: params.title,
            date: params.date,
            time: params.time,
            duration: params.duration,
            attendees: params.attendees,
            location: params.location,
            sendInvites: params.send_invites !== false
          })
        })
        
        if (meetingResponse.ok) {
          const meetingData = await meetingResponse.json()
          result = {
            success: true,
            message: `✅ ${action.type === 'create_meeting' ? 'Meeting' : 'Appointment'} created successfully!`,
            data: meetingData
          }
          
          // Send invites if requested
          if (params.send_invites !== false && params.attendees?.length > 0) {
            const inviteResponse = await fetch(`${baseUrl}/api/aimpact/meetings/send-invites`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
              },
              body: JSON.stringify({
                meetingId: meetingData.id,
                attendees: params.attendees
              })
            })
            
            if (inviteResponse.ok) {
              result.message += ` Invites sent to ${params.attendees.length} attendee(s).`
            }
          }
        } else {
          throw new Error('Failed to create meeting/appointment')
        }
        break
        
      case 'delete_project':
        // Delete project with confirmation
        const { data: project, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', params.project_id)
          .single()
        
        if (fetchError || !project) {
          throw new Error('Project not found')
        }
        
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', params.project_id)
        
        if (deleteError) {
          throw new Error('Failed to delete project')
        }
        
        result = {
          success: true,
          message: `✅ Project "${project.name}" has been permanently deleted.`,
          data: { deletedProject: project }
        }
        break
        
      case 'bulk_todo_action':
        // Execute bulk todo action
        const todoResponse = await fetch(`${baseUrl}/api/aimpact/todos/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(request ? { 'Cookie': request.headers.get('cookie') || '' } : {})
          },
          body: JSON.stringify({
            action: params.action,
            filters: params.filters
          })
        })
        
        if (todoResponse.ok) {
          const todoData = await todoResponse.json()
          result = {
            success: true,
            message: `✅ Bulk action completed: ${todoData.affectedCount} todos ${params.action}ed.`,
            data: todoData
          }
        } else {
          throw new Error('Failed to execute bulk todo action')
        }
        break
        
      case 'draft_sms':
        // For draft SMS, just return a success with the draft data
        result = {
          success: true,
          type: 'draft_sms',
          message: `📝 SMS draft ready for ${params.phone_number || 'recipient'}`,
          open_floating: 'sms',
          phone_number: params.phone_number,
          message: params.message,
          draft_mode: true
        }
        break
        
      case 'draft_email':
        // For draft email, just return a success with the draft data
        result = {
          success: true,
          type: 'draft_email',
          message: `📝 Email draft ready for ${params.to || 'recipient'}`,
          open_floating: 'email',
          to: params.to,
          subject: params.subject,
          body: params.body || params.message,
          draft_mode: true
        }
        break
        
      default:
        return NextResponse.json(
          { error: `Unknown action type: ${action.type}` },
          { status: 400 }
        )
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error executing confirmed action:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}