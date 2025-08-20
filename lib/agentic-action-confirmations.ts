/**
 * AGENTIC ACTION CONFIRMATION SYSTEM
 * Adds confirmation requirements for sensitive actions like sending emails, SMS, creating meetings
 */

export interface ActionConfirmation {
  required: boolean
  type: 'preview' | 'confirm' | 'draft'
  message?: string
  details?: any
}

export interface ConfirmableAction {
  type: string
  requiresConfirmation: boolean
  confirmationType: 'preview' | 'confirm' | 'draft'
  getConfirmationDetails: (parameters: any) => any
}

// Actions that require confirmation before execution
export const CONFIRMABLE_ACTIONS: Record<string, ConfirmableAction> = {
  'send_email': {
    type: 'send_email',
    requiresConfirmation: true,
    confirmationType: 'draft',
    getConfirmationDetails: (params) => ({
      to: params.to,
      subject: params.subject,
      body: params.body || params.message,
      attachments: params.attachments,
      warning: 'This email will be sent immediately once confirmed.'
    })
  },
  
  'send_sms': {
    type: 'send_sms', 
    requiresConfirmation: true,
    confirmationType: 'confirm',
    getConfirmationDetails: (params) => ({
      phoneNumber: params.phone_number,
      message: params.message,
      warning: 'This SMS will be sent immediately once confirmed.',
      cost: 'Standard SMS rates may apply'
    })
  },
  
  'create_meeting': {
    type: 'create_meeting',
    requiresConfirmation: true,
    confirmationType: 'preview',
    getConfirmationDetails: (params) => ({
      title: params.title,
      date: params.date,
      time: params.time,
      duration: params.duration || '1 hour',
      attendees: params.attendees || [],
      location: params.location || 'Virtual',
      sendInvites: params.send_invites !== false,
      warning: params.send_invites !== false ? 
        'Meeting invites will be sent to all attendees once confirmed.' : 
        'Meeting will be created but no invites will be sent.'
    })
  },
  
  'create_appointment': {
    type: 'create_appointment',
    requiresConfirmation: true,
    confirmationType: 'preview',
    getConfirmationDetails: (params) => ({
      title: params.title,
      date: params.date,
      time: params.time,
      duration: params.duration || '30 minutes',
      attendees: params.attendees || [],
      warning: 'Calendar event will be created once confirmed.'
    })
  },
  
  'send_meeting_invites': {
    type: 'send_meeting_invites',
    requiresConfirmation: true,
    confirmationType: 'confirm',
    getConfirmationDetails: (params) => ({
      meetingId: params.meeting_id,
      attendees: params.attendees,
      warning: 'Invites will be sent to all listed attendees immediately.'
    })
  },
  
  'create_email_campaign': {
    type: 'create_email_campaign',
    requiresConfirmation: true,
    confirmationType: 'draft',
    getConfirmationDetails: (params) => ({
      name: params.name,
      recipients: params.to_email,
      subject: params.subject,
      content: params.content,
      status: params.status || 'draft',
      warning: params.status === 'send_now' ? 
        'Campaign will be sent immediately to all recipients!' : 
        'Campaign will be saved as draft for review.'
    })
  },
  
  'bulk_todo_action': {
    type: 'bulk_todo_action',
    requiresConfirmation: true,
    confirmationType: 'confirm',
    getConfirmationDetails: (params) => ({
      action: params.action,
      filters: params.filters,
      warning: `This will ${params.action} multiple todos at once. This action cannot be undone.`
    })
  },
  
  'delete_project': {
    type: 'delete_project',
    requiresConfirmation: true,
    confirmationType: 'confirm',
    getConfirmationDetails: (params) => ({
      projectId: params.project_id,
      projectName: params.project_name,
      warning: 'This will permanently delete the project and all associated data. This action cannot be undone!'
    })
  }
}

// Actions that should proceed without confirmation
export const NO_CONFIRMATION_ACTIONS = [
  'query',
  'list_todos',
  'get_todo_stats',
  'analyze_website',
  'get_daily_briefing',
  'check_inbox',
  'view_calendar',
  'search',
  'navigate',
  'open_floating'
]

/**
 * Check if an action requires confirmation
 */
export function requiresConfirmation(actionType: string): boolean {
  return actionType in CONFIRMABLE_ACTIONS
}

/**
 * Get confirmation details for an action
 */
export function getConfirmationDetails(actionType: string, parameters: any): ActionConfirmation {
  if (!requiresConfirmation(actionType)) {
    return { required: false, type: 'confirm' }
  }
  
  const confirmable = CONFIRMABLE_ACTIONS[actionType]
  const details = confirmable.getConfirmationDetails(parameters)
  
  return {
    required: true,
    type: confirmable.confirmationType,
    message: `Please confirm this action:`,
    details
  }
}

/**
 * Transform actions to pending confirmations instead of executing immediately
 */
export function transformToPendingConfirmation(action: any): any {
  if (!requiresConfirmation(action.type)) {
    return action // No transformation needed
  }
  
  const confirmation = getConfirmationDetails(action.type, action.parameters)
  
  return {
    ...action,
    status: 'pending_confirmation',
    confirmation: confirmation,
    originalAction: action
  }
}

/**
 * Format confirmation message for display
 */
export function formatConfirmationMessage(action: any): string {
  const confirmation = action.confirmation
  if (!confirmation || !confirmation.details) {
    return 'Please confirm this action'
  }
  
  const details = confirmation.details
  let message = ''
  
  switch (action.type) {
    case 'send_email':
      message = `📧 **Email Draft Ready**\n`
      message += `**To:** ${details.to}\n`
      message += `**Subject:** ${details.subject}\n`
      message += `**Body:**\n${details.body}\n\n`
      message += `⚠️ ${details.warning}`
      break
      
    case 'send_sms':
      message = `💬 **SMS Ready to Send**\n`
      message += `**To:** ${details.phoneNumber}\n`
      message += `**Message:** ${details.message}\n\n`
      message += `⚠️ ${details.warning}\n`
      message += `💰 ${details.cost}`
      break
      
    case 'create_meeting':
    case 'create_appointment':
      message = `📅 **Meeting/Appointment Preview**\n`
      message += `**Title:** ${details.title}\n`
      message += `**Date:** ${details.date}\n`
      message += `**Time:** ${details.time}\n`
      message += `**Duration:** ${details.duration}\n`
      if (details.attendees && details.attendees.length > 0) {
        message += `**Attendees:** ${details.attendees.join(', ')}\n`
      }
      message += `**Location:** ${details.location || 'TBD'}\n\n`
      message += `⚠️ ${details.warning}`
      break
      
    case 'delete_project':
      message = `🗑️ **Confirm Deletion**\n`
      message += `**Project:** ${details.projectName || details.projectId}\n\n`
      message += `⚠️ ${details.warning}`
      break
      
    default:
      message = JSON.stringify(details, null, 2)
  }
  
  return message
}

/**
 * Enhanced response for actions requiring confirmation
 */
export function createConfirmationResponse(intent: any): any {
  const pendingActions = intent.actions
    .filter((action: any) => requiresConfirmation(action.type))
    .map((action: any) => transformToPendingConfirmation(action))
  
  const immediateActions = intent.actions
    .filter((action: any) => !requiresConfirmation(action.type))
  
  if (pendingActions.length === 0) {
    return intent // No confirmations needed
  }
  
  // Build confirmation response
  let confirmationMessage = intent.response + '\n\n'
  
  if (pendingActions.length === 1) {
    confirmationMessage += formatConfirmationMessage(pendingActions[0])
  } else {
    confirmationMessage += '**Multiple actions require confirmation:**\n\n'
    pendingActions.forEach((action: any, index: number) => {
      confirmationMessage += `**${index + 1}.** ${formatConfirmationMessage(action)}\n\n`
    })
  }
  
  return {
    ...intent,
    actions: immediateActions, // Only execute non-confirmable actions
    pendingConfirmations: pendingActions, // Store actions needing confirmation
    response: confirmationMessage,
    requiresConfirmation: true
  }
}