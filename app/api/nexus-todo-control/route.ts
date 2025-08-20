import { NextRequest, NextResponse } from 'next/server'
import { nexusTodoController } from '@/lib/nexus-todo-controller'

/**
 * NEXUS AI AUTONOMOUS TODO CONTROL
 * This endpoint gives the Nexus AI Assistant FULL CONTROL over todo management
 * It can create, update, complete, delete, and organize todos without restrictions
 */

export async function POST(request: NextRequest) {
  try {
    const { action, parameters } = await request.json()
    
    console.log('🤖 Nexus AI Todo Control:', action, parameters)
    
    switch (action) {
      case 'create_autonomous_todo':
        const newTodo = await nexusTodoController.createTodo({
          content: parameters.content,
          priority: parameters.priority,
          category: parameters.category,
          assignedTo: parameters.assignedTo,
          dueDate: parameters.dueDate,
          dueTime: parameters.dueTime,
          status: parameters.status
        })
        
        return NextResponse.json({
          success: true,
          data: newTodo,
          message: `✅ Created todo: ${newTodo.content}`
        })

      case 'update_autonomous_todo':
        const updatedTodo = await nexusTodoController.updateTodo(
          parameters.id, 
          parameters.updates
        )
        
        if (!updatedTodo) {
          return NextResponse.json({
            success: false,
            error: 'Todo not found'
          }, { status: 404 })
        }
        
        return NextResponse.json({
          success: true,
          data: updatedTodo,
          message: `✅ Updated todo: ${updatedTodo.content}`
        })

      case 'complete_autonomous_todo':
        const completedTodo = await nexusTodoController.completeTodo(parameters.id)
        
        if (!completedTodo) {
          return NextResponse.json({
            success: false,
            error: 'Todo not found'
          }, { status: 404 })
        }
        
        return NextResponse.json({
          success: true,
          data: completedTodo,
          message: `✅ Completed todo: ${completedTodo.content}`
        })

      case 'bulk_autonomous_action':
        const affectedCount = await nexusTodoController.bulkAction(
          parameters.action, // 'complete' | 'delete' | 'archive'
          parameters.filters
        )
        
        return NextResponse.json({
          success: true,
          data: { affectedCount },
          message: `✅ ${parameters.action} ${affectedCount} todos`
        })

      case 'query_autonomous_todos':
        const todos = nexusTodoController.queryTodos(parameters.filters)
        
        return NextResponse.json({
          success: true,
          data: todos,
          message: `📋 Found ${todos.length} todos`
        })

      case 'get_autonomous_stats':
        const stats = nexusTodoController.getTodoStats()
        
        return NextResponse.json({
          success: true,
          data: stats,
          message: '📊 Todo statistics retrieved'
        })

      case 'get_autonomous_context':
        const context = await nexusTodoController.getAIContext()
        
        return NextResponse.json({
          success: true,
          data: { context },
          message: '🧠 AI context generated'
        })

      case 'ai_todo_planning':
        // AI can autonomously plan and organize todos
        const planningResult = await aiTodoPlanning(parameters)
        
        return NextResponse.json({
          success: true,
          data: planningResult,
          message: '🎯 AI todo planning completed'
        })

      case 'ai_priority_optimization':
        // AI can automatically optimize priority and scheduling
        const optimizationResult = await aiPriorityOptimization(parameters)
        
        return NextResponse.json({
          success: true,
          data: optimizationResult,
          message: '⚡ Priority optimization completed'
        })

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Nexus Todo Control Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'status':
        const context = await nexusTodoController.getAIContext()
        const stats = nexusTodoController.getTodoStats()
        
        return NextResponse.json({
          success: true,
          data: {
            context,
            stats,
            timestamp: new Date().toISOString()
          }
        })

      case 'dashboard':
        return NextResponse.json({
          success: true,
          data: await generateAIDashboard()
        })

      default:
        return NextResponse.json({
          success: true,
          message: 'Nexus AI Todo Control is operational',
          capabilities: [
            'create_autonomous_todo',
            'update_autonomous_todo', 
            'complete_autonomous_todo',
            'bulk_autonomous_action',
            'query_autonomous_todos',
            'get_autonomous_stats',
            'get_autonomous_context',
            'ai_todo_planning',
            'ai_priority_optimization'
          ]
        })
    }

  } catch (error) {
    console.error('❌ Nexus Todo Control GET Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * AI AUTONOMOUS PLANNING FUNCTIONS
 */

async function aiTodoPlanning(parameters: any) {
  const controller = nexusTodoController
  
  // AI can analyze current workload and suggest optimal organization
  const stats = controller.getTodoStats()
  const overdue = controller.queryTodos({ overdue: true })
  const urgent = controller.queryTodos({ priority: 'urgent', status: 'pending' })
  
  const suggestions: string[] = []
  
  if (stats.overdue > 0) {
    suggestions.push(`🚨 Address ${stats.overdue} overdue tasks immediately`)
  }
  
  if (urgent.length > 3) {
    suggestions.push(`🔥 Consider redistributing ${urgent.length} urgent tasks`)
  }
  
  if (stats.inProgress > 5) {
    suggestions.push(`⚠️ Too many tasks in progress (${stats.inProgress}), focus on completing current tasks`)
  }
  
  // AI can automatically create organizational todos
  if (parameters.autoCreatePlanningTodos) {
    if (stats.overdue > 0) {
      await controller.createTodo({
        content: `Review and prioritize ${stats.overdue} overdue tasks`,
        priority: 'urgent',
        category: 'Planning',
        status: 'pending'
      })
      suggestions.push('✅ Created planning todo for overdue tasks')
    }
  }
  
  return {
    suggestions,
    analysis: {
      workloadLevel: stats.inProgress > 5 ? 'high' : stats.inProgress > 2 ? 'medium' : 'low',
      urgencyLevel: urgent.length > 3 ? 'high' : urgent.length > 1 ? 'medium' : 'low',
      organizationScore: Math.max(0, 100 - (stats.overdue * 20) - (urgent.length * 10))
    }
  }
}

async function aiPriorityOptimization(parameters: any) {
  const controller = nexusTodoController
  const allTodos = controller.queryTodos()
  
  let optimizedCount = 0
  const changes: string[] = []
  
  // AI can automatically optimize priorities based on due dates and content analysis
  for (const todo of allTodos) {
    if (todo.status === 'completed') continue
    
    let newPriority = todo.priority
    let shouldUpdate = false
    
    // Auto-escalate overdue tasks
    if (todo.dueDate && new Date(todo.dueDate) < new Date() && todo.priority !== 'urgent') {
      newPriority = 'urgent'
      shouldUpdate = true
      changes.push(`📈 Escalated "${todo.content}" to urgent (overdue)`)
    }
    
    // Auto-escalate due today
    else if (todo.dueDate === new Date().toISOString().split('T')[0] && todo.priority === 'low') {
      newPriority = 'high'
      shouldUpdate = true  
      changes.push(`📈 Escalated "${todo.content}" to high priority (due today)`)
    }
    
    // Content-based priority detection
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'immediate']
    const highKeywords = ['important', 'deadline', 'meeting', 'presentation', 'demo']
    
    if (urgentKeywords.some(keyword => todo.content.toLowerCase().includes(keyword)) && todo.priority !== 'urgent') {
      newPriority = 'urgent'
      shouldUpdate = true
      changes.push(`🔍 Detected urgent keywords in "${todo.content}"`)
    }
    else if (highKeywords.some(keyword => todo.content.toLowerCase().includes(keyword)) && todo.priority === 'low') {
      newPriority = 'high'
      shouldUpdate = true
      changes.push(`🔍 Detected high-priority keywords in "${todo.content}"`)
    }
    
    if (shouldUpdate) {
      await controller.updateTodo(todo.id, { priority: newPriority })
      optimizedCount++
    }
  }
  
  return {
    optimizedCount,
    changes,
    summary: `Optimized ${optimizedCount} todos based on AI analysis`
  }
}

async function generateAIDashboard() {
  const controller = nexusTodoController
  const stats = controller.getTodoStats()
  const context = await controller.getAIContext()
  
  return {
    stats,
    context,
    quickActions: [
      { action: 'complete_overdue', label: 'Complete All Overdue', enabled: stats.overdue > 0 },
      { action: 'optimize_priorities', label: 'AI Priority Optimization', enabled: true },
      { action: 'plan_workload', label: 'AI Workload Planning', enabled: true },
      { action: 'focus_mode', label: 'Enter Focus Mode', enabled: stats.inProgress > 0 }
    ],
    insights: await generateAIInsights()
  }
}

async function generateAIInsights() {
  const controller = nexusTodoController
  const stats = controller.getTodoStats()
  
  const insights: string[] = []
  
  if (stats.overdue > 0) {
    insights.push(`🚨 You have ${stats.overdue} overdue tasks - consider rescheduling or delegating`)
  }
  
  if (stats.inProgress > 3) {
    insights.push(`⚠️ High work-in-progress (${stats.inProgress}) - focus on completion before starting new tasks`)
  }
  
  const completionRate = stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : '0'
  insights.push(`📊 Completion rate: ${completionRate}%`)
  
  if (stats.urgent > 0) {
    insights.push(`🔥 ${stats.urgent} urgent tasks require immediate attention`)
  }
  
  return insights
}